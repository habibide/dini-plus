import { colors } from '@dini/core'
import { useSignUp } from '@dini/data/react'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Divider, FormError, Input, OAuthButtons, PasswordInput, leave } from '@/lib/auth'
import { Button, T } from '@/lib/ui'

export default function Signup() {
  const { teacher, next } = useLocalSearchParams<{ teacher?: string; next?: string }>()
  const asTeacher = teacher === '1'
  const signUp = useSignUp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const done = () => leave(asTeacher ? '/agenda' : next)

  if (signUp.data?.needsConfirmation) {
    return (
      <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ padding: 20, gap: 16 }}>
        <T tone="h1">Vérifiez votre boîte mail</T>
        <T>Nous avons envoyé un lien de confirmation à {email}. Ouvrez-le pour activer votre compte, puis connectez-vous.</T>
        <Button title="Aller à la connexion" onPress={() => router.replace('/login')} />
      </ScrollView>
    )
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}>
        <T tone="h1">{asTeacher ? 'Devenir enseignant sur DINI' : 'Créer un compte élève ou parent'}</T>
        <T>Déjà un compte&nbsp;? <T style={{ color: colors.green, textDecorationLine: 'underline' }} onPress={() => router.replace('/login')}>Se connecter</T></T>
        <OAuthButtons providers={asTeacher ? ['google', 'facebook'] : ['google', 'apple']} verb={asTeacher ? 'S’inscrire' : 'Continuer'} asTeacher={asTeacher} onDone={done} />
        <Divider />
        <Input label="Nom" value={name} onChangeText={setName} autoComplete="name" textContentType="name" placeholder="Votre nom" />
        <Input label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" placeholder="Votre e-mail" />
        <PasswordInput value={password} onChangeText={setPassword} isNew />
        <T tone="muted">8 caractères au minimum.</T>
        <FormError message={signUp.error?.message} />
        <Button title={signUp.isPending ? 'Création du compte…' : asTeacher ? 'Commencer' : 'Créer mon compte'} disabled={signUp.isPending || !name.trim() || !email || password.length < 8}
          onPress={() => signUp.mutate({ name, email, password, asTeacher }, { onSuccess: (r) => { if (!r.needsConfirmation) done() } })} />
        <T tone="muted" style={{ textAlign: 'center' }}>En continuant, vous acceptez les conditions d’utilisation et la politique de confidentialité de DINI.</T>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
