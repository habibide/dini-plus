'use client'

import { useAccount, useSignUp } from '@dini/data/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useT } from '@/i18n/locale'
import { AuthLayout, Divider, Field, FormError, OAuthButtons, PasswordInput, Terms, inputCls, submitCls, useNextPath } from '@/components/auth'

export const StudentSignup = () => <Signup asTeacher={false} />
export const TeacherSignup = () => <Signup asTeacher />

function Signup({ asTeacher }: { asTeacher: boolean }) {
  const account = useAccount()
  const router = useRouter()
  const next = useNextPath(asTeacher ? '/enseignant/candidature' : '/enseignants')
  const signUp = useSignUp()
  const t = useT()
  const m = t.signup
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  useEffect(() => { if (account) router.replace(next) }, [account, next, router])

  if (signUp.data?.needsConfirmation) {
    return (
      <AuthLayout title={m.checkMailTitle}>
        <p className="text-lg">{m.checkMail(email).before}<strong>{email}</strong>{m.checkMail(email).after}</p>
        <p className="text-muted">{m.spam}</p>
        <Link href="/connexion" className={submitCls}>{m.goToLogin}</Link>
      </AuthLayout>
    )
  }

  const action = asTeacher ? m.teacherAction : m.studentAction
  return (
    <AuthLayout title={asTeacher ? m.teacherTitle : m.studentTitle}>
      <p className="text-lg">{m.haveAccount}<Link href="/connexion" className="underline">{m.signIn}</Link></p>
      <OAuthButtons providers={['google', 'apple']} verb={asTeacher ? t.auth.signUpVerb : t.auth.continueVerb} asTeacher={asTeacher} next={next} />
      <Divider />
      <form className="flex flex-col gap-4" onSubmit={(e) => {
        e.preventDefault()
        signUp.mutate({ name, email, password, asTeacher, redirectTo: `${window.location.origin}${next}` })
      }}>
        <Field label={asTeacher ? m.fullName : m.name}>{(id) => <input id={id} required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={m.namePlaceholder} className={inputCls} />}</Field>
        <Field label={t.auth.email}>{(id) => <input id={id} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.auth.emailPlaceholder} className={inputCls} />}</Field>
        <Field label={t.auth.password}>{(id) => <>
          <PasswordInput id={id} value={password} onChange={setPassword} autoComplete="new-password" />
          <span className="text-sm text-muted">{m.passwordHint}</span>
        </>}</Field>
        <FormError message={signUp.error?.message} />
        <button type="submit" className={submitCls} disabled={signUp.isPending}>{signUp.isPending ? m.creating : action}</button>
      </form>
      <Terms action={action} />
    </AuthLayout>
  )
}
