'use client'

import { useSyncExternalStore, type ReactNode } from 'react'

const subscribe = () => () => {}

/**
 * Les données fictives vivent dans le navigateur : le serveur ne peut pas les rendre.
 * Ces écrans s'affichent donc après l'hydratation, avec un repli identique des deux côtés.
 */
export function ClientOnly({ children, fallback = <p className="mx-auto max-w-6xl px-5 py-10 text-muted">Chargement…</p> }: { children: ReactNode; fallback?: ReactNode }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false)
  return isClient ? children : fallback
}
