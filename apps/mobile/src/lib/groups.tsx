import { colors } from '@dini/core'
import type { GroupSlot, GroupStatus } from '@dini/data/supabase'
import { View } from 'react-native'
import { T, font } from '@/lib/ui'
import { useT } from '@/lib/i18n'

// Outils partagés des écrans de groupe : créneaux hebdomadaires et statut (mêmes règles que le site).

const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** Jour de la semaine (0 = dimanche) et minute du jour d'un instant, dans un fuseau donné. */
export function weeklySlot(utc: number, tz: string): GroupSlot {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(utc))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return { weekday: WEEKDAY[get('weekday')] ?? 0, start: Number(get('hour')) * 60 + Number(get('minute')) }
}

const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** « Mer 18:00 » : créneau hebdomadaire lisible, à l'heure du professeur. */
export function useSlotLabel() {
  const days = useT().search.weekdaysShort
  return (s: GroupSlot) => `${days[s.weekday]} ${hm(s.start)}`
}

export function GroupStatusBadge({ status }: { status: GroupStatus }) {
  const m = useT().groups
  const [bg, fg] = status === 'active' ? [colors.soft, colors.green2] : status === 'payment' ? [colors.sand, colors.ochre] : status === 'forming' ? [colors.leaf, colors.ink] : [colors.line, colors.muted]
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: bg }}>
      <T style={{ fontFamily: font.semibold, fontSize: 13, color: fg }}>{m.status[status]}</T>
    </View>
  )
}
