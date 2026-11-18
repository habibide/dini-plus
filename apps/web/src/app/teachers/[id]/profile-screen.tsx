'use client'

import { ARABIC_TRACKS, LANGUAGES, LEVELS, country, dayKey, isConfirmed, subject, trialPrice } from '@dini/core'
import { usePlace, useSlots, useTeacher } from '@dini/data/react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useFormat, useT } from '@/i18n/locale'
import {
  LINE_ICONS, LineIcon, MessageButton, Modal, Money, Monogram, RecitationPreview, Sanad, Stars, VerifiedShield,
  buttonCls, cx, useCountryOf, type BadgeKey,
} from '@/components/ui'

// Profil professeur façon Preply : à gauche l'extrait de récitation, la présentation, les langues,
// le CV, les avis et l'agenda ; à droite une carte fixe avec le prix et les actions.

export function ProfileScreen() {
  const { id } = useParams<{ id: string }>()
  const teacher = useTeacher(id)
  const { place } = usePlace()
  const [week, setWeek] = useState(0)
  const slots = useSlots(id, week)
  const [badge, setBadge] = useState<BadgeKey | null>(null)
  const [more, setMore] = useState(false)
  const [copied, setCopied] = useState(false)
  const all = useT()
  const m = all.profile
  const s = all.search
  const fmt = useFormat()
  const countryOf = useCountryOf()
  const lower = (x: string) => (fmt.locale === 'fr' ? x.toLowerCase() : x)

  if (teacher.isPending) return <p className="mx-auto max-w-6xl px-5 py-10 text-muted">{m.loading}</p>
  const t = teacher.data
  if (!t) return <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-5 py-10"><p>{m.missing}</p><Link href="/teachers" className={buttonCls.ghost}>{m.backToSearch}</Link></div>

  const tz = place.timezone
  const tzLabel = country(place.country).timezones.find((x) => x.id === tz)?.label
  const byDay = new Map<string, number[]>()
  for (const at of slots.data ?? []) byDay.set(dayKey(at, tz), [...(byDay.get(dayKey(at, tz)) ?? []), at])
  const ijaza = t.credentials.find((c) => c.sanad)
  const from = countryOf(t.countryLabel)
  const first = t.name.split(' ')[0]
  const longBio = t.bio.length > 420

  // Badges expliqués, comme « Professeur qualifié » / « Super prof ».
  const explained: { k: BadgeKey; color: string }[] = []
  if (t.verification.ijaza) explained.push({ k: 'ijaza', color: 'text-green' })
  if (t.verification.diploma) explained.push({ k: 'diploma', color: 'text-[#245a92]' })
  if (isConfirmed(t)) explained.push({ k: 'confirmed', color: 'text-ochre' })

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: t.name, url })
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500) }
    } catch { /* partage annulé */ }
  }

  const card = (
    <div className="flex flex-col gap-5 rounded-md border-[1.5px] border-line bg-white p-6">
      <div className="flex gap-6">
        {t.rating > 0
          ? <div><div className="font-display text-2xl leading-tight"><span className="text-gold">★</span> {fmt.decimal(t.rating)}</div><div className="text-sm text-muted">{s.reviewsN(t.reviews.length)}</div></div>
          : <div><div className="font-display text-2xl leading-tight">{s.newProfile[0]}</div><div className="text-sm text-muted">{s.newProfile[1]}</div></div>}
        {t.hoursTaught >= 1 && <div><div className="font-display text-2xl leading-tight">{Math.round(t.hoursTaught)}</div><div className="text-sm text-muted">{s.hoursN}</div></div>}
        <div><div className="font-display text-2xl leading-tight"><Money {...t.price} /></div><div className="text-sm text-muted">{s.lessonLength}</div></div>
      </div>
      <div className="flex flex-col gap-2.5">
        <a href="#agenda" className={cx(buttonCls.primary, 'w-full')}><LineIcon d={LINE_ICONS.bolt} />{s.book}</a>
        <MessageButton name={t.name} bookHref="#agenda" />
        <button type="button" onClick={share} className={cx(buttonCls.ghost, 'w-full')}><LineIcon d={LINE_ICONS.share} />{copied ? m.copied : m.share}</button>
      </div>
      <p className="flex items-start gap-2 text-sm"><LineIcon d={LINE_ICONS.info} className="mt-0.5 size-4 text-muted" />
        <span>{m.trial.before}<strong><Money amount={trialPrice(t.price.amount, t.price.currency)} currency={t.price.currency} /></strong>{m.trial.after}</span></p>
    </div>
  )

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-10 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-10">
        <Link href="/teachers" className="-mb-4 text-sm text-muted hover:text-ink">{m.backToResults}</Link>
        <RecitationPreview seed={t.id} large />

        <header className="flex flex-col gap-5">
          <div className="flex items-center gap-5">
            <Monogram name={t.name} size="lg" square />
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="flex flex-wrap items-center gap-2 font-display text-4xl md:text-5xl">
                {t.name}{t.verification.identity && <button type="button" onClick={() => setBadge('identity')} className="cursor-pointer"><VerifiedShield title={all.badges.identity.label} /></button>}
              </h1>
              <p className="font-semibold">{m.role[t.gender]} · {from.name} {from.flag}</p>
            </div>
          </div>
          <p className="text-lg">{t.headline}</p>
          {explained.length > 0 && (
            <ul className="flex flex-col gap-4">
              {explained.map(({ k, color }) => (
                <li key={k} className="flex flex-col gap-0.5">
                  <span className={cx('font-semibold', color)}>{k === 'confirmed' && t.gender === 'F' ? all.badges.confirmedF : all.badges[k].label}</span>
                  <span>{all.badges[k].detail} <button type="button" onClick={() => setBadge(k)} className="cursor-pointer font-semibold underline">{s.more}</button></span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-start gap-3">
            <LineIcon d={LINE_ICONS.cap} className="mt-0.5 size-5 text-muted" />
            <div><div className="font-semibold">{m.teaches}</div><div>{t.subjects.map((x) => fmt.label(subject(x).label)).join(', ')}</div></div>
          </div>
        </header>

        {/* Carte d'actions juste après l'en-tête sur mobile. */}
        <div className="lg:hidden">{card}</div>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-3xl">{m.about}</h2>
          <p className={cx('max-w-[68ch] whitespace-pre-line leading-relaxed', longBio && !more && 'line-clamp-5')}>{t.bio}</p>
          {longBio && <button type="button" onClick={() => setMore(!more)} className="self-start cursor-pointer font-semibold underline">{more ? m.seeLess : m.seeMore}</button>}
          <dl className="mt-2 grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[15px]">
            {t.arabicTracks.length > 0 && <><dt className="text-muted">{m.arabic}</dt><dd>{t.arabicTracks.map((a) => lower(fmt.label(ARABIC_TRACKS.find((x) => x.id === a)!.label))).join(', ')}</dd></>}
            {t.riwayat.length > 0 && <><dt className="text-muted">{m.riwaya}</dt><dd>{t.riwayat.join(', ')}</dd></>}
            {t.madhahib.length > 0 && <><dt className="text-muted">{m.madhhab}</dt><dd>{t.madhahib.join(', ')}</dd></>}
            <dt className="text-muted">{m.levels}</dt><dd>{t.levels.map((l) => lower(fmt.label(LEVELS.find((x) => x.id === l)!.label))).join(', ')}</dd>
          </dl>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl">{m.speaks}</h2>
          <div className="flex flex-wrap gap-2">
            {t.languages.map((l) => <span key={l} className="rounded-sm bg-soft px-2.5 py-1 font-semibold text-green2">{fmt.label(LANGUAGES.find((x) => x.id === l)!.label)}</span>)}
          </div>
        </section>

        {t.credentials.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="font-display text-2xl">{m.cv}</h2>
            <ul className="flex flex-col gap-5 border-t border-line pt-5">
              {t.credentials.map((c) => (
                <li key={c.title} className="grid grid-cols-[90px_minmax(0,1fr)] gap-4">
                  <span className="text-muted">{c.year ?? ''}</span>
                  <div className="flex flex-col gap-1">
                    <strong className="font-semibold">{c.title}</strong>
                    <span className="text-muted">{[c.kind === 'ijaza' ? m.ijaza : m.diploma, c.institution].filter(Boolean).join(' · ')}</span>
                    {c.verified
                      ? <span className="flex items-center gap-1.5 text-sm font-semibold text-green"><svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1.2 14.2L6.6 12l1.4-1.4 2.8 2.8 5.2-5.2 1.4 1.4-6.6 6.6z" /></svg>{m.verified.replace('✓ ', '')}</span>
                      : <span className="text-sm text-muted">{m.declared}</span>}
                    {c.sanad && <div className="mt-2"><Sanad chain={c.sanad} /></div>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl">{m.reviewsTitle}</h2>
          {t.reviews.length === 0
            ? <p className="rounded-md border-[1.5px] border-line p-6 text-center">{m.noReviewsFor(t.name)}</p>
            : <ul className="flex flex-col gap-5">{t.reviews.map((r) => <li key={r.text} className="flex flex-col gap-1"><Stars value={r.rating} /><p>{r.text}</p><span className="text-sm text-muted">{r.author}, {r.date}</span></li>)}</ul>}
        </section>

        <section id="agenda" className="flex scroll-mt-24 flex-col gap-4">
          <h2 className="font-display text-2xl">{m.agenda}</h2>
          <p className="flex items-start gap-3 rounded-sm bg-soft px-4 py-3"><LineIcon d={LINE_ICONS.info} className="mt-0.5 size-5" />{m.agendaNote}</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <button type="button" aria-label={m.prevWeek} disabled={week === 0} onClick={() => setWeek(week - 1)}
                className="grid size-10 cursor-pointer place-items-center rounded-sm border-[1.5px] border-line bg-white disabled:cursor-not-allowed disabled:opacity-40">
                <svg viewBox="0 0 24 24" className="size-5 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg></button>
              <button type="button" aria-label={m.nextWeek} disabled={week >= 3} onClick={() => setWeek(week + 1)}
                className="grid size-10 cursor-pointer place-items-center rounded-sm border-[1.5px] border-line bg-white disabled:cursor-not-allowed disabled:opacity-40">
                <svg viewBox="0 0 24 24" className="size-5 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M9 18l6-6-6-6" /></svg></button>
            </div>
            <span className="text-sm text-muted">{m.timeNote(tzLabel ?? '', first, t.city)}</span>
          </div>
          <div className={cx('grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-7', slots.isFetching && 'opacity-60')}>
            {[...byDay.values()].map((list) => (
              <div key={list[0]} className="flex flex-col items-center gap-2 border-t-[3px] border-green pt-2">
                <div className="text-center text-sm text-muted first-letter:uppercase">{fmt.day(list[0], tz)}</div>
                {list.map((at) => <Link key={at} href={`/book/${t.id}/${at}`} className="font-semibold tabular-nums underline underline-offset-4 hover:text-green">{fmt.time(at, tz)}</Link>)}
              </div>
            ))}
          </div>
          {!slots.isPending && byDay.size === 0 && <p className="text-muted">{m.noSlots}</p>}
        </section>
      </div>

      <aside className="hidden lg:sticky lg:top-24 lg:block">{card}</aside>

      {badge && (
        <Modal title={badge === 'confirmed' && t.gender === 'F' ? all.badges.confirmedF : all.badges[badge].label} onClose={() => setBadge(null)}>
          <p>{all.badges[badge].detail}</p>
          {badge === 'ijaza' && ijaza?.sanad && <Sanad chain={ijaza.sanad} />}
          <p className="text-sm text-muted">{m.demoFile}</p>
        </Modal>
      )}
    </div>
  )
}
