import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RequireAccount } from '@/components/auth'
import { ClientOnly } from '@/components/client-only'
import { AvailabilityScreen } from './availability-screen'

export const metadata: Metadata = { title: 'Mes disponibilités' }

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><RequireAccount roles={['teacher', 'admin']}><AvailabilityScreen /></RequireAccount></ClientOnly>
    </Suspense>
  )
}
