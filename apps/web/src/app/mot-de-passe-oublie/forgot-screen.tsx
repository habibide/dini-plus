'use client'

import { useSendPasswordReset } from '@dini/data/react'
import Link from 'next/link'
import { useState } from 'react'
import { AuthLayout, Field, FormError, inputCls, submitCls } from '@/components/auth'

export function ForgotScreen() {
  const send = useSendPasswordReset()
  const [email, setEmail] = useState('')
  if (send.isSuccess) {
    return (
      <AuthLayout title="E-mail envoyé">
        <p className="text-lg">Si un compte existe pour <strong>{email}</strong>, vous allez recevoir un lien pour choisir un nouveau mot de passe.</p>
        <Link href="/connexion" className="underline">Retour à la connexion</Link>
      </AuthLayout>
    )
  }
  return (
    <AuthLayout title="Mot de passe oublié">
      <p className="text-lg">Indiquez votre e-mail : nous vous envoyons un lien pour en choisir un nouveau.</p>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); send.mutate({ email, redirectTo: `${window.location.origin}/nouveau-mot-de-passe` }) }}>
        <Field label="E-mail">{(id) => <input id={id} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Votre e-mail" className={inputCls} />}</Field>
        <FormError message={send.error?.message} />
        <button type="submit" className={submitCls} disabled={send.isPending}>{send.isPending ? 'Envoi…' : 'Recevoir le lien'}</button>
      </form>
      <Link href="/connexion" className="underline">Retour à la connexion</Link>
    </AuthLayout>
  )
}
