'use client'

import { COUNTRIES, formatDateTime } from '@dini/core'
import { useAdvanceClock, useDini, useFamily, useResetDemo, useSetResidence } from '@dini/data/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { cx } from './ui'

export function DemoBar() {
  const { api, familyId, setFamilyId } = useDini()
  const family = useFamily()
  const advance = useAdvanceClock()
  const reset = useResetDemo()
  const tz = family.data?.family.timezone ?? 'Europe/Paris'
  // L'horloge de démo ne se lit qu'après le rendu : le serveur n'a pas d'heure à afficher.
  const [clock, setClock] = useState<number | null>(null)
  useEffect(() => {
    const read = () => setClock(api.now() - Date.now() > 60_000 ? api.now() : null)
    read()
    const id = setInterval(read, 1000)
    return () => clearInterval(id)
  }, [api])
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 bg-ink px-4 py-1.5 text-[13px] text-[#e8e6da]">
      <span className="text-sand">Démo : personnes, avis et paiements fictifs.</span>
      <label className="flex items-center gap-1.5">Compte
        <select value={familyId} onChange={(e) => setFamilyId(e.target.value)} className="rounded-sm border border-[#46544f] bg-[#2c3935] px-1.5 py-0.5">
          <option value="fam-diop">Fatou Diop, parent (Paris)</option>
          <option value="fam-sarr">Marème Sarr, élève adulte (Dakar)</option>
        </select>
      </label>
      {clock && <span className="text-sand">Horloge : {formatDateTime(clock, tz)}</span>}
      <span className="ml-auto flex gap-2">
        <button type="button" className="cursor-pointer rounded-sm border border-[#46544f] px-2 py-0.5 hover:bg-[#2c3935]" onClick={() => advance.mutate(48)}>Avancer de 48 h</button>
        <button type="button" className="cursor-pointer rounded-sm border border-[#46544f] px-2 py-0.5 hover:bg-[#2c3935]" onClick={() => reset.mutate(undefined)}>Réinitialiser</button>
      </span>
    </div>
  )
}

const NAV = [
  { href: '/enseignants', label: 'Trouver un enseignant' },
  { href: '/suivi', label: 'Suivi' },
  { href: '/#enseigner', label: 'Devenir enseignant' },
]

function ActiveNavLinks() {
  return <NavLinks path={usePathname()} />
}

function NavLinks({ path }: { path: string }) {
  return NAV.map((n) => (
    <Link key={n.href} href={n.href} aria-current={path === n.href ? 'page' : undefined}
      className={cx('border-b-2 py-2', path.startsWith(n.href) && n.href !== '/#enseigner' ? 'border-ochre' : 'border-transparent hover:border-sand')}>{n.label}</Link>
  ))
}

export function SiteHeader() {
  const family = useFamily()
  const setResidence = useSetResidence()
  const current = family.data?.family
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3">
        <Link href="/" className="flex items-baseline gap-2" aria-label="DINI, accueil">
          <span className="font-display text-[26px] text-green">DINI</span>
          <span lang="ar" dir="rtl" className="font-arabic text-2xl text-ochre">ديني</span>
        </Link>
        <nav aria-label="Navigation principale" className="flex flex-1 flex-wrap gap-x-6">
          <Suspense fallback={<NavLinks path="" />}><ActiveNavLinks /></Suspense>
        </nav>
        {current && (
          <label className="flex items-center gap-2 text-sm text-muted">J’habite
            <select
              value={`${current.country}|${current.timezone}`}
              onChange={(e) => { const [c, tz] = e.target.value.split('|'); setResidence.mutate({ country: c as typeof current.country, timezone: tz }) }}
              className="rounded-sm border border-line bg-white px-2 py-1.5 text-ink">
              {COUNTRIES.map((c) => (
                <optgroup key={c.code} label={`${c.label.fr} (${c.currency})`}>
                  {c.timezones.map((tz) => <option key={tz.id} value={`${c.code}|${tz.id}`}>{c.timezones.length > 1 ? `${c.label.fr}, ${tz.label}` : c.label.fr}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        )}
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-ink text-[#c9cfc9]">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-6 px-5 py-10 text-sm">
        <div className="flex max-w-prose flex-col gap-2">
          <span className="font-display text-xl text-paper">DINI</span>
          <p>DINI met en relation et ne prend pas position doctrinale. Tous les madhahib et toutes les riwayat sont accueillis, affichés en toute transparence.</p>
        </div>
        <p className="self-end text-[#8e9a93]">DATA &amp; BRAIN, Dakar. Version de démonstration, données fictives.</p>
      </div>
    </footer>
  )
}
