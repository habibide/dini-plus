import { colors } from '@dini/core'
import type { OAuthProvider } from '@dini/data/supabase'
import { useAuthProviders, useDini } from '@dini/data/react'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import { Platform, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native'
import { Button, T, font } from './ui'
import { useT } from './i18n'

export function Input({ label, ...p }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T style={{ fontFamily: font.semibold }}>{label}</T>
      <TextInput placeholderTextColor={colors.muted} accessibilityLabel={label} {...p}
        style={[{ minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 4, backgroundColor: colors.white, paddingHorizontal: 14, fontFamily: font.body, fontSize: 16, color: colors.ink }, p.style]} />
    </View>
  )
}

export function PasswordInput({ label: labelProp, value, onChangeText, isNew }: { label?: string; value: string; onChangeText: (v: string) => void; isNew?: boolean }) {
  const [shown, setShown] = useState(false)
  const t = useT().auth
  const label = labelProp ?? t.password
  return (
    <View style={{ gap: 6 }}>
      <T style={{ fontFamily: font.semibold }}>{label}</T>
      <View>
        <TextInput value={value} onChangeText={onChangeText} secureTextEntry={!shown} autoCapitalize="none" autoComplete={isNew ? 'new-password' : 'current-password'}
          textContentType={isNew ? 'newPassword' : 'password'} accessibilityLabel={label} placeholder={t.passwordPlaceholder} placeholderTextColor={colors.muted}
          style={{ minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 4, backgroundColor: colors.white, paddingStart: 14, paddingEnd: 90, fontFamily: font.body, fontSize: 16, color: colors.ink }} />
        <Pressable accessibilityRole="button" onPress={() => setShown(!shown)} style={{ position: 'absolute', end: 0, top: 0, bottom: 0, paddingHorizontal: 14, justifyContent: 'center' }}>
          <T style={{ fontFamily: font.semibold, color: colors.green }}>{shown ? t.hide : t.show}</T>
        </Pressable>
      </View>
    </View>
  )
}

export function FormError({ message }: { message?: string | null }) {
  return message ? <T accessibilityRole="alert" style={{ color: colors.warn, backgroundColor: colors.warnBg, padding: 10 }}>{message}</T> : null
}

/** Séparateur « ou », affiché seulement si au moins un bouton Google ou Apple est actif. */
export function Divider() {
  const enabled = useAuthProviders().data ?? []
  const t = useT()
  if (!enabled.length) return null
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} /><T tone="muted">{t.auth.or}</T><View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
    </View>
  )
}

const LABELS: Record<OAuthProvider, string> = { google: 'Google', apple: 'Apple' }

function ProviderIcon({ p }: { p: OAuthProvider }) {
  if (p === 'apple') return <SymbolView name="apple.logo" size={20} tintColor={colors.ink} />
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }}>
      <Text style={{ fontFamily: font.bold, fontSize: 13, color: '#4285F4' }}>G</Text>
    </View>
  )
}

/** Nom complet transmis par Apple (première connexion uniquement). */
const appleName = (n: AppleAuthentication.AppleAuthenticationFullName | null) =>
  n ? [n.givenName, n.middleName, n.familyName].filter(Boolean).join(' ') : null

/**
 * Boutons « Continuer avec ». Sur iPhone, Apple passe par la connexion native du système (bouton officiel d'Apple) ;
 * Google, et Apple ailleurs, passent par le navigateur du système puis reviennent dans l'app (dine://auth-callback).
 */
export function OAuthButtons({ providers: wanted, signUp = false, asTeacher = false, onDone }: { providers: OAuthProvider[]; signUp?: boolean; asTeacher?: boolean; onDone: () => void }) {
  const { api } = useDini()
  const t = useT().auth
  const verb = signUp ? t.signUpVerb : t.continueVerb
  const enabled = useAuthProviders().data ?? []
  const providers = wanted.filter((p) => enabled.includes(p))
  const [pending, setPending] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nativeApple, setNativeApple] = useState(false)
  useEffect(() => { if (Platform.OS === 'ios') void AppleAuthentication.isAvailableAsync().then(setNativeApple) }, [])

  async function run(p: OAuthProvider, flow: () => Promise<boolean>) {
    setPending(p); setError(null)
    try {
      if (await flow()) onDone()
    } catch (e) {
      // L'utilisateur a fermé la fenêtre Apple : ce n'est pas une erreur à afficher.
      if ((e as { code?: string }).code !== 'ERR_REQUEST_CANCELED') setError(e instanceof Error ? e.message : String(e))
    } finally {
      setPending(null)
    }
  }

  const browser = (p: OAuthProvider) => run(p, async () => {
    const redirect = Linking.createURL('auth-callback')
    const result = await WebBrowser.openAuthSessionAsync(await api.oauthUrl(p, redirect, asTeacher), redirect)
    if (result.type !== 'success') return false
    await api.completeOAuth(result.url)
    return true
  })

  const apple = () => run('apple', async () => {
    // Nonce à usage unique : Apple signe son empreinte, Supabase vérifie la valeur brute. Un jeton intercepté ne peut pas être rejoué.
    const nonce = Crypto.randomUUID()
    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce)
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    })
    if (!credential.identityToken) throw new Error(t.appleNoToken)
    await api.signInWithApple(credential.identityToken, nonce, appleName(credential.fullName), asTeacher)
    return true
  })

  if (!providers.length) return null
  return (
    <View style={{ gap: 10 }}>
      {providers.map((p) => p === 'apple' && nativeApple ? (
        <AppleAuthentication.AppleAuthenticationButton key={p} onPress={apple} cornerRadius={4} style={{ height: 52, opacity: pending ? 0.5 : 1 }}
          buttonType={signUp ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP : AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE} />
      ) : (
        <Pressable key={p} accessibilityRole="button" disabled={!!pending} onPress={() => browser(p)}
          style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.ink, borderRadius: 4, backgroundColor: pressed ? colors.leaf : colors.white, opacity: pending && pending !== p ? 0.5 : 1 })}>
          <ProviderIcon p={p} />
          <T style={{ fontFamily: font.semibold, fontSize: 17 }}>{pending === p ? t.connecting : t.continueWith(verb, LABELS[p])}</T>
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
  const t = useT().auth
  return (
    <View style={{ padding: 20, gap: 14 }}>
      <T tone="h1">{title}</T>
      <T>{text}</T>
      <Button title={t.signIn} onPress={() => router.push({ pathname: '/login', params: { next } })} />
      <Button title={t.createAccount} kind="ghost" onPress={() => router.push({ pathname: '/signup', params: { next } })} />
    </View>
  )
}
