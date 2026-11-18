import { useEffect, useRef, useState } from 'react'
import { surah } from '../data'
import { cancelBooking, learnerName, learnersOf, openDispute, useApp, type Booking } from '../store'
import { Avatar, Empty, Field, Modal, fmtWhen, fmtDay, money } from '../ui'

const H = 3600_000

function ReportView({ b }: { b: Booking }) {
  const r = b.report!
  return (
    <div className="report">
      <p><strong>{r.covered}</strong></p>
      {r.surah && <p className="report-surah"><span lang="ar" dir="rtl" className="ar">{surah(r.surah).ar}</span> {surah(r.surah).name}, versets {r.from} à {r.to}</p>}
      {r.tajwid !== 'Sans objet' && r.tajwid && <p><span className="muted">Tajwid : </span>{r.tajwid}</p>}
      <p><span className="muted">À faire : </span>{r.homework}</p>
      {r.comment && <p className="report-comment">{r.comment}</p>}
    </div>
  )
}

function Progress({ bookings }: { bookings: Booking[] }) {
  const best = new Map<string, number>()
  bookings.forEach((b) => { if (b.report?.surah && ['validated', 'delivered'].includes(b.status)) best.set(b.report.surah, Math.max(best.get(b.report.surah) ?? 0, b.report.to)) })
  if (best.size === 0) return <p className="muted">La progression par sourate s’affichera après le premier compte rendu.</p>
  return (
    <ul className="prog">
      {[...best.entries()].map(([id, to]) => {
        const x = surah(id)
        return <li key={id}><span className="prog-ar" lang="ar" dir="rtl">{x.ar}</span><span className="prog-bar" dir="rtl" role="img" aria-label={`${x.name} : ${to} versets sur ${x.ayat}`}><i style={{ width: `${(to / x.ayat) * 100}%` }} /></span><span className="prog-n">{to}/{x.ayat}</span></li>
      })}
    </ul>
  )
}

