import { colors } from '@dini/core'
import { NativeTabs } from 'expo-router/native-tabs'

export default function TabsLayout() {
  return (
    <NativeTabs tintColor={colors.green} iconColor={{ default: colors.muted, selected: colors.green }} backgroundColor={colors.white} indicatorColor={colors.leaf} labelStyle={{ selected: { color: colors.green } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Accueil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>Recherche</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="suivi">
        <NativeTabs.Trigger.Label>Suivi</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar" md="insights" />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
