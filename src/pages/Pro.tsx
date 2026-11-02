import { useState } from 'react'
import { DISCIPLINES, LANGUES, MADHAHIB, RIWAYAT, SURAHS, TIERS, commissionFor, disciplineName, surah, type Application } from '../data'
import { decideApplication, deliver, learnerName, resolveDispute, toEur, useApp, type Booking, type Report } from '../store'
import { Avatar, Chips, Empty, Field, Modal, Steps, fmtDay, fmtTime, fmtWhen, money } from '../ui'

const MIN_PAYOUT = 20
const pct = (x: number) => `${Math.round(x * 100)} %`

function ReportForm({ b, onClose }: { b: Booking; onClose: () => void }) {
  const { act, say, s } = useApp()
  const [r, setR] = useState<Report>({ covered: 'Al-Masad, fin de la sourate', surah: 'masad', from: 4, to: 5, tajwid: 'Qalqala mieux maîtrisée.', homework: 'Réciter toute la sourate chaque matin.', comment: 'Belle progression cette semaine.' })
  const up = (p: Partial<Report>) => setR({ ...r, ...p })
  const max = r.surah ? surah(r.surah).ayat : 0
  return (
    <Modal title={`Compte rendu pour ${learnerName(s, b.learnerId)}`} onClose={onClose}>
      <p className="muted small">Exemple prérempli pour la démo. Le parent le lit dès l’enregistrement.</p>
      <Field label="Contenu travaillé"><input id="r-covered" value={r.covered} onChange={(e) => up({ covered: e.target.value })} /></Field>
      <div className="grid3">
        <Field label="Sourate"><select id="r-surah" value={r.surah} onChange={(e) => up({ surah: e.target.value, from: 1, to: 1 })}><option value="">Aucune</option>{SURAHS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Du verset"><input id="r-from" type="number" min={1} max={max || undefined} disabled={!r.surah} value={r.from} onChange={(e) => up({ from: +e.target.value })} /></Field>
        <Field label="Au verset"><input id="r-to" type="number" min={r.from} max={max || undefined} disabled={!r.surah} value={r.to} onChange={(e) => up({ to: Math.min(+e.target.value, max) })} /></Field>
      </div>
      <Field label="Remarques de tajwid"><input id="r-taj" value={r.tajwid} onChange={(e) => up({ tajwid: e.target.value })} /></Field>
      <Field label="Devoirs"><input id="r-hw" value={r.homework} onChange={(e) => up({ homework: e.target.value })} /></Field>
      <Field label="Mot pour la famille"><textarea id="r-c" rows={2} value={r.comment} onChange={(e) => up({ comment: e.target.value })} /></Field>
      <button className="btn btn-primary" disabled={!r.covered.trim()} onClick={() => { act((d) => deliver(d, b.id, r)); onClose(); say('Séance marquée effectuée. Compte rendu envoyé à la famille.') }}>Marquer effectuée et envoyer</button>
    </Modal>
  )
}

export function TeacherSpace() {
  const { s, act, nav, market, now, route, say } = useApp()
  const me = s.teachers.find((t) => t.id === s.teacherMe)!
  const [tab, setTab] = useState<'seances' | 'revenus' | 'dispos'>('seances')
  const [rep, setRep] = useState<Booking | null>(route.a?.report ? s.bookings.find((b) => b.id === route.a.report) ?? null : null)
  const mine = s.bookings.filter((b) => b.teacherId === me.id)
  const upcoming = mine.filter((b) => b.status === 'scheduled').sort((a, b) => a.at - b.at)
  const waiting = mine.filter((b) => b.status === 'delivered')
  const done = mine.filter((b) => ['validated', 'disputed', 'refunded'].includes(b.status)).sort((a, b) => b.at - a.at)
  const rate = commissionFor(me.hours)
  const escrow = [...upcoming, ...waiting].reduce((a, b) => a + toEur(b.amount, b.cur) * (1 - rate), 0)
  const canPay = me.balance >= MIN_PAYOUT
  const myPayouts = s.payouts.filter((p) => p.teacherId === me.id)
  return (
    <div className="wrap dash">
      <div className="dash-top">
        <div className="row nowrap"><Avatar name={me.name} size={56} /><div><h1 className="h-page">Espace de {me.name.split(' ')[0]}</h1><p className="muted">{Math.round(me.hours)} heures dispensées</p></div></div>
        <label className="sort">Compte de démo
          <select value={me.id} onChange={(e) => act((d) => { d.teacherMe = e.target.value })}>{s.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      </div>
      <div className="tabs" role="tablist">
        {([['seances', `Séances (${upcoming.length})`], ['revenus', 'Revenus'], ['dispos', 'Disponibilités']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === 'seances' && <div className="stack">
        <section><h2>À venir</h2>
          {upcoming.length === 0 ? <Empty title="Aucune séance à venir."><span>Ouvrez plus de créneaux pour apparaître dans les recherches.</span></Empty> :
            <ul className="rows">{upcoming.map((b) => <li key={b.id} className="rowline">
              <div><strong>{learnerName(s, b.learnerId)}</strong>{b.kind === 'trial' && <span className="tag-new">Essai</span>}<br /><span className="muted">{fmtWhen(b.at, market.tz)}</span></div>
              <div className="row"><button className="btn btn-ghost sm" onClick={() => nav('room', { id: b.id, as: 'teacher' })}>Démarrer le cours</button><button className="btn btn-primary sm" onClick={() => setRep(b)}>Remplir le compte rendu</button></div>
            </li>)}</ul>}
        </section>
        {waiting.length > 0 && <section><h2>En attente de validation</h2>
          <ul className="rows">{waiting.map((b) => <li key={b.id} className="rowline"><div><strong>{learnerName(s, b.learnerId)}</strong><br /><span className="muted">{fmtDay(b.at, market.tz)}</span></div><span className="pill">Crédit dans {Math.max(0, Math.ceil((b.deliveredAt! + 48 * 3600_000 - now) / 3600_000))} h</span></li>)}</ul></section>}
        <section><h2>Passées</h2>
          {done.length === 0 ? <p className="muted">Aucune séance passée.</p> :
            <ul className="rows">{done.slice(0, 6).map((b) => <li key={b.id} className="rowline"><div><strong>{learnerName(s, b.learnerId)}</strong><br /><span className="muted">{fmtDay(b.at, market.tz)}</span></div><span className={`pill ${b.status === 'disputed' ? 'pill-warn' : b.status === 'refunded' ? 'pill-bad' : 'pill-ok'}`}>{b.status === 'validated' ? 'Créditée' : b.status === 'disputed' ? 'Litige' : 'Remboursée'}</span></li>)}</ul>}
        </section>
      </div>}

      {tab === 'revenus' && <div className="stack">
        <div className="money-flow">
          <div><span className="muted">Sous séquestre</span><strong>{money(escrow, 'EUR')}</strong><span className="muted small">Séances à venir ou dans les 48 h de contestation</span></div>
          <div><span className="muted">Disponible</span><strong>{money(Math.round(me.balance * 100) / 100, 'EUR')}</strong>
            <button className="btn btn-primary sm" disabled={!canPay} onClick={() => { act((d) => { const t = d.teachers.find((x) => x.id === d.teacherMe)!; d.payouts.push({ id: `p${++d.seq}`, teacherId: t.id, amount: Math.round(t.balance * 100) / 100, method: 'Wave', status: 'pending' }); t.balance = 0 }); say('Reversement demandé.') }}>Demander un reversement</button>
            {!canPay && <span className="muted small">Minimum {MIN_PAYOUT} €</span>}</div>
        </div>
        <section><h2>Votre commission baisse quand vous enseignez</h2>
          <ol className="ladder">{TIERS.map((t) => {
            const on = me.hours >= t.from && me.hours < t.to
            return <li key={t.from} className={on ? 'on' : ''}><strong>{pct(t.rate)}</strong><span>{t.to === Infinity ? `${t.from} h et plus` : `${t.from} à ${t.to} h`}</span>{on && <em>Votre palier</em>}</li>
          })}</ol>
          <p className="muted small">Exemple sur une séance à {money(me.rateEur, 'EUR')} : DINI garde {money(Math.round(me.rateEur * rate * 100) / 100, 'EUR')}, vous recevez {money(Math.round(me.rateEur * (1 - rate) * 100) / 100, 'EUR')}.</p></section>
        <section><h2>Reversements</h2>
          {myPayouts.length === 0 ? <p className="muted">Aucun reversement demandé.</p> :
            <ul className="rows">{myPayouts.map((p) => <li key={p.id} className="rowline"><span>{money(p.amount, 'EUR')} par {p.method}</span><span className={`pill ${p.status === 'paid' ? 'pill-ok' : ''}`}>{p.status === 'paid' ? 'Versé' : 'En traitement'}</span></li>)}</ul>}</section>
      </div>}

      {tab === 'dispos' && <div className="stack">
        <section><h2>Vos créneaux habituels</h2><p className="muted">Heures universelles (UTC) dans ce prototype. Chaque famille les voit dans son propre fuseau. Cliquez pour ouvrir ou fermer un créneau.</p>
          <div className="scroll-x"><table className="table avail">
            <thead><tr><th />{['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((d) => <th key={d}>{d}</th>)}</tr></thead>
            <tbody>{[6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20].map((h) => <tr key={h}><th scope="row">{h} h</th>{[0, 1, 2, 3, 4, 5, 6].map((d) => {
              const on = me.utcHours.includes(h) && me.days.includes(d)
              return <td key={d}><button aria-label={`${h} h, jour ${d}`} aria-pressed={on} className={`cell ${on ? 'on' : ''}`} onClick={() => act((x) => { const t = x.teachers.find((y) => y.id === x.teacherMe)!; if (t.utcHours.includes(h)) t.utcHours = t.utcHours.filter((y) => y !== h); else t.utcHours = [...t.utcHours, h].sort((a, c) => a - c); if (!t.days.includes(d)) t.days.push(d) })} /></td>
            })}</tr>)}</tbody></table></div>
          <p className="muted small">Simplification de démo : ouvrir une heure l’ouvre pour tous vos jours actifs.</p></section>
      </div>}
      {rep && <ReportForm b={rep} onClose={() => setRep(null)} />}
    </div>
  )
}

const STEPS = ['Profil', 'Pièces', 'Récitation', 'Entretien', 'Références', 'Envoi']

export function Apply() {
  const { act, nav, s, say } = useApp()
  const [step, setStep] = useState(0)
  const [a, setA] = useState({ name: 'Rama Thiam', gender: 'F' as 'F' | 'M', city: 'Saint-Louis', phone: '+221 77 000 00 00', subjects: ['hifz', 'tajwid'], riwaya: ['Warsh'], madhhab: ['Maliki'], langs: ['français', 'wolof'], bio: 'J’enseigne le Coran aux enfants de Saint-Louis depuis cinq ans et je souhaite suivre aussi des familles de la diaspora.', rateEur: 7, rateFcfa: 2500 })
  const [docs, setDocs] = useState({ identity: false, diploma: false, ijaza: false })
  const [smsOk, setSmsOk] = useState(false)
  const [rec, setRec] = useState<'idle' | 'on' | 'done'>('idle')
  const [slot, setSlot] = useState('')
  const [refs, setRefs] = useState([{ name: 'Oustaz Modou Gueye', role: 'Maître de daara' }, { name: 'Bineta Faye', role: 'Directrice d’école' }])
  const [sent, setSent] = useState(false)
  const quran = a.subjects.some((x) => ['lecture', 'hifz', 'tajwid', 'qiraat'].includes(x))
  const up = (p: Partial<typeof a>) => setA({ ...a, ...p })
  const blocked = [
    !a.name || !a.subjects.length || !a.langs.length || !smsOk ? 'Renseignez votre profil et confirmez votre téléphone.' : '',
    !docs.identity ? 'La pièce d’identité est obligatoire.' : '',
    quran && rec !== 'done' ? 'L’extrait est obligatoire pour une discipline coranique.' : '',
    !slot ? 'Choisissez un créneau d’entretien.' : '',
    refs.some((r) => !r.name || !r.role) ? 'Indiquez deux références.' : '',
    '',
  ][step]

  const submit = () => {
    const app: Application = { id: `a${Date.now()}`, name: a.name, gender: a.gender, city: a.city, tz: 'Africa/Dakar', phone: a.phone, subjects: a.subjects, riwaya: a.riwaya, madhhab: a.madhhab, langs: a.langs, bio: a.bio, docs, diplomaLabel: docs.diploma ? 'Diplôme déposé' : '', ijazaLabel: docs.ijaza ? `Ijaza ${a.riwaya[0] ?? ''}, sanad fourni` : '', recitation: rec === 'done', interview: slot, refs, rateEur: a.rateEur, rateFcfa: a.rateFcfa, checks: { identity: false, phone: true, interview: false, diploma: false, ijaza: false, refs: false }, status: 'pending', submitted: 'à l’instant' }
    act((d) => { d.applications.unshift(app); d.flags.applied = true })
    setSent(true)
    say('Candidature envoyée.')
  }

  if (sent) return (
    <div className="wrap narrow confirm">
      <h1 className="h-page">Candidature envoyée</h1>
      <p className="lede">Un modérateur vous contactera pour l’entretien : {slot}. Vous recevrez sa décision par SMS.</p>
      <ol className="timeline"><li className="done">Candidature reçue</li><li>Contrôle des pièces</li><li>Entretien visio</li><li>Appel des références</li><li>Décision</li></ol>
      <div className="row"><button className="btn btn-primary" onClick={() => { act((d) => { d.role = 'admin' }); nav('admin') }}>Passer côté modérateur</button><button className="btn btn-ghost" onClick={() => nav('home')}>Retour à l’accueil</button></div>
    </div>
  )

  const opts = (x: string[]) => x.map((v) => ({ id: v, label: v }))
  return (
    <div className="wrap narrow">
      <h1 className="h-page">Devenir enseignant sur DINI</h1>
      <p className="muted">Comptez environ 15 minutes. Les champs sont préremplis pour la démo.</p>
      <Steps steps={STEPS} current={step} />
      <section className="panel">
        {step === 0 && <>
          <h2>Présentez-vous</h2>
          <div className="grid2">
            <Field label="Nom complet"><input id="a-n" value={a.name} onChange={(e) => up({ name: e.target.value })} /></Field>
            <Field label="Ville"><input id="a-c" value={a.city} onChange={(e) => up({ city: e.target.value })} /></Field>
          </div>
          <div className="fgroup"><span className="fl">Vous êtes</span><Chips label="Genre" options={[{ id: 'F', label: 'Une femme' }, { id: 'M', label: 'Un homme' }]} value={[a.gender]} onChange={(v) => up({ gender: (v[v.length - 1] ?? a.gender) as 'F' | 'M' })} /></div>
          <div className="fgroup"><span className="fl">Disciplines enseignées</span><Chips label="Disciplines" options={DISCIPLINES.map((x) => ({ id: x.id, label: x.name }))} value={a.subjects} onChange={(v) => up({ subjects: v })} /></div>
          <div className="fgroup"><span className="fl">Riwaya</span><Chips label="Riwaya" options={opts(RIWAYAT)} value={a.riwaya} onChange={(v) => up({ riwaya: v })} /></div>
          <div className="fgroup"><span className="fl">Madhhab</span><Chips label="Madhhab" options={opts(MADHAHIB)} value={a.madhhab} onChange={(v) => up({ madhhab: v })} /></div>
          <div className="fgroup"><span className="fl">Langues d’enseignement</span><Chips label="Langues" options={opts(LANGUES)} value={a.langs} onChange={(v) => up({ langs: v })} /></div>
          <Field label="Votre parcours en quelques lignes"><textarea id="a-b" rows={3} value={a.bio} onChange={(e) => up({ bio: e.target.value })} /></Field>
          <div className="grid2">
            <Field label="Tarif international, 30 min (€)" hint="Vous fixez vos tarifs."><input id="a-re" type="number" value={a.rateEur} onChange={(e) => up({ rateEur: +e.target.value })} /></Field>
            <Field label="Tarif local, 30 min (FCFA)"><input id="a-rf" type="number" value={a.rateFcfa} onChange={(e) => up({ rateFcfa: +e.target.value })} /></Field>
          </div>
          <div className="row end-align"><Field label="Téléphone"><input id="a-ph" value={a.phone} onChange={(e) => up({ phone: e.target.value })} /></Field>
            <button type="button" className="btn btn-ghost" disabled={smsOk} onClick={() => setSmsOk(true)}>{smsOk ? 'Téléphone confirmé' : 'Confirmer par SMS (simulé)'}</button></div>
        </>}
        {step === 1 && <>
          <h2>Déposez vos pièces</h2>
          <p className="muted">Dépôt simulé : aucun fichier n’est envoyé.</p>
          <ul className="rows">{([['identity', 'Pièce d’identité', 'Obligatoire'], ['diploma', 'Diplômes et attestations', 'Pour le badge Diplôme vérifié'], ['ijaza', 'Ijaza et sanad', 'Pour le badge Ijaza vérifiée']] as const).map(([k, l, h]) => <li key={k} className="rowline"><div><strong>{l}</strong><br /><span className="muted small">{h}</span></div><button type="button" className={`btn sm ${docs[k] ? 'btn-ok' : 'btn-ghost'}`} onClick={() => setDocs({ ...docs, [k]: !docs[k] })}>{docs[k] ? 'Déposé' : 'Déposer'}</button></li>)}</ul>
        </>}
        {step === 2 && <>
          <h2>Enregistrez un extrait de récitation</h2>
          <p className="muted">{quran ? 'Obligatoire pour toute discipline coranique. Deux minutes suffisent. Il sera écouté par le modérateur, puis visible sur votre profil.' : 'Facultatif pour vos disciplines.'}</p>
          <div className="rec">
            <button type="button" className={`rec-btn ${rec === 'on' ? 'on' : ''}`} onClick={() => setRec(rec === 'on' ? 'done' : 'on')}>{rec === 'on' ? 'Arrêter' : rec === 'done' ? 'Recommencer' : 'Enregistrer'}</button>
            <span aria-live="polite">{rec === 'on' ? 'Enregistrement simulé en cours…' : rec === 'done' ? 'Extrait enregistré : 1 min 48.' : 'Micro non utilisé dans le prototype.'}</span>
          </div>
        </>}
        {step === 3 && <>
          <h2>Choisissez votre entretien</h2>
          <p className="muted">30 minutes en visio avec un modérateur compétent en sciences islamiques.</p>
          <div className="pick-list">{['Jeudi à 10 h', 'Vendredi à 15 h', 'Samedi à 9 h'].map((x) => <button key={x} type="button" className={`pick ${slot === x ? 'pick-on' : ''}`} onClick={() => setSlot(x)}><strong>{x}</strong></button>)}</div>
        </>}
        {step === 4 && <>
          <h2>Deux personnes qui vous connaissent</h2>
          {refs.map((r, i) => <div key={i} className="grid2">
            <Field label={`Référence ${i + 1}`}><input id={`ref-${i}`} value={r.name} onChange={(e) => setRefs(refs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></Field>
            <Field label="Lien avec vous"><input id={`refr-${i}`} value={r.role} onChange={(e) => setRefs(refs.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} /></Field>
          </div>)}
        </>}
        {step === 5 && <>
          <h2>Relisez et envoyez</h2>
          <dl className="recap-l">
            <div><dt>Nom</dt><dd>{a.name}, {a.city}</dd></div>
            <div><dt>Disciplines</dt><dd>{a.subjects.map(disciplineName).join(', ')}</dd></div>
            <div><dt>Pièces</dt><dd>{[docs.identity && 'identité', docs.diploma && 'diplôme', docs.ijaza && 'ijaza'].filter(Boolean).join(', ')}</dd></div>
            <div><dt>Récitation</dt><dd>{rec === 'done' ? 'Enregistrée' : 'Non fournie'}</dd></div>
            <div><dt>Entretien</dt><dd>{slot}</dd></div>
            <div><dt>Références</dt><dd>{refs.map((r) => r.name).join(', ')}</dd></div>
          </dl>
        </>}
        {blocked && <p className="field-hint hint-warn">{blocked}</p>}
        <div className="row">
          {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>Retour</button>}
          {step < 5 ? <button type="button" className="btn btn-primary" disabled={!!blocked} onClick={() => setStep(step + 1)}>Continuer</button>
            : <button type="button" className="btn btn-primary" onClick={submit}>Envoyer ma candidature</button>}
        </div>
      </section>
      {s.flags.applied && <p className="muted small">Une candidature de démo a déjà été envoyée.</p>}
    </div>
  )
}

const CHECKS = [
  { k: 'identity', l: 'Pièce d’identité contrôlée', must: true },
  { k: 'phone', l: 'Téléphone confirmé', must: true },
  { k: 'interview', l: 'Entretien visio réalisé', must: true },
  { k: 'refs', l: 'Deux références appelées', must: true },
  { k: 'diploma', l: 'Diplôme contrôlé', must: false },
  { k: 'ijaza', l: 'Ijaza et sanad contrôlés', must: false },
] as const

function AppReview({ a }: { a: Application }) {
  const { act, say } = useApp()
  const must = CHECKS.filter((c) => c.must).every((c) => a.checks[c.k])
  const full = a.checks.diploma || a.checks.ijaza
  return (
    <article className="app-card">
      <header className="child-head"><Avatar name={a.name} size={48} /><div><h3>{a.name}</h3><p className="muted">{a.city}, reçue {a.submitted}. Entretien : {a.interview}.</p></div></header>
      <p>{a.bio}</p>
      <dl className="facts facts-wide">
        <div><dt>Disciplines</dt><dd>{a.subjects.map(disciplineName).join(', ')}</dd></div>
        <div><dt>Riwaya, madhhab</dt><dd>{[...a.riwaya, ...a.madhhab].join(', ')}</dd></div>
        <div><dt>Pièces reçues</dt><dd>{[a.docs.identity && 'identité', a.docs.diploma && a.diplomaLabel, a.docs.ijaza && a.ijazaLabel].filter(Boolean).join(' ; ')}</dd></div>
        <div><dt>Références</dt><dd>{a.refs.map((r) => `${r.name} (${r.role})`).join(', ')}</dd></div>
        <div><dt>Récitation</dt><dd>{a.recitation ? 'Extrait reçu' : 'Non fournie'}</dd></div>
      </dl>
      <fieldset className="checks"><legend>Ce que vous avez contrôlé</legend>
        {CHECKS.map((c) => {
          const unavailable = (c.k === 'diploma' && !a.docs.diploma) || (c.k === 'ijaza' && !a.docs.ijaza)
          return <label key={c.k} className={unavailable ? 'off' : ''}><input type="checkbox" disabled={unavailable} checked={a.checks[c.k]} onChange={(e) => act((d) => { d.applications.find((x) => x.id === a.id)!.checks[c.k] = e.target.checked })} />{c.l}{c.must ? '' : ' (donne un badge)'}</label>
        })}
      </fieldset>
      {!must && <p className="field-hint hint-warn">Identité, téléphone, entretien et références doivent être contrôlés avant d’accepter.</p>}
      {must && !full && <p className="field-hint">Sans diplôme ni ijaza contrôlés, seul le badge limité est possible.</p>}
      <div className="row">
        <button className="btn btn-primary" disabled={!must || !full} onClick={() => { act((d) => decideApplication(d, a.id, 'accepted')); say(`${a.name} acceptée : profil visible dans la recherche.`.replace('acceptée', a.gender === 'F' ? 'acceptée' : 'accepté')) }}>Accepter</button>
        <button className="btn btn-ghost" disabled={!must} onClick={() => { act((d) => decideApplication(d, a.id, 'limited')); say('Accepté avec badge limité.') }}>Accepter avec badge limité</button>
        <button className="btn btn-ghost btn-danger" onClick={() => { act((d) => decideApplication(d, a.id, 'refused')); say('Candidature refusée.') }}>Refuser</button>
      </div>
    </article>
  )
}

export function Admin() {
  const { s, act, say, market } = useApp()
  const [tab, setTab] = useState<'cand' | 'lit' | 'pay' | 'stats'>('cand')
  const pending = s.applications.filter((a) => a.status === 'pending')
  const decided = s.applications.filter((a) => a.status !== 'pending')
  const openD = s.disputes.filter((d) => d.status === 'open')
  const openP = s.payouts.filter((p) => p.status === 'pending')
  const women = s.teachers.filter((t) => t.gender === 'F').length
  const share = women / s.teachers.length
  const billable = s.bookings.filter((b) => ['validated', 'delivered', 'disputed'].includes(b.status))
  const gmv = billable.reduce((a, b) => a + toEur(b.amount, b.cur), 0) + s.subs.reduce((a, x) => a + toEur(x.price, x.cur), 0)
  const net = billable.reduce((a, b) => a + toEur(b.amount, b.cur) * commissionFor(s.teachers.find((t) => t.id === b.teacherId)?.hours ?? 0), 0)
  const trials = s.bookings.filter((b) => b.kind === 'trial').length
  const heldAll = s.bookings.filter((b) => ['validated', 'delivered', 'disputed', 'missed'].includes(b.status))
  const attendance = heldAll.length ? heldAll.filter((b) => b.status !== 'missed').length / heldAll.length : 0
  const coverage = DISCIPLINES.filter((d) => s.teachers.filter((t) => t.subjects.includes(d.id)).length >= 2).length / DISCIPLINES.length
  return (
    <div className="wrap dash">
      <div className="dash-top"><div><h1 className="h-page">Back-office</h1><p className="muted">Modération, litiges, reversements et pilotage.</p></div></div>
      <div className="tabs" role="tablist">
        {([['cand', `Candidatures (${pending.length})`], ['lit', `Litiges (${openD.length})`], ['pay', `Reversements (${openP.length})`], ['stats', 'Statistiques']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'cand' && <div className="stack">
        {pending.length === 0 && <Empty title="Toutes les candidatures sont traitées." />}
        {pending.map((a) => <AppReview key={a.id} a={a} />)}
        {decided.length > 0 && <section><h2>Décisions récentes</h2><ul className="rows">{decided.map((a) => <li key={a.id} className="rowline"><span>{a.name}</span><span className={`pill ${a.status === 'refused' ? 'pill-bad' : a.status === 'limited' ? 'pill-warn' : 'pill-ok'}`}>{a.status === 'accepted' ? 'Accepté' : a.status === 'limited' ? 'Badge limité' : 'Refusé'}</span></li>)}</ul></section>}
      </div>}
      {tab === 'lit' && <div className="stack">
        {openD.length === 0 && <Empty title="Aucun litige ouvert." />}
        {openD.map((d) => {
          const b = s.bookings.find((x) => x.id === d.bookingId)
          return <article key={d.id} className="app-card"><h3>{d.reason}</h3><p>{d.description}</p>
            {b && <p className="muted">{learnerName(s, b.learnerId)} avec {s.teachers.find((t) => t.id === b.teacherId)?.name}, {fmtDay(b.at, market.tz)} à {fmtTime(b.at, market.tz)}. Montant bloqué : {money(b.amount, b.cur)}.</p>}
            {b?.report && <p className="muted">Compte rendu de l’enseignant : {b.report.covered}.</p>}
            <div className="row"><button className="btn btn-primary" onClick={() => { act((x) => resolveDispute(x, d.id, 'refunded')); say('Famille remboursée.') }}>Rembourser la famille</button><button className="btn btn-ghost" onClick={() => { act((x) => resolveDispute(x, d.id, 'paid')); say('Enseignant payé.') }}>Payer l’enseignant</button></div></article>
        })}
      </div>}
      {tab === 'pay' && <div className="stack">
        {openP.length === 0 ? <Empty title="Aucun reversement à traiter." /> :
          <ul className="rows">{openP.map((p) => <li key={p.id} className="rowline"><div><strong>{s.teachers.find((t) => t.id === p.teacherId)?.name}</strong><br /><span className="muted">{money(p.amount, 'EUR')} par {p.method}</span></div><button className="btn btn-primary sm" onClick={() => { act((d) => { d.payouts.find((x) => x.id === p.id)!.status = 'paid' }); say('Reversement marqué comme versé.') }}>Marquer comme versé</button></li>)}</ul>}
        <p className="muted small">Dans le produit, ces envois dépendront de la solution retenue pour les reversements internationaux (Stripe Connect, Wise, Payoneer ou agrégateur mobile money), point à trancher avant le lancement.</p>
      </div>}
      {tab === 'stats' && <div className="stack">
        <p className="demo-note">Chiffres calculés sur les données fictives de cette démo. Ils bougent quand vous utilisez le prototype.</p>
        <div className="kpis">
          <div><span className="muted">Enseignants actifs</span><strong>{s.teachers.length}</strong><span className="muted small">Seuil d’ouverture : 25, dont 10 enseignantes</span></div>
          <div><span className="muted">Volume d’affaires</span><strong>{money(Math.round(gmv), 'EUR')}</strong></div>
          <div><span className="muted">Commission gagnée</span><strong>{money(Math.round(net), 'EUR')}</strong></div>
          <div><span className="muted">Séances d’essai</span><strong>{trials}</strong></div>
          <div><span className="muted">Présence aux séances</span><strong>{pct(attendance)}</strong></div>
          <div><span className="muted">Disciplines avec au moins 2 profils</span><strong>{pct(coverage)}</strong></div>
        </div>
        <section><h2>Part d’enseignantes</h2>
          <div className="target" role="img" aria-label={`${pct(share)} d’enseignantes, objectif 40 %`}><i style={{ width: `${share * 100}%` }} /><b style={{ insetInlineStart: '40%' }}><span>Objectif 40 %</span></b></div>
          <p>{women} enseignantes sur {s.teachers.length}, soit {pct(share)}.</p></section>
      </div>}
    </div>
  )
}
