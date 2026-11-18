import { Suspense } from 'react'
import { RequireAccount } from '@/components/auth'
import { ClientOnly } from '@/components/client-only'
import { BookingScreen } from './booking-screen'

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><RequireAccount><BookingScreen /></RequireAccount></ClientOnly>
    </Suspense>
  )
}
