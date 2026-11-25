import { Suspense } from 'react'
import { RequireAccount } from '@/components/auth'
import { ClientOnly } from '@/components/client-only'
import { GroupScreen } from './group-screen'

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><RequireAccount><GroupScreen /></RequireAccount></ClientOnly>
    </Suspense>
  )
}
