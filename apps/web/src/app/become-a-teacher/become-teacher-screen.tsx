'use client'

import Link from 'next/link'
import { COMMISSION_RATE } from '@dini/core'
import { buttonCls, cx } from '@/components/styles'
import { useLocale, useT } from '@/i18n/locale'

export function BecomeTeacherScreen() {
  const t = useT().becomeTeacher
  const space = useLocale() === 'fr' ? ' ' : ''
  const pct = (r: number) => `${Math.round(r * 100)}${space}%`
  return (
    <>
      <section className="mx-auto flex max-w-6xl flex-col gap-12 px-5 py-16">
        <h1 className="max-w-[18ch] font-display text-5xl leading-[1.1] md:text-6xl">{t.title}</h1>
        <ol className="grid gap-8 md:grid-cols-3">
          {t.steps.map(([title, text], i) => (
            <li key={title} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className={cx('grid size-14 shrink-0 place-items-center font-display text-2xl', i === 0 ? 'bg-green text-white' : 'bg-leaf text-green')}>{i + 1}</span>
                {i < t.steps.length - 1 && <span aria-hidden className="hidden h-px flex-1 bg-line md:block" />}
              </div>
              <h2 className="font-display text-2xl">{title}</h2>
              <p className="text-muted">{text}</p>
            </li>
          ))}
        </ol>
        <Link href="/signup/teacher" className={cx(buttonCls.primary, 'min-h-14 self-start px-8 text-lg')}>{t.cta}</Link>
      </section>

      <section className="border-t border-line bg-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-3">
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-3xl">{t.ratesTitle}</h2>
            <p>{t.ratesText}</p>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-3xl">{t.whenTitle}</h2>
            <p>{t.whenText}</p>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-3xl">{t.earnTitle}</h2>
            <p>{t.earnText(pct(COMMISSION_RATE))}</p>
          </div>
        </div>
      </section>
    </>
  )
}
