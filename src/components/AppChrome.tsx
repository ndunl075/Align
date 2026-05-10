import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BRAND } from '../branding'
import { signOutUser } from '../firebase'

export function AppChrome({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const accountLabel = user?.email ?? user?.displayName ?? 'Signed in'

  return (
    <div className="align-app">
      <main className="container">
        <header className="top header-row">
          <div>
            <h1>
              <Link to="/" className="align-logo">
                Align
              </Link>
            </h1>
            <p className="align-tagline">{BRAND.tagline}</p>
          </div>
          <div className="account">
            <span className="account-label">{accountLabel}</span>
            <button
              type="button"
              className="secondary small"
              onClick={() => {
                void signOutUser()
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
