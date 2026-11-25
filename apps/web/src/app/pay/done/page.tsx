import { Suspense } from 'react'
import { ClientOnly } from '@/components/client-only'
import { PayDoneScreen } from './done-screen'

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><PayDoneScreen /></ClientOnly>
    </Suspense>
  )
}
