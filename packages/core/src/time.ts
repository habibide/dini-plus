// Tout est stocké en UTC (millisecondes) et affiché dans le fuseau de l'utilisateur.
// Les disponibilités d'un enseignant sont saisies dans SON fuseau : elles suivent
// donc ses changements d'heure, pas ceux de l'élève.

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR
export const SLOT_MINUTES = 30

export type ZonedParts = { y: number; m: number; d: number; weekday: number; minutes: number }

const partsFormatter = new Map<string, Intl.DateTimeFormat>()
function formatterFor(tz: string) {
  let f = partsFormatter.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    partsFormatter.set(tz, f)
  }
  return f
}

function rawParts(utc: number, tz: string) {
  const p = formatterFor(tz).formatToParts(utc)
  const get = (t: string) => Number(p.find((x) => x.type === t)!.value)
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute'), s: get('second') }
}

/** Décalage du fuseau par rapport à UTC, en minutes, à un instant donné. */
export function tzOffsetMinutes(utc: number, tz: string): number {
  const p = rawParts(utc, tz)
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s)
  return Math.round((asUtc - Math.floor(utc / 1000) * 1000) / MINUTE)
}

export function zonedParts(utc: number, tz: string): ZonedParts {
  const p = rawParts(utc, tz)
  return { y: p.y, m: p.m, d: p.d, weekday: new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(), minutes: p.h * 60 + p.min }
}

/** Instant UTC d'une heure locale (minutes depuis minuit) à une date du fuseau donné. */
export function zonedToUtc(y: number, m: number, d: number, minutes: number, tz: string): number {
  const guess = Date.UTC(y, m - 1, d, 0, minutes)
  const first = guess - tzOffsetMinutes(guess, tz) * MINUTE
  const second = guess - tzOffsetMinutes(first, tz) * MINUTE
  return second
}

export type AvailabilityRule = { weekday: number; start: number; end: number } // minutes locales, fuseau de l'enseignant

/** Créneaux de 30 min proposés à partir de `from`, sur `days` jours du calendrier de l'enseignant. */
export function generateSlots(rules: AvailabilityRule[], tz: string, from: number, days: number, opts: { taken?: Set<number>; leadMs?: number } = {}): number[] {
  const lead = opts.leadMs ?? 2 * HOUR
  const start = zonedParts(from, tz)
  const out: number[] = []
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.UTC(start.y, start.m - 1, start.d + i))
    const y = date.getUTCFullYear()
    const m = date.getUTCMonth() + 1
    const d = date.getUTCDate()
    for (const r of rules) {
      if (r.weekday !== date.getUTCDay()) continue
      for (let t = r.start; t + SLOT_MINUTES <= r.end; t += SLOT_MINUTES) {
        const at = zonedToUtc(y, m, d, t, tz)
        if (at >= from + lead && !opts.taken?.has(at)) out.push(at)
      }
    }
  }
  return out.sort((a, b) => a - b)
}

/** Clé de jour (AAAA-MM-JJ) dans le fuseau donné, pour regrouper les créneaux. */
export const dayKey = (utc: number, tz: string) => {
  const p = zonedParts(utc, tz)
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`
}

export const formatDay = (utc: number, tz: string, locale = 'fr-FR') =>
  new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }).format(utc)
export const formatTime = (utc: number, tz: string, locale = 'fr-FR') =>
  new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(utc)
export const formatDateTime = (utc: number, tz: string, locale = 'fr-FR') => `${formatDay(utc, tz, locale)}, ${formatTime(utc, tz, locale)}`
