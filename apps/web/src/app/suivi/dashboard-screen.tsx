'use client'

import { HOUR, PLANS, formatDateTime, formatDay, surah, type Booking } from '@dini/core'
import type { LearnerDashboard } from '@dini/data'
import { useCancelBooking, useDashboard, useDini, useDisputeBooking, useFamily } from '@dini/data/react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Modal, Money, Monogram, buttonCls, cx } from '@/components/ui'

export function DashboardScreen() {
  const family = useFamily()
  const dash = useDashboard()
  const justBooked = useSearchParams().get('reservee')
  if (!family.data || !dash.data) return <p className="mx-auto max-w-6xl px-5 py-10 text-muted">Chargement du suivi…</p>
  const { family: fam } = family.data
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Bonjour {fam.parentName.split(' ')[0]}</h1>
          <p className="text-muted">{fam.isAdultLearner ? 'Voici où vous en êtes cette semaine.' : 'Voici où en sont vos enfants cette semaine.'}</p>
        </div>
        <Link href="/enseignants" className={buttonCls.ghost}>Trouver un enseignant</Link>
      </div>
      {justBooked && <p role="status" className="bg-leaf px-4 py-3"><strong>Séance réservée.</strong> Rappels par SMS et e-mail 24 h et 1 h avant le cours.</p>}
      {dash.data.map((d) => <LearnerBlock key={d.learner.id} d={d} tz={fam.timezone} />)}
    </div>
  )
}

