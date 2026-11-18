import { z } from 'zod'
import { MADHAHIB, RIWAYAT } from './catalog'

// Calqué sur le modèle de données du document (§10), en camelCase. Les mêmes schémas
// valideront les réponses de Supabase quand le backend arrivera.

const subjectId = z.enum(['quran', 'hadith', 'fiqh', 'azkar', 'tajwid', 'arabic', 'aqida', 'history', 'sirah', 'tafsir'])
const languageId = z.enum(['fr', 'wo', 'ff', 'srr', 'bm', 'soce', 'mnk'])
const currency = z.enum(['XOF', 'GMD', 'EUR', 'USD', 'CAD'])
const countryCode = z.enum(['SN', 'GM', 'FR', 'US', 'CA'])

export const CredentialSchema = z.object({
  kind: z.enum(['diploma', 'ijaza']),
  title: z.string(),
  institution: z.string(),
  year: z.number().int(),
  riwaya: z.enum(RIWAYAT).optional(),
  sanad: z.array(z.string()).optional(),
  /** Vérifié par DINE ; un diplôme ajouté après l'approbation reste « déclaré » jusqu'à sa vérification. */
  verified: z.boolean().optional(),
})

export const ReviewSchema = z.object({ author: z.string(), rating: z.number().min(1).max(5), text: z.string(), date: z.string() })

export const TeacherSchema = z.object({
  id: z.string(),
  name: z.string(),
  gender: z.enum(['F', 'M']),
  city: z.string(),
  countryLabel: z.string(),
  timezone: z.string(),
  headline: z.string(),
  bio: z.string(),
  subjects: z.array(subjectId).min(1),
  arabicTracks: z.array(z.enum(['reading', 'writing', 'practice'])),
  languages: z.array(languageId).min(1),
  riwayat: z.array(z.enum(RIWAYAT)),
  madhahib: z.array(z.enum(MADHAHIB)),
  levels: z.array(z.enum(['beginner', 'intermediate', 'advanced'])),
  ageGroups: z.array(z.enum(['child', 'teen', 'adult'])),
  rates: z.object({ XOF: z.number().positive(), EUR: z.number().positive() }),
  verification: z.object({ identity: z.boolean(), diploma: z.boolean(), ijaza: z.boolean() }),
  hoursTaught: z.number().nonnegative(),
  rating: z.number().min(0).max(5),
  disputes: z.number().int().nonnegative(),
  credentials: z.array(CredentialSchema),
  availability: z.array(z.object({ weekday: z.number().int().min(0).max(6), start: z.number().int(), end: z.number().int() })),
  reviews: z.array(ReviewSchema),
})
export type Teacher = z.infer<typeof TeacherSchema>

export const LearnerSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  name: z.string(),
  birthYear: z.number().int(),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  goals: z.string(),
})
export type Learner = z.infer<typeof LearnerSchema>

export const FamilySchema = z.object({
  id: z.string(),
  parentName: z.string(),
  country: countryCode,
  timezone: z.string(),
  isAdultLearner: z.boolean(),
})
export type Family = z.infer<typeof FamilySchema>

export const ReportSchema = z.object({
  covered: z.string(),
  surah: z.number().int().optional(),
  ayahFrom: z.number().int().optional(),
  ayahTo: z.number().int().optional(),
  tajwidNotes: z.string(),
  homework: z.string(),
  comment: z.string(),
})
export type Report = z.infer<typeof ReportSchema>

export const SubscriptionSchema = z.object({
  id: z.string(),
  learnerId: z.string(),
  teacherId: z.string(),
  planId: z.enum(['discovery', 'regular', 'intensive', 'hifz']),
  sessionsPerMonth: z.number().int(),
  sessionsRemaining: z.number().int(),
  price: z.number(),
  currency,
  renewsAt: z.number(),
})
export type Subscription = z.infer<typeof SubscriptionSchema>

export const BookingSchema = z.object({
  id: z.string(),
  learnerId: z.string(),
  teacherId: z.string(),
  subscriptionId: z.string().optional(),
  kind: z.enum(['trial', 'plan']),
  subject: subjectId,
  startsAt: z.number(),
  minutes: z.number().int(),
  amount: z.number(),
  currency,
  status: z.enum(['scheduled', 'delivered', 'validated', 'disputed', 'cancelled', 'refunded', 'missed']),
  deliveredAt: z.number().optional(),
  report: ReportSchema.optional(),
})
export type Booking = z.infer<typeof BookingSchema>
