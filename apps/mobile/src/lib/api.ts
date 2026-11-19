import AsyncStorage from '@react-native-async-storage/async-storage'
import type { KeyValueStorage } from '@dini/data'
import { createDiniClient, createSupabaseApi } from '@dini/data/supabase'
import { AppState } from 'react-native'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase n’est pas configuré : copiez apps/mobile/.env.example en .env.local.')

export const storage: KeyValueStorage = AsyncStorage

const client = createDiniClient(SUPABASE_URL, SUPABASE_KEY, { storage })
// Le rafraîchissement du jeton ne tourne que lorsque l'app est au premier plan.
AppState.addEventListener('change', (state) => {
  if (state === 'active') client.auth.startAutoRefresh()
  else client.auth.stopAutoRefresh()
})

export const api = createSupabaseApi(client, storage, { url: SUPABASE_URL, key: SUPABASE_KEY })

/** Adresse du site web (liens de partage, retour des e-mails de mot de passe). */
export const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? 'https://dine-ivory.vercel.app'
