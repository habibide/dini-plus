'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { buttonCls } from '@/components/ui'
import { useT } from '@/i18n/locale'

// Retour de Bictorys pour un paiement lancé depuis l'app mobile : la page s'ouvre dans le navigateur
// de l'app, sans session du site. Pas de connexion demandée : l'app confirme le paiement d'elle-même.

export function PayDoneScreen() {
  const failed = useSearchParams().get('failed') === '1'
  const m = useT().payDone
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-5 py-14">
      <h1 className="font-display text-3xl">{m.title}</h1>
      <p className={failed ? 'rounded-sm bg-warnbg px-3 py-2 text-warn' : 'rounded-sm bg-soft px-3 py-2 text-green2'}>{failed ? m.failed : m.text}</p>
      <Link href="/" className={buttonCls.ghost}>{m.site}</Link>
    </div>
  )
}
