import {
  AGE_GROUPS, ARABIC_TRACKS, LANGUAGES, LEVELS, MADHAHIB, RIWAYAT, SUBJECTS, colors, country, roundMoney, subject, toEur,
  type CurrencyCode, type LanguageId, type SubjectId,
} from '@dini/core'
import type { TeacherCard, TeacherCategory, TeacherFilters, TeacherSort } from '@dini/data'
import { usePlace, useTeachers } from '@dini/data/react'
import { router, useGlobalSearchParams } from 'expo-router'
import { useEffect, useState, type ReactNode } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Switch, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, CategoryTags, Chip, MessageButton, Monogram, T, VerifiedMark, font, useCountryOf } from '@/lib/ui'
import { useFormat, useT } from '@/lib/i18n'

// Recherche, comme sur le site : « Je veux apprendre », filtres (spécialisation selon la matière,
// tarif, langue, professeur, élève, catégories, disponibilité) et tri ; cartes façon Preply.

const showsRiwaya = (s?: SubjectId) => !s || s === 'quran' || s === 'tajwid'

/** En changeant de matière, on retire les filtres qui ne la concernent plus. */
const forSubject = (f: TeacherFilters): TeacherFilters => ({
  ...f,
  riwaya: showsRiwaya(f.subject) ? f.riwaya : undefined,
  arabicTrack: f.subject === 'arabic' ? f.arabicTrack : undefined,
  madhhab: f.subject === 'fiqh' ? f.madhhab : undefined,
})

/** Tranches de prix calées sur des seuils en euros, converties dans la devise affichée. */
const priceSteps = (cur: CurrencyCode) => [5, 10, 15, 20].map((eur) => roundMoney(eur / toEur(1, cur), cur))

const HOUR_GROUPS: { key: 'daytime' | 'night' | 'early'; hours: number[] }[] = [
  { key: 'daytime', hours: [9, 12, 15] }, { key: 'night', hours: [18, 21, 0] }, { key: 'early', hours: [3, 6] },
]
const WEEK = [1, 2, 3, 4, 5, 6, 0]
const SORTS: TeacherSort[] = ['selection', 'price_asc', 'price_desc', 'rating', 'reviews']

/** Champ façon Preply : petit libellé, valeur, chevron. */
function Field({ label, value, placeholder, active, onPress, style }: { label?: string; value?: string; placeholder: string; active?: boolean; onPress: () => void; style?: object }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={[{ minHeight: label ? 64 : 52, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: active ? colors.ink : colors.line, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>
      <View style={{ flex: 1 }}>
        {label ? <T style={{ fontSize: 12, lineHeight: 15, color: colors.muted }}>{label}</T> : null}
        <T numberOfLines={1} style={{ fontFamily: font.semibold, color: value || label ? colors.ink : colors.muted }}>{value || placeholder}</T>
      </View>
      <T style={{ fontSize: 14, color: colors.ink }}>⌄</T>
    </Pressable>
  )
}

/** Feuille modale (bas d'écran sur iPhone, plein écran sur Android). */
function Sheet({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.white }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: colors.line }}>
          <T tone="title">{title}</T>
          <Pressable accessibilityRole="button" accessibilityLabel="OK" onPress={onClose} hitSlop={10}><T style={{ fontSize: 22 }}>✕</T></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 22, paddingBottom: 30 }}>{children}</ScrollView>
        {footer ? <View style={{ padding: 20, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderColor: colors.line }}>{footer}</View> : null}
      </View>
    </Modal>
  )
}

function Option({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress}
      style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.line }}>
      <T style={on ? { fontFamily: font.semibold } : undefined}>{label}</T>
      {on ? <T style={{ color: colors.green, fontFamily: font.bold }}>✓</T> : null}
    </Pressable>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return <View style={{ gap: 10 }}><T style={{ fontFamily: font.bold, fontSize: 17 }}>{title}</T>{children}</View>
}
const Wrap = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>

