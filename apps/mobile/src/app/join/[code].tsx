import { PLANS, colors, subject } from '@dini/core'
import { useAccount, useFamily, useGroupInvite, useJoinGroup } from '@dini/data/react'
import { SignInPrompt } from '@/lib/auth'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { Button, Chip, Section, T, font } from '@/lib/ui'
import { GroupStatusBadge, useSlotLabel } from '@/lib/groups'
import { useFormat, useT } from '@/lib/i18n'

// Invitation : aperçu du groupe à partir du code, choix de l'élève inscrit, puis la page du groupe.

export default function JoinGroup() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const invite = useGroupInvite(code)
  const family = useFamily()
  const join = useJoinGroup()
  const all = useT()
  const account = useAccount()
  const m = all.groups
  const fmt = useFormat()
  const slotLabel = useSlotLabel()
  const [learnerId, setLearnerId] = useState<string>()

  if (account === null) return <SignInPrompt title={all.groups.cta} text={all.groups.newIntro} next={`/join/${code}`} />
  if (invite.isError) return <T style={{ margin: 20, color: colors.warn }}>{invite.error.message}</T>
  const g = invite.data
  if (!g || !family.data) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.green} />
  const plan = PLANS.find((p) => p.id === g.planId)!
  // Une famille peut inscrire plusieurs enfants : on propose ceux qui ne sont pas encore dans le groupe.
  const learners = family.data.learners.filter((l) => !(g.myLearners ?? []).includes(l.id))
  const learner = learnerId ?? learners[0]?.id
  const open = (g.status === 'forming' || g.status === 'payment') && g.members < g.max

  const submit = () => {
    if (!learner) return
    join.mutate({ code, learnerId: learner }, { onSuccess: (id) => router.replace({ pathname: '/group/[id]', params: { id } }) })
  }

  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ padding: 20, gap: 8 }}>
        <T tone="h1" style={{ fontSize: 24, lineHeight: 30 }}>{m.joinTitle(g.teacherName)}</T>
        <GroupStatusBadge status={g.status} />
      </View>
      <Section>
        <T tone="muted">{m.subject}</T><T style={{ fontFamily: font.semibold }}>{fmt.label(subject(g.subject).label)}</T>
        <T tone="muted">{m.plan}</T><T style={{ fontFamily: font.semibold }}>{m.planLine(fmt.label(plan.label), plan.sessions)}</T>
        <T tone="muted">{m.slots(g.slots.length)}</T>
        <T style={{ fontFamily: font.semibold }}>{g.slots.map(slotLabel).join(', ')} <T tone="muted" style={{ fontSize: 13 }}>({g.teacherTimezone})</T></T>
        <T tone="muted">{m.members(g.members, g.max)}</T>
        {g.share && <T style={{ fontFamily: font.display, fontSize: 20, color: colors.green }}>{fmt.money(g.share.amount, g.share.currency)}{m.perMonth}</T>}
      </Section>
      <View style={{ padding: 20, gap: 12 }}>
        {g.isMember && !learners.length ? <>
          <T style={{ backgroundColor: colors.soft, color: colors.green2, padding: 12 }}>{m.alreadyMember}</T>
          <Button title={m.openGroup} onPress={() => router.replace({ pathname: '/group/[id]', params: { id: g.id } })} />
        </> : !open ? (
          <T style={{ backgroundColor: colors.warnBg, color: colors.warn, padding: 12 }}>{m.closed}</T>
        ) : <>
          {g.isMember && <Button title={m.openGroup} kind="ghost" onPress={() => router.replace({ pathname: '/group/[id]', params: { id: g.id } })} />}
          {learners.length > 1 && <>
            <T style={{ fontFamily: font.semibold }}>{m.joinAs}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {learners.map((l) => <Chip key={l.id} label={l.name} on={learner === l.id} onPress={() => setLearnerId(l.id)} />)}
            </View>
          </>}
          {join.error ? <T style={{ color: colors.warn, backgroundColor: colors.warnBg, padding: 10 }}>{join.error.message}</T> : null}
          <Button title={join.isPending ? m.joining : m.join} disabled={join.isPending || !learner} onPress={submit} />
          <T tone="muted" style={{ fontSize: 13 }}>{m.discount}</T>
        </>}
      </View>
    </ScrollView>
  )
}
