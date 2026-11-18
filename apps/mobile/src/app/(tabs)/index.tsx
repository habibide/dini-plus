import { SUBJECTS, colors } from '@dini/core'
import { router } from 'expo-router'
import { Pressable, ScrollView, View } from 'react-native'
import { Button, T, font } from '@/lib/ui'
import { useFormat, useT } from '@/lib/i18n'

export default function Home() {
  const t = useT()
  const fmt = useFormat()
  return (
    <ScrollView style={{ backgroundColor: colors.green }} contentContainerStyle={{ paddingBottom: 110, backgroundColor: colors.paper }}>
      <View style={{ backgroundColor: colors.green, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Marque : pastille « D » de la charte. */}
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}>
              <T style={{ fontFamily: font.display, fontSize: 18, lineHeight: 22, color: colors.white }}>D</T>
            </View>
            <T style={{ fontFamily: font.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.5, color: colors.white }}>DINE</T>
          </View>
          <T style={{ fontFamily: font.display, fontSize: 30, lineHeight: 34, color: colors.white, letterSpacing: -0.6 }}>{t.home.hero}</T>
          <T style={{ color: 'rgba(255,255,255,0.85)' }}>{t.home.heroText}</T>
          <Button title={t.common.findTeacher} kind="sand" onPress={() => router.navigate('/search')} />
        </View>
      </View>

      <View style={{ padding: 20, gap: 12 }}>
        <T tone="h2">{t.home.startWith}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {SUBJECTS.map((s) => (
            <Pressable key={s.id} accessibilityRole="button" onPress={() => router.navigate({ pathname: '/search', params: { subject: s.id } })}
              style={({ pressed }) => ({ width: '48.5%', minHeight: 96, padding: 14, gap: 2, borderRadius: 16, borderWidth: 1.5, borderColor: pressed ? colors.green : colors.line, backgroundColor: colors.white })}>
              <T tone="arabic" style={{ textAlign: 'right' }}>{s.ar}</T>
              {/* En arabe, le nom arabe ci-dessus suffit. */}
              {fmt.locale !== 'ar' && <T style={{ fontFamily: font.bold, letterSpacing: -0.2 }}>{fmt.label(s.label)}</T>}
            </Pressable>
          ))}
        </View>
      </View>

    </ScrollView>
  )
}
