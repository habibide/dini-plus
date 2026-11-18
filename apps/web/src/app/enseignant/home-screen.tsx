'use client'

import { COMMISSION_TIERS, commissionRate, subject } from '@dini/core'
import type { AgendaItem } from '@dini/data/supabase'
import { useAgenda, useEarnings, useMyTeacher, useStartApplication } from '@dini/data/react'
import Link from 'next/link'
import { StatusBanner } from '@/components/teacher'
import { Money, buttonCls, cx } from '@/components/ui'
import { JoinButton } from '@/components/video'
import { useFormat, useT } from '@/i18n/locale'

export function TeacherHome() {
  const me = useMyTeacher()
  const agenda = useAgenda()
  const earnings = useEarnings()
  const start = useStartApplication()
  const all = useT()
  const m = all.teacherHome
  const fmt = useFormat()
  const pct = (r: number) => `${Math.round(r * 100)}${fmt.locale === 'fr' ? ' ' : ''}%`

  if (me.isPending) return <p className="mx-auto max-w-6xl px-5 py-10 text-muted">{all.common.loading}</p>
  const t = me.data
  if (!t) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-5 py-12">
        <h1 className="font-display text-3xl">{m.title}</h1>
        <p>{m.noProfile}</p>
        <button type="button" className={buttonCls.primary} disabled={start.isPending} onClick={() => start.mutate()}>{m.start}</button>
      </div>
    )
  }

  const now = Date.now()
  const items = agenda.data ?? []
  const toComplete = items.filter((b) => b.status === 'scheduled' && b.startsAt <= now)
  const upcoming = items.filter((b) => b.status === 'scheduled' && b.startsAt > now)
  const hours = earnings.data?.hoursTaught ?? t.hoursTaught
  const rate = commissionRate(hours)
  const next = COMMISSION_TIERS.find((x) => hours < x.fromHours)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">{m.hello(t.name.split(' ')[0])}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/enseignant/disponibilites" className={buttonCls.ghost}>{m.availability}</Link>
          <Link href="/enseignant/candidature" className={buttonCls.ghost}>{t.status === 'approved' ? m.editProfile : m.myApplication}</Link>
        </div>
      </div>
      <StatusBanner t={t} />

      {t.status === 'approved' && <>
        {toComplete.length > 0 && (
          <section className="flex flex-col border border-ochre bg-white">
            <h2 className="border-b border-line px-6 py-4 font-display text-xl">{m.toComplete}</h2>
            <p className="px-6 pt-4 text-muted">{m.toCompleteText}</p>
            <SessionList items={toComplete} action={m.writeReport} />
          </section>
        )}

        <section className="flex flex-col border border-line bg-white">
          <h2 className="border-b border-line px-6 py-4 font-display text-xl">{m.upcoming}</h2>
          {agenda.isPending ? <p className="px-6 py-5 text-muted">{all.common.loading}</p>
            : upcoming.length ? <SessionList items={upcoming} />
            : <p className="px-6 py-5 text-muted">{m.noUpcoming}</p>}
        </section>

        <section className="grid gap-px border border-line bg-line md:grid-cols-3">
          <div className="flex flex-col gap-1 bg-white px-6 py-5">
            <h2 className="text-sm font-semibold text-muted">{m.earned}</h2>
            <p className="font-display text-3xl text-green">{fmt.euros(earnings.data?.releasedEur ?? 0)}</p>
            <p className="text-sm text-muted">{m.earnedText}</p>
          </div>
          <div className="flex flex-col gap-1 bg-white px-6 py-5">
            <h2 className="text-sm font-semibold text-muted">{m.pending}</h2>
            <p className="font-display text-3xl">{m.sessions(earnings.data?.pending.count ?? 0)}</p>
            <p className="text-sm text-muted">{earnings.data?.pending.releaseAt[0] ? m.nextRelease(fmt.dateTime(Math.min(...earnings.data.pending.releaseAt), Intl.DateTimeFormat().resolvedOptions().timeZone)) : m.nothingPending}</p>
          </div>
          <div className="flex flex-col gap-1 bg-white px-6 py-5">
            <h2 className="text-sm font-semibold text-muted">{m.commission}</h2>
            <p className="font-display text-3xl">{pct(rate)}</p>
            <p className="text-sm text-muted">{m.hours(Math.round(hours))}{next ? m.nextTier(Math.round(next.rate * 100), next.fromHours) : m.lowest}</p>
          </div>
        </section>
      </>}
    </div>
  )
}

function SessionList({ items, action }: { items: AgendaItem[]; action?: string }) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const all = useT()
  const fmt = useFormat()
  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((b) => (
        <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex flex-col gap-0.5">
            <strong className="first-letter:uppercase">{fmt.dateTime(b.startsAt, tz)}</strong>
            <span className="text-sm text-muted">
              {b.learner.name}, {all.common.years(new Date().getFullYear() - b.learner.birthYear)} · {fmt.label(subject(b.subject).label)}{b.kind === 'trial' ? all.teacherHome.trial : ''} · <Money amount={b.amount} currency={b.currency} />
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {b.status === 'scheduled' && <JoinButton booking={b} tz={tz} />}
            <Link href={`/enseignant/seances/${b.id}`} className={cx(action ? buttonCls.primary : buttonCls.ghost, 'min-h-10')}>{action ?? all.teacherHome.details}</Link>
          </div>
        </li>
      ))}
    </ul>
  )
}
