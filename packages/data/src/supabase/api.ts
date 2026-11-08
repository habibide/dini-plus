import {
  DAY, PLANS, country,
  type Booking, type Country, type CurrencyCode, type Family, type Learner, type PaymentMethod, type Report, type Subscription, type Teacher,
} from '@dini/core'
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { KeyValueStorage } from '../api'
import { buildDashboard, filterTeachers, SlotTakenError, type BookingDraft, type TeacherCard, type TeacherFilters } from '../logic'
import type { Database } from './database.types'

// API DINE sur Supabase. Les lectures passent par PostgREST (protégé par RLS), les écritures sensibles
// par des RPC qui recalculent tout côté serveur (prix, disponibilités, droits).

export type DiniClient = SupabaseClient<Database>

export type Role = 'family' | 'teacher' | 'moderator' | 'admin'
export type Account = { userId: string; email: string; name: string; role: Role }
export type Place = { country: Country['code']; timezone: string }
export type OAuthProvider = 'google' | 'apple'
export type TeacherStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

/** Profil de l'enseignant connecté, y compris pendant la candidature (champs encore vides possibles). */
export type MyTeacher = Omit<Teacher, 'gender' | 'rates'> & {
  gender: Teacher['gender'] | null
  rates: { XOF: number | null; EUR: number | null }
  status: TeacherStatus
  reviewNote: string | null
  published: boolean
}

export type TeacherApplication = Partial<Pick<Teacher,
  'name' | 'gender' | 'city' | 'countryLabel' | 'timezone' | 'headline' | 'bio' | 'subjects' | 'arabicTracks' | 'languages' | 'riwayat' | 'madhahib' | 'levels' | 'ageGroups' | 'credentials'
>> & { rates?: { XOF: number; EUR: number } }

export type AgendaItem = Booking & { learner: Pick<Learner, 'name' | 'birthYear' | 'goals' | 'level'> }

export type Earnings = {
  hoursTaught: number
  entries: { bookingId: string | null; at: number; gross: number; currency: CurrencyCode; netEur: number; rate: number }[]
  releasedEur: number
  pending: { count: number; releaseAt: number[] }
}

export type Application = MyTeacher & { submittedAt: number | null }

const TEACHER_COLUMNS = `id, name, gender, city, country_label, timezone, headline, bio, subjects, arabic_tracks, languages, riwayat, madhahib,
  levels, age_groups, rate_xof, rate_eur, identity_verified, diploma_verified, ijaza_verified, hours_taught, rating, disputes, published,
  status, review_note, submitted_at,
  teacher_credentials (kind, title, institution, year, riwaya, sanad, position),
  availability_rules (weekday, start_min, end_min),
  reviews (author, rating, body, date_label, position)`
const PUBLIC_TEACHER_COLUMNS = TEACHER_COLUMNS.replace('status, review_note, submitted_at,', '')

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
type TeacherRow = Omit<Row<'teachers'>, 'user_id' | 'created_at'> & {
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
  not_signed_in: 'Connectez-vous pour continuer.',
  not_a_teacher: 'Ce compte n’a pas de profil enseignant.',
  application_under_review: 'Votre candidature est en cours d’examen : elle ne peut pas être modifiée pour l’instant.',
  identity_locked: 'Votre nom et votre genre ont été vérifiés. Écrivez-nous pour les modifier.',
  credentials_locked: 'Vos diplômes ont déjà été vérifiés. Écrivez-nous pour en ajouter un.',
  not_submittable: 'Cette candidature a déjà été envoyée.',
  not_started: 'La séance n’a pas encore commencé.',
  too_early: 'Attendez au moins 10 minutes après le début avant de signaler une absence.',
  not_scheduled: 'Cette séance n’est plus à venir.',
  report_required: 'Indiquez au moins ce qui a été travaillé.',
  note_required: 'Expliquez le refus : le candidat verra ce message.',
  not_under_review: 'Cette candidature n’est plus en attente.',
  trial_already_used: 'Cet élève a déjà fait sa séance d’essai avec cet enseignant.',
  room_not_open: 'La salle ouvre 10 minutes avant le début du cours.',
  room_closed: 'Ce cours est terminé : la salle est fermée.',
  video_not_configured: 'La visioconférence n’est pas encore activée sur DINE.',
  video_unavailable: 'Le service de visioconférence ne répond pas. Réessayez dans un instant.',
  'Invalid login credentials': 'E-mail ou mot de passe incorrect.',
  'Email not confirmed': 'Confirmez d’abord votre adresse avec le lien reçu par e-mail.',
  'User already registered': 'Un compte existe déjà avec cette adresse. Connectez-vous.',
}

