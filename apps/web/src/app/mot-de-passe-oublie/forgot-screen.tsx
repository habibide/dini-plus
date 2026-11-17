'use client'

import { useSendPasswordReset } from '@dini/data/react'
import Link from 'next/link'
import { useState } from 'react'
import { useT } from '@/i18n/locale'
import { AuthLayout, Field, FormError, inputCls, submitCls } from '@/components/auth'

export function ForgotScreen() {
  const send = useSendPasswordReset()
  const [email, setEmail] = useState('')
  const t = useT()
  const m = t.forgot
  if (send.isSuccess) {
    return (
      <AuthLayout title={m.sentTitle}>
        <p className="text-lg">{m.sent(email).before}<strong>{email}</strong>{m.sent(email).after}</p>
        <Link href="/connexion" className="underline">{m.backToLogin}</Link>
      </AuthLayout>
    )
  }
  return (
    <AuthLayout title={m.title}>
      <p className="text-lg">{m.intro}</p>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); send.mutate({ email, redirectTo: `${window.location.origin}/nouveau-mot-de-passe` }) }}>
        <Field label={t.auth.email}>{(id) => <input id={id} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.auth.emailPlaceholder} className={inputCls} />}</Field>
        <FormError message={send.error?.message} />
        <button type="submit" className={submitCls} disabled={send.isPending}>{send.isPending ? t.common.sending : m.submit}</button>
      </form>
      <Link href="/connexion" className="underline">{m.backToLogin}</Link>
    </AuthLayout>
  )
}
