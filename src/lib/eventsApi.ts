import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { upsertUserEvent } from './userEvents'

export async function findPlanIdByShareCode(code: string): Promise<string | null> {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return null
  const planQuery = query(collection(db, 'plans'), where('shareCode', '==', normalized))
  const found = await getDocs(planQuery)
  if (found.empty) return null
  return found.docs[0].id
}

const BACKFILL_KEY = 'align:ownedPlansBackfill'

export async function backfillOwnedPlansForUser(uid: string) {
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(BACKFILL_KEY) === uid) {
    return
  }
  const q = query(collection(db, 'plans'), where('ownerUid', '==', uid))
  const snap = await getDocs(q)
  await Promise.all(
    snap.docs.map((d) => {
      const data = d.data()
      return upsertUserEvent(uid, d.id, {
        shareCode: data.shareCode as string,
        titleSnapshot: (data.title as string) || 'Event',
        isOwner: true,
      })
    }),
  )
  sessionStorage.setItem(BACKFILL_KEY, uid)
}
