import { createClient } from '@supabase/supabase-js'
import type { KeyValueStorage } from '../api'
import { createSupabaseApi, type DiniClient } from './api'
import type { Database } from './database.types'

export * from './api'
export type { Database } from './database.types'

/**
 * Client Supabase de DINE. `storage` garde la session entre deux lancements : localStorage sur le web,
 * AsyncStorage sur mobile. `detectSessionInUrl` termine les connexions Google et les liens reçus par e-mail sur le web.
 */
export function createDiniClient(url: string, publishableKey: string, opts: { storage?: KeyValueStorage; detectSessionInUrl?: boolean } = {}): DiniClient {
  return createClient<Database>(url, publishableKey, {
    auth: {
      flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: opts.detectSessionInUrl ?? false,
      ...(opts.storage ? { storage: opts.storage as never } : {}),
    },
  })
}
