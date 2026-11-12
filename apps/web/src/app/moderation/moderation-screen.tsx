'use client'

import { AGE_GROUPS, LANGUAGES, LEVELS, formatDateTime, subject } from '@dini/core'
import type { Application } from '@dini/data/supabase'
import { useApplications, useReviewApplication } from '@dini/data/react'
import { useState } from 'react'
import { FormError, inputCls } from '@/components/auth'
import { WEEKDAYS, hm } from '@/components/teacher'
import { Monogram, Sanad, buttonCls } from '@/components/ui'

export function ModerationScreen() {
  const list = useApplications()
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-8">
      <h1 className="font-display text-3xl">Candidatures à examiner</h1>
      {list.isPending ? <p className="text-muted">Chargement…</p>
        : !list.data?.length ? <p className="bg-leaf px-4 py-3">Aucune candidature en attente.</p>
        : list.data.map((a) => <Review key={a.id} a={a} />)}
    </div>
  )
}

function Review({ a }: { a: Application }) {
  const review = useReviewApplication()
  const [checks, setChecks] = useState({ identity: false, diploma: false, ijaza: false })
  const [note, setNote] = useState('')
  const hasIjaza = a.credentials.some((c) => c.kind === 'ijaza')
  const hasDiploma = a.credentials.some((c) => c.kind === 'diploma')
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const decide = (approve: boolean) => review.mutate({ teacherId: a.id, approve, note, ...checks })

  return (
    <article className="flex flex-col gap-5 border border-line bg-white p-6">
      <header className="flex flex-wrap items-start gap-4">
        <Monogram name={a.name || '?'} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="font-display text-2xl">{a.name}</h2>
          <p className="text-muted">{a.gender === 'F' ? 'Enseignante' : 'Enseignant'} à {a.city}, {a.countryLabel} · envoyée {a.submittedAt ? formatDateTime(a.submittedAt, tz) : ''}</p>
          <p className="font-semibold">{a.headline}</p>
        </div>
      </header>
      <p className="whitespace-pre-line">{a.bio}</p>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[160px_minmax(0,1fr)]">
        <dt className="text-muted">Matières</dt><dd>{a.subjects.map((s) => subject(s).label.fr).join(', ')}</dd>
        <dt className="text-muted">Langues</dt><dd>{a.languages.map((l) => LANGUAGES.find((x) => x.id === l)?.label.fr).join(', ')}</dd>
        <dt className="text-muted">Riwayat, madhahib</dt><dd>{[...a.riwayat, ...a.madhahib].join(', ') || 'Non précisé'}</dd>
        <dt className="text-muted">Public</dt><dd>{[...a.levels.map((l) => LEVELS.find((x) => x.id === l)?.label.fr), ...a.ageGroups.map((g) => AGE_GROUPS.find((x) => x.id === g)?.label.fr)].join(', ')}</dd>
        <dt className="text-muted">Tarif</dt><dd>{a.rates.XOF} FCFA le cours de 50 min ({a.rates.EUR} € à l’international)</dd>
        <dt className="text-muted">Disponibilités</dt>
        <dd>{a.availability.map((r) => `${WEEKDAYS[r.weekday]} ${hm(r.start)}-${hm(r.end)}`).join(', ')} ({a.timezone})</dd>
      </dl>
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold">Diplômes et ijaza déclarés</h3>
        {!a.credentials.length && <p className="text-sm text-muted">Aucun pour l’instant (facultatif, à voir pendant l’entretien).</p>}
        {a.credentials.map((c, i) => (
          <div key={i} className="flex flex-col gap-2 border-l-2 border-ochre pl-4">
            <strong>{c.title} ({c.year})</strong>
            <span className="text-sm text-muted">{c.kind === 'ijaza' ? 'Ijaza' : 'Diplôme'}{c.riwaya ? `, riwaya ${c.riwaya}` : ''}{c.institution ? ` · ${c.institution}` : ''}</span>
            {c.sanad?.length ? <Sanad chain={c.sanad} /> : null}
          </div>
        ))}
      </div>

      <fieldset className="flex flex-col gap-2 bg-leaf p-4">
        <legend className="sr-only">Vérifications</legend>
        <p className="font-semibold">Ce que vous avez vérifié</p>
        <label className="flex items-center gap-2"><input type="checkbox" checked={checks.identity} onChange={(e) => setChecks({ ...checks, identity: e.target.checked })} className="size-4 accent-green" />Identité</label>
        <label className="flex items-center gap-2"><input type="checkbox" disabled={!hasDiploma} checked={checks.diploma} onChange={(e) => setChecks({ ...checks, diploma: e.target.checked })} className="size-4 accent-green" />Diplôme{!hasDiploma && ' (aucun déclaré)'}</label>
        <label className="flex items-center gap-2"><input type="checkbox" disabled={!hasIjaza} checked={checks.ijaza} onChange={(e) => setChecks({ ...checks, ijaza: e.target.checked })} className="size-4 accent-green" />Ijaza et sanad{!hasIjaza && ' (aucune déclarée)'}</label>
      </fieldset>
      <label className="flex flex-col gap-1.5 font-semibold">Message au candidat (obligatoire en cas de refus)
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={`${inputCls} py-2 font-normal`} />
      </label>
      <FormError message={review.error?.message} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonCls.primary} disabled={review.isPending || !checks.identity} onClick={() => decide(true)}>Approuver et publier</button>
        <button type="button" className={buttonCls.ghost} disabled={review.isPending} onClick={() => decide(false)}>Refuser</button>
      </div>
      {!checks.identity && <p className="text-sm text-muted">L’identité doit être vérifiée avant toute publication.</p>}
    </article>
  )
}
