'use client'

import { useDini, useJoinSession } from '@dini/data/react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'
import { FormError } from '@/components/auth'
import { buttonCls } from '@/components/ui'
import { useT } from '@/i18n/locale'

/** Salle vidéo de la séance, intégrée à la page. L'adresse est personnelle et expire à la fermeture de la salle. */
export function ClassroomScreen() {
  const { id } = useParams<{ id: string }>()
  const { api } = useDini()
  const join = useJoinSession()
  const { mutate } = join
  const m = useT().classroom
  useEffect(() => { mutate({ api, bookingId: id }) }, [api, id, mutate])

  const teacher = join.data?.role === 'teacher'
  const back = teacher ? '/enseignant' : '/suivi'
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">{m.title}</h1>
        <div className="flex flex-wrap gap-2">
          {teacher && <Link href={`/enseignant/seances/${id}`} className={buttonCls.primary}>{m.writeReport}</Link>}
          <Link href={back} className={buttonCls.ghost}>{m.leave}</Link>
        </div>
      </div>
      {join.isPending && <p className="text-muted">{m.opening}</p>}
      <FormError message={join.error?.message} />
      {join.data && (
        <iframe src={join.data.url} title={m.frame} allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          className="h-[75vh] min-h-[480px] w-full rounded-sm border border-line bg-ink" />
      )}
      <p className="text-sm text-muted">{m.hint}</p>
    </div>
  )
}
