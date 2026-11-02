import { useState } from 'react'
import { MARKETS } from './data'
import { useApp, type Role } from './store'
import { Book, Home, Search, TeacherPage } from './pages/Public'
import { Dash, Messages, Room } from './pages/Family'
import { Admin, Apply, TeacherSpace } from './pages/Pro'
import { fmtWhen } from './ui'

const ROLES: { id: Role; label: string; home: string }[] = [
  { id: 'visitor', label: 'Visiteur', home: 'home' },
  { id: 'parent', label: 'Parent (Fatou)', home: 'dash' },
  { id: 'student', label: 'Élève adulte (Marème)', home: 'dash' },
  { id: 'teacher', label: 'Enseignant', home: 'tspace' },
  { id: 'admin', label: 'Modérateur', home: 'admin' },
]

function Guide({ onClose }: { onClose: () => void }) {
  const { s, nav, act } = useApp()
  const as = (r: Role, p: string, a?: any) => { act((d) => { d.role = r }); nav(p, a); if (window.innerWidth < 800) onClose() }
  const steps = [
    { done: !!s.flags.booked, t: 'Chercher et réserver', d: 'Le parent cherche une enseignante en riwaya Warsh, ouvre Aïssatou, puis réserve un créneau.', go: () => as('visitor', 'search', { d: 'hifz', riwaya: ['Warsh'], gender: ['F'] }), cta: 'Ouvrir la recherche' },
    { done: !!s.flags.reported, t: 'Faire cours et rendre compte', d: 'L’enseignante remplit le compte rendu de cette séance, avec les versets et les devoirs.', go: () => { act((d) => { d.role = 'teacher'; d.teacherMe = d.bookings.filter((b) => b.demo).slice(-1)[0]?.teacherId ?? 't1' }); nav('tspace') }, cta: 'Passer côté enseignant' },
    { done: !!s.flags.read, t: 'Lire le suivi', d: 'Le parent voit le compte rendu, la progression par sourate et les 48 h pour contester.', go: () => { act((d) => { d.flags.read = !!d.flags.reported }); as('parent', 'dash') }, cta: 'Passer côté parent' },
    { done: !!s.flags.credited, t: 'Libérer le séquestre', d: 'Avancez l’horloge de 48 h. La séance est validée et le solde de l’enseignante est crédité, commission déduite.', go: () => { act((d) => { d.offset += 48 * 3600_000; d.role = 'teacher' }); nav('tspace') }, cta: 'Avancer de 48 h' },
    { done: !!s.flags.applied, t: 'Candidater', d: 'Une nouvelle enseignante dépose sa candidature en six étapes.', go: () => as('visitor', 'apply'), cta: 'Ouvrir la candidature' },
    { done: !!s.flags.accepted, t: 'Vérifier et publier', d: 'Le modérateur coche les contrôles. Une fois acceptée, l’enseignante apparaît dans la recherche avec ses badges.', go: () => as('admin', 'admin'), cta: 'Passer côté modérateur' },
  ]
  return (
    <aside className="guide" aria-label="Guide de démonstration">
      <div className="modal-head"><h3>Scénario de démo</h3><button className="ghost-x" aria-label="Fermer le guide" onClick={onClose}>×</button></div>
      <ol>{steps.map((x, i) => <li key={x.t} className={x.done ? 'done' : ''}>
        <span className="num">{x.done ? '✓' : i + 1}</span>
        <div><strong>{x.t}</strong><p>{x.d}</p><button className="btn btn-ghost sm" onClick={x.go}>{x.cta}</button></div>
      </li>)}</ol>
    </aside>
  )
}

function DemoBar({ onGuide }: { onGuide: () => void }) {
  const { s, act, nav, reset, now, market } = useApp()
  return (
    <div className="demobar">
      <span className="demobar-tag">Prototype. Personnes, avis et paiements fictifs.</span>
      <label>Voir en tant que
        <select id="demo-role" value={s.role} onChange={(e) => { const r = ROLES.find((x) => x.id === e.target.value)!; act((d) => { d.role = r.id }); nav(r.home) }}>
          {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select></label>
      <span className="demobar-clock">{s.offset > 0 ? `Horloge : ${fmtWhen(now, market.tz)}` : ''}</span>
      <button className="dbtn" onClick={() => act((d) => { d.offset += 24 * 3600_000 })}>Avancer de 24 h</button>
      <button className="dbtn" onClick={onGuide}>Scénario</button>
      <button className="dbtn" onClick={reset}>Réinitialiser</button>
    </div>
  )
}

function Header() {
  const { s, nav, act, route, market } = useApp()
  const links: [string, string][] =
    s.role === 'visitor' ? [['search', 'Trouver un enseignant'], ['apply', 'Devenir enseignant']]
    : s.role === 'teacher' ? [['tspace', 'Mon espace'], ['messages', 'Messages']]
    : s.role === 'admin' ? [['admin', 'Back-office'], ['search', 'Voir la recherche']]
    : [['dash', 'Tableau de bord'], ['search', 'Trouver un enseignant'], ['messages', 'Messages']]
  return (
    <header className="site-head"><div className="wrap head-in">
      <button className="logo" onClick={() => nav('home')} aria-label="DINI, accueil"><span>DINI</span><span className="logo-ar" lang="ar" dir="rtl">ديني</span></button>
      <nav aria-label="Navigation principale">{links.map(([p, l]) => <button key={p} className={route.p === p ? 'on' : ''} aria-current={route.p === p ? 'page' : undefined} onClick={() => nav(p)}>{l}</button>)}</nav>
      <label className="market">Je suis en
        <select id="market" value={s.market} onChange={(e) => act((d) => { d.market = e.target.value })}>{Object.entries(MARKETS).map(([k, m]) => <option key={k} value={k}>{m.label}, {m.cur === 'EUR' ? '€' : 'FCFA'}</option>)}</select>
      </label>
      {market && s.role === 'visitor' && <button className="btn btn-ghost sm" onClick={() => { act((d) => { d.role = 'parent' }); nav('dash') }}>Se connecter</button>}
    </div></header>
  )
}

export default function App() {
  const { route, toast } = useApp()
  const [guide, setGuide] = useState(() => window.innerWidth >= 1280)
  const P = { home: Home, search: Search, teacher: TeacherPage, book: Book, dash: Dash, room: Room, messages: Messages, tspace: TeacherSpace, apply: Apply, admin: Admin }[route.p] ?? Home
  return (
    <div className={guide ? 'with-guide' : ''}>
      <DemoBar onGuide={() => setGuide(!guide)} />
      <Header />
      {/* la clé remonte la page à chaque navigation : les formulaires repartent propres */}
      <main key={route.p + JSON.stringify(route.a ?? '')}><P /></main>
      <footer className="site-foot"><div className="wrap">DATA &amp; BRAIN, Dakar. DINI met en relation et ne prend pas position doctrinale.</div></footer>
      {guide && <Guide onClose={() => setGuide(false)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
