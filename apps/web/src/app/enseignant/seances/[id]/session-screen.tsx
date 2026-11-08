'use client'

import { ESCROW_HOURS, LEVELS, SURAHS, formatDateTime, subject, type Report } from '@dini/core'
import { useAgenda, useDeliverSession, useMarkMissed } from '@dini/data/react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Field, FormError, inputCls } from '@/components/auth'
import { Money, buttonCls } from '@/components/ui'

export function SessionScreen() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const agenda = useAgenda()
  const deliver = useDeliverSession()
  const missed = useMarkMissed()
  const [r, setR] = useState<Report>({ covered: '', tajwidNotes: '', homework: '', comment: '' })
  const set = (patch: Partial<Report>) => setR((x) => ({ ...x, ...patch }))

  if (agenda.isPending) return <p className="mx-auto max-w-3xl px-5 py-10 text-muted">Chargement…</p>
  const b = agenda.data?.find((x) => x.id === id)
  if (!b) return <p className="mx-auto max-w-3xl px-5 py-10">Séance introuvable. <Link href="/enseignant" className="underline">Retour</Link></p>

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const started = b.startsAt <= Date.now()
  const surahInfo = r.surah ? SURAHS.find((s) => s.id === r.surah) : undefined
  const done = () => router.push('/enseignant')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
      <Link href="/enseignant" className="text-sm text-muted hover:text-ink">Retour à l’espace enseignant</Link>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl">{b.learner.name}</h1>
        <p className="text-muted first-letter:uppercase">
          {formatDateTime(b.startsAt, tz)} · {subject(b.subject).label.fr}{b.kind === 'trial' ? ' · séance d’essai' : ''} · <Money amount={b.amount} currency={b.currency} />
        </p>
        <p>Niveau {LEVELS.find((l) => l.id === b.learner.level)?.label.fr.toLowerCase()}. Objectif : {b.learner.goals}</p>
      </header>

      {b.status !== 'scheduled' ? (
        <p className="bg-leaf px-4 py-3">{b.report ? <>Compte rendu envoyé : <strong>{b.report.covered}</strong></> : 'Cette séance est terminée.'}</p>
      ) : !started ? (
        <p className="bg-leaf px-4 py-3">Le compte rendu s’écrit après la séance. Le lien du cours apparaîtra ici.</p>
      ) : (
        <form className="flex flex-col gap-5 border border-line bg-white p-6" onSubmit={(e) => { e.preventDefault(); deliver.mutate({ id: b.id, report: r }, { onSuccess: done }) }}>
          <h2 className="font-display text-xl">Compte rendu pour la famille</h2>
          <Field label="Ce qui a été travaillé">{(fid) => <input id={fid} required value={r.covered} onChange={(e) => set({ covered: e.target.value })} placeholder="Par exemple : Al-Masad, versets 1 à 3" className={inputCls} />}</Field>
          {(b.subject === 'quran' || b.subject === 'tajwid') && (
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
              <Field label="Sourate">{(fid) => (
                <select id={fid} value={r.surah ?? ''} onChange={(e) => set({ surah: e.target.value ? Number(e.target.value) : undefined, ayahFrom: undefined, ayahTo: undefined })} className={inputCls}>
                  <option value="">Aucune</option>
                  {SURAHS.map((s) => <option key={s.id} value={s.id}>{s.id}. {s.name}</option>)}
                </select>
              )}</Field>
              <Field label="Du verset">{(fid) => <input id={fid} type="number" min={1} max={surahInfo?.ayat} disabled={!surahInfo} value={r.ayahFrom ?? ''} onChange={(e) => set({ ayahFrom: e.target.value ? Number(e.target.value) : undefined })} className={inputCls} />}</Field>
              <Field label="Au verset">{(fid) => <input id={fid} type="number" min={r.ayahFrom ?? 1} max={surahInfo?.ayat} disabled={!surahInfo} value={r.ayahTo ?? ''} onChange={(e) => set({ ayahTo: e.target.value ? Number(e.target.value) : undefined })} className={inputCls} />}</Field>
            </div>
          )}
          <Field label="Remarques de tajwid">{(fid) => <textarea id={fid} rows={2} value={r.tajwidNotes} onChange={(e) => set({ tajwidNotes: e.target.value })} className={`${inputCls} py-2`} />}</Field>
          <Field label="Travail pour la prochaine séance">{(fid) => <textarea id={fid} rows={2} value={r.homework} onChange={(e) => set({ homework: e.target.value })} className={`${inputCls} py-2`} />}</Field>
          <Field label="Mot pour la famille">{(fid) => <textarea id={fid} rows={3} value={r.comment} onChange={(e) => set({ comment: e.target.value })} className={`${inputCls} py-2`} />}</Field>
          <p className="text-sm text-muted">En envoyant, vous confirmez que la séance a eu lieu. La famille a {ESCROW_HOURS} h pour signaler un problème, puis votre paiement est libéré.</p>
          <FormError message={deliver.error?.message ?? missed.error?.message} />
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={buttonCls.primary} disabled={deliver.isPending}>{deliver.isPending ? 'Envoi…' : 'Envoyer le compte rendu'}</button>
            <button type="button" className={buttonCls.ghost} disabled={missed.isPending}
              onClick={() => { if (window.confirm('Confirmer que l’élève ne s’est pas présenté ?')) missed.mutate(b.id, { onSuccess: done }) }}>L’élève était absent</button>
          </div>
        </form>
      )}
    </div>
  )
}
