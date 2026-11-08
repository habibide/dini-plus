'use client'

import { formatTime } from '@dini/core'
import { videoWindow } from '@dini/data'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { buttonCls, cx } from './styles'

/** Heure courante, rafraîchie chaque minute : le bouton s'active tout seul à l'ouverture de la salle. */
function useMinute() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id) }, [])
  return now
}

export function JoinButton({ booking, tz, className }: { booking: { id: string; startsAt: number; minutes: number }; tz: string; className?: string }) {
  const now = useMinute()
  const { opensAt, closesAt } = videoWindow(booking)
  if (now >= opensAt && now <= closesAt) {
    return <Link href={`/cours/${booking.id}`} className={cx(buttonCls.primary, 'min-h-10', className)}>Rejoindre le cours</Link>
  }
  return (
    <span className={cx(buttonCls.ghost, 'min-h-10 cursor-default text-muted hover:border-line', className)} title="La salle ouvre 10 minutes avant le début.">
      {now < opensAt ? `Salle ouverte à ${formatTime(opensAt, tz)}` : 'Cours terminé'}
    </span>
  )
}
