'use client'

import { surah } from '@dini/core'
import { useBookingDetails, useFamily } from '@dini/data/react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useFormat, useT } from '@/i18n/locale'

export function ReportScreen() {
  const { id } = useParams<{ id: string }>()
  const q = useBookingDetails(id)
  const family = useFamily()
  const all = useT()
  const m = all.report
  const fmt = useFormat()
  if (q.isPending || !family.data) return <p className="mx-auto max-w-3xl px-5 py-10 text-muted">{all.common.loading}</p>
  if (!q.data?.booking.report) return <div className="mx-auto max-w-3xl px-5 py-10"><p>{m.none}</p><Link href="/progress" className="underline">{m.back}</Link></div>
  const { booking, teacher, learner } = q.data
  const r = booking.report!
  const s = r.surah ? surah(r.surah) : undefined
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
      <Link href="/progress" className="text-sm text-muted hover:text-ink">{m.back}</Link>
      <header className="flex flex-col gap-1">
        <span className="text-sm text-muted first-letter:uppercase">{fmt.day(booking.startsAt, family.data.family.timezone)} · {m.minutes(booking.minutes)} · {learner.name}</span>
        <h1 className="font-display text-3xl">{m.title(teacher.name.split(' ')[0])}</h1>
      </header>
      {s && r.ayahTo && (
        <section className="flex flex-col items-center gap-2 overflow-hidden rounded-md border-[1.5px] border-sand bg-white p-6 text-center outline outline-sand outline-offset-4">
          <span lang="ar" dir="rtl" className="font-arabic text-5xl leading-snug text-green">{s.ar}</span>
          <strong>{m.verses(s.name, r.ayahFrom ?? 1, r.ayahTo, s.ayat)}</strong>
        </section>
      )}
      <dl className="flex flex-col gap-4">
        <div><dt className="text-sm font-semibold text-muted">{m.covered}</dt><dd className="text-lg">{r.covered}</dd></div>
        {r.tajwidNotes && <div><dt className="text-sm font-semibold text-muted">{m.tajwid}</dt><dd className="text-lg">{r.tajwidNotes}</dd></div>}
        <div><dt className="text-sm font-semibold text-muted">{m.homework}</dt><dd className="text-lg">{r.homework}</dd></div>
      </dl>
      {r.comment && <blockquote className="rounded-sm bg-leaf px-5 py-4 text-lg">{r.comment}<span className="mt-2 block text-sm text-muted">{teacher.name}</span></blockquote>}
    </article>
  )
}
