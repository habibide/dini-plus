'use client'

import { COUNTRIES } from '@dini/core'
import { useAccount, useDini, usePlace, useSignOut } from '@dini/data/react'
import type { Account } from '@dini/data/supabase'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { ClientOnly } from './client-only'
import { cx } from './styles'

/** Erreur de chargement (réseau, accès refusé), sous l'en-tête. */
export function ErrorBanner() {
  const { error, clearError } = useDini()
  if (!error) return null
  return (
    <div role="alert" className="flex items-start gap-3 bg-warnbg px-4 py-2 text-[14px] text-warn">
      <span className="flex-1">Chargement impossible : {error}</span>
      <button type="button" className="cursor-pointer underline" onClick={clearError}>Fermer</button>
    </div>
  )
}

type NavItem = { href: string; label: string }

function navFor(account: Account | null | undefined): NavItem[] {
  const items: NavItem[] = [{ href: '/enseignants', label: 'Trouver un enseignant' }]
  if (account?.role === 'teacher') items.push({ href: '/enseignant', label: 'Espace enseignant' })
  else if (account) items.push({ href: '/suivi', label: 'Suivi' })
  if (account?.role === 'moderator' || account?.role === 'admin') items.push({ href: '/moderation', label: 'Modération' })
  if (!account || account.role === 'family') items.push({ href: '/devenir-enseignant', label: 'Devenir enseignant' })
  return items
}

function NavLinks({ path }: { path: string }) {
  const account = useAccount()
  return navFor(account).map((n) => (
    <Link key={n.href} href={n.href} aria-current={path === n.href ? 'page' : undefined}
      className={cx('border-b-2 py-2', path === n.href || path.startsWith(`${n.href}/`) ? 'border-ochre' : 'border-transparent hover:border-sand')}>{n.label}</Link>
  ))
}

function ActiveNavLinks() {
  return <NavLinks path={usePathname()} />
}

function PlaceSelect() {
  const { place, setPlace } = usePlace()
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm text-muted"><span className="hidden sm:inline">J’habite</span>
      <select value={`${place.country}|${place.timezone}`}
        onChange={(e) => { const [c, tz] = e.target.value.split('|'); setPlace({ country: c as typeof place.country, timezone: tz }) }}
        aria-label="J’habite" className="min-w-0 max-w-48 rounded-sm border border-line bg-white px-2 py-1.5 text-ink">
        {COUNTRIES.map((c) => (
          <optgroup key={c.code} label={`${c.label.fr} (${c.currency})`}>
            {c.timezones.map((tz) => <option key={tz.id} value={`${c.code}|${tz.id}`}>{c.timezones.length > 1 ? `${c.label.fr}, ${tz.label}` : c.label.fr}</option>)}
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
  if (account === undefined) return <span className="h-11 w-36" />
  if (!account) {
    return (
      <Link href="/connexion" className="inline-flex min-h-11 items-center gap-2 rounded-sm border-2 border-ink px-4 font-semibold hover:bg-leaf">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 012 2v14a2 2 0 01-2 2h-5" /></svg>
        Se connecter
      </Link>
    )
  }
  const first = account.name.split(' ')[0] || account.email
  return (
    <details className="relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-sm border border-line bg-white px-3 font-semibold hover:border-green">
        <span aria-hidden className="grid size-7 place-items-center rounded-full bg-leaf font-display text-sm text-green">{first[0]?.toUpperCase()}</span>
        {first}
      </summary>
      <div className="absolute right-0 z-20 mt-1 flex min-w-56 flex-col border border-line bg-white py-1 shadow-lg">
        <span className="truncate px-4 py-2 text-sm text-muted">{account.email}</span>
        {navFor(account).filter((n) => n.href !== '/enseignants' && n.href !== '/devenir-enseignant').map((n) => (
          <Link key={n.href} href={n.href} className="px-4 py-2 hover:bg-leaf">{n.label}</Link>
        ))}
        <button type="button" className="cursor-pointer px-4 py-2 text-left hover:bg-leaf"
          onClick={() => signOut.mutate(undefined, { onSettled: () => router.push('/') })}>Se déconnecter</button>
      </div>
    </details>
  )
}

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3">
        <Link href="/" className="flex items-baseline" aria-label="DINE, accueil">
          <span className="font-display text-[26px] text-green">DINE</span>
        </Link>
        <nav aria-label="Navigation principale" className="flex flex-1 flex-wrap gap-x-6">
          <ClientOnly fallback={null}><Suspense fallback={<NavLinks path="" />}><ActiveNavLinks /></Suspense></ClientOnly>
        </nav>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <ClientOnly fallback={null}><PlaceSelect /><AccountArea /></ClientOnly>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-ink text-[#c9cfc9]">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-6 px-5 py-10 text-sm">
        <div className="flex max-w-prose flex-col gap-2">
          <span className="font-display text-xl text-paper">DINE</span>
          <p>DINE met en relation et ne prend pas position doctrinale. Tous les madhahib et toutes les riwayat sont accueillis, affichés en toute transparence.</p>
        </div>
        <nav aria-label="Informations" className="flex flex-col gap-1 self-end">
          <Link href="/devenir-enseignant" className="hover:text-paper">Devenir enseignant</Link>
          <Link href="/conditions" className="hover:text-paper">Conditions d’utilisation</Link>
          <Link href="/confidentialite" className="hover:text-paper">Confidentialité</Link>
          <span className="text-[#8e9a93]">DATA &amp; BRAIN, Dakar</span>
        </nav>
      </div>
    </footer>
  )
}
