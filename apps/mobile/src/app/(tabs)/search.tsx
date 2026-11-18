import { LANGUAGES, RIWAYAT, SUBJECTS, colors, subject, type LanguageId, type SubjectId } from '@dini/core'
import type { TeacherCard, TeacherFilters } from '@dini/data'
import { useTeachers } from '@dini/data/react'
import { router, useGlobalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Badges, Chip, Monogram, T, font } from '@/lib/ui'
import { useFormat, useT } from '@/lib/i18n'

export default function Search() {
  const params = useGlobalSearchParams<{ subject?: SubjectId }>()
  const [f, setF] = useState<TeacherFilters>({ subject: params.subject })
  useEffect(() => { if (params.subject) setF((x) => ({ ...x, subject: params.subject })) }, [params.subject])
  const toggle = <K extends keyof TeacherFilters>(k: K, v: TeacherFilters[K]) => setF((x) => ({ ...x, [k]: x[k] === v ? undefined : v }))
  const teachers = useTeachers(f)
  const list = teachers.data ?? []
  const insets = useSafeAreaInsets()
  const m = useT().search
  const fmt = useFormat()

  const header = (
    <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderColor: colors.line }}>
      <T tone="h1">{teachers.isPending ? m.searching : m.count(list.length)}</T>
      <Row label={m.subject}>
        {SUBJECTS.map((s) => <Chip key={s.id} label={fmt.label(s.label)} on={f.subject === s.id} onPress={() => toggle('subject', s.id)} />)}
      </Row>
      <Row label={m.language}>
        {LANGUAGES.map((l) => <Chip key={l.id} label={fmt.label(l.label)} on={f.language === l.id} onPress={() => toggle('language', l.id as LanguageId)} />)}
      </Row>
      <Row label={m.riwayaTeacher}>
        {RIWAYAT.map((r) => <Chip key={r} label={r} on={f.riwaya === r} onPress={() => toggle('riwaya', r)} />)}
        <Chip label={m.woman} on={f.gender === 'F'} onPress={() => toggle('gender', 'F')} />
        <Chip label={m.man} on={f.gender === 'M'} onPress={() => toggle('gender', 'M')} />
      </Row>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <FlatList
        data={list}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => <Row2 t={item} />}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: 110 }}
        ListEmptyComponent={teachers.isPending ? <ActivityIndicator style={{ margin: 30 }} color={colors.green} /> : (
          <View style={{ margin: 20, padding: 18, gap: 6, backgroundColor: colors.leaf }}>
            <T style={{ fontFamily: font.semibold }}>{m.noneTitle}</T>
            <T tone="muted">{m.noneText}</T>
          </View>
        )}
      />
    </View>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <T tone="label">{label}</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>{children}</ScrollView>
    </View>
  )
}

function Row2({ t }: { t: TeacherCard }) {
  const m = useT().search
  const fmt = useFormat()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={m.viewProfile(t.name)} onPress={() => router.push(`/teacher/${t.id}`)}
      style={({ pressed }) => ({ flexDirection: 'row', gap: 14, padding: 20, borderBottomWidth: 1, borderColor: colors.line, backgroundColor: pressed ? colors.leaf : 'transparent' })}>
      <Monogram name={t.name} size={58} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <T tone="title" style={{ flexShrink: 1 }}>{t.name}</T>
          <T style={{ fontFamily: font.display, fontSize: 18, color: colors.green }}>{fmt.money(t.price.amount, t.price.currency)}</T>
        </View>
        <Badges t={t} />
        <T style={{ fontSize: 15 }}>{t.headline}</T>
        <T tone="muted">{t.subjects.map((s) => fmt.label(subject(s).label)).join(', ')} · {t.languages.map((l) => fmt.label(LANGUAGES.find((x) => x.id === l)!.label)).join(', ')}</T>
        <T tone="muted"><T style={{ color: colors.ochre }}>★</T> {fmt.decimal(t.rating)} · {t.city}</T>
      </View>
    </Pressable>
  )
}
