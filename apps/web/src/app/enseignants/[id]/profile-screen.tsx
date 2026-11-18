'use client'

import { ARABIC_TRACKS, LANGUAGES, LEVELS, country, dayKey, subject, trialPrice } from '@dini/core'
import { usePlace, useSlots, useTeacher } from '@dini/data/react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useFormat, useT } from '@/i18n/locale'
import { Badge, Modal, Money, Monogram, RecitationPreview, Sanad, Stars, badgesOf, buttonCls, cx, type BadgeKey } from '@/components/ui'

export function ProfileScreen() {
  const { id } = useParams<{ id: string }>()
  const teacher = useTeacher(id)
  const { place } = usePlace()
  const [week, setWeek] = useState(0)
  const slots = useSlots(id, week)
  const [badge, setBadge] = useState<BadgeKey | null>(null)
  const all = useT()
  const m = all.profile
  const fmt = useFormat()
  const lower = (s: string) => (fmt.locale === 'fr' ? s.toLowerCase() : s)

  if (teacher.isPending) return <p className="mx-auto max-w-6xl px-5 py-10 text-muted">{m.loading}</p>
  const t = teacher.data
  if (!t) return <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-5 py-10"><p>{m.missing}</p><Link href="/enseignants" className={buttonCls.ghost}>{m.backToSearch}</Link></div>

  const tz = place.timezone
  const tzLabel = country(place.country).timezones.find((x) => x.id === tz)?.label
  const byDay = new Map<string, number[]>()
  for (const at of slots.data ?? []) byDay.set(dayKey(at, tz), [...(byDay.get(dayKey(at, tz)) ?? []), at])
  const ijaza = t.credentials.find((c) => c.sanad)

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-10 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-8">
        <Link href="/enseignants" className="text-sm text-muted hover:text-ink">{m.backToResults}</Link>
        <header className="flex items-start gap-5">
          <Monogram name={t.name} size="lg" />
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-display text-3xl">{t.name}</h1>
            <p className="text-muted">{t.city}, {t.countryLabel}. {m.teachesIn(fmt.list(t.languages.map((l) => lower(fmt.label(LANGUAGES.find((x) => x.id === l)!.label)))))}</p>
            <div className="flex flex-wrap gap-1.5">{badgesOf(t).map((k) => <Badge key={k} k={k} gender={t.gender} onClick={() => setBadge(k)} />)}</div>
            <span className="text-xs text-muted">{m.tapBadge}</span>
          </div>
        </header>
        <RecitationPreview seed={t.id} large />
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl">{t.headline}</h2>
          <p className="max-w-[68ch]">{t.bio}</p>
          <dl className="mt-2 grid grid-cols-[130px_minmax(0,1fr)] gap-x-3 gap-y-1.5">
            <dt className="text-muted">{m.subjects}</dt><dd>{t.subjects.map((s) => fmt.label(subject(s).label)).join(', ')}</dd>
            {t.arabicTracks.length > 0 && <><dt className="text-muted">{m.arabic}</dt><dd>{t.arabicTracks.map((a) => lower(fmt.label(ARABIC_TRACKS.find((x) => x.id === a)!.label))).join(', ')}</dd></>}
            <dt className="text-muted">{m.riwaya}</dt><dd>{t.riwayat.join(', ')}</dd>
            <dt className="text-muted">{m.madhhab}</dt><dd>{t.madhahib.join(', ')}</dd>
            <dt className="text-muted">{m.levels}</dt><dd>{t.levels.map((l) => lower(fmt.label(LEVELS.find((x) => x.id === l)!.label))).join(', ')}</dd>
          </dl>
        </section>
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl">{m.credentials}</h2>
          <ul className="flex flex-col gap-4">
            {t.credentials.map((c) => (
              <li key={c.title} className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 border-b border-line pb-4">
                <span className="text-sm font-semibold text-ochre">{c.kind === 'ijaza' ? m.ijaza : m.diploma}</span>
                <div className="flex flex-col gap-1"><strong>{c.title}</strong><span className="text-sm text-muted">{[c.institution, c.year].filter(Boolean).join(', ')}</span>
                  <span className={cx('text-sm', c.verified ? 'text-green' : 'text-muted')}>{c.verified ? m.verified : m.declared}</span>{c.sanad && <div className="mt-2"><Sanad chain={c.sanad} /></div>}</div>
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl">{m.reviews}</h2>
          {t.reviews.length === 0 && <p className="text-muted">{m.noReviews}</p>}
          <ul className="flex flex-col gap-5">{t.reviews.map((r) => <li key={r.text} className="flex flex-col gap-1"><Stars value={r.rating} /><p>{r.text}</p><span className="text-sm text-muted">{r.author}, {r.date}</span></li>)}</ul>
        </section>
      </div>

      <aside className="flex flex-col gap-3 overflow-hidden rounded-md border-[1.5px] border-line bg-white p-5 lg:sticky lg:top-4">
        <span><strong className="font-display text-2xl text-green"><Money {...t.price} /></strong> <span className="text-sm text-muted">{all.common.perCourse}</span></span>
        <Stars value={t.rating} count={t.reviews.length} />
        <p className="rounded-sm bg-leaf px-3 py-2 text-sm">{m.trial.before}<Money amount={trialPrice(t.price.amount, t.price.currency)} currency={t.price.currency} />{m.trial.after}</p>
        <h2 className="mt-2 font-display text-lg">{m.pickSlot}</h2>
        <p className="text-sm text-muted">{m.timeNote(tzLabel ?? '', t.name.split(' ')[0], t.city)}</p>
        <div className="flex gap-2">
          <button type="button" className={cx(buttonCls.ghost, 'min-h-9 px-3 text-sm')} disabled={week === 0} onClick={() => setWeek(week - 1)}>{m.prevWeek}</button>
          <button type="button" className={cx(buttonCls.ghost, 'min-h-9 px-3 text-sm')} disabled={week >= 3} onClick={() => setWeek(week + 1)}>{m.nextWeek}</button>
        </div>
        <div className={cx('flex flex-col gap-3', slots.isFetching && 'opacity-60')}>
          {[...byDay.values()].map((list) => (
            <div key={list[0]}>
              <div className="mb-1.5 text-sm font-semibold first-letter:uppercase">{fmt.day(list[0], tz)}</div>
              <div className="flex flex-wrap gap-1.5">
                {list.map((at) => <Link key={at} href={`/reserver/${t.id}/${at}`} className="min-h-10 rounded-sm border border-green2 px-3 py-2 text-sm font-semibold tabular-nums text-green hover:bg-green hover:text-white">{fmt.time(at, tz)}</Link>)}
              </div>
            </div>
          ))}
          {!slots.isPending && byDay.size === 0 && <p className="text-sm text-muted">{m.noSlots}</p>}
        </div>
      </aside>

      {badge && (
        <Modal title={all.badges[badge].label} onClose={() => setBadge(null)}>
          <p>{all.badges[badge].detail}</p>
          {badge === 'ijaza' && ijaza?.sanad && <Sanad chain={ijaza.sanad} />}
          <p className="text-sm text-muted">{m.demoFile}</p>
        </Modal>
      )}
    </div>
  )
}
