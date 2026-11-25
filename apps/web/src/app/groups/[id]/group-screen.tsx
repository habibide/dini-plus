'use client'

import { PLANS, subject, type PaymentMethod } from '@dini/core'
import { useFamily, useGroup, useLeaveGroup, useStartGroupPayment, useStartPayment } from '@dini/data/react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { FormError } from '@/components/auth'
import { GroupStatusBadge, useSlotLabel } from '@/components/groups'
import { Money, buttonCls, cx } from '@/components/ui'
import { useFormat, useT } from '@/i18n/locale'

// Page d'un groupe : état, membres, lien d'invitation, paiement de sa part et séances.

export function GroupScreen() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const group = useGroup(id)
  const family = useFamily()
  const leave = useLeaveGroup()
  const startShare = useStartGroupPayment()
  const startPayment = useStartPayment()
  const all = useT()
  const m = all.groups
  const fmt = useFormat()
  const slotLabel = useSlotLabel()
  const [method, setMethod] = useState<PaymentMethod>()
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  if (group.isError) return <p className="mx-auto max-w-3xl px-5 py-10"><FormError message={group.error.message} /></p>
  const g = group.data
  if (!g) return <p className="mx-auto max-w-3xl px-5 py-10 text-muted">{all.common.loading}</p>
  const tz = family.data?.family.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const plan = PLANS.find((p) => p.id === g.planId)!
  const link = g.inviteCode && typeof window !== 'undefined' ? `${window.location.origin}/join/${g.inviteCode}` : null
  const toPay = g.members.filter((x) => x.mine && x.status === 'joined')
  const methods = family.data?.country.payments ?? []
  const pay = method ?? methods[0]
  const open = g.status === 'forming' || g.status === 'payment'

  const copy = async () => {
    if (!link) return
    try {
      if (navigator.share) await navigator.share({ title: m.cta, text: m.shareText(g.teacherName), url: link })
      else { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    } catch { /* partage annulé */ }
  }
  async function payShare(memberId: string) {
    setError(null)
    setRedirecting(true)
    try {
      const { paymentId } = await startShare.mutateAsync({ memberId, method: pay })
      // Retour sur cette page après le paiement : elle se met à jour toute seule.
      const { url } = await startPayment.mutateAsync({ paymentId, returnUrl: `${window.location.origin}/groups/${g!.id}` })
      window.location.assign(url)
    } catch (e) {
      setRedirecting(false)
      setError(e instanceof Error ? e.message : null)
    }
  }
  function quit() {
    if (!window.confirm(g!.isOrganizer ? m.confirmCancel : m.confirmLeave)) return
    leave.mutate(g!.id, { onSuccess: () => { if (!g!.isOrganizer) router.push('/progress') } })
  }

  const statusText = g.status === 'forming' ? m.formingText(g.min)
    : g.status === 'payment' ? m.paymentText(g.paymentDeadline ? fmt.dateTime(g.paymentDeadline, tz) : '')
    : g.status === 'active' ? m.activeText : g.status === 'cancelled' ? m.cancelledText : m.endedText

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
      <Link href={`/teachers/${g.teacherId}`} className="text-sm text-muted hover:text-ink">{g.teacherName}</Link>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl">{fmt.label(subject(g.subject).label)} · {g.teacherName}</h1>
        <GroupStatusBadge status={g.status} />
      </header>
      <p className="rounded-md bg-leaf px-4 py-3">{statusText}</p>

      <section className="grid gap-4 rounded-md border-[1.5px] border-line bg-white p-6 sm:grid-cols-2">
        <div><p className="text-sm text-muted">{m.plan}</p><p className="font-semibold">{m.planLine(fmt.label(plan.label), plan.sessions)}</p></div>
        <div><p className="text-sm text-muted">{m.slots(g.slots.length)}</p><p className="font-semibold">{g.slots.map(slotLabel).join(', ')}</p><p className="text-xs text-muted">{g.teacherTimezone}</p></div>
        {g.share && <div><p className="text-sm text-muted">{m.yourShare}</p><p className="font-semibold"><Money amount={g.share.amount} currency={g.share.currency} />{m.perMonth}</p></div>}
        <div><p className="text-sm text-muted">{m.badge}</p><p className="font-semibold">{m.members(g.members.length, g.max)}</p></div>
      </section>

      {open && link && (
        <section className="flex flex-col gap-2 rounded-md border-[1.5px] border-line bg-white p-6">
          <h2 className="font-display text-xl">{m.invite}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-sm bg-paper px-3 py-2 text-sm">{link}</code>
            <button type="button" className={buttonCls.ghost} onClick={copy}>{copied ? m.copied : m.copy}</button>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-md border-[1.5px] border-line bg-white p-6">
        <h2 className="font-display text-xl">{m.members(g.members.length, g.max)}</h2>
        <ul className="flex flex-col divide-y divide-line">
          {g.members.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-3 py-2">
              <span>{x.name}{x.mine ? m.you : ''}</span>
              <span className={cx('text-sm font-semibold', x.status === 'paid' ? 'text-green2' : g.status === 'payment' ? 'text-ochre' : 'text-muted')}>
                {x.status === 'paid' ? m.paid : g.status === 'payment' ? m.toPay : m.joined}
              </span>
            </li>
          ))}
        </ul>

        {g.status === 'payment' && toPay.length > 0 && g.share && (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            {methods.length > 1 && (
              <label className="flex flex-col gap-1 text-sm font-semibold">{m.howPay}
                <select value={pay} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="min-h-11 rounded-sm border border-line bg-white px-2 font-normal">
                  {methods.map((pm) => <option key={pm} value={pm}>{all.booking.payments[pm]}</option>)}
                </select>
              </label>
            )}
            {toPay.map((x) => (
              <button key={x.id} type="button" className={cx(buttonCls.primary, 'self-start')} disabled={redirecting} onClick={() => payShare(x.id)}>
                {redirecting ? m.paying : <>{m.payShare}{toPay.length > 1 ? ` (${x.name})` : ''} · <Money amount={g.share!.amount} currency={g.share!.currency} /></>}
              </button>
            ))}
            <p className="text-xs text-muted">{all.booking.secure}</p>
          </div>
        )}
        <FormError message={error ?? leave.error?.message} />
      </section>

      <section className="flex flex-col gap-3 rounded-md border-[1.5px] border-line bg-white p-6">
        <h2 className="font-display text-xl">{m.sessions}</h2>
        {!g.sessions.length ? <p className="text-muted">{m.noSessions}</p> : (
          <ul className="flex flex-col divide-y divide-line">
            {g.sessions.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-2">
                <span className="first-letter:uppercase">{fmt.dateTime(x.startsAt, tz)}</span>
                <span className="text-sm text-muted">{x.status === 'delivered' ? '✓' : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open && (g.isOrganizer || g.members.some((x) => x.mine && x.status === 'joined')) && (
        <button type="button" className="cursor-pointer self-start text-sm text-muted underline disabled:opacity-40" disabled={leave.isPending} onClick={quit}>
          {g.isOrganizer ? m.cancelGroup : m.leave}
        </button>
      )}
    </div>
  )
}
