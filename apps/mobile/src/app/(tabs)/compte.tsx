import { COUNTRIES, colors } from '@dini/core'
import { useAccount, usePlace, useSignOut, useStartApplication } from '@dini/data/react'
import { router } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SignInPrompt } from '@/lib/auth'
import { Button, Chip, Section, T } from '@/lib/ui'

const ROLES = { family: 'Élève ou parent', teacher: 'Enseignant', moderator: 'Modération', admin: 'Administration' } as const

export default function Compte() {
  const account = useAccount()
  const { place, setPlace } = usePlace()
  const signOut = useSignOut()
  const start = useStartApplication()
  const insets = useSafeAreaInsets()
  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 110 }}>
      {account === null && <SignInPrompt title="Mon compte" text="Connectez-vous pour réserver, suivre les progrès de vos enfants ou enseigner sur DINI." next="/compte" />}
      {account && (
        <Section title="Mon compte" style={{ paddingTop: 10 }}>
          <T tone="h1">{account.name || account.email}</T>
          <T tone="muted">{account.email} · {ROLES[account.role]}</T>
        </Section>
      )}
      <Section title="J’habite">
        <T tone="muted">Les prix s’affichent dans votre devise, les horaires dans votre fuseau.</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {COUNTRIES.flatMap((c) => c.timezones.map((tz) => (
            <Chip key={tz.id} label={c.timezones.length > 1 ? `${c.label.fr}, ${tz.label}` : c.label.fr}
              on={place.country === c.code && place.timezone === tz.id} onPress={() => setPlace({ country: c.code, timezone: tz.id })} />
          )))}
        </View>
      </Section>
      {account?.role === 'family' && (
        <Section title="Enseigner sur DINI">
          <T>Diplômé, porteur d’une ijaza, imam ou maître de daara : proposez vos cours aux familles.</T>
          <Button title="Devenir enseignant" kind="ghost" disabled={start.isPending} onPress={() => start.mutate(undefined, { onSuccess: () => router.navigate('/agenda') })} />
        </Section>
      )}
      {account && (
        <View style={{ padding: 20 }}>
          <Button title={signOut.isPending ? 'Déconnexion…' : 'Se déconnecter'} kind="ghost" disabled={signOut.isPending} onPress={() => signOut.mutate(undefined, { onSuccess: () => router.navigate('/') })} />
        </View>
      )}
    </ScrollView>
  )
}
