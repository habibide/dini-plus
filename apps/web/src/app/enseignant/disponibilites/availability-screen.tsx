'use client'

import type { Teacher } from '@dini/core'
import { useMyTeacher, useSetAvailability } from '@dini/data/react'
import Link from 'next/link'
import { useState } from 'react'
import { FormError } from '@/components/auth'
import { AvailabilityEditor } from '@/components/teacher'
import { buttonCls } from '@/components/ui'

export function AvailabilityScreen() {
  const me = useMyTeacher()
  if (me.isPending) return <p className="mx-auto max-w-4xl px-5 py-10 text-muted">Chargement…</p>
  if (!me.data) return <p className="mx-auto max-w-4xl px-5 py-10">Commencez par <Link href="/enseignant" className="underline">créer votre profil enseignant</Link>.</p>
  return <Editor initial={me.data.availability} timezone={me.data.timezone} />
}

function Editor({ initial, timezone }: { initial: Teacher['availability']; timezone: string }) {
  const save = useSetAvailability()
  const [rules, setRules] = useState(initial)
  const overlapping = rules.some((a, i) => rules.some((b, j) => i !== j && a.weekday === b.weekday && a.start < b.end && b.start < a.end))
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 px-5 py-8">
      <Link href="/enseignant" className="text-sm text-muted hover:text-ink">Retour à l’espace enseignant</Link>
      <h1 className="font-display text-3xl">Mes disponibilités</h1>
      <p>Heures de {timezone.split('/')[1]?.replace('_', ' ')}. Les familles voient ces créneaux dans leur propre fuseau, par séances de 30 minutes, au plus tôt 2 h à l’avance.</p>
      <AvailabilityEditor value={rules} onChange={(v) => { setRules(v); save.reset() }} />
      {overlapping && <FormError message="Deux plages se chevauchent le même jour." />}
      <FormError message={save.error?.message} />
      <div className="flex items-center gap-3">
        <button type="button" className={buttonCls.primary} disabled={save.isPending || overlapping} onClick={() => save.mutate(rules)}>{save.isPending ? 'Enregistrement…' : 'Enregistrer'}</button>
        {save.isSuccess && <span role="status" className="text-green">Disponibilités enregistrées.</span>}
      </div>
    </div>
  )
}
