import type { Metadata } from 'next'
import { LegalDraft } from '@/components/legal'

export const metadata: Metadata = { title: 'Politique de confidentialité' }

export default function Page() {
  return <LegalDraft kind="privacy" />
}
