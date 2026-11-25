import { colors } from '@dini/core'
import { DiniProvider } from '@dini/data/react'
import { Amiri_400Regular } from '@expo-google-fonts/amiri'
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { View } from 'react-native'
import { api, storage } from '@/lib/api'
import { ErrorBanner } from '@/lib/ui'
import { useIsRTL, useT } from '@/lib/i18n'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [loaded] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, Amiri_400Regular })
  useEffect(() => { if (loaded) SplashScreen.hideAsync() }, [loaded])
  const t = useT()
  const rtl = useIsRTL()
  if (!loaded) return null
  return (
    <DiniProvider api={api} storage={storage}>
      {/* En arabe, toute la mise en page passe de droite à gauche, sans redémarrer l'app. */}
      <View style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr' }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTintColor: colors.green, headerStyle: { backgroundColor: colors.paper }, contentStyle: { backgroundColor: colors.paper }, headerBackTitle: t.common.back, headerTitleStyle: { fontFamily: 'PlusJakartaSans_700Bold' }, headerShadowVisible: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="teacher/[id]" options={{ title: t.titles.profile }} />
        <Stack.Screen name="book/[id]/[at]" options={{ title: t.titles.booking }} />
        <Stack.Screen name="report/[id]" options={{ title: t.titles.report }} />
        <Stack.Screen name="session/[id]" options={{ title: t.titles.session }} />
        <Stack.Screen name="group/new" options={{ title: t.titles.groupNew }} />
        <Stack.Screen name="group/[id]" options={{ title: t.titles.group }} />
        <Stack.Screen name="join/index" options={{ title: t.titles.join }} />
        <Stack.Screen name="join/[code]" options={{ title: t.titles.join }} />
        <Stack.Screen name="login" options={{ title: t.titles.login, presentation: 'modal' }} />
        <Stack.Screen name="signup" options={{ title: t.titles.signup, presentation: 'modal' }} />
        <Stack.Screen name="forgot" options={{ title: t.titles.forgot }} />
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
      </Stack>
      <ErrorBanner />
      </View>
    </DiniProvider>
  )
}
