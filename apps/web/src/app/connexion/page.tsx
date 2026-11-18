import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ClientOnly } from '@/components/client-only'
import { LoginScreen } from './login-screen'

export const metadata: Metadata = { title: 'Connexion' }

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><LoginScreen /></ClientOnly>
    </Suspense>
  )
}
