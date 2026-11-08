'use client'

import type { OAuthProvider, Role } from '@dini/data/supabase'
import { useAccount, useDini } from '@dini/data/react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { buttonCls, cx } from './styles'

const Loading = () => <p className="mx-auto max-w-6xl px-5 py-10 text-muted">Chargement…</p>

/** Page réservée aux comptes connectés (et, si précisé, à certains rôles). Renvoie vers la connexion, puis ici. */
export function RequireAccount({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const account = useAccount()
  const router = useRouter()
  const path = usePathname()
  const search = useSearchParams().toString()
  useEffect(() => {
    if (account === null) router.replace(`/connexion?suite=${encodeURIComponent(path + (search ? `?${search}` : ''))}`)
  }, [account, router, path, search])
  if (!account) return <Loading />
  if (roles && !roles.includes(account.role)) {
    return <p className="mx-auto max-w-6xl px-5 py-10">Cette page n’est pas accessible avec ce compte. <Link href="/" className="underline">Retour à l’accueil</Link></p>
  }
  return children
}

/** Adresse de retour après connexion : uniquement un chemin du site, jamais une autre origine (y compris « /\\site.com »). */
export function useNextPath(fallback = '/') {
  const next = useSearchParams().get('suite')
  if (!next) return fallback
  try {
    const u = new URL(next, window.location.origin)
    // « /.//site.com » se normalise en « //site.com » : une seule barre en tête, sinon l'adresse sortirait du site.
    return u.origin === window.location.origin ? `/${u.pathname.replace(/^[/\\]+/, '')}${u.search}${u.hash}` : fallback
  } catch {
    return fallback
  }
}

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-5 px-5 py-12">
      <h1 className="font-display text-4xl">{title}</h1>
      {children}
    </div>
  )
}

export function Divider() {
  return <div className="flex items-center gap-4 text-muted"><span className="h-px flex-1 bg-line" />ou<span className="h-px flex-1 bg-line" /></div>
}

export function Terms({ action }: { action: string }) {
  return (
    <p className="text-center text-sm text-muted">
      En cliquant sur « {action} » ou « Continuer avec », vous acceptez les <Link href="/conditions" className="underline">conditions d’utilisation</Link> et
      la <Link href="/confidentialite" className="underline">politique de confidentialité</Link> de DINE.
    </p>
  )
}

export function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return <div className="flex flex-col gap-1.5"><label htmlFor={id} className="font-semibold">{label}</label>{children(id)}</div>
}

export const inputCls = 'min-h-12 w-full rounded-sm border border-line bg-white px-3.5 text-base outline-offset-0 focus:border-green'

export function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: 'current-password' | 'new-password' }) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <input id={id} type={shown ? 'text' : 'password'} required minLength={autoComplete === 'new-password' ? 8 : undefined} value={value}
        onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} placeholder="Votre mot de passe" className={cx(inputCls, 'pr-12')} />
      <button type="button" onClick={() => setShown(!shown)} aria-label={shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={shown}
        className="absolute inset-y-0 right-0 grid w-12 cursor-pointer place-items-center text-muted hover:text-ink">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
          {shown && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  )
}

export function FormError({ message }: { message?: string | null }) {
  return message ? <p role="alert" className="bg-warnbg px-3 py-2 text-warn">{message}</p> : null
}

const PROVIDERS: Record<OAuthProvider, { label: string; icon: ReactNode }> = {
  google: {
    label: 'Google',
    icon: (
      <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
    ),
  },
  apple: {
    label: 'Apple',
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path fill="currentColor" d="M16.37 12.6c-.02-2.3 1.88-3.4 1.97-3.46-1.07-1.57-2.74-1.78-3.33-1.8-1.42-.14-2.77.83-3.49.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.78 2.29-1.61 2.8-.41 6.94 1.16 9.21.77 1.11 1.68 2.36 2.88 2.31 1.16-.05 1.59-.75 2.99-.75 1.4 0 1.79.75 3.01.72 1.24-.02 2.03-1.13 2.79-2.25.88-1.29 1.24-2.54 1.26-2.6-.03-.01-2.42-.93-2.45-3.69zM14.09 5.84c.64-.77 1.07-1.85.95-2.92-.92.04-2.03.61-2.69 1.38-.59.68-1.11 1.77-.97 2.82 1.03.08 2.07-.52 2.71-1.28z" />
      </svg>
    ),
  },
}

/** Boutons « Continuer avec ». Google et Apple doivent être activés dans Supabase (Authentication, Providers). */
export function OAuthButtons({ providers, verb = 'Continuer', asTeacher = false, next = '/' }: { providers: OAuthProvider[]; verb?: string; asTeacher?: boolean; next?: string }) {
  const { api } = useDini()
  const [pending, setPending] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function go(p: OAuthProvider) {
    setPending(p); setError(null)
    try {
      window.location.assign(await api.oauthUrl(p, `${window.location.origin}${next}`, asTeacher))
    } catch (e) {
      setPending(null); setError(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <div className="flex flex-col gap-3">
      {providers.map((p) => (
        <button key={p} type="button" onClick={() => go(p)} disabled={!!pending}
          className="flex min-h-13 cursor-pointer items-center justify-center gap-3 rounded-sm border-2 border-ink bg-white px-4 text-lg font-semibold hover:bg-leaf disabled:cursor-wait disabled:opacity-60">
          {PROVIDERS[p].icon}{pending === p ? 'Redirection…' : `${verb} avec ${PROVIDERS[p].label}`}
        </button>
      ))}
      <FormError message={error} />
    </div>
  )
}

export const submitCls = cx(buttonCls.primary, 'min-h-13 w-full text-lg')
