'use client'

import type { Teacher } from '@dini/core'
import { useMyTeacher, useSetAvailability } from '@dini/data/react'
import Link from 'next/link'
import { useState } from 'react'
import { FormError } from '@/components/auth'
import { AvailabilityEditor } from '@/components/teacher'
import { buttonCls } from '@/components/ui'
import { useT } from '@/i18n/locale'

export function AvailabilityScreen() {
  const me = useMyTeacher()
  const t = useT()
  const s = t.availability.startFirst
  if (me.isPending) return <p className="mx-auto max-w-4xl px-5 py-10 text-muted">{t.common.loading}</p>
  if (!me.data) return <p className="mx-auto max-w-4xl px-5 py-10">{s.before}<Link href="/teacher" className="underline">{s.link}</Link>{s.after}</p>
  return <Editor initial={me.data.availability} timezone={me.data.timezone} />
}

function Editor({ initial, timezone }: { initial: Teacher['availability']; timezone: string }) {
  const save = useSetAvailability()
  const [rules, setRules] = useState(initial)
  const t = useT()
  const m = t.availability
  const overlapping = rules.some((a, i) => rules.some((b, j) => i !== j && a.weekday === b.weekday && a.start < b.end && b.start < a.end))
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 px-5 py-8">
      <Link href="/teacher" className="text-sm text-muted hover:text-ink">{t.session.backToSpace}</Link>
      <h1 className="font-display text-3xl">{m.title}</h1>
      <p>{m.intro(timezone.split('/')[1]?.replace('_', ' ') ?? timezone)}</p>
      <AvailabilityEditor value={rules} onChange={(v) => { setRules(v); save.reset() }} />
      {overlapping && <FormError message={m.overlap} />}
      <FormError message={save.error?.message} />
      <div className="flex items-center gap-3">
        <button type="button" className={buttonCls.primary} disabled={save.isPending || overlapping} onClick={() => save.mutate(rules)}>{save.isPending ? t.common.saving : t.common.save}</button>
        {save.isSuccess && <span role="status" className="text-green">{m.saved}</span>}
      </div>
    </div>
  )
}
