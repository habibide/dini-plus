import { SUBJECTS, colors } from '@dini/core'
import { router } from 'expo-router'
import { Pressable, ScrollView, View } from 'react-native'
import { Button, T, font } from '@/lib/ui'

export default function Home() {
  return (
    <ScrollView style={{ backgroundColor: colors.green }} contentContainerStyle={{ paddingBottom: 110, backgroundColor: colors.paper }}>
      <View style={{ backgroundColor: colors.green }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T style={{ fontFamily: font.display, fontSize: 26, lineHeight: 34, color: colors.paper }}>DINE</T>
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

    </ScrollView>
  )
}
