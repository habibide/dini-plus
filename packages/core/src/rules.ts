import { PLANS, type CurrencyCode, type PlanId } from './catalog'
import { roundMoney } from './money'
import { HOUR } from './time'

// Règles du document de projet (§6). Une seule implémentation, partagée par le web et le mobile.

export const COMMISSION_TIERS = [
  { fromHours: 0, toHours: 20, rate: 0.3 },
  { fromHours: 20, toHours: 50, rate: 0.25 },
  { fromHours: 50, toHours: 200, rate: 0.2 },
  { fromHours: 200, toHours: Infinity, rate: 0.15 },
] as const

export const commissionRate = (hoursTaught: number) => COMMISSION_TIERS.find((t) => hoursTaught < t.toHours)!.rate

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

export type BookingStatus = 'scheduled' | 'delivered' | 'validated' | 'disputed' | 'cancelled' | 'refunded' | 'missed'

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

export function teacherNet(grossEur: number, hoursTaught: number) {
  const rate = commissionRate(hoursTaught)
  return { rate, commission: grossEur * rate, net: grossEur * (1 - rate) }
}

/** Badge « confirmé » : plus de 100 h, note > 4,5, aucun litige. */
export const isConfirmed = (t: { hoursTaught: number; rating: number; disputes: number }) =>
  t.hoursTaught > 100 && t.rating > 4.5 && t.disputes === 0
