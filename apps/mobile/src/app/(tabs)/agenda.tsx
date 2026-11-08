import { COMMISSION_TIERS, colors, commissionRate, formatDateTime, subject } from '@dini/core'
import type { AgendaItem } from '@dini/data/supabase'
import { useAccount, useAgenda, useEarnings, useMyTeacher } from '@dini/data/react'
import { router } from 'expo-router'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SignInPrompt } from '@/lib/auth'
import { Section, T, font } from '@/lib/ui'

const STATUS = {
  draft: ['Candidature à compléter', 'Remplissez votre profil sur le site DINI (matières, tarifs, diplômes, disponibilités), puis envoyez-le.'],
  submitted: ['Candidature en cours d’examen', 'Notre équipe vérifie votre identité, vos diplômes et votre ijaza, en général sous 3 jours ouvrés.'],
  rejected: ['Candidature à reprendre', 'Corrigez votre profil sur le site DINI selon le message ci-dessous, puis renvoyez-le.'],
} as const

const euros = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

export default function Agenda() {
  const account = useAccount()
  const me = useMyTeacher()
  const agenda = useAgenda()
  const earnings = useEarnings()
  const insets = useSafeAreaInsets()
  if (account === null) return <View style={{ paddingTop: insets.top }}><SignInPrompt title="Espace enseignant" text="Connectez-vous avec votre compte enseignant." next="/agenda" /></View>
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
        <T tone="h1">Bonjour {t?.name.split(' ')[0] || account.name.split(' ')[0]}</T>
        <T tone="muted">Votre espace enseignant</T>
      </View>
      {t && t.status !== 'approved' && (
        <Section style={{ backgroundColor: t.status === 'rejected' ? colors.warnBg : colors.leaf }}>
          <T style={{ fontFamily: font.semibold }}>{STATUS[t.status][0]}</T>
          <T>{STATUS[t.status][1]}</T>
          {t.status === 'rejected' && t.reviewNote ? <T style={{ color: colors.warn }}>« {t.reviewNote} »</T> : null}
        </Section>
      )}
      {t?.status === 'approved' && <>
        {toComplete.length > 0 && (
          <Section title="À compléter">
            <T tone="muted">Écrivez le compte rendu : la famille le reçoit, et votre paiement est libéré 48 h après.</T>
            {toComplete.map((b) => <Row key={b.id} b={b} highlight />)}
          </Section>
        )}
        <Section title="Prochaines séances">
          {agenda.isPending ? <ActivityIndicator color={colors.green} />
            : upcoming.length ? upcoming.map((b) => <Row key={b.id} b={b} />)
            : <T tone="muted">Aucune séance réservée pour l’instant.</T>}
        </Section>
        <Section title="Gains">
          <T><T style={{ fontFamily: font.display, fontSize: 26, color: colors.green }}>{euros(earnings.data?.releasedEur ?? 0)}</T> acquis, net de commission</T>
          <T tone="muted">{earnings.data?.pending.count ?? 0} séance(s) en attente des 48 h sans litige.</T>
          <T tone="muted">Commission DINI : {Math.round(commissionRate(hours) * 100)} % ({Math.round(hours)} h enseignées){next ? `, ${Math.round(next.rate * 100)} % dès ${next.fromHours} h` : ''}.</T>
        </Section>
      </>}
    </ScrollView>
  )
}

function Row({ b, highlight }: { b: AgendaItem; highlight?: boolean }) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/session/${b.id}`)}
      style={({ pressed }) => ({ padding: 14, gap: 3, borderWidth: 1, borderRadius: 4, borderColor: highlight ? colors.ochre : colors.line, backgroundColor: pressed ? colors.leaf : colors.white })}>
      <T style={{ fontFamily: font.semibold, textTransform: 'capitalize' }}>{formatDateTime(b.startsAt, tz)}</T>
      <T tone="muted">{b.learner.name} · {subject(b.subject).label.fr}{b.kind === 'trial' ? ' · essai' : ''}</T>
      {highlight && <T style={{ color: colors.green, fontFamily: font.semibold }}>Écrire le compte rendu</T>}
    </Pressable>
  )
}
