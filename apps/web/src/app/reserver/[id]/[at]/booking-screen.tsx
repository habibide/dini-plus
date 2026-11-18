'use client'

import { ESCROW_HOURS, FREE_CANCEL_HOURS, subject, type PaymentMethod, type SubjectId } from '@dini/core'
import { SlotTakenError, type BookingChoice } from '@dini/data'
import { useAddLearner, useCreateBooking, useFamily, useQuote, useTeacher } from '@dini/data/react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { Money, Monogram, buttonCls, cx } from '@/components/ui'
import { useFormat, useT } from '@/i18n/locale'

function Option({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cx('grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 rounded-sm border bg-white px-4 py-3 text-start', on ? 'border-green shadow-[inset_0_0_0_1px] shadow-green' : 'border-line hover:border-green')}>
      {children}
    </button>
  )
}

export function BookingScreen() {
  const { id, at: atParam } = useParams<{ id: string; at: string }>()
  const at = Number(atParam)
  const router = useRouter()
  const teacher = useTeacher(id)
  const family = useFamily()
  const [step, setStep] = useState(0)
  const [learnerId, setLearnerId] = useState<string>()
  const [subj, setSubj] = useState<SubjectId>()
  const [choice, setChoice] = useState<BookingChoice>('trial')
  const [method, setMethod] = useState<PaymentMethod>()
  const [newChild, setNewChild] = useState('')
  const quote = useQuote(id, learnerId)
  const create = useCreateBooking()
  const addLearner = useAddLearner()
  const [error, setError] = useState<string>()
  const all = useT()
  const m = all.booking
  const fmt = useFormat()

  if (!teacher.data || !family.data) return <p className="mx-auto max-w-6xl px-5 py-10 text-muted">{all.common.loading}</p>
  const t = teacher.data
  const { family: fam, learners } = family.data
  const tz = fam.timezone
  const tzLabel = family.data.country.timezones.find((x) => x.id === tz)?.label
  const learner = learners.find((l) => l.id === learnerId) ?? (learners.length === 1 ? learners[0] : undefined)
  const q = quote.data
  const subjectId = subj ?? t.subjects[0]
  const total = !q ? 0 : choice === 'trial' ? q.trial : choice === 'credit' ? 0 : q.plans.find((p) => p.id === choice)!.total
  const pay = method ?? q?.payments[0]

  if (learnerId === undefined && learner) setLearnerId(learner.id)
  // Essai déjà fait avec cet enseignant : on propose le forfait en cours, sinon la première formule.
  if (q && !q.trialAvailable && choice === 'trial') setChoice(q.credit ? 'credit' : q.plans[0].id)

  async function confirm() {
    setError(undefined)
    try {
      const { booking } = await create.mutateAsync({ learnerId: learner!.id, teacherId: t.id, subject: subjectId, startsAt: at, choice, method: pay })
      router.push(`/suivi?reservee=${booking.id}`)
    } catch (e) {
      setError(e instanceof SlotTakenError ? e.message : m.failed)
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-10 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-5">
        <Link href={`/enseignants/${t.id}`} className="text-sm text-muted hover:text-ink">{m.backToProfile}</Link>
        <h1 className="font-display text-3xl">{m.title(t.name)}</h1>
        <ol className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          {m.steps.map((s, i) => (
            <li key={s} aria-current={i === step ? 'step' : undefined} className={cx('flex items-center gap-2', i === step && 'font-semibold text-ink')}>
              <span className={cx('grid size-6 place-items-center rounded-full border text-xs', i === step ? 'border-green bg-green text-white' : i < step ? 'border-green2 bg-leaf text-green' : 'border-line')}>{i + 1}</span>{s}
            </li>
          ))}
        </ol>

        <section className="flex flex-col gap-4 overflow-hidden rounded-md border-[1.5px] border-line bg-white p-6">
          {step === 0 && <>
            <h2 className="font-display text-xl">{m.forWhom}</h2>
            <div className="flex flex-col gap-2">
              {learners.map((l) => (
                <Option key={l.id} on={learner?.id === l.id} onClick={() => { setLearnerId(l.id); setChoice('trial') }}>
                  <strong>{l.name}</strong><span className="row-span-2 text-sm text-muted">{all.common.years(new Date().getFullYear() - l.birthYear)}</span>
                  <span className="text-sm text-muted">{l.goals}</span>
                </Option>
              ))}
            </div>
            {!fam.isAdultLearner && (
              <form className="flex flex-wrap items-end gap-2" onSubmit={async (e) => { e.preventDefault(); const l = await addLearner.mutateAsync({ name: newChild.trim(), birthYear: new Date().getFullYear() - 8 }); setLearnerId(l.id); setNewChild('') }}>
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-semibold">{m.addChild}
                  <input value={newChild} onChange={(e) => setNewChild(e.target.value)} placeholder={m.childPlaceholder} className="min-h-11 rounded-sm border border-line px-3 font-normal" />
                </label>
                <button type="submit" className={buttonCls.ghost} disabled={!newChild.trim()}>{all.common.add}</button>
              </form>
            )}
            {t.subjects.length > 1 && (
              <label className="flex flex-col gap-1 text-sm font-semibold">{m.subject}
                <select value={subjectId} onChange={(e) => setSubj(e.target.value as SubjectId)} className="min-h-11 rounded-sm border border-line bg-white px-2 font-normal">
                  {t.subjects.map((s) => <option key={s} value={s}>{fmt.label(subject(s).label)}</option>)}
                </select>
              </label>
            )}
            <button type="button" className={cx(buttonCls.primary, 'self-start')} disabled={!learner} onClick={() => setStep(1)}>{all.common.continue}</button>
          </>}

          {step === 1 && q && <>
            <h2 className="font-display text-xl">{m.which}</h2>
            <div className="flex flex-col gap-2">
              {q.credit && (
                <Option on={choice === 'credit'} onClick={() => setChoice('credit')}>
                  <strong>{m.useCredit}</strong><span className="row-span-2 font-display text-lg text-green">{all.common.included}</span>
                  <span className="text-sm text-muted">{m.remaining(q.credit.remaining)}</span>
                </Option>
              )}
              {q.trialAvailable && <Option on={choice === 'trial'} onClick={() => setChoice('trial')}>
                <strong>{m.trial(q.minutes.trial)}</strong><span className="row-span-2 font-display text-lg text-green"><Money amount={q.trial} currency={q.currency} /></span>
                <span className="text-sm text-muted">{m.trialText}</span>
              </Option>}
              {q.plans.map((p) => (
                <Option key={p.id} on={choice === p.id} onClick={() => setChoice(p.id)}>
                  <strong>{m.plan(fmt.label(p.label), p.sessions, q.minutes.course)}</strong>
                  <span className="row-span-2 font-display text-lg text-green"><Money amount={p.total} currency={q.currency} /><small className="font-sans text-xs text-muted">{m.perMonth}</small></span>
                  <span className="text-sm text-muted">{m.planText(fmt.label(p.usage))}</span>
                </Option>
              ))}
            </div>
            <p className="text-xs text-muted">{m.indicative}</p>
            <div className="flex gap-2">
              <button type="button" className={buttonCls.ghost} onClick={() => setStep(0)}>{all.common.back}</button>
              <button type="button" className={buttonCls.primary} onClick={() => setStep(2)}>{all.common.continue}</button>
            </div>
          </>}

          {step === 2 && q && <>
            <h2 className="font-display text-xl">{total ? m.howPay : m.check}</h2>
            {total > 0 && (
              <div className="flex flex-col gap-2">
                {q.payments.map((pm) => (
                  <Option key={pm} on={pay === pm} onClick={() => setMethod(pm)}>
                    <strong>{m.payments[pm]}</strong>
                    <span className="row-span-2 text-sm text-muted">{pm === 'card' ? m.card : m.phone}</span>
                    <span />
                  </Option>
                ))}
                <p className="rounded-sm bg-leaf px-3 py-2 text-sm">{m.simulated}</p>
              </div>
            )}
            <p>{total ? m.escrow(ESCROW_HOURS) : m.usesCredit}</p>
            <p className="text-sm text-muted">{m.cancelRule(FREE_CANCEL_HOURS)}</p>
            {error && <p role="alert" className="rounded-sm bg-warnbg px-3 py-2 text-warn">{error} <Link href={`/enseignants/${t.id}`} className="font-semibold underline">{m.otherSlot}</Link></p>}
            <div className="flex gap-2">
              <button type="button" className={buttonCls.ghost} disabled={create.isPending} onClick={() => setStep(1)}>{all.common.back}</button>
              <button type="button" className={buttonCls.primary} disabled={create.isPending} onClick={confirm}>
                {create.isPending ? m.booking : total ? <>{m.pay}<Money amount={total} currency={q.currency} /></> : m.confirm}
              </button>
            </div>
          </>}
        </section>
      </div>

      <aside className="flex flex-col gap-3 rounded-sm bg-leaf p-5 lg:sticky lg:top-4">
        <div className="flex items-center gap-3"><Monogram name={t.name} size="sm" /><strong>{t.name}</strong></div>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted">{m.date}</dt><dd className="text-end first-letter:uppercase">{fmt.day(at, tz)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted">{m.time}</dt><dd>{m.timeIn(fmt.time(at, tz), tzLabel ?? '')}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted">{m.atTeacher}</dt><dd>{m.atCity(fmt.time(at, t.timezone), t.city)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted">{m.subject}</dt><dd>{fmt.label(subject(subjectId).label)}</dd></div>
          {learner && <div className="flex justify-between gap-4"><dt className="text-muted">{m.student}</dt><dd>{learner.name}</dd></div>}
          {step > 0 && q && <div className="flex justify-between gap-4 border-t border-sand pt-2 font-bold"><dt>{m.toPay}</dt><dd>{total ? <Money amount={total} currency={q.currency} /> : all.common.included}</dd></div>}
        </dl>
      </aside>
    </div>
  )
}
