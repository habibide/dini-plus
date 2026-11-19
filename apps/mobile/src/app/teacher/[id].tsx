import { ARABIC_TRACKS, LANGUAGES, LEVELS, colors, country, dayKey, isConfirmed, subject, trialPrice } from '@dini/core'
import { useAccount, usePlace, useSlots, useTeacher } from '@dini/data/react'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Share, View, type ScrollViewInstance } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, IntroVideo, MessageButton, Monogram, Sanad, T, VerifiedMark, font, useCountryOf } from '@/lib/ui'
import { useFormat, useT } from '@/lib/i18n'
import { SITE_URL } from '@/lib/api'

// Profil professeur, comme sur le site (façon Preply) : en-tête, badges expliqués, chiffres et actions,
// À propos de moi, Je parle, Mon CV, avis, agenda.

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={{ paddingHorizontal: 20, paddingVertical: 18, gap: 10 }}><T tone="h2">{title}</T>{children}</View>
}

export default function TeacherScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const teacher = useTeacher(id)
  const { place } = usePlace()
  const account = useAccount()
  const [week, setWeek] = useState(0)
  const [more, setMore] = useState(false)
  const slots = useSlots(id, week)
  const scroll = useRef<ScrollViewInstance>(null)
  const [agendaY, setAgendaY] = useState(0)
  const insets = useSafeAreaInsets()
  const all = useT()
  const m = all.teacher
  const s = all.search
  const fmt = useFormat()
  const countryOf = useCountryOf()

  if (!teacher.data) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.green} />
  const t = teacher.data
  const tz = place.timezone
  const tzLabel = country(place.country).timezones.find((x) => x.id === tz)?.label
  const byDay = new Map<string, number[]>()
  for (const at of slots.data ?? []) byDay.set(dayKey(at, tz), [...(byDay.get(dayKey(at, tz)) ?? []), at])
  const from = countryOf(t.countryLabel)
  const longBio = t.bio.length > 320
  const lower = (x: string) => (fmt.locale === 'fr' ? x.toLowerCase() : x)
  const toAgenda = () => scroll.current?.scrollTo({ y: agendaY - 10, animated: true })
  const book = (at: number) => account ? router.push(`/book/${t.id}/${at}`) : router.push({ pathname: '/login', params: { next: `/book/${t.id}/${at}` } })

  const explained: { k: 'ijaza' | 'diploma' | 'confirmed'; color: string; label: string }[] = []
  if (t.verification.ijaza) explained.push({ k: 'ijaza', color: colors.green, label: all.badges.ijaza })
  if (t.verification.diploma) explained.push({ k: 'diploma', color: '#245A92', label: all.badges.diploma })
  if (isConfirmed(t)) explained.push({ k: 'confirmed', color: colors.ochre, label: t.gender === 'F' ? all.badges.confirmedF : all.badges.confirmedM })

  return (
    <ScrollView ref={scroll} style={{ backgroundColor: colors.paper }} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
      <Stack.Screen options={{ title: t.name }} />

      {/* Vidéo de présentation du professeur, en tête du profil (comme sur le site). */}
      {t.videoUrl ? <View style={{ paddingHorizontal: 20, paddingTop: 16 }}><IntroVideo src={t.videoUrl} poster={t.photoUrl} /></View> : null}
      <View style={{ padding: 20, gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <Monogram name={t.name} size={84} square photo={t.photoUrl} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              <T tone="h1" style={{ fontSize: 26, lineHeight: 31 }}>{t.name}</T>
              {t.verification.identity && <VerifiedMark label={all.badges.identity} />}
            </View>
            <T style={{ fontFamily: font.semibold }}>{m.role[t.gender]} · {from.name} {from.flag}</T>
          </View>
        </View>
        <T style={{ fontSize: 17, lineHeight: 24 }}>{t.headline}</T>
        {explained.map((x) => (
          <View key={x.k} style={{ gap: 2 }}>
            <T style={{ fontFamily: font.semibold, color: x.color }}>{x.label}</T>
            <T tone="muted">{m.badgeDetail[x.k]}</T>
          </View>
        ))}
        <View style={{ gap: 2 }}>
          <T style={{ fontFamily: font.semibold }}>🎓 {m.teaches}</T>
          <T>{t.subjects.map((x) => fmt.label(subject(x).label)).join(', ')}</T>
        </View>
      </View>

      {/* Chiffres et actions, comme la carte fixe du site. */}
      <View style={{ marginHorizontal: 20, padding: 18, gap: 16, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white }}>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          {t.rating > 0
            ? <View><T style={{ fontFamily: font.display, fontSize: 20 }}><T style={{ color: colors.gold }}>★</T> {fmt.decimal(t.rating)}</T><T tone="muted" style={{ fontSize: 13 }}>{s.reviewsN(t.reviews.length)}</T></View>
            : <View><T style={{ fontFamily: font.display, fontSize: 20 }}>{s.newProfile[0]}</T><T tone="muted" style={{ fontSize: 13 }}>{s.newProfile[1]}</T></View>}
          {t.hoursTaught >= 1 && <View><T style={{ fontFamily: font.display, fontSize: 20 }}>{Math.round(t.hoursTaught)}</T><T tone="muted" style={{ fontSize: 13 }}>{s.hoursN}</T></View>}
          <View><T style={{ fontFamily: font.display, fontSize: 20 }}>{fmt.money(t.price.amount, t.price.currency)}</T><T tone="muted" style={{ fontSize: 13 }}>{s.lessonLength}</T></View>
        </View>
        <View style={{ gap: 8 }}>
          <Button title={`⚡ ${s.book}`} onPress={toAgenda} />
          <MessageButton name={t.name} onBook={toAgenda} />
          <Button title={m.share} kind="ghost" onPress={() => Share.share({ message: `${m.shareText(t.name)} : ${SITE_URL}/teachers/${t.id}`, url: `${SITE_URL}/teachers/${t.id}` }).catch(() => {})} />
        </View>
        <T tone="muted" style={{ fontSize: 14 }}>{m.trial(fmt.money(trialPrice(t.price.amount, t.price.currency), t.price.currency))}</T>
      </View>

      <Block title={m.about}>
        <T numberOfLines={longBio && !more ? 6 : undefined} style={{ lineHeight: 23 }}>{t.bio}</T>
        {longBio && <Pressable onPress={() => setMore(!more)}><T style={{ fontFamily: font.semibold, textDecorationLine: 'underline' }}>{more ? m.seeLess : m.seeMore}</T></Pressable>}
        <View style={{ gap: 4, marginTop: 4 }}>
          {t.arabicTracks.length > 0 && <T tone="muted">{m.arabic} : <T>{t.arabicTracks.map((a) => lower(fmt.label(ARABIC_TRACKS.find((x) => x.id === a)!.label))).join(', ')}</T></T>}
          {t.riwayat.length > 0 && <T tone="muted">Riwaya : <T>{t.riwayat.join(', ')}</T></T>}
          {t.madhahib.length > 0 && <T tone="muted">Madhhab : <T>{t.madhahib.join(', ')}</T></T>}
          <T tone="muted">{m.levels} : <T>{t.levels.map((l) => lower(fmt.label(LEVELS.find((x) => x.id === l)!.label))).join(', ')}</T></T>
        </View>
      </Block>

      <Block title={m.iSpeak}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {t.languages.map((l) => <View key={l} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.soft }}><T style={{ fontFamily: font.semibold, color: colors.green2 }}>{fmt.label(LANGUAGES.find((x) => x.id === l)!.label)}</T></View>)}
        </View>
      </Block>

      {t.credentials.length > 0 && (
        <Block title={m.cv}>
          {t.credentials.map((c) => (
            <View key={c.title} style={{ flexDirection: 'row', gap: 14, paddingTop: 12, borderTopWidth: 1, borderColor: colors.line }}>
              <T tone="muted" style={{ width: 48 }}>{c.year ?? ''}</T>
              <View style={{ flex: 1, gap: 3 }}>
                <T style={{ fontFamily: font.semibold }}>{c.title}</T>
                <T tone="muted">{[c.kind === 'ijaza' ? m.ijaza : m.diploma, c.institution].filter(Boolean).join(' · ')}</T>
                <T tone="muted" style={c.verified ? { color: colors.green, fontFamily: font.semibold } : undefined}>{c.verified ? m.verified : m.declared}</T>
                {c.sanad ? <View style={{ marginTop: 6 }}><Sanad chain={c.sanad} /></View> : null}
              </View>
            </View>
          ))}
        </Block>
      )}

      <Block title={m.reviewsTitle}>
        {t.reviews.length === 0
          ? <View style={{ padding: 18, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line }}><T style={{ textAlign: 'center' }}>{m.noReviewsFor(t.name)}</T></View>
          : t.reviews.map((r) => (
            <View key={r.text} style={{ gap: 3 }}>
              <T style={{ color: colors.gold }}>{'★'.repeat(r.rating)}</T>
              <T>{r.text}</T>
              <T tone="muted">{r.author}, {r.date}</T>
            </View>
          ))}
      </Block>

      <View onLayout={(e) => setAgendaY(e.nativeEvent.layout.y)}>
        <Block title={m.agenda}>
          <View style={{ padding: 14, borderRadius: 12, backgroundColor: colors.soft }}><T>{m.agendaNote}</T></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Button title="‹" kind="ghost" disabled={week === 0} onPress={() => setWeek(week - 1)} style={{ minHeight: 44, width: 48, paddingHorizontal: 0 }} />
            <Button title="›" kind="ghost" disabled={week >= 3} onPress={() => setWeek(week + 1)} style={{ minHeight: 44, width: 48, paddingHorizontal: 0 }} />
            <T tone="muted" style={{ flex: 1, fontSize: 13 }}>{m.slots(tzLabel ?? '')}</T>
          </View>
          {[...byDay.values()].map((list) => (
            <View key={list[0]} style={{ gap: 8, paddingTop: 10, borderTopWidth: 3, borderColor: colors.green }}>
              <T style={{ fontFamily: font.semibold, textTransform: 'capitalize' }}>{fmt.day(list[0], tz)}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {list.map((at) => (
                  <Pressable key={at} accessibilityRole="button" onPress={() => book(at)}
                    style={({ pressed }) => ({ minWidth: 72, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.green, borderRadius: 12, backgroundColor: pressed ? colors.soft : colors.white })}>
                    <T style={{ fontFamily: font.semibold, color: colors.green2 }}>{fmt.time(at, tz)}</T>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
          {!slots.isPending && byDay.size === 0 && <T tone="muted">{m.noSlots}</T>}
        </Block>
      </View>
    </ScrollView>
  )
}
