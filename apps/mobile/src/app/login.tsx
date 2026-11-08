import { colors } from '@dini/core'
import { useSignIn } from '@dini/data/react'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native'
import { Divider, FormError, Input, OAuthButtons, PasswordInput, leave } from '@/lib/auth'
import { Button, T, font } from '@/lib/ui'

export default function Login() {
  const { next } = useLocalSearchParams<{ next?: string }>()
  const signIn = useSignIn()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}>
        <T tone="h1">Connexion</T>
        <T>
          <T style={{ color: colors.green, textDecorationLine: 'underline' }} onPress={() => router.push({ pathname: '/signup', params: next ? { next } : {} })}>Créer un compte élève ou parent</T>
          {' ou '}
          <T style={{ color: colors.green, textDecorationLine: 'underline' }} onPress={() => router.push({ pathname: '/signup', params: { teacher: '1' } })}>créer un compte enseignant</T>
        </T>
        <OAuthButtons providers={['google', 'apple']} onDone={() => leave(next)} />
        <Divider />
        <Input label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" placeholder="Votre e-mail" />
        <PasswordInput value={password} onChangeText={setPassword} />
        <Pressable onPress={() => router.push('/forgot')} style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}>
          <T style={{ textDecorationLine: 'underline' }}>Mot de passe oublié&nbsp;?</T>
        </Pressable>
        <FormError message={signIn.error?.message} />
        <Button title={signIn.isPending ? 'Connexion…' : 'Se connecter'} disabled={signIn.isPending || !email || !password}
          onPress={() => signIn.mutate({ email, password }, { onSuccess: () => leave(next) })} />
        <T tone="muted" style={{ textAlign: 'center', fontFamily: font.body }}>En continuant, vous acceptez les conditions d’utilisation et la politique de confidentialité de DINI.</T>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
