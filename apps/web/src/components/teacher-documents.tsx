'use client'

import { useDini, useRemoveTeacherDocument, useTeacherDocuments, useUploadTeacherDocument } from '@dini/data/react'
import { useRef, useState } from 'react'
import { buttonCls, cx } from './ui'
import { useT } from '@/i18n/locale'

// Justificatifs du professeur (scans de diplômes, d'ijaza) : privés, vus seulement par lui et par les
// modérateurs, qui s'en servent pour vérifier les diplômes déclarés. Enregistrés dès qu'ils sont choisis.

const TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX = 10 * 1024 * 1024

const sizeLabel = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`)

export function TeacherDocuments() {
  const m = useT().application.documents
  const docs = useTeacherDocuments()
  const upload = useUploadTeacherDocument()
  const remove = useRemoveTeacherDocument()
  const { api } = useDini()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const list = docs.data ?? []

  const pick = (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (!TYPES.includes(file.type)) return setError(m.badType)
    if (file.size > MAX) return setError(m.tooBig)
    upload.mutate({ file, fileName: file.name, contentType: file.type }, { onError: (e) => setError(e.message) })
  }
  const open = async (path: string) => {
    setError(null)
    // Fenêtre ouverte tout de suite (sinon bloquée par le navigateur), puis dirigée vers le lien temporaire.
    const w = window.open('', '_blank')
    if (w) w.opener = null
    try {
      const url = await api.teacherDocumentUrl(path)
      if (w) w.location.href = url
      else window.location.href = url
    } catch (e) {
      w?.close()
      setError(e instanceof Error ? e.message : null)
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-3 border-t border-line pt-4">
      <div><h3 className="font-semibold">{m.title}</h3><p className="text-sm text-muted">{m.hint}</p></div>
      {list.length > 0 && (
        <ul className="flex flex-col divide-y divide-line rounded-sm border border-line">
          {list.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 truncate"><span aria-hidden>{d.contentType === 'application/pdf' ? '📄' : '🖼️'}</span> {d.fileName} <span className="text-sm text-muted">· {sizeLabel(d.size)}</span></span>
              <span className="flex gap-3 text-sm">
                <button type="button" className="cursor-pointer underline" onClick={() => open(d.path)}>{m.open}</button>
                <button type="button" className="cursor-pointer text-muted underline disabled:opacity-40" disabled={remove.isPending}
                  onClick={() => remove.mutate(d.id, { onError: (e) => setError(e.message) })}>{m.remove}</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <input ref={input} type="file" accept={TYPES.join(',')} className="sr-only" aria-label={m.add}
        onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
      <button type="button" disabled={upload.isPending || list.length >= 10} onClick={() => input.current?.click()} className={cx(buttonCls.ghost, 'self-start')}>
        {upload.isPending ? m.uploading : m.add}
      </button>
      <p className="text-sm text-muted">{m.formats}</p>
      {error && <p role="alert" className="rounded-sm bg-warnbg px-3 py-2 text-warn">{error}</p>}
    </div>
  )
}

/** Justificatifs d'un professeur, en lecture seule, pour la modération. */
export function TeacherDocumentLinks({ teacherId }: { teacherId: string }) {
  const all = useT()
  const m = all.application.documents
  const docs = useTeacherDocuments(teacherId)
  const { api } = useDini()
  const open = async (path: string) => {
    const w = window.open('', '_blank')
    if (w) w.opener = null
    try {
      const url = await api.teacherDocumentUrl(path)
      if (w) w.location.href = url
    } catch { w?.close() }
  }
  if (docs.isPending) return null
  if (!docs.data?.length) return <p className="text-sm text-muted">{all.moderation.noDocuments}</p>
  return (
    <ul className="flex flex-wrap gap-2">
      {docs.data.map((d) => (
        <li key={d.id}>
          <button type="button" onClick={() => open(d.path)} className="cursor-pointer rounded-sm border border-line bg-paper px-3 py-1.5 text-sm hover:border-green">
            <span aria-hidden>{d.contentType === 'application/pdf' ? '📄' : '🖼️'}</span> {d.fileName} · <span className="underline">{m.open}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
