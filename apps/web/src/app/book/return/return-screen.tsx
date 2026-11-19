'use client'

import { usePaymentStatus, useStartPayment } from '@dini/data/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { buttonCls, cx } from '@/components/ui'
import { useT } from '@/i18n/locale'

// Retour de la page de paiement Bictorys. L'issue fait foi côté serveur (webhook) :
// on suit le paiement jusqu'à ce qu'il soit confirmé, échoué, ou payé sans créneau (à rembourser).

export function PaymentReturnScreen() {
  const params = useSearchParams()
  const paymentId = params.get('payment')
  const cameBackFailed = params.get('failed') === '1'
  const router = useRouter()
  const m = useT().booking
  const r = m.payReturn
  const status = usePaymentStatus(paymentId && /^[0-9a-f-]{36}$/.test(paymentId) ? paymentId : null)
  const retry = useStartPayment()
  const [error, setError] = useState<string | null>(null)
  const state = status.data?.status

  // Paiement confirmé : direction le suivi, avec la séance mise en avant.
  useEffect(() => {
    if (state === 'paid' && status.data?.bookingId) {
      const id = setTimeout(() => router.replace(`/progress?booked=${status.data!.bookingId}`), 1500)
      return () => clearTimeout(id)
    }
  }, [state, status.data, router])

  async function resume() {
    if (!paymentId) return
    setError(null)
    try {
      const { url } = await retry.mutateAsync({ paymentId, returnUrl: `${window.location.origin}/book/return` })
      window.location.assign(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : null)
    }
  }

  const tone = state === 'paid' ? 'bg-soft text-green2' : state === 'failed' || state === 'refund_due' ? 'bg-warnbg text-warn' : 'bg-leaf'
  const text = !paymentId || status.isError ? r.failed
    : state === 'paid' ? r.paid
    : state === 'failed' ? r.failed
    : state === 'refund_due' ? r.refundDue
    : cameBackFailed ? r.pendingAfterError
    : r.pending

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-5 py-12">
      <h1 className="font-display text-3xl">{r.title}</h1>
      <p role="status" aria-live="polite" className={cx('flex items-center gap-3 rounded-md px-4 py-4', tone)}>
        {(state === 'pending' || (!state && !status.isError && paymentId)) && !cameBackFailed && (
          <span aria-hidden className="size-5 shrink-0 animate-spin rounded-full border-2 border-green border-t-transparent" />
        )}
        <span>{text}</span>
      </p>
      {error && <p role="alert" className="rounded-sm bg-warnbg px-3 py-2 text-warn">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {state === 'pending' && (
          <button type="button" className={buttonCls.primary} disabled={retry.isPending} onClick={resume}>{retry.isPending ? m.redirecting : r.retry}</button>
        )}
        {(state === 'failed' || !paymentId || status.isError) && <Link href="/teachers" className={buttonCls.primary}>{r.otherSlot}</Link>}
        {(state === 'paid' || state === 'refund_due') && <Link href="/progress" className={buttonCls.primary}>{r.toProgress}</Link>}
      </div>
    </div>
  )
}
