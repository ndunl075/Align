import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

export function userEventRef(uid: string, planId: string) {
  return doc(db, 'users', uid, 'myEvents', planId)
}

export async function upsertUserEvent(
  uid: string,
  planId: string,
  opts: { shareCode: string; titleSnapshot: string; isOwner: boolean },
) {
  await setDoc(
    userEventRef(uid, planId),
    {
      planId,
      shareCode: opts.shareCode,
      titleSnapshot: opts.titleSnapshot,
      isOwner: opts.isOwner,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function removeUserEvent(uid: string, planId: string) {
  await deleteDoc(userEventRef(uid, planId))
}
