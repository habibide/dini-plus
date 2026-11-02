import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Teacher } from './data'

export const money = (n: number, cur: string) =>
  cur === 'FCFA'
    ? `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n / 50) * 50)} FCFA`
    : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n)

export const fmtDay = (at: number, tz: string) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }).format(at)
export const fmtTime = (at: number, tz: string) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(at)
export const fmtWhen = (at: number, tz: string) => `${fmtDay(at, tz)} à ${fmtTime(at, tz)}`
export const hourIn = (at: number, tz: string) => Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: tz }).format(at))

export function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('')
  return <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true">{initials}</span>
}

export function Stars({ value, count }: { value: number; count?: number }) {
  if (!value) return <span className="muted">Nouveau</span>
  return <span className="rating"><span className="star" aria-hidden="true">★</span> {value.toFixed(1).replace('.', ',')}{count !== undefined && <span className="muted"> ({count} avis)</span>}</span>
}

export const BADGES = {
  identity: { label: 'Identité vérifiée', detail: 'Pièce d’identité contrôlée, téléphone confirmé et entretien vidéo réalisé avec un modérateur.' },
  diploma: { label: 'Diplôme vérifié', detail: 'Attestation d’un institut reconnu, contrôlée auprès de l’établissement lorsque c’est possible.' },
  ijaza: { label: 'Ijaza vérifiée', detail: 'Chaîne de transmission (sanad) documentée, riwaya précisée, référence du maître consultable.' },
  confirmed: { label: 'Enseignant confirmé', detail: 'Plus de 100 heures dispensées sur DINI, note supérieure à 4,5 et aucun litige.' },
}
export type BadgeKey = keyof typeof BADGES
export const badgesOf = (t: Teacher): BadgeKey[] => {
  const k: BadgeKey[] = []
  if (t.badges.identity) k.push('identity')
  if (t.badges.diploma) k.push('diploma')
  if (t.badges.ijaza) k.push('ijaza')
  if (t.hours > 100 && t.rating > 4.5) k.push('confirmed')
  return k
}
export const confirmedLabel = (t: Teacher) => (t.gender === 'F' ? 'Enseignante confirmée' : 'Enseignant confirmé')

export function Badge({ k, t, onClick }: { k: BadgeKey; t?: Teacher; onClick?: () => void }) {
  const label = k === 'confirmed' && t ? confirmedLabel(t) : BADGES[k].label
  const body = <><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 0l1.76 1.76L10.24 1.76 10.24 4.24 12 6l-1.76 1.76v2.48H7.76L6 12 4.24 10.24H1.76V7.76L0 6l1.76-1.76V1.76h2.48z" fill="currentColor" /></svg>{label}</>
  return onClick ? <button type="button" className={`badge badge-${k}`} onClick={onClick}>{body}</button> : <span className={`badge badge-${k}`}>{body}</span>
}

// Un seul extrait joue à la fois. Le prototype n'embarque pas de vraie récitation.
const STOP = 'dini-audio-stop'
export function AudioPlayer({ id, big, label = 'Extrait de récitation' }: { id: string; big?: boolean; label?: string }) {
  const [on, setOn] = useState(false)
  const [p, setP] = useState(0)
  const me = useRef(Math.random())
  useEffect(() => {
    const stop = (e: Event) => { if ((e as CustomEvent).detail !== me.current) setOn(false) }
    window.addEventListener(STOP, stop)
    return () => window.removeEventListener(STOP, stop)
  }, [])
  useEffect(() => {
    if (!on) return
    const t = setInterval(() => setP((x) => { if (x >= 1) { setOn(false); return 0 } return x + 0.02 }), 200)
    return () => clearInterval(t)
  }, [on])
  const seedN = [...id].reduce((a, c) => a + c.charCodeAt(0), 7)
  const bars = Array.from({ length: big ? 56 : 26 }, (_, i) => 22 + Math.abs(Math.sin(i * 0.7 + seedN) * 50 + Math.sin(i * 2.3 + seedN) * 26))
  return (
    <div className={`audio ${big ? 'audio-big' : ''}`}>
      <button type="button" className="audio-btn" aria-label={on ? `Mettre en pause : ${label}` : `Écouter : ${label}`}
        onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent(STOP, { detail: me.current })); setOn(!on) }}>
        {on ? <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor" /></svg> : <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 0l9 6-9 6z" fill="currentColor" /></svg>}
      </button>
      <div className="wave" aria-hidden="true">
        {bars.map((h, i) => <i key={i} style={{ height: `${Math.min(h, 100)}%` }} className={i / bars.length <= p && (on || p > 0) ? 'on' : ''} />)}
      </div>
      {big && <span className="audio-note">{on ? 'Lecture simulée, sans son' : label}</span>}
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{title}</h3><button type="button" className="ghost-x" aria-label="Fermer" onClick={onClose}>×</button></div>
        {children}
      </div>
    </div>
  )
}

export function Chips<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; label: string }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o.id)
        return <button key={o.id} type="button" aria-pressed={on} className={`chip ${on ? 'chip-on' : ''}`} onClick={() => onChange(on ? value.filter((v) => v !== o.id) : [...value, o.id])}>{o.label}</button>
      })}
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>
}

export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="steps">
      {steps.map((x, i) => <li key={x} className={i === current ? 'now' : i < current ? 'done' : ''} aria-current={i === current ? 'step' : undefined}><span>{i + 1}</span>{x}</li>)}
    </ol>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><strong>{title}</strong>{children}</div>
}
