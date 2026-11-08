import { LANGUAGES, SUBJECTS } from '@dini/core'
import Link from 'next/link'
import { buttonCls } from '@/components/styles'

// Accueil : même déroulé que la maquette Claude Design (bannière, chiffres, matières,
// suivi, trois étapes, garantie, recrutement, institutions).
export default function Home() {
  return (
    <>
      <section className="bg-green text-[#f4f0e2]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-12 px-5 py-16 md:py-20">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-7">
            <h1 className="font-display text-4xl leading-[1.06] text-balance md:text-6xl">Apprenez le Coran avec un enseignant que vous avez choisi.</h1>
            <p className="max-w-[46ch] text-lg text-[#d6dde5]">Coran, tajwid, arabe, fiqh. Des enseignants vérifiés un par un, leurs diplômes et leur sanad visibles avant de réserver.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/enseignants" className={buttonCls.sand}>Trouver un enseignant</Link>
              <Link href="#comment" className="inline-flex min-h-12 items-center rounded-sm border border-[#5e8277] px-5 font-semibold">Comment ça marche</Link>
            </div>
            <p className="text-sm text-[#bcc8bd]">Cours en {LANGUAGES.map((l) => l.label.fr.toLowerCase()).join(', ')}.</p>
          </div>
          <div role="img" aria-label="Aperçu d’un cours en visio" className="relative h-[360px] min-w-0 flex-[1_1_380px]">
            <div className="absolute inset-[0_60px_40px_0] grid place-items-center border border-sand bg-green2">
              <span className="flex flex-col items-center gap-2 text-sm text-sand"><span className="grid size-28 place-items-center bg-leaf font-display text-4xl text-green">AN</span>[Photo réelle d’enseignante]</span>
            </div>
            <div className="absolute left-6 top-6 grid h-36 w-28 place-items-center border border-sand bg-[#24493f] p-2 text-center text-xs text-sand">[Photo élève]</div>
            <div className="absolute bottom-0 left-10 right-24 flex flex-col gap-1 bg-paper px-4 py-3 text-ink">
              <span className="text-xs text-muted">Compte rendu de la séance</span>
              <span className="flex items-baseline justify-between gap-3"><strong>Al-Masad, versets 1 à 3</strong><span lang="ar" dir="rtl" className="font-arabic text-xl text-green">المسد</span></span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <dl className="mx-auto grid max-w-6xl grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 px-5 py-7">
          {[['5 pays', 'Sénégal, Gambie, France, États-Unis, Canada'], ['7 langues', 'pour apprendre dans la sienne'], ['6 étapes', 'de vérification avant le badge'], ['48 h', 'pour signaler une séance avant paiement']].map(([a, b]) => (
            <div key={a} className="flex flex-col"><dt className="order-2 text-muted">{b}</dt><dd className="font-display text-3xl text-green">{a}</dd></div>
          ))}
        </dl>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-14">
        <h2 className="font-display text-3xl">Par quoi voulez-vous commencer&nbsp;?</h2>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] border-l border-t border-line">
          {SUBJECTS.map((s) => (
            <li key={s.id}>
              <Link href={`/enseignants?matiere=${s.id}`} className="flex h-full flex-col gap-1 border-b border-r border-line p-5 hover:bg-leaf">
                <span lang="ar" dir="rtl" className="font-arabic text-3xl leading-snug text-green">{s.ar}</span>
                <strong>{s.label.fr}</strong>
                <span className="text-sm text-muted">{s.desc.fr}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="comment" className="bg-leaf">
        <div className="mx-auto flex max-w-6xl flex-col gap-9 px-5 py-16">
          <h2 className="font-display text-3xl">Comment fonctionne DINE&nbsp;?</h2>
          <ol className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-8">
            {[
              ['Choisissez votre enseignant.', 'Comparez les profils, écoutez un extrait de récitation, vérifiez les diplômes et le sanad.'],
              ['Commencez par une séance d’essai.', '30 minutes à demi-tarif pour vérifier le niveau et l’entente. L’enseignant est rémunéré, vous ne vous engagez à rien.'],
              ['Progressez chaque semaine.', 'Un forfait de 4 à 20 séances par mois, et un compte rendu après chaque cours.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex flex-col gap-3">
                <span className="grid size-10 place-items-center rounded-full border border-ochre font-bold text-ochre">{i + 1}</span>
                <h3 className="font-display text-2xl">{t}</h3>
                <p className="text-[#3b4842]">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-8 px-5 py-16">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-3">
          <h2 className="font-display text-3xl">Vous ne payez que les séances qui ont eu lieu.</h2>
          <p className="max-w-[56ch] text-lg">Votre argent reste bloqué chez DINE. L’enseignant n’est payé que 48 h après la séance, si vous n’avez rien signalé. Carte, Wave, Orange Money ou Afrimoney selon votre pays.</p>
        </div>
        <Link href="/enseignants" className={buttonCls.primary}>Réserver une séance d’essai</Link>
      </section>

      <section id="enseigner" className="bg-green text-[#f4f0e2]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-12 px-5 py-16">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4">
            <h2 className="font-display text-4xl">Devenez enseignant sur DINE</h2>
            <p className="max-w-[50ch] text-lg text-[#d6dde5]">Diplômé d’institut, porteur d’une ijaza, imam ou maître de daara : rendez-vous visible auprès des familles qui vous cherchent.</p>
            <Link href="/devenir-enseignant" className={`${buttonCls.sand} self-start`}>Créer mon profil enseignant</Link>
          </div>
          <ul className="flex min-w-0 flex-[1_1_360px] flex-col gap-4 border-l border-ochre pl-5">
            <li><strong>Fixez vos tarifs.</strong><br /><span className="text-[#d6dde5]">Un tarif local en FCFA, un tarif international en euros.</span></li>
            <li><strong>Votre commission baisse.</strong><br /><span className="text-[#d6dde5]">De 30 % à 15 % à mesure que vous enseignez.</span></li>
            <li><strong>Paiement garanti.</strong><br /><span className="text-[#d6dde5]">Agenda, encaissement et reversement.</span></li>
          </ul>
        </div>
      </section>
    </>
  )
}
