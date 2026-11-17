import type { Metadata } from 'next'
import Link from 'next/link'
import { COMMISSION_TIERS } from '@dini/core'
import { buttonCls, cx } from '@/components/styles'

export const metadata: Metadata = {
  title: 'Devenir enseignant',
  description: 'Enseignez le Coran, le tajwid, l’arabe ou le fiqh en ligne. Créez votre profil, faites-le valider, commencez à enseigner.',
}

const STEPS = [
  { title: 'Inscrivez-vous', text: 'et remplissez votre profil : présentation, matières, langues, tarif, disponibilités.' },
  { title: 'Faites valider votre profil', text: 'lors d’un entretien avec notre équipe, qui vérifie votre identité.' },
  { title: 'Commencez à enseigner', text: 'aux familles du Sénégal, de Gambie et de la diaspora.' },
]

const pct = (r: number) => `${Math.round(r * 100)} %`

export default function Page() {
  return (
    <>
      <section className="mx-auto flex max-w-6xl flex-col gap-12 px-5 py-16">
        <h1 className="max-w-[18ch] font-display text-5xl leading-[1.1] md:text-6xl">Enseignez aux familles qui vous cherchent</h1>
        <ol className="grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className={cx('grid size-14 shrink-0 place-items-center font-display text-2xl', i === 0 ? 'bg-green text-white' : 'bg-leaf text-green')}>{i + 1}</span>
                {i < STEPS.length - 1 && <span aria-hidden className="hidden h-px flex-1 bg-line md:block" />}
              </div>
              <h2 className="font-display text-2xl">{s.title}</h2>
              <p className="text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <Link href="/inscription/enseignant" className={cx(buttonCls.primary, 'min-h-14 self-start px-8 text-lg')}>Créer mon profil enseignant</Link>
      </section>

      <section className="border-t border-line bg-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-3">
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-3xl">Fixez vos tarifs</h2>
            <p>Un tarif local en francs CFA et, si vous le souhaitez, un tarif international en euros pour les familles à l’étranger. Vous les modifiez quand vous voulez.</p>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-3xl">Enseignez quand vous voulez</h2>
            <p>Vous publiez vos disponibilités, dans votre fuseau horaire. Les familles réservent sur ces créneaux uniquement.</p>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-3xl">Gagnez plus en enseignant plus</h2>
            <p>La commission de DINE baisse avec vos heures : {COMMISSION_TIERS.map((t) => pct(t.rate)).join(', ')}. Vous êtes payé 48 h après chaque séance sans litige.</p>
          </div>
        </div>
      </section>
    </>
  )
}
