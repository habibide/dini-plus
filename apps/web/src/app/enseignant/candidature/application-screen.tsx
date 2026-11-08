'use client'

import {
  AGE_GROUPS, ARABIC_TRACKS, COUNTRIES, LANGUAGES, LEVELS, MADHAHIB, RIWAYAT, SUBJECTS, formatMoney, sessionPrice, type Teacher,
} from '@dini/core'
import type { MyTeacher } from '@dini/data/supabase'
import { useMyTeacher, useSaveApplication, useSetAvailability, useSubmitApplication } from '@dini/data/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { Field, FormError, inputCls } from '@/components/auth'
import { AvailabilityEditor, ChipSet, StatusBanner } from '@/components/teacher'
import { buttonCls, cx } from '@/components/ui'

export function ApplicationScreen() {
  const me = useMyTeacher()
  if (me.isPending) return <p className="mx-auto max-w-4xl px-5 py-10 text-muted">Chargement…</p>
  if (!me.data) return <p className="mx-auto max-w-4xl px-5 py-10">Commencez depuis <Link href="/enseignant" className="underline">l’espace enseignant</Link>.</p>
  return <ApplicationForm t={me.data} />
}

type Credential = Teacher['credentials'][number]
const emptyCredential = (): Credential => ({ kind: 'ijaza', title: '', institution: '', year: new Date().getFullYear() })

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border border-line bg-white p-6">
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
  const credentialsLocked = t.status === 'approved'

  const [f, setF] = useState({
    name: t.name, gender: t.gender, city: t.city, timezone: t.timezone, headline: t.headline, bio: t.bio,
    subjects: t.subjects, arabicTracks: t.arabicTracks, languages: t.languages, riwayat: t.riwayat, madhahib: t.madhahib,
    levels: t.levels, ageGroups: t.ageGroups, xof: t.rates.XOF?.toString() ?? '', eur: t.rates.EUR?.toString() ?? '',
  })
  const [credentials, setCredentials] = useState<Credential[]>(t.credentials.length ? t.credentials : [emptyCredential()])
  const [availability, setAvailability] = useState(t.availability)
  const [message, setMessage] = useState<string | null>(null)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setMessage(null) }
  const residence = COUNTRIES.find((c) => c.timezones.some((z) => z.id === f.timezone)) ?? COUNTRIES[0]
  const rates = { XOF: Number(f.xof), EUR: Number(f.eur) }
  const ratesOk = rates.XOF > 0 && rates.EUR > 0

  async function persist() {
    await save.mutateAsync({
      name: f.name.trim(), city: f.city.trim(), countryLabel: residence.label.fr, timezone: f.timezone, headline: f.headline.trim(), bio: f.bio.trim(),
      subjects: f.subjects, arabicTracks: f.subjects.includes('arabic') ? f.arabicTracks : [], languages: f.languages, riwayat: f.riwayat,
      madhahib: f.madhahib, levels: f.levels, ageGroups: f.ageGroups,
      ...(f.gender ? { gender: f.gender } : {}),
      ...(ratesOk ? { rates } : {}),
      ...(credentialsLocked ? {} : { credentials: credentials.filter((c) => c.title.trim()).map((c) => ({ ...c, sanad: c.kind === 'ijaza' ? c.sanad?.filter(Boolean) : undefined })) }),
    })
    await saveAvailability.mutateAsync(availability)
  }

  async function onSave() {
    try { await persist(); setMessage('Enregistré.') } catch { /* l'erreur s'affiche sous le formulaire */ }
  }

  async function onSubmit() {
    try {
      await persist()
      await submit.mutateAsync()
      router.push('/enseignant')
    } catch { /* idem */ }
  }

  const error = save.error?.message ?? saveAvailability.error?.message ?? submit.error?.message
  const busy = save.isPending || saveAvailability.isPending || submit.isPending

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-8">
      <Link href="/enseignant" className="text-sm text-muted hover:text-ink">Retour à l’espace enseignant</Link>
      <h1 className="font-display text-4xl">{t.status === 'approved' ? 'Mon profil enseignant' : 'Ma candidature'}</h1>
      <StatusBanner t={t} action={null} />

      <fieldset disabled={locked} className="flex flex-col gap-6 disabled:opacity-70">
        <Section title="Vous">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom complet">{(id) => <input id={id} value={f.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />}</Field>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 font-semibold">Vous êtes</legend>
              <div className="flex gap-2">
                {([['F', 'Une enseignante'], ['M', 'Un enseignant']] as const).map(([g, l]) => (
                  <button key={g} type="button" aria-pressed={f.gender === g} onClick={() => set('gender', g)}
                    className={cx('min-h-12 flex-1 cursor-pointer rounded-sm border px-3', f.gender === g ? 'border-green bg-green text-white' : 'border-line bg-white hover:border-green')}>{l}</button>
                ))}
              </div>
            </fieldset>
            <Field label="Pays">{(id) => (
              <select id={id} value={residence.code} onChange={(e) => set('timezone', COUNTRIES.find((c) => c.code === e.target.value)!.timezones[0].id)} className={inputCls}>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label.fr}</option>)}
              </select>
            )}</Field>
            {residence.timezones.length > 1 && (
              <Field label="Fuseau horaire">{(id) => (
                <select id={id} value={f.timezone} onChange={(e) => set('timezone', e.target.value)} className={inputCls}>
                  {residence.timezones.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
                </select>
              )}</Field>
            )}
            <Field label="Ville">{(id) => <input id={id} value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="Dakar, Thiès, Banjul…" className={inputCls} />}</Field>
          </div>
        </Section>

        <Section title="Présentation" hint="C’est ce que les familles lisent en premier. Parlez de votre parcours et de votre façon d’enseigner.">
          <Field label="Titre de votre profil">{(id) => <input id={id} maxLength={160} value={f.headline} onChange={(e) => set('headline', e.target.value)} placeholder="Coran et tajwid pour enfants, riwaya Warsh" className={inputCls} />}</Field>
          <Field label="Présentation">{(id) => <>
            <textarea id={id} rows={6} maxLength={3000} value={f.bio} onChange={(e) => set('bio', e.target.value)} className={`${inputCls} py-2`} />
            <span className={cx('text-sm', f.bio.trim().length < 80 ? 'text-warn' : 'text-muted')}>{f.bio.trim().length} caractères, 80 au minimum.</span>
          </>}</Field>
        </Section>

        <Section title="Ce que vous enseignez">
          <ChipSet legend="Matières" options={SUBJECTS.map((s) => ({ id: s.id, label: s.label.fr }))} value={f.subjects} onChange={(v) => set('subjects', v)} />
          {f.subjects.includes('arabic') && <ChipSet legend="En arabe" options={ARABIC_TRACKS.map((a) => ({ id: a.id, label: a.label.fr }))} value={f.arabicTracks} onChange={(v) => set('arabicTracks', v)} />}
          <ChipSet legend="Langues dans lesquelles vous enseignez" options={LANGUAGES.map((l) => ({ id: l.id, label: l.label.fr }))} value={f.languages} onChange={(v) => set('languages', v)} />
          <ChipSet legend="Riwayat" options={RIWAYAT.map((r) => ({ id: r, label: r }))} value={f.riwayat} onChange={(v) => set('riwayat', v)} />
          <ChipSet legend="Madhahib" options={MADHAHIB.map((m) => ({ id: m, label: m }))} value={f.madhahib} onChange={(v) => set('madhahib', v)} />
          <ChipSet legend="Niveaux" options={LEVELS.map((l) => ({ id: l.id, label: l.label.fr }))} value={f.levels} onChange={(v) => set('levels', v)} />
          <ChipSet legend="Âge des élèves" options={AGE_GROUPS.map((a) => ({ id: a.id, label: a.label.fr }))} value={f.ageGroups} onChange={(v) => set('ageGroups', v)} />
        </Section>

        <Section title="Tarifs" hint="Pour une séance de 30 minutes. Le tarif local s’applique au Sénégal et en Gambie, le tarif international ailleurs.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tarif local (FCFA)">{(id) => <input id={id} type="number" min={500} step={50} inputMode="numeric" value={f.xof} onChange={(e) => set('xof', e.target.value)} className={inputCls} />}</Field>
            <Field label="Tarif international (€)">{(id) => <input id={id} type="number" min={1} step={0.5} inputMode="decimal" value={f.eur} onChange={(e) => set('eur', e.target.value)} className={inputCls} />}</Field>
          </div>
          {ratesOk && (
            <p className="text-sm text-muted">Prix affichés aux familles : {COUNTRIES.map((c) => { const p = sessionPrice(rates, c.code); return `${c.label.fr} ${formatMoney(p.amount, p.currency)}` }).join(' · ')}.</p>
          )}
        </Section>

        <Section title="Diplômes et ijaza" hint={credentialsLocked ? 'Vérifiés par notre équipe. Pour en ajouter un, écrivez-nous.' : 'Ils seront vérifiés avant la publication de votre profil. Pour une ijaza, indiquez la chaîne de transmission (sanad), en commençant par vous.'}>
          <fieldset disabled={credentialsLocked} className="flex flex-col gap-4">
            {credentials.map((c, i) => {
              const upd = (patch: Partial<Credential>) => setCredentials((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)))
              return (
                <div key={i} className="flex flex-col gap-3 border border-line p-4">
                  <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)_110px]">
                    <Field label="Type">{(id) => (
                      <select id={id} value={c.kind} onChange={(e) => upd({ kind: e.target.value as Credential['kind'] })} className={inputCls}>
                        <option value="ijaza">Ijaza</option><option value="diploma">Diplôme</option>
                      </select>
                    )}</Field>
                    <Field label="Intitulé">{(id) => <input id={id} value={c.title} onChange={(e) => upd({ title: e.target.value })} placeholder={c.kind === 'ijaza' ? 'Ijaza de récitation, riwaya Warsh' : 'Licence en études islamiques'} className={inputCls} />}</Field>
                    <Field label="Année">{(id) => <input id={id} type="number" min={1950} max={new Date().getFullYear()} value={c.year} onChange={(e) => upd({ year: Number(e.target.value) })} className={inputCls} />}</Field>
                  </div>
                  <Field label={c.kind === 'ijaza' ? 'Transmise par' : 'Établissement'}>{(id) => <input id={id} value={c.institution} onChange={(e) => upd({ institution: e.target.value })} className={inputCls} />}</Field>
                  {c.kind === 'ijaza' && <>
                    <Field label="Riwaya">{(id) => (
                      <select id={id} value={c.riwaya ?? ''} onChange={(e) => upd({ riwaya: (e.target.value || undefined) as Credential['riwaya'] })} className={inputCls}>
                        <option value="">Non précisée</option>{RIWAYAT.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    )}</Field>
                    <Field label="Sanad, une personne par ligne">{(id) => <textarea id={id} rows={3} value={(c.sanad ?? []).join('\n')} onChange={(e) => upd({ sanad: e.target.value.split('\n') })} className={`${inputCls} py-2`} />}</Field>
                  </>}
                  {credentials.length > 1 && !credentialsLocked && <button type="button" className="cursor-pointer self-start text-sm underline" onClick={() => setCredentials((xs) => xs.filter((_, j) => j !== i))}>Retirer</button>}
                </div>
              )
            })}
            {!credentialsLocked && <button type="button" className={cx(buttonCls.ghost, 'self-start')} onClick={() => setCredentials((xs) => [...xs, emptyCredential()])}>Ajouter un diplôme ou une ijaza</button>}
          </fieldset>
          <p className="text-sm text-muted">Le téléversement des justificatifs (pièce d’identité, diplômes) arrive dans une prochaine étape ; notre équipe vous les demandera en attendant.</p>
        </Section>

        <Section title="Disponibilités" hint="En heure locale. Vous pourrez les modifier à tout moment.">
          <AvailabilityEditor value={availability} onChange={(v) => { setAvailability(v); setMessage(null) }} />
        </Section>
      </fieldset>

      <FormError message={error} />
      {!locked && (
        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-line bg-paper py-4">
          <button type="button" className={buttonCls.ghost} disabled={busy} onClick={onSave}>Enregistrer</button>
          {t.status !== 'approved' && <button type="button" className={buttonCls.primary} disabled={busy} onClick={onSubmit}>{submit.isPending ? 'Envoi…' : 'Envoyer ma candidature'}</button>}
          {message && <span role="status" className="text-green">{message}</span>}
        </div>
      )}
    </div>
  )
}
