import { LANGUAGES, colors, country, dayKey, subject, trialPrice } from '@dini/core'
import { useAccount, usePlace, useSlots, useTeacher } from '@dini/data/react'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { Badges, Button, Monogram, Sanad, Section, T, font } from '@/lib/ui'
import { useFormat, useT } from '@/lib/i18n'

export default function TeacherScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const teacher = useTeacher(id)
  const { place } = usePlace()
  const account = useAccount()
  const [week, setWeek] = useState(0)
  const slots = useSlots(id, week)
  const all = useT()
  const m = all.teacher
  const fmt = useFormat()

  if (!teacher.data) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.green} />
  const t = teacher.data
  const tz = place.timezone
  const tzLabel = country(place.country).timezones.find((x) => x.id === tz)?.label
  const byDay = new Map<string, number[]>()
  for (const at of slots.data ?? []) byDay.set(dayKey(at, tz), [...(byDay.get(dayKey(at, tz)) ?? []), at])

  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: t.name }} />
      <View style={{ padding: 20, gap: 14, borderBottomWidth: 1, borderColor: colors.line }}>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <Monogram name={t.name} size={80} />
          <View style={{ flex: 1, gap: 4 }}>
            <T tone="h1" style={{ fontSize: 25 }}>{t.name}</T>
            <T tone="muted">{t.city}, {t.countryLabel}</T>
            <T tone="muted"><T style={{ color: colors.ochre }}>★</T> {m.stats(fmt.decimal(t.rating), t.reviews.length, Math.round(t.hoursTaught))}</T>
          </View>
        </View>
        <Badges t={t} />
        <View style={{ backgroundColor: colors.leaf, padding: 12, gap: 2 }}>
          <T><T style={{ fontFamily: font.display, fontSize: 20, color: colors.green }}>{fmt.money(t.price.amount, t.price.currency)}</T>{all.common.perCourse}</T>
          <T tone="muted">{m.trial(fmt.money(trialPrice(t.price.amount, t.price.currency), t.price.currency))}</T>
        </View>
      </View>

      <Section title={m.intro}>
        <T tone="title">{t.headline}</T>
        <T>{t.bio}</T>
        <T tone="muted">{m.subjects(t.subjects.map((s) => fmt.label(subject(s).label)).join(', '))}</T>
        <T tone="muted">{m.languages(t.languages.map((l) => fmt.label(LANGUAGES.find((x) => x.id === l)!.label)).join(', '))}</T>
        <T tone="muted">{m.riwayaMadhhab(t.riwayat.join(', '), t.madhahib.join(', '))}</T>
      </Section>

      <Section title={m.slots(tzLabel ?? '')}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title={m.prevWeek} kind="ghost" disabled={week === 0} onPress={() => setWeek(week - 1)} style={{ flex: 1, minHeight: 40, paddingHorizontal: 8 }} />
          <Button title={m.nextWeek} kind="ghost" disabled={week >= 3} onPress={() => setWeek(week + 1)} style={{ flex: 1, minHeight: 40, paddingHorizontal: 8 }} />
        </View>
        {[...byDay.values()].map((list) => (
          <View key={list[0]} style={{ gap: 6 }}>
            <T style={{ fontFamily: font.semibold, textTransform: 'capitalize' }}>{fmt.day(list[0], tz)}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {list.map((at) => (
                <Pressable key={at} accessibilityRole="button" onPress={() => account ? router.push(`/book/${t.id}/${at}`) : router.push({ pathname: '/login', params: { next: `/book/${t.id}/${at}` } })}
                  style={({ pressed }) => ({ minWidth: 72, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.green, borderRadius: 12, backgroundColor: pressed ? colors.green : colors.white })}>
                  <T style={{ fontFamily: font.semibold, color: colors.green }}>{fmt.time(at, tz)}</T>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        {!slots.isPending && byDay.size === 0 && <T tone="muted">{m.noSlots}</T>}
      </Section>

      {t.credentials.length > 0 && <Section title={m.credentials}>
        {t.credentials.map((c) => (
          <View key={c.title} style={{ gap: 4 }}>
            <T style={{ color: colors.ochre, fontFamily: font.semibold, fontSize: 13 }}>{c.kind === 'ijaza' ? m.ijaza : m.diploma}, {c.year}</T>
            <T style={{ fontFamily: font.semibold }}>{c.title}</T>
            {c.institution ? <T tone="muted">{c.institution}</T> : null}
            <T tone="muted" style={c.verified ? { color: colors.green } : undefined}>{c.verified ? m.verified : m.declared}</T>
            {c.sanad ? <View style={{ marginTop: 6 }}><Sanad chain={c.sanad} /></View> : null}
          </View>
        ))}
      </Section>}

      <Section title={m.reviews} style={{ borderBottomWidth: 0 }}>
        {t.reviews.length === 0 && <T tone="muted">{m.noReviews}</T>}
        {t.reviews.map((r) => (
          <View key={r.text} style={{ gap: 3 }}>
            <T style={{ color: colors.ochre }}>{'★'.repeat(r.rating)}</T>
            <T>{r.text}</T>
            <T tone="muted">{r.author}, {r.date}</T>
          </View>
        ))}
      </Section>
    </ScrollView>
  )
}