function LearnerBlock({ d, tz }: { d: LearnerDashboard; tz: string }) {
  const { api } = useDini()
  const cancel = useCancelBooking()
  const dispute = useDisputeBooking()
  const [toCancel, setToCancel] = useState<Booking | null>(null)
  const [toDispute, setToDispute] = useState<Booking | null>(null)
  const now = api.now()
  const plan = d.subscription && PLANS.find((p) => p.id === d.subscription!.planId)
  const age = new Date().getFullYear() - d.learner.birthYear

  return (
    <article className="flex flex-col border border-line bg-white">
      <header className="flex flex-wrap items-center gap-4 border-b border-line px-6 py-4">
        <Monogram name={d.learner.name} size="sm" />
        <div className="min-w-[200px] flex-1"><h2 className="font-display text-xl">{d.learner.name}</h2><p className="text-sm text-muted">{age} ans. Objectif : {d.learner.goals}</p></div>
        {d.subscription && plan && (
          <p className="text-sm text-muted"><strong className="font-display text-2xl font-normal text-green">{d.subscription.sessionsRemaining}</strong> {d.subscription.sessionsRemaining > 1 ? 'séances restantes' : 'séance restante'} sur {d.subscription.sessionsPerMonth} ({plan.label.fr}, <Money amount={d.subscription.price} currency={d.subscription.currency} /> par mois)</p>
        )}
      </header>
      <div className="grid md:grid-cols-2">
        <section className="flex flex-col gap-2 border-b border-line px-6 py-5 md:border-r">
          <h3 className="text-sm font-semibold text-muted">Prochaine séance</h3>
          {d.next ? <>
            <p className="font-display text-xl first-letter:uppercase">{formatDateTime(d.next.startsAt, tz)}</p>
            <p className="text-sm text-muted">{d.next.kind === 'trial' ? 'Séance d’essai. ' : ''}Dans votre fuseau horaire.</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <button type="button" className={cx(buttonCls.primary, 'min-h-10')}>Rejoindre le cours</button>
              <button type="button" className={cx(buttonCls.ghost, 'min-h-10')} onClick={() => setToCancel(d.next!)}>Annuler ou reporter</button>
            </div>
          </> : <><p className="text-muted">Aucune séance prévue.</p><Link href="/enseignants" className={cx(buttonCls.primary, 'min-h-10 self-start')}>Réserver une séance</Link></>}
        </section>
        <section className="flex flex-col gap-2 border-b border-line px-6 py-5">
          <h3 className="text-sm font-semibold text-muted">Assiduité sur 30 jours</h3>
          {d.attendance.held ? <>
            <p><strong className="font-display text-3xl font-normal text-green">{d.attendance.present}</strong> {d.attendance.present > 1 ? 'séances suivies' : 'séance suivie'} sur {d.attendance.held}</p>
            <div role="img" aria-label={`${d.attendance.present} présences sur ${d.attendance.held}`} className="flex gap-2.5 p-1">
              {d.attendance.marks.map((m, i) => <i key={i} className={cx('size-3 rotate-45', m === 'missed' ? 'border-[1.5px] border-bad' : 'bg-green2')} />)}
            </div>
          </> : <p className="text-muted">Pas encore de séance suivie.</p>}
        </section>
        <section className="flex flex-col gap-2 border-b border-line px-6 py-5 md:border-b-0 md:border-r">
          <h3 className="text-sm font-semibold text-muted">Mémorisation</h3>
          {d.progress.length === 0 ? <p className="text-muted">La progression par sourate apparaîtra après le premier compte rendu.</p> : (
            <ul className="flex flex-col gap-1.5">
              {d.progress.map((p) => {
                const s = surah(p.surah)!
                return (
                  <li key={p.surah} className="grid grid-cols-[90px_minmax(0,1fr)_44px] items-center gap-3">
                    <span lang="ar" dir="rtl" className="font-arabic text-xl">{s.ar}</span>
                    <span dir="rtl" role="img" aria-label={`${s.name} : ${p.reached} versets sur ${s.ayat}`} className="block h-2 bg-leaf"><span className="block h-2 bg-green2" style={{ width: `${(p.reached / s.ayat) * 100}%` }} /></span>
                    <span className="text-right text-sm tabular-nums text-muted">{p.reached}/{s.ayat}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        <section className="flex flex-col gap-2 px-6 py-5">
          <h3 className="text-sm font-semibold text-muted">Dernier compte rendu</h3>
          {d.lastReport?.report ? (
            <Link href={`/suivi/seances/${d.lastReport.id}`} className="flex flex-col gap-1 rounded-sm border border-line p-4 hover:border-green">
              <span className="text-sm text-muted first-letter:uppercase">{formatDay(d.lastReport.startsAt, tz)}</span>
              <strong>{d.lastReport.report.covered}</strong>
              <span className="text-sm">{d.lastReport.report.comment}</span>
              <span className="text-sm font-semibold text-green">Lire le compte rendu</span>
            </Link>
          ) : <p className="text-muted">Le compte rendu de l’enseignant apparaîtra ici après la première séance.</p>}
        </section>
      </div>
      {d.awaitingValidation.map((b) => (
        <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-leaf px-6 py-3">
          <span><strong className="first-letter:uppercase">Séance du {formatDay(b.startsAt, tz)}.</strong> Sans signalement dans les {Math.max(1, Math.ceil((b.releaseAt - now) / HOUR))} h, l’enseignant sera payé.</span>
          <button type="button" className={cx(buttonCls.ghost, 'min-h-10')} onClick={() => setToDispute(b)}>Signaler un problème</button>
        </div>
      ))}
      {d.disputed.map((b) => (
        <p key={b.id} className="border-t border-line bg-warnbg px-6 py-3 text-warn"><strong>Signalement en cours d’examen.</strong> Le paiement de la séance du {formatDay(b.startsAt, tz)} reste bloqué.</p>
      ))}

      {toCancel && (
        <Modal title="Annuler cette séance" onClose={() => setToCancel(null)}>
          <p>{toCancel.startsAt - now >= 24 * HOUR ? (toCancel.kind === 'trial' ? 'La séance est dans plus de 24 h : vous êtes remboursé.' : 'La séance est dans plus de 24 h : elle revient sur votre forfait.') : 'La séance est dans moins de 24 h : elle reste due à l’enseignant.'}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonCls.ghost} onClick={() => setToCancel(null)}>Garder la séance</button>
            <Link href={`/enseignants/${toCancel.teacherId}`} className={buttonCls.primary} onClick={() => { cancel.mutate(toCancel.id); setToCancel(null) }}>Annuler et choisir un autre créneau</Link>
          </div>
        </Modal>
      )}
      {toDispute && (
        <Modal title="Signaler un problème" onClose={() => setToDispute(null)}>
          <p>Le paiement reste bloqué le temps qu’un modérateur examine la séance du {formatDay(toDispute.startsAt, tz)}.</p>
          <button type="button" className={buttonCls.primary} onClick={() => { dispute.mutate(toDispute.id); setToDispute(null) }}>Envoyer le signalement</button>
        </Modal>
      )}
    </article>
  )
}
