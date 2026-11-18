'use client'

import { videoWindow } from '@dini/data'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { buttonCls, cx } from './styles'
import { useFormat, useT } from '@/i18n/locale'

/** Heure courante, rafraîchie chaque minute : le bouton s'active tout seul à l'ouverture de la salle. */
function useMinute() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id) }, [])
  return now
}

export function JoinButton({ booking, tz, className }: { booking: { id: string; startsAt: number; minutes: number }; tz: string; className?: string }) {
  const now = useMinute()
  const t = useT()
  const f = useFormat()
  const { opensAt, closesAt } = videoWindow(booking)
  if (now >= opensAt && now <= closesAt) {
    return <Link href={`/lesson/${booking.id}`} className={cx(buttonCls.primary, 'min-h-10', className)}>{t.classroom.join}</Link>
  }
  return (
    <span className={cx(buttonCls.ghost, 'min-h-10 cursor-default text-muted hover:border-line', className)} title={t.classroom.opensHint}>
      {now < opensAt ? t.classroom.opensAt(f.time(opensAt, tz)) : t.classroom.over}
    </span>
  )
}
