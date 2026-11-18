'use client'

import { COUNTRIES, type Locale } from '@dini/core'
import { useAccount, useDini, usePlace, useSignOut, useUpdateName } from '@dini/data/react'
import type { Account } from '@dini/data/supabase'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ClientOnly } from './client-only'
import { DineLogo } from './logo'
import { cx } from './styles'
import { LOCALES, dirOf, setLocale, useFormat, useLocale, useT } from '@/i18n/locale'

/** Prénom du compte ; vide si le nom n'est pas connu (on n'affiche jamais l'e-mail à la place). */
const firstName = (a: Account) => a.name.trim().split(/\s+/)[0] ?? ''
/** Adresse relais d'Apple (« Masquer mon adresse e-mail ») : illisible, on ne l'affiche pas. */
const isRelayEmail = (email: string) => email.endsWith('@privaterelay.appleid.com')

/**
 * Compte sans nom (Apple ne le transmet pas toujours) : on le demande une fois, sous l'en-tête,
 * pour que les professeurs et les familles sachent à qui ils ont affaire.
 */
export function NameBanner() {
  const account = useAccount()
  const t = useT().nameAsk
  const save = useUpdateName()
  const [name, setName] = useState('')
  if (!account || account.name.trim()) return null
  return (
    <div className="border-b border-line bg-sand">
      <form className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3"
        onSubmit={(e) => { e.preventDefault(); save.mutate(name) }}>
        <label htmlFor="ask-name" className="font-semibold text-ochre">{t.title}</label>
        <input id="ask-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.placeholder} autoComplete="name" maxLength={120}
          className="min-h-11 min-w-0 flex-1 basis-56 rounded-sm border-[1.5px] border-[#e1ddd2] bg-white px-3.5" />
        <button type="submit" disabled={save.isPending || name.trim().length < 2}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-[14px] bg-green px-5 font-semibold text-white hover:bg-green2 disabled:cursor-not-allowed disabled:opacity-40">
          {save.isPending ? t.saving : t.save}
        </button>
        {save.error && <p role="alert" className="w-full text-sm text-bad">{save.error.message}</p>}
        <p className="w-full text-sm text-muted">{t.why}</p>
      </form>
    </div>
  )
}

/** Erreur de chargement (réseau, accès refusé), sous l'en-tête. */
export function ErrorBanner() {
  const { error, clearError } = useDini()
  const t = useT()
  if (!error) return null
  return (
    <div role="alert" className="flex items-start gap-3 bg-warnbg px-4 py-2 text-[14px] text-warn">
      <span className="flex-1">{t.common.loadError(error)}</span>
      <button type="button" className="cursor-pointer underline" onClick={clearError}>{t.common.close}</button>
    </div>
  )
}

type NavItem = { href: string; label: string }

function navFor(account: Account | null | undefined, t: ReturnType<typeof useT>): NavItem[] {
  const items: NavItem[] = [{ href: '/teachers', label: t.nav.find }]
  if (account?.role === 'teacher') items.push({ href: '/teacher', label: t.nav.teacherSpace })
  else if (account) items.push({ href: '/progress', label: t.nav.tracking })
  if (account?.role === 'moderator' || account?.role === 'admin') items.push({ href: '/moderation', label: t.nav.moderation })
  // « Devenir professeur » s'adresse aux visiteurs : une fois connecté (élève, parent ou professeur), le lien disparaît.
  if (!account) items.push({ href: '/become-a-teacher', label: t.nav.becomeTeacher })
  return items
}

function NavLinks({ path }: { path: string }) {
  const account = useAccount()
  const t = useT()
  return navFor(account, t).map((n) => (
    <Link key={n.href} href={n.href} aria-current={path === n.href ? 'page' : undefined}
      className={cx('rounded-sm px-3 py-2 text-[15px] font-semibold transition', path === n.href || path.startsWith(`${n.href}/`) ? 'bg-soft text-green2' : 'text-muted hover:bg-leaf hover:text-ink')}>{n.label}</Link>
  ))
}

function ActiveNavLinks() {
  return <NavLinks path={usePathname()} />
}

