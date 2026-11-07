import { describe, expect, it } from 'vitest'
import { TeacherSchema } from '@dini/core'
import { SEED_TEACHERS, SlotTakenError, createMockApi, memoryStorage } from './index'

describe('données de démonstration', () => {
  it('respectent le schéma enseignant', () => {
    for (const t of SEED_TEACHERS) expect(() => TeacherSchema.parse(t)).not.toThrow()
  })
  it('comptent au moins 40 % d’enseignantes', () => {
    const women = SEED_TEACHERS.filter((t) => t.gender === 'F').length
    expect(women / SEED_TEACHERS.length).toBeGreaterThanOrEqual(0.4)
  })
})

describe('API fictive', () => {
  it('affiche les prix dans la devise du pays de la famille', async () => {
    const api = createMockApi(memoryStorage())
    const fr = await api.listTeachers('fam-diop')
    expect(fr.every((t) => t.price.currency === 'EUR')).toBe(true)
    await api.setResidence('fam-diop', 'GM', 'Africa/Banjul')
    const gm = await api.listTeachers('fam-diop')
    expect(gm.every((t) => t.price.currency === 'GMD')).toBe(true)
  })

  it('filtre par matière et langue d’enseignement', async () => {
    const api = createMockApi(memoryStorage())
    const list = await api.listTeachers('fam-diop', { subject: 'arabic', language: 'mnk' })
    expect(list.map((t) => t.id).sort()).toEqual(['t-lamin', 't-mariama'])
  })

  it('refuse un créneau déjà pris', async () => {
    const api = createMockApi(memoryStorage())
    const [slot] = await api.getSlots('t-lamin')
    await api.createBooking({ familyId: 'fam-diop', learnerId: 'l-awa', teacherId: 't-lamin', subject: 'quran', startsAt: slot, choice: 'trial' })
    await expect(api.createBooking({ familyId: 'fam-diop', learnerId: 'l-ibrahim', teacherId: 't-lamin', subject: 'quran', startsAt: slot, choice: 'trial' })).rejects.toBeInstanceOf(SlotTakenError)
    expect(await api.getSlots('t-lamin')).not.toContain(slot)
  })

  it('décompte une séance du forfait et la rend si on annule plus de 24 h avant', async () => {
    const api = createMockApi(memoryStorage())
    const slots = await api.getSlots('t-aissatou', 1)
    const { booking } = await api.createBooking({ familyId: 'fam-diop', learnerId: 'l-awa', teacherId: 't-aissatou', subject: 'quran', startsAt: slots[0], choice: 'credit' })
    expect((await api.quote('fam-diop', 't-aissatou', 'l-awa')).credit?.remaining).toBe(1)
    expect(await api.cancelBooking(booking.id)).toBe('free')
    expect((await api.quote('fam-diop', 't-aissatou', 'l-awa')).credit?.remaining).toBe(2)
  })

  it('libère le séquestre 48 h après la séance', async () => {
    const api = createMockApi(memoryStorage())
    let [awa] = await api.getDashboard('fam-diop')
    expect(awa.awaitingValidation).toHaveLength(1)
    await api.advanceClock('fam-diop', 48)
    ;[awa] = await api.getDashboard('fam-diop')
    expect(awa.awaitingValidation).toHaveLength(0)
    expect(awa.progress.find((p) => p.surah === 111)?.reached).toBe(3)
  })

  it('garde l’état entre deux ouvertures grâce au stockage', async () => {
    const storage = memoryStorage()
    const a = createMockApi(storage)
    await a.addLearner('fam-diop', 'Moussa Diop', 2019)
    const b = createMockApi(storage)
    expect((await b.getFamily('fam-diop')).learners.map((l) => l.name)).toContain('Moussa Diop')
  })
})

describe('intervalMs', () => {
  it('lit les intervalles renvoyés par Postgres', async () => {
    const { intervalMs } = await import('./supabase/api')
    expect(intervalMs('00:00:00')).toBe(0)
    expect(intervalMs('48:00:00')).toBe(48 * 3_600_000)
    expect(intervalMs('2 days 01:30:00')).toBe(49.5 * 3_600_000)
    expect(intervalMs('1 day')).toBe(24 * 3_600_000)
    expect(intervalMs('19:42:10.5')).toBe((19 * 3600 + 42 * 60 + 10.5) * 1000)
  })
})
