'use client'

import { COMMISSION_TIERS, commissionRate, formatDateTime, subject } from '@dini/core'
import type { AgendaItem } from '@dini/data/supabase'
import { useAgenda, useEarnings, useMyTeacher, useStartApplication } from '@dini/data/react'
import Link from 'next/link'
import { StatusBanner } from '@/components/teacher'
import { Money, buttonCls, cx } from '@/components/ui'
import { JoinButton } from '@/components/video'

const euros = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

export function TeacherHome() {
  const me = useMyTeacher()
  const agenda = useAgenda()
  const earnings = useEarnings()
  const start = useStartApplication()

  if (me.isPending) return <p className="mx-auto max-w-6xl px-5 py-10 text-muted">Chargement…</p>
  const t = me.data
  if (!t) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-5 py-12">
        <h1 className="font-display text-3xl">Espace enseignant</h1>
        <p>Ce compte n’a pas encore de profil enseignant.</p>
        <button type="button" className={buttonCls.primary} disabled={start.isPending} onClick={() => start.mutate()}>Commencer ma candidature</button>
      </div>
    )
  }

  const now = Date.now()
  const items = agenda.data ?? []
  const toComplete = items.filter((b) => b.status === 'scheduled' && b.startsAt <= now)
  const upcoming = items.filter((b) => b.status === 'scheduled' && b.startsAt > now)
  const hours = earnings.data?.hoursTaught ?? t.hoursTaught
  const rate = commissionRate(hours)
  const next = COMMISSION_TIERS.find((x) => hours < x.fromHours)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Bonjour {t.name.split(' ')[0] || 'et bienvenue'}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/enseignant/disponibilites" className={buttonCls.ghost}>Mes disponibilités</Link>
          <Link href="/enseignant/candidature" className={buttonCls.ghost}>{t.status === 'approved' ? 'Modifier mon profil' : 'Ma candidature'}</Link>
        </div>
      </div>
      <StatusBanner t={t} />

      {t.status === 'approved' && <>
        {toComplete.length > 0 && (
          <section className="flex flex-col border border-ochre bg-white">
            <h2 className="border-b border-line px-6 py-4 font-display text-xl">À compléter</h2>
            <p className="px-6 pt-4 text-muted">Écrivez le compte rendu de chaque séance : la famille le reçoit, et votre paiement est libéré 48 h après.</p>
            <SessionList items={toComplete} action="Écrire le compte rendu" />
          </section>
        )}

        <section className="flex flex-col border border-line bg-white">
          <h2 className="border-b border-line px-6 py-4 font-display text-xl">Prochaines séances</h2>
          {agenda.isPending ? <p className="px-6 py-5 text-muted">Chargement…</p>
            : upcoming.length ? <SessionList items={upcoming} />
            : <p className="px-6 py-5 text-muted">Aucune séance réservée pour l’instant. Des disponibilités larges vous rendent plus visible dans la recherche.</p>}
        </section>

        <section className="grid gap-px border border-line bg-line md:grid-cols-3">
          <div className="flex flex-col gap-1 bg-white px-6 py-5">
            <h2 className="text-sm font-semibold text-muted">Acquis</h2>
            <p className="font-display text-3xl text-green">{euros(earnings.data?.releasedEur ?? 0)}</p>
            <p className="text-sm text-muted">Net de commission, après les 48 h sans litige.</p>
          </div>
          <div className="flex flex-col gap-1 bg-white px-6 py-5">
            <h2 className="text-sm font-semibold text-muted">En attente</h2>
            <p className="font-display text-3xl">{earnings.data?.pending.count ?? 0} {(earnings.data?.pending.count ?? 0) > 1 ? 'séances' : 'séance'}</p>
            <p className="text-sm text-muted">{earnings.data?.pending.releaseAt[0] ? `Prochaine libération ${formatDateTime(Math.min(...earnings.data.pending.releaseAt), Intl.DateTimeFormat().resolvedOptions().timeZone)}.` : 'Rien en attente.'}</p>
          </div>
          <div className="flex flex-col gap-1 bg-white px-6 py-5">
            <h2 className="text-sm font-semibold text-muted">Commission DINI</h2>
            <p className="font-display text-3xl">{Math.round(rate * 100)} %</p>
            <p className="text-sm text-muted">{Math.round(hours)} h enseignées.{next ? ` Passe à ${Math.round(next.rate * 100)} % à partir de ${next.fromHours} h.` : ' Palier le plus bas atteint.'}</p>
          </div>
        </section>
      </>}
    </div>
  )
}

function SessionList({ items, action }: { items: AgendaItem[]; action?: string }) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((b) => (
        <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex flex-col gap-0.5">
            <strong className="first-letter:uppercase">{formatDateTime(b.startsAt, tz)}</strong>
            <span className="text-sm text-muted">
              {b.learner.name}, {new Date().getFullYear() - b.learner.birthYear} ans · {subject(b.subject).label.fr}{b.kind === 'trial' ? ' · séance d’essai' : ''} · <Money amount={b.amount} currency={b.currency} />
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {b.status === 'scheduled' && <JoinButton booking={b} tz={tz} />}
            <Link href={`/enseignant/seances/${b.id}`} className={cx(action ? buttonCls.primary : buttonCls.ghost, 'min-h-10')}>{action ?? 'Détails'}</Link>
          </div>
        </li>
      ))}
    </ul>
  )
}
