/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from 'firebase/auth'
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  linkWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
} from 'firebase/auth'
import { doc, getDoc, collectionGroup, query, where, getDocs, setDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '../../firebase/config'

type AuthSessionState = {
  user: User | null
  role: 'owner' | 'staff' | 'admin' | null
  tenantId: string | null
  loading: boolean
  error: string | null
  googleAccessToken: string | null
  signInWithGoogle: () => Promise<void>
  linkGoogleAccount: () => Promise<void>
  clearGoogleAccessToken: () => void
  signOut: () => Promise<void>
}

const AuthSessionContext = createContext<AuthSessionState | null>(null)

function readableAuthError(error: unknown) {
  return error instanceof Error ? error.message : 'Authentication failed.'
}

function normalizeAppRole(value: unknown): AuthSessionState['role'] {
  if (value === 'owner' || value === 'admin' || value === 'staff') return value
  if (value === 'manager' || value === 'cashier') return 'staff'
  return null
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<AuthSessionState['role']>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    void getRedirectResult(auth).catch((redirectError: unknown) => {
      if (isMounted) {
        setError(readableAuthError(redirectError))
      }
    })

    const unsubscribe = onAuthStateChanged(
      auth,
      async (nextUser) => {
        if (!isMounted) return

        if (nextUser) {
          try {
            const tokenResult = await nextUser.getIdTokenResult()
            
            if (tokenResult.claims && tokenResult.claims.tenantId) {
              if (isMounted) {
                setRole(normalizeAppRole(tokenResult.claims.role) || 'staff')
                setTenantId(tokenResult.claims.tenantId as string)
              }
            } else {
              // Assume owner/admin if no custom claims are injected.
              const userDoc = await getDoc(doc(db, 'storeProfiles', nextUser.uid))
              if (userDoc.exists()) {
                const data = userDoc.data()
                const profileTenantId = data.tenantId || nextUser.uid
                
                if (data.role === 'staff' && nextUser.email) {
                  // If staff, double check their access level and verify they are still invited
                  const staffDoc = await getDoc(doc(db, 'users', profileTenantId, 'staff', nextUser.email.toLowerCase()))
                  if (staffDoc.exists() && isMounted) {
                    setRole(normalizeAppRole(staffDoc.data().role) || 'staff')
                    setTenantId(profileTenantId)
                  } else {
                    // Not invited or removed
                    if (isMounted) {
                      setRole(null)
                      setTenantId(null)
                    }
                  }
                } else {
                  // Owner
                  if (isMounted) {
                    setRole('owner')
                    setTenantId(profileTenantId)
                  }
                }
              } else {
                // Not found in storeProfiles. Maybe they are an invited staff member logging in for the first time?
                let staffTenantId: string | null = null;
                if (nextUser.email) {
                  try {
                    const staffQuery = query(collectionGroup(db, 'staff'), where('email', '==', nextUser.email))
                    const staffDocs = await getDocs(staffQuery)
                    if (!staffDocs.empty) {
                      const docSnap = staffDocs.docs[0]
                      if (docSnap) {
                        staffTenantId = docSnap.ref.parent.parent?.id || null
                        if (staffTenantId) {
                          // They are staff! Create their storeProfiles doc so we don't have to do this next time.
                          await setDoc(doc(db, 'storeProfiles', nextUser.uid), {
                            tenantId: staffTenantId,
                            role: 'staff',
                            email: nextUser.email
                          })
                          if (isMounted) {
                            setRole(normalizeAppRole(docSnap.data().role) || 'staff')
                            setTenantId(staffTenantId)
                          }
                        }
                      }
                    }
                  } catch (queryErr) {
                    console.warn('Staff collectionGroup query failed (possibly missing index):', queryErr);
                  }
                }

                if (!staffTenantId) {
                  if (isMounted) {
                    setRole('owner')
                    setTenantId(nextUser.uid)
                  }
                }
              }
            }
          } catch (err) {
            console.error('Failed to fetch user role:', err)
            if (isMounted) {
              setRole(null)
              setTenantId(null)
              setError('Could not verify your store access. Please check your connection and sign in again.')
            }
          }
        } else {
          if (isMounted) {
            setRole(null)
            setTenantId(null)
          }
        }

        if (isMounted) {
          setUser(nextUser)
          setLoading(false)
        }
      },
      (authError) => {
        if (!isMounted) {
          return
        }

        setError(readableAuthError(authError))
        setLoading(false)
      },
    )

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const [googleAccessToken, setGoogleAccessTokenState] = useState<string | null>(
    () => localStorage.getItem('google_access_token')
  )

  const setGoogleAccessToken = useCallback((token: string | null) => {
    setGoogleAccessTokenState(token)
    if (token) {
      localStorage.setItem('google_access_token', token)
    } else {
      localStorage.removeItem('google_access_token')
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken)
      }
    } catch (authError: unknown) {
      setError(readableAuthError(authError))
      throw authError
    }
  }, [setGoogleAccessToken])

  const linkGoogleAccount = useCallback(async () => {
    setError(null)
    try {
      if (!auth.currentUser) {
        return signInWithGoogle()
      }
      const result = await linkWithPopup(auth.currentUser, googleProvider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken)
      }
    } catch (err: unknown) {
      const authError = err as { code?: string }
      if (authError?.code === 'auth/credential-already-in-use' || authError?.code === 'auth/provider-already-linked') {
        try {
          const result = await signInWithPopup(auth, googleProvider)
          const credential = GoogleAuthProvider.credentialFromResult(result)
          if (credential?.accessToken) {
            setGoogleAccessToken(credential.accessToken)
          }
        } catch (retryError: unknown) {
          setError(readableAuthError(retryError))
        }
        return
      }
      setError(readableAuthError(authError))
      throw authError
    }
  }, [signInWithGoogle, setGoogleAccessToken])

  const signOut = useCallback(async () => {
    setError(null)
    setGoogleAccessToken(null)
    await firebaseSignOut(auth).catch((authError: unknown) => {
      setError(readableAuthError(authError))
      throw authError
    })
  }, [setGoogleAccessToken])

  const clearGoogleAccessToken = useCallback(() => {
    setGoogleAccessToken(null)
  }, [setGoogleAccessToken])

  const value = useMemo(
    () => ({
      user,
      role,
      tenantId,
      loading,
      error,
      googleAccessToken,
      signInWithGoogle,
      linkGoogleAccount,
      clearGoogleAccessToken,
      signOut,
    }),
    [
      error,
      googleAccessToken,
      loading,
      signInWithGoogle,
      linkGoogleAccount,
      clearGoogleAccessToken,
      signOut,
      user,
      role,
      tenantId,
    ],
  )

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  )
}

export function useAuthSession() {
  const value = useContext(AuthSessionContext)

  if (!value) {
    throw new Error('useAuthSession must be used within AuthSessionProvider.')
  }

  return value
}

