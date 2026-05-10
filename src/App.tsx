import { Outlet, Navigate, useRoutes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { PaperShadersDemo } from './components/ui/paper-shaders-demo'
import { LoginScreen } from './components/LoginScreen'
import { HomePage } from './pages/HomePage'
import { CreateEventPage } from './pages/CreateEventPage'
import { JoinEventPage } from './pages/JoinEventPage'
import { EventPage } from './pages/EventPage'

function RequireAuth() {
  const { user, authReady } = useAuth()

  if (!authReady) {
    return (
      <div className="align-app align-app--centered">
        <main className="container">Loading Align…</main>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return <Outlet />
}

export default function App() {
  const element = useRoutes([
    {
      element: <RequireAuth />,
      children: [
        { path: '/', element: <HomePage /> },
        { path: '/create', element: <CreateEventPage /> },
        { path: '/join', element: <JoinEventPage /> },
        { path: '/join/:shareCode', element: <EventPage /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ])

  return (
    <>
      <PaperShadersDemo />
      {element}
    </>
  )
}
