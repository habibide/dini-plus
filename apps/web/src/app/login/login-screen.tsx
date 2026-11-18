'use client'

import { useAccount, useSignIn } from '@dini/data/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useT } from '@/i18n/locale'
import { AuthLayout, Divider, Field, FormError, OAuthButtons, PasswordInput, Terms, inputCls, submitCls, useNextPath } from '@/components/auth'

export function LoginScreen() {
  const account = useAccount()
  const router = useRouter()
  const next = useNextPath()
  const signIn = useSignIn()
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  useEffect(() => { if (account) router.replace(account.role === 'teacher' && next === '/' ? '/teacher' : next) }, [account, next, router])
  const suffix = next === '/' ? '' : `?next=${encodeURIComponent(next)}`

  return (
    <AuthLayout title={t.login.title}>
      <p className="text-lg"><Link href={`/signup${suffix}`} className="underline">{t.login.createStudent}</Link>{t.login.or}<Link href="/signup/teacher" className="underline">{t.login.createTeacher}</Link></p>
      <OAuthButtons providers={['google', 'apple']} next={next} />
      <Divider />
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); signIn.mutate({ email, password }) }}>
        <Field label={t.auth.email}>{(id) => <input id={id} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.auth.emailPlaceholder} className={inputCls} />}</Field>
        <Field label={t.auth.password}>{(id) => <PasswordInput id={id} value={password} onChange={setPassword} autoComplete="current-password" />}</Field>
        <Link href="/forgot-password" className="self-start underline">{t.login.forgot}</Link>
        <FormError message={signIn.error?.message} />
        <button type="submit" className={submitCls} disabled={signIn.isPending}>{signIn.isPending ? t.login.submitting : t.login.submit}</button>
      </form>
      <Terms action={t.login.submit} />
    </AuthLayout>
  )
}
