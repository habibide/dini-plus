import { colors } from '@dini/core'
import { DiniProvider } from '@dini/data/react'
import { Amiri_400Regular } from '@expo-google-fonts/amiri'
import { HankenGrotesk_400Regular, HankenGrotesk_500Medium, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk'
import { YoungSerif_400Regular } from '@expo-google-fonts/young-serif'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { api, storage } from '@/lib/api'
import { ErrorBanner } from '@/lib/ui'
import { useT } from '@/lib/i18n'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [loaded] = useFonts({ YoungSerif_400Regular, HankenGrotesk_400Regular, HankenGrotesk_500Medium, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold, Amiri_400Regular })
  useEffect(() => { if (loaded) SplashScreen.hideAsync() }, [loaded])
  const t = useT()
  if (!loaded) return null
  return (
    <DiniProvider api={api} storage={storage}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTintColor: colors.green, headerStyle: { backgroundColor: colors.paper }, contentStyle: { backgroundColor: colors.paper }, headerBackTitle: t.common.back, headerTitleStyle: { fontFamily: 'HankenGrotesk_600SemiBold' } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="teacher/[id]" options={{ title: t.titles.profile }} />
        <Stack.Screen name="book/[id]/[at]" options={{ title: t.titles.booking }} />
        <Stack.Screen name="report/[id]" options={{ title: t.titles.report }} />
        <Stack.Screen name="session/[id]" options={{ title: t.titles.session }} />
        <Stack.Screen name="login" options={{ title: t.titles.login, presentation: 'modal' }} />
        <Stack.Screen name="signup" options={{ title: t.titles.signup, presentation: 'modal' }} />
        <Stack.Screen name="forgot" options={{ title: t.titles.forgot }} />
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
      </Stack>
      <ErrorBanner />
    </DiniProvider>
  )
}