export default function Search() {
  const params = useGlobalSearchParams<{ subject?: SubjectId; teacher?: 'F' | 'M' }>()
  const [f, setF] = useState<TeacherFilters>(() => forSubject({ subject: params.subject, gender: params.teacher }))
  useEffect(() => { if (params.subject || params.teacher) setF((x) => forSubject({ ...x, subject: params.subject ?? x.subject, gender: params.teacher ?? x.gender })) }, [params.subject, params.teacher])
  const [sheet, setSheet] = useState<'subject' | 'filters' | 'sort' | null>(null)
  const set = <K extends keyof TeacherFilters>(k: K, v: TeacherFilters[K]) => setF((x) => ({ ...x, [k]: v }))
  const toggle = <K extends keyof TeacherFilters>(k: K, v: TeacherFilters[K]) => setF((x) => ({ ...x, [k]: x[k] === v ? undefined : v }))
  const toggleIn = <K extends 'categories' | 'hours' | 'days'>(k: K, v: NonNullable<TeacherFilters[K]>[number]) =>
    setF((x) => { const cur = (x[k] ?? []) as (typeof v)[]; const next = cur.includes(v) ? cur.filter((y) => y !== v) : [...cur, v]; return { ...x, [k]: next.length ? next : undefined } })
  const teachers = useTeachers(f)
  const list = teachers.data ?? []
  const { place } = usePlace()
  const insets = useSafeAreaInsets()
  const m = useT().search
  const fmt = useFormat()
  const cur = country(place.country).currency
  const tzLabel = country(place.country).timezones.find((x) => x.id === place.timezone)?.label ?? ''
  const money = (n: number) => fmt.money(n, cur)
  const steps = priceSteps(cur)
  const ranges: [number | undefined, number | undefined][] = [[undefined, steps[0]], ...steps.slice(0, -1).map((a, i) => [a, steps[i + 1]] as [number, number]), [steps[steps.length - 1], undefined]]
  const rangeLabel = (lo?: number, hi?: number) => (!lo ? m.under(money(hi!)) : !hi ? m.over(money(lo)) : `${money(lo)} – ${money(hi)}`)

  const specialty = f.subject === 'arabic'
    ? { title: m.arabicTrack, key: 'arabicTrack' as const, options: ARABIC_TRACKS.map((a) => [a.id, fmt.label(a.label)]) }
    : f.subject === 'fiqh'
      ? { title: m.madhhab, key: 'madhhab' as const, options: MADHAHIB.map((x) => [x, x]) }
      : showsRiwaya(f.subject) ? { title: m.riwaya, key: 'riwaya' as const, options: RIWAYAT.map((x) => [x, x]) } : null
  const activeCount = [f.language, f.gender, f.ageGroup, f.level, f.riwaya, f.arabicTrack, f.madhhab, f.minPrice || f.maxPrice].filter(Boolean).length
    + (f.categories?.length ?? 0) + (f.hours?.length ?? 0) + (f.days?.length ?? 0)
  const subjectLabel = f.subject && fmt.label(subject(f.subject).label)

  const header = (
    <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 8, gap: 10 }}>
      <Field label={m.learn} value={subjectLabel} placeholder={m.allSubjects} active={!!f.subject} onPress={() => setSheet('subject')} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field value={activeCount ? `${m.filters} (${activeCount})` : m.filters} placeholder={m.filters} active={activeCount > 0} onPress={() => setSheet('filters')} style={{ flex: 1 }} />
        <Field value={f.sort ? m.sorts[f.sort] : undefined} placeholder={m.sort} active={!!f.sort} onPress={() => setSheet('sort')} style={{ flex: 1 }} />
      </View>
      <T tone="h1" style={{ marginTop: 8 }}>{teachers.isPending ? m.searching : m.count(list.length)}</T>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <FlatList
        data={list}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => <TeacherCardView t={item} />}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: 110 }}
        style={{ opacity: teachers.isFetching && !teachers.isPending ? 0.6 : 1 }}
        ListEmptyComponent={teachers.isPending ? <ActivityIndicator style={{ margin: 30 }} color={colors.green} /> : (
          <View style={{ margin: 20, padding: 18, gap: 10, borderRadius: 16, backgroundColor: colors.leaf }}>
            <T style={{ fontFamily: font.semibold }}>{m.noneTitle}</T>
            <T tone="muted">{m.noneText}</T>
            <Button title={m.clear} kind="ghost" onPress={() => setF(forSubject({ subject: f.subject }))} />
          </View>
        )}
      />

      <Sheet open={sheet === 'subject'} title={m.learn} onClose={() => setSheet(null)}>
        <View>
          <Option on={!f.subject} label={m.allSubjects} onPress={() => { setF(forSubject({ ...f, subject: undefined })); setSheet(null) }} />
          {SUBJECTS.map((s) => <Option key={s.id} on={f.subject === s.id} label={fmt.label(s.label)} onPress={() => { setF(forSubject({ ...f, subject: s.id })); setSheet(null) }} />)}
        </View>
      </Sheet>

      <Sheet open={sheet === 'sort'} title={m.sort} onClose={() => setSheet(null)}>
        <View>{SORTS.map((k) => <Option key={k} on={(f.sort ?? 'selection') === k} label={m.sorts[k]} onPress={() => { set('sort', k === 'selection' ? undefined : k); setSheet(null) }} />)}</View>
      </Sheet>

      <Sheet open={sheet === 'filters'} title={m.filters} onClose={() => setSheet(null)}
        footer={<View style={{ gap: 8 }}>
          <Button title={m.showResults(list.length)} onPress={() => setSheet(null)} />
          {activeCount > 0 && <Button title={m.clear} kind="ghost" onPress={() => setF(forSubject({ subject: f.subject, sort: f.sort }))} />}
        </View>}>
        {specialty && (
          <Group title={specialty.title}>
            <Wrap>{specialty.options.map(([id, label]) => <Chip key={id} label={label} on={f[specialty.key] === id} onPress={() => toggle(specialty.key, id)} />)}</Wrap>
          </Group>
        )}
        <Group title={m.price}>
          <Wrap>{ranges.map(([lo, hi]) => <Chip key={`${lo}-${hi}`} label={rangeLabel(lo, hi)} on={f.minPrice === lo && f.maxPrice === hi && !!(lo || hi)}
            onPress={() => setF((x) => (x.minPrice === lo && x.maxPrice === hi ? { ...x, minPrice: undefined, maxPrice: undefined } : { ...x, minPrice: lo, maxPrice: hi }))} />)}</Wrap>
        </Group>
        <Group title={m.language}>
          <Wrap>{LANGUAGES.map((l) => <Chip key={l.id} label={fmt.label(l.label)} on={f.language === l.id} onPress={() => toggle('language', l.id as LanguageId)} />)}</Wrap>
        </Group>
        <Group title={m.teacher}>
          <Wrap><Chip label={m.woman} on={f.gender === 'F'} onPress={() => toggle('gender', 'F')} /><Chip label={m.man} on={f.gender === 'M'} onPress={() => toggle('gender', 'M')} /></Wrap>
        </Group>
        <Group title={m.student}>
          <T tone="muted">{m.age}</T>
          <Wrap>{AGE_GROUPS.map((a) => <Chip key={a.id} label={fmt.label(a.label)} on={f.ageGroup === a.id} onPress={() => toggle('ageGroup', a.id)} />)}</Wrap>
          <T tone="muted">{m.level}</T>
          <Wrap>{LEVELS.map((l) => <Chip key={l.id} label={fmt.label(l.label)} on={f.level === l.id} onPress={() => toggle('level', l.id)} />)}</Wrap>
        </Group>
        <Group title={m.categories}>
          {(['ijaza', 'diploma', 'confirmed'] as TeacherCategory[]).map((c) => (
            <View key={c} style={{ gap: 4, paddingBottom: 12, borderBottomWidth: 1, borderColor: colors.line }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <T style={{ fontFamily: font.semibold, flex: 1 }}>{m.cats[c].title}</T>
                <Switch value={!!f.categories?.includes(c)} onValueChange={() => toggleIn('categories', c)} trackColor={{ true: colors.green, false: '#E1DDD2' }} accessibilityLabel={m.cats[c].title} />
              </View>
              <T tone="muted">{m.cats[c].text}</T>
            </View>
          ))}
        </Group>
        <Group title={m.schedule}>
          <T tone="muted">{m.scheduleNote(tzLabel)}</T>
          {HOUR_GROUPS.map((g) => (
            <View key={g.key} style={{ gap: 6 }}>
              <T style={{ fontSize: 14, color: colors.muted }}>{m[g.key]}</T>
              <Wrap>{g.hours.map((h) => <Chip key={h} label={`${h}-${h + 3 === 24 ? 24 : (h + 3) % 24}`} on={!!f.hours?.includes(h)} onPress={() => toggleIn('hours', h)} />)}</Wrap>
            </View>
          ))}
          <T style={{ fontSize: 14, color: colors.muted }}>{m.daysTitle}</T>
          <Wrap>{WEEK.map((d) => <Chip key={d} label={m.weekdaysShort[d]} on={!!f.days?.includes(d)} onPress={() => toggleIn('days', d)} />)}</Wrap>
        </Group>
      </Sheet>
    </View>
  )
}

