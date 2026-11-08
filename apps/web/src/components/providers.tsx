'use client'

import { memoryStorage, type KeyValueStorage } from '@dini/data'
import { DiniProvider } from '@dini/data/react'
import { createDiniClient, createSupabaseApi, type DiniApi } from '@dini/data/supabase'
import { useState, type ReactNode } from 'react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/** localStorage, sans planter quand le navigateur le refuse (navigation privée, stockage bloqué). */
const browserStorage: KeyValueStorage = {
  getItem: (k) => { try { return window.localStorage.getItem(k) } catch { return null } },
  setItem: (k, v) => { try { window.localStorage.setItem(k, v) } catch { /* préférence perdue, sans gravité */ } },
  removeItem: (k) => { try { window.localStorage.removeItem(k) } catch { /* idem */ } },
}

// Une seule instance par onglet : React peut appeler l'initialiseur deux fois en développement.
let browserApi: { api: DiniApi; storage: KeyValueStorage } | undefined

function createApi() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase n’est pas configuré : copiez apps/web/.env.example en .env.local.')
  if (typeof window === 'undefined') {
    // Rendu serveur : aucune donnée n'y est chargée, les écrans s'affichent après l'hydratation.
    const storage = memoryStorage()
    return { api: createSupabaseApi(createDiniClient(SUPABASE_URL, SUPABASE_KEY, { storage }), storage), storage }
  }
  browserApi ??= {
    api: createSupabaseApi(createDiniClient(SUPABASE_URL, SUPABASE_KEY, { storage: browserStorage, detectSessionInUrl: true }), browserStorage),
    storage: browserStorage,
  }
  return browserApi
}

export function Providers({ children }: { children: ReactNode }) {
  const [{ api, storage }] = useState(createApi)
  return <DiniProvider api={api} storage={storage}>{children}</DiniProvider>
}
