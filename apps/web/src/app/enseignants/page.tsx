import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ClientOnly } from '@/components/client-only'
import { SearchScreen } from './search-screen'

export const metadata: Metadata = { title: 'Trouver un enseignant' }

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><SearchScreen /></ClientOnly>
    </Suspense>
  )
}
