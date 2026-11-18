'use client'

import { HOUR, PLANS, surah, type Booking } from '@dini/core'
import type { LearnerDashboard } from '@dini/data'
import { useCancelBooking, useDashboard, useDini, useDisputeBooking, useFamily } from '@dini/data/react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Modal, Money, Monogram, buttonCls, cx } from '@/components/ui'
import { JoinButton } from '@/components/video'
import { useFormat, useT } from '@/i18n/locale'

export function DashboardScreen() {
  const family = useFamily()
  const dash = useDashboard()
  const justBooked = useSearchParams().get('reservee')
  const all = useT()
  const m = all.dashboard
  if (!family.data || !dash.data) return <p className="mx-auto max-w-6xl px-5 py-10 text-muted">{m.loading}</p>
  const { family: fam } = family.data
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">{m.hello(fam.parentName.split(' ')[0])}</h1>
          <p className="text-muted">{fam.isAdultLearner ? m.adult : m.children}</p>
        </div>
        <Link href="/enseignants" className={buttonCls.ghost}>{all.nav.find}</Link>
      </div>
      {justBooked && <p role="status" className="rounded-sm bg-leaf px-4 py-3"><strong>{m.booked}</strong>{m.bookedText}</p>}
      {dash.data.length === 0 && (
        <div className="flex flex-col items-start gap-3 overflow-hidden rounded-md border-[1.5px] border-line bg-white p-6">
          <p className="text-lg">{m.empty}</p>
          <Link href="/enseignants" className={buttonCls.primary}>{m.choose}</Link>
        </div>
      )}
      {dash.data.map((d) => <LearnerBlock key={d.learner.id} d={d} tz={fam.timezone} />)}
    </div>
  )
}

