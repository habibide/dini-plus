'use client'

import { AGE_GROUPS, LANGUAGES, LEVELS, subject } from '@dini/core'
import type { Application, PendingCredential } from '@dini/data/supabase'
import { useApplications, useCredentialsToReview, useReviewApplication, useReviewCredential } from '@dini/data/react'
import { useState } from 'react'
import { FormError, inputCls } from '@/components/auth'
import { hm } from '@/components/teacher'
import { useFormat, useT } from '@/i18n/locale'
import { Monogram, Sanad, buttonCls } from '@/components/ui'
import { TeacherDocumentLinks } from '@/components/teacher-documents'

export function ModerationScreen() {
  const list = useApplications()
  const all = useT()
  const m = all.moderation
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-8">
      <h1 className="font-display text-3xl">{m.title}</h1>
      {list.isPending ? <p className="text-muted">{all.common.loading}</p>
        : !list.data?.length ? <p className="rounded-sm bg-leaf px-4 py-3">{m.none}</p>
        : list.data.map((a) => <Review key={a.id} a={a} />)}
      <PendingCredentials />
    </div>
  )
}

/** Diplômes et ijaza ajoutés après l'approbation : affichés « déclarés » jusqu'à la décision. */
function PendingCredentials() {
  const list = useCredentialsToReview()
  const review = useReviewCredential()
  const all = useT()
  const m = all.moderation
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-3xl">{m.pendingTitle}</h2>
      <p className="text-muted">{m.pendingText}</p>
      {list.isPending ? <p className="text-muted">{all.common.loading}</p>
        : !list.data?.length ? <p className="rounded-sm bg-leaf px-4 py-3">{m.noPending}</p>
        : list.data.map((c) => <PendingCredentialRow key={c.id} c={c} busy={review.isPending} onDecide={(approve) => review.mutate({ id: c.id, approve })} />)}
      <FormError message={review.error?.message} />
    </section>
  )
}

function PendingCredentialRow({ c, busy, onDecide }: { c: PendingCredential; busy: boolean; onDecide: (approve: boolean) => void }) {
  const m = useT().moderation
  const a = useT().application
  return (
    <article className="flex flex-wrap items-center gap-4 overflow-hidden rounded-md border-[1.5px] border-line bg-white p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <strong>{c.title} ({c.year})</strong>
        <span className="text-sm text-muted">{[c.kind === 'ijaza' ? a.ijaza : a.diploma, c.riwaya && m.riwayaOf(c.riwaya), c.institution].filter(Boolean).join(' · ')}</span>
        <a href={`/teachers/${c.teacherId}`} className="text-sm underline">{c.teacherName}</a>
        <TeacherDocumentLinks teacherId={c.teacherId} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonCls.primary} disabled={busy} onClick={() => onDecide(true)}>{m.verify}</button>
        <button type="button" className={buttonCls.ghost} disabled={busy} onClick={() => { if (window.confirm(m.confirmReject(c.title, c.teacherName))) onDecide(false) }}>{m.reject}</button>
      </div>
    </article>
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
  const all = useT()
  const m = all.moderation
  const fmt = useFormat()

  return (
    <article className="flex flex-col gap-5 overflow-hidden rounded-md border-[1.5px] border-line bg-white p-6">
      <header className="flex flex-wrap items-start gap-4">
        <Monogram name={a.name || '?'} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="font-display text-2xl">{a.name}</h2>
          <p className="text-muted">{m.sentAt(a.gender === 'F' ? m.teacherF : m.teacherM, a.city, a.countryLabel, a.submittedAt ? fmt.dateTime(a.submittedAt, tz) : '')}</p>
          <p className="font-semibold">{a.headline}</p>
        </div>
      </header>
      <p className="whitespace-pre-line">{a.bio}</p>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[160px_minmax(0,1fr)]">
        <dt className="text-muted">{m.subjects}</dt><dd>{a.subjects.map((s) => fmt.label(subject(s).label)).join(', ')}</dd>
        <dt className="text-muted">{m.languages}</dt><dd>{a.languages.map((l) => { const x = LANGUAGES.find((y) => y.id === l); return x ? fmt.label(x.label) : l }).join(', ')}</dd>
        <dt className="text-muted">{m.riwayatMadhahib}</dt><dd>{[...a.riwayat, ...a.madhahib].join(', ') || m.unspecified}</dd>
        <dt className="text-muted">{m.audience}</dt><dd>{[...a.levels.map((l) => LEVELS.find((x) => x.id === l)?.label), ...a.ageGroups.map((g) => AGE_GROUPS.find((x) => x.id === g)?.label)].filter((x) => x !== undefined).map((x) => fmt.label(x)).join(', ')}</dd>
        <dt className="text-muted">{m.rate}</dt><dd>{m.rateText(a.rates.XOF ?? 0, a.rates.EUR ?? 0)}</dd>
        <dt className="text-muted">{m.availability}</dt>
        <dd>{a.availability.map((r) => `${all.availability.weekdays[r.weekday]} ${hm(r.start)}-${hm(r.end)}`).join(', ')} ({a.timezone})</dd>
      </dl>
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold">{m.declared}</h3>
        {!a.credentials.length && <p className="text-sm text-muted">{m.noneDeclared}</p>}
        {a.credentials.map((c, i) => (
          <div key={i} className="flex flex-col gap-2 border-s-2 border-ochre ps-4">
            <strong>{c.title} ({c.year})</strong>
            <span className="text-sm text-muted">{c.kind === 'ijaza' ? all.application.ijaza : all.application.diploma}{c.riwaya ? `, ${m.riwayaOf(c.riwaya)}` : ''}{c.institution ? ` · ${c.institution}` : ''}</span>
            {c.sanad?.length ? <Sanad chain={c.sanad} /> : null}
          </div>
        ))}
        <h3 className="font-semibold">{all.application.documents.title}</h3>
        <TeacherDocumentLinks teacherId={a.id} />
      </div>

      <fieldset className="flex flex-col gap-2 rounded-sm bg-leaf p-4">
        <legend className="sr-only">{m.checks}</legend>
        <p className="font-semibold">{m.checked}</p>
        <label className="flex items-center gap-2"><input type="checkbox" checked={checks.identity} onChange={(e) => setChecks({ ...checks, identity: e.target.checked })} className="size-4 accent-green" />{m.identity}</label>
        <label className="flex items-center gap-2"><input type="checkbox" disabled={!hasDiploma} checked={checks.diploma} onChange={(e) => setChecks({ ...checks, diploma: e.target.checked })} className="size-4 accent-green" />{m.diploma}{!hasDiploma && m.noneDiploma}</label>
        <label className="flex items-center gap-2"><input type="checkbox" disabled={!hasIjaza} checked={checks.ijaza} onChange={(e) => setChecks({ ...checks, ijaza: e.target.checked })} className="size-4 accent-green" />{m.ijaza}{!hasIjaza && m.noneIjaza}</label>
      </fieldset>
      <label className="flex flex-col gap-1.5 font-semibold">{m.note}
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={`${inputCls} py-2 font-normal`} />
      </label>
      <FormError message={review.error?.message} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonCls.primary} disabled={review.isPending || !checks.identity} onClick={() => decide(true)}>{m.approve}</button>
        <button type="button" className={buttonCls.ghost} disabled={review.isPending} onClick={() => decide(false)}>{m.reject}</button>
      </div>
      {!checks.identity && <p className="text-sm text-muted">{m.identityFirst}</p>}
    </article>
  )
}