// ─── Icônes de l'en-tête ────────────────────────────────────────────
const ICONS = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M18 6L6 18M6 6l12 12',
  chevron: 'M6 9l6 6 6-6',
  signIn: 'M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 012 2v14a2 2 0 01-2 2h-5',
}
function Icon({ d, className = 'size-5' }: { d: string; className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
}

/** Ferme un panneau au clic à l'extérieur et avec Échap. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const click = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close() }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', click)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', click); document.removeEventListener('keydown', key) }
  }, [open, close])
  return ref
}

function usePlaceCurrency() {
  const { place } = usePlace()
  return COUNTRIES.find((c) => c.code === place.country)?.currency ?? ''
}

const selectCls = 'min-h-12 w-full cursor-pointer appearance-none rounded-sm border-[1.5px] border-[#d6d2c7] bg-white bg-[length:18px] bg-[position:right_14px_center] bg-no-repeat pe-10 ps-4 text-base text-ink rtl:bg-[position:left_14px_center]'
const chevronBg = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231f1f1b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")` }

/** Les deux réglages, langue et devise (pays de résidence), comme chez Preply. */
function LocaleCurrencyFields() {
  const t = useT()
  const f = useFormat()
  const locale = useLocale()
  const { place, setPlace } = usePlace()
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-semibold text-ink">{t.lang.label}</span>
        <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)} className={selectCls} style={chevronBg}>
          {LOCALES.map((l) => <option key={l} value={l} lang={l}>{t.lang[l]}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-semibold text-ink">{t.nav.currencyLabel}</span>
        <select value={`${place.country}|${place.timezone}`} className={selectCls} style={chevronBg}
          onChange={(e) => { const [c, tz] = e.target.value.split('|'); setPlace({ country: c as typeof place.country, timezone: tz }) }}>
          {COUNTRIES.map((c) => c.timezones.map((tz) => (
            <option key={tz.id} value={`${c.code}|${tz.id}`}>
              {c.currency} · {c.timezones.length > 1 ? `${f.label(c.label)}, ${tz.label}` : f.label(c.label)}
            </option>
          )))}
        </select>
      </label>
    </div>
  )
}

/** « Français, XOF ⌄ » : ouvre le panneau langue et devise. */
function LocaleCurrencyMenu() {
  const t = useT()
  const locale = useLocale()
  const currency = usePlaceCurrency()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss(open, close)
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog"
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-3 text-[15px] font-medium text-ink transition hover:bg-leaf">
        {t.lang[locale]}, {currency}
        <Icon d={ICONS.chevron} className={cx('size-4 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="dialog" aria-label={`${t.lang.label}, ${t.nav.currencyLabel}`}
          className="absolute end-0 z-40 mt-2 w-80 rounded-md border border-line bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.14)]">
          <LocaleCurrencyFields />
        </div>
      )}
    </div>
  )
}

/** Grand écran : langue et devise, puis connexion et inscription. */
function DesktopTools() {
  return (
    <div className="hidden items-center gap-2 md:flex">
      <LocaleCurrencyMenu />
      <div className="ms-1 flex items-center gap-2"><AccountArea /></div>
    </div>
  )
}

