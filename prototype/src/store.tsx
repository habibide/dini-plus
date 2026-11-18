import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LEARNERS, MARKETS, PLANS, SEED_APPLICATIONS, TEACHERS, commissionFor, disciplineName, type Application, type Teacher } from './data'

export type Role = 'visitor' | 'parent' | 'student' | 'teacher' | 'admin'
export type Report = { covered: string; surah: string; from: number; to: number; tajwid: string; homework: string; comment: string }
export type Booking = {
  id: string; teacherId: string; learnerId: string; at: number; minutes: number
  kind: 'trial' | 'plan'; subId?: string; amount: number; cur: 'EUR' | 'FCFA'
  status: 'scheduled' | 'delivered' | 'validated' | 'disputed' | 'cancelled' | 'refunded' | 'missed'
  deliveredAt?: number; report?: Report; reviewed?: boolean; demo?: boolean
}
export type Sub = { id: string; learnerId: string; teacherId: string; planId: string; perMonth: number; remaining: number; price: number; cur: 'EUR' | 'FCFA'; renews: number }
export type Dispute = { id: string; bookingId: string; reason: string; description: string; status: 'open' | 'refunded' | 'paid' }
export type Payout = { id: string; teacherId: string; amount: number; method: string; status: 'pending' | 'paid' }
export type Message = { id: string; teacherId: string; family: 'parent' | 'student'; from: 'family' | 'teacher'; text: string; at: number; file?: string }

export type State = {
  role: Role; market: string; offset: number; teacherMe: string
  teachers: Teacher[]; bookings: Booking[]; subs: Sub[]; applications: Application[]
  disputes: Dispute[]; payouts: Payout[]; messages: Message[]
  extraLearners: typeof LEARNERS
  flags: Record<string, boolean>; seq: number
}

const H = 3600_000
const DAY = 24 * H

export function nextSlots(t: Teacher, from: number, days = 14): number[] {
  const out: number[] = []
  const d0 = new Date(from)
  for (let i = 0; i < days; i++) {
    const day = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate() + i))
    if (!t.days.includes(day.getUTCDay())) continue
    for (const h of t.utcHours) {
      const at = day.getTime() + h * H
      if (at > from + 2 * H) out.push(at)
    }
  }
  return out
}

