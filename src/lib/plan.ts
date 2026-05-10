import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

/** Works on HTTP LAN dev (where `crypto.randomUUID` may be missing). */
export function newSlotId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    /* ignore */
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export type Slot = {
  id: string
  date: string
  allDay: boolean
  startsAt: string
  endsAt?: string
}

export type Plan = {
  id: string
  title: string
  description: string
  ownerUid: string
  ownerName: string
  shareCode: string
  slots: Slot[]
  /** Inclusive YYYY-MM-DD when the schedule spans more than one calendar day */
  spanStart?: string
  spanEnd?: string
}

export type Avail = 'yes' | 'no' | null

export type ResponseDoc = {
  id: string
  name: string
  availability: Record<string, Avail>
}

export function normalizeSlots(raw: unknown): Slot[] {
  if (!Array.isArray(raw)) return []
  const out: Slot[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id : null
    if (!id) continue
    const startsAt = typeof o.startsAt === 'string' ? o.startsAt : ''
    const date =
      typeof o.date === 'string' ? o.date : startsAt.length >= 10 ? startsAt.slice(0, 10) : ''
    const allDay = o.allDay === true
    const endsAt = typeof o.endsAt === 'string' ? o.endsAt : undefined
    out.push({
      id,
      date: date || '1970-01-01',
      allDay,
      startsAt: startsAt || `${date}T12:00`,
      endsAt,
    })
  }
  return out
}

export function normalizeAvailability(raw: unknown): Record<string, Avail> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, Avail> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === 'yes' || v === 'no') out[k] = v
    else if (v === true) out[k] = 'yes'
    else if (v === false) out[k] = 'no'
  }
  return out
}

export function eachDateInRangeInclusive(start: string, end: string): string[] {
  if (!start || !end || start > end) return []
  const out: string[] = []
  let cur = parseISO(`${start}T12:00:00`)
  const last = parseISO(`${end}T12:00:00`)
  while (cur <= last) {
    out.push(format(cur, 'yyyy-MM-dd'))
    cur = addDays(cur, 1)
  }
  return out
}

export function spanDayCount(start: string, end: string): number {
  if (!start || !end || start > end) return 0
  return (
    differenceInCalendarDays(parseISO(`${end}T12:00:00`), parseISO(`${start}T12:00:00`)) + 1
  )
}

/** First and last calendar day among slots (for multi-day banner). */
export function computeSpanFromSlots(slots: Slot[]): { spanStart: string; spanEnd: string } | null {
  const dates = [...new Set(slots.map((s) => s.date).filter(Boolean))].sort()
  if (dates.length < 2) return null
  return { spanStart: dates[0], spanEnd: dates[dates.length - 1] }
}

export function formatEventSpan(plan: Plan): { label: string; line: string } | null {
  if (!plan.spanStart || !plan.spanEnd || plan.spanStart >= plan.spanEnd) return null
  const n = spanDayCount(plan.spanStart, plan.spanEnd)
  if (n < 2) return null
  const start = new Date(`${plan.spanStart}T12:00:00`)
  const end = new Date(`${plan.spanEnd}T12:00:00`)
  const line = `${format(start, 'EEE, MMM d')} – ${format(end, 'EEE, MMM d, yyyy')} · ${n} days`
  return { label: 'Date range', line }
}

export function sortSlots(slots: Slot[]): Slot[] {
  return [...slots].sort((a, b) => {
    const da = a.date.localeCompare(b.date)
    if (da !== 0) return da
    return a.startsAt.localeCompare(b.startsAt)
  })
}

export function slotLabel(slot: Slot): string {
  try {
    if (slot.allDay) {
      const d = new Date(`${slot.date}T12:00:00`)
      return `${format(d, 'EEE, MMM d')} · All day`
    }
    const start = parseISO(slot.startsAt)
    if (slot.endsAt) {
      const end = parseISO(slot.endsAt)
      return `${format(start, 'EEE MMM d · h:mm a')}–${format(end, 'h:mm a')}`
    }
    return format(start, 'EEE, MMM d · h:mm a')
  } catch {
    return slot.startsAt || slot.date
  }
}

export function buildSlotsFromDays(
  dates: string[],
  timeStart: string | null,
  timeEnd: string | null,
): Slot[] {
  const sorted = [...new Set(dates)].filter(Boolean).sort()
  const out: Slot[] = []
  for (const date of sorted) {
    if (!timeStart || !timeEnd) {
      out.push({
        id: newSlotId(),
        date,
        allDay: true,
        startsAt: `${date}T12:00`,
      })
    } else {
      out.push({
        id: newSlotId(),
        date,
        allDay: false,
        startsAt: `${date}T${timeStart}`,
        endsAt: `${date}T${timeEnd}`,
      })
    }
  }
  return out
}

export function customDatetimeSlot(startsAt: string, endsAt: string): Slot | null {
  if (!startsAt) return null
  const date = startsAt.slice(0, 10)
  if (endsAt) {
    return {
      id: newSlotId(),
      date,
      allDay: false,
      startsAt,
      endsAt,
    }
  }
  return {
    id: newSlotId(),
    date,
    allDay: false,
    startsAt,
  }
}
