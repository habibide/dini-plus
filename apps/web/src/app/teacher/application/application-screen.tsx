'use client'

import {
  AGE_GROUPS, ARABIC_TRACKS, COUNTRIES, LANGUAGES, LEVELS, MADHAHIB, RIWAYAT, SUBJECTS, sessionPrice, type Teacher,
} from '@dini/core'
import type { MyTeacher } from '@dini/data/supabase'
import { useMyTeacher, useSaveApplication, useSetAvailability, useSubmitApplication } from '@dini/data/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { Field, FormError, inputCls } from '@/components/auth'
import { AvailabilityEditor, ChipSet, StatusBanner } from '@/components/teacher'
import { TeacherMedia } from '@/components/teacher-media'
import { buttonCls, cx } from '@/components/ui'
import { useFormat, useT } from '@/i18n/locale'

export function ApplicationScreen() {
  const me = useMyTeacher()
  const t = useT()
  const s = t.application.startFrom
  if (me.isPending) return <p className="mx-auto max-w-4xl px-5 py-10 text-muted">{t.common.loading}</p>
  if (!me.data) return <p className="mx-auto max-w-4xl px-5 py-10">{s.before}<Link href="/teacher" className="underline">{s.link}</Link>{s.after}</p>
  return <ApplicationForm t={me.data} />
}

type Credential = Teacher['credentials'][number]
const emptyCredential = (): Credential => ({ kind: 'ijaza', title: '', institution: '', year: new Date().getFullYear() })
/** Même conversion que la base (private.eur_from_xof) : le prix international se déduit du prix en FCFA. */
const eurFromXof = (xof: number) => Math.max(0.5, Math.round((xof / 655.957) * 2) / 2)

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 overflow-hidden rounded-md border-[1.5px] border-line bg-white p-6">
      <div><h2 className="font-display text-2xl">{title}</h2>{hint && <p className="mt-1 text-muted">{hint}</p>}</div>
      {children}
    </section>
  )
}

