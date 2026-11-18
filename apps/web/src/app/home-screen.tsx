'use client'

import { LANGUAGES, SUBJECTS } from '@dini/core'
import Link from 'next/link'
import { buttonCls } from '@/components/styles'
import { useFormat, useT } from '@/i18n/locale'

// Accueil : même déroulé que la maquette Claude Design (bannière, chiffres, matières,
// suivi, trois étapes, garantie, recrutement, institutions).
export function HomeScreen() {
  const t = useT().home
  const f = useFormat()
  return (
    <>
      <section className="bg-green text-[#f4f0e2]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-12 px-5 py-16 md:py-20">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-7">
            <h1 className="font-display text-4xl leading-[1.06] text-balance md:text-6xl">{t.hero}</h1>
            <p className="max-w-[46ch] text-lg text-[#d6dde5]">{t.heroText}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/enseignants" className={buttonCls.sand}>{t.find}</Link>
              <Link href="#comment" className="inline-flex min-h-12 items-center rounded-sm border border-[#5e8277] px-5 font-semibold">{t.how}</Link>
            </div>
            <p className="text-sm text-[#bcc8bd]">{t.languages(f.list(LANGUAGES.map((l) => f.locale === 'fr' ? f.label(l.label).toLowerCase() : f.label(l.label))))}</p>
          </div>
          <div role="img" aria-label={t.previewLabel} className="relative h-[360px] min-w-0 flex-[1_1_380px]">
            <div className="absolute inset-[0_60px_40px_0] grid place-items-center border border-sand bg-green2">
              <span className="flex flex-col items-center gap-2 text-sm text-sand"><span className="grid size-28 place-items-center bg-leaf font-display text-4xl text-green">AN</span>{t.teacherPhoto}</span>
            </div>
            <div className="absolute start-6 top-6 grid h-36 w-28 place-items-center border border-sand bg-[#24493f] p-2 text-center text-xs text-sand">{t.studentPhoto}</div>
            <div className="absolute bottom-0 start-10 end-24 flex flex-col gap-1 bg-paper px-4 py-3 text-ink">
              <span className="text-xs text-muted">{t.reportPreview}</span>
              <span className="flex items-baseline justify-between gap-3"><strong>{t.reportVerses}</strong><span lang="ar" dir="rtl" className="font-arabic text-xl text-green">المسد</span></span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <dl className="mx-auto grid max-w-6xl grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 px-5 py-7">
          {t.stats.map(([a, b]) => (
            <div key={a} className="flex flex-col"><dt className="order-2 text-muted">{b}</dt><dd className="font-display text-3xl text-green">{a}</dd></div>
          ))}
        </dl>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-14">
        <h2 className="font-display text-3xl">{t.startWith}</h2>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] border-s border-t border-line">
          {SUBJECTS.map((s) => (
            <li key={s.id}>
              <Link href={`/enseignants?matiere=${s.id}`} className="flex h-full flex-col gap-1 border-b border-e border-line p-5 hover:bg-leaf">
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
                <span className="grid size-10 place-items-center rounded-full border border-ochre font-bold text-ochre">{i + 1}</span>
                <h3 className="font-display text-2xl">{title}</h3>
                <p className="text-[#3b4842]">{d}</p>
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

      <section id="enseigner" className="bg-green text-[#f4f0e2]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-12 px-5 py-16">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4">
            <h2 className="font-display text-4xl">{t.teachTitle}</h2>
            <p className="max-w-[50ch] text-lg text-[#d6dde5]">{t.teachText}</p>
            <Link href="/devenir-enseignant" className={`${buttonCls.sand} self-start`}>{t.createProfile}</Link>
          </div>
          <ul className="flex min-w-0 flex-[1_1_360px] flex-col gap-4 border-s border-ochre ps-5">
            {t.perks.map(([title, d]) => <li key={title}><strong>{title}</strong><br /><span className="text-[#d6dde5]">{d}</span></li>)}
          </ul>
        </div>
      </section>
    </>
  )
}
