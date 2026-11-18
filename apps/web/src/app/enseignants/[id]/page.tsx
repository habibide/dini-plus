import { Suspense } from 'react'
import { ClientOnly } from '@/components/client-only'
import { ProfileScreen } from './profile-screen'

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><ProfileScreen /></ClientOnly>
    </Suspense>
  )
}
