'use client'

import { createMockApi, memoryStorage, type DiniApi } from '@dini/data'
import { createSupabaseDiniApi } from '@dini/data/supabase'
import { DiniProvider } from '@dini/data/react'
import { useState, type ReactNode } from 'react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

// Supabase quand le projet est configuré (.env.local), sinon les données fictives du navigateur.
function createApi(): DiniApi {
  if (typeof window === 'undefined') return createMockApi(memoryStorage()) // rien n'est chargé côté serveur
  if (SUPABASE_URL && SUPABASE_KEY) return createSupabaseDiniApi(SUPABASE_URL, SUPABASE_KEY)
  return createMockApi(window.localStorage)
}

export function Providers({ children }: { children: ReactNode }) {
  const [api] = useState(createApi)
  return <DiniProvider api={api}>{children}</DiniProvider>
}
