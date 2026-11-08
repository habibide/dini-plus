import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RequireAccount } from '@/components/auth'
import { ClientOnly } from '@/components/client-only'
import { ModerationScreen } from './moderation-screen'

export const metadata: Metadata = { title: 'Modération' }

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><RequireAccount roles={['moderator', 'admin']}><ModerationScreen /></RequireAccount></ClientOnly>
    </Suspense>
  )
}
