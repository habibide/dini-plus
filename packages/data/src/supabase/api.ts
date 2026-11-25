import {
  DAY, PLANS, country,
  type Booking, type Country, type CurrencyCode, type Family, type Learner, type Locale, type PaymentMethod, type PlanId, type Report, type SubjectId, type Subscription, type Teacher,
} from '@dini/core'
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { KeyValueStorage } from '../api'
import { buildDashboard, filterTeachers, SlotTakenError, type BookingDraft, type TeacherCard, type TeacherFilters } from '../logic'
import type { Database } from './database.types'
import { dataLocale } from '../locale'

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
>> & { rates?: { XOF: number; EUR?: number } }

export type AgendaItem = Booking & { learner: Pick<Learner, 'name' | 'birthYear' | 'goals' | 'level'> }

export type Earnings = {
  hoursTaught: number
  entries: { bookingId: string | null; at: number; gross: number; currency: CurrencyCode; netEur: number; rate: number }[]
  releasedEur: number
  pending: { count: number; releaseAt: number[] }
}

export type Application = MyTeacher & { submittedAt: number | null }

/** Diplôme ajouté par un enseignant déjà approuvé, en attente de vérification. */
export type PendingCredential = Teacher['credentials'][number] & { id: number; teacherId: string; teacherName: string }

