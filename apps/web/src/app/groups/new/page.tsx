import { Suspense } from 'react'
import { RequireAccount } from '@/components/auth'
import { ClientOnly } from '@/components/client-only'
import { NewGroupScreen } from './new-group-screen'

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><RequireAccount><NewGroupScreen /></RequireAccount></ClientOnly>
    </Suspense>
  )
}
