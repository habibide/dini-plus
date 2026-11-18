'use client'

import { COUNTRIES } from '@dini/core'
import { useAccount, useDini, usePlace, useSignOut } from '@dini/data/react'
import type { Account } from '@dini/data/supabase'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ClientOnly } from './client-only'
import { DineLogo } from './logo'
import { cx } from './styles'
import { LOCALES, setLocale, useFormat, useLocale, useT } from '@/i18n/locale'

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
  const items: NavItem[] = [{ href: '/enseignants', label: t.nav.find }]
  if (account?.role === 'teacher') items.push({ href: '/enseignant', label: t.nav.teacherSpace })
  else if (account) items.push({ href: '/suivi', label: t.nav.tracking })
  if (account?.role === 'moderator' || account?.role === 'admin') items.push({ href: '/moderation', label: t.nav.moderation })
  if (!account || account.role === 'family') items.push({ href: '/devenir-enseignant', label: t.nav.becomeTeacher })
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

// ─── Icônes noires de l'en-tête ────────────────────────────────────────────
const ICONS = {
  globe: 'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20',
  coins: 'M3 6h18a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1zM12 15a3 3 0 100-6 3 3 0 000 6zM6 12h.01M18 12h.01',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M18 6L6 18M6 6l12 12',
  check: 'M20 6L9 17l-5-5',
  signIn: 'M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 012 2v14a2 2 0 01-2 2h-5',
}
function Icon({ d, className = 'size-5' }: { d: string; className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
}

/** Ferme un menu au clic à l'extérieur et avec Échap. */
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

/** Bouton-icône qui ouvre une petite liste de choix (langue, pays). */
function IconMenu({ icon, label, children }: { icon: string; label: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss(open, close)
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-label={label} title={label} aria-expanded={open} aria-haspopup="true"
        className={cx('grid size-10 cursor-pointer place-items-center rounded-full text-ink transition hover:bg-leaf', open && 'bg-leaf')}>
        <Icon d={icon} />
      </button>
      {open && (
        <div className="absolute end-0 z-40 mt-2 max-h-[70vh] w-64 overflow-y-auto rounded-md border-[1.5px] border-line bg-white py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
          <p className="px-4 pb-1 pt-1.5 text-xs font-bold uppercase tracking-wider text-faint">{label}</p>
          {children(close)}
        </div>
      )}
    </div>
  )
}

function Choice({ on, onClick, children, lang }: { on: boolean; onClick: () => void; children: ReactNode; lang?: string }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={on} lang={lang} onClick={onClick}
      className={cx('flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2 text-start text-[15px] hover:bg-leaf', on && 'font-semibold text-green2')}>
      <span>{children}</span>{on && <Icon d={ICONS.check} className="size-4 shrink-0" />}
    </button>
  )
}

/** Liste des langues, commune au menu-icône et au menu mobile. */
function LanguageChoices({ onPick }: { onPick?: () => void }) {
  const locale = useLocale()
  const t = useT()
  return LOCALES.map((l) => <Choice key={l} lang={l} on={locale === l} onClick={() => { setLocale(l); onPick?.() }}>{t.lang[l]}</Choice>)
}

/** Pays de résidence (et donc devise et fuseau), commun au menu-icône et au menu mobile. */
function PlaceChoices({ onPick }: { onPick?: () => void }) {
  const { place, setPlace } = usePlace()
  const f = useFormat()
  return COUNTRIES.map((c) => (
    <div key={c.code} role="group" aria-label={f.label(c.label)}>
      {c.timezones.map((tz) => (
        <Choice key={tz.id} on={place.country === c.code && place.timezone === tz.id}
          onClick={() => { setPlace({ country: c.code, timezone: tz.id }); onPick?.() }}>
          {c.timezones.length > 1 ? `${f.label(c.label)}, ${tz.label}` : f.label(c.label)} <span className="text-sm font-normal text-faint">{c.currency}</span>
        </Choice>
      ))}
    </div>
  ))
}

function usePlaceCurrency() {
  const { place } = usePlace()
  return COUNTRIES.find((c) => c.code === place.country)?.currency ?? ''
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
        <Link href="/connexion" className="inline-flex min-h-11 items-center gap-2 rounded-[14px] px-3 font-semibold text-ink transition hover:bg-leaf">
          <Icon d={ICONS.signIn} className="size-4" />{t.nav.signIn}
        </Link>
        <Link href="/inscription" className="inline-flex min-h-11 items-center rounded-[14px] bg-green px-5 font-semibold text-white transition hover:bg-green2">{t.nav.signUp}</Link>
      </>
    )
  }
  const first = account.name.split(' ')[0] || account.email
  return (
    <details className="relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[14px] border-[1.5px] border-line bg-white px-3 font-semibold hover:border-green">
        <span aria-hidden className="grid size-7 place-items-center rounded-full bg-green text-sm font-bold text-white">{first[0]?.toUpperCase()}</span>
        {first}
      </summary>
      <div className="absolute end-0 z-20 mt-2 flex min-w-56 flex-col overflow-hidden rounded-md border-[1.5px] border-line bg-white py-1 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
        <span className="truncate px-4 py-2 text-sm text-muted">{account.email}</span>
        {navFor(account, t).filter((n) => n.href !== '/enseignants' && n.href !== '/devenir-enseignant').map((n) => (
          <Link key={n.href} href={n.href} className="px-4 py-2 hover:bg-leaf">{n.label}</Link>
        ))}
        <button type="button" className="cursor-pointer px-4 py-2 text-start hover:bg-leaf"
          onClick={() => signOut.mutate(undefined, { onSettled: () => router.push('/') })}>{t.nav.signOut}</button>
      </div>
    </details>
  )
}

