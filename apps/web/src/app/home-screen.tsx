'use client'

import { SUBJECTS } from '@dini/core'
import Link from 'next/link'
import { HeroBanners } from '@/components/hero-banners'
import { buttonCls } from '@/components/styles'
import { useFormat, useT } from '@/i18n/locale'

// Accueil : même déroulé que la maquette Claude Design (bannière, chiffres, matières,
// suivi, trois étapes, garantie, recrutement, institutions).
export function HomeScreen() {
  const t = useT().home
  const f = useFormat()
  return (
    <>
      <HeroBanners />

      <section className="border-b border-line bg-white">
        <dl className="mx-auto grid max-w-6xl grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 px-5 py-7">
          {t.stats.map(([a, b]) => (
            <div key={a} className="flex flex-col"><dt className="order-2 text-muted">{b}</dt><dd className="font-display text-3xl text-green">{a}</dd></div>
          ))}
        </dl>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-14">
        <h2 className="font-display text-3xl">{t.startWith}</h2>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {SUBJECTS.map((s) => (
            <li key={s.id}>
              <Link href={`/enseignants?matiere=${s.id}`} className="flex h-full flex-col gap-1 rounded-md border-[1.5px] border-line bg-white p-5 transition hover:-translate-y-0.5 hover:border-green hover:shadow-[0_0_0_3px_var(--color-soft)]">
                <span lang="ar" dir="rtl" className="font-arabic text-3xl leading-snug text-green">{s.ar}</span>
                <strong>{f.label(s.label)}</strong>
                <span className="text-sm text-muted">{f.label(s.desc)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="comment" className="bg-leaf">
        <div className="mx-auto flex max-w-6xl flex-col gap-9 px-5 py-16">
          <h2 className="font-display text-3xl">{t.howTitle}</h2>
          <ol className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-8">
            {t.steps.map(([title, d], i) => (
              <li key={title} className="flex flex-col gap-3">
                <span className="grid size-11 place-items-center rounded-sm bg-soft text-lg font-extrabold text-green">{i + 1}</span>
                <h3 className="font-display text-2xl">{title}</h3>
                <p className="text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-8 px-5 py-16">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-3">
          <h2 className="font-display text-3xl">{t.payTitle}</h2>
          <p className="max-w-[56ch] text-lg">{t.payText}</p>
        </div>
        <Link href="/enseignants" className={buttonCls.primary}>{t.bookTrial}</Link>
      </section>

      <section id="enseigner" className="bg-brand text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-12 px-5 py-16">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4">
            <h2 className="font-display text-4xl">{t.teachTitle}</h2>
            <p className="max-w-[50ch] text-lg text-white/85">{t.teachText}</p>
            <Link href="/devenir-enseignant" className={`${buttonCls.sand} self-start`}>{t.createProfile}</Link>
          </div>
          <ul className="flex min-w-0 flex-[1_1_360px] flex-col gap-3">
            {t.perks.map(([title, d]) => <li key={title} className="rounded-md border border-white/25 bg-white/10 px-4 py-3"><strong>{title}</strong><br /><span className="text-white/80">{d}</span></li>)}
          </ul>
        </div>
      </section>
    </>
  )
}
