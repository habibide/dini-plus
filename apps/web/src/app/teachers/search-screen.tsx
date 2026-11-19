'use client'

import { AGE_GROUPS, ARABIC_TRACKS, LANGUAGES, LEVELS, MADHAHIB, RIWAYAT, SUBJECTS, country, isConfirmed, roundMoney, subject, toEur, type CurrencyCode, type LanguageId, type SubjectId } from '@dini/core'
import type { TeacherCard, TeacherCategory, TeacherFilters, TeacherSort } from '@dini/data'
import { usePlace, useTeachers } from '@dini/data/react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useFormat, useT } from '@/i18n/locale'
import { IntroVideoButton, LINE_ICONS, LineIcon, MessageButton, Modal, Money, Monogram, VerifiedShield, buttonCls, cx, useCountryOf } from '@/components/ui'

/** La riwaya ne concerne que la récitation : Coran, tajwid, ou toutes matières confondues. */
const showsRiwaya = (s?: SubjectId) => !s || s === 'quran' || s === 'tajwid'

/** En changeant de matière, on retire les filtres qui ne la concernent plus. */
function forSubject(f: TeacherFilters): TeacherFilters {
  return {
    ...f,
    riwaya: showsRiwaya(f.subject) ? f.riwaya : undefined,
    arabicTrack: f.subject === 'arabic' ? f.arabicTrack : undefined,
    madhhab: f.subject === 'fiqh' ? f.madhhab : undefined,
  }
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cx('min-h-9 cursor-pointer rounded-full border-[1.5px] px-3.5 text-sm font-semibold transition', on ? 'border-green bg-green text-white' : 'border-line bg-white text-ink hover:border-green')}>{children}</button>
  )
}

/** Tranches de prix, calées sur des seuils en euros et converties dans la devise affichée. */
function priceSteps(cur: CurrencyCode): number[] {
  return [5, 10, 15, 20].map((eur) => roundMoney(eur / toEur(1, cur), cur))
}

