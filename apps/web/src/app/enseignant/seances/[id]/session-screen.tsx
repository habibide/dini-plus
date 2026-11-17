'use client'

import { ESCROW_HOURS, LEVELS, SURAHS, subject, type Report } from '@dini/core'
import { useAgenda, useDeliverSession, useMarkMissed } from '@dini/data/react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Field, FormError, inputCls } from '@/components/auth'
import { Money, buttonCls } from '@/components/ui'
import { JoinButton } from '@/components/video'
import { useFormat, useT } from '@/i18n/locale'

export function SessionScreen() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const agenda = useAgenda()
  const deliver = useDeliverSession()
  const missed = useMarkMissed()
  const [r, setR] = useState<Report>({ covered: '', tajwidNotes: '', homework: '', comment: '' })
  const set = (patch: Partial<Report>) => setR((x) => ({ ...x, ...patch }))
  const all = useT()
  const m = all.session
  const fmt = useFormat()

  if (agenda.isPending) return <p className="mx-auto max-w-3xl px-5 py-10 text-muted">{all.common.loading}</p>
  const b = agenda.data?.find((x) => x.id === id)
  if (!b) return <p className="mx-auto max-w-3xl px-5 py-10">{m.missing} <Link href="/enseignant" className="underline">{m.back}</Link></p>

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const started = b.startsAt <= Date.now()
  const surahInfo = r.surah ? SURAHS.find((s) => s.id === r.surah) : undefined
  const done = () => router.push('/enseignant')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
      <Link href="/enseignant" className="text-sm text-muted hover:text-ink">{m.backToSpace}</Link>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl">{b.learner.name}</h1>
        <p className="text-muted first-letter:uppercase">
          {fmt.dateTime(b.startsAt, tz)} · {fmt.label(subject(b.subject).label)}{b.kind === 'trial' ? all.teacherHome.trial : ''} · <Money amount={b.amount} currency={b.currency} />
        </p>
        {b.status === 'scheduled' && <JoinButton booking={b} tz={tz} className="mt-2 self-start" />}
        <p>{m.level(((l) => (l ? (fmt.locale === 'fr' ? fmt.label(l.label).toLowerCase() : fmt.label(l.label)) : ''))(LEVELS.find((l) => l.id === b.learner.level)), b.learner.goals)}</p>
      </header>

      {b.status !== 'scheduled' ? (
        <p className="bg-leaf px-4 py-3">{b.report ? <>{m.sent}<strong>{b.report.covered}</strong></> : m.over}</p>
      ) : !started ? (
        <p className="bg-leaf px-4 py-3">{m.after}</p>
      ) : (
        <form className="flex flex-col gap-5 border border-line bg-white p-6" onSubmit={(e) => { e.preventDefault(); deliver.mutate({ id: b.id, report: r }, { onSuccess: done }) }}>
          <h2 className="font-display text-xl">{m.title}</h2>
          <Field label={m.covered}>{(fid) => <input id={fid} required value={r.covered} onChange={(e) => set({ covered: e.target.value })} placeholder={m.coveredPlaceholder} className={inputCls} />}</Field>
          {(b.subject === 'quran' || b.subject === 'tajwid') && (
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
              <Field label={m.surah}>{(fid) => (
                <select id={fid} value={r.surah ?? ''} onChange={(e) => set({ surah: e.target.value ? Number(e.target.value) : undefined, ayahFrom: undefined, ayahTo: undefined })} className={inputCls}>
                  <option value="">{m.none}</option>
                  {SURAHS.map((s) => <option key={s.id} value={s.id}>{s.id}. {s.name}</option>)}
                </select>
              )}</Field>
              <Field label={m.from}>{(fid) => <input id={fid} type="number" min={1} max={surahInfo?.ayat} disabled={!surahInfo} value={r.ayahFrom ?? ''} onChange={(e) => set({ ayahFrom: e.target.value ? Number(e.target.value) : undefined })} className={inputCls} />}</Field>
              <Field label={m.to}>{(fid) => <input id={fid} type="number" min={r.ayahFrom ?? 1} max={surahInfo?.ayat} disabled={!surahInfo} value={r.ayahTo ?? ''} onChange={(e) => set({ ayahTo: e.target.value ? Number(e.target.value) : undefined })} className={inputCls} />}</Field>
            </div>
          )}
          <Field label={m.tajwid}>{(fid) => <textarea id={fid} rows={2} value={r.tajwidNotes} onChange={(e) => set({ tajwidNotes: e.target.value })} className={`${inputCls} py-2`} />}</Field>
          <Field label={m.homework}>{(fid) => <textarea id={fid} rows={2} value={r.homework} onChange={(e) => set({ homework: e.target.value })} className={`${inputCls} py-2`} />}</Field>
          <Field label={m.comment}>{(fid) => <textarea id={fid} rows={3} value={r.comment} onChange={(e) => set({ comment: e.target.value })} className={`${inputCls} py-2`} />}</Field>
          <p className="text-sm text-muted">{m.confirm(ESCROW_HOURS)}</p>
          <FormError message={deliver.error?.message ?? missed.error?.message} />
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={buttonCls.primary} disabled={deliver.isPending}>{deliver.isPending ? all.common.sending : m.send}</button>
            <button type="button" className={buttonCls.ghost} disabled={missed.isPending}
              onClick={() => { if (window.confirm(m.absentConfirm)) missed.mutate(b.id, { onSuccess: done }) }}>{m.absent}</button>
          </div>
        </form>
      )}
    </div>
  )
}
