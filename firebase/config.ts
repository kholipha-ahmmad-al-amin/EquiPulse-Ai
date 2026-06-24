import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
} from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'equipulse-ai'

export const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    'AIzaSyBtgQa7HsQYtukVAPllMXa_mbAz0ynlOrk',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    `${projectId}.firebasestorage.app`,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '841696659775',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    '1:841696659775:web:f14f65fa4114fc3461ab8a',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-K13HK03Q6E',
} satisfies FirebaseOptions

export const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig)

export const auth = getAuth(firebaseApp)
void setPersistence(auth, browserLocalPersistence)

export const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('https://www.googleapis.com/auth/drive.file')
googleProvider.setCustomParameters({
  prompt: 'select_account',
})

function initializeOfflineFirestore(): Firestore {
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  } catch {
    return getFirestore(firebaseApp)
  }
}

export const db = initializeOfflineFirestore()

