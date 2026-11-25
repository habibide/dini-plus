import { Suspense } from 'react'
import { RequireAccount } from '@/components/auth'
import { ClientOnly } from '@/components/client-only'
import { JoinGroupScreen } from './join-screen'

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><RequireAccount><JoinGroupScreen /></RequireAccount></ClientOnly>
    </Suspense>
  )
}