function seed(): State {
  const now = Date.now()
  const t = (id: string) => TEACHERS.find((x) => x.id === id)!
  const after = (id: string, days: number) => nextSlots(t(id), now + days * DAY, 14)[0]
  const past = (daysAgo: number) => {
    const d = new Date(now - daysAgo * DAY)
    d.setUTCHours(18, 0, 0, 0)
    return d.getTime()
  }
  const report = (surah: string, from: number, to: number, covered: string, tajwid: string, homework: string, comment: string): Report => ({ surah, from, to, covered, tajwid, homework, comment })
  const b = (id: string, teacherId: string, learnerId: string, at: number, status: Booking['status'], amount: number, cur: Booking['cur'], extra: Partial<Booking> = {}): Booking =>
    ({ id, teacherId, learnerId, at, minutes: 30, kind: 'plan', amount, cur, status, ...extra })
  const bookings: Booking[] = [
    b('b1', 't1', 'awa', past(19), 'validated', 7, 'EUR', { subId: 's1', deliveredAt: past(19), reviewed: true, report: report('fatiha', 1, 7, 'Révision complète d’Al-Fatiha', 'Allongements bien tenus.', 'Réciter chaque matin.', 'Très bon départ, Awa est concentrée.') }),
    b('b2', 't1', 'awa', past(15), 'validated', 7, 'EUR', { subId: 's1', deliveredAt: past(15), reviewed: true, report: report('nas', 1, 6, 'An-Nas mémorisée', 'Attention au « sîn » final.', 'Réviser An-Nas et Al-Falaq.', 'Bonne mémoire, un peu rapide.') }),
    b('b3', 't1', 'awa', past(12), 'validated', 7, 'EUR', { subId: 's1', deliveredAt: past(12), reviewed: true, report: report('falaq', 1, 5, 'Al-Falaq mémorisée', 'Qalqala à consolider.', 'Écouter puis répéter 3 fois.', 'Awa progresse bien.') }),
    b('b4', 't1', 'awa', past(8), 'missed', 7, 'EUR', { subId: 's1' }),
    b('b5', 't1', 'awa', past(5), 'validated', 7, 'EUR', { subId: 's1', deliveredAt: past(5), reviewed: true, report: report('ikhlas', 1, 4, 'Al-Ikhlas mémorisée, début d’Al-Masad', 'Bonne sortie des lettres emphatiques.', 'Réviser Al-Ikhlas.', 'Séance joyeuse et efficace.') }),
    b('b6', 't1', 'awa', now - 20 * H, 'delivered', 7, 'EUR', { subId: 's1', deliveredAt: now - 20 * H, report: report('masad', 1, 3, 'Al-Masad, versets 1 à 3', 'Awa confond encore les deux « tâ ».', 'Répéter les versets 1 à 3 avant le prochain cours.', 'Il reste deux versets, on les finit la prochaine fois.') }),
    b('b7', 't1', 'awa', after('t1', 1), 'scheduled', 7, 'EUR', { subId: 's1' }),
    b('b8', 't10', 'ibrahim', past(16), 'validated', 9, 'EUR', { subId: 's2', deliveredAt: past(16), reviewed: true, report: report('', 0, 0, 'Phrase nominale : mubtada et khabar', 'Sans objet', 'Exercice 3 de la fiche.', 'Ibrahim comprend vite.') }),
    b('b9', 't10', 'ibrahim', past(9), 'validated', 9, 'EUR', { subId: 's2', deliveredAt: past(9), reviewed: true, report: report('', 0, 0, 'Les cas : raf’, nasb, jarr', 'Sans objet', 'Analyser 5 phrases.', 'À retravailler : le nasb.') }),
    b('b10', 't10', 'ibrahim', after('t10', 2), 'scheduled', 9, 'EUR', { subId: 's2' }),
    b('b11', 't5', 'mareme', after('t5', 2), 'scheduled', 4, 'EUR', { kind: 'trial' }),
    b('b12', 't1', 'ext', after('t1', 3), 'scheduled', 7, 'EUR'),
  ]
  const subs: Sub[] = [
    { id: 's1', learnerId: 'awa', teacherId: 't1', planId: 'regulier', perMonth: 8, remaining: 2, price: 56, cur: 'EUR', renews: now + 9 * DAY },
    { id: 's2', learnerId: 'ibrahim', teacherId: 't10', planId: 'decouverte', perMonth: 4, remaining: 1, price: 36, cur: 'EUR', renews: now + 13 * DAY },
  ]
  return {
    role: 'visitor', market: 'paris', offset: 0, teacherMe: 't1',
    teachers: structuredClone(TEACHERS), bookings, subs,
    applications: structuredClone(SEED_APPLICATIONS),
    disputes: [{ id: 'd0', bookingId: 'b0', reason: 'Enseignant absent', description: 'L’enseignant ne s’est pas connecté à la séance du 12 (élève fictif : Kader S.).', status: 'open' }],
    payouts: [{ id: 'p0', teacherId: 't2', amount: 120, method: 'Virement', status: 'pending' }, { id: 'p00', teacherId: 't8', amount: 73, method: 'Wave', status: 'pending' }],
    messages: [
      { id: 'm1', teacherId: 't1', family: 'parent', from: 'teacher', text: 'Bonjour Madame Diop, Awa a très bien travaillé. Pensez à la faire réciter Al-Masad demain matin.', at: now - 19 * H },
      { id: 'm2', teacherId: 't1', family: 'parent', from: 'family', text: 'Merci beaucoup, ce sera fait in cha Allah.', at: now - 18 * H },
    ],
    extraLearners: [], flags: {}, seq: 100,
  }
}

// --- Opérations métier (mutent un brouillon de l'état) ---

