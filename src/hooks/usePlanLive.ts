import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import type { Plan, ResponseDoc } from '../lib/plan'
import { normalizeAvailability, normalizeSlots } from '../lib/plan'
import { findPlanIdByShareCode } from '../lib/eventsApi'

type ResolveState = 'pending' | 'found' | 'missing'

export function usePlanLive(shareCode: string | undefined, enabled: boolean) {
  const [planId, setPlanId] = useState<string | null>(null)
  const [resolveState, setResolveState] = useState<ResolveState>('pending')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [responses, setResponses] = useState<ResponseDoc[]>([])

  useEffect(() => {
    if (!shareCode || !enabled) {
      setPlanId(null)
      setResolveState('pending')
      setPlan(null)
      setResponses([])
      return
    }
    setPlanId(null)
    setPlan(null)
    setResponses([])
    setResolveState('pending')
    let cancelled = false
    void findPlanIdByShareCode(shareCode).then((id) => {
      if (cancelled) return
      if (id) {
        setPlanId(id)
        setResolveState('found')
      } else {
        setPlanId(null)
        setPlan(null)
        setResponses([])
        setResolveState('missing')
      }
    })
    return () => {
      cancelled = true
    }
  }, [shareCode, enabled])

  useEffect(() => {
    if (!planId || !enabled || resolveState !== 'found') {
      return
    }

    const planRef = doc(db, 'plans', planId)
    const unsubPlan = onSnapshot(planRef, (snap) => {
      if (!snap.exists()) {
        setPlan(null)
        setResponses([])
        setPlanId(null)
        setResolveState('missing')
        return
      }
      const data = snap.data()
      setPlan({
        id: snap.id,
        title: data.title as string,
        description: (data.description as string) ?? '',
        ownerUid: data.ownerUid as string,
        ownerName: (data.ownerName as string) || 'Someone',
        shareCode: data.shareCode as string,
        slots: normalizeSlots(data.slots),
        spanStart: typeof data.spanStart === 'string' ? data.spanStart : undefined,
        spanEnd: typeof data.spanEnd === 'string' ? data.spanEnd : undefined,
      })
    })

    const responseRef = collection(db, 'plans', planId, 'responses')
    const unsubResponses = onSnapshot(responseRef, (snap) => {
      setResponses(
        snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            name: (data.name as string) ?? 'Friend',
            availability: normalizeAvailability(data.availability),
          }
        }),
      )
    })

    return () => {
      unsubPlan()
      unsubResponses()
    }
  }, [planId, enabled, resolveState])

  return {
    plan,
    responses,
    resolveState,
    notFound: resolveState === 'missing',
    loading: resolveState === 'pending' || (resolveState === 'found' && !plan),
  }
}
