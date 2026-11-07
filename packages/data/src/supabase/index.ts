import { createClient } from '@supabase/supabase-js'
import type { KeyValueStorage } from '../api'
import { createSupabaseApi, type DiniClient } from './api'
import type { Database } from './database.types'

export { createSupabaseApi, intervalMs, type DiniClient } from './api'
export type { Database } from './database.types'

/**
 * Client Supabase de DINI. `storage` garde la session entre deux lancements :
 * localStorage sur le web (par défaut), AsyncStorage sur mobile.
 */
export function createDiniClient(url: string, publishableKey: string, storage?: KeyValueStorage): DiniClient {
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, ...(storage ? { storage: storage as never } : {}) },
  })
}

export const createSupabaseDiniApi = (url: string, publishableKey: string, storage?: KeyValueStorage) =>
  createSupabaseApi(createDiniClient(url, publishableKey, storage))
