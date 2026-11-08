import { country, type Country, type CurrencyCode } from './catalog'

// L'enseignant publie deux tarifs par cours de 50 min : local (FCFA) et international (EUR).
// Les autres devises en sont dérivées avec des taux de démonstration, fixes, à remplacer.
export const DEMO_RATES = { XOF_TO_GMD: 0.115, EUR_TO_USD: 1.08, EUR_TO_CAD: 1.5 } as const

const ROUNDING: Record<CurrencyCode, number> = { XOF: 50, GMD: 5, EUR: 0.5, USD: 0.5, CAD: 0.5 }

export const roundMoney = (amount: number, cur: CurrencyCode) => {
  const step = ROUNDING[cur]
  return Math.round(amount / step) * step
}

export type Rates = { XOF: number; EUR: number }

export function sessionPrice(rates: Rates, countryCode: Country['code']): { amount: number; currency: CurrencyCode } {
  const cur = country(countryCode).currency
  const raw = {
    XOF: rates.XOF,
    GMD: rates.XOF * DEMO_RATES.XOF_TO_GMD,
    EUR: rates.EUR,
    USD: rates.EUR * DEMO_RATES.EUR_TO_USD,
    CAD: rates.EUR * DEMO_RATES.EUR_TO_CAD,
  }[cur]
  return { amount: roundMoney(raw, cur), currency: cur }
}

/** Conversion vers l'euro, pour la comptabilité enseignant (soldes, commission). */
export function toEur(amount: number, cur: CurrencyCode): number {
  switch (cur) {
    case 'EUR': return amount
    case 'XOF': return amount / 655.957
    case 'GMD': return amount / DEMO_RATES.XOF_TO_GMD / 655.957
    case 'USD': return amount / DEMO_RATES.EUR_TO_USD
    case 'CAD': return amount / DEMO_RATES.EUR_TO_CAD
  }
}

export function formatMoney(amount: number, cur: CurrencyCode, locale = 'fr-FR') {
  const whole = Number.isInteger(amount) || cur === 'XOF' || cur === 'GMD'
  return new Intl.NumberFormat(locale, { style: 'currency', currency: cur, maximumFractionDigits: whole ? 0 : 2, minimumFractionDigits: whole ? 0 : 2 }).format(amount)
}
