import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { findPlanIdByShareCode } from '../lib/eventsApi'
import { AppChrome } from '../components/AppChrome'

export function JoinEventPage() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')

  const joinPlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const code = joinCode.trim().toUpperCase()
    const id = await findPlanIdByShareCode(code)
    if (!id) {
      setError('No event found with that code.')
      return
    }
    navigate(`/join/${code}`, { replace: true })
  }

  return (
    <AppChrome>
      <p className="page-back">
        <Link to="/" className="back-link">
          <span className="back-arrow" aria-hidden>
            ←
          </span>
          Back to home
        </Link>
      </p>
      <form className="panel" onSubmit={(e) => void joinPlan(e)}>
        <h2>Join an event</h2>
        <p className="field-hint">Enter the share code from your host.</p>
        <label>
          Share code
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="AB12CD" />
        </label>
        <button type="submit">Continue</button>
        {error && <p className="error">{error}</p>}
      </form>
    </AppChrome>
  )
}
