'use client'

import { formatMoney, isConfirmed, type CurrencyCode, type Teacher } from '@dini/core'
import { useEffect, useState, type ReactNode } from 'react'

import { buttonCls, cx } from './styles'

export { buttonCls, cx }

export function Money({ amount, currency }: { amount: number; currency: CurrencyCode }) {
  return <>{formatMoney(amount, currency)}</>
}

export function Monogram({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('')
  const s = { sm: 'size-10 text-base', md: 'size-16 text-xl', lg: 'size-24 text-3xl' }[size]
  return <span aria-hidden="true" className={cx('grid shrink-0 place-items-center rounded-sm border border-sand bg-leaf font-display text-green', s)}>{initials}</span>
}

export function Stars({ value, count }: { value: number; count?: number }) {
  if (!value) return <span className="text-sm text-muted">Nouveau</span>
  return (
    <span className="whitespace-nowrap text-sm font-semibold">
      <span className="text-ochre" aria-hidden="true">★</span> {value.toFixed(1).replace('.', ',')}
      {count !== undefined && <span className="font-normal text-muted"> ({count} avis)</span>}
    </span>
  )
}

export type BadgeKey = 'identity' | 'diploma' | 'ijaza' | 'confirmed'
export const BADGE_INFO: Record<BadgeKey, { label: string; detail: string }> = {
  identity: { label: 'Identité vérifiée', detail: 'Pièce d’identité contrôlée, téléphone confirmé par SMS et entretien vidéo avec un modérateur.' },
  diploma: { label: 'Diplôme vérifié', detail: 'Attestation d’un institut reconnu, contrôlée auprès de l’établissement lorsque c’est possible.' },
  ijaza: { label: 'Ijaza vérifiée', detail: 'Chaîne de transmission (sanad) documentée, riwaya précisée, maître référent joint.' },
  confirmed: { label: 'Enseignant confirmé', detail: 'Plus de 100 heures sur DINE, note supérieure à 4,5 et aucun litige.' },
}

export function badgesOf(t: Teacher): BadgeKey[] {
  const out: BadgeKey[] = []
  if (t.verification.identity) out.push('identity')
  if (t.verification.diploma) out.push('diploma')
  if (t.verification.ijaza) out.push('ijaza')
  if (isConfirmed(t)) out.push('confirmed')
  return out
}

export function Badge({ k, gender, onClick }: { k: BadgeKey; gender?: 'F' | 'M'; onClick?: () => void }) {
  const label = k === 'confirmed' && gender === 'F' ? 'Enseignante confirmée' : BADGE_INFO[k].label
  const tone = k === 'ijaza' ? 'bg-green text-white' : k === 'confirmed' ? 'bg-[#f3e5c4] text-[#6f4a0f]' : 'bg-leaf text-green'
  const cls = cx('inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-semibold', tone)
  const icon = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
  return onClick
    ? <button type="button" onClick={onClick} className={cx(cls, 'min-h-8 cursor-pointer hover:opacity-85')}>{icon}{label}</button>
    : <span className={cls}>{icon}{label}</span>
}

/** Extrait de récitation simulé : le prototype n'embarque aucun enregistrement réel. */
export function RecitationPreview({ seed, large }: { seed: string; large?: boolean }) {
  const [playing, setPlaying] = useState(false)
  const [p, setP] = useState(0)
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setP((x) => (x >= 1 ? (setPlaying(false), 0) : x + 0.02)), 200)
    return () => clearInterval(id)
  }, [playing])
  const n = [...seed].reduce((a, c) => a + c.charCodeAt(0), 7)
  const bars = Array.from({ length: large ? 56 : 28 }, (_, i) => 25 + Math.abs(Math.sin(i * 0.7 + n) * 45 + Math.sin(i * 2.3 + n) * 25))
  return (
    <div className={cx('flex items-center gap-3', large && 'bg-leaf p-4')}>
      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPlaying(!playing) }}
        aria-label={playing ? 'Mettre en pause l’extrait' : 'Écouter un extrait de récitation'}
        className={cx('grid shrink-0 cursor-pointer place-items-center rounded-full bg-green text-white hover:bg-green2', large ? 'size-12' : 'size-9')}>
        {playing
          ? <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor" /></svg>
          : <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 0l9 6-9 6z" fill="currentColor" /></svg>}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div aria-hidden="true" className={cx('flex items-center gap-0.5', large ? 'h-10' : 'h-7')}>
          {bars.map((h, i) => <i key={i} className={cx('flex-1 rounded-[1px]', i / bars.length < p ? 'bg-green' : 'bg-sand')} style={{ height: `${Math.min(h, 100)}%` }} />)}
        </div>
        {large && <span className="text-sm text-muted">{playing ? 'Lecture simulée, sans son' : 'Extrait de récitation'}</span>}
      </div>
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/50 sm:place-items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[90vh] w-full flex-col gap-4 overflow-y-auto rounded-t-lg bg-paper p-6 sm:max-w-lg sm:rounded-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-xl">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="-m-2 cursor-pointer p-2 text-2xl leading-none text-muted">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Sanad({ chain }: { chain: string[] }) {
  return (
    <ol aria-label="Chaîne de transmission" className="flex flex-col gap-2 border-l border-ochre pl-4">
      {chain.map((n, i) => <li key={n} className={cx('relative before:absolute before:-left-[21px] before:top-2 before:size-1.5 before:rotate-45 before:bg-ochre', i === 0 && 'font-semibold')}>{n}</li>)}
      <li className="text-sm text-muted">Chaîne complète dans le dossier de vérification</li>
    </ol>
  )
}
