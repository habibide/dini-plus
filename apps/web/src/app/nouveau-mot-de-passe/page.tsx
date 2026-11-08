import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ClientOnly } from '@/components/client-only'
import { ResetScreen } from './reset-screen'

export const metadata: Metadata = { title: 'Nouveau mot de passe' }

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><ResetScreen /></ClientOnly>
    </Suspense>
  )
}
