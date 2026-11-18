import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RequireAccount } from '@/components/auth'
import { ClientOnly } from '@/components/client-only'
import { TeacherHome } from './home-screen'

export const metadata: Metadata = { title: 'Espace professeur' }

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><RequireAccount roles={['teacher', 'admin']}><TeacherHome /></RequireAccount></ClientOnly>
    </Suspense>
  )
}
