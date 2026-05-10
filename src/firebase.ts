import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { getFirestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore'

/**
 * Firebase Web SDK via npm (`firebase` package). Same fields as the console snippet, but from `.env.local`
 * as `VITE_FIREBASE_*` so API keys are not committed. See `.env.example` and
 * https://firebase.google.com/docs/web/setup — restart `npm run dev` after editing env.
 */
const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  ...(measurementId ? { measurementId } : {}),
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

/**
 * Default: `getFirestore(app)` — same as Firebase quickstart; most reliable.
 * Optional: set VITE_FIRESTORE_MEMORY_INIT=true to use in-memory cache + optional long polling
 * (see VITE_FIRESTORE_LONG_POLLING in `.env.example`) if a tool breaks IndexedDB or WebChannel.
 */
function initFirestore() {
  const useCustomInit =
    import.meta.env.VITE_FIRESTORE_MEMORY_INIT === 'true' ||
    import.meta.env.VITE_FIRESTORE_LONG_POLLING === 'true'

  if (!useCustomInit) {
    return getFirestore(app)
  }

  const useLongPolling = import.meta.env.VITE_FIRESTORE_LONG_POLLING === 'true'
  try {
    return initializeFirestore(app, {
      localCache: memoryLocalCache(),
      ...(useLongPolling ? { experimentalForceLongPolling: true as const } : {}),
    })
  } catch {
    return getFirestore(app)
  }
}

export const db = initFirestore()

/** Safe dev summary (no secrets). */
export function getFirebaseSummary() {
  return {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    apiKeyPrefix: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.slice(0, 8)}…` : '(missing)',
  }
}

export function assertFirebaseConfigured(): string | null {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    return 'Firebase env vars are missing. Copy .env.example to .env.local, add your VITE_FIREBASE_* keys, then restart the dev server.'
  }
  return null
}

/** For user-facing hints (not secret). */
export const firebaseProjectId = firebaseConfig.projectId

const googleProvider = new GoogleAuthProvider()

// Same as quickstart `const analytics = getAnalytics(app);` — guarded for unsupported environments
void (async () => {
  if (!measurementId || typeof window === 'undefined') return
  if (await isSupported()) {
    getAnalytics(app)
  }
})()

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email.trim(), password)

export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email.trim(), password)

export const signOutUser = () => signOut(auth)

export const getCurrentUid = () => auth.currentUser?.uid ?? null
