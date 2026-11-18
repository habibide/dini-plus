import {
  COURSE_MINUTES, DAY, ESCROW_HOURS, HOUR, generateSlots, zonedParts,
  type Booking, type CurrencyCode, type LanguageId, type Learner, type PaymentMethod, type PlanId, type SubjectId, type Subscription, type Teacher,
} from '@dini/core'
import { dataLocale } from './locale'

// Types et calculs partagés par les deux implémentations de l'API (fictive et Supabase).

export type TeacherFilters = {
  subject?: SubjectId
  riwaya?: string
  gender?: 'F' | 'M'
  language?: LanguageId
  level?: string
  ageGroup?: string
  maxPrice?: number
  timeOfDay?: 'morning' | 'afternoon' | 'evening'
}

export type TeacherCard = Teacher & { price: { amount: number; currency: CurrencyCode } }

export type BookingChoice = 'trial' | 'credit' | PlanId

export type BookingDraft = {
  learnerId: string
  teacherId: string
  subject: SubjectId
  startsAt: number
  choice: BookingChoice
  method?: PaymentMethod
}

/** La salle vidéo ouvre 10 minutes avant le début et ferme 15 minutes après la fin prévue (même règle qu'en base). */
export const videoWindow = (b: { startsAt: number; minutes: number }) => ({ opensAt: b.startsAt - 10 * 60_000, closesAt: b.startsAt + (b.minutes + 15) * 60_000 })

export class SlotTakenError extends Error {
  constructor() { super({ fr: 'Ce créneau vient d’être réservé par quelqu’un d’autre.', en: 'This time slot has just been booked by someone else.', ar: 'حُجز هذا الموعد للتو من قِبل شخص آخر.' }[dataLocale()]) }
}

export type LearnerDashboard = {
  learner: Learner
  next?: Booking
  attendance: { present: number; held: number; marks: ('present' | 'missed')[] }
  progress: { surah: number; reached: number }[]
  lastReport?: Booking
  awaitingValidation: (Booking & { releaseAt: number })[]
  disputed: Booking[]
  subscription?: Subscription
}

/** Filtres de la recherche. `tz` est le fuseau de la famille, pour le moment de la journée. */
export function filterTeachers(list: TeacherCard[], f: TeacherFilters, tz: string, now: number): TeacherCard[] {
  return list.filter((t) =>
    (!f.subject || t.subjects.includes(f.subject)) &&
    (!f.riwaya || t.riwayat.includes(f.riwaya as never)) &&
    (!f.gender || t.gender === f.gender) &&
    (!f.language || t.languages.includes(f.language)) &&
    (!f.level || t.levels.includes(f.level as never)) &&
    (!f.ageGroup || t.ageGroups.includes(f.ageGroup as never)) &&
    (!f.maxPrice || t.price.amount <= f.maxPrice) &&
    (!f.timeOfDay || generateSlots(t.availability, t.timezone, now, 7, { leadMs: 0, duration: COURSE_MINUTES }).some((at) => {
      const hour = zonedParts(at, tz).minutes / 60
      return f.timeOfDay === 'morning' ? hour < 12 : f.timeOfDay === 'afternoon' ? hour >= 12 && hour < 18 : hour >= 18
    })))
}

/** Tableau de suivi de chaque élève : prochaine séance, assiduité sur 30 jours, mémorisation, séquestre. */
export function buildDashboard(learners: Learner[], bookings: Booking[], subscriptions: Subscription[], now: number): LearnerDashboard[] {
  return learners.map((learner) => {
    const mine = bookings.filter((b) => b.learnerId === learner.id).sort((a, b) => a.startsAt - b.startsAt)
    const held = mine.filter((b) => ['delivered', 'validated', 'disputed', 'missed'].includes(b.status) && b.startsAt > now - 30 * DAY)
    const best = new Map<number, number>()
    for (const b of mine) if (b.report?.surah && b.report.ayahTo) best.set(b.report.surah, Math.max(best.get(b.report.surah) ?? 0, b.report.ayahTo))
    return {
      learner,
      next: mine.find((b) => b.status === 'scheduled' && b.startsAt + b.minutes * 60_000 > now),
      attendance: { present: held.filter((b) => b.status !== 'missed').length, held: held.length, marks: held.map((b) => (b.status === 'missed' ? 'missed' : 'present')) },
      progress: [...best.entries()].map(([surah, reached]) => ({ surah, reached })),
      lastReport: [...mine].reverse().find((b) => b.report),
      // Séances effectuées ou absences signalées : la famille a 48 h pour contester avant le paiement de l'enseignant.
      awaitingValidation: mine.filter((b) => (b.status === 'delivered' || b.status === 'missed') && b.deliveredAt !== undefined && b.deliveredAt + ESCROW_HOURS * HOUR > now)
        .map((b) => ({ ...b, releaseAt: b.deliveredAt! + ESCROW_HOURS * HOUR })),
      disputed: mine.filter((b) => b.status === 'disputed'),
      subscription: subscriptions.find((s) => s.learnerId === learner.id),
    }
  })
}
