import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuthSession } from './useAuthSession'

export type StoreProfile = {
  storeName: string
  ownerName: string
  category: string
  location: string
  tier: string
  businessType?: string
  tradeLicense?: string
  binTin?: string
  ownerNid?: string
  phone?: string
  createdAt: string
  updatedAt?: string
  participationPoints?: number
  webStorePublished?: boolean
  webStoreUrl?: string
}

export function useStoreProfile() {
  const { tenantId } = useAuthSession()
  const [profile, setProfile] = useState<StoreProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setProfile(null)
      setLoadingProfile(false)
      return
    }

    setLoadingProfile(true)
    const docRef = doc(db, 'storeProfiles', tenantId)
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data() as StoreProfile)
        } else {
          setProfile(null)
        }
        setLoadingProfile(false)
      },
      (error) => {
        console.error('Failed to fetch store profile:', error)
        setLoadingProfile(false)
      }
    )

    return () => unsubscribe()
  }, [tenantId])

  const saveProfile = async (newProfile: Partial<StoreProfile>) => {
    if (!tenantId) throw new Error('Must be logged in to save profile')
    const docRef = doc(db, 'storeProfiles', tenantId)
    await setDoc(docRef, {
      ...newProfile,
      updatedAt: new Date().toISOString(),
      createdAt: newProfile.createdAt || new Date().toISOString()
    }, { merge: true })
  }

  return { profile, loadingProfile, saveProfile }
}
