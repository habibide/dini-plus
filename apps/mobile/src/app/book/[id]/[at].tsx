import { colors, type PaymentMethod } from '@dini/core'
import { SlotTakenError, type BookingChoice } from '@dini/data'
import { useAddLearner, useCreateBooking, useFamily, useQuote, useTeacher } from '@dini/data/react'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { Input } from '@/lib/auth'
import { Button, Option, T, font } from '@/lib/ui'
import { useFormat, useT } from '@/lib/i18n'

export default function BookScreen() {
  const { id, at: atParam } = useLocalSearchParams<{ id: string; at: string }>()
  const at = Number(atParam)
  const teacher = useTeacher(id)
  const family = useFamily()
  const [learnerId, setLearnerId] = useState<string>()
  const [choice, setChoice] = useState<BookingChoice>('trial')
  const [method, setMethod] = useState<PaymentMethod>()
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string>()
  const quote = useQuote(id, learnerId)
  const create = useCreateBooking()
  const addLearner = useAddLearner()
  const [newName, setNewName] = useState('')
  const all = useT()
  const m = all.book
  const fmt = useFormat()

  if (!teacher.data || !family.data) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.green} />
  const t = teacher.data
  const { family: fam, learners } = family.data
  const tz = fam.timezone
  const q = quote.data
  const total = !q ? 0 : choice === 'trial' ? q.trial : choice === 'credit' ? 0 : q.plans.find((p) => p.id === choice)!.total
  const pay = method ?? q?.payments[0]
  // Essai déjà fait avec cet enseignant : on propose le forfait en cours, sinon la première formule.
  if (q && !q.trialAvailable && choice === 'trial') setChoice(q.credit ? 'credit' : q.plans[0].id)

  async function confirm() {
    setError(undefined)
    try {
      await create.mutateAsync({ learnerId: learnerId!, teacherId: t.id, subject: t.subjects[0], startsAt: at, choice, method: pay })
      router.dismissAll()
      router.navigate('/suivi')
    } catch (e) {
      setError(e instanceof SlotTakenError ? e.message : m.failed)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <View style={{ backgroundColor: colors.leaf, padding: 14, gap: 2 }}>
          <T style={{ fontFamily: font.semibold }}>{t.name}</T>
          <T style={{ textTransform: 'capitalize' }}>{fmt.day(at, tz)}, {fmt.time(at, tz)}</T>
          <T tone="muted">{m.yourTime(fmt.time(at, t.timezone), t.city)}</T>
        </View>
        <T tone="label">{m.step(step + 1)}</T>

        {step === 0 && <>
          <T tone="h2">{m.forWhom}</T>
          {learners.map((l) => <Option key={l.id} on={learnerId === l.id} onPress={() => { setLearnerId(l.id); setChoice('trial') }} title={l.name} detail={l.goals} />)}
          <Input label={learners.length ? m.addStudent : m.studentName} value={newName} onChangeText={setNewName} placeholder={m.studentPlaceholder} />
          <Button title={addLearner.isPending ? all.common.adding : all.common.add} kind="ghost" disabled={!newName.trim() || addLearner.isPending}
            onPress={() => addLearner.mutate({ name: newName, birthYear: new Date().getFullYear() - 8 }, { onSuccess: (l) => { setLearnerId(l.id); setNewName('') } })} style={{ alignSelf: 'flex-start' }} />
        </>}

        {step === 1 && q && <>
          <T tone="h2">{m.which}</T>
          {q.credit && <Option on={choice === 'credit'} onPress={() => setChoice('credit')} title={m.useCredit} detail={m.remaining(q.credit.remaining)} right={all.common.included} />}
          {q.trialAvailable && <Option on={choice === 'trial'} onPress={() => setChoice('trial')} title={m.trial(q.minutes.trial)} detail={m.trialText} right={fmt.money(q.trial, q.currency)} />}
          {q.plans.map((p) => <Option key={p.id} on={choice === p.id} onPress={() => setChoice(p.id)} title={m.plan(fmt.label(p.label), p.sessions, q.minutes.course)} detail={m.planText(fmt.label(p.usage))} right={fmt.money(p.total, q.currency)} />)}
          <T tone="muted">{m.indicative}</T>
        </>}

        {step === 2 && q && <>
          <T tone="h2">{total ? m.payment : m.check}</T>
          {total > 0 && q.payments.map((pm) => <Option key={pm} on={pay === pm} onPress={() => setMethod(pm)} title={m.payments[pm]} detail={pm === 'card' ? m.card : m.phone} />)}
          {total > 0 && <T tone="muted">{m.simulated}</T>}
          <T>{total ? m.escrow : m.usesCredit}</T>
          <T tone="muted">{m.freeCancel}</T>
          {error ? <T style={{ color: colors.warn, backgroundColor: colors.warnBg, padding: 10 }}>{error}</T> : null}
        </>}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 30, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.white }}>
        {step > 0 && <Button title={all.common.back} kind="ghost" onPress={() => setStep(step - 1)} />}
        {step < 2
          ? <Button title={all.common.continue} disabled={!learnerId || (step === 1 && !q)} onPress={() => setStep(step + 1)} style={{ flex: 1 }} />
          : <Button title={create.isPending ? m.booking : total && q ? m.pay(fmt.money(total, q.currency)) : m.confirm} disabled={create.isPending} onPress={confirm} style={{ flex: 1 }} />}
      </View>
    </View>
  )
}
