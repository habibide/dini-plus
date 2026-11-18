'use client'

import { AGE_GROUPS, LANGUAGES, LEVELS, RIWAYAT, SUBJECTS, country, subject, type LanguageId, type SubjectId } from '@dini/core'
import type { TeacherCard, TeacherFilters } from '@dini/data'
import { usePlace, useTeachers } from '@dini/data/react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { useFormat, useT } from '@/i18n/locale'
import { Badge, Modal, Money, Monogram, RecitationPreview, Stars, badgesOf, buttonCls, cx } from '@/components/ui'

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cx('min-h-9 cursor-pointer rounded-full border-[1.5px] px-3.5 text-sm font-semibold transition', on ? 'border-green bg-green text-white' : 'border-line bg-white text-ink hover:border-green')}>{children}</button>
  )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex flex-col gap-2"><span className="text-sm font-semibold">{label}</span><div className="flex flex-wrap gap-1.5">{children}</div></div>
}

export function SearchScreen() {
  const params = useSearchParams()
  const [f, setF] = useState<TeacherFilters>(() => {
    const g = params.get('enseignant')
    return { subject: (params.get('matiere') as SubjectId) || undefined, gender: g === 'F' || g === 'M' ? g : undefined }
  })
  const [sheet, setSheet] = useState(false)
  const toggle = <K extends keyof TeacherFilters>(k: K, v: TeacherFilters[K]) => setF((x) => ({ ...x, [k]: x[k] === v ? undefined : v }))
  const teachers = useTeachers(f)
  const { place } = usePlace()
  const t = useT().search
  const fmt = useFormat()
  const active = Object.values(f).filter(Boolean).length
  const tzLabel = country(place.country).timezones.find((t) => t.id === place.timezone)?.label

  const filters = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="f-subject" className="text-sm font-semibold">{t.subject}</label>
        <select id="f-subject" value={f.subject ?? ''} onChange={(e) => setF({ ...f, subject: (e.target.value || undefined) as SubjectId })} className="min-h-10 rounded-sm border border-line bg-white px-2">
          <option value="">{t.allSubjects}</option>
          {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{fmt.label(s.label)}</option>)}
        </select>
      </div>
      <Group label={t.language}>{LANGUAGES.map((l) => <Chip key={l.id} on={f.language === l.id} onClick={() => toggle('language', l.id as LanguageId)}>{fmt.label(l.label)}</Chip>)}</Group>
      <Group label={t.riwaya}>{RIWAYAT.map((r) => <Chip key={r} on={f.riwaya === r} onClick={() => toggle('riwaya', r)}>{r}</Chip>)}</Group>
      <Group label={t.teacher}>{[['F', t.woman], ['M', t.man]].map(([g, l]) => <Chip key={g} on={f.gender === g} onClick={() => toggle('gender', g as 'F' | 'M')}>{l}</Chip>)}</Group>
      <Group label={t.available(tzLabel ?? '')}>{[['morning', t.morning], ['afternoon', t.afternoon], ['evening', t.evening]].map(([k, l]) => <Chip key={k} on={f.timeOfDay === k} onClick={() => toggle('timeOfDay', k as TeacherFilters['timeOfDay'])}>{l}</Chip>)}</Group>
      <Group label={t.age}>{AGE_GROUPS.map((a) => <Chip key={a.id} on={f.ageGroup === a.id} onClick={() => toggle('ageGroup', a.id)}>{fmt.label(a.label)}</Chip>)}</Group>
      <Group label={t.level}>{LEVELS.map((l) => <Chip key={l.id} on={f.level === l.id} onClick={() => toggle('level', l.id)}>{fmt.label(l.label)}</Chip>)}</Group>
      {active > 0 && <button type="button" className={buttonCls.ghost} onClick={() => setF({})}>{t.clear}</button>}
    </div>
  )

  const list = teachers.data ?? []
  return (
    <div className="mx-auto grid max-w-6xl items-start gap-10 px-5 py-8 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden lg:sticky lg:top-4 lg:block">{filters}</aside>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl">
            {teachers.isPending ? t.searching : t.count(list.length)}
            {f.subject && <span className="text-muted">{t.inSubject(fmt.label(subject(f.subject).label))}</span>}
          </h1>
          <button type="button" className={cx(buttonCls.ghost, 'min-h-10 lg:hidden')} onClick={() => setSheet(true)}>{t.filters}{active ? ` (${active})` : ''}</button>
        </div>
        {!teachers.isPending && list.length === 0 && (
          <div className="flex flex-col items-start gap-3 rounded-sm bg-leaf p-6">
            <strong>{t.noneTitle}</strong>
            <span>{t.noneText}</span>
            <button type="button" className={buttonCls.ghost} onClick={() => setF({})}>{t.clear}</button>
          </div>
        )}
        <ul className={cx('flex flex-col gap-3 transition-opacity', teachers.isFetching && 'opacity-60')}>
          {list.map((t) => <li key={t.id}><TeacherRow t={t} /></li>)}
        </ul>
      </div>
      {sheet && <Modal title={t.filters} onClose={() => setSheet(false)}>{filters}<button type="button" className={buttonCls.primary} onClick={() => setSheet(false)}>{t.showResults(list.length)}</button></Modal>}
    </div>
  )
}

function TeacherRow({ t }: { t: TeacherCard }) {
  const m = useT().search
  const per = useT().common.perCourse
  const fmt = useFormat()
  return (
    <article className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-5 gap-y-3 rounded-md border-[1.5px] border-line bg-white p-5 shadow-[0_1px_2px_rgba(20,20,18,0.03)] transition hover:border-green hover:shadow-[0_0_0_3px_var(--color-soft)] sm:grid-cols-[72px_minmax(0,1fr)_200px]">
      <Monogram name={t.name} size="md" />
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="font-display text-xl"><Link href={`/enseignants/${t.id}`} className="hover:underline">{t.name}</Link></h2>
        <div className="flex flex-wrap gap-1.5">{badgesOf(t).map((k) => <Badge key={k} k={k} gender={t.gender} />)}</div>
        <p className="font-medium">{t.headline}</p>
        <dl className="grid grid-cols-[90px_minmax(0,1fr)] gap-x-2 text-sm">
          <dt className="text-muted">{m.subjects}</dt><dd>{t.subjects.map((s) => fmt.label(subject(s).label)).join(', ')}</dd>
          <dt className="text-muted">{m.languages}</dt><dd>{t.languages.map((l) => fmt.label(LANGUAGES.find((x) => x.id === l)!.label)).join(', ')}</dd>
          <dt className="text-muted">{m.from}</dt><dd>{t.city}, {t.countryLabel}</dd>
        </dl>
      </div>
      <div className="col-span-2 flex flex-col items-start gap-2 sm:col-span-1">
        <span><strong className="font-display text-2xl text-green"><Money {...t.price} /></strong> <span className="text-sm text-muted">{per}</span></span>
        <Stars value={t.rating} count={t.reviews.length} />
        <RecitationPreview seed={t.id} />
        <Link href={`/enseignants/${t.id}`} className="inline-flex min-h-10 w-full items-center justify-center rounded-[10px] border border-[#e1ddd2] bg-paper text-sm font-bold text-ink transition hover:border-green">{m.viewProfile}</Link>
      </div>
    </article>
  )
}
