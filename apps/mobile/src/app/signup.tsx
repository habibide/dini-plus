import { colors } from '@dini/core'
import { useSignUp } from '@dini/data/react'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Divider, FormError, Input, OAuthButtons, PasswordInput, leave } from '@/lib/auth'
import { Button, T } from '@/lib/ui'
import { useT } from '@/lib/i18n'

export default function Signup() {
  const { teacher, next } = useLocalSearchParams<{ teacher?: string; next?: string }>()
  const asTeacher = teacher === '1'
  const signUp = useSignUp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const t = useT()
  const m = t.signup
  const done = () => leave(asTeacher ? '/agenda' : next)

  if (signUp.data?.needsConfirmation) {
    return (
      <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ padding: 20, gap: 16 }}>
        <T tone="h1">{m.checkTitle}</T>
        <T>{m.check(email)}</T>
        <Button title={m.goToLogin} onPress={() => router.replace('/login')} />
      </ScrollView>
    )
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}>
        <T tone="h1">{asTeacher ? m.teacherTitle : m.studentTitle}</T>
        <T>{m.haveAccount}<T style={{ color: colors.green, textDecorationLine: 'underline' }} onPress={() => router.replace('/login')}>{t.auth.signIn}</T></T>
        <OAuthButtons providers={['google', 'apple']} signUp={asTeacher} asTeacher={asTeacher} onDone={done} />
        <Divider />
        <Input label={m.name} value={name} onChangeText={setName} autoComplete="name" textContentType="name" placeholder={m.namePlaceholder} />
        <Input label={t.auth.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" placeholder={t.auth.emailPlaceholder} />
        <PasswordInput value={password} onChangeText={setPassword} isNew />
        <T tone="muted">{m.passwordHint}</T>
        <FormError message={signUp.error?.message} />
        <Button title={signUp.isPending ? m.creating : asTeacher ? m.teacherAction : m.studentAction} disabled={signUp.isPending || !name.trim() || !email || password.length < 8}
          onPress={() => signUp.mutate({ name, email, password, asTeacher }, { onSuccess: (r) => { if (!r.needsConfirmation) done() } })} />
        <T tone="muted" style={{ textAlign: 'center' }}>{t.auth.terms}</T>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
