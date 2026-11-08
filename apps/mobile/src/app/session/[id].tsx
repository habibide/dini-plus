import { SURAHS, colors, formatDateTime, subject, type Report } from '@dini/core'
import { useAgenda, useDeliverSession, useMarkMissed } from '@dini/data/react'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { FormError, Input } from '@/lib/auth'
import { Button, Chip, T } from '@/lib/ui'
import { JoinButton } from '@/lib/video'

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const agenda = useAgenda()
  const deliver = useDeliverSession()
  const missed = useMarkMissed()
  const [r, setR] = useState<Report>({ covered: '', tajwidNotes: '', homework: '', comment: '' })
  const set = (patch: Partial<Report>) => setR((x) => ({ ...x, ...patch }))
  if (agenda.isPending) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.green} />
  const b = agenda.data?.find((x) => x.id === id)
  if (!b) return <T style={{ padding: 20 }}>Séance introuvable.</T>
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const started = b.startsAt <= Date.now()
  const quran = b.subject === 'quran' || b.subject === 'tajwid'
  const num = (v: string) => (v ? Number(v) : undefined)

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 60 }}>
        <T tone="h1">{b.learner.name}</T>
        <T tone="muted" style={{ textTransform: 'capitalize' }}>{formatDateTime(b.startsAt, tz)} · {subject(b.subject).label.fr}</T>
        <T>Objectif : {b.learner.goals}</T>
        {b.status === 'scheduled' && <JoinButton booking={b} tz={tz} />}
        {b.status !== 'scheduled' ? <T style={{ backgroundColor: colors.leaf, padding: 12 }}>Cette séance est terminée.</T>
          : !started ? <T style={{ backgroundColor: colors.leaf, padding: 12 }}>Le compte rendu s’écrit après la séance.</T>
          : <>
            <Input label="Ce qui a été travaillé" value={r.covered} onChangeText={(v) => set({ covered: v })} placeholder="Al-Masad, versets 1 à 3" />
            {quran && <>
              <T style={{ fontWeight: '600' }}>Sourate</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {SURAHS.map((s) => <Chip key={s.id} label={s.name} on={r.surah === s.id} onPress={() => set({ surah: r.surah === s.id ? undefined : s.id })} />)}
              </ScrollView>
              {r.surah && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}><Input label="Du verset" keyboardType="number-pad" value={r.ayahFrom?.toString() ?? ''} onChangeText={(v) => set({ ayahFrom: num(v) })} /></View>
                  <View style={{ flex: 1 }}><Input label="Au verset" keyboardType="number-pad" value={r.ayahTo?.toString() ?? ''} onChangeText={(v) => set({ ayahTo: num(v) })} /></View>
                </View>
              )}
            </>}
            <Input label="Remarques de tajwid" multiline value={r.tajwidNotes} onChangeText={(v) => set({ tajwidNotes: v })} style={{ minHeight: 70, paddingTop: 12 }} />
            <Input label="Travail pour la prochaine fois" multiline value={r.homework} onChangeText={(v) => set({ homework: v })} style={{ minHeight: 70, paddingTop: 12 }} />
            <Input label="Mot pour la famille" multiline value={r.comment} onChangeText={(v) => set({ comment: v })} style={{ minHeight: 90, paddingTop: 12 }} />
            <FormError message={deliver.error?.message ?? missed.error?.message} />
            <Button title={deliver.isPending ? 'Envoi…' : 'Envoyer le compte rendu'} disabled={deliver.isPending || !r.covered.trim()}
              onPress={() => deliver.mutate({ id: b.id, report: r }, { onSuccess: () => router.back() })} />
            <Button title="L’élève était absent" kind="ghost" disabled={missed.isPending}
              onPress={() => Alert.alert('Élève absent', 'Confirmer que l’élève ne s’est pas présenté ?', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Confirmer', onPress: () => missed.mutate(b.id, { onSuccess: () => router.back() }) },
              ])} />
          </>}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
