import { Suspense } from 'react'
import { ClientOnly } from '@/components/client-only'
import { BookingScreen } from './booking-screen'

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><BookingScreen /></ClientOnly>
    </Suspense>
  )
}
