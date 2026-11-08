import { PAYMENT_LABELS, colors, formatDay, formatMoney, formatTime, type PaymentMethod } from '@dini/core'
import { SlotTakenError, type BookingChoice } from '@dini/data'
import { useAddLearner, useCreateBooking, useFamily, useQuote, useTeacher } from '@dini/data/react'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { Input } from '@/lib/auth'
import { Button, Option, T, font } from '@/lib/ui'

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
      setError(e instanceof SlotTakenError ? e.message : 'La réservation n’a pas abouti. Réessayez.')
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <View style={{ backgroundColor: colors.leaf, padding: 14, gap: 2 }}>
          <T style={{ fontFamily: font.semibold }}>{t.name}</T>
          <T style={{ textTransform: 'capitalize' }}>{formatDay(at, tz)}, {formatTime(at, tz)}</T>
          <T tone="muted">Votre heure. Chez l’enseignant : {formatTime(at, t.timezone)} à {t.city}.</T>
        </View>
        <T tone="label">Étape {step + 1} sur 3</T>

        {step === 0 && <>
          <T tone="h2">Pour qui est ce cours&nbsp;?</T>
          {learners.map((l) => <Option key={l.id} on={learnerId === l.id} onPress={() => { setLearnerId(l.id); setChoice('trial') }} title={l.name} detail={l.goals} />)}
          <Input label={learners.length ? 'Ajouter un élève' : 'Prénom et nom de l’élève'} value={newName} onChangeText={setNewName} placeholder="Vous-même ou votre enfant" />
          <Button title={addLearner.isPending ? 'Ajout…' : 'Ajouter'} kind="ghost" disabled={!newName.trim() || addLearner.isPending}
            onPress={() => addLearner.mutate({ name: newName, birthYear: new Date().getFullYear() - 8 }, { onSuccess: (l) => { setLearnerId(l.id); setNewName('') } })} style={{ alignSelf: 'flex-start' }} />
        </>}

        {step === 1 && q && <>
          <T tone="h2">Quelle formule&nbsp;?</T>
          {q.credit && <Option on={choice === 'credit'} onPress={() => setChoice('credit')} title="Utiliser mon forfait" detail={`${q.credit.remaining} ${q.credit.remaining > 1 ? 'séances restantes' : 'séance restante'}`} right="Inclus" />}
          {q.trialAvailable && <Option on={choice === 'trial'} onPress={() => setChoice('trial')} title={`Séance d’essai, ${q.minutes.trial} min`} detail="Pour tester le niveau et faire connaissance. Une seule par enseignant." right={formatMoney(q.trial, q.currency)} />}
          {q.plans.map((p) => <Option key={p.id} on={choice === p.id} onPress={() => setChoice(p.id)} title={`${p.label.fr}, ${p.sessions} cours de ${q.minutes.course} min`} detail={`${p.usage.fr}. Par mois.`} right={formatMoney(p.total, q.currency)} />)}
          <T tone="muted">Montants indicatifs, en attente de l’étude tarifaire.</T>
        </>}

        {step === 2 && q && <>
          <T tone="h2">{total ? 'Paiement' : 'Vérifiez avant de confirmer'}</T>
          {total > 0 && q.payments.map((m) => <Option key={m} on={pay === m} onPress={() => setMethod(m)} title={PAYMENT_LABELS[m]} detail={m === 'card' ? 'Visa, Mastercard' : 'Validation sur le téléphone'} />)}
          {total > 0 && <T tone="muted">Paiement simulé : aucune donnée bancaire n’est demandée.</T>}
          <T>{total ? 'Le montant reste bloqué chez DINE. Vous avez 48 h après chaque séance pour signaler un problème.' : 'Une séance de votre forfait sera utilisée.'}</T>
          <T tone="muted">Annulation gratuite jusqu’à 24 h avant la séance.</T>
          {error ? <T style={{ color: colors.warn, backgroundColor: colors.warnBg, padding: 10 }}>{error}</T> : null}
        </>}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 30, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.white }}>
        {step > 0 && <Button title="Retour" kind="ghost" onPress={() => setStep(step - 1)} />}
        {step < 2
          ? <Button title="Continuer" disabled={!learnerId || (step === 1 && !q)} onPress={() => setStep(step + 1)} style={{ flex: 1 }} />
          : <Button title={create.isPending ? 'Réservation…' : total && q ? `Payer ${formatMoney(total, q.currency)}` : 'Confirmer la séance'} disabled={create.isPending} onPress={confirm} style={{ flex: 1 }} />}
      </View>
    </View>
  )
}
