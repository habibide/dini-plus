'use client'

import { LANGUAGES, LEVELS, country, dayKey, formatDay, formatTime, subject, trialPrice } from '@dini/core'
import { usePlace, useSlots, useTeacher } from '@dini/data/react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { BADGE_INFO, Badge, Modal, Money, Monogram, RecitationPreview, Sanad, Stars, badgesOf, buttonCls, cx, type BadgeKey } from '@/components/ui'

export function ProfileScreen() {
  const { id } = useParams<{ id: string }>()
  const teacher = useTeacher(id)
  const { place } = usePlace()
  const [week, setWeek] = useState(0)
  const slots = useSlots(id, week)
  const [badge, setBadge] = useState<BadgeKey | null>(null)

  if (teacher.isPending) return <p className="mx-auto max-w-6xl px-5 py-10 text-muted">Chargement du profil…</p>
  const t = teacher.data
  if (!t) return <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-5 py-10"><p>Ce profil n’existe pas ou plus.</p><Link href="/enseignants" className={buttonCls.ghost}>Retour à la recherche</Link></div>

  const tz = place.timezone
  const tzLabel = country(place.country).timezones.find((x) => x.id === tz)?.label
  const byDay = new Map<string, number[]>()
  for (const at of slots.data ?? []) byDay.set(dayKey(at, tz), [...(byDay.get(dayKey(at, tz)) ?? []), at])
  const ijaza = t.credentials.find((c) => c.sanad)

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-10 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-8">
        <Link href="/enseignants" className="text-sm text-muted hover:text-ink">Retour aux résultats</Link>
        <header className="flex items-start gap-5">
          <Monogram name={t.name} size="lg" />
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-display text-3xl">{t.name}</h1>
            <p className="text-muted">{t.city}, {t.countryLabel}. Enseigne en {t.languages.map((l) => LANGUAGES.find((x) => x.id === l)!.label.fr.toLowerCase()).join(', ')}.</p>
            <div className="flex flex-wrap gap-1.5">{badgesOf(t).map((k) => <Badge key={k} k={k} gender={t.gender} onClick={() => setBadge(k)} />)}</div>
            <span className="text-xs text-muted">Touchez un badge pour voir ce qui a été vérifié.</span>
          </div>
        </header>
        <RecitationPreview seed={t.id} large />
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl">{t.headline}</h2>
          <p className="max-w-[68ch]">{t.bio}</p>
          <dl className="mt-2 grid grid-cols-[130px_minmax(0,1fr)] gap-x-3 gap-y-1.5">
            <dt className="text-muted">Matières</dt><dd>{t.subjects.map((s) => subject(s).label.fr).join(', ')}</dd>
            {t.arabicTracks.length > 0 && <><dt className="text-muted">Arabe</dt><dd>{t.arabicTracks.map((a) => ({ reading: 'lecture', writing: 'écriture', practice: 'pratique orale' })[a]).join(', ')}</dd></>}
            <dt className="text-muted">Riwaya</dt><dd>{t.riwayat.join(', ')}</dd>
            <dt className="text-muted">Madhhab</dt><dd>{t.madhahib.join(', ')}</dd>
            <dt className="text-muted">Niveaux</dt><dd>{t.levels.map((l) => LEVELS.find((x) => x.id === l)!.label.fr.toLowerCase()).join(', ')}</dd>
          </dl>
        </section>
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl">Parcours vérifié</h2>
          <ul className="flex flex-col gap-4">
            {t.credentials.map((c) => (
              <li key={c.title} className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 border-b border-line pb-4">
                <span className="text-sm font-semibold text-ochre">{c.kind === 'ijaza' ? 'Ijaza' : 'Diplôme'}</span>
                <div className="flex flex-col gap-1"><strong>{c.title}</strong><span className="text-sm text-muted">{c.institution}, {c.year}</span>{c.sanad && <div className="mt-2"><Sanad chain={c.sanad} /></div>}</div>
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl">Avis des familles</h2>
          <ul className="flex flex-col gap-5">{t.reviews.map((r) => <li key={r.text} className="flex flex-col gap-1"><Stars value={r.rating} /><p>{r.text}</p><span className="text-sm text-muted">{r.author}, {r.date}</span></li>)}</ul>
        </section>
      </div>

      <aside className="flex flex-col gap-3 border border-line bg-white p-5 lg:sticky lg:top-4">
        <span><strong className="font-display text-2xl text-green"><Money {...t.price} /></strong> <span className="text-sm text-muted">la séance de 30 min</span></span>
        <Stars value={t.rating} count={t.reviews.length} />
        <p className="bg-leaf px-3 py-2 text-sm">Séance d’essai à <Money amount={trialPrice(t.price.amount, t.price.currency)} currency={t.price.currency} />, pour vérifier que le courant passe.</p>
        <h2 className="mt-2 font-display text-lg">Choisissez un créneau</h2>
        <p className="text-sm text-muted">Heure de {tzLabel}. {t.name.split(' ')[0]} enseigne depuis {t.city}.</p>
        <div className="flex gap-2">
          <button type="button" className={cx(buttonCls.ghost, 'min-h-9 px-3 text-sm')} disabled={week === 0} onClick={() => setWeek(week - 1)}>Semaine précédente</button>
          <button type="button" className={cx(buttonCls.ghost, 'min-h-9 px-3 text-sm')} disabled={week >= 3} onClick={() => setWeek(week + 1)}>Semaine suivante</button>
        </div>
        <div className={cx('flex flex-col gap-3', slots.isFetching && 'opacity-60')}>
          {[...byDay.values()].map((list) => (
            <div key={list[0]}>
              <div className="mb-1.5 text-sm font-semibold first-letter:uppercase">{formatDay(list[0], tz)}</div>
              <div className="flex flex-wrap gap-1.5">
                {list.map((at) => <Link key={at} href={`/reserver/${t.id}/${at}`} className="min-h-10 rounded-sm border border-green2 px-3 py-2 text-sm font-semibold tabular-nums text-green hover:bg-green hover:text-white">{formatTime(at, tz)}</Link>)}
              </div>
            </div>
          ))}
          {!slots.isPending && byDay.size === 0 && <p className="text-sm text-muted">Aucun créneau libre cette semaine.</p>}
        </div>
      </aside>

      {badge && (
        <Modal title={BADGE_INFO[badge].label} onClose={() => setBadge(null)}>
          <p>{BADGE_INFO[badge].detail}</p>
          {badge === 'ijaza' && ijaza?.sanad && <Sanad chain={ijaza.sanad} />}
          <p className="text-sm text-muted">Dossier fictif, version de démonstration.</p>
        </Modal>
      )}
    </div>
  )
}
