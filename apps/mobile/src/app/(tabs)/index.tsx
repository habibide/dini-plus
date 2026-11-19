import { SUBJECTS, colors } from '@dini/core'
import { Image } from 'expo-image'
import { router, type Href } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Pressable, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native'
import { Button, T, font } from '@/lib/ui'
import { useFormat, useT } from '@/lib/i18n'

// Accueil : mêmes bannières photo que le site (version mobile des images), les chiffres, puis les matières.

const BANNERS: { image: number; href: Href }[] = [
  { image: require('../../../assets/images/banners/1.jpg'), href: '/search' },
  { image: require('../../../assets/images/banners/2.jpg'), href: { pathname: '/search', params: { teacher: 'F' } } },
  { image: require('../../../assets/images/banners/3.jpg'), href: '/search' },
]
const DELAY = 7000

function Banners() {
  const t = useT().home
  const { width } = useWindowDimensions()
  const scroller = useRef<ScrollViewInstance>(null)
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)

  // Pas de défilement automatique si l'appareil demande moins d'animations.
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then((r) => { if (r) setAuto(false) }).catch(() => {}) }, [])
  useEffect(() => {
    if (!auto) return
    const id = setTimeout(() => scroller.current?.scrollTo({ x: ((active + 1) % BANNERS.length) * width, animated: true }), DELAY)
    return () => clearTimeout(id)
  }, [auto, active, width])

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setActive(Math.round(e.nativeEvent.contentOffset.x / width))

  return (
    <View style={{ backgroundColor: colors.green, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' }}>
      <ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll}
        onScrollBeginDrag={() => setAuto(false)} style={{ direction: 'ltr' }}>
        {BANNERS.map((b, i) => {
          const copy = t.banners[i]
          return (
            <View key={i} style={{ width }} accessibilityLabel={t.bannerGo(i + 1, BANNERS.length)}>
              {/* Photo en carte : marges autour et coins arrondis, sur le fond vert. */}
              <View style={{ marginTop: 8, marginHorizontal: 16, height: (width - 32) * 0.8, borderRadius: 20, overflow: 'hidden' }}>
                <Image source={b.image} contentFit="cover" contentPosition={{ top: '70%' }} style={{ flex: 1 }} accessibilityIgnoresInvertColors />
                {/* Marque DINE sur la photo. */}
                <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.92)' }}>
                  <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }}>
                    <T style={{ fontFamily: font.display, fontSize: 14, lineHeight: 18, color: colors.white }}>D</T>
                  </View>
                  <T style={{ fontFamily: font.display, fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: colors.ink }}>DINE</T>
                </View>
              </View>
              <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 52, gap: 12, minHeight: 250 }}>
                <T style={{ fontFamily: font.display, fontSize: 26, lineHeight: 31, letterSpacing: -0.6, color: colors.white }}>{copy.title}</T>
                <T style={{ color: 'rgba(255,255,255,0.85)' }}>{copy.text}</T>
                <Button title={copy.cta} kind="sand" onPress={() => router.navigate(b.href)} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
              </View>
            </View>
          )
        })}
      </ScrollView>
      {/* Points de pagination. */}
      <View style={{ position: 'absolute', bottom: 20, left: 20, flexDirection: 'row', gap: 6 }}>
        {BANNERS.map((_, i) => (
          <Pressable key={i} accessibilityRole="button" accessibilityLabel={t.bannerGo(i + 1, BANNERS.length)} hitSlop={8}
            onPress={() => { setAuto(false); scroller.current?.scrollTo({ x: i * width, animated: true }); setActive(i) }}
            style={{ height: 8, width: i === active ? 24 : 8, borderRadius: 4, backgroundColor: i === active ? colors.white : 'rgba(255,255,255,0.45)' }} />
        ))}
      </View>
    </View>
  )
}

export default function Home() {
  const t = useT()
  const fmt = useFormat()
  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ flexGrow: 1, paddingBottom: 110, backgroundColor: colors.paper }}>
      {/* Vert au-dessus de l'en-tête quand on tire la page vers le bas ; le reste du fond reste clair. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: -1000, left: 0, right: 0, height: 1000, backgroundColor: colors.green }} />
      <Banners />

      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 22, gap: 12 }}>
        {t.home.stats.map(([a, b]) => (
          <View key={a} style={{ flex: 1, gap: 2 }}>
            <T style={{ fontFamily: font.display, fontSize: 20, lineHeight: 25, letterSpacing: -0.4, color: colors.green }}>{a}</T>
            <T tone="muted" style={{ fontSize: 12.5, lineHeight: 17 }}>{b}</T>
          </View>
        ))}
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
