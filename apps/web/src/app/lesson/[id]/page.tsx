import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RequireAccount } from '@/components/auth'
import { ClientOnly } from '@/components/client-only'
import { ClassroomScreen } from './classroom-screen'

export const metadata: Metadata = { title: 'Cours en ligne' }

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><RequireAccount><ClassroomScreen /></RequireAccount></ClientOnly>
    </Suspense>
  )
}
