import {
  DAY, PLANS, country,
  type Booking, type Country, type CurrencyCode, type Family, type Learner, type PaymentMethod, type Report, type Subscription, type Teacher,
} from '@dini/core'
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { DiniApi } from '../api'
import { buildDashboard, filterTeachers, SlotTakenError, type BookingDraft, type TeacherCard, type TeacherFilters } from '../logic'
import type { Database } from './database.types'

// Implémentation Supabase de l'API DINI. Même contrat que createMockApi : les écrans ne changent pas.
// Les lectures passent par PostgREST (protégé par RLS), les écritures sensibles par des RPC qui recalculent tout côté serveur.
//
// Démo : les identifiants 'fam-diop' et 'fam-sarr' désignent des modèles. Chaque visiteur se connecte en anonyme
// et reçoit sa propre copie de la famille (RPC ensure_demo_family).

export type DiniClient = SupabaseClient<Database>

const TEACHER_COLUMNS = `id, name, gender, city, country_label, timezone, headline, bio, subjects, arabic_tracks, languages, riwayat, madhahib,
  levels, age_groups, rate_xof, rate_eur, identity_verified, diploma_verified, ijaza_verified, hours_taught, rating, disputes,
  teacher_credentials (kind, title, institution, year, riwaya, sanad, position),
  availability_rules (weekday, start_min, end_min),
  reviews (author, rating, body, date_label, position)`

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
type TeacherRow = Omit<Row<'teachers'>, 'user_id' | 'published' | 'created_at'> & {
  teacher_credentials: Row<'teacher_credentials'>[]
  availability_rules: Row<'availability_rules'>[]
  reviews: Row<'reviews'>[]
}
type BookingRow = Row<'bookings'> & { session_reports: Row<'session_reports'> | null }

const MESSAGES: Record<string, string> = {
  no_credit: 'Aucune séance restante sur ce forfait.',
  dispute_window_closed: 'Le délai de 48 h pour signaler cette séance est passé.',
  not_cancellable: 'Cette séance ne peut plus être annulée.',
  invalid_payment_method: 'Ce moyen de paiement n’est pas proposé dans votre pays.',
  forbidden: 'Vous n’avez pas accès à cette information.',
}

function fail(error: PostgrestError | Error): never {
  if (error.message === 'slot_taken') throw new SlotTakenError()
  throw new Error(MESSAGES[error.message] ?? error.message)
}

/** Données d'une réponse réussie ; lève une erreur lisible sinon. */
function must<T>(res: { data: T; error: PostgrestError | null }): NonNullable<T> {
  if (res.error) fail(res.error)
  return res.data as NonNullable<T>
}

