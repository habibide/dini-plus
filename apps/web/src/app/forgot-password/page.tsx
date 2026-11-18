import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ClientOnly } from '@/components/client-only'
import { ForgotScreen } from './forgot-screen'

export const metadata: Metadata = { title: 'Mot de passe oublié' }

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><ForgotScreen /></ClientOnly>
    </Suspense>
  )
}
