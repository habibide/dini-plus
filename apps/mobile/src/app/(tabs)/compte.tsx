import { COUNTRIES, colors } from '@dini/core'
import { useAccount, usePlace, useSignOut, useStartApplication, useUpdateName } from '@dini/data/react'
import { router } from 'expo-router'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Input, SignInPrompt } from '@/lib/auth'
import { Button, Chip, Section, T } from '@/lib/ui'
import { LOCALE_NAMES, LOCALES, setLocale, useFormat, useT } from '@/lib/i18n'

export default function Compte() {
  const account = useAccount()
  const { place, setPlace } = usePlace()
  const signOut = useSignOut()
  const start = useStartApplication()
  const insets = useSafeAreaInsets()
  const t = useT()
  const m = t.account
  const fmt = useFormat()
  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 110 }}>
      {account === null && <SignInPrompt title={m.title} text={m.prompt} next="/compte" />}
      {account && (
        <Section title={m.title} style={{ paddingTop: 10 }}>
          <T tone="h1">{account.name.trim() || m.title}</T>
          <T tone="muted">{relay(account.email) ? m.roles[account.role] : `${account.email} · ${m.roles[account.role]}`}</T>
        </Section>
      )}
      {account && !account.name.trim() && <AskName />}
      <Section title={m.language}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {LOCALES.map((l) => <Chip key={l} label={LOCALE_NAMES[l]} on={fmt.locale === l} onPress={() => setLocale(l)} />)}
        </View>
      </Section>
      <Section title={m.livesIn}>
        <T tone="muted">{m.livesInText}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {COUNTRIES.flatMap((c) => c.timezones.map((tz) => (
            <Chip key={tz.id} label={c.timezones.length > 1 ? `${fmt.label(c.label)}, ${tz.label}` : fmt.label(c.label)}
              on={place.country === c.code && place.timezone === tz.id} onPress={() => setPlace({ country: c.code, timezone: tz.id })} />
          )))}
        </View>
      </Section>
      {account?.role === 'family' && (
        <Section title={m.teach}>
          <T>{m.teachText}</T>
          <Button title={m.becomeTeacher} kind="ghost" disabled={start.isPending} onPress={() => start.mutate(undefined, { onSuccess: () => router.navigate('/agenda') })} />
        </Section>
      )}
      {account && (
        <View style={{ padding: 20 }}>
          <Button title={signOut.isPending ? m.signingOut : m.signOut} kind="ghost" disabled={signOut.isPending} onPress={() => signOut.mutate(undefined, { onSuccess: () => router.navigate('/') })} />
        </View>
      )}
    </ScrollView>
  )
}

/** Adresse relais d'Apple (« Masquer mon adresse e-mail ») : illisible, on ne l'affiche pas. */
const relay = (email: string) => email.endsWith('@privaterelay.appleid.com')

/** Apple ne transmet pas toujours le nom : on le demande une fois. */
function AskName() {
  const m = useT().account
  const save = useUpdateName()
  const [name, setName] = useState('')
  return (
    <Section title={m.askName} style={{ backgroundColor: colors.sand }}>
      <Input label={m.askName} value={name} onChangeText={setName} placeholder={m.namePlaceholder} autoComplete="name" textContentType="name" maxLength={120} />
      {save.error ? <T style={{ color: colors.bad }}>{save.error.message}</T> : null}
      <Button title={save.isPending ? m.saving : m.save} disabled={save.isPending || name.trim().length < 2} onPress={() => save.mutate(name)} />
      <T tone="muted">{m.whyName}</T>
    </Section>
  )
}
