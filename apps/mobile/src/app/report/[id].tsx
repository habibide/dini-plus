import { colors, formatDay, surah } from '@dini/core'
import { useBookingDetails, useFamily } from '@dini/data/react'
import { useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { T, font } from '@/lib/ui'

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const q = useBookingDetails(id)
  const family = useFamily()
  if (!q.data || !family.data) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.green} />
  const { booking, teacher, learner } = q.data
  const r = booking.report
  if (!r) return <T style={{ padding: 20 }}>Pas encore de compte rendu pour cette séance.</T>
  const s = r.surah ? surah(r.surah) : undefined
  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ padding: 20, gap: 20 }}>
      <View style={{ gap: 4 }}>
        <T tone="muted" style={{ textTransform: 'capitalize' }}>{formatDay(booking.startsAt, family.data.family.timezone)} · {learner.name}</T>
        <T tone="h1">{teacher.name}</T>
      </View>
      {s && r.ayahTo ? (
        <View style={{ alignItems: 'center', gap: 6, padding: 22, borderWidth: 1, borderColor: colors.sand, backgroundColor: colors.white }}>
          <T tone="arabic" style={{ fontSize: 46, lineHeight: 60 }}>{s.ar}</T>
          <T style={{ fontFamily: font.semibold }}>{s.name}, versets {r.ayahFrom} à {r.ayahTo} sur {s.ayat}</T>
        </View>
      ) : null}
      <View style={{ gap: 4 }}><T tone="label">Travaillé</T><T style={{ fontSize: 17 }}>{r.covered}</T></View>
      {r.tajwidNotes ? <View style={{ gap: 4 }}><T tone="label">Tajwid</T><T style={{ fontSize: 17 }}>{r.tajwidNotes}</T></View> : null}
      <View style={{ gap: 4 }}><T tone="label">À faire avant le prochain cours</T><T style={{ fontSize: 17 }}>{r.homework}</T></View>
      {r.comment ? <View style={{ padding: 16, backgroundColor: colors.leaf, gap: 6 }}><T style={{ fontSize: 17 }}>{r.comment}</T><T tone="muted">{teacher.name}</T></View> : null}
    </ScrollView>
  )
}
