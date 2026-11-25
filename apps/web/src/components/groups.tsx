'use client'

import type { GroupSlot, GroupStatus } from '@dini/data/supabase'
import { cx } from './ui'
import { hm } from './teacher'
import { useT } from '@/i18n/locale'

// Outils partagés des écrans de groupe : créneaux hebdomadaires et statut.

const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>

/** Jour de la semaine (0 = dimanche) et minute du jour d'un instant, dans un fuseau donné. */
export function weeklySlot(utc: number, tz: string): GroupSlot {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(utc))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return { weekday: WEEKDAY[get('weekday')] ?? 0, start: Number(get('hour')) * 60 + Number(get('minute')) }
}

/** « Mercredi 18:00 » : créneau hebdomadaire lisible, à l'heure du professeur. */
export function useSlotLabel() {
  const days = useT().availability.weekdays
  return (s: GroupSlot) => `${days[s.weekday]} ${hm(s.start)}`
}

export function GroupStatusBadge({ status }: { status: GroupStatus }) {
  const m = useT().groups
  const tone = status === 'active' ? 'bg-soft text-green2' : status === 'payment' ? 'bg-sand text-ochre' : status === 'forming' ? 'bg-leaf text-ink' : 'bg-line text-muted'
  return <span className={cx('rounded-full px-2.5 py-0.5 text-sm font-semibold', tone)}>{m.status[status]}</span>
}
