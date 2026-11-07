import {
  DAY, HOUR, PLANS, cancellationOutcome, canDispute, country, escrowState, generateSlots, sessionPrice, trialPrice, zonedParts,
  type Booking, type Country, type CurrencyCode, type Family, type LanguageId, type Learner, type PlanId, type Report, type SubjectId, type Subscription, type Teacher,
} from '@dini/core'
import { SEED_FAMILIES, SEED_LEARNERS, SEED_TEACHERS, seedActivity } from './seed'

// Implémentation fictive de l'API DINI. Les écrans ne connaissent que le type `DiniApi` :
// le jour où Supabase arrive, on écrit une seconde implémentation, sans toucher aux écrans.

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null> | string | null
  setItem(key: string, value: string): Promise<void> | void
}

export const memoryStorage = (): KeyValueStorage => {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }
}

type Db = {
  version: number
  clockOffset: number
  teachers: Teacher[]
  families: Family[]
  learners: Learner[]
  subscriptions: Subscription[]
  bookings: Booking[]
  seq: number
}

const DB_VERSION = 1
const KEY = 'dini-mock-db'

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
  familyId: string
  learnerId: string
  teacherId: string
  subject: SubjectId
  startsAt: number
  choice: BookingChoice
}

export class SlotTakenError extends Error {
  constructor() { super('Ce créneau vient d’être réservé par quelqu’un d’autre.') }
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

const latency = () => new Promise((r) => setTimeout(r, 120))

export function createMockApi(storage: KeyValueStorage = memoryStorage()) {
  let db: Db | null = null

  const fresh = (): Db => {
    const now = Date.now()
    return {
      version: DB_VERSION, clockOffset: 0, seq: 100,
      teachers: structuredClone(SEED_TEACHERS), families: structuredClone(SEED_FAMILIES), learners: structuredClone(SEED_LEARNERS),
      ...seedActivity(now),
    }
  }

  const now = () => Date.now() + (db?.clockOffset ?? 0)

  async function load(): Promise<Db> {
    if (db) return db
    try {
      const raw = await storage.getItem(KEY)
      const parsed = raw ? (JSON.parse(raw) as Db) : null
      db = parsed && parsed.version === DB_VERSION ? parsed : fresh()
    } catch {
      db = fresh()
    }
    settle(db)
    return db
  }

  async function save() {
    if (!db) return
    try { await storage.setItem(KEY, JSON.stringify(db)) } catch { /* stockage indisponible : la démo continue en mémoire */ }
  }

  /** Libère le séquestre des séances non contestées depuis 48 h et crédite les enseignants. */
  function settle(d: Db) {
    for (const b of d.bookings) {
      const s = escrowState(b, now())
      if (b.status === 'delivered' && s.status === 'validated') {
        b.status = 'validated'
        const t = d.teachers.find((x) => x.id === b.teacherId)
        if (t) t.hoursTaught += b.minutes / 60
      }
    }
  }

  const taken = (d: Db, teacherId: string) =>
    new Set(d.bookings.filter((b) => b.teacherId === teacherId && !['cancelled', 'refunded'].includes(b.status)).map((b) => b.startsAt))

  const familyOf = (d: Db, id: string) => {
    const f = d.families.find((x) => x.id === id)
    if (!f) throw new Error(`Famille inconnue : ${id}`)
    return f
  }

  return {
    now,

    async listTeachers(familyId: string, f: TeacherFilters = {}): Promise<TeacherCard[]> {
      const d = await load(); await latency()
      const fam = familyOf(d, familyId)
      return d.teachers
        .map((t) => ({ ...t, price: sessionPrice(t.rates, fam.country) }))
        .filter((t) =>
          (!f.subject || t.subjects.includes(f.subject)) &&
          (!f.riwaya || t.riwayat.includes(f.riwaya as never)) &&
          (!f.gender || t.gender === f.gender) &&
          (!f.language || t.languages.includes(f.language)) &&
          (!f.level || t.levels.includes(f.level as never)) &&
          (!f.ageGroup || t.ageGroups.includes(f.ageGroup as never)) &&
          (!f.maxPrice || t.price.amount <= f.maxPrice) &&
          (!f.timeOfDay || generateSlots(t.availability, t.timezone, now(), 7, { leadMs: 0 }).some((at) => {
            const hour = zonedParts(at, fam.timezone).minutes / 60
            return f.timeOfDay === 'morning' ? hour < 12 : f.timeOfDay === 'afternoon' ? hour >= 12 && hour < 18 : hour >= 18
          })))
    },

    async getTeacher(familyId: string, id: string): Promise<TeacherCard | null> {
      const d = await load(); await latency()
      const t = d.teachers.find((x) => x.id === id)
      return t ? { ...t, price: sessionPrice(t.rates, familyOf(d, familyId).country) } : null
    },

    /** Créneaux libres de l'enseignant sur `days` jours, à partir de `weekOffset` semaines. */
    async getSlots(teacherId: string, weekOffset = 0, days = 7): Promise<number[]> {
      const d = await load(); await latency()
      const t = d.teachers.find((x) => x.id === teacherId)
      if (!t) return []
      return generateSlots(t.availability, t.timezone, now() + weekOffset * 7 * DAY, days, { taken: taken(d, teacherId) })
    },

    async getFamily(familyId: string) {
      const d = await load()
      const family = familyOf(d, familyId)
      return { family, country: country(family.country), learners: d.learners.filter((l) => l.familyId === familyId) }
    },

    async setResidence(familyId: string, code: Country['code'], timezone: string) {
      const d = await load()
      const f = familyOf(d, familyId)
      f.country = code
      f.timezone = timezone
      await save()
    },

    async addLearner(familyId: string, name: string, birthYear: number): Promise<Learner> {
      const d = await load()
      const l: Learner = { id: `l-${++d.seq}`, familyId, name, birthYear, level: 'beginner', goals: 'À définir avec l’enseignant' }
      d.learners.push(l)
      await save()
      return l
    },

    async quote(familyId: string, teacherId: string, learnerId: string) {
      const d = await load()
      const fam = familyOf(d, familyId)
      const t = d.teachers.find((x) => x.id === teacherId)!
      const price = sessionPrice(t.rates, fam.country)
      const sub = d.subscriptions.find((s) => s.learnerId === learnerId && s.teacherId === teacherId && s.sessionsRemaining > 0)
      return {
        currency: price.currency,
        session: price.amount,
        trial: trialPrice(price.amount, price.currency),
        plans: PLANS.map((p) => ({ id: p.id, sessions: p.sessions, label: p.label, usage: p.usage, total: p.sessions * price.amount })),
        credit: sub ? { remaining: sub.sessionsRemaining, of: sub.sessionsPerMonth } : null,
        payments: country(fam.country).payments,
      }
    },

    async createBooking(draft: BookingDraft): Promise<{ booking: Booking; charged: { amount: number; currency: CurrencyCode } }> {
      const d = await load(); await latency()
      // En production : contrainte d'unicité en base (teacher_id, starts_at), jamais un contrôle côté client.
      if (taken(d, draft.teacherId).has(draft.startsAt)) throw new SlotTakenError()
      const fam = familyOf(d, draft.familyId)
      const t = d.teachers.find((x) => x.id === draft.teacherId)!
      const price = sessionPrice(t.rates, fam.country)
      const booking: Booking = {
        id: `b-${++d.seq}`, learnerId: draft.learnerId, teacherId: t.id, kind: 'plan', subject: draft.subject,
        startsAt: draft.startsAt, minutes: 30, amount: price.amount, currency: price.currency, status: 'scheduled',
      }
      let charged = { amount: 0, currency: price.currency }
      if (draft.choice === 'trial') {
        booking.kind = 'trial'
        booking.amount = trialPrice(price.amount, price.currency)
        charged = { amount: booking.amount, currency: price.currency }
      } else if (draft.choice === 'credit') {
        const sub = d.subscriptions.find((s) => s.learnerId === draft.learnerId && s.teacherId === t.id && s.sessionsRemaining > 0)
        if (!sub) throw new Error('Aucune séance restante sur ce forfait.')
        sub.sessionsRemaining -= 1
        booking.subscriptionId = sub.id
        booking.amount = sub.price / sub.sessionsPerMonth
        booking.currency = sub.currency
      } else {
        const plan = PLANS.find((p) => p.id === draft.choice)!
        const sub: Subscription = {
          id: `s-${++d.seq}`, learnerId: draft.learnerId, teacherId: t.id, planId: plan.id, sessionsPerMonth: plan.sessions,
          sessionsRemaining: plan.sessions - 1, price: plan.sessions * price.amount, currency: price.currency, renewsAt: now() + 30 * DAY,
        }
        d.subscriptions.push(sub)
        booking.subscriptionId = sub.id
        charged = { amount: sub.price, currency: sub.currency }
      }
      d.bookings.push(booking)
      await save()
      return { booking, charged }
    },

    async cancelBooking(id: string): Promise<'free' | 'due'> {
      const d = await load()
      const b = d.bookings.find((x) => x.id === id)!
      const outcome = cancellationOutcome(b.startsAt, now())
      if (outcome === 'free') {
        b.status = b.kind === 'trial' ? 'refunded' : 'cancelled'
        const sub = d.subscriptions.find((s) => s.id === b.subscriptionId)
        if (sub) sub.sessionsRemaining += 1
      } else {
        b.status = 'validated'
      }
      await save()
      return outcome
    },

    async disputeBooking(id: string) {
      const d = await load()
      const b = d.bookings.find((x) => x.id === id)!
      if (!canDispute(b, now())) throw new Error('Le délai de 48 h pour signaler cette séance est passé.')
      b.status = 'disputed'
      await save()
    },

    async getBooking(id: string) {
      const d = await load()
      const b = d.bookings.find((x) => x.id === id)
      if (!b) return null
      return { booking: b, teacher: d.teachers.find((t) => t.id === b.teacherId)!, learner: d.learners.find((l) => l.id === b.learnerId)! }
    },

    async getDashboard(familyId: string): Promise<LearnerDashboard[]> {
      const d = await load(); await latency()
      settle(d)
      const t = now()
      return d.learners.filter((l) => l.familyId === familyId).map((learner) => {
        const mine = d.bookings.filter((b) => b.learnerId === learner.id).sort((a, b) => a.startsAt - b.startsAt)
        const held = mine.filter((b) => ['delivered', 'validated', 'disputed', 'missed'].includes(b.status) && b.startsAt > t - 30 * DAY)
        const best = new Map<number, number>()
        for (const b of mine) if (b.report?.surah && b.report.ayahTo) best.set(b.report.surah, Math.max(best.get(b.report.surah) ?? 0, b.report.ayahTo))
        return {
          learner,
          next: mine.find((b) => b.status === 'scheduled' && b.startsAt + b.minutes * 60_000 > t),
          attendance: { present: held.filter((b) => b.status !== 'missed').length, held: held.length, marks: held.map((b) => (b.status === 'missed' ? 'missed' : 'present')) },
          progress: [...best.entries()].map(([surah, reached]) => ({ surah, reached })),
          lastReport: [...mine].reverse().find((b) => b.report),
          awaitingValidation: mine.filter((b) => b.status === 'delivered').map((b) => ({ ...b, releaseAt: escrowState(b, t).releaseAt! })),
          disputed: mine.filter((b) => b.status === 'disputed'),
          subscription: d.subscriptions.find((s) => s.learnerId === learner.id),
        }
      })
    },

    /** Démo : l'enseignant marque la séance effectuée avec son compte rendu. */
    async deliverBooking(id: string, report: Report) {
      const d = await load()
      const b = d.bookings.find((x) => x.id === id)!
      const end = b.startsAt + b.minutes * 60_000
      if (end > now()) d.clockOffset += end - now()
      b.status = 'delivered'
      b.deliveredAt = now()
      b.report = report
      await save()
    },

    /** Démo : avance l'horloge, par exemple de 48 h pour libérer le séquestre. */
    async advanceClock(hours: number) {
      const d = await load()
      d.clockOffset += hours * HOUR
      settle(d)
      await save()
    },

    async reset() {
      db = fresh()
      await save()
    },
  }
}

export type DiniApi = ReturnType<typeof createMockApi>
