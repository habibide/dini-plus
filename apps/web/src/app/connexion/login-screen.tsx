'use client'

import { useAccount, useSignIn } from '@dini/data/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthLayout, Divider, Field, FormError, OAuthButtons, PasswordInput, Terms, inputCls, submitCls, useNextPath } from '@/components/auth'

export function LoginScreen() {
  const account = useAccount()
  const router = useRouter()
  const next = useNextPath()
  const signIn = useSignIn()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  useEffect(() => { if (account) router.replace(account.role === 'teacher' && next === '/' ? '/enseignant' : next) }, [account, next, router])
  const suffix = next === '/' ? '' : `?suite=${encodeURIComponent(next)}`

  return (
    <AuthLayout title="Connexion">
      <p className="text-lg"><Link href={`/inscription${suffix}`} className="underline">Créer un compte élève ou parent</Link> ou <Link href="/inscription/enseignant" className="underline">créer un compte enseignant</Link></p>
      <OAuthButtons providers={['google', 'apple']} next={next} />
      <Divider />
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); signIn.mutate({ email, password }) }}>
        <Field label="E-mail">{(id) => <input id={id} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Votre e-mail" className={inputCls} />}</Field>
        <Field label="Mot de passe">{(id) => <PasswordInput id={id} value={password} onChange={setPassword} autoComplete="current-password" />}</Field>
        <Link href="/mot-de-passe-oublie" className="self-start underline">Mot de passe oublié&nbsp;?</Link>
        <FormError message={signIn.error?.message} />
        <button type="submit" className={submitCls} disabled={signIn.isPending}>{signIn.isPending ? 'Connexion…' : 'Se connecter'}</button>
      </form>
      <Terms action="Se connecter" />
    </AuthLayout>
  )
}
