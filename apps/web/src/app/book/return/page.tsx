import { Suspense } from 'react'
import { RequireAccount } from '@/components/auth'
import { ClientOnly } from '@/components/client-only'
import { PaymentReturnScreen } from './return-screen'

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><RequireAccount><PaymentReturnScreen /></RequireAccount></ClientOnly>
    </Suspense>
  )
}