/** Grand écran : langue et pays en icônes, puis connexion et inscription. */
function DesktopTools() {
  const t = useT()
  const currency = usePlaceCurrency()
  return (
    <div className="hidden items-center gap-1 md:flex">
      <IconMenu icon={ICONS.globe} label={t.lang.label}>{(close) => <LanguageChoices onPick={close} />}</IconMenu>
      <IconMenu icon={ICONS.coins} label={t.nav.currency(currency)}>{(close) => <PlaceChoices onPick={close} />}</IconMenu>
      <div className="ms-2 flex items-center gap-2"><AccountArea /></div>
    </div>
  )
}

/** Mobile : une icône menu qui déroule la navigation, la langue, le pays et le compte. */
function MobileMenu() {
  const t = useT()
  const locale = useLocale()
  const account = useAccount()
  const signOut = useSignOut()
  const router = useRouter()
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss(open, close)
  useEffect(() => { setOpen(false) }, [path])
  const section = 'border-t border-line px-1 py-3'
  const heading = 'px-4 pb-1 text-xs font-bold uppercase tracking-wider text-faint'
  return (
    <div ref={ref} className="md:hidden">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="menu-mobile" aria-label={open ? t.nav.closeMenu : t.nav.menu}
        className="grid size-11 cursor-pointer place-items-center rounded-full text-ink hover:bg-leaf">
        <Icon d={open ? ICONS.close : ICONS.menu} className="size-6" />
      </button>
      {open && (
        <div id="menu-mobile" className="absolute inset-x-0 top-full max-h-[calc(100dvh-64px)] overflow-y-auto border-b border-line bg-paper shadow-[0_16px_32px_rgba(0,0,0,0.12)]">
          <nav aria-label={t.nav.main} className="flex flex-col gap-1 p-3">
            {navFor(account, t).map((n) => (
              <Link key={n.href} href={n.href} aria-current={path === n.href ? 'page' : undefined}
                className={cx('rounded-sm px-4 py-3 text-[17px] font-semibold', path === n.href || path.startsWith(`${n.href}/`) ? 'bg-soft text-green2' : 'text-ink hover:bg-leaf')}>{n.label}</Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 border-t border-line px-4 py-3">
            {account ? (
              <>
                <span className="truncate text-sm text-muted">{account.email}</span>
                <button type="button" className="min-h-12 cursor-pointer rounded-[14px] border-[1.5px] border-[#d6d2c7] bg-white font-semibold"
                  onClick={() => signOut.mutate(undefined, { onSettled: () => router.push('/') })}>{t.nav.signOut}</button>
              </>
            ) : (
              <>
                <Link href="/inscription" className="inline-flex min-h-12 items-center justify-center rounded-[14px] bg-green font-semibold text-white">{t.nav.signUp}</Link>
                <Link href="/connexion" className="inline-flex min-h-12 items-center justify-center rounded-[14px] border-[1.5px] border-[#d6d2c7] bg-white font-semibold text-ink">{t.nav.signIn}</Link>
              </>
            )}
          </div>
          <div className={section}>
            <p className={heading}>{t.lang.label}</p>
            <div className="flex gap-2 px-3">
              {LOCALES.map((l) => (
                <button key={l} type="button" lang={l} aria-pressed={locale === l} onClick={() => setLocale(l)}
                  className={cx('min-h-10 flex-1 cursor-pointer rounded-full border-[1.5px] text-[15px] font-semibold', locale === l ? 'border-green bg-green text-white' : 'border-line bg-white text-ink')}>{t.lang[l]}</button>
              ))}
            </div>
          </div>
          <div className={section}><p className={heading}>{t.nav.livesIn}</p><PlaceChoices /></div>
        </div>
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
          <Link href="/devenir-enseignant" className="hover:text-white">{t.nav.becomeTeacher}</Link>
          <Link href="/conditions" className="hover:text-white">{t.footer.terms}</Link>
          <Link href="/confidentialite" className="hover:text-white">{t.footer.privacy}</Link>
          <span className="text-white/60">DATA &amp; BRAIN, Dakar</span>
        </nav>
      </div>
    </footer>
  )
}
