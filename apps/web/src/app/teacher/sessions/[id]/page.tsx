import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RequireAccount } from '@/components/auth'
import { ClientOnly } from '@/components/client-only'
import { SessionScreen } from './session-screen'

export const metadata: Metadata = { title: 'Compte rendu de séance' }

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><RequireAccount roles={['teacher', 'admin']}><SessionScreen /></RequireAccount></ClientOnly>
    </Suspense>
  )
}
