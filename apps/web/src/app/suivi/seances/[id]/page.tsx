import { Suspense } from 'react'
import { ClientOnly } from '@/components/client-only'
import { ReportScreen } from './report-screen'

export default function Page() {
  return (
    <Suspense>
      <ClientOnly><ReportScreen /></ClientOnly>
    </Suspense>
  )
}
