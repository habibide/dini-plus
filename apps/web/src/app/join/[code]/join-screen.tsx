'use client'

import { PLANS, subject } from '@dini/core'
import { useEnsureLearner, useFamily, useGroupInvite, useJoinGroup } from '@dini/data/react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { FormError } from '@/components/auth'
import { GroupStatusBadge, useSlotLabel } from '@/components/groups'
import { Money, buttonCls, cx } from '@/components/ui'
import { useFormat, useT } from '@/i18n/locale'

// Lien d'invitation : aperçu du groupe, choix de l'élève inscrit, puis la page du groupe.

export function JoinGroupScreen() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const invite = useGroupInvite(code)
  const family = useFamily()
  const join = useJoinGroup()
  const all = useT()
  const m = all.groups
  const fmt = useFormat()
  const slotLabel = useSlotLabel()
  const [learnerId, setLearnerId] = useState<string>()
  // Une famille peut inscrire plusieurs enfants : on propose ceux qui ne sont pas encore dans le groupe.
  // Sans aucun élève (compte tout neuf), on demande le nom de celui qui suivra les cours.
  const learners = invite.data && family.data ? family.data.learners.filter((l) => !(invite.data!.myLearners ?? []).includes(l.id)) : []
  const learner = learnerId ?? learners[0]?.id
  const student = useEnsureLearner(learner, family.data?.family.parentName)

  if (invite.isError) return <div className="mx-auto max-w-xl px-5 py-10"><FormError message={invite.error.message} /></div>
  const g = invite.data
  if (!g || !family.data) return <p className="mx-auto max-w-xl px-5 py-10 text-muted">{all.common.loading}</p>
  const plan = PLANS.find((p) => p.id === g.planId)!
  const open = (g.status === 'forming' || g.status === 'payment') && g.members < g.max

  async function submit() {
    const learnerId = await student.ensure()
    if (!learnerId) return
    const id = await join.mutateAsync({ code, learnerId }).catch(() => null)
    if (id) router.push(`/groups/${id}`)
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-5 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl">{m.joinTitle(g.teacherName)}</h1>
        <GroupStatusBadge status={g.status} />
      </div>
      <dl className="flex flex-col gap-2 rounded-md border-[1.5px] border-line bg-white p-6">
        <div className="flex justify-between gap-4"><dt className="text-muted">{m.subject}</dt><dd className="font-semibold">{fmt.label(subject(g.subject).label)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted">{m.plan}</dt><dd className="font-semibold">{m.planLine(fmt.label(plan.label), plan.sessions)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted">{m.slots(g.slots.length)}</dt><dd className="text-end font-semibold">{g.slots.map(slotLabel).join(', ')}<span className="block text-xs font-normal text-muted">{g.teacherTimezone}</span></dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted">{m.badge}</dt><dd className="font-semibold">{m.members(g.members, g.max)}</dd></div>
        {g.share && <div className="flex justify-between gap-4 border-t border-line pt-2"><dt className="font-semibold">{m.pricePer}</dt><dd className="font-bold"><Money amount={g.share.amount} currency={g.share.currency} />{m.perMonth}</dd></div>}
      </dl>

      {g.isMember && !learners.length ? (
        <>
          <p className="rounded-sm bg-soft px-3 py-2 text-green2">{m.alreadyMember}</p>
          <Link href={`/groups/${g.id}`} className={cx(buttonCls.primary, 'self-start')}>{m.openGroup}</Link>
        </>
      ) : !open ? (
        <p className="rounded-sm bg-warnbg px-3 py-2 text-warn">{m.closed}</p>
      ) : (
        <>
          {g.isMember && <Link href={`/groups/${g.id}`} className="text-sm underline">{m.openGroup}</Link>}
          {learners.length > 1 && (
            <label className="flex flex-col gap-1 text-sm font-semibold">{m.joinAs}
              <select value={learner} onChange={(e) => setLearnerId(e.target.value)} className="min-h-11 rounded-sm border border-line bg-white px-2 font-normal">
                {learners.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
          )}
          {student.asSelf && <p className="text-sm text-muted">{m.asSelf(student.self)}</p>}
          {student.needName && (
            <label className="flex flex-col gap-1 text-sm font-semibold">{m.studentName}
              <input value={student.name} onChange={(e) => student.setName(e.target.value)} placeholder={m.studentPlaceholder} className="min-h-11 rounded-sm border border-line px-3 font-normal" />
            </label>
          )}
          <FormError message={join.error?.message ?? student.error?.message} />
          <button type="button" className={cx(buttonCls.primary, 'self-start')} disabled={join.isPending || student.pending || !student.ready} onClick={submit}>
            {join.isPending || student.pending ? m.joining : m.join}
          </button>
          <p className="text-sm text-muted">{m.discount}</p>
        </>
      )}
    </div>
  )
}
