import { PLANS, type CurrencyCode, type PlanId } from './catalog'
import { roundMoney } from './money'
import { HOUR } from './time'

// Règles du document de projet (§6). Une seule implémentation, partagée par le web et le mobile.

/** Commission de DINE : 15 % de chaque paiement (séance, forfait ou part de groupe), pour tous les enseignants. */
export const COMMISSION_RATE = 0.15

/** Ce que l'enseignant reçoit sur un montant payé par la famille, une fois la commission déduite. */
export const teacherShare = (amount: number) => amount * (1 - COMMISSION_RATE)

/** Remise de groupe : chaque élève d'un groupe paie le tarif de l'enseignant moins 40 %. */
export const GROUP_DISCOUNT = 0.4

/** Durées : le cours standard, et l'essai de découverte réservé aux nouveaux élèves (un par enseignant). */
export const COURSE_MINUTES = 50
export const TRIAL_MINUTES = 30

export const ESCROW_HOURS = 48
export const FREE_CANCEL_HOURS = 24
export const MIN_PAYOUT_EUR = 20
export const TRIAL_DISCOUNT = 0.5

export const trialPrice = (sessionPrice: number, cur: CurrencyCode) => roundMoney(sessionPrice * TRIAL_DISCOUNT, cur)

export function planPrice(sessionPrice: number, planId: PlanId) {
  const plan = PLANS.find((p) => p.id === planId)!
  return { sessions: plan.sessions, total: sessionPrice * plan.sessions }
}

export type BookingStatus = 'pending_payment' | 'scheduled' | 'delivered' | 'validated' | 'disputed' | 'cancelled' | 'refunded' | 'missed'

/** Une séance effectuée et non contestée est validée 48 h après sa fin. */
export function escrowState(b: { status: BookingStatus; deliveredAt?: number }, now: number): { status: BookingStatus; releaseAt?: number } {
  if (b.status !== 'delivered' || b.deliveredAt === undefined) return { status: b.status }
  const releaseAt = b.deliveredAt + ESCROW_HOURS * HOUR
  return now >= releaseAt ? { status: 'validated' } : { status: 'delivered', releaseAt }
}

export const canDispute = (b: { status: BookingStatus; deliveredAt?: number }, now: number) =>
  escrowState(b, now).status === 'delivered'

/** Annulation gratuite jusqu'à 24 h avant ; ensuite la séance reste due à l'enseignant. */
export function cancellationOutcome(startsAt: number, now: number): 'free' | 'due' {
  return startsAt - now >= FREE_CANCEL_HOURS * HOUR ? 'free' : 'due'
}

export function teacherNet(grossEur: number) {
  return { rate: COMMISSION_RATE, commission: grossEur * COMMISSION_RATE, net: teacherShare(grossEur) }
}

/** Badge « confirmé » : plus de 100 h, note > 4,5, aucun litige. */
export const isConfirmed = (t: { hoursTaught: number; rating: number; disputes: number }) =>
  t.hoursTaught > 100 && t.rating > 4.5 && t.disputes === 0
