import { useMemo, useState } from 'react'
import { AGES, DISCIPLINES, LANGUES, MADHAHIB, NIVEAUX, PLANS, RIWAYAT, disciplineName, lowerFirst, type Teacher } from '../data'
import { createBooking, isFree, learnersOf, nextSlots, useApp } from '../store'
import { AudioPlayer, Avatar, BADGES, Badge, Chips, Empty, Modal, Stars, badgesOf, fmtDay, fmtTime, hourIn, money, type BadgeKey } from '../ui'

const rate = (t: Teacher, cur: string) => (cur === 'EUR' ? t.rateEur : t.rateFcfa)

export function Home() {
  const { nav, s, market } = useApp()
  const [d, setD] = useState('hifz')
  const [r, setR] = useState('Warsh')
  const [g, setG] = useState('F')
  const star = s.teachers.find((t) => t.id === 't1')!
  const count = s.teachers.filter((t) => t.subjects.includes(d) && (d === 'fiqh' || t.riwaya.includes(r) || !['lecture', 'hifz', 'tajwid', 'qiraat'].includes(d)) && (!g || t.gender === g)).length
  const go = () => nav('search', { d, riwaya: ['lecture', 'hifz', 'tajwid', 'qiraat'].includes(d) ? [r] : [], gender: g ? [g] : [] })
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <h1>Choisissez vous-même qui enseignera le Coran, à vos enfants ou à vous.</h1>
            <form className="madlib" onSubmit={(e) => { e.preventDefault(); go() }}>
              <span>Je cherche</span>
              <select aria-label="Genre de l’enseignant" value={g} onChange={(e) => setG(e.target.value)}>
                <option value="F">une enseignante</option><option value="M">un enseignant</option><option value="">un enseignant ou une enseignante</option>
              </select>
              <span>pour</span>
              <select aria-label="Discipline" value={d} onChange={(e) => setD(e.target.value)}>
                {DISCIPLINES.map((x) => <option key={x.id} value={x.id}>{lowerFirst(x.name)}</option>)}
              </select>
              {['lecture', 'hifz', 'tajwid', 'qiraat'].includes(d) && <><span>en riwaya</span>
                <select aria-label="Riwaya" value={r} onChange={(e) => setR(e.target.value)}>{RIWAYAT.map((x) => <option key={x}>{x}</option>)}</select></>}
              <button className="btn btn-sand" type="submit">Voir {count > 0 ? `${count} ${count > 1 ? 'profils' : 'profil'}` : 'les profils'}</button>
            </form>
            <p className="hero-note">Chaque enseignant est vérifié à la main. Vous voyez son prix, ses diplômes, sa riwaya et ses avis avant de réserver.</p>
          </div>
          <button type="button" className="folio" onClick={() => nav('teacher', { id: star.id })}>
            <span className="folio-ar" lang="ar" dir="rtl">الإجازة</span>
            <span className="folio-row"><Avatar name={star.name} size={52} /><span><strong>{star.name}</strong><br /><span className="muted">{star.city}, {star.hours} heures sur DINI</span></span></span>
            <span className="sanad-mini">
              {star.credentials[0].sanad!.map((n, i) => <span key={n} className={i === 0 ? 'first' : ''}>{n}</span>)}
            </span>
            <span className="folio-foot">Ijaza vérifiée, riwaya Warsh. Sanad consultable.</span>
          </button>
        </div>
      </section>

      <section className="wrap band">
        <h2>Par quoi voulez-vous commencer&nbsp;?</h2>
        <ul className="disc-grid">
          {DISCIPLINES.map((x) => (
            <li key={x.id}><button type="button" className="disc" onClick={() => nav('search', { d: x.id })}>
              <span className="disc-ar" lang="ar" dir="rtl">{x.ar}</span>
              <strong>{x.name}</strong><span className="muted">{x.desc}</span>
            </button></li>
          ))}
        </ul>
      </section>

      <section className="sand-band"><div className="wrap band">
        <h2>Un badge DINI, c’est six étapes de contrôle</h2>
        <p className="lede">Nos modérateurs sont compétents en sciences islamiques. Le détail de ce qui a été contrôlé est public sur chaque profil.</p>
        <ol className="verify">
          {[['Formulaire', 'Identité, parcours, disciplines, riwaya, madhhab, langues'], ['Pièces', 'Identité, diplômes, ijaza'], ['Récitation', 'Extrait obligatoire pour toute discipline coranique'], ['Entretien', 'En visio, avec un modérateur'], ['Références', 'Deux personnes joignables et vérifiables'], ['Décision', 'Accepté, accepté avec badge limité, ou refusé']].map(([a, b], i) => (
            <li key={a}><span className="num">{i + 1}</span><strong>{a}</strong><span className="muted">{b}</span></li>
          ))}
        </ol>
      </div></section>

      <section className="wrap band">
        <h2>Ce qui change par rapport à ce que vous connaissez</h2>
        <div className="scroll-x"><table className="table compare">
          <thead><tr><th /><th>Agences internationales</th><th>Groupes WhatsApp</th><th className="us">DINI</th></tr></thead>
          <tbody>
            {[['Choix de l’enseignant', 'Imposé', 'Libre mais à l’aveugle', 'Libre et informé'], ['Vérification', 'Interne, opaque', 'Aucune', 'Publique et détaillée'], ['Prix', 'En dollars, élevé', 'Négocié, aléatoire', `Fixé par l’enseignant, affiché en ${market.cur === 'EUR' ? 'euros' : 'FCFA'}`], ['Paiement', 'Carte uniquement', 'Espèces, mobile money informel', 'Carte, Wave, Orange Money, sous séquestre'], ['Suivi', 'Variable', 'Aucun', 'Compte rendu après chaque séance'], ['Langue', 'Anglais, arabe', 'Variable', 'Français d’abord']].map((row) => (
              <tr key={row[0]}><th scope="row">{row[0]}</th><td>{row[1]}</td><td>{row[2]}</td><td className="us">{row[3]}</td></tr>
            ))}
          </tbody>
        </table></div>
        <p className="neutral">DINI accueille tous les madhahib et toutes les riwayat, avec un affichage transparent qui vous laisse le choix. DINI met en relation : la plateforme n’enseigne pas, ne produit aucun contenu religieux et ne délivre aucune fatwa.</p>
      </section>

      <section className="green-band"><div className="wrap band teach-cta">
        <div><h2>Vous enseignez le Coran, l’arabe ou les sciences islamiques&nbsp;?</h2>
          <p>Fixez vos tarifs et vos horaires. Votre commission baisse de 30 % à 15 % à mesure que vous enseignez.</p></div>
        <button className="btn btn-sand" onClick={() => nav('apply')}>Déposer ma candidature</button>
      </div></section>
    </>
  )
}

