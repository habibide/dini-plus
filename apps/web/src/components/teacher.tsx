'use client'

import type { Teacher } from '@dini/core'
import type { MyTeacher } from '@dini/data/supabase'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { buttonCls, cx } from './styles'
import { useT } from '@/i18n/locale'

/** Sélection multiple en pastilles. */
export function ChipSet<T extends string>({ legend, options, value, onChange }: { legend: string; options: { id: T; label: string }[]; value: T[]; onChange: (v: T[]) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o.id)
          return (
            <button key={o.id} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])}
              className={cx('min-h-10 cursor-pointer rounded-full border-[1.5px] px-3.5 text-sm font-semibold', on ? 'border-green bg-green text-white' : 'border-line bg-white hover:border-green')}>{o.label}</button>
          )
        })}
      </div>
    </fieldset>
  )
}

const ORDER = [1, 2, 3, 4, 5, 6, 0]
const TIMES = Array.from({ length: 49 }, (_, i) => i * 30)
export const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

type Rule = Teacher['availability'][number]

/** Plages hebdomadaires, en heure locale de l'enseignant, par pas de 30 minutes. */
export function AvailabilityEditor({ value, onChange }: { value: Rule[]; onChange: (v: Rule[]) => void }) {
  const set = (i: number, patch: Partial<Rule>) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const { availability: t, common } = useT()
  const WEEKDAYS = t.weekdays
  return (
    <div className="flex flex-col divide-y divide-line overflow-hidden rounded-md border-[1.5px] border-line bg-white">
      {ORDER.map((weekday) => {
        const rows = value.map((r, i) => ({ r, i })).filter((x) => x.r.weekday === weekday)
        return (
          <div key={weekday} className="flex flex-wrap items-start gap-x-6 gap-y-2 px-4 py-3">
            <span className="w-24 pt-2 font-semibold">{WEEKDAYS[weekday]}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {rows.length === 0 && <span className="pt-2 text-muted">{t.unavailable}</span>}
              {rows.map(({ r, i }) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select aria-label={t.start(WEEKDAYS[weekday])} value={r.start} onChange={(e) => set(i, { start: Number(e.target.value), end: Math.max(r.end, Number(e.target.value) + 30) })} className="min-h-10 rounded-sm border border-line bg-white px-2">
                    {TIMES.slice(0, -1).map((t) => <option key={t} value={t}>{hm(t)}</option>)}
                  </select>
                  <span>{t.to}</span>
                  <select aria-label={t.end(WEEKDAYS[weekday])} value={r.end} onChange={(e) => set(i, { end: Number(e.target.value) })} className="min-h-10 rounded-sm border border-line bg-white px-2">
                    {TIMES.filter((t) => t > r.start).map((t) => <option key={t} value={t}>{t === 1440 ? '24:00' : hm(t)}</option>)}
                  </select>
                  <button type="button" className="cursor-pointer px-2 text-sm text-muted underline hover:text-ink" onClick={() => onChange(value.filter((_, j) => j !== i))}>{common.remove}</button>
                </div>
              ))}
            </div>
            <button type="button" className={cx(buttonCls.ghost, 'min-h-10 px-3 text-sm')}
              onClick={() => onChange([...value, { weekday, start: 17 * 60, end: 19 * 60 }])}>{t.addRange}</button>
          </div>
        )
      })}
    </div>
  )
}

const TONE: Record<MyTeacher['status'], string> = { draft: 'bg-leaf', submitted: 'bg-leaf', rejected: 'bg-warnbg text-warn', approved: 'bg-leaf' }

export function StatusBanner({ t, action }: { t: MyTeacher; action?: ReactNode }) {
  const m = useT().status
  const s = m[t.status]
  return (
    <div className={cx('flex flex-wrap items-center justify-between gap-3 px-5 py-4', TONE[t.status])}>
      <div className="flex max-w-prose flex-col gap-1">
        <strong>{s.title}</strong>
        <span>{s.text}</span>
        {t.reviewNote && t.status === 'rejected' && <span className="mt-1 border-s-2 border-warn ps-3">« {t.reviewNote} »</span>}
      </div>
      {action ?? (t.status === 'approved'
        ? <Link href={`/teachers/${t.id}`} className={buttonCls.ghost}>{m.publicProfile}</Link>
        : t.status !== 'submitted' && <Link href="/teacher/application" className={buttonCls.primary}>{t.status === 'draft' ? m.complete : m.resume}</Link>)}
    </div>
  )
}