export const nowOf = (s: State) => Date.now() + s.offset
export const uid = (d: State, p: string) => `${p}${++d.seq}`
export const toEur = (amount: number, cur: string) => (cur === 'FCFA' ? amount / 655.957 : amount)

export function creditTeacher(d: State, b: Booking) {
  const t = d.teachers.find((x) => x.id === b.teacherId)
  if (!t) return
  const rate = commissionFor(t.hours)
  t.balance += toEur(b.amount, b.cur) * (1 - rate)
  t.hours += b.minutes / 60
}

function settle(d: State) {
  const now = nowOf(d)
  for (const b of d.bookings) {
    if (b.status === 'delivered' && b.deliveredAt && b.deliveredAt + 48 * H <= now) {
      b.status = 'validated'
      creditTeacher(d, b)
      if (b.demo) d.flags.credited = true
    }
  }
}

export function learnersOf(s: State, owner: 'parent' | 'student') {
  return [...LEARNERS, ...s.extraLearners].filter((l) => l.owner === owner)
}
export function learnerName(s: State, id: string) {
  if (id === 'ext') return 'Seynabou K.'
  return [...LEARNERS, ...s.extraLearners].find((l) => l.id === id)?.name ?? id
}

export function isFree(s: State, teacherId: string, at: number) {
  return !s.bookings.some((b) => b.teacherId === teacherId && b.at === at && ['scheduled', 'delivered', 'validated', 'disputed'].includes(b.status))
}

export function createBooking(d: State, o: { teacherId: string; learnerId: string; at: number; choice: string; cur: 'EUR' | 'FCFA' }): string | null {
  if (!isFree(d, o.teacherId, o.at)) return null // en prod : verrou en base, jamais côté client
  const t = d.teachers.find((x) => x.id === o.teacherId)!
  const rate = o.cur === 'EUR' ? t.rateEur : t.rateFcfa
  const id = uid(d, 'b')
  const base: Booking = { id, teacherId: t.id, learnerId: o.learnerId, at: o.at, minutes: 30, kind: 'plan', amount: rate, cur: o.cur, status: 'scheduled', demo: true }
  if (o.choice === 'trial') {
    base.kind = 'trial'
    base.amount = Math.round(rate * 0.5 * 100) / 100
  } else if (o.choice === 'credit') {
    const sub = d.subs.find((x) => x.learnerId === o.learnerId && x.teacherId === t.id && x.remaining > 0)!
    sub.remaining -= 1
    base.subId = sub.id
    base.amount = sub.price / sub.perMonth
    base.cur = sub.cur
  } else {
    const plan = PLANS.find((p) => p.id === o.choice)!
    const sub: Sub = { id: uid(d, 's'), learnerId: o.learnerId, teacherId: t.id, planId: plan.id, perMonth: plan.n, remaining: plan.n - 1, price: plan.n * rate, cur: o.cur, renews: nowOf(d) + 30 * DAY }
    d.subs.push(sub)
    base.subId = sub.id
    d.flags.subscribed = true
  }
  d.bookings.push(base)
  d.flags.booked = true
  return id
}

export function deliver(d: State, id: string, report: Report) {
  const b = d.bookings.find((x) => x.id === id)!
  // Démo : si la séance est dans le futur, l'horloge saute jusqu'à sa fin.
  const end = b.at + b.minutes * 60_000
  if (end > nowOf(d)) d.offset += end - nowOf(d)
  b.status = 'delivered'
  b.deliveredAt = nowOf(d)
  b.report = report
  if (b.demo) d.flags.reported = true
}

export function cancelBooking(d: State, id: string): 'free' | 'late' {
  const b = d.bookings.find((x) => x.id === id)!
  const free = b.at - nowOf(d) >= 24 * H
  if (free) {
    b.status = b.kind === 'trial' ? 'refunded' : 'cancelled'
    const sub = d.subs.find((x) => x.id === b.subId)
    if (sub) sub.remaining += 1
    return 'free'
  }
  b.status = 'validated'
  creditTeacher(d, b)
  return 'late'
}

