'use client'

import { useAccount, useUpdatePassword } from '@dini/data/react'
import Link from 'next/link'
import { useState } from 'react'
import { AuthLayout, Field, FormError, PasswordInput, submitCls } from '@/components/auth'

/** Ouverte depuis le lien reçu par e-mail : Supabase a déjà connecté la personne quand la page s'affiche. */
export function ResetScreen() {
  const account = useAccount()
  const update = useUpdatePassword()
  const [password, setPassword] = useState('')
  if (account === null) {
    return (
      <AuthLayout title="Lien expiré">
        <p className="text-lg">Ce lien n’est plus valable. Demandez-en un nouveau.</p>
        <Link href="/mot-de-passe-oublie" className={submitCls}>Recevoir un nouveau lien</Link>
      </AuthLayout>
    )
  }
  if (update.isSuccess) {
    return (
      <AuthLayout title="Mot de passe modifié">
        <Link href={account?.role === 'teacher' ? '/enseignant' : '/suivi'} className={submitCls}>Continuer</Link>
      </AuthLayout>
    )
  }
  return (
    <AuthLayout title="Nouveau mot de passe">
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); update.mutate(password) }}>
        <Field label="Nouveau mot de passe">{(id) => <PasswordInput id={id} value={password} onChange={setPassword} autoComplete="new-password" />}</Field>
        <FormError message={update.error?.message} />
        <button type="submit" className={submitCls} disabled={update.isPending || !account}>Enregistrer</button>
      </form>
    </AuthLayout>
  )
}
