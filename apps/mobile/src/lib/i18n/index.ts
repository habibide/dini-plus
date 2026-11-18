import AsyncStorage from '@react-native-async-storage/async-storage'
import { formatDateTime, formatDay, formatMoney, formatTime, type CurrencyCode, type Label, type Locale } from '@dini/core'
import { setDataLocale } from '@dini/data'
import { useSyncExternalStore } from 'react'
import { ar } from './ar'
import { en } from './en'
import { fr, type Messages } from './fr'

// Langue de l'app : choisie dans l'onglet Compte, sinon celle du téléphone (français, anglais ou arabe), sinon le français.
// Le choix est gardé entre deux lancements.

export const LOCALES: Locale[] = ['fr', 'en', 'ar']
const MESSAGES: Record<Locale, Messages> = { fr, en, ar }
const STORAGE_KEY = 'dine.locale'
const isLocale = (v: unknown): v is Locale => v === 'fr' || v === 'en' || v === 'ar'

/** Nom de chaque langue, écrit dans cette langue. */
export const LOCALE_NAMES: Record<Locale, string> = { fr: 'Français', en: 'English', ar: 'العربية' }

/** Langue du téléphone, lue par le moteur Intl (pas de module natif supplémentaire). */
function deviceLocale(): Locale {
  try {
    const base = Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2).toLowerCase()
    return isLocale(base) ? base : 'fr'
  } catch {
    return 'fr'
  }
}

let current: Locale = deviceLocale()
setDataLocale(current)
const listeners = new Set<() => void>()

function apply(l: Locale) {
  current = l
  setDataLocale(l)
  listeners.forEach((f) => f())
}

// Choix enregistré lors d'un lancement précédent : il l'emporte sur la langue du téléphone.
void AsyncStorage.getItem(STORAGE_KEY).then((saved) => { if (isLocale(saved) && saved !== current) apply(saved) }).catch(() => {})

export function setLocale(l: Locale) {
  apply(l)
  void AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {})
}

const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }

export const useLocale = () => useSyncExternalStore(subscribe, () => current)
export const useT = () => MESSAGES[useLocale()]

/** Sens de lecture : l'arabe se lit de droite à gauche. */
export const useIsRTL = () => useLocale() === 'ar'

// Arabe avec chiffres latins, comme les montants, les téléphones et les horaires au Sénégal.
const INTL: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-u-nu-latn' }

/** Formats de date, d'heure et de montant, et libellés du catalogue, dans la langue courante. */
export function useFormat() {
  const locale = useLocale()
  const intl = INTL[locale]
  return {
    locale,
    label: (l: Label) => l[locale],
    money: (amount: number, currency: CurrencyCode) => formatMoney(amount, currency, intl),
    day: (utc: number, tz: string) => formatDay(utc, tz, intl),
    time: (utc: number, tz: string) => formatTime(utc, tz, intl),
    dateTime: (utc: number, tz: string) => formatDateTime(utc, tz, intl),
    euros: (n: number) => new Intl.NumberFormat(intl, { style: 'currency', currency: 'EUR' }).format(n),
    decimal: (n: number) => n.toLocaleString(intl, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    pct: (r: number) => `${Math.round(r * 100)}${locale === 'fr' ? ' ' : ''}%`,
  }
}