const TEACHER_COLUMNS = `id, name, gender, city, country_label, timezone, headline, bio, subjects, arabic_tracks, languages, riwayat, madhahib,
  levels, age_groups, rate_xof, rate_eur, identity_verified, diploma_verified, ijaza_verified, hours_taught, rating, disputes, published,
  photo_path, video_path, status, review_note, submitted_at,
  teacher_credentials (kind, title, institution, year, riwaya, sanad, position, verified),
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

const MESSAGES_FR: Record<string, string> = {
  no_credit: 'Aucune séance restante sur ce forfait.',
  dispute_window_closed: 'Le délai de 48 h pour signaler cette séance est passé.',
  not_cancellable: 'Cette séance ne peut plus être annulée.',
  invalid_payment_method: 'Ce moyen de paiement n’est pas proposé dans votre pays.',
  forbidden: 'Vous n’avez pas accès à cette information.',
  not_signed_in: 'Connectez-vous pour continuer.',
  not_a_teacher: 'Ce compte n’a pas de profil professeur.',
  application_under_review: 'Votre candidature est en cours d’examen : elle ne peut pas être modifiée pour l’instant.',
  identity_locked: 'Votre nom et votre genre ont été vérifiés. Écrivez-nous pour les modifier.',
  credentials_locked: 'Vos diplômes ont déjà été vérifiés. Écrivez-nous pour en ajouter un.',
  invalid_rate: 'Indiquez un tarif valide.',
  not_submittable: 'Cette candidature a déjà été envoyée.',
  not_started: 'La séance n’a pas encore commencé.',
  too_early: 'Attendez au moins 10 minutes après le début avant de signaler une absence.',
  not_scheduled: 'Cette séance n’est plus à venir.',
  report_required: 'Indiquez au moins ce qui a été travaillé.',
  note_required: 'Expliquez le refus : le candidat verra ce message.',
  not_under_review: 'Cette candidature n’est plus en attente.',
  credential_not_pending: 'Ce diplôme a déjà été traité.',
  trial_already_used: 'Cet élève a déjà fait sa séance d’essai avec ce professeur.',
  room_not_open: 'La salle ouvre 10 minutes avant le début du cours.',
  room_closed: 'Ce cours est terminé : la salle est fermée.',
  video_not_configured: 'La visioconférence n’est pas encore activée sur DINE.',
  video_unavailable: 'Le service de visioconférence ne répond pas. Réessayez dans un instant.',
  oauth_cancelled: 'La connexion a été annulée.',
  booking_failed: 'La réservation n’a pas abouti. Réessayez.',
  group_not_found: 'Ce lien d’invitation ne correspond à aucun groupe.',
  group_closed: 'Ce groupe n’accepte plus de nouveaux membres.',
  group_full: 'Ce groupe est complet (10 élèves).',
  invalid_slots: 'Choisissez un créneau différent pour chaque séance de la semaine, dans les disponibilités du professeur.',
  not_member: 'Vous ne faites pas partie de ce groupe.',
  group_session: 'Une séance de groupe ne s’annule pas seule : écrivez-nous si besoin.',
  payment_not_available: 'Le paiement en ligne n’est pas encore ouvert dans votre pays : la réservation de cours payants arrive bientôt.',
  payment_not_configured: 'Le paiement en ligne n’est pas encore activé sur DINE.',
  payment_unavailable: 'Le service de paiement ne répond pas. Réessayez dans un instant.',
  payment_expired: 'Le délai de paiement est dépassé : le créneau a été libéré. Choisissez-en un autre.',
  not_payable: 'Ce paiement n’est plus en attente.',
  incomplete_application: 'Il manque encore : {fields}.',
  name_required: 'Indiquez votre nom (2 caractères au moins).',
  invalid_media: 'Format non accepté : photo JPG, PNG ou WebP, vidéo MP4, MOV ou WebM.',
  photo_too_big: 'La photo dépasse 5 Mo.',
  document_too_big: 'Le document dépasse 10 Mo.',
  invalid_document: 'Format non accepté : PDF, JPG, PNG ou WebP.',
  too_many_documents: 'Vous avez déjà 10 justificatifs : retirez-en un pour en ajouter un autre.',
  video_too_big: 'La vidéo dépasse 50 Mo.',
  upload_failed: 'L’envoi du fichier a échoué. Réessayez.',
  'Invalid login credentials': 'E-mail ou mot de passe incorrect.',
  'Email not confirmed': 'Confirmez d’abord votre adresse avec le lien reçu par e-mail.',
  'User already registered': 'Un compte existe déjà avec cette adresse. Connectez-vous.',
}

const MESSAGES_EN: Record<string, string> = {
  no_credit: 'No sessions left on this plan.',
  dispute_window_closed: 'The 48-hour window to report this session has passed.',
  not_cancellable: 'This session can no longer be cancelled.',
  invalid_payment_method: 'This payment method is not available in your country.',
  forbidden: 'You do not have access to this information.',
  not_signed_in: 'Sign in to continue.',
  not_a_teacher: 'This account has no teacher profile.',
  application_under_review: 'Your application is being reviewed: it cannot be changed for now.',
  identity_locked: 'Your name and gender have been verified. Contact us to change them.',
  credentials_locked: 'Your qualifications have already been verified. Contact us to add one.',
  invalid_rate: 'Enter a valid rate.',
  not_submittable: 'This application has already been sent.',
  not_started: 'The session has not started yet.',
  too_early: 'Wait at least 10 minutes after the start before reporting an absence.',
  not_scheduled: 'This session is no longer upcoming.',
  report_required: 'At least say what was covered.',
  note_required: 'Explain the rejection: the applicant will see this message.',
  not_under_review: 'This application is no longer pending.',
  credential_not_pending: 'This qualification has already been handled.',
  trial_already_used: 'This student has already had a trial session with this teacher.',
  room_not_open: 'The room opens 10 minutes before the lesson starts.',
  room_closed: 'This lesson is over: the room is closed.',
  video_not_configured: 'Video calls are not enabled on DINE yet.',
  video_unavailable: 'The video service is not responding. Try again in a moment.',
  oauth_cancelled: 'Sign-in was cancelled.',
  booking_failed: 'The booking did not go through. Try again.',
  group_not_found: 'This invitation link does not match any group.',
  group_closed: 'This group no longer accepts new members.',
  group_full: 'This group is full (10 students).',
  invalid_slots: 'Pick a different slot for each weekly session, within the teacher’s availability.',
  not_member: 'You are not part of this group.',
  group_session: 'A group session cannot be cancelled on its own: contact us if needed.',
  payment_not_available: 'Online payment is not open in your country yet: booking paid lessons is coming soon.',
  payment_not_configured: 'Online payment is not enabled on DINE yet.',
  payment_unavailable: 'The payment service is not responding. Try again in a moment.',
  payment_expired: 'The payment window has passed and the slot was released. Pick another one.',
  not_payable: 'This payment is no longer pending.',
  incomplete_application: 'Still missing: {fields}.',
  name_required: 'Enter your name (at least 2 characters).',
  invalid_media: 'Unsupported format: JPG, PNG or WebP photo, MP4, MOV or WebM video.',
  photo_too_big: 'The photo is larger than 5 MB.',
  document_too_big: 'The document is larger than 10 MB.',
  invalid_document: 'Format not accepted: PDF, JPG, PNG or WebP.',
  too_many_documents: 'You already have 10 documents: remove one to add another.',
  video_too_big: 'The video is larger than 50 MB.',
  upload_failed: 'The upload failed. Try again.',
  'Invalid login credentials': 'Incorrect email or password.',
  'Email not confirmed': 'First confirm your address with the link we emailed you.',
  'User already registered': 'An account already exists with this address. Sign in.',
}

const MESSAGES_AR: Record<string, string> = {
  no_credit: 'لم يبق أي حصة في هذه الباقة.',
  dispute_window_closed: 'انقضت مهلة 48 ساعة للإبلاغ عن هذه الحصة.',
  not_cancellable: 'لم يعد بالإمكان إلغاء هذه الحصة.',
  invalid_payment_method: 'وسيلة الدفع هذه غير متاحة في بلدك.',
  forbidden: 'ليس لديك صلاحية الاطلاع على هذه المعلومة.',
  not_signed_in: 'سجّل الدخول للمتابعة.',
  not_a_teacher: 'هذا الحساب ليس له ملف معلّم.',
  application_under_review: 'طلبك قيد المراجعة: لا يمكن تعديله حاليًا.',
  identity_locked: 'تم التحقق من اسمك وجنسك. راسلنا لتعديلهما.',
  credentials_locked: 'تم التحقق من شهاداتك. راسلنا لإضافة شهادة.',
  invalid_rate: 'أدخل سعرًا صحيحًا.',
  not_submittable: 'تم إرسال هذا الطلب من قبل.',
  not_started: 'لم تبدأ الحصة بعد.',
  too_early: 'انتظر 10 دقائق على الأقل بعد البداية قبل الإبلاغ عن غياب.',
  not_scheduled: 'هذه الحصة لم تعد قادمة.',
  report_required: 'اذكر على الأقل ما تمت دراسته.',
  note_required: 'اشرح سبب الرفض: سيرى المترشح هذه الرسالة.',
  not_under_review: 'هذا الطلب لم يعد قيد الانتظار.',
  credential_not_pending: 'تمت معالجة هذه الشهادة من قبل.',
  trial_already_used: 'استفاد هذا الطالب من حصته التجريبية مع هذا المعلّم من قبل.',
  room_not_open: 'تُفتح القاعة قبل بداية الدرس بعشر دقائق.',
  room_closed: 'انتهى هذا الدرس: القاعة مغلقة.',
  video_not_configured: 'المكالمات المرئية غير مفعّلة بعد على DINE.',
  video_unavailable: 'خدمة الفيديو لا تستجيب. أعد المحاولة بعد قليل.',
  oauth_cancelled: 'تم إلغاء تسجيل الدخول.',
  booking_failed: 'لم يكتمل الحجز. أعد المحاولة.',
  group_not_found: 'رابط الدعوة هذا لا يطابق أي مجموعة.',
  group_closed: 'هذه المجموعة لم تعد تقبل أعضاء جددًا.',
  group_full: 'هذه المجموعة مكتملة (10 طلاب).',
  invalid_slots: 'اختر موعدًا مختلفًا لكل حصة أسبوعية، ضمن أوقات توفر المعلم.',
  not_member: 'أنت لست عضوًا في هذه المجموعة.',
  group_session: 'لا يمكن إلغاء حصة جماعية بمفردها: راسلنا عند الحاجة.',
  payment_not_available: 'الدفع الإلكتروني غير متاح بعد في بلدك: حجز الدروس المدفوعة قريبًا.',
  payment_not_configured: 'الدفع الإلكتروني غير مفعّل بعد على DINE.',
  payment_unavailable: 'خدمة الدفع لا تستجيب. أعد المحاولة بعد لحظات.',
  payment_expired: 'انتهت مهلة الدفع وتم تحرير الموعد. اختر موعدًا آخر.',
  not_payable: 'هذا الدفع لم يعد معلّقًا.',
  incomplete_application: 'ما زال ينقص: {fields}.',
  name_required: 'أدخل اسمك (حرفان على الأقل).',
  invalid_media: 'صيغة غير مقبولة: صورة JPG أو PNG أو WebP، فيديو MP4 أو MOV أو WebM.',
  photo_too_big: 'حجم الصورة يتجاوز 5 ميغابايت.',
  document_too_big: 'حجم المستند يتجاوز 10 ميغابايت.',
  invalid_document: 'صيغة غير مقبولة: PDF أو JPG أو PNG أو WebP.',
  too_many_documents: 'لديك 10 مستندات بالفعل: احذف واحدًا لإضافة آخر.',
  video_too_big: 'حجم الفيديو يتجاوز 50 ميغابايت.',
  upload_failed: 'فشل رفع الملف. أعد المحاولة.',
  'Invalid login credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'Email not confirmed': 'أكّد عنوانك أولًا عبر الرابط المرسل إلى بريدك.',
  'User already registered': 'يوجد حساب بهذا العنوان. سجّل الدخول.',
}

/** Champs manquants d'une candidature, renvoyés par le serveur sous forme de codes. */
const MISSING_FIELDS: Record<string, Record<Locale, string>> = {
  name: { fr: 'nom (3 caractères au moins)', en: 'name (at least 3 characters)', ar: 'الاسم (3 أحرف على الأقل)' },
  gender: { fr: 'genre', en: 'gender', ar: 'الجنس' },
  city: { fr: 'ville', en: 'city', ar: 'المدينة' },
  headline: { fr: 'titre (3 caractères au moins)', en: 'headline (at least 3 characters)', ar: 'العنوان (3 أحرف على الأقل)' },
  bio: { fr: 'présentation (80 caractères au moins)', en: 'introduction (at least 80 characters)', ar: 'التقديم (80 حرفًا على الأقل)' },
  subjects: { fr: 'matières', en: 'subjects', ar: 'المواد' },
  languages: { fr: 'langues', en: 'languages', ar: 'اللغات' },
  rate: { fr: 'tarif', en: 'rate', ar: 'السعر' },
  availability: { fr: 'disponibilités', en: 'availability', ar: 'أوقات التوفر' },
}

const MESSAGES: Record<Locale, Record<string, string>> = { fr: MESSAGES_FR, en: MESSAGES_EN, ar: MESSAGES_AR }
const msg = (key: string) => MESSAGES[dataLocale()][key]

function fail(error: { message: string; details?: string | null }): never {
  if (error.message === 'slot_taken') throw new SlotTakenError()
  // Deux essais réservés au même instant : l'index unique de la base départage.
  if (error.message.includes('bookings_one_trial')) throw new Error(msg('trial_already_used'))
  if (error.message === 'incomplete_application') {
    const fields = (error.details ?? '').split(',').filter(Boolean).map((f) => MISSING_FIELDS[f]?.[dataLocale()] ?? f).join(', ')
    throw new Error(msg('incomplete_application').replace('{fields}', fields))
  }
  throw new Error(msg(error.message) ?? error.message)
}

/** Données d'une réponse réussie ; lève une erreur lisible sinon. */
function must<T>(res: { data: T; error: PostgrestError | null }): NonNullable<T> {
  if (res.error) fail(res.error)
  return res.data as NonNullable<T>
}

export type GroupSlot = { weekday: number; start: number }
export type GroupStatus = 'forming' | 'payment' | 'active' | 'cancelled' | 'ended'
export type GroupMember = { id: string; name: string; status: 'joined' | 'paid'; mine: boolean; paying: boolean }
export type GroupDetail = {
  id: string; teacherId: string; teacherName: string; teacherTimezone: string; subject: SubjectId; planId: PlanId; slots: GroupSlot[]
  status: GroupStatus; paymentDeadline: number | null; startsOn: number | null; endsOn: number | null; inviteCode: string | null
  isOrganizer: boolean; isTeacher: boolean; share: { amount: number; currency: CurrencyCode } | null; min: number; max: number
  /** Période de paiement du mois suivant (le groupe a déjà des séances). */
  renewal: boolean; cycle: number
  members: GroupMember[]; sessions: { id: string; startsAt: number; minutes: number; status: string }[]
}
export type GroupInvite = {
  id: string; teacherId: string; teacherName: string; teacherTimezone: string; subject: SubjectId; planId: PlanId; slots: GroupSlot[]
  status: GroupStatus; paymentDeadline: number | null; members: number; min: number; max: number; isMember: boolean
  /** Élèves de la famille déjà inscrits : la famille peut encore en inscrire d'autres. */
  myLearners: string[]
  share: { amount: number; currency: CurrencyCode } | null
}
export type GroupSummary = {
  id: string; teacherName: string; subject: SubjectId; planId: PlanId; status: GroupStatus; members: number
  paymentDeadline: number | null; nextSession: number | null; asTeacher: boolean
}
export type GroupSession = { id: string; groupId: string; subject: SubjectId; startsAt: number; minutes: number; status: string; learners: string[] }

export type TeacherDocument = { id: number; fileName: string; contentType: string; size: number; createdAt: number; path: string }

export type PaymentState = { status: 'pending' | 'paid' | 'failed' | 'refund_due'; bookingId: string | null }

const ms = (iso: string | null) => (iso ? Date.parse(iso) : null)
const toShare = (x: unknown) => {
  const v = x as { amount: number | string; currency: CurrencyCode } | null
  return v ? { amount: Number(v.amount), currency: v.currency } : null
}

/** Espace public des photos et vidéos des professeurs, et adresse publique d'un fichier. */
const MEDIA_BUCKET = 'teacher-media'
const DOCUMENTS_BUCKET = 'teacher-documents'
let mediaUrl = (path: string) => path

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
      kind: c.kind as 'diploma' | 'ijaza', title: c.title, institution: c.institution, year: c.year, verified: c.verified,
      ...(c.riwaya ? { riwaya: c.riwaya as Teacher['riwayat'][number] } : {}), ...(c.sanad ? { sanad: c.sanad } : {}),
    })),
    availability: r.availability_rules.map((a) => ({ weekday: a.weekday, start: a.start_min, end: a.end_min })),
    reviews: [...r.reviews].sort((a, b) => a.position - b.position).map((v) => ({ author: v.author, rating: v.rating, text: v.body, date: v.date_label })),
    status: (r.status ?? 'approved') as TeacherStatus, reviewNote: r.review_note ?? null, published: r.published,
    ...(r.photo_path ? { photoUrl: mediaUrl(r.photo_path) } : {}), ...(r.video_path ? { videoUrl: mediaUrl(r.video_path) } : {}),
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

export function createSupabaseApi(client: DiniClient, storage: KeyValueStorage, project: { url: string; key: string }) {
  mediaUrl = (path) => client.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
  let providers: Promise<OAuthProvider[]> | null = null
  let catalog: { at: number; teachers: Promise<Teacher[]> } | null = null
  let family: { userId: string; id: Promise<string> } | null = null
  let place: Place = { country: 'FR', timezone: 'Europe/Paris' }

  async function userId(): Promise<string> {
    const { data } = await client.auth.getSession()
    if (!data.session) throw new Error(msg('not_signed_in'))
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
    /** Fournisseurs Google et Apple réellement activés dans Supabase : un bouton inactif n'est jamais affiché. */
    authProviders(): Promise<OAuthProvider[]> {
      providers ??= fetch(`${project.url}/auth/v1/settings`, { headers: { apikey: project.key } })
        .then((r) => (r.ok ? r.json() : { external: {} }))
        .then((s: { external?: Record<string, boolean> }) => (['google', 'apple'] as const).filter((p) => s.external?.[p]))
        .catch(() => { providers = null; return [] })
      return providers
    },

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
      if (!code) throw new Error(msg('oauth_cancelled'))
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

    /** Nom affiché du compte connecté (Apple ne le transmet pas toujours, notamment sur le web). */
    async updateName(name: string) {
      const clean = name.trim().replace(/\s+/g, ' ').slice(0, 120)
      if (clean.length < 2) throw new Error(msg('name_required'))
      const { data: { user } } = await client.auth.getUser()
      if (!user) throw new Error(msg('not_signed_in'))
      must(await client.from('profiles').update({ full_name: clean }).eq('id', user.id).select('id').single())
    },

    async signOut() {
      family = null
      const { error } = await client.auth.signOut()
      // Session déjà fermée côté serveur : on efface quand même le jeton local, sinon on resterait « connecté ».
      if (error) {
        await client.auth.signOut({ scope: 'local' }).catch(() => {})
        if (!/session/i.test(error.message)) fail(error)
      }
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
        provider?: 'simulated' | 'bictorys'
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
        /** bictorys : paiement réel sur la page Bictorys ; simulated : aucun encaissement. */
        provider: q.provider ?? 'simulated',
      }
    },

    async createBooking(draft: BookingDraft) {
      const id = await familyId()
      const res = must(await client.rpc('book_session', {
        p_family: id, p_learner: draft.learnerId, p_teacher: draft.teacherId, p_subject: draft.subject,
        p_starts_at: new Date(draft.startsAt).toISOString(), p_choice: draft.choice, ...(draft.method ? { p_method: draft.method } : {}),
      })) as { booking_id: string; charged: number; currency: CurrencyCode; payment_id: string | null; needs_payment: boolean }
      const booking = await bookingRow(res.booking_id)
      if (!booking) throw new Error(msg('booking_failed'))
      return {
        booking, charged: { amount: Number(res.charged), currency: res.currency },
        /** Paiement Bictorys à régler avant que la séance soit confirmée (créneau bloqué 30 minutes). */
        payment: res.needs_payment && res.payment_id ? { id: res.payment_id } : null,
      }
    },

    /** Adresse de la page de paiement Bictorys ; `returnUrl` : page de retour (https, sur le site DINE). */
    async startPayment(paymentId: string, returnUrl?: string): Promise<{ url: string }> {
      const { data, error } = await client.functions.invoke('create-payment', { body: { paymentId, returnUrl, locale: dataLocale() } })
      if (error) {
        const ctx = (error as { context?: Response }).context
        const body = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => null) : null
        // Session fermée côté serveur (déconnexion ailleurs) : on oublie le jeton local pour renvoyer vers la connexion.
        if (body?.error === 'not_signed_in') await client.auth.signOut({ scope: 'local' }).catch(() => {})
        fail({ message: body?.error ?? error.message })
      }
      return data as { url: string }
    },

    /** Où en est un paiement : en attente, confirmé (séance réservée), échoué, ou payé mais créneau perdu. */
    async paymentStatus(paymentId: string): Promise<PaymentState> {
      const pay = must(await client.from('payments').select('status, booking_id').eq('id', paymentId).maybeSingle())
      if (!pay.booking_id) return { status: pay.status === 'succeeded' ? 'paid' : pay.status === 'pending' ? 'pending' : 'failed', bookingId: null }
      const b = must(await client.from('bookings').select('status').eq('id', pay.booking_id).maybeSingle())
      const status: PaymentState['status'] =
        pay.status === 'pending' ? 'pending'
        : pay.status === 'succeeded' && b.status !== 'cancelled' && b.status !== 'pending_payment' ? 'paid'
        : pay.status === 'refund_due' ? 'refund_due'
        : 'failed'
      return { status, bookingId: pay.booking_id }
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
        client.from('subscriptions').select('*').in('learner_id', ids).eq('active', true).order('renews_at').then(must),
      ])
      return buildDashboard(learners, (bookings as unknown as BookingRow[]).map(toBooking), subs.map(toSubscription), Date.now())
    },

    // Espace enseignant ---------------------------------------------------------------

    async getMyTeacher(): Promise<MyTeacher | null> {
      const row = await myTeacherRow()
      return row && toMyTeacher(row)
    },

    /**
     * Ajoute (ou remplace) la photo ou la vidéo du professeur connecté : envoi du fichier dans son dossier,
     * enregistrement sur le profil, puis suppression de l'ancien fichier.
     */
    async uploadTeacherMedia(kind: 'photo' | 'video', file: Blob, contentType: string) {
      const id = must(await client.rpc('my_teacher_id')) as string | null
      if (!id) throw new Error(msg('not_a_teacher'))
      const limit = kind === 'photo' ? 5 * 1024 * 1024 : 50 * 1024 * 1024
      if (file.size > limit) throw new Error(msg(kind === 'photo' ? 'photo_too_big' : 'video_too_big'))
      if (!contentType.startsWith(kind === 'photo' ? 'image/' : 'video/')) throw new Error(msg('invalid_media'))
      const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' } as Record<string, string>)[contentType]
      if (!ext) throw new Error(msg('invalid_media'))
      const previous = (must(await client.from('teachers').select('photo_path, video_path').eq('id', id).single()) as { photo_path: string | null; video_path: string | null })[kind === 'photo' ? 'photo_path' : 'video_path']
      const path = `${id}/${kind}-${Date.now()}.${ext}`
      const up = await client.storage.from(MEDIA_BUCKET).upload(path, file, { contentType, upsert: false, cacheControl: '31536000' })
      if (up.error) throw new Error(msg('upload_failed'))
      const saved = await client.rpc('set_teacher_media', { p_kind: kind, p_path: path })
      // Refusé par le serveur (type, taille) : on ne laisse pas le fichier traîner dans le stockage.
      if (saved.error) { await client.storage.from(MEDIA_BUCKET).remove([path]); fail(saved.error) }
      if (previous) await client.storage.from(MEDIA_BUCKET).remove([previous])
      return mediaUrl(path)
    },

    /** Retire la photo ou la vidéo du professeur connecté. */
    // Abonnements de groupe ----------------------------------------------------------

    async createGroup(a: { learnerId: string; teacherId: string; subject: SubjectId; planId: PlanId; slots: GroupSlot[] }) {
      await familyId()
      return must(await client.rpc('create_group', { p_learner: a.learnerId, p_teacher: a.teacherId, p_subject: a.subject, p_plan: a.planId, p_slots: a.slots as never })) as string
    },
    async groupByCode(code: string): Promise<GroupInvite> {
      const g = must(await client.rpc('group_by_code', { p_code: code })) as Record<string, unknown>
      return { ...(g as unknown as GroupInvite), myLearners: (g.myLearners as string[] | undefined) ?? [], paymentDeadline: ms((g.paymentDeadline as string) ?? null), share: toShare(g.share) }
    },
    async joinGroup(code: string, learnerId: string) {
      await familyId()
      return must(await client.rpc('join_group', { p_code: code, p_learner: learnerId })) as string
    },
    async leaveGroup(groupId: string) {
      must(await client.rpc('leave_group', { p_group: groupId }))
    },
    async groupDetail(groupId: string): Promise<GroupDetail> {
      const g = must(await client.rpc('group_detail', { p_group: groupId })) as Record<string, unknown>
      const sessions = (g.sessions as { id: string; startsAt: string; minutes: number; status: string }[]).map((x) => ({ ...x, startsAt: Date.parse(x.startsAt) }))
      return {
        ...(g as unknown as GroupDetail), sessions, share: toShare(g.share),
        paymentDeadline: ms((g.paymentDeadline as string) ?? null), startsOn: ms((g.startsOn as string) ?? null), endsOn: ms((g.endsOn as string) ?? null),
      }
    },
    async myGroups(): Promise<GroupSummary[]> {
      const rows = must(await client.rpc('my_groups')) as (Omit<GroupSummary, 'paymentDeadline' | 'nextSession'> & { paymentDeadline: string | null; nextSession: string | null })[]
      return rows.map((r) => ({ ...r, paymentDeadline: ms(r.paymentDeadline), nextSession: ms(r.nextSession) }))
    },
    /** Prépare la part d'un membre : renvoie le paiement Bictorys à ouvrir avec startPayment. */
    async startGroupPayment(memberId: string, method?: PaymentMethod) {
      const r = must(await client.rpc('start_group_payment', { p_member: memberId, ...(method ? { p_method: method } : {}) })) as { payment_id: string }
      return { paymentId: r.payment_id }
    },
    async myGroupSessions(): Promise<GroupSession[]> {
      const rows = must(await client.rpc('my_group_sessions')) as (Omit<GroupSession, 'startsAt'> & { startsAt: string })[]
      return rows.map((r) => ({ ...r, startsAt: Date.parse(r.startsAt) }))
    },
    async deliverGroupSession(sessionId: string, report: Report) {
      must(await client.rpc('deliver_group_session', { p_session: sessionId, p_report: report as never }))
    },

    // Justificatifs privés (diplômes, ijaza) : lus seulement par le professeur et les modérateurs.

    async listTeacherDocuments(teacherId?: string): Promise<TeacherDocument[]> {
      const id = teacherId ?? (must(await client.rpc('my_teacher_id')) as string | null)
      if (!id) return []
      const rows = must(await client.from('teacher_documents').select('id, file_name, content_type, size, created_at, path').eq('teacher_id', id).order('created_at'))
      return rows.map((r) => ({ id: r.id, fileName: r.file_name, contentType: r.content_type, size: Number(r.size), createdAt: Date.parse(r.created_at), path: r.path }))
    },
    async uploadTeacherDocument(file: Blob, fileName: string, contentType: string) {
      const id = must(await client.rpc('my_teacher_id')) as string | null
      if (!id) throw new Error(msg('not_a_teacher'))
      if (file.size > 10 * 1024 * 1024) throw new Error(msg('document_too_big'))
      const ext = ({ 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[contentType]
      if (!ext) throw new Error(msg('invalid_document'))
      const path = `${id}/doc-${Date.now()}.${ext}`
      const up = await client.storage.from(DOCUMENTS_BUCKET).upload(path, file, { contentType, upsert: false })
      if (up.error) throw new Error(msg('upload_failed'))
      const saved = await client.rpc('add_teacher_document', { p_path: path, p_file_name: fileName })
      if (saved.error) { await client.storage.from(DOCUMENTS_BUCKET).remove([path]); fail(saved.error) }
    },
    async removeTeacherDocument(docId: number) {
      const path = must(await client.rpc('remove_teacher_document', { p_id: docId })) as string
      await client.storage.from(DOCUMENTS_BUCKET).remove([path])
    },
    /** Lien temporaire (5 minutes) pour ouvrir un justificatif. */
    async teacherDocumentUrl(path: string) {
      const { data, error } = await client.storage.from(DOCUMENTS_BUCKET).createSignedUrl(path, 300)
      if (error || !data) throw new Error(msg('upload_failed'))
      return data.signedUrl
    },
    async removeTeacherMedia(kind: 'photo' | 'video') {
      const id = must(await client.rpc('my_teacher_id')) as string | null
      if (!id) throw new Error(msg('not_a_teacher'))
      const previous = (must(await client.from('teachers').select('photo_path, video_path').eq('id', id).single()) as { photo_path: string | null; video_path: string | null })[kind === 'photo' ? 'photo_path' : 'video_path']
      must(await client.rpc('set_teacher_media', { p_kind: kind, p_path: null }))
      if (previous) await client.storage.from(MEDIA_BUCKET).remove([previous])
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

    async listCredentialsToReview(): Promise<PendingCredential[]> {
      const rows = must(await client.rpc('credentials_to_review')) as unknown as (PendingCredential & { riwaya: string | null })[]
      return rows.map(({ riwaya, ...c }) => ({ ...c, ...(riwaya ? { riwaya: riwaya as PendingCredential['riwaya'] } : {}) }))
    },

    async reviewCredential(input: { id: number; approve: boolean }) {
      must(await client.rpc('review_credential', { p_id: input.id, p_approve: input.approve }))
      catalog = null
    },
  }
}

export type DiniApi = ReturnType<typeof createSupabaseApi>
