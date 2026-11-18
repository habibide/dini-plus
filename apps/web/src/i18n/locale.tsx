'use client'

import { formatDateTime, formatDay, formatMoney, formatTime, type CurrencyCode, type Label, type Locale } from '@dini/core'
import { setDataLocale } from '@dini/data'
import { useEffect, useSyncExternalStore } from 'react'
import { ar } from './ar'
import { en } from './en'
import { fr, type Messages } from './fr'

// Langue du site : choisie par la personne (sélecteur), sinon déduite du navigateur, sinon le français.
// Elle est gardée dans le navigateur ; les URL ne changent pas.

export const LOCALES: Locale[] = ['fr', 'en', 'ar']
const MESSAGES: Record<Locale, Messages> = { fr, en, ar }
export const STORAGE_KEY = 'dine.locale'

const isLocale = (v: unknown): v is Locale => v === 'fr' || v === 'en' || v === 'ar'

/** Sens d'écriture : l'arabe se lit de droite à gauche. */
export const dirOf = (l: Locale) => (l === 'ar' ? 'rtl' : 'ltr')

function detect(): Locale {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (isLocale(saved)) return saved
  } catch { /* stockage bloqué : on se rabat sur le navigateur */ }
  for (const l of navigator.languages?.length ? navigator.languages : [navigator.language]) {
    const base = l?.slice(0, 2).toLowerCase()
    if (isLocale(base)) return base
  }
  return 'fr'
}

let current: Locale | null = null
const listeners = new Set<() => void>()

function getSnapshot(): Locale {
  current ??= detect()
  return current
}

export function setLocale(l: Locale) {
  current = l
  try { window.localStorage.setItem(STORAGE_KEY, l) } catch { /* préférence non gardée, sans gravité */ }
  listeners.forEach((f) => f())
}

const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }

/** Langue courante. Le rendu serveur et l'hydratation se font en français, puis la langue choisie s'applique. */
export const useLocale = () => useSyncExternalStore(subscribe, getSnapshot, () => 'fr' as Locale)

export const useT = () => MESSAGES[useLocale()]

// Arabe avec chiffres latins : ce sont ceux des montants saisis, des téléphones et des horaires au Sénégal.
const INTL: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-u-nu-latn' }

/** Formats de date, d'heure et de montant dans la langue courante, et libellé du catalogue (pays, matières…). */
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
    list: (items: string[]) => new Intl.ListFormat(intl, { style: 'long', type: 'conjunction' }).format(items),
  }
}

/** Reporte la langue sur <html lang dir> et sur les messages d'erreur de la couche de données. */
export function LocaleSync() {
  const locale = useLocale()
  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = dirOf(locale)
    document.documentElement.removeAttribute('data-locale-pending')
    setDataLocale(locale)
  }, [locale])
  return null
}

/**
 * Script exécuté avant l'affichage : si la langue retenue n'est pas le français, la page reste masquée
 * le temps que React applique la traduction (au plus 1,5 s), pour éviter un éclair de texte français.
 */
export const LOCALE_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,l=null,ok=function(x){return x==='fr'||x==='en'||x==='ar'};try{l=localStorage.getItem('${STORAGE_KEY}')}catch(e){}
if(!ok(l)){var ls=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language];l='fr';
for(var i=0;i<ls.length;i++){var b=(ls[i]||'').slice(0,2).toLowerCase();if(ok(b)){l=b;break}}}
if(l!=='fr'){d.lang=l;if(l==='ar')d.dir='rtl';d.setAttribute('data-locale-pending','');setTimeout(function(){d.removeAttribute('data-locale-pending')},1500)}}catch(e){}})()`