/** Mobile : icône menu qui ouvre un tiroir latéral (liens, compte, puis langue et devise en bas). */
function MobileMenu() {
  const t = useT()
  const locale = useLocale()
  const account = useAccount()
  const signOut = useSignOut()
  const router = useRouter()
  const path = usePathname()
  const [open, setOpen] = useState(false)
  useEffect(() => { setOpen(false) }, [path])
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', key)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = '' }
  }, [open])
  const link = (href: string, label: string) => (
    <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}
      className={cx('relative py-2.5 text-[17px] font-semibold', path === href || path.startsWith(`${href}/`) ? 'text-ink before:absolute before:-start-6 before:inset-y-1.5 before:w-1 before:bg-green' : 'text-muted hover:text-ink')}>{label}</Link>
  )
  const first = account ? firstName(account) || t.nav.myAccount : null
  return (
    <div className="md:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="menu-mobile" aria-label={t.nav.menu}
        className="grid size-11 cursor-pointer place-items-center rounded-full text-ink hover:bg-leaf">
        <Icon d={ICONS.menu} className="size-6" />
      </button>
      {/* Rendu dans <body> : le flou de l'en-tête confinerait sinon le tiroir à sa hauteur. */}
      {open && createPortal(
        <div className="fixed inset-0 z-50" dir={dirOf(locale)}>
          <button type="button" aria-label={t.nav.closeMenu} onClick={() => setOpen(false)} className="absolute inset-0 cursor-default bg-ink/30" />
          <div id="menu-mobile" role="dialog" aria-modal="true" aria-label={t.nav.menu}
            className="absolute inset-y-0 end-0 flex w-[85%] max-w-sm flex-col overflow-y-auto bg-white px-6 pb-6 pt-5 shadow-[-12px_0_32px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
              {first
                ? <span className="flex min-w-0 items-center gap-3 font-semibold"><span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-green text-sm font-bold text-white">{first[0]?.toUpperCase()}</span><span className="truncate">{first}</span></span>
                : <DineLogo />}
              <button type="button" onClick={() => setOpen(false)} aria-label={t.nav.closeMenu} className="-me-2 grid size-10 cursor-pointer place-items-center rounded-full text-ink hover:bg-leaf">
                <Icon d={ICONS.close} className="size-6" />
              </button>
            </div>
            <nav aria-label={t.nav.main} className="flex flex-col border-b border-line py-4">
              {navFor(account, t).map((n) => link(n.href, n.label))}
            </nav>
            <div className="flex flex-col py-4">
              {account ? (
                <button type="button" className="cursor-pointer py-2.5 text-start text-[17px] font-semibold text-muted hover:text-ink"
                  onClick={() => signOut.mutate(undefined, { onSettled: () => router.push('/') })}>{t.nav.signOut}</button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-[14px] bg-green font-semibold text-white">{t.nav.signUp}</Link>
                  <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-[14px] border-[1.5px] border-[#d6d2c7] bg-white font-semibold text-ink">{t.nav.signIn}</Link>
                </div>
              )}
            </div>
            <div className="mt-auto pt-4"><LocaleCurrencyFields /></div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

export function SiteHeader() {
  const t = useT()
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center gap-x-6 px-5 py-3">
        <Link href="/" className="flex items-center" aria-label={t.nav.home}>
          <DineLogo />
        </Link>
        <nav aria-label={t.nav.main} className="hidden flex-1 gap-x-1 md:flex">
          <ClientOnly fallback={null}><Suspense fallback={<NavLinks path="" />}><ActiveNavLinks /></Suspense></ClientOnly>
        </nav>
        <div className="ms-auto flex items-center">
          <ClientOnly fallback={null}><DesktopTools /><Suspense fallback={null}><MobileMenu /></Suspense></ClientOnly>
        </div>
      </div>
    </header>
  )
}

function AccountArea() {
  const account = useAccount()
  const signOut = useSignOut()
  const router = useRouter()
  const t = useT()
  if (account === undefined) return <span className="h-11 w-36" />
  if (!account) {
    return (
      <>
        <Link href="/login" className="inline-flex min-h-11 items-center gap-2 rounded-[14px] px-3 font-semibold text-ink transition hover:bg-leaf">
          <Icon d={ICONS.signIn} className="size-4" />{t.nav.signIn}
        </Link>
        <Link href="/signup" className="inline-flex min-h-11 items-center rounded-[14px] bg-green px-5 font-semibold text-white transition hover:bg-green2">{t.nav.signUp}</Link>
      </>
    )
  }
  const first = firstName(account) || t.nav.myAccount
  return (
    <details className="relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[14px] border-[1.5px] border-line bg-white px-3 font-semibold hover:border-green">
        <span aria-hidden className="grid size-7 place-items-center rounded-full bg-green text-sm font-bold text-white">{first[0]?.toUpperCase()}</span>
        {first}
      </summary>
      <div className="absolute end-0 z-20 mt-2 flex min-w-56 flex-col overflow-hidden rounded-md border-[1.5px] border-line bg-white py-1 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
        {!isRelayEmail(account.email) && <span className="truncate px-4 py-2 text-sm text-muted">{account.email}</span>}
        {navFor(account, t).filter((n) => n.href !== '/teachers' && n.href !== '/become-a-teacher').map((n) => (
          <Link key={n.href} href={n.href} className="px-4 py-2 hover:bg-leaf">{n.label}</Link>
        ))}
        <button type="button" className="cursor-pointer px-4 py-2 text-start hover:bg-leaf"
          onClick={() => signOut.mutate(undefined, { onSettled: () => router.push('/') })}>{t.nav.signOut}</button>
      </div>
    </details>
  )
}


export function SiteFooter() {
  const t = useT()
  return (
    <footer className="mt-16 bg-brand text-white/80">
      <div className="pattern-strip opacity-60 invert" />
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-6 px-5 py-10 text-sm">
        <div className="flex max-w-prose flex-col gap-3">
          <DineLogo inverted />
          <p>{t.footer.about}</p>
        </div>
        <nav aria-label={t.footer.info} className="flex flex-col gap-1 self-end">
          <Link href="/become-a-teacher" className="hover:text-white">{t.nav.becomeTeacher}</Link>
          <Link href="/terms" className="hover:text-white">{t.footer.terms}</Link>
          <Link href="/privacy" className="hover:text-white">{t.footer.privacy}</Link>
          <span className="text-white/60">DATA &amp; BRAIN, Dakar</span>
        </nav>
      </div>
    </footer>
  )
}
