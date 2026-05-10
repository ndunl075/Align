import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '../auth/AuthContext'
import { db, getCurrentUid } from '../firebase'
import { HeatmapGrid } from '../components/HeatmapGrid'
import { AppChrome } from '../components/AppChrome'
import { usePlanLive } from '../hooks/usePlanLive'
import type { Avail } from '../lib/plan'
import {
  canUseNativeShare,
  inviteLinkForCode,
  inviteSharePayload,
  shareInviteNative,
} from '../lib/invite'
import { BRAND } from '../branding'
import { formatEventSpan, normalizeAvailability, slotLabel, sortSlots } from '../lib/plan'
import { upsertUserEvent, removeUserEvent } from '../lib/userEvents'

type LocationState = { openInviteShare?: boolean } | null

export function EventPage() {
  const { shareCode } = useParams<{ shareCode: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, name, setName } = useAuth()
  const [copyDone, setCopyDone] = useState(false)
  const [error, setError] = useState('')
  const [inviteShareOpen, setInviteShareOpen] = useState(false)
  const [shareMessageCopied, setShareMessageCopied] = useState(false)

  const { plan, responses, notFound, loading } = usePlanLive(shareCode, Boolean(user))

  useEffect(() => {
    const defaultTitle = `${BRAND.shareTitle}`
    if (!plan?.title) {
      document.title = defaultTitle
      return
    }
    document.title = `${plan.title} · ${BRAND.name}`
    return () => {
      document.title = defaultTitle
    }
  }, [plan?.title])

  useEffect(() => {
    if (!plan || !user) return
    void upsertUserEvent(user.uid, plan.id, {
      shareCode: plan.shareCode,
      titleSnapshot: plan.title,
      isOwner: plan.ownerUid === user.uid,
    })
  }, [plan?.id, plan?.ownerUid, plan?.shareCode, plan?.title, user?.uid])

  const uid = getCurrentUid()
  const isOwner = Boolean(plan && uid === plan.ownerUid)

  useEffect(() => {
    const st = location.state as LocationState
    if (!plan || !isOwner || !st?.openInviteShare) return
    setInviteShareOpen(true)
    navigate(location.pathname, { replace: true, state: {} })
  }, [plan, isOwner, location.state, location.pathname, navigate])

  const setSlotAvailability = useCallback(
    async (slotId: string, value: Avail) => {
      if (!plan) return
      const u = getCurrentUid()
      if (!u) return
      const ref = doc(db, 'plans', plan.id, 'responses', u)
      const snap = await getDoc(ref)
      const prev = normalizeAvailability(snap.data()?.availability)
      const next = { ...prev }
      if (value === null) delete next[slotId]
      else next[slotId] = value
      await setDoc(
        ref,
        {
          name: name.trim() || user?.displayName || 'Friend',
          availability: next,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    },
    [plan, name, user?.displayName],
  )

  const saveName = async () => {
    const u = getCurrentUid()
    if (!u || !plan) return
    const ref = doc(db, 'plans', plan.id, 'responses', u)
    const snap = await getDoc(ref)
    await setDoc(
      ref,
      {
        name: name.trim() || user?.displayName || 'Friend',
        availability: normalizeAvailability(snap.data()?.availability),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  }

  const summary = useMemo(() => {
    if (!plan) return []
    return sortSlots(plan.slots).map((slot) => {
      const yes = responses.filter((res) => res.availability[slot.id] === 'yes').length
      return { slot, yes, total: responses.length }
    })
  }, [plan, responses])

  const spanInfo = plan ? formatEventSpan(plan) : null

  const sharePayload = useMemo(() => {
    if (!plan) return null
    return inviteSharePayload(plan.title, plan.shareCode, {
      asHost: isOwner,
      organizerName: plan.ownerName,
    })
  }, [plan, isOwner])

  const copyInviteLink = async () => {
    if (!plan) return
    try {
      await navigator.clipboard.writeText(inviteLinkForCode(plan.shareCode))
      setCopyDone(true)
      setTimeout(() => setCopyDone(false), 2000)
    } catch {
      setError('Could not copy link.')
    }
  }

  const copyInviteMessage = async () => {
    if (!sharePayload) return
    try {
      await navigator.clipboard.writeText(sharePayload.text)
      setShareMessageCopied(true)
      setTimeout(() => setShareMessageCopied(false), 2000)
    } catch {
      setError('Could not copy message.')
    }
  }

  const runNativeShare = async () => {
    if (!sharePayload) return
    setError('')
    const result = await shareInviteNative(sharePayload)
    if (result === 'shared') {
      setInviteShareOpen(false)
      return
    }
    if (result === 'cancelled') return
    if (result === 'unavailable') {
      await copyInviteMessage()
      return
    }
    setError('Sharing did not complete. Try copying the message below.')
  }

  const leaveEvent = async () => {
    if (!plan || !user) return
    if (!isOwner) {
      await removeUserEvent(user.uid, plan.id)
    }
    navigate('/', { replace: true })
  }

  if (notFound) {
    return (
      <AppChrome>
        <section className="panel">
          <h2>Event not found</h2>
          <p className="field-hint">Check the link or ask your host for a new code.</p>
          <button type="button" onClick={() => navigate('/')}>
            Back to home
          </button>
        </section>
      </AppChrome>
    )
  }

  if (loading || !plan) {
    return (
      <AppChrome>
        <p className="field-hint">Loading event…</p>
      </AppChrome>
    )
  }

  return (
    <AppChrome>
      {inviteShareOpen && sharePayload && (
        <div
          className="share-invite-overlay"
          role="presentation"
          onClick={() => setInviteShareOpen(false)}
        >
          <div
            className="share-invite-card panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-invite-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="share-invite-title" className="share-invite-heading">
              Invite friends
            </h2>
            <p className="field-hint">
              {canUseNativeShare()
                ? 'Tap Share to open your phone’s menu and pick Messages, Snapchat, or another app. The text and link are filled in for you.'
                : 'Copy the message, then paste it wherever you chat.'}
            </p>
            <pre className="invite-share-preview">{sharePayload.text}</pre>
            <div className="share-invite-actions">
              <button type="button" onClick={() => void runNativeShare()}>
                {canUseNativeShare() ? 'Share…' : 'Copy message'}
              </button>
              {canUseNativeShare() && (
                <button type="button" className="secondary" onClick={() => void copyInviteMessage()}>
                  {shareMessageCopied ? 'Copied' : 'Copy message'}
                </button>
              )}
              <button type="button" className="secondary" onClick={() => setInviteShareOpen(false)}>
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
      <section className="panel plan-detail">
        <p className="invite-line">
          {isOwner ? (
            <>
              You are organizing <strong>{plan.title}</strong>
            </>
          ) : (
            <>
              <strong>{plan.ownerName}</strong> invited you to join <strong>{plan.title}</strong>
            </>
          )}
        </p>
        {spanInfo && (
          <div className="event-span-block">
            <span className="event-span-kind">{spanInfo.label}</span>
            <p className="event-span-dates">{spanInfo.line}</p>
          </div>
        )}
        {plan.description ? <p className="plan-desc">{plan.description}</p> : null}

        <div className="invite-link-row">
          <label className="invite-link-field">
            Invite link
            <input readOnly value={inviteLinkForCode(plan.shareCode)} className="mono-input" />
          </label>
          <div className="invite-actions">
            <button type="button" className="secondary" onClick={() => setInviteShareOpen(true)}>
              Share invite…
            </button>
            <button type="button" className="secondary" onClick={() => void copyInviteLink()}>
              {copyDone ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>
        <p className="field-hint code-hint">Or share code: {plan.shareCode}</p>

        <label>
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              void saveName()
            }}
            placeholder="How friends see you"
          />
        </label>

        <h3 className="section-label">Your availability</h3>
        <p className="field-hint">Mark each option as free, busy, or leave unset.</p>
        <div className="times avail-list">
          {sortSlots(plan.slots).map((slot) => {
            const cur = (uid && responses.find((r) => r.id === uid)?.availability[slot.id]) ?? null
            return (
              <div className="avail-row" key={slot.id}>
                <div className="avail-label">
                  <strong>{slotLabel(slot)}</strong>
                </div>
                <div className="avail-toggles">
                  <button
                    type="button"
                    className={cur === 'yes' ? 'toggle on-yes' : 'toggle'}
                    onClick={() => void setSlotAvailability(slot.id, 'yes')}
                  >
                    Free
                  </button>
                  <button
                    type="button"
                    className={cur === 'no' ? 'toggle on-no' : 'toggle'}
                    onClick={() => void setSlotAvailability(slot.id, 'no')}
                  >
                    Busy
                  </button>
                  <button
                    type="button"
                    className={cur === null ? 'toggle on-clear' : 'toggle'}
                    onClick={() => void setSlotAvailability(slot.id, null)}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <HeatmapGrid plan={plan} responses={responses} />

        <div className="summary-list">
          <h3 className="section-label">Quick counts</h3>
          {summary.map(({ slot, yes, total }) => (
            <div className="summary-row" key={slot.id}>
              <span>{slotLabel(slot)}</span>
              <span className="summary-count">
                {yes} free{total ? ` / ${total}` : ''}
              </span>
            </div>
          ))}
        </div>

        {isOwner && responses.length > 0 && (
          <div className="people">
            <h3>Participants</h3>
            <ul>
              {responses.map((person) => (
                <li key={person.id}>{person.name}</li>
              ))}
            </ul>
          </div>
        )}

        <button type="button" className="secondary" onClick={() => void leaveEvent()}>
          {isOwner ? 'Back to home' : 'Leave this event'}
        </button>
        {error && <p className="error">{error}</p>}
      </section>
    </AppChrome>
  )
}