function fail(error: { message: string; details?: string | null }): never {
  if (error.message === 'slot_taken') throw new SlotTakenError()
  // Deux essais réservés au même instant : l'index unique de la base départage.
  if (error.message.includes('bookings_one_trial')) throw new Error(MESSAGES.trial_already_used)
  if (error.message === 'incomplete_application') throw new Error(`Il manque encore : ${error.details ?? ''}.`)
  throw new Error(MESSAGES[error.message] ?? error.message)
}

/** Données d'une réponse réussie ; lève une erreur lisible sinon. */
function must<T>(res: { data: T; error: PostgrestError | null }): NonNullable<T> {
  if (res.error) fail(res.error)
  return res.data as NonNullable<T>
}

const ms = (iso: string | null) => (iso ? Date.parse(iso) : null)

function toMyTeacher(r: TeacherRow): MyTeacher {
  return {
    id: r.id, name: r.name, gender: r.gender as Teacher['gender'] | null, city: r.city, countryLabel: r.country_label, timezone: r.timezone,
    headline: r.headline, bio: r.bio,
    subjects: r.subjects as Teacher['subjects'], arabicTracks: r.arabic_tracks as Teacher['arabicTracks'], languages: r.languages as Teacher['languages'],
    riwayat: r.riwayat as Teacher['riwayat'], madhahib: r.madhahib as Teacher['madhahib'], levels: r.levels as Teacher['levels'], ageGroups: r.age_groups as Teacher['ageGroups'],
    rates: { XOF: r.rate_xof == null ? null : Number(r.rate_xof), EUR: r.rate_eur == null ? null : Number(r.rate_eur) },
    verification: { identity: r.identity_verified, diploma: r.diploma_verified, ijaza: r.ijaza_verified },
    hoursTaught: Number(r.hours_taught), rating: Number(r.rating), disputes: r.disputes,
    credentials: [...r.teacher_credentials].sort((a, b) => a.position - b.position).map((c) => ({
      kind: c.kind as 'diploma' | 'ijaza', title: c.title, institution: c.institution, year: c.year,
      ...(c.riwaya ? { riwaya: c.riwaya as Teacher['riwayat'][number] } : {}), ...(c.sanad ? { sanad: c.sanad } : {}),
    })),
    availability: r.availability_rules.map((a) => ({ weekday: a.weekday, start: a.start_min, end: a.end_min })),
    reviews: [...r.reviews].sort((a, b) => a.position - b.position).map((v) => ({ author: v.author, rating: v.rating, text: v.body, date: v.date_label })),
    status: (r.status ?? 'approved') as TeacherStatus, reviewNote: r.review_note ?? null, published: r.published,
  }
}

/** Un profil publié a forcément un genre et des tarifs (contrôlés à l'envoi de la candidature). */
const toTeacher = (r: TeacherRow): Teacher => {
  const t = toMyTeacher(r)
  return { ...t, gender: t.gender ?? 'F', rates: { XOF: t.rates.XOF ?? 0, EUR: t.rates.EUR ?? 0 } }
}

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

const INTENT_KEY = 'dini-signup-intent'

