import { PLANS, colors, subject, type PaymentMethod } from '@dini/core'
import { useAccount, useFamily, useGroup, useLeaveGroup, useStartGroupPayment, useStartPayment } from '@dini/data/react'
import { SignInPrompt } from '@/lib/auth'
import { router, useLocalSearchParams } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Share, View } from 'react-native'
import { SITE_URL } from '@/lib/api'
import { Button, Chip, Section, T, font } from '@/lib/ui'
import { GroupStatusBadge, useSlotLabel } from '@/lib/groups'
import { useFormat, useT } from '@/lib/i18n'

// Page d'un groupe (comme sur le site) : état, membres, invitation, paiement de sa part, séances.

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const group = useGroup(id)
  const family = useFamily()
  const leave = useLeaveGroup()
  const startShare = useStartGroupPayment()
  const startPayment = useStartPayment()
  const all = useT()
  const account = useAccount()
  const m = all.groups
  const fmt = useFormat()
  const slotLabel = useSlotLabel()
  const [method, setMethod] = useState<PaymentMethod>()
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  if (account === null) return <SignInPrompt title={all.groups.cta} text={all.groups.newIntro} next={`/group/${id}`} />
  if (group.isError) return <T style={{ margin: 20, color: colors.warn }}>{group.error.message}</T>
  const g = group.data
  if (!g) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.green} />
  const tz = family.data?.family.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const plan = PLANS.find((p) => p.id === g.planId)!
  const toPay = g.members.filter((x) => x.mine && x.status === 'joined')
  const methods = family.data?.country.payments ?? []
  const pay = method ?? methods[0]
  const open = g.status === 'forming' || g.status === 'payment'
  const link = g.inviteCode ? `${SITE_URL}/join/${g.inviteCode}` : null

  const share = () => {
    if (!link || !g.inviteCode) return
    Share.share({ message: m.shareText(g.teacherName, link, g.inviteCode), url: link }).catch(() => {})
  }
  async function payShare(memberId: string) {
    setError(null)
    setPaying(true)
    try {
      const { paymentId } = await startShare.mutateAsync({ memberId, method: pay })
      const { url } = await startPayment.mutateAsync({ paymentId, returnUrl: `${SITE_URL}/groups/${g!.id}` })
      // Page de paiement Bictorys dans le navigateur intégré ; au retour, le groupe se relit.
      await WebBrowser.openBrowserAsync(url)
      group.refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : null)
    } finally {
      setPaying(false)
    }
  }
  const quit = () => Alert.alert(g.isOrganizer ? m.confirmCancel : m.confirmLeave, undefined, [
    { text: m.no, style: 'cancel' },
    { text: m.yes, style: 'destructive', onPress: () => leave.mutate(g.id, { onSuccess: () => { if (!g.isOrganizer) router.back() } }) },
  ])

  const statusText = g.status === 'forming' ? m.formingText(g.min)
    : g.status === 'payment' ? m.paymentText(g.paymentDeadline ? fmt.dateTime(g.paymentDeadline, tz) : '')
    : g.status === 'active' ? m.activeText : g.status === 'cancelled' ? m.cancelledText : m.endedText

  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={group.isRefetching} onRefresh={() => { group.refetch() }} />}>
      <View style={{ padding: 20, gap: 8 }}>
        <T tone="h1" style={{ fontSize: 24, lineHeight: 30 }}>{fmt.label(subject(g.subject).label)} · {g.teacherName}</T>
        <GroupStatusBadge status={g.status} />
        <T style={{ backgroundColor: colors.leaf, padding: 12, borderRadius: 12 }}>{statusText}</T>
      </View>

      <Section>
        <T tone="muted">{m.plan}</T>
        <T style={{ fontFamily: font.semibold }}>{m.planLine(fmt.label(plan.label), plan.sessions)}</T>
        <T tone="muted">{m.slots(g.slots.length)}</T>
        <T style={{ fontFamily: font.semibold }}>{g.slots.map(slotLabel).join(', ')} <T tone="muted" style={{ fontSize: 13 }}>({g.teacherTimezone})</T></T>
        {g.share && <>
          <T tone="muted">{m.yourShare}</T>
          <T style={{ fontFamily: font.semibold }}>{fmt.money(g.share.amount, g.share.currency)}{m.perMonth}</T>
        </>}
      </Section>

      {open && link && (
        <Section title={m.invite}>
          <T selectable tone="muted">{link}</T>
          {g.inviteCode && <T selectable style={{ fontFamily: font.semibold }}>{m.code(g.inviteCode)}</T>}
          <Button title={m.shareInvite} kind="ghost" onPress={share} style={{ alignSelf: 'flex-start' }} />
        </Section>
      )}

      <Section title={m.members(g.members.length, g.max)}>
        {g.members.map((x) => (
          <View key={x.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.line }}>
            <T>{x.name}{x.mine ? m.you : ''}</T>
            <T style={{ fontFamily: font.semibold, color: x.status === 'paid' ? colors.green2 : g.status === 'payment' ? colors.ochre : colors.muted }}>
              {x.status === 'paid' ? m.paid : g.status === 'payment' ? m.toPay : m.joined}
            </T>
          </View>
        ))}
        {g.status === 'payment' && toPay.length > 0 && g.share && <>
          {methods.length > 1 && <>
            <T style={{ fontFamily: font.semibold, marginTop: 6 }}>{m.howPay}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {methods.map((pm) => <Chip key={pm} label={all.book.payments[pm]} on={pay === pm} onPress={() => setMethod(pm)} />)}
            </View>
          </>}
          {toPay.map((x) => (
            <Button key={x.id} title={paying ? m.paying : `${m.payShare(fmt.money(g.share!.amount, g.share!.currency))}${toPay.length > 1 ? ` (${x.name})` : ''}`}
              disabled={paying} onPress={() => payShare(x.id)} />
          ))}
          <T tone="muted" style={{ fontSize: 13 }}>{all.book.secure}</T>
        </>}
        {error || leave.error ? <T style={{ color: colors.warn, backgroundColor: colors.warnBg, padding: 10 }}>{error ?? leave.error?.message}</T> : null}
      </Section>

      <Section title={m.sessions}>
        {!g.sessions.length ? <T tone="muted">{m.noSessions}</T> : g.sessions.map((x) => (
          <T key={x.id} style={{ textTransform: 'capitalize' }}>{fmt.dateTime(x.startsAt, tz)}{x.status === 'delivered' ? '  ✓' : ''}</T>
        ))}
      </Section>

      {open && (g.isOrganizer || g.members.some((x) => x.mine && x.status === 'joined')) && (
        <Button title={g.isOrganizer ? m.cancelGroup : m.leave} kind="ghost" disabled={leave.isPending} onPress={quit} style={{ marginHorizontal: 20, alignSelf: 'flex-start' }} />
      )}
    </ScrollView>
  )
}
