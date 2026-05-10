import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../firebase'

const authErrorMessage = (code: string) => {
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Wrong email or password.'
  }
  if (code === 'auth/email-already-in-use') {
    return 'That email is already in use. Sign in instead.'
  }
  if (code === 'auth/weak-password') {
    return 'Password should be at least 6 characters.'
  }
  if (code === 'auth/invalid-email') {
    return 'Enter a valid email address.'
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in was cancelled.'
  }
  return 'Something went wrong. Try again.'
}

export function LoginScreen() {
  const location = useLocation()
  const inviteHint = /^\/join\/.+/.test(location.pathname) && location.pathname !== '/join'

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authFormError, setAuthFormError] = useState('')

  const submitEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthFormError('')
    setAuthBusy(true)
    try {
      if (authMode === 'signup') {
        await signUpWithEmail(email, password)
      } else {
        await signInWithEmail(email, password)
      }
      setEmail('')
      setPassword('')
    } catch (e) {
      const code = (e as { code?: string }).code ?? ''
      setAuthFormError(authErrorMessage(code))
    } finally {
      setAuthBusy(false)
    }
  }

  const onGoogle = async () => {
    setAuthFormError('')
    setAuthBusy(true)
    try {
      await signInWithGoogle()
    } catch (e) {
      const code = (e as { code?: string }).code ?? ''
      setAuthFormError(authErrorMessage(code))
    } finally {
      setAuthBusy(false)
    }
  }

  return (
    <div className="align-app align-app--centered">
      <main className="container">
        <header className="top">
          <h1>Align</h1>
          <p>
            {inviteHint
              ? "You've been invited to an event. Sign in to add your availability."
              : 'Sign in to see your events and invites.'}
          </p>
        </header>
        <section className="panel auth-panel">
          <button type="button" className="google-btn" disabled={authBusy} onClick={() => void onGoogle()}>
            Continue with Google
          </button>
          <p className="auth-divider">or email</p>
          <div className="auth-tabs">
            <button
              type="button"
              className={authMode === 'signin' ? 'tab active' : 'tab'}
              onClick={() => {
                setAuthMode('signin')
                setAuthFormError('')
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={authMode === 'signup' ? 'tab active' : 'tab'}
              onClick={() => {
                setAuthMode('signup')
                setAuthFormError('')
              }}
            >
              Create account
            </button>
          </div>
          <form className="auth-form" onSubmit={(e) => void submitEmailAuth(e)}>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </label>
            <button type="submit" disabled={authBusy}>
              {authMode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>
          {authFormError && <p className="error">{authFormError}</p>}
        </section>
      </main>
    </div>
  )
}