function LearnerBlock({ id }: { id: string }) {
  const { s, nav, market, now, act, say } = useApp()
  const all = [...learnersOf(s, 'parent'), ...learnersOf(s, 'student')]
  const l = all.find((x) => x.id === id)!
  const mine = s.bookings.filter((b) => b.learnerId === id)
  const next = mine.filter((b) => b.status === 'scheduled').sort((a, b) => a.at - b.at)[0]
  const held = mine.filter((b) => ['validated', 'delivered', 'disputed', 'missed'].includes(b.status)).sort((a, b) => a.at - b.at)
  const present = held.filter((b) => b.status !== 'missed').length
  const last = [...mine].filter((b) => b.report).sort((a, b) => b.at - a.at)[0]
  const sub = s.subs.find((x) => x.learnerId === id)
  const toCheck = mine.filter((b) => b.status === 'delivered')
  const toReview = mine.filter((b) => b.status === 'validated' && !b.reviewed && b.report)
  const [disp, setDisp] = useState<Booking | null>(null)
  const [reason, setReason] = useState('Séance non conforme')
  const [desc, setDesc] = useState('')
  const [canc, setCanc] = useState<Booking | null>(null)
  const [rev, setRev] = useState<Booking | null>(null)
  const [stars, setStars] = useState(5)
  const [cmt, setCmt] = useState('')
  const tname = (tid: string) => s.teachers.find((t) => t.id === tid)?.name ?? ''

  return (
    <article className="child">
      <header className="child-head">
        <Avatar name={l.name} size={48} />
        <div><h2>{l.name}</h2><p className="muted">{l.age} ans. Objectif : {l.goals}</p></div>
        {sub && <div className="solde"><strong>{sub.remaining}</strong><span className="muted"> {sub.remaining > 1 ? 'séances restantes' : 'séance restante'} sur {sub.perMonth}</span></div>}
      </header>
      <div className="child-grid">
        <section className="c-next">
          <h3>Prochaine séance</h3>
          {next ? <>
            <p className="big-when">{fmtWhen(next.at, market.tz)}</p>
            <p className="muted">avec {tname(next.teacherId)}, {market.tzLabel}{next.kind === 'trial' ? '. Séance d’essai' : ''}</p>
            <div className="row">
              <button className="btn btn-primary sm" onClick={() => nav('room', { id: next.id, as: 'family' })}>Rejoindre le cours</button>
              <button className="btn btn-ghost sm" onClick={() => setCanc(next)}>Annuler ou reporter</button>
            </div>
          </> : <>
            <p className="muted">Aucune séance prévue.</p>
            <button className="btn btn-primary sm" onClick={() => sub ? nav('teacher', { id: sub.teacherId }) : nav('search')}>{sub ? 'Réserver une séance' : 'Trouver un enseignant'}</button>
          </>}
        </section>
        <section>
          <h3>Assiduité ce mois-ci</h3>
          {held.length ? <>
            <p className="attend-n"><strong>{present}</strong> {present > 1 ? 'séances suivies' : 'séance suivie'} sur {held.length}</p>
            <div className="dots" role="img" aria-label={`${present} présences sur ${held.length}`}>{held.map((b) => <i key={b.id} className={b.status === 'missed' ? 'miss' : ''} title={fmtDay(b.at, market.tz)} />)}</div>
          </> : <p className="muted">Pas encore de séance suivie.</p>}
        </section>
        <section><h3>Progression</h3><Progress bookings={mine} /></section>
        <section className="c-report">
          <h3>Dernier compte rendu</h3>
          {last ? <><p className="muted small">{fmtDay(last.at, market.tz)}, {tname(last.teacherId)}</p><ReportView b={last} /></> : <p className="muted">Le compte rendu de l’enseignant apparaîtra ici après la première séance.</p>}
        </section>
      </div>
      {toCheck.map((b) => {
        const left = Math.max(0, Math.ceil((b.deliveredAt! + 48 * H - now) / H))
        return <div key={b.id} className="notice">
          <span><strong>Séance du {fmtDay(b.at, market.tz)}.</strong> Sans signalement dans les {left} h, {tname(b.teacherId)} sera payé{s.teachers.find((t) => t.id === b.teacherId)?.gender === 'F' ? 'e' : ''}.</span>
          <button className="btn btn-ghost sm" onClick={() => setDisp(b)}>Signaler un problème</button>
        </div>
      })}
      {mine.filter((b) => b.status === 'disputed').map((b) => <div key={b.id} className="notice notice-warn"><span><strong>Signalement en cours d’examen.</strong> Le paiement de la séance du {fmtDay(b.at, market.tz)} reste bloqué.</span></div>)}
      {toReview.slice(0, 1).map((b) => <div key={b.id} className="notice"><span>Comment s’est passée la séance avec {tname(b.teacherId)}&nbsp;?</span><button className="btn btn-ghost sm" onClick={() => setRev(b)}>Laisser un avis</button></div>)}

      {canc && <Modal title="Annuler cette séance" onClose={() => setCanc(null)}>
        <p>{canc.at - now >= 24 * H ? (canc.kind === 'trial' ? 'La séance est dans plus de 24 h : vous êtes remboursé.' : 'La séance est dans plus de 24 h : elle revient sur votre forfait.') : 'La séance est dans moins de 24 h : elle reste due à l’enseignant.'}</p>
        <div className="row">
          <button className="btn btn-ghost" onClick={() => setCanc(null)}>Garder la séance</button>
          <button className="btn btn-primary" onClick={() => { const tid = canc.teacherId; let free = true; act((d) => { free = cancelBooking(d, canc.id) === 'free' }); setCanc(null); say('Séance annulée.'); if (free) nav('teacher', { id: tid }) }}>Annuler et choisir un autre créneau</button>
        </div>
      </Modal>}
      {disp && <Modal title="Signaler un problème" onClose={() => setDisp(null)}>
        <p className="muted">Le paiement reste bloqué le temps qu’un modérateur examine la séance.</p>
        <Field label="Que s’est-il passé ?"><select value={reason} onChange={(e) => setReason(e.target.value)}><option>Séance non conforme</option><option>Enseignant absent</option><option>Problème technique</option><option>Comportement inapproprié</option></select></Field>
        <Field label="Détails"><textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Décrivez ce qui s’est passé." /></Field>
        <button className="btn btn-primary" onClick={() => { act((d) => openDispute(d, disp.id, reason, desc || 'Sans détail.')); setDisp(null); say('Signalement envoyé. Paiement bloqué.') }}>Envoyer le signalement</button>
      </Modal>}
      {rev && <Modal title={`Votre avis sur ${tname(rev.teacherId)}`} onClose={() => setRev(null)}>
        <div className="star-pick" role="radiogroup" aria-label="Note">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} sur 5`} className={n <= stars ? 'on' : ''} onClick={() => setStars(n)}>★</button>)}</div>
        <Field label="Votre commentaire"><textarea rows={3} value={cmt} onChange={(e) => setCmt(e.target.value)} /></Field>
        <button className="btn btn-primary" onClick={() => { act((d) => { d.bookings.find((x) => x.id === rev.id)!.reviewed = true; const t = d.teachers.find((x) => x.id === rev.teacherId)!; t.reviews.unshift({ author: l.name.split(' ')[0] + ', sur DINI', rating: stars, text: cmt || 'Très bonne séance.', date: 'à l’instant' }); t.rating = t.reviews.reduce((a, r) => a + r.rating, 0) / t.reviews.length }); setRev(null); say('Avis publié sur le profil.') }}>Publier mon avis</button>
      </Modal>}
    </article>
  )
}

export function Dash() {
  const { s, nav, market } = useApp()
  const owner = s.role === 'student' ? 'student' : 'parent'
  const learners = learnersOf(s, owner)
  const subs = s.subs.filter((x) => learners.some((l) => l.id === x.learnerId))
  return (
    <div className="wrap dash">
      <div className="dash-top">
        <div><h1 className="h-page">{owner === 'parent' ? 'Bonjour Fatou' : 'Bonjour Marème'}</h1>
          <p className="muted">{owner === 'parent' ? 'Voici où en sont vos enfants cette semaine.' : 'Voici où vous en êtes cette semaine.'}</p></div>
        <button className="btn btn-ghost" onClick={() => nav('search')}>Trouver un enseignant</button>
      </div>
      <div className="children">{learners.map((l) => <LearnerBlock key={l.id} id={l.id} />)}</div>
      <section className="subs">
        <h2>{subs.length > 1 ? 'Vos forfaits' : 'Votre forfait'}</h2>
        {subs.length === 0 ? <Empty title="Pas encore de forfait."><span>Une séance d’essai permet de choisir sans s’engager.</span></Empty> :
          <div className="scroll-x"><table className="table">
            <thead><tr><th>Élève</th><th>Enseignant</th><th>Formule</th><th>Prix mensuel</th><th>Prochain renouvellement</th></tr></thead>
            <tbody>{subs.map((x) => <tr key={x.id}><td>{learnerName(s, x.learnerId)}</td><td>{s.teachers.find((t) => t.id === x.teacherId)?.name}</td><td>{x.perMonth} séances par mois</td><td>{money(x.price, x.cur)}</td><td>{fmtDay(x.renews, market.tz)}</td></tr>)}</tbody>
          </table></div>}
      </section>
    </div>
  )
}

export function Room() {
  const { s, route, nav, market } = useApp()
  const b = s.bookings.find((x) => x.id === route.a?.id)!
  const t = s.teachers.find((x) => x.id === b.teacherId)!
  const isT = route.a?.as === 'teacher'
  const [audio, setAudio] = useState(false)
  const [mute, setMute] = useState(false)
  const [sec, setSec] = useState(0)
  const ref = useRef(0)
  useEffect(() => { ref.current = window.setInterval(() => setSec((x) => x + 1), 1000); return () => clearInterval(ref.current) }, [])
  const other = isT ? learnerName(s, b.learnerId) : t.name
  const me = isT ? t.name : learnerName(s, b.learnerId)
  return (
    <div className="room">
      <div className="room-bar"><span>Cours de {learnerName(s, b.learnerId)} avec {t.name}</span><span className="timer">{String(Math.floor(sec / 60)).padStart(2, '0')}:{String(sec % 60).padStart(2, '0')} / 30:00</span></div>
      <div className={`room-stage ${audio ? 'audio-only' : ''}`}>
        <div className="tile tile-main"><Avatar name={other} size={audio ? 88 : 120} /><span>{other}</span>{audio && <div className="eq" aria-hidden="true"><i /><i /><i /><i /><i /></div>}</div>
        {!audio && <div className="tile tile-self"><Avatar name={me} size={44} /><span>Vous</span></div>}
      </div>
      {audio && <p className="room-note">Mode audio seul activé : il consomme environ dix fois moins de données, utile sur une connexion lente.</p>}
      <p className="room-note">Salle simulée. La vraie version utilisera Daily.co ou Jitsi. {fmtWhen(b.at, market.tz)}.</p>
      <div className="room-ctrl">
        <button className={`btn ${mute ? 'btn-sand' : 'btn-dark'}`} aria-pressed={mute} onClick={() => setMute(!mute)}>{mute ? 'Réactiver le micro' : 'Couper le micro'}</button>
        <button className={`btn ${audio ? 'btn-sand' : 'btn-dark'}`} aria-pressed={audio} onClick={() => setAudio(!audio)}>{audio ? 'Réactiver la vidéo' : 'Passer en audio seul'}</button>
        <button className="btn btn-end" onClick={() => isT ? nav('tspace', { report: b.id }) : nav('dash')}>Quitter le cours</button>
      </div>
    </div>
  )
}

export function Messages() {
  const { s, route, act, market, nav } = useApp()
  const isT = s.role === 'teacher'
  const fam = s.role === 'student' ? 'student' : 'parent'
  const threads = isT
    ? ['parent', 'student'].filter((f) => s.messages.some((m) => m.teacherId === s.teacherMe && m.family === f))
    : [...new Set([...s.messages.filter((m) => m.family === fam).map((m) => m.teacherId), ...(route.a?.teacher ? [route.a.teacher] : [])])]
  const [cur, setCur] = useState<string | undefined>(route.a?.teacher ?? threads[0])
  const [text, setText] = useState('')
  const list = s.messages.filter((m) => isT ? m.teacherId === s.teacherMe && m.family === cur : m.teacherId === cur && m.family === fam).sort((a, b) => a.at - b.at)
  const hasContact = /(\+?\d[\d\s.-]{7,})|whatsapp|@/i.test(text)
  const send = (file?: string) => {
    if (!cur || (!text.trim() && !file)) return
    act((d) => { d.messages.push({ id: `m${++d.seq}`, teacherId: isT ? d.teacherMe : cur, family: (isT ? cur : fam) as 'parent' | 'student', from: isT ? 'teacher' : 'family', text: file ? '' : text.trim(), file, at: Date.now() + d.offset }) })
    if (!file) setText('')
  }
  const label = (x: string) => isT ? (x === 'parent' ? 'Fatou Diop' : 'Marème Sarr') : s.teachers.find((t) => t.id === x)?.name ?? x
  return (
    <div className="wrap msgs">
      <aside className="threads">
        <h1 className="h-sub">Messages</h1>
        {threads.length === 0 && <p className="muted">Pas encore de conversation. <button className="linklike" onClick={() => nav('search')}>Trouver un enseignant</button></p>}
        {threads.map((x) => <button key={x} className={`thread ${cur === x ? 'pick-on' : ''}`} onClick={() => setCur(x)}><Avatar name={label(x)} size={36} />{label(x)}</button>)}
      </aside>
      <section className="convo">
        {!cur ? <Empty title="Choisissez une conversation." /> : <>
          <div className="bubbles">
            {list.length === 0 && <p className="muted">Écrivez votre premier message à {label(cur)}.</p>}
            {list.map((m) => {
              const mineMsg = isT ? m.from === 'teacher' : m.from === 'family'
              return <div key={m.id} className={`bubble ${mineMsg ? 'me' : ''}`}>{m.file ? <span className="file">Pièce jointe : {m.file}</span> : m.text}<time>{fmtWhen(m.at, market.tz)}</time></div>
            })}
          </div>
          {hasContact && <p className="notice notice-warn small">Gardez vos échanges sur DINI : hors plateforme, ni le paiement sous séquestre ni le suivi ne vous protègent.</p>}
          <form className="composer" onSubmit={(e) => { e.preventDefault(); send() }}>
            <button type="button" className="btn btn-ghost" onClick={() => send('fiche-de-revision.pdf')}>Joindre un fichier</button>
            <input aria-label="Votre message" value={text} onChange={(e) => setText(e.target.value)} placeholder="Votre message" />
            <button className="btn btn-primary" disabled={!text.trim()}>Envoyer</button>
          </form>
        </>}
      </section>
    </div>
  )
}