export function TeacherCard({ t }: { t: Teacher }) {
  const { nav, market } = useApp()
  return (
    <article className="tcard" onClick={() => nav('teacher', { id: t.id })}>
      <Avatar name={t.name} size={84} />
      <div className="tcard-main">
        <h3><button type="button" className="linklike" onClick={(e) => { e.stopPropagation(); nav('teacher', { id: t.id }) }}>{t.name}</button>{t.isNew && <span className="tag-new">Nouveau</span>}</h3>
        <div className="badges">{badgesOf(t).map((k) => <Badge key={k} k={k} t={t} />)}</div>
        <p className="tcard-head">{t.headline}</p>
        <dl className="facts">
          <div><dt>Enseigne</dt><dd>{t.subjects.map(disciplineName).join(', ')}</dd></div>
          <div><dt>Riwaya</dt><dd>{t.riwaya.join(', ')}</dd></div>
          <div><dt>Langues</dt><dd>{t.langs.join(', ')}</dd></div>
        </dl>
      </div>
      <div className="tcard-side">
        <div><strong className="price">{money(rate(t, market.cur), market.cur)}</strong><span className="muted"> la séance de 30 min</span></div>
        <Stars value={t.rating} count={t.reviews.length} />
        <AudioPlayer id={t.id} />
      </div>
    </article>
  )
}

type Filters = { d: string; riwaya: string[]; gender: string[]; madhhab: string[]; langs: string[]; level: string[]; age: string[]; time: string[]; max: number }
const emptyF: Filters = { d: '', riwaya: [], gender: [], madhhab: [], langs: [], level: [], age: [], time: [], max: 0 }

