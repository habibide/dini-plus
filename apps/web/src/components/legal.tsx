'use client'

import { useT } from '@/i18n/locale'

/** Page juridique en attente de rédaction. */
export function LegalDraft({ kind }: { kind: 'terms' | 'privacy' }) {
  const t = useT().legal
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-12">
      <h1 className="font-display text-4xl">{t[kind]}</h1>
      <p className="rounded-sm bg-warnbg px-4 py-3 text-warn">{t.draft}</p>
    </div>
  )
}
