'use client'

import { getImageProps, type StaticImageData } from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cx } from './styles'
import { useLocale, useT } from '@/i18n/locale'
import web1 from '@/assets/bannieres/1-web.jpg'
import mobile1 from '@/assets/bannieres/1-mobile.jpg'
import web2 from '@/assets/bannieres/2-web.jpg'
import mobile2 from '@/assets/bannieres/2-mobile.jpg'
import web3 from '@/assets/bannieres/3-web.jpg'
import mobile3 from '@/assets/bannieres/3-mobile.jpg'

// Bannières de l'accueil : une image par format (large à partir de 768 px, plus haute sur mobile),
// le texte reste du HTML (traduit, lisible par les moteurs de recherche, net à toutes les tailles).
// Défilement automatique toutes les 7 s, arrêté dès qu'on s'en sert et si l'appareil demande moins d'animations.

const SLIDES: { web: StaticImageData; mobile: StaticImageData; href: string }[] = [
  { web: web1, mobile: mobile1, href: '/enseignants' },
  { web: web2, mobile: mobile2, href: '/enseignants?enseignant=F' },
  { web: web3, mobile: mobile3, href: '/enseignants' },
]
const DELAY = 7000

/** Image « art direction » : la version large au-dessus de 768 px, la version mobile en dessous. */
function Art({ web, mobile, alt, first }: { web: StaticImageData; mobile: StaticImageData; alt: string; first: boolean }) {
  const common = { alt, sizes: '100vw', quality: 75, loading: first ? 'eager' : 'lazy', fetchPriority: first ? 'high' : 'auto' } as const
  const { props: { srcSet: wide } } = getImageProps({ ...common, src: web })
  const { props: { srcSet: narrow, ...img } } = getImageProps({ ...common, src: mobile })
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={wide} />
      <img {...img} srcSet={narrow} alt={alt} className="absolute inset-0 size-full object-cover object-[50%_85%] md:object-right" />
    </picture>
  )
}

export function HeroBanners() {
  const t = useT().home
  const dir = useLocale() === 'ar' ? 'rtl' : 'ltr'
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(true)
  const n = SLIDES.length

  const goTo = useCallback((i: number) => {
    const el = track.current
    if (el) el.scrollTo({ left: ((i + n) % n) * el.clientWidth, behavior: 'smooth' })
  }, [n])

  // Pas de défilement automatique si l'appareil demande moins d'animations.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false)
  }, [])

  useEffect(() => {
    if (!playing) return
    const id = setTimeout(() => goTo(active + 1), DELAY)
    return () => clearTimeout(id)
  }, [playing, active, goTo])

  const onScroll = () => {
    const el = track.current
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth))
  }
  // Dès qu'on touche, fait défiler ou navigue au clavier, on arrête le défilement automatique.
  const stop = () => setPlaying(false)

  return (
    <section aria-roledescription="carousel" aria-label={t.bannersLabel} className="relative bg-paper" onPointerDown={stop} onFocusCapture={stop}>
      {/* Le rail reste en sens gauche-droite pour un défilement identique dans toutes les langues. */}
      <div ref={track} dir="ltr" onScroll={onScroll} aria-live={playing ? 'off' : 'polite'}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SLIDES.map((s, i) => {
          const b = t.banners[i]
          const Title = i === 0 ? 'h1' : 'h2'
          return (
            <div key={i} role="group" aria-roledescription="slide" aria-label={t.bannerGo(i + 1, n)} inert={i !== active}
              className="relative flex w-full shrink-0 snap-start flex-col md:block md:h-[min(72vh,640px)] md:min-h-[500px]">
              <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/10] md:absolute md:inset-0 md:aspect-auto">
                <Art web={s.web} mobile={s.mobile} alt={b.alt} first={i === 0} />
                {/* Voile clair à gauche, sur grand écran, pour que le texte reste lisible quelle que soit l'image. */}
                <div aria-hidden className="absolute inset-0 hidden bg-linear-to-r from-paper/95 from-25% via-paper/75 via-45% to-transparent to-75% md:block" />
              </div>
              <div dir={dir}
                className="bg-brand flex min-h-[290px] flex-1 flex-col justify-center gap-4 px-5 pb-16 pt-7 text-white md:absolute md:inset-y-0 md:left-0 md:min-h-0 md:w-[min(700px,55%)] md:bg-none md:py-0 md:pe-6 md:ps-[max(1.25rem,calc((100vw-72rem)/2+1.25rem))] md:text-ink">
                <Title className="font-display text-[28px] leading-[1.1] text-balance md:text-5xl">{b.title}</Title>
                <p className="max-w-[46ch] text-white/85 md:text-lg md:text-muted">{b.text}</p>
                <Link href={s.href}
                  className="inline-flex min-h-[52px] items-center justify-center self-start rounded-[14px] bg-white px-6 font-semibold text-green2 transition active:scale-[0.98] hover:bg-soft md:bg-green md:text-white md:hover:bg-green2">
                  {b.cta}
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Commandes : points, flèches (grand écran) et pause. Toujours à gauche, comme le texte. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-5" dir="ltr">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-5">
          <div className="pointer-events-auto flex items-center gap-1">
            {SLIDES.map((_, i) => (
              <button key={i} type="button" onClick={() => { stop(); goTo(i) }} aria-label={t.bannerGo(i + 1, n)} aria-current={i === active ? 'true' : undefined}
                className="grid size-8 cursor-pointer place-items-center">
                <span className={cx('h-2 rounded-full transition-all', i === active ? 'w-6 bg-white md:bg-green' : 'w-2 bg-white/50 md:bg-ink/25')} />
              </button>
            ))}
          </div>
          <div className="pointer-events-auto ms-auto flex items-center gap-2 md:ms-3">
            <button type="button" onClick={() => setPlaying(!playing)} aria-label={playing ? t.bannerPause : t.bannerPlay}
              className="grid size-9 cursor-pointer place-items-center rounded-full bg-white/20 text-white md:bg-white md:text-ink md:shadow">
              {playing
                ? <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor" /></svg>
                : <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 0l9 6-9 6z" fill="currentColor" /></svg>}
            </button>
            {[[-1, t.bannerPrev, 'M15 18l-6-6 6-6'], [1, t.bannerNext, 'M9 18l6-6-6-6']].map(([step, label, d]) => (
              <button key={label as string} type="button" onClick={() => { stop(); goTo(active + (step as number)) }} aria-label={label as string}
                className="hidden size-9 cursor-pointer place-items-center rounded-full bg-white text-ink shadow md:grid">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d={d as string} /></svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
