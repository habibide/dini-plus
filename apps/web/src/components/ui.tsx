'use client'

import { COUNTRIES, isConfirmed, type CurrencyCode, type Teacher } from '@dini/core'
import { useEffect, useState, type ReactNode } from 'react'

import { buttonCls, cx } from './styles'
import { useFormat, useT } from '@/i18n/locale'

export { buttonCls, cx }

export function Money({ amount, currency }: { amount: number; currency: CurrencyCode }) {
  return <>{useFormat().money(amount, currency)}</>
}

export function Monogram({ name, size = 'md', square }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; square?: boolean }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('')
  const s = { sm: 'size-10 text-base', md: 'size-16 text-xl', lg: 'size-24 text-3xl', xl: 'size-28 text-4xl sm:size-32' }[size]
  // Couleur stable par personne, dans la gamme de la charte.
  const palette = ['#20915B', '#176B43', '#B8901F', '#2F7D6D', '#3B8B5A', '#8A6A1E']
  const bg = palette[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length]
  return <span aria-hidden="true" className={cx('grid shrink-0 place-items-center font-bold tracking-wide text-white shadow-[inset_0_-8px_16px_rgba(0,0,0,0.12)]', square ? 'rounded-md' : 'rounded-full', s)} style={{ background: bg }}>{initials}</span>
}

export function Stars({ value, count }: { value: number; count?: number }) {
  const t = useT()
  const f = useFormat()
  if (!value) return <span className="text-sm text-muted">{t.badges.newTeacher}</span>
  return (
    <span className="whitespace-nowrap text-sm font-semibold">
      <span className="text-gold" aria-hidden="true">★</span> {f.decimal(value)}
      {count !== undefined && <span className="font-normal text-muted"> {t.badges.reviews(count)}</span>}
    </span>
  )
}

export type BadgeKey = 'identity' | 'diploma' | 'ijaza' | 'confirmed'
/** Libellé et explication d'un badge, dans la langue courante. */
export const useBadgeInfo = (k: BadgeKey) => useT().badges[k]

export function badgesOf(t: Teacher): BadgeKey[] {
  const out: BadgeKey[] = []
  if (t.verification.identity) out.push('identity')
  if (t.verification.diploma) out.push('diploma')
  if (t.verification.ijaza) out.push('ijaza')
  if (isConfirmed(t)) out.push('confirmed')
  return out
}

export function Badge({ k, gender, onClick }: { k: BadgeKey; gender?: 'F' | 'M'; onClick?: () => void }) {
  const t = useT()
  const label = k === 'confirmed' && gender === 'F' ? t.badges.confirmedF : t.badges[k].label
  const tone = k === 'ijaza' ? 'bg-green text-white' : k === 'confirmed' ? 'bg-sand text-ochre' : 'bg-soft text-green2'
  const cls = cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', tone)
  const icon = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
  return onClick
    ? <button type="button" onClick={onClick} className={cx(cls, 'min-h-8 cursor-pointer hover:opacity-85')}>{icon}{label}</button>
    : <span className={cls}>{icon}{label}</span>
}

/** Extrait de récitation simulé : le prototype n'embarque aucun enregistrement réel. */
export function RecitationPreview({ seed, large }: { seed: string; large?: boolean }) {
  const t = useT()
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
    <div className={cx('flex items-center gap-3', large && 'rounded-md bg-soft p-4')}>
      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPlaying(!playing) }}
        aria-label={playing ? t.badges.pause : t.badges.play}
        className={cx('grid shrink-0 cursor-pointer place-items-center rounded-full bg-green text-white hover:bg-green2', large ? 'size-12' : 'size-9')}>
        {playing
          ? <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor" /></svg>
          : <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 0l9 6-9 6z" fill="currentColor" /></svg>}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div aria-hidden="true" className={cx('flex items-center gap-0.5', large ? 'h-10' : 'h-7')}>
          {bars.map((h, i) => <i key={i} className={cx('flex-1 rounded-full', i / bars.length < p ? 'bg-green' : 'bg-green/20')} style={{ height: `${Math.min(h, 100)}%` }} />)}
        </div>
        {large && <span className="text-sm text-muted">{playing ? t.badges.simulated : t.badges.excerpt}</span>}
      </div>
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const t = useT()
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/50 sm:place-items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[90vh] w-full flex-col gap-4 overflow-y-auto rounded-t-[20px] bg-white p-6 sm:max-w-lg sm:rounded-[20px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-xl">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t.common.close} className="-m-2 cursor-pointer p-2 text-2xl leading-none text-muted">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Sanad({ chain }: { chain: string[] }) {
  const t = useT()
  return (
    <ol aria-label={t.badges.sanad} className="flex flex-col gap-2 border-s border-ochre ps-4">
      {chain.map((n, i) => <li key={n} className={cx('relative before:absolute before:-left-[21px] before:top-2 before:size-1.5 before:rotate-45 before:bg-ochre', i === 0 && 'font-semibold')}>{n}</li>)}
      <li className="text-sm text-muted">{t.badges.sanadFull}</li>
    </ol>
  )
}

/**
 * Pays d'un professeur, retrouvé depuis le libellé saisi (« Sénégal », « Senegal »…) :
 * nom traduit dans la langue du site et drapeau. Libellé inconnu : on le garde tel quel, sans drapeau.
 */
export function useCountryOf() {
  const f = useFormat()
  return (label: string) => {
    const l = label.trim().toLowerCase()
    const c = COUNTRIES.find((x) => Object.values(x.label).some((v) => v.toLowerCase() === l))
    if (!c) return { name: label, flag: '' }
    const flag = [...c.code].map((ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65)).join('')
    return { name: f.label(c.label), flag }
  }
}

/** Bouclier « identité vérifiée », à côté du nom. */
export function VerifiedShield({ title }: { title: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-ink" fill="currentColor" role="img" aria-label={title}>
      <title>{title}</title>
      <path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5l8-3z" /><path d="M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Petites icônes de ligne (matières, langues, etc.). */
export const LINE_ICONS = {
  cap: 'M22 10L12 5 2 10l10 5 10-5zM6 12v5c0 1 3 3 6 3s6-2 6-3v-5',
  languages: 'M5 8h10M5 12h7M9 4v4M11 14l4 8M19 14l-4 8M14 18h6',
  pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z',
  message: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2zM8 9h8M8 13h5',
  share: 'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13',
  bolt: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  info: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01',
}
export function LineIcon({ d, className = 'size-5' }: { d: string; className?: string }) {
  return <svg viewBox="0 0 24 24" className={cx('shrink-0', className)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
}

/**
 * « Envoyer un message » : la messagerie n'existe pas encore. Le bouton l'annonce honnêtement
 * et propose la séance d'essai, seul moyen d'échanger avec le professeur pour l'instant.
 */
export function MessageButton({ name, bookHref, className }: { name: string; bookHref: string; className?: string }) {
  const t = useT().search
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cx(buttonCls.ghost, 'w-full', className)}>
        <LineIcon d={LINE_ICONS.message} />{t.message}
      </button>
      {open && (
        <Modal title={t.messageSoon.title} onClose={() => setOpen(false)}>
          <p>{t.messageSoon.text(name.split(' ')[0])}</p>
          <a href={bookHref} onClick={() => setOpen(false)} className={buttonCls.primary}>{t.book}</a>
        </Modal>
      )}
    </>
  )
}
