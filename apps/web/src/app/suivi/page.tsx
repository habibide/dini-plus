import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ClientOnly } from '@/components/client-only'
import { DashboardScreen } from './dashboard-screen'

export const metadata: Metadata = { title: 'Suivi' }

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><DashboardScreen /></ClientOnly>
    </Suspense>
  )
}