/** Ferme un panneau au clic à l'extérieur et avec Échap. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const click = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close() }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', click)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', click); document.removeEventListener('keydown', key) }
  }, [open, close])
  return ref
}

const CHEVRON = 'M6 9l6 6 6-6'

/** Champ de filtre façon Preply : petit libellé, valeur choisie, panneau déroulant. */
function FilterField({ label, value, placeholder, active, wide, children }: { label?: string; value?: string; placeholder: string; active?: boolean; wide?: boolean; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss(open, close)
  return (
    <div ref={ref} className="relative min-w-0">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className={cx('flex w-full cursor-pointer items-center justify-between gap-1.5 rounded-sm border-[1.5px] bg-white px-3.5 text-start text-[15px] transition', label ? 'min-h-[68px]' : 'min-h-14',
          open ? 'border-green shadow-[0_0_0_3px_var(--color-soft)]' : active ? 'border-ink' : 'border-line hover:border-[#c9c4b6]')}>
        <span className="flex min-w-0 flex-col">
          {label && <span className="text-xs text-muted">{label}</span>}
          <span className={cx('truncate', value ? 'font-semibold text-ink' : label ? 'font-semibold text-ink' : 'text-muted')}>{value || placeholder}</span>
        </span>
        <svg viewBox="0 0 24 24" className={cx('size-5 shrink-0 transition', open && 'rotate-180')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d={CHEVRON} /></svg>
      </button>
      {open && (
        <div className={cx('absolute start-0 z-30 mt-2 max-h-[70vh] overflow-y-auto rounded-md border border-line bg-white p-4 shadow-[0_16px_40px_rgba(0,0,0,0.14)]', wide ? 'w-[min(420px,90vw)]' : 'w-[min(320px,90vw)]')}>
          {children(close)}
        </div>
      )}
    </div>
  )
}

function Option({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={on} onClick={onClick}
      className={cx('flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-sm px-3 text-start hover:bg-leaf', on && 'font-semibold')}>
      <span>{children}</span>
      {on && <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6L9 17l-5-5" /></svg>}
    </button>
  )
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick}
      className={cx('relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition', on ? 'bg-green' : 'bg-[#e1ddd2]')}>
      <span className={cx('absolute top-1 size-5 rounded-full bg-white shadow transition-all', on ? 'start-6' : 'start-1')} />
    </button>
  )
}

const SUN = 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4'
const SUNSET = 'M17 18a5 5 0 00-10 0M12 2v7M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4M23 22H1M8 6l4-4 4 4'
const MOON = 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z'
const HOUR_GROUPS: { key: 'daytime' | 'night' | 'early'; hours: [number, string][] }[] = [
  { key: 'daytime', hours: [[9, SUN], [12, SUN], [15, SUN]] },
  { key: 'night', hours: [[18, SUNSET], [21, MOON], [0, MOON]] },
  { key: 'early', hours: [[3, MOON], [6, SUNSET]] },
]
const WEEK = [1, 2, 3, 4, 5, 6, 0]

export function SearchScreen() {
  const params = useSearchParams()
  const [f, setF] = useState<TeacherFilters>(() => {
    // Anciens noms (matiere, enseignant) encore acceptés pour les liens déjà partagés.
    const g = params.get('teacher') ?? params.get('enseignant')
    return forSubject({ subject: ((params.get('subject') ?? params.get('matiere')) as SubjectId) || undefined, gender: g === 'F' || g === 'M' ? g : undefined })
  })
  const [sheet, setSheet] = useState(false)
  const set = <K extends keyof TeacherFilters>(k: K, v: TeacherFilters[K]) => setF((x) => ({ ...x, [k]: v }))
  const toggle = <K extends keyof TeacherFilters>(k: K, v: TeacherFilters[K]) => setF((x) => ({ ...x, [k]: x[k] === v ? undefined : v }))
  const toggleIn = <K extends 'categories' | 'hours' | 'days'>(k: K, v: NonNullable<TeacherFilters[K]>[number]) =>
    setF((x) => { const cur = (x[k] ?? []) as (typeof v)[]; const next = cur.includes(v) ? cur.filter((y) => y !== v) : [...cur, v]; return { ...x, [k]: next.length ? next : undefined } })
  const teachers = useTeachers(f)
  const { place } = usePlace()
  const t = useT().search
  const fmt = useFormat()
  const cur = country(place.country).currency
  const tzLabel = country(place.country).timezones.find((x) => x.id === place.timezone)?.label ?? ''
  const steps = priceSteps(cur)
  const money = (n: number) => fmt.money(n, cur)

  // Spécialisation selon la matière : riwaya (Coran, tajwid), volet (arabe), madhhab (fiqh).
  const specialty = f.subject === 'arabic'
    ? { label: t.arabicTrack, value: f.arabicTrack && fmt.label(ARABIC_TRACKS.find((a) => a.id === f.arabicTrack)!.label), options: ARABIC_TRACKS.map((a) => [a.id, fmt.label(a.label)]), key: 'arabicTrack' as const }
    : f.subject === 'fiqh'
      ? { label: t.madhhab, value: f.madhhab, options: MADHAHIB.map((m) => [m, m]), key: 'madhhab' as const }
      : showsRiwaya(f.subject)
        ? { label: t.riwaya, value: f.riwaya, options: RIWAYAT.map((r) => [r, r]), key: 'riwaya' as const }
        : null

  const priceValue = f.minPrice || f.maxPrice
    ? (!f.minPrice ? t.under(money(f.maxPrice!)) : !f.maxPrice ? t.over(money(f.minPrice)) : `${money(f.minPrice)} – ${money(f.maxPrice)}`)
    : undefined
  const ranges: [number | undefined, number | undefined][] = [[undefined, steps[0]], ...steps.slice(0, -1).map((a, i) => [a, steps[i + 1]] as [number, number]), [steps[steps.length - 1], undefined]]
  const learnerValue = [f.ageGroup && fmt.label(AGE_GROUPS.find((a) => a.id === f.ageGroup)!.label), f.level && fmt.label(LEVELS.find((l) => l.id === f.level)!.label)].filter(Boolean).join(', ')
  const scheduleCount = (f.hours?.length ?? 0) + (f.days?.length ?? 0)

  // Contenu de chaque panneau, partagé entre la barre (grand écran) et la feuille de filtres (mobile).
  const panels = {
    subject: (close?: () => void) => (
      <div className="flex flex-col">
        <Option on={!f.subject} onClick={() => { setF(forSubject({ ...f, subject: undefined })); close?.() }}>{t.allSubjects}</Option>
        {SUBJECTS.map((s) => <Option key={s.id} on={f.subject === s.id} onClick={() => { setF(forSubject({ ...f, subject: s.id })); close?.() }}>{fmt.label(s.label)}</Option>)}
      </div>
    ),
    specialty: (close?: () => void) => specialty && (
      <div className="flex flex-col">
        <Option on={!specialty.value} onClick={() => { set(specialty.key, undefined); close?.() }}>{t.any}</Option>
        {specialty.options.map(([id, label]) => <Option key={id} on={f[specialty.key] === id} onClick={() => { set(specialty.key, id); close?.() }}>{label}</Option>)}
      </div>
    ),
    price: (close?: () => void) => (
      <div className="flex flex-col">
        <Option on={!f.minPrice && !f.maxPrice} onClick={() => { setF({ ...f, minPrice: undefined, maxPrice: undefined }); close?.() }}>{t.anyPrice}</Option>
        {ranges.map(([lo, hi]) => (
          <Option key={`${lo}-${hi}`} on={f.minPrice === lo && f.maxPrice === hi} onClick={() => { setF({ ...f, minPrice: lo, maxPrice: hi }); close?.() }}>
            {!lo ? t.under(money(hi!)) : !hi ? t.over(money(lo)) : `${money(lo)} – ${money(hi)}`}
          </Option>
        ))}
      </div>
    ),
    language: (close?: () => void) => (
      <div className="flex flex-col">
        <Option on={!f.language} onClick={() => { set('language', undefined); close?.() }}>{t.any}</Option>
        {LANGUAGES.map((l) => <Option key={l.id} on={f.language === l.id} onClick={() => { set('language', l.id as LanguageId); close?.() }}>{fmt.label(l.label)}</Option>)}
      </div>
    ),
    gender: (close?: () => void) => (
      <div className="flex flex-col">
        <Option on={!f.gender} onClick={() => { set('gender', undefined); close?.() }}>{t.any}</Option>
        <Option on={f.gender === 'F'} onClick={() => { set('gender', 'F'); close?.() }}>{t.woman}</Option>
        <Option on={f.gender === 'M'} onClick={() => { set('gender', 'M'); close?.() }}>{t.man}</Option>
      </div>
    ),
    learner: () => (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2"><span className="text-sm font-semibold">{t.age}</span>
          <div className="flex flex-wrap gap-1.5">{AGE_GROUPS.map((a) => <Chip key={a.id} on={f.ageGroup === a.id} onClick={() => toggle('ageGroup', a.id)}>{fmt.label(a.label)}</Chip>)}</div></div>
        <div className="flex flex-col gap-2"><span className="text-sm font-semibold">{t.level}</span>
          <div className="flex flex-wrap gap-1.5">{LEVELS.map((l) => <Chip key={l.id} on={f.level === l.id} onClick={() => toggle('level', l.id)}>{fmt.label(l.label)}</Chip>)}</div></div>
      </div>
    ),
    categories: () => (
      <div className="flex flex-col divide-y divide-line">
        {(['ijaza', 'diploma', 'confirmed'] as TeacherCategory[]).map((c) => (
          <div key={c} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-semibold"><CategoryIcon c={c} />{t.cats[c].title}</span>
              <Switch on={!!f.categories?.includes(c)} onClick={() => toggleIn('categories', c)} label={t.cats[c].title} />
            </div>
            <p className="text-sm text-muted">{t.cats[c].text}</p>
          </div>
        ))}
      </div>
    ),
    schedule: () => (
      <div className="flex flex-col gap-4">
        <p className="text-xs text-muted">{t.available(tzLabel)}</p>
        <span className="font-semibold">{t.hoursTitle}</span>
        {HOUR_GROUPS.map((g) => (
          <div key={g.key} className="flex flex-col gap-2">
            <span className="text-sm text-muted">{t[g.key]}</span>
            <div className="grid grid-cols-3 gap-2">
              {g.hours.map(([h, icon]) => {
                const on = !!f.hours?.includes(h)
                return (
                  <button key={h} type="button" aria-pressed={on} onClick={() => toggleIn('hours', h)}
                    className={cx('flex cursor-pointer flex-col items-center gap-1 rounded-sm border-[1.5px] py-2.5 text-sm transition', on ? 'border-green bg-soft font-semibold text-green2' : 'border-line hover:border-[#c9c4b6]')}>
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={icon} /></svg>
                    {h}-{h + 3 === 24 ? 24 : (h + 3) % 24}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <span className="mt-1 font-semibold">{t.daysTitle}</span>
        <div className="flex flex-wrap gap-2">
          {WEEK.map((d) => <Chip key={d} on={!!f.days?.includes(d)} onClick={() => toggleIn('days', d)}>{t.weekdaysShort[d]}</Chip>)}
        </div>
      </div>
    ),
    sort: (close?: () => void) => (
      <div className="flex flex-col">
        {(['selection', 'price_asc', 'price_desc', 'rating', 'reviews'] as TeacherSort[]).map((k) => (
          <Option key={k} on={(f.sort ?? 'selection') === k} onClick={() => { set('sort', k === 'selection' ? undefined : k); close?.() }}>{t.sorts[k]}</Option>
        ))}
      </div>
    ),
  }

  const subjectLabel = f.subject && fmt.label(subject(f.subject).label)
  const activeCount = [f.language, f.gender, f.ageGroup, f.level, f.riwaya, f.arabicTrack, f.madhhab, f.minPrice || f.maxPrice].filter(Boolean).length + (f.categories?.length ?? 0) + scheduleCount
  const list = teachers.data ?? []

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8">
      {/* Barre de filtres, grand écran. */}
      <div className="hidden flex-col gap-3 lg:flex">
        <div className={cx('grid gap-3', specialty ? 'grid-cols-[1fr_1.4fr_1fr]' : 'grid-cols-[1fr_1fr]')}>
          <FilterField label={t.learn} value={subjectLabel} placeholder={t.allSubjects} active={!!f.subject}>{(c) => panels.subject(c)}</FilterField>
          {specialty && <FilterField label={specialty.label} value={specialty.value} placeholder={t.choose} active={!!specialty.value}>{(c) => panels.specialty(c)}</FilterField>}
          <FilterField label={t.price} value={priceValue} placeholder={t.anyPrice} active={!!priceValue}>{(c) => panels.price(c)}</FilterField>
        </div>
        <div className="grid grid-cols-6 gap-3">
          <FilterField value={f.language && fmt.label(LANGUAGES.find((l) => l.id === f.language)!.label)} placeholder={t.language} active={!!f.language}>{(c) => panels.language(c)}</FilterField>
          <FilterField value={f.gender && (f.gender === 'F' ? t.woman : t.man)} placeholder={t.teacher} active={!!f.gender}>{(c) => panels.gender(c)}</FilterField>
          <FilterField value={learnerValue} placeholder={t.student} active={!!learnerValue}>{() => panels.learner()}</FilterField>
          <FilterField value={f.categories?.length ? t.selected(f.categories.length, t.categories) : undefined} placeholder={t.categories} active={!!f.categories?.length} wide>{() => panels.categories()}</FilterField>
          <FilterField value={scheduleCount ? t.selected(scheduleCount, t.schedule) : undefined} placeholder={t.schedule} active={!!scheduleCount}>{() => panels.schedule()}</FilterField>
          <FilterField value={f.sort ? t.sorts[f.sort] : undefined} placeholder={t.sort}>{(c) => panels.sort(c)}</FilterField>
        </div>
      </div>

      {/* Mobile : matière, bouton filtres et tri. */}
      <div className="flex flex-col gap-3 lg:hidden">
        <FilterField label={t.learn} value={subjectLabel} placeholder={t.allSubjects} active={!!f.subject}>{(c) => panels.subject(c)}</FilterField>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setSheet(true)} className={cx('flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-sm border-[1.5px] bg-white font-semibold', activeCount ? 'border-ink' : 'border-line')}>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            {t.filters}{activeCount ? ` (${activeCount})` : ''}
          </button>
          <FilterField value={f.sort ? t.sorts[f.sort] : undefined} placeholder={t.sort}>{(c) => panels.sort(c)}</FilterField>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl md:text-4xl">
          {teachers.isPending ? t.searching : t.count(list.length)}
          {subjectLabel && <span className="text-muted">{t.inSubject(subjectLabel)}</span>}
        </h1>
        {activeCount > 0 && <button type="button" className="cursor-pointer text-sm font-semibold underline" onClick={() => setF(forSubject({ subject: f.subject }))}>{t.clear}</button>}
      </div>

      {!teachers.isPending && list.length === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-sm bg-leaf p-6">
          <strong>{t.noneTitle}</strong>
          <span>{t.noneText}</span>
          <button type="button" className={buttonCls.ghost} onClick={() => setF({})}>{t.clear}</button>
        </div>
      )}
      <ul className={cx('flex flex-col gap-4 transition-opacity', teachers.isFetching && 'opacity-60')}>
        {list.map((x) => <li key={x.id}><TeacherCardView t={x} /></li>)}
      </ul>

      {sheet && (
        <Modal title={t.filters} onClose={() => setSheet(false)}>
          <div className="flex flex-col divide-y divide-line">
            {specialty && <section className="flex flex-col gap-2 pb-4"><h3 className="font-semibold">{specialty.label}</h3>{panels.specialty()}</section>}
            {[[t.price, panels.price()], [t.language, panels.language()], [t.teacher, panels.gender()], [t.student, panels.learner()], [t.categories, panels.categories()], [t.schedule, panels.schedule()]].map(([title, content], i) => (
              <section key={i} className="flex flex-col gap-2 py-4"><h3 className="font-semibold">{title}</h3>{content}</section>
            ))}
          </div>
          <button type="button" className={cx(buttonCls.primary, 'sticky bottom-0')} onClick={() => setSheet(false)}>{t.showResults(list.length)}</button>
        </Modal>
      )}
    </div>
  )
}

function CategoryIcon({ c }: { c: TeacherCategory }) {
  const d = c === 'ijaza' ? 'M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5zM4 19.5A2.5 2.5 0 006.5 22H20v-5M9 8h7M9 12h5'
    : c === 'diploma' ? 'M9 11l3 3 8-8M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11'
      : 'M12 15a7 7 0 100-14 7 7 0 000 14zM8.2 13.9L7 23l5-3 5 3-1.2-9.1'
  const color = c === 'ijaza' ? 'text-green' : c === 'diploma' ? 'text-[#2f6fb3]' : 'text-gold'
  return <svg viewBox="0 0 24 24" className={cx('size-5 shrink-0', color)} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
}

/** Étiquettes de catégorie (ijaza, diplôme, confirmé), comme « Prof qualifié » / « Super prof ». */
function CategoryTags({ t }: { t: TeacherCard }) {
  const m = useT()
  const tags: { c: TeacherCategory; label: string; cls: string }[] = []
  if (t.verification.ijaza) tags.push({ c: 'ijaza', label: m.badges.ijaza.label, cls: 'bg-soft text-green2' })
  if (t.verification.diploma) tags.push({ c: 'diploma', label: m.badges.diploma.label, cls: 'bg-[#e6eef8] text-[#245a92]' })
  if (isConfirmed(t)) tags.push({ c: 'confirmed', label: t.gender === 'F' ? m.badges.confirmedF : m.badges.confirmed.label, cls: 'bg-sand text-ochre' })
  if (!tags.length) return null
  return <div className="flex flex-wrap gap-1.5">{tags.map((x) => <span key={x.c} className={cx('rounded-sm px-2 py-1 text-[13px] font-semibold', x.cls)}>{x.label}</span>)}</div>
}

/** Carte professeur façon Preply : photo, nom vérifié, matières, langues, accroche ; prix, chiffres et actions à droite. */
function TeacherCardView({ t }: { t: TeacherCard }) {
  const all = useT()
  const m = all.search
  const fmt = useFormat()
  const countryOf = useCountryOf()
  const place = countryOf(t.countryLabel)
  const href = `/teachers/${t.id}`
  return (
    // Toute la carte est cliquable : le lien du nom la recouvre ; les boutons restent au-dessus et gardent leur action.
    <article className="group relative grid cursor-pointer gap-5 rounded-md border-[1.5px] border-line bg-white p-5 transition hover:border-ink md:grid-cols-[minmax(0,1fr)_240px] md:p-6">
      <div className="flex min-w-0 gap-4 sm:gap-5">
        <Link href={href} tabIndex={-1} aria-hidden className="shrink-0"><Monogram name={t.name} size="xl" square photo={t.photoUrl} /></Link>
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="flex flex-wrap items-center gap-2 font-display text-2xl">
            <Link href={href} className="after:absolute after:inset-0 after:rounded-md after:content-[''] group-hover:underline">{t.name}</Link>
            {t.verification.identity && <VerifiedShield title={all.badges.identity.label} />}
            {place.flag && <span className="text-xl" role="img" aria-label={place.name}>{place.flag}</span>}
          </h2>
          <CategoryTags t={t} />
          <p className="flex items-start gap-2 text-[15px]"><LineIcon d={LINE_ICONS.cap} className="mt-0.5 size-[18px] text-muted" />{t.subjects.map((s) => fmt.label(subject(s).label)).join(', ')}</p>
          <p className="flex items-start gap-2 text-[15px]"><LineIcon d={LINE_ICONS.languages} className="mt-0.5 size-[18px] text-muted" />{m.speaks} {t.languages.map((l) => fmt.label(LANGUAGES.find((x) => x.id === l)!.label)).join(', ')}</p>
          <p className="line-clamp-3 text-[15px] leading-relaxed"><strong>{t.headline}</strong>{t.bio && <> — {t.bio}</>}</p>
          <Link href={href} className="relative z-10 self-start text-[15px] font-semibold underline">{m.more}</Link>
          {t.videoUrl && <div className="relative z-10 mt-1 self-start"><IntroVideoButton src={t.videoUrl} poster={t.photoUrl} name={t.name} /></div>}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <div className="font-display text-[28px] leading-none"><Money {...t.price} /></div>
          <div className="mt-1 text-sm text-muted">{m.lessonLength}</div>
        </div>
        <div className="flex gap-6">
          {t.rating > 0
            ? <div><div className="font-display text-lg leading-tight">{fmt.decimal(t.rating)} <span className="text-gold">★</span></div><div className="text-xs text-muted">{m.reviewsN(t.reviews.length)}</div></div>
            : <div><div className="font-display text-lg leading-tight">{m.newProfile[0]}</div><div className="text-xs text-muted">{m.newProfile[1]}</div></div>}
          {t.hoursTaught >= 1 && <div><div className="font-display text-lg leading-tight">{Math.round(t.hoursTaught)}</div><div className="text-xs text-muted">{m.hoursN}</div></div>}
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <Link href={`${href}#agenda`} className={cx(buttonCls.primary, 'relative z-10 w-full')}>{m.book}</Link>
          <MessageButton name={t.name} bookHref={`${href}#agenda`} className="relative z-10" />
        </div>
      </div>
      <span className="sr-only">{place.name}</span>
    </article>
  )
}
