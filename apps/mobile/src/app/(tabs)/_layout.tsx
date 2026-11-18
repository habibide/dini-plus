import { colors } from '@dini/core'
import { useAccount } from '@dini/data/react'
import { NativeTabs } from 'expo-router/native-tabs'
import { useT } from '@/lib/i18n'

export default function TabsLayout() {
  const account = useAccount()
  const teacher = account?.role === 'teacher'
  const t = useT().tabs
  return (
    <NativeTabs tintColor={colors.green} iconColor={{ default: colors.muted, selected: colors.green }} backgroundColor={colors.white} indicatorColor={colors.leaf} labelStyle={{ selected: { color: colors.green } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t.home}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>{t.search}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="suivi" hidden={teacher}>
        <NativeTabs.Trigger.Label>{t.tracking}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar" md="insights" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="agenda" hidden={!teacher}>
        <NativeTabs.Trigger.Label>{t.agenda}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="compte">
        <NativeTabs.Trigger.Label>{t.account}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
