import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ClientOnly } from '@/components/client-only'
import { StudentSignup } from './signup-screen'

export const metadata: Metadata = { title: 'Inscription' }

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><StudentSignup /></ClientOnly>
    </Suspense>
  )
}
