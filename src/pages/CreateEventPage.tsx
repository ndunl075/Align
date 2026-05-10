import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  collection,
  doc,
  type DocumentData,
  enableNetwork,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { useAuth } from '../auth/AuthContext'
import {
  assertFirebaseConfigured,
  db,
  firebaseProjectId,
  getCurrentUid,
  getFirebaseSummary,
} from '../firebase'
import { userEventRef } from '../lib/userEvents'
import type { Slot } from '../lib/plan'
import {
  buildSlotsFromDays,
  computeSpanFromSlots,
  customDatetimeSlot,
  eachDateInRangeInclusive,
  newSlotId,
} from '../lib/plan'
import { AppChrome } from '../components/AppChrome'

const makeShareCode = () =>
  Math.random().toString(36).replace(/[^a-z0-9]/gi, '').slice(2, 8).toUpperCase()

const SAVE_TIMEOUT_MS = 45_000
/** Short read to fail fast if Firestore can’t be reached at all */
const CONNECT_PROBE_MS = 12_000

function withTimeout<T>(promise: Promise<T>, ms: number, step: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(`save-timeout:${step}`)), ms)
    void promise
      .then((v) => {
        clearTimeout(t)
        resolve(v)
      })
      .catch((e) => {
        clearTimeout(t)
        reject(e)
      })
  })
}

function describeSaveError(e: unknown): string {
  if (e instanceof Error && e.message.startsWith('save-timeout:')) {
    const step = e.message.split(':')[1] ?? 'network'
    const where =
      step === 'plan'
        ? 'saving the event'
        : step === 'list'
          ? 'updating your event list'
          : step === 'connect'
            ? 'reaching Firestore'
            : step === 'probe'
              ? 'running Firestore test read'
              : 'contacting the server'
    const network =
      'Security software, VPNs, and firewalls can block *.googleapis.com—try exclusions or another browser.'
    const credsUrl = `https://console.cloud.google.com/apis/credentials?project=${encodeURIComponent(firebaseProjectId)}`
    const apiKey = `Open API credentials for this project: ${credsUrl} — select your Browser key → Application restrictions. For local dev use “None”, or add referrers for every origin you use (http://localhost:5173/*, http://127.0.0.1:5173/*, http://YOUR-LAN-IP:5173/*).`
    const project = `Confirm Firestore is enabled for “${firebaseProjectId}” (Firebase console → Build → Firestore).`
    return `Timed out while ${where}. ${network} ${apiKey} ${project}`
  }
  const code =
    e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : ''
  const msg = e instanceof Error ? e.message : String(e)
  if (code === 'permission-denied') {
    return 'Permission denied. Deploy Firestore rules from this project (firestore.rules) in the Firebase console, or sign out and sign in again.'
  }
  if (code) return `${code}: ${msg}`
  return msg || 'Unknown error'
}

