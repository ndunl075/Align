import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useAuth } from '../auth/AuthContext'
import { db } from '../firebase'
import { backfillOwnedPlansForUser } from '../lib/eventsApi'
import { removeUserEvent } from '../lib/userEvents'
import { AppChrome } from '../components/AppChrome'

type ListItem = {
  planId: string
  shareCode: string
  titleSnapshot: string
  isOwner: boolean
}

export function HomePage() {
  const { user } = useAuth()
  const [items, setItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let alive = true
    void (async () => {
      await backfillOwnedPlansForUser(user.uid)
      if (!alive) return
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'users', user.uid, 'myEvents'), orderBy('updatedAt', 'desc'))
    return onSnapshot(q, (snap) => {
      setItems(
        snap.docs.map((d) => {
          const x = d.data()
          return {
            planId: d.id,
            shareCode: (x.shareCode as string) ?? '',
            titleSnapshot: (x.titleSnapshot as string) ?? 'Event',
            isOwner: x.isOwner === true,
          }
        }),
      )
    })
  }, [user])

  return (
    <AppChrome>
      {loading && <p className="field-hint">Syncing your events…</p>}
      <div className="home-actions">
        <Link to="/create" className="home-action primary-link">
          Create event
        </Link>
        <Link to="/join" className="home-action secondary-link">
          Join event
        </Link>
      </div>

      <section className="panel home-list">
        <h2>Your events</h2>
        {items.length === 0 ? (
          <p className="field-hint">No events yet. Create one or join with a code.</p>
        ) : (
          <ul className="event-list">
            {items.map((item) => (
              <li key={item.planId} className="event-row">
                <div className="event-row-main">
                  <Link to={`/join/${item.shareCode}`} className="event-title-link">
                    {item.titleSnapshot}
                  </Link>
                  <span className={`event-badge ${item.isOwner ? 'owner' : 'member'}`}>
                    {item.isOwner ? 'Organizer' : 'Guest'}
                  </span>
                </div>
                <div className="event-row-actions">
                  <button
                    type="button"
                    className="secondary small"
                    onClick={() => user && void removeUserEvent(user.uid, item.planId)}
                  >
                    Remove from list
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppChrome>
  )
}