export function createSupabaseApi(client: DiniClient, storage: KeyValueStorage) {
  let catalog: { at: number; teachers: Promise<Teacher[]> } | null = null
  let family: { userId: string; id: Promise<string> } | null = null
  let place: Place = { country: 'FR', timezone: 'Europe/Paris' }

  async function userId(): Promise<string> {
    const { data } = await client.auth.getSession()
    if (!data.session) throw new Error(MESSAGES.not_signed_in)
    return data.session.user.id
  }

  /** Famille du compte connecté, créée à la première demande avec le pays choisi par le visiteur. */
  async function familyId(): Promise<string> {
    const uid = await userId()
    if (!family || family.userId !== uid) {
      const id = (async () => must(await client.rpc('ensure_my_family', { p_country: place.country, p_timezone: place.timezone })))()
      family = { userId: uid, id }
      id.catch(() => { family = null })
    }
    return family!.id
  }

  function teachers(): Promise<Teacher[]> {
    if (!catalog || Date.now() - catalog.at > 60_000) {
      const list = (async () => {
        const rows = must(await client.from('teachers').select(PUBLIC_TEACHER_COLUMNS).eq('published', true).order('name')) as unknown as TeacherRow[]
        return rows.map(toTeacher)
      })()
      catalog = { at: Date.now(), teachers: list }
      list.catch(() => { catalog = null })
    }
    return catalog.teachers
  }

  async function withPrices(p: Place): Promise<TeacherCard[]> {
    const [list, prices] = await Promise.all([teachers(), client.rpc('price_list_for_country', { p_country: p.country }).then(must)])
    const byTeacher = new Map(prices.map((x) => [x.teacher_id, { amount: Number(x.amount), currency: x.currency as CurrencyCode }]))
    return list.filter((t) => byTeacher.has(t.id)).map((t) => ({ ...t, price: byTeacher.get(t.id)! }))
  }

  async function bookingRow(id: string) {
    const res = await client.from('bookings').select('*, session_reports (*)').eq('id', id).maybeSingle()
    if (res.error) fail(res.error)
    return res.data ? toBooking(res.data as unknown as BookingRow) : null
  }

  async function myTeacherRow(): Promise<TeacherRow | null> {
    await userId()
    const { data: id, error } = await client.rpc('my_teacher_id')
    if (error) fail(error)
    if (!id) return null
    return must(await client.from('teachers').select(TEACHER_COLUMNS).eq('id', id).single()) as unknown as TeacherRow
  }

  return {
    now: () => Date.now(),

    // Connexion ---------------------------------------------------------------

    /** Compte connecté, ou null. Termine une inscription enseignant commencée avant confirmation ou via Google. */
    async getAccount(): Promise<Account | null> {
      const { data } = await client.auth.getSession()
      const user = data.session?.user
      if (!user) return null
      const intent = user.user_metadata?.intent ?? await storage.getItem(INTENT_KEY)
      const found = must(await client.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle())
      if (!found) {
        // Session restée dans le navigateur pour un compte supprimé depuis : on la ferme.
        await client.auth.signOut({ scope: 'local' })
        return null
      }
      let profile = found
      if (intent === 'teacher' && profile.role === 'family') {
        must(await client.rpc('start_teacher_application'))
        profile = must(await client.from('profiles').select('full_name, role').eq('id', user.id).single())
      }
      if (intent) await storage.setItem(INTENT_KEY, '')
      return { userId: user.id, email: user.email ?? '', name: profile.full_name, role: profile.role as Role }
    },

    onAuthChange(listener: () => void): () => void {
      const { data } = client.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          family = null
          listener()
        }
      })
      return () => data.subscription.unsubscribe()
    },

    async signIn(email: string, password: string) {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
      if (error) fail(error)
    },

    /** Renvoie `needsConfirmation` quand Supabase attend la confirmation de l'adresse e-mail. */
    async signUp(input: { name?: string; email: string; password: string; asTeacher: boolean; redirectTo?: string }) {
      const { data, error } = await client.auth.signUp({
        email: input.email.trim(), password: input.password,
        options: { data: { full_name: input.name?.trim() ?? '', intent: input.asTeacher ? 'teacher' : 'family' }, ...(input.redirectTo ? { emailRedirectTo: input.redirectTo } : {}) },
      })
      if (error) fail(error)
      return { needsConfirmation: !data.session }
    },

    /**
     * Adresse de connexion Google ou Apple. Le web y redirige la page ;
     * le mobile l'ouvre dans un navigateur intégré puis appelle completeOAuth avec l'adresse de retour.
     */
    async oauthUrl(provider: OAuthProvider, redirectTo: string, asTeacher = false): Promise<string> {
      await storage.setItem(INTENT_KEY, asTeacher ? 'teacher' : '')
      const { data, error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } })
      if (error) fail(error)
      return data.url!
    },

    /** Connexion Apple native (iPhone) : jeton fourni par le système. Apple ne donne le nom qu'à la première connexion. */
    async signInWithApple(identityToken: string, nonce: string, fullName: string | null, asTeacher = false) {
      await storage.setItem(INTENT_KEY, asTeacher ? 'teacher' : '')
      const { data, error } = await client.auth.signInWithIdToken({ provider: 'apple', token: identityToken, nonce })
      if (error) fail(error)
      if (fullName?.trim() && data.user) {
        await client.from('profiles').update({ full_name: fullName.trim().slice(0, 120) }).eq('id', data.user.id).eq('full_name', '')
      }
    },

    async completeOAuth(callbackUrl: string) {
      const code = new URL(callbackUrl).searchParams.get('code')
      if (!code) throw new Error('La connexion a été annulée.')
      const { error } = await client.auth.exchangeCodeForSession(code)
      if (error) fail(error)
    },

    async sendPasswordReset(email: string, redirectTo: string) {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) fail(error)
    },

    async updatePassword(password: string) {
      const { error } = await client.auth.updateUser({ password })
      if (error) fail(error)
    },

    async signOut() {
      family = null
      const { error } = await client.auth.signOut()
      if (error) fail(error)
    },

    // Catalogue -------------------------------------------------------------------

    /** Pays et fuseau utilisés pour les prix et pour créer la famille à la première connexion. */
    setPlace(p: Place) { place = p },

    async listTeachers(p: Place, f: TeacherFilters = {}) {
      return filterTeachers(await withPrices(p), f, p.timezone, Date.now())
    },

    async getTeacher(p: Place, id: string) {
      return (await withPrices(p)).find((t) => t.id === id) ?? null
    },

    /** Départs libres pour un cours (50 min par défaut) ou un essai (`minutes` = 30). */
    async getSlots(teacherId: string, weekOffset = 0, days = 7, minutes?: number) {
      const from = new Date(Date.now() + weekOffset * 7 * DAY).toISOString()
      const slots = must(await client.rpc('free_slots', { p_teacher: teacherId, p_from: from, p_days: days, ...(minutes ? { p_minutes: minutes } : {}) }))
      return slots.map((s) => Date.parse(s))
    },

    // Famille ----------------------------------------------------------------------

    async getFamily() {
      const id = await familyId()
      const [fam, learners] = await Promise.all([
        client.from('families').select('*').eq('id', id).single().then(must),
        client.from('learners').select('*').eq('family_id', id).order('created_at').then(must),
      ])
      const f = toFamily(fam)
      return { family: f, country: country(f.country), learners: learners.map(toLearner) }
    },

    async setResidence(code: Country['code'], timezone: string) {
      const id = await familyId()
      must(await client.from('families').update({ country: code, timezone }).eq('id', id).select('id').single())
    },

    async addLearner(name: string, birthYear: number) {
      const id = await familyId()
      return toLearner(must(await client.from('learners').insert({ family_id: id, name: name.trim(), birth_year: birthYear }).select('*').single()))
    },

    async quote(teacherId: string, learnerId: string) {
      const id = await familyId()
      const q = must(await client.rpc('quote', { p_family: id, p_teacher: teacherId, p_learner: learnerId })) as {
        currency: CurrencyCode; session: number; trial: number; trialAvailable: boolean; minutes: { course: number; trial: number }
        credit: { remaining: number; of: number } | null; payments: PaymentMethod[]; plans: { id: string; sessions: number; total: number }[]
      }
      return {
        currency: q.currency,
        session: Number(q.session),
        trial: Number(q.trial),
        trialAvailable: q.trialAvailable,
        minutes: q.minutes,
        plans: PLANS.map((p) => ({ id: p.id, sessions: p.sessions, label: p.label, usage: p.usage, total: Number(q.plans.find((x) => x.id === p.id)?.total ?? 0) })),
        credit: q.credit,
        payments: q.payments,
      }
    },

    async createBooking(draft: BookingDraft) {
      const id = await familyId()
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
      const booking = await bookingRow(id)
      if (!booking) return null
      const [list, learner] = await Promise.all([teachers(), client.from('learners').select('*').eq('id', booking.learnerId).single().then(must)])
      return { booking, teacher: list.find((t) => t.id === booking.teacherId)!, learner: toLearner(learner) }
    },

    async getDashboard() {
      const id = await familyId()
      const learners = must(await client.from('learners').select('*').eq('family_id', id).order('created_at')).map(toLearner)
      const ids = learners.map((l) => l.id)
      const [bookings, subs] = await Promise.all([
        client.from('bookings').select('*, session_reports (*)').in('learner_id', ids).order('starts_at').then(must),
        client.from('subscriptions').select('*').in('learner_id', ids).order('renews_at').then(must),
      ])
      return buildDashboard(learners, (bookings as unknown as BookingRow[]).map(toBooking), subs.map(toSubscription), Date.now())
    },

    // Espace enseignant ---------------------------------------------------------------

    async getMyTeacher(): Promise<MyTeacher | null> {
      const row = await myTeacherRow()
      return row && toMyTeacher(row)
    },

    async startApplication() {
      return must(await client.rpc('start_teacher_application')) as string
    },

    async saveApplication(input: TeacherApplication) {
      must(await client.rpc('save_teacher_application', { p: input as never }))
    },

    async submitApplication() {
      must(await client.rpc('submit_teacher_application'))
    },

    async setAvailability(rules: Teacher['availability']) {
      must(await client.rpc('set_my_availability', { p_rules: rules as never }))
    },

    /** Séances de l'enseignant connecté, avec le prénom et l'objectif de l'élève. */
    async getAgenda(): Promise<AgendaItem[]> {
      const row = await myTeacherRow()
      if (!row) return []
      const rows = must(await client.from('bookings').select('*, session_reports (*), learners (name, birth_year, goals, level)')
        .eq('teacher_id', row.id).not('status', 'in', '(cancelled,refunded)').order('starts_at')) as unknown as
        (BookingRow & { learners: Pick<Row<'learners'>, 'name' | 'birth_year' | 'goals' | 'level'> })[]
      return rows.map((r) => ({
        ...toBooking(r),
        learner: { name: r.learners.name, birthYear: r.learners.birth_year, goals: r.learners.goals, level: r.learners.level as Learner['level'] },
      }))
    },

    /** Adresse personnelle de la salle vidéo de la séance (enseignant ou famille), ouverte 10 min avant le début. */
    async joinSession(bookingId: string): Promise<{ url: string; role: 'teacher' | 'family' }> {
      const { data, error } = await client.functions.invoke('join-session', { body: { bookingId } })
      if (error) {
        const ctx = (error as { context?: Response }).context
        const body = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => null) : null
        fail({ message: body?.error ?? error.message })
      }
      return data as { url: string; role: 'teacher' | 'family' }
    },

    async deliverSession(bookingId: string, report: Report) {
      must(await client.rpc('deliver_session', { p_booking: bookingId, p_report: report as never }))
    },

    async markMissed(bookingId: string) {
      must(await client.rpc('mark_session_missed', { p_booking: bookingId }))
    },

    async getEarnings(): Promise<Earnings | null> {
      const row = await myTeacherRow()
      if (!row) return null
      const [ledger, delivered, settings] = await Promise.all([
        client.from('ledger_entries').select('*').eq('teacher_id', row.id).order('created_at', { ascending: false }).then(must),
        client.from('bookings').select('delivered_at').eq('teacher_id', row.id).eq('status', 'delivered').then(must),
        client.from('pricing_settings').select('escrow_hours').single().then(must),
      ])
      return {
        hoursTaught: Number(row.hours_taught),
        entries: ledger.map((e) => ({ bookingId: e.booking_id, at: Date.parse(e.created_at), gross: Number(e.gross), currency: e.currency as CurrencyCode, netEur: Number(e.net_eur), rate: Number(e.commission_rate) })),
        releasedEur: ledger.reduce((s, e) => s + Number(e.net_eur), 0),
        pending: { count: delivered.length, releaseAt: delivered.map((d) => ms(d.delivered_at)! + settings.escrow_hours * 3_600_000) },
      }
    },

    // Modération ----------------------------------------------------------------------

    async listApplications(): Promise<Application[]> {
      const rows = must(await client.from('teachers').select(TEACHER_COLUMNS).eq('status', 'submitted').order('submitted_at')) as unknown as TeacherRow[]
      return rows.map((r) => ({ ...toMyTeacher(r), submittedAt: ms(r.submitted_at ?? null) }))
    },

    async reviewApplication(input: { teacherId: string; approve: boolean; note?: string; identity?: boolean; diploma?: boolean; ijaza?: boolean }) {
      must(await client.rpc('review_teacher_application', {
        p_teacher: input.teacherId, p_approve: input.approve, p_note: input.note ?? '',
        p_identity: !!input.identity, p_diploma: !!input.diploma, p_ijaza: !!input.ijaza,
      }))
      catalog = null
    },
  }
}

export type DiniApi = ReturnType<typeof createSupabaseApi>
