import { PLANS, colors, roundMoney, subject, type PlanId, type SubjectId } from '@dini/core'
import type { GroupSlot } from '@dini/data/supabase'
import { useAccount, useCreateGroup, useEnsureLearner, useFamily, useSlots, useTeacher } from '@dini/data/react'
import { Input, SignInPrompt } from '@/lib/auth'
import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { Button, Chip, Option, T, font } from '@/lib/ui'
import { useSlotLabel, weeklySlot } from '@/lib/groups'
import { useFormat, useT } from '@/lib/i18n'

// Création d'un groupe (comme sur le site) : élève, matière, formule et créneaux fixes de la semaine.

const GROUP_DISCOUNT = 0.4
const key = (s: GroupSlot) => `${s.weekday}:${s.start}`

export default function NewGroup() {
  const { teacher: teacherId = '' } = useLocalSearchParams<{ teacher: string }>()
  const teacher = useTeacher(teacherId)
  const family = useFamily()
  const week = useSlots(teacherId, 0)
  const create = useCreateGroup()
  const all = useT()
  const account = useAccount()
  const m = all.groups
  const fmt = useFormat()
  const slotLabel = useSlotLabel()
  const [learnerId, setLearnerId] = useState<string>()
  const [subj, setSubj] = useState<SubjectId>()
  const [planId, setPlanId] = useState<PlanId>('discovery')
  const [picked, setPicked] = useState<GroupSlot[]>([])
  const learner = learnerId ?? family.data?.learners[0]?.id
  const student = useEnsureLearner(learner, family.data?.family.parentName)

  const t = teacher.data
  const options = useMemo(() => {
    if (!t || !week.data) return []
    const seen = new Map<string, GroupSlot>()
    for (const at of week.data) { const s = weeklySlot(at, t.timezone); seen.set(key(s), s) }
    return [...seen.values()].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.start - b.start)
  }, [t, week.data])

  if (account === null) return <SignInPrompt title={all.groups.cta} text={all.groups.newIntro} next={`/group/new?teacher=${teacherId}`} />
  if (!t || !family.data) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.green} />
  const learners = family.data.learners
  const subjectId = subj ?? t.subjects[0]
  const plan = PLANS.find((p) => p.id === planId)!
  const need = Math.ceil(plan.sessions / 4)
  const share = roundMoney(t.price.amount * plan.sessions * (1 - GROUP_DISCOUNT), t.price.currency)
  const toggle = (s: GroupSlot) => setPicked((cur) => cur.some((x) => key(x) === key(s)) ? cur.filter((x) => key(x) !== key(s)) : cur.length < need ? [...cur, s] : cur)

  const submit = async () => {
    const learnerId = await student.ensure()
    if (!learnerId) return
    create.mutate({ learnerId, teacherId: t.id, subject: subjectId, planId, slots: picked }, {
      onSuccess: (id) => router.replace({ pathname: '/group/[id]', params: { id } }),
    })
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
        <T tone="h1" style={{ fontSize: 24, lineHeight: 30 }}>{m.newTitle(t.name)}</T>
        <T tone="muted">{m.newIntro}</T>

        {learners.length > 1 && <>
          <T style={{ fontFamily: font.semibold }}>{m.student}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {learners.map((l) => <Chip key={l.id} label={l.name} on={learner === l.id} onPress={() => setLearnerId(l.id)} />)}
          </View>
        </>}
        {student.asSelf && <T tone="muted">{m.asSelf(student.self)}</T>}
        {student.needName && <Input label={m.studentName} value={student.name} onChangeText={student.setName} placeholder={m.studentPlaceholder} />}
        {t.subjects.length > 1 && <>
          <T style={{ fontFamily: font.semibold }}>{m.subject}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {t.subjects.map((s) => <Chip key={s} label={fmt.label(subject(s).label)} on={subjectId === s} onPress={() => setSubj(s)} />)}
          </View>
        </>}

        <T style={{ fontFamily: font.semibold }}>{m.plan}</T>
        {PLANS.map((p) => (
          <Option key={p.id} on={planId === p.id} onPress={() => { setPlanId(p.id); setPicked([]) }}
            title={m.planLine(fmt.label(p.label), p.sessions)} detail={fmt.label(p.usage)} />
        ))}

        <T style={{ fontFamily: font.semibold }}>{m.slots(need)}</T>
        <T tone="muted">{m.slotsTz(t.city)}</T>
        {week.isPending ? <ActivityIndicator color={colors.green} />
          : !options.length ? <T style={{ backgroundColor: colors.leaf, padding: 12 }}>{m.noSlots}</T>
          : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {options.map((s) => {
                const on = picked.some((x) => key(x) === key(s))
                return <Chip key={key(s)} label={slotLabel(s)} on={on} onPress={() => (on || picked.length < need) && toggle(s)} />
              })}
            </View>
          )}

        <View style={{ padding: 14, gap: 4, borderRadius: 12, backgroundColor: colors.leaf }}>
          <T style={{ fontFamily: font.semibold }}>{m.pricePer}</T>
          <T style={{ fontFamily: font.display, fontSize: 22, color: colors.green }}>{fmt.money(share, t.price.currency)}{m.perMonth}</T>
          <T tone="muted" style={{ fontSize: 13 }}>{m.discount}</T>
        </View>
        {create.error || student.error ? <T style={{ color: colors.warn, backgroundColor: colors.warnBg, padding: 10 }}>{(create.error ?? student.error)!.message}</T> : null}
      </ScrollView>
      <View style={{ padding: 16, paddingBottom: 30, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.white }}>
        <Button title={create.isPending || student.pending ? m.creating : m.create} disabled={create.isPending || student.pending || !student.ready || picked.length !== need} onPress={submit} />
      </View>
    </View>
  )
}
