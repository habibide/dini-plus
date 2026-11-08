import { describe, expect, it } from 'vitest'
import { DAY, HOUR, TeacherSchema, sessionPrice, type Booking, type Learner } from '@dini/core'
import { SEED_TEACHERS, buildDashboard, filterTeachers } from './index'

const NOW = Date.UTC(2026, 10, 9, 12)
const cards = SEED_TEACHERS.map((t) => ({ ...t, price: sessionPrice(t.rates, 'FR') }))

describe('catalogue de départ', () => {
  it('respecte le schéma et la règle des 40 % d’enseignantes', () => {
    for (const t of SEED_TEACHERS) TeacherSchema.parse(t)
    expect(SEED_TEACHERS.filter((t) => t.gender === 'F').length / SEED_TEACHERS.length).toBeGreaterThanOrEqual(0.4)
  })
})

describe('filterTeachers', () => {
  it('combine matière, langue et genre', () => {
    const list = filterTeachers(cards, { subject: 'quran', language: 'wo', gender: 'F' }, 'Europe/Paris', NOW)
    expect(list.length).toBeGreaterThan(0)
    for (const t of list) expect(t.subjects.includes('quran') && t.languages.includes('wo') && t.gender === 'F').toBe(true)
  })

  it('filtre sur le prix maximal dans la devise affichée', () => {
    for (const t of filterTeachers(cards, { maxPrice: 7 }, 'Europe/Paris', NOW)) expect(t.price.amount).toBeLessThanOrEqual(7)
  })
})

describe('buildDashboard', () => {
  const learner: Learner = { id: 'l1', familyId: 'f1', name: 'Awa', birthYear: 2017, level: 'beginner', goals: '' }
  const base = { learnerId: 'l1', teacherId: 't-aissatou', kind: 'plan', subject: 'quran', minutes: 30, amount: 7, currency: 'EUR' } as const
  const bookings: Booking[] = [
    { ...base, id: 'b1', startsAt: NOW - 5 * DAY, status: 'validated', deliveredAt: NOW - 5 * DAY, report: { covered: '', surah: 112, ayahTo: 4, tajwidNotes: '', homework: '', comment: '' } },
    { ...base, id: 'b2', startsAt: NOW - 3 * DAY, status: 'missed' },
    { ...base, id: 'b3', startsAt: NOW - 20 * HOUR, status: 'delivered', deliveredAt: NOW - 19 * HOUR },
    { ...base, id: 'b4', startsAt: NOW + DAY, status: 'scheduled' },
  ]
  const [d] = buildDashboard([learner], bookings, [], NOW)

  it('trouve la prochaine séance et l’assiduité', () => {
    expect(d.next?.id).toBe('b4')
    expect(d.attendance).toMatchObject({ present: 2, held: 3 })
  })

  it('calcule la fin du séquestre à 48 h', () => {
    expect(d.awaitingValidation[0].releaseAt).toBe(NOW - 19 * HOUR + 48 * HOUR)
    expect(d.progress).toEqual([{ surah: 112, reached: 4 }])
  })
})