/** Carte professeur façon Preply. */
function TeacherCardView({ t }: { t: TeacherCard }) {
  const all = useT()
  const m = all.search
  const fmt = useFormat()
  const countryOf = useCountryOf()
  const from = countryOf(t.countryLabel)
  const open = () => router.push(`/teacher/${t.id}`)
  return (
    <View style={{ marginHorizontal: 20, marginBottom: 14, padding: 16, gap: 12, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white }}>
      <Pressable accessibilityRole="button" accessibilityLabel={m.viewProfile(t.name)} onPress={open} style={{ flexDirection: 'row', gap: 14 }}>
        <Monogram name={t.name} size={84} square />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <T tone="title" style={{ fontSize: 19 }}>{t.name}</T>
            {t.verification.identity && <VerifiedMark label={all.badges.identity} />}
            {from.flag ? <T style={{ fontSize: 17 }} accessibilityLabel={from.name}>{from.flag}</T> : null}
          </View>
          <CategoryTags t={t} />
          <T style={{ fontSize: 14, lineHeight: 19 }}>🎓 {t.subjects.map((s) => fmt.label(subject(s).label)).join(', ')}</T>
          <T style={{ fontSize: 14, lineHeight: 19 }}>{m.speaks} {t.languages.map((l) => fmt.label(LANGUAGES.find((x) => x.id === l)!.label)).join(', ')}</T>
        </View>
      </Pressable>
      <T numberOfLines={3} style={{ fontSize: 15, lineHeight: 21 }}><T style={{ fontFamily: font.bold }}>{t.headline}</T>{t.bio ? ` — ${t.bio}` : ''}</T>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 18 }}>
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: font.display, fontSize: 24, lineHeight: 28 }}>{fmt.money(t.price.amount, t.price.currency)}</T>
          <T tone="muted" style={{ fontSize: 13 }}>{m.lessonLength}</T>
        </View>
        {t.rating > 0
          ? <View><T style={{ fontFamily: font.display, fontSize: 17 }}>{fmt.decimal(t.rating)} <T style={{ color: colors.gold }}>★</T></T><T tone="muted" style={{ fontSize: 12 }}>{m.reviewsN(t.reviews.length)}</T></View>
          : <View><T style={{ fontFamily: font.display, fontSize: 17 }}>{m.newProfile[0]}</T><T tone="muted" style={{ fontSize: 12 }}>{m.newProfile[1]}</T></View>}
        {t.hoursTaught >= 1 && <View><T style={{ fontFamily: font.display, fontSize: 17 }}>{Math.round(t.hoursTaught)}</T><T tone="muted" style={{ fontSize: 12 }}>{m.hoursN}</T></View>}
      </View>
      <View style={{ gap: 8 }}>
        <Button title={m.book} onPress={open} />
        <MessageButton name={t.name} onBook={open} />
      </View>
    </View>
  )
}