export function CreateEventPage() {
  const navigate = useNavigate()
  const { user, name } = useAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeMultiDay, setRangeMultiDay] = useState(false)
  const [rangeEnd, setRangeEnd] = useState('')
  const [useTimesForDays, setUseTimesForDays] = useState(false)
  const [dayTimeStart, setDayTimeStart] = useState('18:00')
  const [dayTimeEnd, setDayTimeEnd] = useState('21:00')
  const [customRows, setCustomRows] = useState<{ id: string; startsAt: string; endsAt: string }[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [probeResult, setProbeResult] = useState('')

  const fbSummary = getFirebaseSummary()

  const pickedDates = useMemo(() => {
    if (!rangeStart) return []
    if (!rangeMultiDay) return [rangeStart]
    if (!rangeEnd || rangeEnd < rangeStart) return []
    return eachDateInRangeInclusive(rangeStart, rangeEnd)
  }, [rangeStart, rangeEnd, rangeMultiDay])

  const runFirestoreProbe = async () => {
    setProbeResult('Running…')
    try {
      const snap = await withTimeout(getDoc(doc(db, 'plans', '_align_connect_probe')), 8000, 'probe')
      setProbeResult(`OK — Firestore responded (document exists: ${snap.exists()})`)
    } catch (e) {
      setProbeResult(describeSaveError(e))
    }
  }

  const createPlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const cfgErr = assertFirebaseConfigured()
    if (cfgErr) {
      setError(cfgErr)
      return
    }
    const uid = getCurrentUid()
    if (!uid || !user) {
      setError('Not signed in yet. Try again in a second.')
      return
    }

    if (!title.trim()) {
      setError('Add an event name above.')
      return
    }

    if (rangeMultiDay && rangeStart && !rangeEnd) {
      setError('Pick an end date, or turn off “Multiple days”.')
      return
    }
    if (rangeMultiDay && rangeStart && rangeEnd && rangeEnd < rangeStart) {
      setError('End date must be on or after the start date.')
      return
    }

    const fromDays = buildSlotsFromDays(
      pickedDates,
      useTimesForDays ? dayTimeStart : null,
      useTimesForDays ? dayTimeEnd : null,
    )

    const fromCustom: Slot[] = []
    for (const row of customRows) {
      const s = customDatetimeSlot(row.startsAt, row.endsAt)
      if (s) fromCustom.push(s)
    }

    const merged = [...fromDays, ...fromCustom]
    if (merged.length < 1) {
      setError('Choose a date (start and end if it spans several days).')
      return
    }

    if (useTimesForDays && pickedDates.length > 0 && dayTimeStart >= dayTimeEnd) {
      setError('End time should be after start time for day windows.')
      return
    }

    const ownerName =
      name.trim() || user?.displayName || user?.email?.split('@')[0] || 'Someone'

    const shareCode = makeShareCode()
    const planDoc: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      ownerUid: uid,
      ownerName,
      shareCode,
      slots: merged,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const span = computeSpanFromSlots(merged)
    if (span) {
      planDoc.spanStart = span.spanStart
      planDoc.spanEnd = span.spanEnd
    }

    const planRef = doc(collection(db, 'plans'))

    setSaving(true)
    try {
      await user.getIdToken(true)
      try {
        await enableNetwork(db)
      } catch {
        /* ignore if already online */
      }

      // One authenticated read: fails fast with permission-denied, or proves transport works
      const probeRef = doc(db, 'plans', '_align_connect_probe')
      await withTimeout(getDoc(probeRef), CONNECT_PROBE_MS, 'connect')

      await withTimeout(setDoc(planRef, planDoc as DocumentData), SAVE_TIMEOUT_MS, 'plan')

      try {
        await withTimeout(
          setDoc(
            userEventRef(uid, planRef.id),
            {
              planId: planRef.id,
              shareCode,
              titleSnapshot: title.trim(),
              isOwner: true,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ),
          SAVE_TIMEOUT_MS,
          'list',
        )
      } catch (listErr) {
        console.error('myEvents write failed (plan was saved)', listErr)
      }

      navigate(`/join/${shareCode}`, { replace: true, state: { openInviteShare: true } })
    } catch (e: unknown) {
      console.error(e)
      setError(describeSaveError(e))
    } finally {
      setSaving(false)
    }
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
      <form className="panel" onSubmit={(e) => void createPlan(e)}>
        <h2>Create an event</h2>
        <label>
          Event name
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Weekend hike"
            required
            autoComplete="off"
          />
        </label>
        <label>
          Notes (optional)
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Trail, carpool, etc."
          />
        </label>

        <div className="slot-list create-when-block">
          <span>When</span>
          <p className="field-hint">Pick the day or range. Add a time window only if it’s the same every day.</p>
          <div className="gc-date-row">
            <label className="gc-date-field">
              {rangeMultiDay ? 'Start' : 'Date'}
              <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
            </label>
            {rangeMultiDay && (
              <label className="gc-date-field">
                End
                <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
              </label>
            )}
          </div>
          <div className="create-when-checks">
            <label className="checkbox-row gc-multiday-check">
              <input
                type="checkbox"
                checked={rangeMultiDay}
                onChange={(e) => {
                  setRangeMultiDay(e.target.checked)
                  if (!e.target.checked) setRangeEnd('')
                }}
              />
              Multiple days
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={useTimesForDays}
                onChange={(e) => setUseTimesForDays(e.target.checked)}
              />
              Same hours each day (optional)
            </label>
          </div>
          {useTimesForDays && pickedDates.length > 0 && (
            <div className="time-range-row">
              <label>
                From
                <input type="time" value={dayTimeStart} onChange={(e) => setDayTimeStart(e.target.value)} />
              </label>
              <label>
                To
                <input type="time" value={dayTimeEnd} onChange={(e) => setDayTimeEnd(e.target.value)} />
              </label>
            </div>
          )}
        </div>

        <details className="create-more-times">
          <summary>More options: specific date &amp; times</summary>
          <p className="field-hint">
            Only if you need exact start/end times that don’t match the days above (e.g. different times on
            different days).
          </p>
          {customRows.map((row, idx) => (
            <div key={row.id} className="custom-slot-row">
              <input
                type="datetime-local"
                value={row.startsAt}
                onChange={(e) => {
                  const next = [...customRows]
                  next[idx] = { ...row, startsAt: e.target.value }
                  setCustomRows(next)
                }}
              />
              <input
                type="datetime-local"
                value={row.endsAt}
                onChange={(e) => {
                  const next = [...customRows]
                  next[idx] = { ...row, endsAt: e.target.value }
                  setCustomRows(next)
                }}
                title="End (optional)"
              />
              <button
                type="button"
                className="secondary small"
                onClick={() => setCustomRows((r) => r.filter((x) => x.id !== row.id))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setCustomRows((r) => [...r, { id: newSlotId(), startsAt: '', endsAt: '' }])
            }
          >
            {customRows.length ? 'Add another time' : 'Add a timed slot'}
          </button>
        </details>

        <button type="submit" disabled={saving}>
          {saving ? 'Creating…' : 'Create event'}
        </button>
        {error && <p className="error">{error}</p>}

        {import.meta.env.DEV && (
          <details className="create-firestore-debug">
            <summary className="field-hint">Firestore help (dev only)</summary>
            <p className="field-hint">
              Events are stored in Firestore: each plan under <code>plans/&#123;planId&#125;</code> (name,
              notes, <code>shareCode</code>, <code>slots</code>, host fields, timestamps, optional{' '}
              <code>spanStart</code>/<code>spanEnd</code>), and your home list under{' '}
              <code>users/&#123;yourUid&#125;/myEvents/&#123;planId&#125;</code>. Rules are in{' '}
              <code>firestore.rules</code>—publish them in the Firebase console if you haven’t.
            </p>
            <p className="field-hint">
              App is using project <strong>{fbSummary.projectId}</strong>, authDomain{' '}
              <code>{fbSummary.authDomain}</code>, API key prefix <code>{fbSummary.apiKeyPrefix}</code>.
              Signed-in uid: <code>{user?.uid ?? '—'}</code>
            </p>
            <button
              type="button"
              className="secondary small"
              disabled={!user}
              onClick={() => void runFirestoreProbe()}
            >
              Test Firestore read
            </button>
            {probeResult ? (
              <pre className="create-probe-out">{probeResult}</pre>
            ) : null}
          </details>
        )}
      </form>
    </AppChrome>
  )
}