/** Intervalle Postgres (« 2 days 01:30:00 », « 48:00:00 ») en millisecondes. */
export function intervalMs(value: string): number {
  let ms = 0
  const days = /(-?\d+) days?/.exec(value)
  if (days) ms += Number(days[1]) * DAY
  const time = /(-?)(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(value)
  if (time) ms += (time[1] === '-' ? -1 : 1) * (Number(time[2]) * 3600 + Number(time[3]) * 60 + Number(time[4])) * 1000
  return ms
}

const toTeacher = (r: TeacherRow): Teacher => ({
  id: r.id, name: r.name, gender: r.gender as Teacher['gender'], city: r.city, countryLabel: r.country_label, timezone: r.timezone,
  headline: r.headline, bio: r.bio,
  subjects: r.subjects as Teacher['subjects'], arabicTracks: r.arabic_tracks as Teacher['arabicTracks'], languages: r.languages as Teacher['languages'],
  riwayat: r.riwayat as Teacher['riwayat'], madhahib: r.madhahib as Teacher['madhahib'], levels: r.levels as Teacher['levels'], ageGroups: r.age_groups as Teacher['ageGroups'],
  rates: { XOF: Number(r.rate_xof), EUR: Number(r.rate_eur) },
  verification: { identity: r.identity_verified, diploma: r.diploma_verified, ijaza: r.ijaza_verified },
  hoursTaught: Number(r.hours_taught), rating: Number(r.rating), disputes: r.disputes,
  credentials: [...r.teacher_credentials].sort((a, b) => a.position - b.position).map((c) => ({
    kind: c.kind as 'diploma' | 'ijaza', title: c.title, institution: c.institution, year: c.year,
    ...(c.riwaya ? { riwaya: c.riwaya as Teacher['riwayat'][number] } : {}), ...(c.sanad ? { sanad: c.sanad } : {}),
  })),
  availability: r.availability_rules.map((a) => ({ weekday: a.weekday, start: a.start_min, end: a.end_min })),
  reviews: [...r.reviews].sort((a, b) => a.position - b.position).map((v) => ({ author: v.author, rating: v.rating, text: v.body, date: v.date_label })),
})

const toBooking = (r: BookingRow): Booking => {
  const rep = r.session_reports
  const report: Report | undefined = rep ? {
    covered: rep.covered, tajwidNotes: rep.tajwid_notes, homework: rep.homework, comment: rep.comment,
    ...(rep.surah != null ? { surah: rep.surah } : {}), ...(rep.ayah_from != null ? { ayahFrom: rep.ayah_from } : {}), ...(rep.ayah_to != null ? { ayahTo: rep.ayah_to } : {}),
  } : undefined
  return {
    id: r.id, learnerId: r.learner_id, teacherId: r.teacher_id, ...(r.subscription_id ? { subscriptionId: r.subscription_id } : {}),
    kind: r.kind as Booking['kind'], subject: r.subject as Booking['subject'], startsAt: Date.parse(r.starts_at), minutes: r.minutes,
    amount: Number(r.amount), currency: r.currency as CurrencyCode, status: r.status as Booking['status'],
    ...(r.delivered_at ? { deliveredAt: Date.parse(r.delivered_at) } : {}), ...(report ? { report } : {}),
  }
}

const toLearner = (r: Row<'learners'>): Learner => ({
  id: r.id, familyId: r.family_id, name: r.name, birthYear: r.birth_year, level: r.level as Learner['level'], goals: r.goals,
})

const toFamily = (r: Row<'families'>): Family => ({
  id: r.id, parentName: r.parent_name, country: r.country as Family['country'], timezone: r.timezone, isAdultLearner: r.is_adult_learner,
})

const toSubscription = (r: Row<'subscriptions'>): Subscription => ({
  id: r.id, learnerId: r.learner_id, teacherId: r.teacher_id, planId: r.plan_id as Subscription['planId'], sessionsPerMonth: r.sessions_per_month,
  sessionsRemaining: r.sessions_remaining, price: Number(r.price), currency: r.currency as CurrencyCode, renewsAt: Date.parse(r.renews_at),
})

export function createSupabaseApi(client: DiniClient): DiniApi {
  let signingIn: Promise<void> | null = null
  const families = new Map<string, string>() // modèle de démo → famille du visiteur
  const offsets = new Map<string, number>() // famille → avance d'horloge de démo
  let active: string | undefined
  let catalog: { at: number; teachers: Promise<Teacher[]> } | null = null

  const now = () => Date.now() + (active ? offsets.get(active) ?? 0 : 0)

  function signIn() {
    signingIn ??= (async () => {
      const { data } = await client.auth.getSession()
      if (data.session) return
      const { error } = await client.auth.signInAnonymously()
      if (error) {
        signingIn = null
        throw new Error(error.code === 'anonymous_provider_disabled'
          ? 'Connexions anonymes désactivées : activez-les dans Supabase (Authentication, Sign In / Providers, Anonymous).'
          : error.message)
      }
    })()
    return signingIn
  }

  /** Accepte un modèle de démo ('fam-diop') ou l'identifiant réel d'une famille. */
  async function resolve(familyId: string): Promise<string> {
    await signIn()
    let id = familyId
    if (familyId.startsWith('fam-')) {
      id = families.get(familyId) ?? must(await client.rpc('ensure_demo_family', { p_template: familyId }))
      families.set(familyId, id)
    }
    active = id
    return id
  }

  async function loadFamily(id: string) {
    const fam = must(await client.from('families').select('*').eq('id', id).single())
    offsets.set(id, intervalMs(fam.clock_offset))
    return fam
  }

  function teachers(): Promise<Teacher[]> {
    if (!catalog || Date.now() - catalog.at > 60_000) {
      const teachers = (async () => {
        const rows = must(await client.from('teachers').select(TEACHER_COLUMNS).order('name')) as unknown as TeacherRow[]
        return rows.map(toTeacher)
      })()
      catalog = { at: Date.now(), teachers }
      teachers.catch(() => { catalog = null })
    }
    return catalog.teachers
  }

  async function withPrices(familyId: string): Promise<TeacherCard[]> {
    const id = await resolve(familyId)
    const [list, prices] = await Promise.all([teachers(), client.rpc('price_list', { p_family: id }).then(must)])
    const byTeacher = new Map(prices.map((p) => [p.teacher_id, { amount: Number(p.amount), currency: p.currency as CurrencyCode }]))
    return list.filter((t) => byTeacher.has(t.id)).map((t) => ({ ...t, price: byTeacher.get(t.id)! }))
  }

  async function bookingRow(id: string) {
    const res = await client.from('bookings').select('*, session_reports (*)').eq('id', id).maybeSingle()
    if (res.error) fail(res.error)
    return res.data ? toBooking(res.data as unknown as BookingRow) : null
  }

  return {
    now,

    async listTeachers(familyId: string, f: TeacherFilters = {}) {
      const list = await withPrices(familyId)
      const fam = await loadFamily(active!)
      return filterTeachers(list, f, fam.timezone, now())
    },

    async getTeacher(familyId: string, id: string) {
      return (await withPrices(familyId)).find((t) => t.id === id) ?? null
    },

    async getSlots(teacherId: string, weekOffset = 0, days = 7) {
      const from = new Date(now() + weekOffset * 7 * DAY).toISOString()
      const slots = must(await client.rpc('free_slots', { p_teacher: teacherId, p_from: from, p_days: days }))
      return slots.map((s) => Date.parse(s))
    },

    async getFamily(familyId: string) {
      const id = await resolve(familyId)
      const [fam, learners] = await Promise.all([
        loadFamily(id),
        client.from('learners').select('*').eq('family_id', id).order('created_at').then(must),
      ])
      const family = toFamily(fam)
      return { family, country: country(family.country), learners: learners.map(toLearner) }
    },

    async setResidence(familyId: string, code: Country['code'], timezone: string) {
      const id = await resolve(familyId)
      must(await client.from('families').update({ country: code, timezone }).eq('id', id).select('id').single())
    },

    async addLearner(familyId: string, name: string, birthYear: number) {
      const id = await resolve(familyId)
      return toLearner(must(await client.from('learners').insert({ family_id: id, name, birth_year: birthYear }).select('*').single()))
    },

    async quote(familyId: string, teacherId: string, learnerId: string) {
      const id = await resolve(familyId)
      const q = must(await client.rpc('quote', { p_family: id, p_teacher: teacherId, p_learner: learnerId })) as {
        currency: CurrencyCode; session: number; trial: number; credit: { remaining: number; of: number } | null; payments: PaymentMethod[]
        plans: { id: string; sessions: number; total: number }[]
      }
      return {
        currency: q.currency,
        session: Number(q.session),
        trial: Number(q.trial),
        plans: PLANS.map((p) => ({ id: p.id, sessions: p.sessions, label: p.label, usage: p.usage, total: Number(q.plans.find((x) => x.id === p.id)?.total ?? 0) })),
        credit: q.credit,
        payments: q.payments,
      }
    },

    async createBooking(draft: BookingDraft) {
      const id = await resolve(draft.familyId)
      const res = must(await client.rpc('book_session', {
        p_family: id, p_learner: draft.learnerId, p_teacher: draft.teacherId, p_subject: draft.subject,
        p_starts_at: new Date(draft.startsAt).toISOString(), p_choice: draft.choice, ...(draft.method ? { p_method: draft.method } : {}),
      })) as { booking_id: string; charged: number; currency: CurrencyCode }
      const booking = await bookingRow(res.booking_id)
      if (!booking) throw new Error('La réservation n’a pas abouti. Réessayez.')
      return { booking, charged: { amount: Number(res.charged), currency: res.currency } }
    },

    async cancelBooking(id: string) {
      return must(await client.rpc('cancel_booking', { p_booking: id })) as 'free' | 'due'
    },

    async disputeBooking(id: string) {
      must(await client.rpc('dispute_booking', { p_booking: id }))
    },

    async getBooking(id: string) {
      await signIn()
      const booking = await bookingRow(id)
      if (!booking) return null
      const [list, learner] = await Promise.all([teachers(), client.from('learners').select('*').eq('id', booking.learnerId).single().then(must)])
      return { booking, teacher: list.find((t) => t.id === booking.teacherId)!, learner: toLearner(learner) }
    },

    async getDashboard(familyId: string) {
      const id = await resolve(familyId)
      await loadFamily(id)
      const learners = must(await client.from('learners').select('*').eq('family_id', id).order('created_at')).map(toLearner)
      const ids = learners.map((l) => l.id)
      const [bookings, subs] = await Promise.all([
        client.from('bookings').select('*, session_reports (*)').in('learner_id', ids).order('starts_at').then(must),
        client.from('subscriptions').select('*').in('learner_id', ids).order('renews_at').then(must),
      ])
      return buildDashboard(learners, (bookings as unknown as BookingRow[]).map(toBooking), subs.map(toSubscription), now())
    },

    async deliverBooking(id: string, report: Report) {
      must(await client.rpc('demo_deliver', { p_booking: id, p_report: report }))
    },

    async advanceClock(familyId: string, hours: number) {
      const id = await resolve(familyId)
      must(await client.rpc('demo_advance', { p_family: id, p_hours: hours }))
      await loadFamily(id)
    },

    async reset(familyId: string) {
      const id = await resolve(familyId)
      const fresh = must(await client.rpc('reset_demo', { p_family: id }))
      for (const [template, fam] of families) if (fam === id) families.set(template, fresh)
      offsets.delete(id)
      active = fresh
      catalog = null
    },
  }
}
