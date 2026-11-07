'use client'

import { formatDay, surah } from '@dini/core'
import { useBookingDetails, useFamily } from '@dini/data/react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export function ReportScreen() {
  const { id } = useParams<{ id: string }>()
  const q = useBookingDetails(id)
  const family = useFamily()
  if (q.isPending || !family.data) return <p className="mx-auto max-w-3xl px-5 py-10 text-muted">Chargement…</p>
  if (!q.data?.booking.report) return <div className="mx-auto max-w-3xl px-5 py-10"><p>Pas encore de compte rendu pour cette séance.</p><Link href="/suivi" className="underline">Retour au suivi</Link></div>
  const { booking, teacher, learner } = q.data
  const r = booking.report!
  const s = r.surah ? surah(r.surah) : undefined
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
      <Link href="/suivi" className="text-sm text-muted hover:text-ink">Retour au suivi</Link>
      <header className="flex flex-col gap-1">
        <span className="text-sm text-muted first-letter:uppercase">{formatDay(booking.startsAt, family.data.family.timezone)} · 30 minutes · {learner.name}</span>
        <h1 className="font-display text-3xl">Compte rendu {/^[aeiouyàâéèêëîïôöûüh]/i.test(teacher.name) ? 'd’' : 'de '}{teacher.name.split(' ')[0]}</h1>
      </header>
      {s && r.ayahTo && (
        <section className="flex flex-col items-center gap-2 border border-sand bg-white p-6 text-center outline outline-sand outline-offset-4">
          <span lang="ar" dir="rtl" className="font-arabic text-5xl leading-snug text-green">{s.ar}</span>
          <strong>{s.name}, versets {r.ayahFrom} à {r.ayahTo} sur {s.ayat}</strong>
        </section>
      )}
      <dl className="flex flex-col gap-4">
        <div><dt className="text-sm font-semibold text-muted">Travaillé</dt><dd className="text-lg">{r.covered}</dd></div>
        {r.tajwidNotes && <div><dt className="text-sm font-semibold text-muted">Tajwid</dt><dd className="text-lg">{r.tajwidNotes}</dd></div>}
        <div><dt className="text-sm font-semibold text-muted">À faire avant le prochain cours</dt><dd className="text-lg">{r.homework}</dd></div>
      </dl>
      {r.comment && <blockquote className="bg-leaf px-5 py-4 text-lg">{r.comment}<span className="mt-2 block text-sm text-muted">{teacher.name}</span></blockquote>}
    </article>
  )
}
