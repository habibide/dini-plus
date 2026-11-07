'use client'

import { createMockApi, memoryStorage } from '@dini/data'
import { DiniProvider } from '@dini/data/react'
import { useState, type ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  // Données fictives conservées dans le navigateur. Côté serveur, rien n'est chargé.
  const [api] = useState(() => createMockApi(typeof window === 'undefined' ? memoryStorage() : window.localStorage))
  return <DiniProvider api={api}>{children}</DiniProvider>
}
