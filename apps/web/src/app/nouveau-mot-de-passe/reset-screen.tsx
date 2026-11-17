'use client'

import { useAccount, useUpdatePassword } from '@dini/data/react'
import Link from 'next/link'
import { useState } from 'react'
import { useT } from '@/i18n/locale'
import { AuthLayout, Field, FormError, PasswordInput, submitCls } from '@/components/auth'

/** Ouverte depuis le lien reçu par e-mail : Supabase a déjà connecté la personne quand la page s'affiche. */
export function ResetScreen() {
  const account = useAccount()
  const update = useUpdatePassword()
  const [password, setPassword] = useState('')
  const t = useT()
  const m = t.reset
  if (account === null) {
    return (
      <AuthLayout title={m.expiredTitle}>
        <p className="text-lg">{m.expired}</p>
        <Link href="/mot-de-passe-oublie" className={submitCls}>{m.newLink}</Link>
      </AuthLayout>
    )
  }
  if (update.isSuccess) {
    return (
      <AuthLayout title={m.doneTitle}>
        <Link href={account?.role === 'teacher' ? '/enseignant' : '/suivi'} className={submitCls}>{t.common.continue}</Link>
      </AuthLayout>
    )
  }
  return (
    <AuthLayout title={m.title}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); update.mutate(password) }}>
        <Field label={m.label}>{(id) => <PasswordInput id={id} value={password} onChange={setPassword} autoComplete="new-password" />}</Field>
        <FormError message={update.error?.message} />
        <button type="submit" className={submitCls} disabled={update.isPending || !account}>{t.common.save}</button>
      </form>
    </AuthLayout>
  )
}
