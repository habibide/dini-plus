import { colors } from '@dini/core'
import type { OAuthProvider } from '@dini/data/supabase'
import { useDini } from '@dini/data/react'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Platform, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native'
import { Button, T, font } from './ui'

export function Input({ label, ...p }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T style={{ fontFamily: font.semibold }}>{label}</T>
      <TextInput placeholderTextColor={colors.muted} accessibilityLabel={label} {...p}
        style={[{ minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 4, backgroundColor: colors.white, paddingHorizontal: 14, fontFamily: font.body, fontSize: 16, color: colors.ink }, p.style]} />
    </View>
  )
}

export function PasswordInput({ label = 'Mot de passe', value, onChangeText, isNew }: { label?: string; value: string; onChangeText: (v: string) => void; isNew?: boolean }) {
  const [shown, setShown] = useState(false)
  return (
    <View style={{ gap: 6 }}>
      <T style={{ fontFamily: font.semibold }}>{label}</T>
      <View>
        <TextInput value={value} onChangeText={onChangeText} secureTextEntry={!shown} autoCapitalize="none" autoComplete={isNew ? 'new-password' : 'current-password'}
          textContentType={isNew ? 'newPassword' : 'password'} accessibilityLabel={label} placeholder="Votre mot de passe" placeholderTextColor={colors.muted}
          style={{ minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 4, backgroundColor: colors.white, paddingLeft: 14, paddingRight: 90, fontFamily: font.body, fontSize: 16, color: colors.ink }} />
        <Pressable accessibilityRole="button" onPress={() => setShown(!shown)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, paddingHorizontal: 14, justifyContent: 'center' }}>
          <T style={{ fontFamily: font.semibold, color: colors.green }}>{shown ? 'Masquer' : 'Afficher'}</T>
        </Pressable>
      </View>
    </View>
  )
}

export function FormError({ message }: { message?: string | null }) {
  return message ? <T accessibilityRole="alert" style={{ color: colors.warn, backgroundColor: colors.warnBg, padding: 10 }}>{message}</T> : null
}

export function Divider() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} /><T tone="muted">ou</T><View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
    </View>
  )
}

const LABELS: Record<OAuthProvider, string> = { google: 'Google', facebook: 'Facebook', apple: 'Apple' }

function ProviderIcon({ p }: { p: OAuthProvider }) {
  if (p === 'apple' && Platform.OS === 'ios') return <SymbolView name="apple.logo" size={20} tintColor={colors.ink} />
  const bg = p === 'facebook' ? '#1877F2' : p === 'google' ? colors.white : colors.ink
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, borderWidth: p === 'google' ? 1 : 0, borderColor: colors.line }}>
      <Text style={{ fontFamily: font.bold, fontSize: 13, color: p === 'google' ? '#4285F4' : colors.white }}>{p === 'google' ? 'G' : p === 'facebook' ? 'f' : ''}</Text>
    </View>
  )
}

/** Connexion via le navigateur du système, puis retour dans l'app (dini://auth-callback). */
export function OAuthButtons({ providers, verb = 'Continuer', asTeacher = false, onDone }: { providers: OAuthProvider[]; verb?: string; asTeacher?: boolean; onDone: () => void }) {
  const { api } = useDini()
  const [pending, setPending] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function go(p: OAuthProvider) {
    setPending(p); setError(null)
    try {
      const redirect = Linking.createURL('auth-callback')
      const result = await WebBrowser.openAuthSessionAsync(await api.oauthUrl(p, redirect, asTeacher), redirect)
      if (result.type === 'success') { await api.completeOAuth(result.url); onDone() }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setPending(null)
    }
  }
  return (
    <View style={{ gap: 10 }}>
      {providers.map((p) => (
        <Pressable key={p} accessibilityRole="button" disabled={!!pending} onPress={() => go(p)}
          style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.ink, borderRadius: 4, backgroundColor: pressed ? colors.leaf : colors.white, opacity: pending && pending !== p ? 0.5 : 1 })}>
          <ProviderIcon p={p} />
          <T style={{ fontFamily: font.semibold, fontSize: 17 }}>{pending === p ? 'Connexion…' : `${verb} avec ${LABELS[p]}`}</T>
        </Pressable>
      ))}
      <FormError message={error} />
    </View>
  )
}

/** Après connexion : retour à l'écran demandé (paramètre `next`), sinon à l'écran précédent. */
export function leave(next?: string) {
  if (next) router.replace(next as never)
  else if (router.canGoBack()) router.back()
  else router.replace('/')
}

/** Invite à se connecter, pour les onglets qui demandent un compte. */
export function SignInPrompt({ title, text, next }: { title: string; text: string; next: string }) {
  return (
    <View style={{ padding: 20, gap: 14 }}>
      <T tone="h1">{title}</T>
      <T>{text}</T>
      <Button title="Se connecter" onPress={() => router.push({ pathname: '/login', params: { next } })} />
      <Button title="Créer un compte" kind="ghost" onPress={() => router.push({ pathname: '/signup', params: { next } })} />
    </View>
  )
}