export function Search() {
  const { s, route, market } = useApp()
  const [f, setF] = useState<Filters>({ ...emptyF, ...(route.a ?? {}) })
  const [sort, setSort] = useState('pertinence')
  const [sheet, setSheet] = useState(false)
  const up = (p: Partial<Filters>) => setF((x) => ({ ...x, ...p }))
  const ceiling = market.cur === 'EUR' ? 15 : 6000
  const max = f.max || ceiling
  const results = useMemo(() => {
    const out = s.teachers.filter((t) =>
      (!f.d || t.subjects.includes(f.d)) &&
      (!f.riwaya.length || f.riwaya.some((x) => t.riwaya.includes(x))) &&
      (!f.gender.length || f.gender.includes(t.gender)) &&
      (!f.madhhab.length || f.madhhab.some((x) => t.madhhab.includes(x))) &&
      (!f.langs.length || f.langs.some((x) => t.langs.includes(x))) &&
      (!f.level.length || f.level.some((x) => t.levels.includes(x))) &&
      (!f.age.length || f.age.some((x) => t.ages.includes(x))) &&
      rate(t, market.cur) <= max &&
      (!f.time.length || t.utcHours.some((h) => {
        const lh = hourIn(Date.UTC(2026, 10, 2, h), market.tz)
        return (f.time.includes('matin') && lh < 12) || (f.time.includes('aprem') && lh >= 12 && lh < 18) || (f.time.includes('soir') && lh >= 18)
      })))
    if (sort === 'note') out.sort((a, b) => b.rating - a.rating)
    if (sort === 'prix') out.sort((a, b) => rate(a, market.cur) - rate(b, market.cur))
    return out
  }, [s.teachers, f, sort, market, max])
  const active = f.riwaya.length + f.gender.length + f.madhhab.length + f.langs.length + f.level.length + f.age.length + f.time.length + (f.d ? 1 : 0) + (f.max ? 1 : 0)
  const opt = (a: string[]) => a.map((x) => ({ id: x, label: x }))

  const panel = (
    <div className="filters">
      <div className="fgroup"><label className="fl" htmlFor="f-d">Discipline</label>
        <select id="f-d" value={f.d} onChange={(e) => up({ d: e.target.value })}><option value="">Toutes les disciplines</option>{DISCIPLINES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      <div className="fgroup"><span className="fl">Riwaya</span><Chips label="Riwaya" options={opt(RIWAYAT)} value={f.riwaya} onChange={(v) => up({ riwaya: v })} /></div>
      <div className="fgroup"><span className="fl">Enseignant</span><Chips label="Genre" options={[{ id: 'F', label: 'Une femme' }, { id: 'M', label: 'Un homme' }]} value={f.gender} onChange={(v) => up({ gender: v })} /></div>
      <div className="fgroup"><label className="fl" htmlFor="f-p">Prix maximum : {money(max, market.cur)}</label>
        <input id="f-p" type="range" min={market.cur === 'EUR' ? 5 : 1500} max={ceiling} step={market.cur === 'EUR' ? 1 : 500} value={max} onChange={(e) => up({ max: +e.target.value === ceiling ? 0 : +e.target.value })} /></div>
      <div className="fgroup"><span className="fl">Disponible ({market.tzLabel})</span><Chips label="Disponibilité" options={[{ id: 'matin', label: 'Matin' }, { id: 'aprem', label: 'Après-midi' }, { id: 'soir', label: 'Soir' }]} value={f.time} onChange={(v) => up({ time: v })} /></div>
      <div className="fgroup"><span className="fl">Âge de l’élève</span><Chips label="Âge" options={AGES} value={f.age} onChange={(v) => up({ age: v })} /></div>
      <div className="fgroup"><span className="fl">Niveau</span><Chips label="Niveau" options={opt(NIVEAUX)} value={f.level} onChange={(v) => up({ level: v })} /></div>
      <div className="fgroup"><span className="fl">Langue d’enseignement</span><Chips label="Langue" options={opt(LANGUES)} value={f.langs} onChange={(v) => up({ langs: v })} /></div>
      <div className="fgroup"><span className="fl">Madhhab</span><Chips label="Madhhab" options={opt(MADHAHIB)} value={f.madhhab} onChange={(v) => up({ madhhab: v })} /></div>
      {active > 0 && <button type="button" className="btn btn-ghost" onClick={() => setF(emptyF)}>Effacer les filtres</button>}
    </div>
  )

  return (
    <div className="wrap search">
      <aside className="search-side">{panel}</aside>
      <div className="search-main">
        <div className="search-top">
          <h1 className="h-page">{results.length} {results.length > 1 ? 'enseignants vérifiés' : 'enseignant vérifié'}{f.d ? ` en ${lowerFirst(disciplineName(f.d))}` : ''}</h1>
          <div className="search-tools">
            <button type="button" className="btn btn-ghost only-m" onClick={() => setSheet(true)}>Filtres{active ? ` (${active})` : ''}</button>
            <label className="sort">Trier par <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="pertinence">Pertinence</option><option value="note">Meilleure note</option><option value="prix">Prix croissant</option></select></label>
          </div>
        </div>
        {results.length === 0
          ? <Empty title="Aucun enseignant ne correspond à tous ces filtres."><span>Retirez un filtre, par exemple la riwaya ou le prix, pour élargir la recherche.</span><button className="btn btn-ghost" onClick={() => setF(emptyF)}>Effacer les filtres</button></Empty>
          : <div className="tlist">{results.map((t) => <TeacherCard key={t.id} t={t} />)}</div>}
      </div>
      {sheet && <Modal title="Filtres" onClose={() => setSheet(false)}>{panel}<button className="btn btn-primary full" onClick={() => setSheet(false)}>Voir {results.length} résultats</button></Modal>}
    </div>
  )
}

export function TeacherPage() {
  const { s, route, nav, market, now, act, say } = useApp()
  const t = s.teachers.find((x) => x.id === route.a?.id)
  const [badge, setBadge] = useState<BadgeKey | null>(null)
  const [week, setWeek] = useState(0)
  if (!t) return <div className="wrap band"><Empty title="Ce profil n’existe plus."><button className="btn btn-ghost" onClick={() => nav('search')}>Retour à la recherche</button></Empty></div>
  const slots = nextSlots(t, now + week * 7 * 86400_000, 7).filter((a) => isFree(s, t.id, a)).slice(0, 18)
  const days = new Map<string, number[]>()
  slots.forEach((a) => { const k = fmtDay(a, market.tz); days.set(k, [...(days.get(k) ?? []), a]) })
  const ijaza = t.credentials.find((c) => c.sanad)
  return (
    <div className="wrap profile">
      <div className="profile-main">
        <header className="p-head">
          <Avatar name={t.name} size={112} />
          <div>
            <h1 className="h-page">{t.name}</h1>
            <p className="muted">{t.city}. Enseigne en {t.langs.join(', ')}.</p>
            <div className="badges">{badgesOf(t).map((k) => <Badge key={k} k={k} t={t} onClick={() => setBadge(k)} />)}</div>
          </div>
        </header>
        <AudioPlayer id={t.id} big label={`Écouter un extrait${ijaza?.riwaya ? `, riwaya ${ijaza.riwaya}` : ''}`} />
        <section><h2>{t.headline}</h2><p className="prose">{t.bio}</p>
          <dl className="facts facts-wide">
            <div><dt>Disciplines</dt><dd>{t.subjects.map(disciplineName).join(', ')}</dd></div>
            <div><dt>Riwaya</dt><dd>{t.riwaya.join(', ')}</dd></div>
            <div><dt>Madhhab</dt><dd>{t.madhhab.join(', ')}</dd></div>
            <div><dt>Niveaux</dt><dd>{t.levels.join(', ')}</dd></div>
          </dl></section>
        <section><h2>Parcours vérifié</h2>
          {t.credentials.length === 0 && <p className="muted">Aucun diplôme ni ijaza validé pour le moment. Seule l’identité a été contrôlée.</p>}
          <ul className="creds">{t.credentials.map((c) => (
            <li key={c.title}><span className="cred-type">{c.type}</span><div><strong>{c.title}</strong><br /><span className="muted">{c.institution}, {c.year}</span>
              {c.sanad && <ol className="sanad" aria-label="Chaîne de transmission">{c.sanad.map((n) => <li key={n}>{n}</li>)}<li className="sanad-more">Chaîne complète dans le dossier de vérification</li></ol>}
            </div></li>))}</ul></section>
        <section id="avis"><h2>Avis des familles</h2>
          {t.reviews.length === 0 && <p className="muted">Pas encore d’avis. Les avis viennent uniquement d’élèves ayant suivi une séance.</p>}
          <ul className="reviews">{t.reviews.map((r, i) => <li key={i}><Stars value={r.rating} /><p>{r.text}</p><span className="muted">{r.author}, {r.date}</span></li>)}</ul></section>
      </div>
      <aside className="agenda">
        <div className="agenda-price"><strong className="price">{money(rate(t, market.cur), market.cur)}</strong><span className="muted"> la séance de 30 min</span></div>
        <Stars value={t.rating} count={t.reviews.length} />
        <p className="agenda-trial">Séance d’essai à {money(rate(t, market.cur) * 0.5, market.cur)}, pour vérifier que le courant passe.</p>
        <h3>Choisissez un créneau</h3>
        <p className="tz">Horaires à l’{market.tzLabel}. Le cours a lieu à {fmtTime(slots[0] ?? now, t.tz)} à {t.city}.</p>
        <div className="week-nav"><button className="btn btn-ghost sm" disabled={week === 0} onClick={() => setWeek(week - 1)}>Semaine précédente</button><button className="btn btn-ghost sm" disabled={week >= 1} onClick={() => setWeek(week + 1)}>Semaine suivante</button></div>
        <div className="slots">
          {[...days.entries()].map(([d, list]) => (
            <div key={d}><div className="slot-day">{d}</div><div className="slot-row">{list.map((a) => <button key={a} className="slot" onClick={() => nav('book', { id: t.id, at: a })}>{fmtTime(a, market.tz)}</button>)}</div></div>
          ))}
          {slots.length === 0 && <p className="muted">Aucun créneau libre cette semaine.</p>}
        </div>
        <button className="btn btn-ghost full" onClick={() => {
          if (s.role !== 'parent' && s.role !== 'student') act((d) => { d.role = 'parent' })
          say('Conversation ouverte.')
          nav('messages', { teacher: t.id })
        }}>Écrire à {t.name.split(' ')[0]}</button>
      </aside>
      {badge && <Modal title={badge === 'confirmed' ? 'Ce que signifie ce badge' : `Ce qui a été vérifié : ${BADGES[badge].label.toLowerCase()}`} onClose={() => setBadge(null)}>
        <p>{BADGES[badge].detail}</p>
        {badge === 'ijaza' && ijaza && <ol className="sanad">{ijaza.sanad!.map((n) => <li key={n}>{n}</li>)}</ol>}
        {badge === 'confirmed' && <p className="muted">{t.name} a dispensé {Math.round(t.hours)} heures, note de {t.rating.toFixed(1).replace('.', ',')}.</p>}
        {badge !== 'confirmed' && <p className="muted">Contrôlé par un modérateur DINI. Dossier fictif, prototype de démonstration.</p>}
      </Modal>}
    </div>
  )
}

export function Book() {
  const { s, route, act, nav, market, say } = useApp()
  const t = s.teachers.find((x) => x.id === route.a?.id)!
  const at: number = route.a?.at
  const owner = s.role === 'student' ? 'student' : 'parent'
  const learners = learnersOf(s, owner)
  const [step, setStep] = useState(s.role === 'visitor' ? -1 : 0)
  const [lid, setLid] = useState(learners[0]?.id)
  const [newChild, setNewChild] = useState('')
  const sub = s.subs.find((x) => x.learnerId === lid && x.teacherId === t.id && x.remaining > 0)
  const [choice, setChoice] = useState(sub ? 'credit' : 'trial')
  const cur = market.cur
  const r = rate(t, cur)
  const fcfa = cur === 'FCFA'
  const [method, setMethod] = useState(fcfa ? 'wave' : 'card')
  const [paying, setPaying] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const plan = PLANS.find((p) => p.id === choice)
  const total = choice === 'trial' ? r * 0.5 : choice === 'credit' ? 0 : plan!.n * r
  const learner = learners.find((l) => l.id === lid)

  const confirm = () => {
    if (!isFree(s, t.id, at)) {
      say('Ce créneau vient d’être pris. Choisissez-en un autre.')
      nav('teacher', { id: t.id })
      return
    }
    setPaying(true)
    setTimeout(() => {
      act((d) => { createBooking(d, { teacherId: t.id, learnerId: lid, at, choice, cur }) })
      setPaying(false)
      setDone('ok')
    }, total ? 1400 : 300)
  }

  if (done) {
    return (
      <div className="wrap narrow confirm">
        <h1 className="h-page">Séance réservée</h1>
        <p className="lede">{learner?.name} a rendez-vous avec {t.name} {fmtDay(at, market.tz)} à {fmtTime(at, market.tz)} ({market.tzLabel}).</p>
        <ul className="ticks">
          <li>Le lien du cours apparaît dans votre tableau de bord.</li>
          <li>Rappels par SMS et e-mail 24 h et 1 h avant la séance.</li>
          {total > 0 && <li>Vos {money(total, cur)} restent bloqués chez DINI. L’enseignant n’est payé que 48 h après chaque séance, si vous ne la contestez pas.</li>}
        </ul>
        <div className="row"><button className="btn btn-primary" onClick={() => nav('dash')}>Voir mon tableau de bord</button><button className="btn btn-ghost" onClick={() => nav('search')}>Retour à la recherche</button></div>
      </div>
    )
  }

  return (
    <div className="wrap book">
      <div className="book-main">
        <button className="back" onClick={() => nav('teacher', { id: t.id })}>Retour au profil</button>
        <h1 className="h-page">Réserver avec {t.name}</h1>

        {step === -1 && <section className="panel">
          <h2>Connectez-vous pour continuer</h2>
          <p className="muted">Dans le produit : e-mail, téléphone ou Google, puis code SMS. Ici, choisissez un compte de démonstration.</p>
          <div className="row">
            <button className="btn btn-primary" onClick={() => { act((d) => { d.role = 'parent' }); setLid('awa'); setStep(0) }}>Continuer comme Fatou Diop (parent)</button>
            <button className="btn btn-ghost" onClick={() => { act((d) => { d.role = 'student' }); setLid('mareme'); setStep(0) }}>Continuer comme Marème Sarr (élève adulte)</button>
          </div>
        </section>}

        {step === 0 && <section className="panel">
          <h2>Pour qui est ce cours&nbsp;?</h2>
          <div className="pick-list">
            {learners.map((l) => <button key={l.id} type="button" className={`pick ${lid === l.id ? 'pick-on' : ''}`} onClick={() => { setLid(l.id); const hasSub = s.subs.some((x) => x.learnerId === l.id && x.teacherId === t.id && x.remaining > 0); setChoice(hasSub ? 'credit' : 'trial') }}><strong>{l.name}</strong><span className="muted">{l.age} ans, {l.level}</span></button>)}
          </div>
          {owner === 'parent' && <div className="add-child">
            <label htmlFor="child">Ajouter un enfant</label>
            <div className="row nowrap"><input id="child" placeholder="Prénom et nom" value={newChild} onChange={(e) => setNewChild(e.target.value)} />
              <button type="button" className="btn btn-ghost" disabled={!newChild.trim()} onClick={() => { const id = `kid${Date.now()}`; act((d) => { d.extraLearners.push({ id, name: newChild.trim(), age: 8, owner: 'parent', level: 'débutant', goals: 'À définir avec l’enseignant' } as any) }); setLid(id); setChoice('trial'); setNewChild('') }}>Ajouter</button></div>
          </div>}
          <button className="btn btn-primary" disabled={!lid} onClick={() => setStep(1)}>Continuer</button>
        </section>}

        {step === 1 && <section className="panel">
          <h2>Quelle formule&nbsp;?</h2>
          <div className="plans">
            {sub && <button type="button" className={`plan ${choice === 'credit' ? 'pick-on' : ''}`} onClick={() => setChoice('credit')}><strong>Utiliser mon forfait</strong><span className="muted">{sub.remaining} {sub.remaining > 1 ? 'séances restantes' : 'séance restante'} ce mois-ci</span><span className="plan-price">Inclus</span></button>}
            <button type="button" className={`plan ${choice === 'trial' ? 'pick-on' : ''}`} onClick={() => setChoice('trial')}><strong>Séance d’essai</strong><span className="muted">30 minutes pour tester le niveau et l’entente. L’enseignant est rémunéré.</span><span className="plan-price">{money(r * 0.5, cur)}</span></button>
            {PLANS.map((p) => <button key={p.id} type="button" className={`plan ${choice === p.id ? 'pick-on' : ''}`} onClick={() => setChoice(p.id)}><strong>{p.name}, {p.n} séances par mois</strong><span className="muted">{p.use}. Reconduit chaque mois, annulable à tout moment.</span><span className="plan-price">{money(p.n * r, cur)}<small> /mois</small></span></button>)}
          </div>
          <p className="muted small">Grille indicative : les montants seront arrêtés après l’étude tarifaire.</p>
          <div className="row"><button className="btn btn-ghost" onClick={() => setStep(0)}>Retour</button><button className="btn btn-primary" onClick={() => setStep(total ? 2 : 3)}>Continuer</button></div>
        </section>}

        {step === 2 && <section className="panel">
          <h2>Comment souhaitez-vous payer&nbsp;?</h2>
          <div className="pay-list">
            {(fcfa ? ['wave', 'orange', 'card'] : ['card', 'wave', 'orange']).map((m) => (
              <button key={m} type="button" className={`pick ${method === m ? 'pick-on' : ''}`} onClick={() => setMethod(m)}>
                <strong>{m === 'card' ? 'Carte bancaire' : m === 'wave' ? 'Wave' : 'Orange Money'}</strong>
                <span className="muted">{m === 'card' ? 'Visa, Mastercard' : 'Validation sur votre téléphone'}</span>
              </button>
            ))}
          </div>
          <p className="demo-note">Paiement simulé : aucune donnée n’est demandée et aucun argent ne circule.</p>
          <div className="row"><button className="btn btn-ghost" onClick={() => setStep(1)}>Retour</button><button className="btn btn-primary" onClick={() => setStep(3)}>Continuer</button></div>
        </section>}

        {step === 3 && <section className="panel">
          <h2>Vérifiez avant de confirmer</h2>
          <p>{total ? `Le montant reste bloqué chez DINI. Vous avez 48 h après chaque séance pour signaler un problème.` : 'Une séance de votre forfait sera utilisée.'}</p>
          <p className="muted small">Annulation gratuite jusqu’à 24 h avant la séance. Ensuite, la séance est due à l’enseignant.</p>
          <div className="row"><button className="btn btn-ghost" disabled={paying} onClick={() => setStep(total ? 2 : 1)}>Retour</button>
            <button className="btn btn-primary" disabled={paying} onClick={confirm}>{paying ? (method === 'card' ? 'Paiement en cours…' : 'En attente de validation sur le téléphone…') : total ? `Payer ${money(total, cur)}` : 'Confirmer la séance'}</button></div>
        </section>}
      </div>
      <aside className="recap">
        <div className="recap-t"><Avatar name={t.name} size={48} /><strong>{t.name}</strong></div>
        <dl className="recap-l">
          <div><dt>Date</dt><dd>{fmtDay(at, market.tz)}</dd></div>
          <div><dt>Heure</dt><dd>{fmtTime(at, market.tz)}, {market.tzLabel}</dd></div>
          <div><dt>Durée</dt><dd>30 minutes</dd></div>
          {learner && step >= 0 && <div><dt>Élève</dt><dd>{learner.name}</dd></div>}
          {step >= 1 && <div><dt>Formule</dt><dd>{choice === 'trial' ? 'Séance d’essai' : choice === 'credit' ? 'Forfait en cours' : plan?.name}</dd></div>}
          {step >= 1 && <div className="recap-total"><dt>À payer</dt><dd>{total ? money(total, cur) : 'Inclus'}</dd></div>}
        </dl>
      </aside>
    </div>
  )
}
