import { describe, expect, it } from 'vitest'
import { cancellationOutcome, COMMISSION_RATE, escrowState, formatMoney, generateSlots, HOUR, sessionPrice, teacherNet, teacherShare, trialPrice, tzOffsetMinutes, zonedParts, zonedToUtc } from './index'

describe('fuseaux horaires', () => {
  it('donne le bon décalage de part et d’autre du changement d’heure à Paris', () => {
    expect(tzOffsetMinutes(Date.UTC(2026, 2, 28, 12), 'Europe/Paris')).toBe(60)
    expect(tzOffsetMinutes(Date.UTC(2026, 2, 29, 12), 'Europe/Paris')).toBe(120)
  })

  it('convertit une heure locale de New York en UTC, en hiver comme en été', () => {
    expect(zonedToUtc(2026, 1, 15, 9 * 60, 'America/New_York')).toBe(Date.UTC(2026, 0, 15, 14))
    expect(zonedToUtc(2026, 7, 15, 9 * 60, 'America/New_York')).toBe(Date.UTC(2026, 6, 15, 13))
  })

  it('garde un créneau récurrent de Dakar à la même heure locale, et le décale pour Paris après le changement d’heure', () => {
    // Enseignant à Dakar (UTC+0 toute l'année), lundi 18:00-18:30.
    const rules = [{ weekday: 1, start: 18 * 60, end: 18 * 60 + 30 }]
    const [before] = generateSlots(rules, 'Africa/Dakar', Date.UTC(2026, 9, 19), 7) // lundi 19 octobre
    const [after] = generateSlots(rules, 'Africa/Dakar', Date.UTC(2026, 10, 2), 7) // lundi 2 novembre
    expect(zonedParts(before, 'Africa/Dakar').minutes).toBe(18 * 60)
    expect(zonedParts(after, 'Africa/Dakar').minutes).toBe(18 * 60)
    expect(zonedParts(before, 'Europe/Paris').minutes).toBe(20 * 60)
    expect(zonedParts(after, 'Europe/Paris').minutes).toBe(19 * 60)
  })

  it('exclut les créneaux pris et ceux trop proches', () => {
    const rules = [{ weekday: 1, start: 9 * 60, end: 10 * 60 }]
    const from = Date.UTC(2026, 10, 2, 8, 0) // lundi 8:00 UTC
    expect(generateSlots(rules, 'Africa/Dakar', from, 1)).toEqual([]) // 9:00 et 9:30 sont à moins de 2 h
    const later = generateSlots(rules, 'Africa/Dakar', from, 8, { taken: new Set([Date.UTC(2026, 10, 9, 9)]) })
    expect(later).toEqual([Date.UTC(2026, 10, 9, 9, 30)])
  })
})

describe('prix', () => {
  const rates = { XOF: 2500, EUR: 7 }
  it('affiche le tarif dans la devise du pays de résidence', () => {
    expect(sessionPrice(rates, 'SN')).toEqual({ amount: 2500, currency: 'XOF' })
    expect(sessionPrice(rates, 'FR')).toEqual({ amount: 7, currency: 'EUR' })
    expect(sessionPrice(rates, 'GM').currency).toBe('GMD')
    expect(sessionPrice(rates, 'US')).toEqual({ amount: 7.5, currency: 'USD' })
    expect(sessionPrice(rates, 'CA')).toEqual({ amount: 10.5, currency: 'CAD' })
  })
  it('fait payer la séance d’essai à moitié prix', () => {
    expect(trialPrice(2500, 'XOF')).toBe(1250)
    expect(trialPrice(7, 'EUR')).toBe(3.5)
  })
  it('formate les montants', () => {
    expect(formatMoney(2500, 'XOF')).toMatch(/2\s?500/)
    expect(formatMoney(3.5, 'EUR')).toMatch(/3,50/)
  })
})

describe('commission et séquestre', () => {
  it('prend 15 % fixes, quelles que soient les heures enseignées', () => {
    expect(COMMISSION_RATE).toBe(0.15)
    expect(teacherShare(5000)).toBe(4250)
    expect(teacherNet(10).net).toBeCloseTo(8.5)
    expect(teacherNet(10).commission).toBeCloseTo(1.5)
  })
  it('valide une séance 48 h après sa fin', () => {
    const b = { status: 'delivered' as const, deliveredAt: 0 }
    expect(escrowState(b, 47 * HOUR).status).toBe('delivered')
    expect(escrowState(b, 48 * HOUR).status).toBe('validated')
  })
  it('n’annule gratuitement qu’au-delà de 24 h', () => {
    expect(cancellationOutcome(25 * HOUR, 0)).toBe('free')
    expect(cancellationOutcome(23 * HOUR, 0)).toBe('due')
  })
})
