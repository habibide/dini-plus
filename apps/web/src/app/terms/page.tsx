import type { Metadata } from 'next'
import { LegalDraft } from '@/components/legal'

export const metadata: Metadata = { title: 'Conditions d’utilisation' }

export default function Page() {
  return <LegalDraft kind="terms" />
}
