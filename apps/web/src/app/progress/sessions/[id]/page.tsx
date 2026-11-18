import { Suspense } from 'react'
import { RequireAccount } from '@/components/auth'
import { ClientOnly } from '@/components/client-only'
import { ReportScreen } from './report-screen'

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><RequireAccount><ReportScreen /></RequireAccount></ClientOnly>
    </Suspense>
  )
}
