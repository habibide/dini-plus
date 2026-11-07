import { COUNTRIES, SUBJECTS, colors } from '@dini/core'
import { useDini, useFamily, useResetDemo, useSetResidence } from '@dini/data/react'
import { router } from 'expo-router'
import { Pressable, ScrollView, View } from 'react-native'
import { Button, Chip, T, font } from '@/lib/ui'

export default function Home() {
  const family = useFamily()
  const setResidence = useSetResidence()
  const reset = useResetDemo()
  const { familyId, setFamilyId } = useDini()
  const current = family.data?.family

  return (
    <ScrollView style={{ backgroundColor: colors.green }} contentContainerStyle={{ paddingBottom: 110, backgroundColor: colors.paper }}>
      <View style={{ backgroundColor: colors.green }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T style={{ fontFamily: font.display, fontSize: 26, lineHeight: 34, color: colors.paper }}>DINI</T>
            <T tone="arabic" style={{ color: colors.sand, fontSize: 22 }}>ديني</T>
          </View>
          <T style={{ fontFamily: font.display, fontSize: 30, lineHeight: 34, color: '#F4F0E2' }}>Choisissez vous-même qui enseignera le Coran.</T>
          <T style={{ color: '#D6DDD5' }}>Des enseignants vérifiés un par un. Leurs diplômes, leur sanad et leurs prix sont visibles avant de réserver.</T>
          <Button title="Trouver un enseignant" kind="sand" onPress={() => router.navigate('/search')} />
        </View>
      </View>

      <View style={{ padding: 20, gap: 12 }}>
        <T tone="h2">Par quoi commencer&nbsp;?</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderLeftWidth: 1, borderColor: colors.line }}>
          {SUBJECTS.map((s) => (
            <Pressable key={s.id} accessibilityRole="button" onPress={() => router.navigate({ pathname: '/search', params: { subject: s.id } })}
              style={({ pressed }) => ({ width: '50%', minHeight: 96, padding: 14, gap: 2, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.line, backgroundColor: pressed ? colors.leaf : 'transparent' })}>
              <T tone="arabic" style={{ textAlign: 'right' }}>{s.ar}</T>
              <T style={{ fontFamily: font.semibold }}>{s.label.fr}</T>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        <T tone="h2">J’habite</T>
        <T tone="muted">Les prix s’affichent dans votre devise, les horaires dans votre fuseau.</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {COUNTRIES.flatMap((c) => c.timezones.slice(0, c.code === 'US' || c.code === 'CA' ? 2 : 1).map((tz) => (
            <Chip key={tz.id} label={c.timezones.length > 1 ? `${c.label.fr}, ${tz.label}` : c.label.fr}
              on={current?.country === c.code && current?.timezone === tz.id}
              onPress={() => setResidence.mutate({ country: c.code, timezone: tz.id })} />
          )))}
        </View>
      </View>

      <View style={{ margin: 20, padding: 16, gap: 10, backgroundColor: colors.leaf }}>
        <T style={{ fontFamily: font.semibold }}>Démo : personnes, avis et paiements fictifs.</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Chip label="Fatou, parent" on={familyId === 'fam-diop'} onPress={() => setFamilyId('fam-diop')} />
          <Chip label="Marème, élève adulte" on={familyId === 'fam-sarr'} onPress={() => setFamilyId('fam-sarr')} />
        </View>
        <Button title="Réinitialiser la démo" kind="ghost" onPress={() => reset.mutate(undefined)} />
      </View>
    </ScrollView>
  )
}
