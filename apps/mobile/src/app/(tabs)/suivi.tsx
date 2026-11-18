import { HOUR, colors, surah } from '@dini/core'
import type { LearnerDashboard } from '@dini/data'
import { useAccount, useDashboard, useDini, useDisputeBooking, useFamily } from '@dini/data/react'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SignInPrompt } from '@/lib/auth'
import { JoinButton } from '@/lib/video'
import { Button, Section, T, font } from '@/lib/ui'
import { useFormat, useT } from '@/lib/i18n'

export default function Suivi() {
  const account = useAccount()
  const family = useFamily()
  const dash = useDashboard()
  const [tab, setTab] = useState(0)
  const insets = useSafeAreaInsets()
  const t = useT()
  const m = t.tracking
  if (account === null) return <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.paper }}><SignInPrompt title={m.title} text={m.prompt} next="/suivi" /></View>
  if (!family.data || !dash.data) return <ActivityIndicator style={{ marginTop: 80 }} color={colors.green} />
  const fam = family.data.family
  const d = dash.data[Math.min(tab, dash.data.length - 1)]

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.paper }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, gap: 10, borderBottomWidth: 1, borderColor: colors.line }}>
        <T tone="h1">{m.hello(fam.parentName.split(' ')[0])}</T>
        <T tone="muted">{fam.isAdultLearner ? m.adult : m.children}</T>
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 22 }}>
          {dash.data.map((x, i) => (
            <Pressable key={x.learner.id} accessibilityRole="tab" accessibilityState={{ selected: i === tab }} onPress={() => setTab(i)}
              style={{ minHeight: 44, justifyContent: 'center', borderBottomWidth: 2, borderColor: i === tab ? colors.ochre : 'transparent' }}>
              <T style={{ fontFamily: font.semibold, color: i === tab ? colors.ink : colors.muted }}>{x.learner.name.split(' ')[0]}</T>
            </Pressable>
          ))}
        </View>
      </View>
      {d ? <LearnerView d={d} tz={fam.timezone} /> : (
        <View style={{ padding: 20, gap: 12 }}>
          <T>{m.empty}</T>
          <Button title={t.common.findTeacher} onPress={() => router.navigate('/search')} style={{ alignSelf: 'flex-start' }} />
        </View>
      )}
    </View>
  )
}

function LearnerView({ d, tz }: { d: LearnerDashboard; tz: string }) {
  const { api } = useDini()
  const dispute = useDisputeBooking()
  const now = api.now()
  const t = useT()
  const m = t.tracking
  const fmt = useFormat()
  return (
    <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingBottom: 110 }}>
      {d.awaitingValidation.map((b) => (
        <View key={b.id} style={{ padding: 16, paddingHorizontal: 20, gap: 10, backgroundColor: colors.leaf, borderBottomWidth: 1, borderColor: colors.line }}>
          {b.status === 'missed'
            ? <T><T style={{ fontFamily: font.semibold }}>{m.missed(fmt.day(b.startsAt, tz))}</T>{m.missedText(Math.max(1, Math.ceil((b.releaseAt - now) / HOUR)))}</T>
            : <T><T style={{ fontFamily: font.semibold }}>{m.session(fmt.day(b.startsAt, tz))}</T>{m.sessionText(Math.max(1, Math.ceil((b.releaseAt - now) / HOUR)))}</T>}
          <Button title={b.status === 'missed' ? m.contest : m.report} kind="ghost" onPress={() => dispute.mutate(b.id)} style={{ alignSelf: 'flex-start', minHeight: 40 }} />
        </View>
      ))}
      {d.disputed.map((b) => (
        <T key={b.id} style={{ padding: 16, paddingHorizontal: 20, backgroundColor: colors.warnBg, color: colors.warn }}>{m.disputed(fmt.day(b.startsAt, tz))}</T>
      ))}
      <Section title={m.next}>
        {d.next ? <>
          <T style={{ fontFamily: font.display, fontSize: 20, textTransform: 'capitalize' }}>{fmt.dateTime(d.next.startsAt, tz)}</T>
          <T tone="muted">{d.next.kind === 'trial' ? m.trialPrefix : ''}{m.yourTime}</T>
          <JoinButton booking={d.next} tz={tz} />
        </> : <>
          <T tone="muted">{m.noneNext}</T>
          <Button title={t.common.findTeacher} onPress={() => router.navigate('/search')} style={{ alignSelf: 'flex-start' }} />
        </>}
      </Section>
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.line }}>
        <View style={{ flex: 1, padding: 18, paddingStart: 20, gap: 8, borderEndWidth: 1, borderColor: colors.line }}>
          <T tone="label">{m.attendance}</T>
          <T><T style={{ fontFamily: font.display, fontSize: 26, color: colors.green }}>{d.attendance.present}</T>{m.outOf(d.attendance.held)}</T>
          <View style={{ flexDirection: 'row', gap: 9, padding: 3 }} accessibilityLabel={m.attendedLabel(d.attendance.present, d.attendance.held)}>
            {d.attendance.marks.map((m, i) => <View key={i} style={m === 'missed' ? { width: 10, height: 10, borderWidth: 1.5, borderColor: colors.bad, transform: [{ rotate: '45deg' }] } : { width: 12, height: 12, backgroundColor: colors.green2, transform: [{ rotate: '45deg' }] }} />)}
          </View>
        </View>
        <View style={{ flex: 1, padding: 18, gap: 8 }}>
          <T tone="label">{m.plan}</T>
          {d.subscription
            ? <><T><T style={{ fontFamily: font.display, fontSize: 26, color: colors.green }}>{d.subscription.sessionsRemaining}</T>{m.remaining(d.subscription.sessionsRemaining)}</T><T tone="muted">{m.perMonth(d.subscription.sessionsPerMonth)}</T></>
            : <T tone="muted">{m.noPlan}</T>}
        </View>
      </View>
      <Section title={m.memorisation}>
        {d.progress.length === 0 ? <T tone="muted">{m.noProgress}</T> : d.progress.map((p) => {
          const s = surah(p.surah)!
          return (
            <View key={p.surah} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <T tone="arabic" style={{ width: 84, fontSize: 20, color: colors.ink }}>{s.ar}</T>
              <View style={{ flex: 1, height: 8, backgroundColor: colors.leaf, flexDirection: 'row-reverse' }}>
                <View style={{ width: `${(p.reached / s.ayat) * 100}%`, backgroundColor: colors.green2 }} />
              </View>
              <T tone="muted" style={{ width: 40, textAlign: 'right', writingDirection: 'ltr' }}>{p.reached}/{s.ayat}</T>
            </View>
          )
        })}
      </Section>
      <Section title={m.lastReport} style={{ borderBottomWidth: 0 }}>
        {d.lastReport?.report ? (
          <Pressable accessibilityRole="button" onPress={() => router.push(`/report/${d.lastReport!.id}`)} style={{ padding: 16, gap: 4, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white }}>
            <T tone="muted" style={{ textTransform: 'capitalize' }}>{fmt.day(d.lastReport.startsAt, tz)}</T>
            <T style={{ fontFamily: font.semibold }}>{d.lastReport.report.covered}</T>
            <T>{d.lastReport.report.comment}</T>
            <T style={{ fontFamily: font.semibold, color: colors.green }}>{m.readReport}</T>
          </Pressable>
        ) : <T tone="muted">{m.noReport}</T>}
      </Section>
    </ScrollView>
  )
}
