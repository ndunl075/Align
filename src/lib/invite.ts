export function inviteLinkForCode(shareCode: string) {
  return `${window.location.origin}/join/${shareCode}`
}

export type InviteSharePayload = {
  title: string
  text: string
  url: string
}

/** Message + URL for iOS/Android share sheet (Messages, Snapchat, etc.) */
export function inviteSharePayload(
  eventTitle: string,
  shareCode: string,
  opts?: { asHost?: boolean; organizerName?: string },
): InviteSharePayload {
  const url = inviteLinkForCode(shareCode)
  const asHost = opts?.asHost !== false
  const line = asHost
    ? `Join me for “${eventTitle}” on Align — add your availability here:\n${url}`
    : `${opts?.organizerName ?? 'A friend'} is organizing “${eventTitle}” on Align — add your availability here:\n${url}`
  return {
    title: eventTitle,
    text: line,
    url,
  }
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export type NativeShareResult = 'shared' | 'unavailable' | 'cancelled' | 'failed'

export async function shareInviteNative(payload: InviteSharePayload): Promise<NativeShareResult> {
  if (!canUseNativeShare()) return 'unavailable'
  try {
    await navigator.share({
      title: payload.title,
      text: payload.text,
      url: payload.url,
    })
    return 'shared'
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    const isAbort =
      name === 'AbortError' || (typeof DOMException !== 'undefined' && e instanceof DOMException && e.name === 'AbortError')
    if (isAbort) return 'cancelled'
    return 'failed'
  }
}
