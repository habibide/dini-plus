'use client'

import { COUNTRIES } from '@dini/core'
import { useAccount, useDini, usePlace, useSignOut } from '@dini/data/react'
import type { Account } from '@dini/data/supabase'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { ClientOnly } from './client-only'
import { DineLogo } from './logo'
import { cx } from './styles'
import { LanguageSelect, useFormat, useT } from '@/i18n/locale'

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

function PlaceSelect() {
  const { place, setPlace } = usePlace()
  const t = useT()
  const f = useFormat()
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm text-muted"><span className="hidden sm:inline">{t.nav.livesIn}</span>
      <select value={`${place.country}|${place.timezone}`}
        onChange={(e) => { const [c, tz] = e.target.value.split('|'); setPlace({ country: c as typeof place.country, timezone: tz }) }}
        aria-label={t.nav.livesIn} className="min-h-10 min-w-0 max-w-48 rounded-sm border-[1.5px] border-[#e1ddd2] bg-white px-2.5 text-ink">
        {COUNTRIES.map((c) => (
          <optgroup key={c.code} label={`${f.label(c.label)} (${c.currency})`}>
            {c.timezones.map((tz) => <option key={tz.id} value={`${c.code}|${tz.id}`}>{c.timezones.length > 1 ? `${f.label(c.label)}, ${tz.label}` : f.label(c.label)}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
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
      <Link href="/connexion" className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-green px-4 font-semibold text-white transition hover:bg-green2">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 012 2v14a2 2 0 01-2 2h-5" /></svg>
        {t.nav.signIn}
      </Link>
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

export function SiteHeader() {
  const t = useT()
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
        <Link href="/" className="flex items-center" aria-label={t.nav.home}>
          <DineLogo />
        </Link>
        <nav aria-label={t.nav.main} className="flex flex-1 flex-wrap gap-x-1">
          <ClientOnly fallback={null}><Suspense fallback={<NavLinks path="" />}><ActiveNavLinks /></Suspense></ClientOnly>
        </nav>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <ClientOnly fallback={null}><LanguageSelect /><PlaceSelect /><AccountArea /></ClientOnly>
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
