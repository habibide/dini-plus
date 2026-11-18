import { COMMISSION_TIERS, colors, commissionRate, subject } from '@dini/core'
import type { AgendaItem } from '@dini/data/supabase'
import { useAccount, useAgenda, useEarnings, useMyTeacher } from '@dini/data/react'
import { router } from 'expo-router'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SignInPrompt } from '@/lib/auth'
import { Section, T, font } from '@/lib/ui'
import { JoinButton } from '@/lib/video'
import { useFormat, useT } from '@/lib/i18n'

export default function Agenda() {
  const account = useAccount()
  const me = useMyTeacher()
  const agenda = useAgenda()
  const earnings = useEarnings()
  const insets = useSafeAreaInsets()
  const m = useT().agenda
  const fmt = useFormat()
  if (account === null) return <View style={{ paddingTop: insets.top }}><SignInPrompt title={m.title} text={m.prompt} next="/agenda" /></View>
  if (me.isPending || !account) return <ActivityIndicator style={{ marginTop: 80 }} color={colors.green} />
  const t = me.data
  const now = Date.now()
  const items = agenda.data ?? []
  const toComplete = items.filter((b) => b.status === 'scheduled' && b.startsAt <= now)
  const upcoming = items.filter((b) => b.status === 'scheduled' && b.startsAt > now)
  const hours = earnings.data?.hoursTaught ?? t?.hoursTaught ?? 0
  const next = COMMISSION_TIERS.find((x) => hours < x.fromHours)

  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={agenda.isRefetching} onRefresh={() => { agenda.refetch(); earnings.refetch(); me.refetch() }} />}>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, gap: 4, borderBottomWidth: 1, borderColor: colors.line }}>
        <T tone="h1">{m.hello(t?.name.split(' ')[0] || account.name.split(' ')[0])}</T>
        <T tone="muted">{m.yourSpace}</T>
      </View>
      {t && t.status !== 'approved' && (
        <Section style={{ backgroundColor: t.status === 'rejected' ? colors.warnBg : colors.leaf }}>
          <T style={{ fontFamily: font.semibold }}>{m.status[t.status][0]}</T>
          <T>{m.status[t.status][1]}</T>
          {t.status === 'rejected' && t.reviewNote ? <T style={{ color: colors.warn }}>« {t.reviewNote} »</T> : null}
        </Section>
      )}
      {t?.status === 'approved' && <>
        {toComplete.length > 0 && (
          <Section title={m.toComplete}>
            <T tone="muted">{m.toCompleteText}</T>
            {toComplete.map((b) => <Row key={b.id} b={b} highlight />)}
          </Section>
        )}
        <Section title={m.upcoming}>
          {agenda.isPending ? <ActivityIndicator color={colors.green} />
            : upcoming.length ? upcoming.map((b) => <Row key={b.id} b={b} />)
            : <T tone="muted">{m.noUpcoming}</T>}
        </Section>
        <Section title={m.earnings}>
          <T><T style={{ fontFamily: font.display, fontSize: 26, color: colors.green }}>{fmt.euros(earnings.data?.releasedEur ?? 0)}</T>{m.earned}</T>
          <T tone="muted">{m.pending(earnings.data?.pending.count ?? 0)}</T>
          <T tone="muted">{m.commission(fmt.pct(commissionRate(hours)), Math.round(hours), next ? m.nextTier(fmt.pct(next.rate), next.fromHours) : '')}</T>
        </Section>
      </>}
    </ScrollView>
  )
}

function Row({ b, highlight }: { b: AgendaItem; highlight?: boolean }) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const now = Date.now()
  const m = useT().agenda
  const fmt = useFormat()
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/session/${b.id}`)}
      style={({ pressed }) => ({ padding: 14, gap: 3, borderWidth: 1.5, borderRadius: 16, borderColor: highlight ? colors.ochre : colors.line, backgroundColor: pressed ? colors.leaf : colors.white })}>
      <T style={{ fontFamily: font.semibold, textTransform: 'capitalize' }}>{fmt.dateTime(b.startsAt, tz)}</T>
      <T tone="muted">{b.learner.name} · {fmt.label(subject(b.subject).label)}{b.kind === 'trial' ? m.trial : ''}</T>
      {highlight && <T style={{ color: colors.green, fontFamily: font.semibold }}>{m.writeReport}</T>}
      {!highlight && b.startsAt - now < 60 * 60_000 && <JoinButton booking={b} tz={tz} style={{ marginTop: 6 }} />}
    </Pressable>
  )
}