function ApplicationForm({ t }: { t: MyTeacher }) {
  const router = useRouter()
  const save = useSaveApplication()
  const saveAvailability = useSetAvailability()
  const submit = useSubmitApplication()
  const locked = t.status === 'submitted'
  const approved = t.status === 'approved'
  const credentialsLocked = approved // identité vérifiée : nom et genre figés
  const all = useT()
  const m = all.application
  const fmt = useFormat()

  const [f, setF] = useState({
    name: t.name, gender: t.gender, city: t.city, timezone: t.timezone, headline: t.headline, bio: t.bio,
    subjects: t.subjects, arabicTracks: t.arabicTracks, languages: t.languages, riwayat: t.riwayat, madhahib: t.madhahib,
    levels: t.levels, ageGroups: t.ageGroups, xof: t.rates.XOF?.toString() ?? '', eur: t.rates.EUR?.toString() ?? '',
  })
  // Les diplômes déjà vérifiés sont figés ; seuls les diplômes déclarés se modifient.
  const verified = t.credentials.filter((c) => c.verified)
  const [credentials, setCredentials] = useState<Credential[]>(t.credentials.filter((c) => !c.verified))
  const [availability, setAvailability] = useState(t.availability)
  const [message, setMessage] = useState<string | null>(null)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setMessage(null) }
  const residence = COUNTRIES.find((c) => c.timezones.some((z) => z.id === f.timezone)) ?? COUNTRIES[0]
  const xof = Number(f.xof)
  const rateOk = xof > 0
  // Tarif international facultatif : vide, il se déduit du tarif local (même calcul que la base).
  const eur = Number(f.eur) > 0 ? Number(f.eur) : rateOk ? eurFromXof(xof) : 0

  async function persist() {
    await save.mutateAsync({
      ...(credentialsLocked ? {} : { name: f.name.trim(), ...(f.gender ? { gender: f.gender } : {}) }),
      city: f.city.trim(), countryLabel: residence.label.fr, timezone: f.timezone, headline: f.headline.trim(), bio: f.bio.trim(),
      subjects: f.subjects, arabicTracks: f.subjects.includes('arabic') ? f.arabicTracks : [], languages: f.languages, riwayat: f.riwayat,
      madhahib: f.madhahib, levels: f.levels, ageGroups: f.ageGroups,
      ...(rateOk ? { rates: { XOF: xof, ...(Number(f.eur) > 0 ? { EUR: Number(f.eur) } : {}) } } : {}),
      credentials: credentials.filter((c) => c.title.trim()).map((c) => ({
        kind: c.kind, title: c.title.trim(), year: c.year, institution: c.kind === 'diploma' ? c.institution.trim() : '',
        ...(c.kind === 'ijaza' && c.riwaya ? { riwaya: c.riwaya } : {}),
      })),
    })
    await saveAvailability.mutateAsync(availability)
  }

  async function onSave() {
    try { await persist(); setMessage(all.common.saved) } catch { /* l'erreur s'affiche sous le formulaire */ }
  }

  async function onSubmit() {
    try {
      await persist()
      await submit.mutateAsync()
      router.push('/teacher')
    } catch { /* idem */ }
  }

  const error = save.error?.message ?? saveAvailability.error?.message ?? submit.error?.message
  const busy = save.isPending || saveAvailability.isPending || submit.isPending

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-8">
      <Link href="/teacher" className="text-sm text-muted hover:text-ink">{m.back}</Link>
      <h1 className="font-display text-4xl">{t.status === 'approved' ? m.titleApproved : m.title}</h1>
      <StatusBanner t={t} action={null} />
      {/* Photo et vidéo : enregistrées tout de suite, modifiables même pendant l'examen de la candidature. */}
      <TeacherMedia t={t} />

      <fieldset disabled={locked} className="flex flex-col gap-6 disabled:opacity-70">
        <Section title={m.you}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={m.fullName}>{(id) => <input id={id} disabled={credentialsLocked} value={f.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />}</Field>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 font-semibold">{m.youAre}</legend>
              <div className="flex gap-2">
                {([['F', m.female], ['M', m.male]] as const).map(([g, l]) => (
                  <button key={g} type="button" disabled={credentialsLocked} aria-pressed={f.gender === g} onClick={() => set('gender', g)}
                    className={cx('min-h-12 flex-1 cursor-pointer rounded-sm border px-3', f.gender === g ? 'border-green bg-green text-white' : 'border-line bg-white hover:border-green')}>{l}</button>
                ))}
              </div>
            </fieldset>
            <Field label={m.country}>{(id) => (
              <select id={id} value={residence.code} onChange={(e) => set('timezone', COUNTRIES.find((c) => c.code === e.target.value)!.timezones[0].id)} className={inputCls}>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{fmt.label(c.label)}</option>)}
              </select>
            )}</Field>
            {residence.timezones.length > 1 && (
              <Field label={m.timezone}>{(id) => (
                <select id={id} value={f.timezone} onChange={(e) => set('timezone', e.target.value)} className={inputCls}>
                  {residence.timezones.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
                </select>
              )}</Field>
            )}
            <Field label={m.city}>{(id) => <input id={id} value={f.city} onChange={(e) => set('city', e.target.value)} placeholder={m.cityPlaceholder} className={inputCls} />}</Field>
          </div>
        </Section>

        <Section title={m.intro} hint={m.introHint}>
          <Field label={m.headline}>{(id) => <>
            <input id={id} maxLength={160} value={f.headline} onChange={(e) => set('headline', e.target.value)} placeholder={m.headlinePlaceholder} className={inputCls} />
            <span className="text-sm text-muted">{m.headlineHint}</span>
          </>}</Field>
          <Field label={m.bio}>{(id) => <>
            <textarea id={id} rows={7} maxLength={3000} value={f.bio} onChange={(e) => set('bio', e.target.value)} placeholder={m.bioExample} className={`${inputCls} py-2`} />
            <span className={cx('text-sm', f.bio.trim().length < 80 ? 'text-warn' : 'text-muted')}>{m.bioCount(f.bio.trim().length)}</span>
          </>}</Field>
        </Section>

        <Section title={m.teach}>
          <ChipSet legend={m.subjects} options={SUBJECTS.map((s) => ({ id: s.id, label: fmt.label(s.label) }))} value={f.subjects} onChange={(v) => set('subjects', v)} />
          {f.subjects.includes('arabic') && <ChipSet legend={m.arabic} options={ARABIC_TRACKS.map((a) => ({ id: a.id, label: fmt.label(a.label) }))} value={f.arabicTracks} onChange={(v) => set('arabicTracks', v)} />}
          <ChipSet legend={m.languages} options={LANGUAGES.map((l) => ({ id: l.id, label: fmt.label(l.label) }))} value={f.languages} onChange={(v) => set('languages', v)} />
          <ChipSet legend={m.riwayat} options={RIWAYAT.map((r) => ({ id: r, label: r }))} value={f.riwayat} onChange={(v) => set('riwayat', v)} />
          <ChipSet legend={m.madhahib} options={MADHAHIB.map((x) => ({ id: x, label: x }))} value={f.madhahib} onChange={(v) => set('madhahib', v)} />
          <ChipSet legend={m.levels} options={LEVELS.map((l) => ({ id: l.id, label: fmt.label(l.label) }))} value={f.levels} onChange={(v) => set('levels', v)} />
          <ChipSet legend={m.ages} options={AGE_GROUPS.map((a) => ({ id: a.id, label: fmt.label(a.label) }))} value={f.ageGroups} onChange={(v) => set('ageGroups', v)} />
        </Section>

        <Section title={m.rates} hint={m.ratesHint}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={m.localRate}>{(id) => <input id={id} type="number" min={500} step={50} inputMode="numeric" value={f.xof} onChange={(e) => set('xof', e.target.value)} placeholder="3000" className={inputCls} />}</Field>
            <Field label={m.intlRate}>{(id) => <>
              <input id={id} type="number" min={0.5} step={0.5} inputMode="decimal" value={f.eur} onChange={(e) => set('eur', e.target.value)} placeholder={rateOk ? String(eurFromXof(xof)) : '5'} className={inputCls} />
              <span className="text-sm text-muted">{m.intlHint}</span>
            </>}</Field>
          </div>
          {rateOk && (
            <p className="text-sm text-muted">{m.pricesShown(COUNTRIES.map((c) => { const p = sessionPrice({ XOF: xof, EUR: eur }, c.code); return `${fmt.label(c.label)} ${fmt.money(p.amount, p.currency)}` }).join(' · '))}</p>
          )}
        </Section>

        <Section title={m.availability} hint={m.availabilityHint}>
          <AvailabilityEditor value={availability} onChange={(v) => { setAvailability(v); setMessage(null) }} />
        </Section>
        <Credentials approved={approved} verified={verified} credentials={credentials} onChange={(v) => { setCredentials(v); setMessage(null) }} />
      </fieldset>

      <FormError message={error} />
      {!locked && (
        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-line bg-paper py-4">
          <button type="button" className={buttonCls.ghost} disabled={busy} onClick={onSave}>{all.common.save}</button>
          {t.status !== 'approved' && <button type="button" className={buttonCls.primary} disabled={busy} onClick={onSubmit}>{submit.isPending ? all.common.sending : m.send}</button>}
          {message && <span role="status" className="text-green">{message}</span>}
        </div>
      )}
    </div>
  )
}

