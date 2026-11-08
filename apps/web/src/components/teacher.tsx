'use client'

import type { Teacher } from '@dini/core'
import type { MyTeacher } from '@dini/data/supabase'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { buttonCls, cx } from './styles'

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
              className={cx('min-h-10 cursor-pointer rounded-sm border px-3 text-sm', on ? 'border-green bg-green text-white' : 'border-line bg-white hover:border-green')}>{o.label}</button>
          )
        })}
      </div>
    </fieldset>
  )
}

export const WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const ORDER = [1, 2, 3, 4, 5, 6, 0]
const TIMES = Array.from({ length: 49 }, (_, i) => i * 30)
export const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

type Rule = Teacher['availability'][number]

/** Plages hebdomadaires, en heure locale de l'enseignant, par pas de 30 minutes. */
export function AvailabilityEditor({ value, onChange }: { value: Rule[]; onChange: (v: Rule[]) => void }) {
  const set = (i: number, patch: Partial<Rule>) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <div className="flex flex-col divide-y divide-line border border-line bg-white">
      {ORDER.map((weekday) => {
        const rows = value.map((r, i) => ({ r, i })).filter((x) => x.r.weekday === weekday)
        return (
          <div key={weekday} className="flex flex-wrap items-start gap-x-6 gap-y-2 px-4 py-3">
            <span className="w-24 pt-2 font-semibold">{WEEKDAYS[weekday]}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {rows.length === 0 && <span className="pt-2 text-muted">Indisponible</span>}
              {rows.map(({ r, i }) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select aria-label={`${WEEKDAYS[weekday]}, début`} value={r.start} onChange={(e) => set(i, { start: Number(e.target.value), end: Math.max(r.end, Number(e.target.value) + 30) })} className="min-h-10 rounded-sm border border-line bg-white px-2">
                    {TIMES.slice(0, -1).map((t) => <option key={t} value={t}>{hm(t)}</option>)}
                  </select>
                  <span>à</span>
                  <select aria-label={`${WEEKDAYS[weekday]}, fin`} value={r.end} onChange={(e) => set(i, { end: Number(e.target.value) })} className="min-h-10 rounded-sm border border-line bg-white px-2">
                    {TIMES.filter((t) => t > r.start).map((t) => <option key={t} value={t}>{t === 1440 ? '24:00' : hm(t)}</option>)}
                  </select>
                  <button type="button" className="cursor-pointer px-2 text-sm text-muted underline hover:text-ink" onClick={() => onChange(value.filter((_, j) => j !== i))}>Retirer</button>
                </div>
              ))}
            </div>
            <button type="button" className={cx(buttonCls.ghost, 'min-h-10 px-3 text-sm')}
              onClick={() => onChange([...value, { weekday, start: 17 * 60, end: 19 * 60 }])}>Ajouter une plage</button>
          </div>
        )
      })}
    </div>
  )
}

const STATUS: Record<MyTeacher['status'], { tone: string; title: string; text: string }> = {
  draft: { tone: 'bg-leaf', title: 'Candidature à compléter', text: 'Remplissez votre profil, puis envoyez-le : notre équipe le vérifie avant publication.' },
  submitted: { tone: 'bg-leaf', title: 'Candidature en cours d’examen', text: 'Notre équipe vérifie votre identité, vos diplômes et votre ijaza, en général sous 3 jours ouvrés.' },
  rejected: { tone: 'bg-warnbg text-warn', title: 'Candidature à reprendre', text: 'Corrigez votre profil selon le message ci-dessous, puis renvoyez-le.' },
  approved: { tone: 'bg-leaf', title: 'Profil publié', text: 'Les familles peuvent vous trouver et réserver vos créneaux.' },
}

export function StatusBanner({ t, action }: { t: MyTeacher; action?: ReactNode }) {
  const s = STATUS[t.status]
  return (
    <div className={cx('flex flex-wrap items-center justify-between gap-3 px-5 py-4', s.tone)}>
      <div className="flex max-w-prose flex-col gap-1">
        <strong>{s.title}</strong>
        <span>{s.text}</span>
        {t.reviewNote && t.status === 'rejected' && <span className="mt-1 border-l-2 border-warn pl-3">« {t.reviewNote} »</span>}
      </div>
      {action ?? (t.status === 'approved'
        ? <Link href={`/enseignants/${t.id}`} className={buttonCls.ghost}>Voir mon profil public</Link>
        : t.status !== 'submitted' && <Link href="/enseignant/candidature" className={buttonCls.primary}>{t.status === 'draft' ? 'Compléter ma candidature' : 'Reprendre ma candidature'}</Link>)}
    </div>
  )
}
