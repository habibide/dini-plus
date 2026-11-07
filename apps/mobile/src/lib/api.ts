import AsyncStorage from '@react-native-async-storage/async-storage'
import { createMockApi, type DiniApi } from '@dini/data'
import { createDiniClient, createSupabaseApi } from '@dini/data/supabase'
import { AppState } from 'react-native'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

// Supabase quand le projet est configuré (.env.local), sinon les données fictives du téléphone. Même API que sur le web.
function createApi(): DiniApi {
  if (!SUPABASE_URL || !SUPABASE_KEY) return createMockApi(AsyncStorage)
  const client = createDiniClient(SUPABASE_URL, SUPABASE_KEY, AsyncStorage)
  // Le rafraîchissement du jeton ne tourne que lorsque l'app est au premier plan.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') client.auth.startAutoRefresh()
    else client.auth.stopAutoRefresh()
  })
  return createSupabaseApi(client)
}

export const api = createApi()
