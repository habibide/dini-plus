import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RequireAccount } from '@/components/auth'
import { ClientOnly } from '@/components/client-only'
import { ApplicationScreen } from './application-screen'

export const metadata: Metadata = { title: 'Ma candidature' }

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><RequireAccount roles={['teacher', 'admin']}><ApplicationScreen /></RequireAccount></ClientOnly>
    </Suspense>
  )
}
