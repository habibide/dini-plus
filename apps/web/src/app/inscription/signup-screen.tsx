'use client'

import { useAccount, useSignUp } from '@dini/data/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthLayout, Divider, Field, FormError, OAuthButtons, PasswordInput, Terms, inputCls, submitCls, useNextPath } from '@/components/auth'

export const StudentSignup = () => <Signup asTeacher={false} />
export const TeacherSignup = () => <Signup asTeacher />

function Signup({ asTeacher }: { asTeacher: boolean }) {
  const account = useAccount()
  const router = useRouter()
  const next = useNextPath(asTeacher ? '/enseignant/candidature' : '/enseignants')
  const signUp = useSignUp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  useEffect(() => { if (account) router.replace(next) }, [account, next, router])

  if (signUp.data?.needsConfirmation) {
    return (
      <AuthLayout title="Vérifiez votre boîte mail">
        <p className="text-lg">Nous avons envoyé un lien de confirmation à <strong>{email}</strong>. Ouvrez-le pour activer votre compte, puis connectez-vous.</p>
        <p className="text-muted">Rien reçu après quelques minutes&nbsp;? Regardez dans les courriers indésirables.</p>
        <Link href="/connexion" className={submitCls}>Aller à la connexion</Link>
      </AuthLayout>
    )
  }

  const action = asTeacher ? 'Commencer' : 'Créer mon compte'
  return (
    <AuthLayout title={asTeacher ? 'Devenir enseignant sur DINI' : 'Créer un compte élève ou parent'}>
      <p className="text-lg">Déjà un compte&nbsp;? <Link href="/connexion" className="underline">Se connecter</Link></p>
      <OAuthButtons providers={asTeacher ? ['google', 'facebook'] : ['google', 'apple']} verb={asTeacher ? 'S’inscrire' : 'Continuer'} asTeacher={asTeacher} next={next} />
      <Divider />
      <form className="flex flex-col gap-4" onSubmit={(e) => {
        e.preventDefault()
        signUp.mutate({ name, email, password, asTeacher, redirectTo: `${window.location.origin}${next}` })
      }}>
        <Field label={asTeacher ? 'Nom complet' : 'Nom'}>{(id) => <input id={id} required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" className={inputCls} />}</Field>
        <Field label="E-mail">{(id) => <input id={id} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Votre e-mail" className={inputCls} />}</Field>
        <Field label="Mot de passe">{(id) => <>
          <PasswordInput id={id} value={password} onChange={setPassword} autoComplete="new-password" />
          <span className="text-sm text-muted">8 caractères au minimum.</span>
        </>}</Field>
        <FormError message={signUp.error?.message} />
        <button type="submit" className={submitCls} disabled={signUp.isPending}>{signUp.isPending ? 'Création du compte…' : action}</button>
      </form>
      <Terms action={action} />
    </AuthLayout>
  )
}