function LearnerBlock({ d, tz }: { d: LearnerDashboard; tz: string }) {
  const { api } = useDini()
  const cancel = useCancelBooking()
  const dispute = useDisputeBooking()
  const [toCancel, setToCancel] = useState<Booking | null>(null)
  const [toDispute, setToDispute] = useState<Booking | null>(null)
  const m = useT().dashboard
  const fmt = useFormat()
  const now = api.now()
  const plan = d.subscription && PLANS.find((p) => p.id === d.subscription!.planId)
  const age = new Date().getFullYear() - d.learner.birthYear

  return (
    <article className="flex flex-col overflow-hidden rounded-md border-[1.5px] border-line bg-white">
      <header className="flex flex-wrap items-center gap-4 border-b border-line px-6 py-4">
        <Monogram name={d.learner.name} size="sm" />
        <div className="min-w-[200px] flex-1"><h2 className="font-display text-xl">{d.learner.name}</h2><p className="text-sm text-muted">{m.goal(age, d.learner.goals)}</p></div>
        {d.subscription && plan && (
          <p className="text-sm text-muted"><strong className="font-display text-2xl font-normal text-green">{d.subscription.sessionsRemaining}</strong>{m.remaining(d.subscription.sessionsRemaining, d.subscription.sessionsPerMonth).after}{fmt.label(plan.label)}, <Money amount={d.subscription.price} currency={d.subscription.currency} />{m.perMonth}</p>
        )}
      </header>
      <div className="grid md:grid-cols-2">
        <section className="flex flex-col gap-2 border-b border-line px-6 py-5 md:border-e">
          <h3 className="text-sm font-semibold text-muted">{m.next}</h3>
          {d.next ? <>
            <p className="font-display text-xl first-letter:uppercase">{fmt.dateTime(d.next.startsAt, tz)}</p>
            <p className="text-sm text-muted">{d.next.kind === 'trial' ? m.trialPrefix : ''}{m.yourTz}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <JoinButton booking={d.next} tz={tz} />
              <button type="button" className={cx(buttonCls.ghost, 'min-h-10')} onClick={() => setToCancel(d.next!)}>{m.cancelOrMove}</button>
            </div>
          </> : <><p className="text-muted">{m.noneNext}</p><Link href="/enseignants" className={cx(buttonCls.primary, 'min-h-10 self-start')}>{m.book}</Link></>}
        </section>
        <section className="flex flex-col gap-2 border-b border-line px-6 py-5">
          <h3 className="text-sm font-semibold text-muted">{m.attendance}</h3>
          {d.attendance.held ? <>
            <p><strong className="font-display text-3xl font-normal text-green">{d.attendance.present}</strong>{m.attended(d.attendance.present, d.attendance.held)}</p>
            <div role="img" aria-label={m.attendedLabel(d.attendance.present, d.attendance.held)} className="flex gap-2.5 p-1">
              {d.attendance.marks.map((m, i) => <i key={i} className={cx('size-3 rotate-45', m === 'missed' ? 'border-[1.5px] border-bad' : 'bg-green2')} />)}
            </div>
          </> : <p className="text-muted">{m.noAttendance}</p>}
        </section>
        <section className="flex flex-col gap-2 border-b border-line px-6 py-5 md:border-b-0 md:border-e">
          <h3 className="text-sm font-semibold text-muted">{m.memorisation}</h3>
          {d.progress.length === 0 ? <p className="text-muted">{m.noProgress}</p> : (
            <ul className="flex flex-col gap-1.5">
              {d.progress.map((p) => {
                const s = surah(p.surah)!
                return (
                  <li key={p.surah} className="grid grid-cols-[90px_minmax(0,1fr)_44px] items-center gap-3">
                    <span lang="ar" dir="rtl" className="font-arabic text-xl">{s.ar}</span>
                    <span dir="rtl" role="img" aria-label={m.versesOf(s.name, p.reached, s.ayat)} className="block h-2 overflow-hidden rounded-full bg-leaf"><span className="block h-2 bg-green2" style={{ width: `${(p.reached / s.ayat) * 100}%` }} /></span>
                    <span className="text-end text-sm tabular-nums text-muted">{p.reached}/{s.ayat}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        <section className="flex flex-col gap-2 px-6 py-5">
          <h3 className="text-sm font-semibold text-muted">{m.lastReport}</h3>
          {d.lastReport?.report ? (
            <Link href={`/suivi/seances/${d.lastReport.id}`} className="flex flex-col gap-1 rounded-sm border border-line p-4 hover:border-green">
              <span className="text-sm text-muted first-letter:uppercase">{fmt.day(d.lastReport.startsAt, tz)}</span>
              <strong>{d.lastReport.report.covered}</strong>
              <span className="text-sm">{d.lastReport.report.comment}</span>
              <span className="text-sm font-semibold text-green">{m.readReport}</span>
            </Link>
          ) : <p className="text-muted">{m.noReport}</p>}
        </section>
      </div>
      {d.awaitingValidation.map((b) => (
        <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-leaf px-6 py-3">
          {b.status === 'missed'
            ? <span><strong className="first-letter:uppercase">{m.missed(fmt.day(b.startsAt, tz))}</strong>{m.missedText(Math.max(1, Math.ceil((b.releaseAt - now) / HOUR)))}</span>
            : <span><strong className="first-letter:uppercase">{m.session(fmt.day(b.startsAt, tz))}</strong>{m.sessionText(Math.max(1, Math.ceil((b.releaseAt - now) / HOUR)))}</span>}
          <button type="button" className={cx(buttonCls.ghost, 'min-h-10')} onClick={() => setToDispute(b)}>{b.status === 'missed' ? m.contest : m.report}</button>
        </div>
      ))}
      {d.disputed.map((b) => (
        <p key={b.id} className="border-t border-line bg-warnbg px-6 py-3 text-warn"><strong>{m.disputed}</strong>{m.disputedText(fmt.day(b.startsAt, tz))}</p>
      ))}

      {toCancel && (
        <Modal title={m.cancelTitle} onClose={() => setToCancel(null)}>
          <p>{toCancel.startsAt - now >= 24 * HOUR ? (toCancel.kind === 'trial' ? m.refund : m.backToPlan) : m.due}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonCls.ghost} onClick={() => setToCancel(null)}>{m.keep}</button>
            <Link href={`/enseignants/${toCancel.teacherId}`} className={buttonCls.primary} onClick={() => { cancel.mutate(toCancel.id); setToCancel(null) }}>{m.cancelAndPick}</Link>
          </div>
        </Modal>
      )}
      {toDispute && (
        <Modal title={m.disputeTitle} onClose={() => setToDispute(null)}>
          <p>{m.disputeText(fmt.day(toDispute.startsAt, tz))}</p>
          <button type="button" className={buttonCls.primary} onClick={() => { dispute.mutate(toDispute.id); setToDispute(null) }}>{m.sendDispute}</button>
        </Modal>
      )}
    </article>
  )
}