/** Diplômes et ijaza : facultatifs à la candidature (un entretien suit), ajoutables ensuite pour mettre son profil en avant. */
function Credentials({ approved, verified, credentials, onChange }: {
  approved: boolean; verified: Credential[]; credentials: Credential[]; onChange: (v: Credential[]) => void
}) {
  const all = useT()
  const m = all.application
  const list = (
    <div className="flex flex-col gap-4">
      {verified.map((c, i) => (
        <div key={`v${i}`} className="flex flex-col gap-1 border-s-2 border-green ps-4">
          <strong>{c.title}</strong>
          <span className="text-sm text-muted">{[c.kind === 'ijaza' ? m.ijaza : m.diploma, c.riwaya && m.riwayaOf(c.riwaya), c.institution, c.year].filter(Boolean).join(' · ')}</span>
          <span className="text-sm text-green">{m.verified}</span>
        </div>
      ))}
      {credentials.map((c, i) => {
        const upd = (patch: Partial<Credential>) => onChange(credentials.map((x, j) => (j === i ? { ...x, ...patch } : x)))
        return (
          <div key={i} className="flex flex-col gap-3 overflow-hidden rounded-md border-[1.5px] border-line p-4">
            <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)_110px]">
              <Field label={m.type}>{(id) => (
                <select id={id} value={c.kind} onChange={(e) => upd({ kind: e.target.value as Credential['kind'] })} className={inputCls}>
                  <option value="ijaza">{m.ijaza}</option><option value="diploma">{m.diploma}</option>
                </select>
              )}</Field>
              <Field label={m.credName}>{(id) => <input id={id} value={c.title} onChange={(e) => upd({ title: e.target.value })} placeholder={c.kind === 'ijaza' ? m.ijazaPlaceholder : m.diplomaPlaceholder} className={inputCls} />}</Field>
              <Field label={m.year}>{(id) => <input id={id} type="number" min={1950} max={new Date().getFullYear()} value={c.year} onChange={(e) => upd({ year: Number(e.target.value) })} className={inputCls} />}</Field>
            </div>
            {c.kind === 'ijaza' ? (
              <Field label={m.riwaya}>{(id) => (
                <select id={id} value={c.riwaya ?? ''} onChange={(e) => upd({ riwaya: (e.target.value || undefined) as Credential['riwaya'] })} className={inputCls}>
                  <option value="">{m.unspecified}</option>{RIWAYAT.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              )}</Field>
            ) : (
              <Field label={m.institution}>{(id) => <input id={id} value={c.institution} onChange={(e) => upd({ institution: e.target.value })} className={inputCls} />}</Field>
            )}
            {approved && <span className="text-sm text-muted">{m.pendingNote}</span>}
            <button type="button" className="cursor-pointer self-start text-sm underline" onClick={() => onChange(credentials.filter((_, j) => j !== i))}>{all.common.remove}</button>
          </div>
        )
      })}
      <button type="button" className={cx(buttonCls.ghost, 'self-start')} onClick={() => onChange([...credentials, emptyCredential()])}>{m.addCred}</button>
    </div>
  )

  if (approved) {
    return (
      <Section title={m.credTitle} hint={m.credApprovedHint}>
        {list}
      </Section>
    )
  }
  return (
    <details className="group overflow-hidden rounded-md border-[1.5px] border-line bg-white p-6" open={credentials.length > 0}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <span><span className="font-display text-xl">{m.credTitle}</span> <span className="text-muted">{m.optional}</span></span>
        <span aria-hidden className="text-muted group-open:rotate-180">▾</span>
      </summary>
      <p className="mt-2 mb-4 text-muted">{m.credOptionalHint}</p>
      {list}
    </details>
  )
}
