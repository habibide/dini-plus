import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RequireAccount } from '@/components/auth'
import { ClientOnly } from '@/components/client-only'
import { DashboardScreen } from './dashboard-screen'

export const metadata: Metadata = { title: 'Suivi' }

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><RequireAccount><DashboardScreen /></RequireAccount></ClientOnly>
    </Suspense>
  )
}
