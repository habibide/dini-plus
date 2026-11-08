import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ClientOnly } from '@/components/client-only'
import { TeacherSignup } from '../signup-screen'

export const metadata: Metadata = { title: 'Inscription enseignant' }

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><TeacherSignup /></ClientOnly>
    </Suspense>
  )
}