export function openDispute(d: State, id: string, reason: string, description: string) {
  const b = d.bookings.find((x) => x.id === id)!
  b.status = 'disputed'
  d.disputes.push({ id: uid(d, 'd'), bookingId: id, reason, description, status: 'open' })
  d.flags.disputed = true
}

export function resolveDispute(d: State, id: string, outcome: 'refunded' | 'paid') {
  const x = d.disputes.find((y) => y.id === id)!
  x.status = outcome
  const b = d.bookings.find((y) => y.id === x.bookingId)
  if (!b) return
  if (outcome === 'paid') {
    b.status = 'validated'
    creditTeacher(d, b)
  } else {
    b.status = 'refunded'
    const sub = d.subs.find((y) => y.id === b.subId)
    if (sub) sub.remaining += 1
  }
}

export function decideApplication(d: State, id: string, outcome: 'accepted' | 'limited' | 'refused') {
  const a = d.applications.find((x) => x.id === id)!
  a.status = outcome
  if (outcome === 'refused') return
  const year = new Date().getFullYear()
  d.teachers.unshift({
    id: `t-${a.id}`, name: a.name, gender: a.gender, city: a.city, tz: a.tz, headline: `${a.subjects.map(disciplineName).join(', ')}${a.riwaya[0] ? `, riwaya ${a.riwaya[0]}` : ''}`,
    bio: a.bio, subjects: a.subjects, riwaya: a.riwaya, madhhab: a.madhhab, langs: a.langs, levels: ['débutant', 'intermédiaire'], ages: ['enfant', 'ado', 'adulte'],
    rateEur: a.rateEur, rateFcfa: a.rateFcfa, rating: 0, hours: 0, balance: 0, isNew: true,
    badges: { identity: a.checks.identity, diploma: a.checks.diploma, ijaza: a.checks.ijaza },
    credentials: [
      ...(a.checks.ijaza ? [{ type: 'Ijaza' as const, title: a.ijazaLabel, institution: 'Sanad contrôlé par DINI', year, riwaya: a.riwaya[0], sanad: [a.name, a.refs[0]?.name ?? 'Maître référent'] }] : []),
      ...(a.checks.diploma ? [{ type: 'Diplôme' as const, title: a.diplomaLabel, institution: 'Attestation contrôlée', year }] : []),
    ],
    days: [1, 2, 3, 4, 6], utcHours: [9, 17, 18], reviews: [],
  })
  d.flags.accepted = true
}

// --- Contexte React ---

export type Route = { p: string; a?: any }
type Ctx = {
  s: State; act: (fn: (d: State) => void) => void; route: Route; nav: (p: string, a?: any) => void
  toast: string | null; say: (m: string) => void; reset: () => void; now: number
  market: (typeof MARKETS)[string]
}
const AppCtx = createContext<Ctx>(null as unknown as Ctx)
export const useApp = () => useContext(AppCtx)
const KEY = 'dini-proto-v1'

export function AppProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return JSON.parse(raw)
    } catch { /* stockage indisponible : on repart des données de démo */ }
    return seed()
  })
  const [route, setRoute] = useState<Route>({ p: 'home' })
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignoré */ }
  }, [s])

  useEffect(() => {
    const onPop = (e: PopStateEvent) => setRoute(e.state?.route ?? { p: 'home' })
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 4200)
    return () => clearTimeout(id)
  }, [toast])

  const act = useCallback((fn: (d: State) => void) => {
    setS((prev) => {
      const d = structuredClone(prev)
      fn(d)
      settle(d)
      return d
    })
  }, [])

  const nav = useCallback((p: string, a?: any) => {
    const r = { p, a }
    setRoute(r)
    try { history.pushState({ route: r }, '') } catch { /* cadre verrouillé */ }
    window.scrollTo(0, 0)
  }, [])

  const reset = useCallback(() => {
    setS(seed())
    nav('home')
    setToast('Démo réinitialisée.')
  }, [nav])

  const value = useMemo(
    () => ({ s, act, route, nav, toast, say: setToast, reset, now: nowOf(s), market: MARKETS[s.market] }),
    [s, act, route, nav, toast, reset],
  )
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
