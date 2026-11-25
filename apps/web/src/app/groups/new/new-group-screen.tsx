'use client'

import { PLANS, roundMoney, subject, type PlanId, type SubjectId } from '@dini/core'
import type { GroupSlot } from '@dini/data/supabase'
import { useCreateGroup, useFamily, useSlots, useTeacher } from '@dini/data/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { FormError } from '@/components/auth'
import { useSlotLabel, weeklySlot } from '@/components/groups'
import { Money, Monogram, buttonCls, cx } from '@/components/ui'
import { useFormat, useT } from '@/i18n/locale'

// Création d'un groupe : élève de l'organisateur, matière, formule et créneaux fixes de la semaine.
// La part de chacun est le tarif du professeur moins la remise de groupe (40 %).

const GROUP_DISCOUNT = 0.4
const perWeek = (sessions: number) => Math.ceil(sessions / 4)

export function NewGroupScreen() {
  const params = useSearchParams()
  const teacherId = params.get('teacher') ?? ''
  const router = useRouter()
  const teacher = useTeacher(teacherId)
  const family = useFamily()
  const week = useSlots(teacherId, 0)
  const create = useCreateGroup()
  const all = useT()
  const m = all.groups
  const fmt = useFormat()
  const slotLabel = useSlotLabel()
  const [learnerId, setLearnerId] = useState<string>()
  const [subj, setSubj] = useState<SubjectId>()
  const [planId, setPlanId] = useState<PlanId>('discovery')
  const [picked, setPicked] = useState<GroupSlot[]>([])

  const t = teacher.data
  // Créneaux de la semaine à venir, ramenés à un jour et une heure fixes dans le fuseau du professeur.
  const options = useMemo(() => {
    if (!t || !week.data) return []
    const seen = new Map<string, GroupSlot>()
    for (const at of week.data) {
      const s = weeklySlot(at, t.timezone)
      seen.set(`${s.weekday}:${s.start}`, s)
    }
    return [...seen.values()].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.start - b.start)
  }, [t, week.data])

  if (!t || !family.data) return <p className="mx-auto max-w-6xl px-5 py-10 text-muted">{all.common.loading}</p>
  const { learners } = family.data
  const learner = learnerId ?? learners[0]?.id
  const subjectId = subj ?? t.subjects[0]
  const plan = PLANS.find((p) => p.id === planId)!
  const need = perWeek(plan.sessions)
  const share = roundMoney(t.price.amount * plan.sessions * (1 - GROUP_DISCOUNT), t.price.currency)
  const key = (s: GroupSlot) => `${s.weekday}:${s.start}`
  const toggle = (s: GroupSlot) => setPicked((cur) => cur.some((x) => key(x) === key(s)) ? cur.filter((x) => key(x) !== key(s)) : cur.length < need ? [...cur, s] : cur)

  async function submit() {
    if (!learner) return
    const id = await create.mutateAsync({ learnerId: learner, teacherId: t!.id, subject: subjectId, planId, slots: picked }).catch(() => null)
    if (id) router.push(`/groups/${id}`)
  }

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-10 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-5">
        <Link href={`/teachers/${t.id}`} className="text-sm text-muted hover:text-ink">{all.booking.backToProfile}</Link>
        <h1 className="font-display text-3xl">{m.newTitle(t.name)}</h1>
        <p className="text-muted">{m.newIntro}</p>

        <section className="flex flex-col gap-4 overflow-hidden rounded-md border-[1.5px] border-line bg-white p-6">
          {learners.length > 1 && (
            <label className="flex flex-col gap-1 text-sm font-semibold">{m.student}
              <select value={learner} onChange={(e) => setLearnerId(e.target.value)} className="min-h-11 rounded-sm border border-line bg-white px-2 font-normal">
                {learners.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
          )}
          {t.subjects.length > 1 && (
            <label className="flex flex-col gap-1 text-sm font-semibold">{m.subject}
              <select value={subjectId} onChange={(e) => setSubj(e.target.value as SubjectId)} className="min-h-11 rounded-sm border border-line bg-white px-2 font-normal">
                {t.subjects.map((s) => <option key={s} value={s}>{fmt.label(subject(s).label)}</option>)}
              </select>
            </label>
          )}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">{m.plan}</legend>
            {PLANS.map((p) => (
              <button key={p.id} type="button" aria-pressed={planId === p.id} onClick={() => { setPlanId(p.id); setPicked([]) }}
                className={cx('flex cursor-pointer items-center justify-between gap-4 rounded-sm border bg-white px-4 py-3 text-start', planId === p.id ? 'border-green shadow-[inset_0_0_0_1px] shadow-green' : 'border-line hover:border-green')}>
                <span><strong>{m.planLine(fmt.label(p.label), p.sessions)}</strong><span className="block text-sm text-muted">{fmt.label(p.usage)}</span></span>
              </button>
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold">{m.slots(need)}</legend>
            <p className="text-sm text-muted">{m.slotsTz(t.city)}</p>
            {week.isPending ? <p className="text-muted">{all.common.loading}</p>
              : !options.length ? <p className="rounded-sm bg-leaf px-3 py-2">{m.noSlots}</p>
              : (
                <div className="flex flex-wrap gap-2">
                  {options.map((s) => {
                    const on = picked.some((x) => key(x) === key(s))
                    return (
                      <button key={key(s)} type="button" aria-pressed={on} onClick={() => toggle(s)} disabled={!on && picked.length >= need}
                        className={cx('min-h-11 cursor-pointer rounded-sm border-[1.5px] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40', on ? 'border-green bg-green text-white' : 'border-green text-green2 hover:bg-soft')}>
                        {slotLabel(s)}
                      </button>
                    )
                  })}
                </div>
              )}
          </fieldset>
          <FormError message={create.error?.message} />
          <button type="button" className={cx(buttonCls.primary, 'self-start')} disabled={create.isPending || !learner || picked.length !== need} onClick={submit}>
            {create.isPending ? m.creating : m.create}
          </button>
        </section>
      </div>

      <aside className="flex flex-col gap-3 rounded-sm bg-leaf p-5 lg:sticky lg:top-4">
        <div className="flex items-center gap-3"><Monogram name={t.name} size="sm" photo={t.photoUrl} /><strong>{t.name}</strong></div>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted">{m.subject}</dt><dd>{fmt.label(subject(subjectId).label)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted">{m.plan}</dt><dd>{fmt.label(plan.label)}</dd></div>
          {picked.map((s) => <div key={key(s)} className="flex justify-between gap-4"><dt className="text-muted">·</dt><dd>{slotLabel(s)}</dd></div>)}
          <div className="flex justify-between gap-4 border-t border-sand pt-2 font-bold"><dt>{m.pricePer}</dt><dd><Money amount={share} currency={t.price.currency} />{m.perMonth}</dd></div>
        </dl>
        <p className="text-xs text-muted">{m.discount}</p>
      </aside>
    </div>
  )
}
