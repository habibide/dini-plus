'use client'

import type { MyTeacher } from '@dini/data/supabase'
import { useRemoveTeacherMedia, useUploadTeacherMedia } from '@dini/data/react'
import { useRef, useState } from 'react'
import { IntroVideo, Monogram, buttonCls, cx } from './ui'
import { useT } from '@/i18n/locale'

// Photo de profil et vidéo de présentation du professeur, enregistrées dès qu'elles sont choisies
// (indépendamment du bouton « Enregistrer » du formulaire).

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
const PHOTO_MAX = 5 * 1024 * 1024
const VIDEO_MAX = 50 * 1024 * 1024
const VIDEO_MAX_SECONDS = 150

/** Durée d'une vidéo locale, lue par le navigateur avant l'envoi. */
function videoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration) }
    v.onerror = () => { URL.revokeObjectURL(url); resolve(0) }
    v.src = url
  })
}

export function TeacherMedia({ t }: { t: MyTeacher }) {
  const m = useT().application.media
  const upload = useUploadTeacherMedia()
  const remove = useRemoveTeacherMedia()
  const photoInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'photo' | 'video' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pick = async (kind: 'photo' | 'video', file: File | undefined) => {
    if (!file) return
    setError(null)
    const types = kind === 'photo' ? PHOTO_TYPES : VIDEO_TYPES
    if (!types.includes(file.type)) return setError(m.badType)
    if (file.size > (kind === 'photo' ? PHOTO_MAX : VIDEO_MAX)) return setError(kind === 'photo' ? m.photoTooBig : m.videoTooBig)
    if (kind === 'video' && (await videoDuration(file)) > VIDEO_MAX_SECONDS) return setError(m.videoTooLong)
    setBusy(kind)
    upload.mutate({ kind, file, contentType: file.type }, { onError: (e) => setError(e.message), onSettled: () => setBusy(null) })
  }
  const drop = (kind: 'photo' | 'video') => {
    setError(null)
    setBusy(kind)
    remove.mutate(kind, { onError: (e) => setError(e.message), onSettled: () => setBusy(null) })
  }

  return (
    <section className="flex flex-col gap-5 overflow-hidden rounded-md border-[1.5px] border-line bg-white p-6">
      <div><h2 className="font-display text-2xl">{m.title}</h2><p className="mt-1 text-muted">{m.hint}</p></div>
      <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        {/* Photo */}
        <div className="flex flex-col gap-3">
          <span className="font-semibold">{m.photo}</span>
          <Monogram name={t.name || '?'} size="xl" square photo={t.photoUrl} />
          <input ref={photoInput} type="file" accept={PHOTO_TYPES.join(',')} className="sr-only" aria-label={m.photo}
            onChange={(e) => { pick('photo', e.target.files?.[0]); e.target.value = '' }} />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!!busy} onClick={() => photoInput.current?.click()} className={cx(buttonCls.ghost, 'min-h-10 px-4 text-sm')}>
              {busy === 'photo' ? m.uploading : t.photoUrl ? m.change : m.addPhoto}
            </button>
            {t.photoUrl && <button type="button" disabled={!!busy} onClick={() => drop('photo')} className="cursor-pointer text-sm text-muted underline disabled:opacity-40">{m.remove}</button>}
          </div>
          <p className="text-sm text-muted">{m.photoHint}</p>
        </div>

        {/* Vidéo */}
        <div className="flex min-w-0 flex-col gap-3">
          <span className="font-semibold">{m.video}</span>
          {t.videoUrl
            ? <IntroVideo src={t.videoUrl} poster={t.photoUrl} />
            : <div className="grid aspect-video w-full place-items-center rounded-md border-[1.5px] border-dashed border-line bg-paper p-6 text-center text-muted">{m.noVideo}</div>}
          <input ref={videoInput} type="file" accept={VIDEO_TYPES.join(',')} className="sr-only" aria-label={m.video}
            onChange={(e) => { pick('video', e.target.files?.[0]); e.target.value = '' }} />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!!busy} onClick={() => videoInput.current?.click()} className={cx(buttonCls.ghost, 'min-h-10 px-4 text-sm')}>
              {busy === 'video' ? m.uploading : t.videoUrl ? m.change : m.addVideo}
            </button>
            {t.videoUrl && <button type="button" disabled={!!busy} onClick={() => drop('video')} className="cursor-pointer text-sm text-muted underline disabled:opacity-40">{m.remove}</button>}
          </div>
          <p className="text-sm text-muted">{m.videoHint}</p>
        </div>
      </div>
      {error && <p role="alert" className="rounded-sm bg-warnbg px-3 py-2 text-warn">{error}</p>}
    </section>
  )
}
