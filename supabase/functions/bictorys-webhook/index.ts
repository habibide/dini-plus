// Notification Bictorys de l'issue d'un paiement (appelée par Bictorys, sans compte Supabase).
// 1. Authentifie l'appel par l'en-tête X-Secret-Key (clé secrète de webhook saisie sur le tableau de bord Bictorys).
// 2. Retrouve le paiement par paymentReference (l'identifiant du paiement DINE envoyé à la création).
// 3. Applique le résultat en base : public.bictorys_settle vérifie montant et devise, confirme ou libère la séance.
// Secret requis : BICTORYS_WEBHOOK_SECRET. À déployer sans vérification JWT.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'

const ok = (result: string) => new Response(JSON.stringify({ result }), { status: 200, headers: { 'Content-Type': 'application/json' } })
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const SUCCEEDED = new Set(['succeeded', 'successful', 'success', 'authorized', 'réussi', 'reussi'])
const FAILED = new Set(['failed', 'cancelled', 'canceled', 'expired', 'échoué', 'echoue', 'expiré', 'expire'])

/** Comparaison en temps constant, pour ne rien laisser deviner du secret. */
function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a)
  const y = new TextEncoder().encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 })
  const secret = Deno.env.get('BICTORYS_WEBHOOK_SECRET')
  if (!secret) return new Response('not_configured', { status: 503 })
  if (!sameSecret(req.headers.get('x-secret-key') ?? '', secret)) return new Response('unauthorized', { status: 401 })

  const event = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!event) return new Response('invalid_body', { status: 400 })
  // Deux formats documentés : à plat, ou { event, data: {...} }.
  const e = (event.data && typeof event.data === 'object' ? event.data : event) as Record<string, unknown>
  const reference = String(e.paymentReference ?? e.reference ?? '')
  const raw = String(e.status ?? '').toLowerCase()
  const type = String(e.type ?? 'payment').toLowerCase()

  // Remboursements, déboursements… : pas de paiement de séance à mettre à jour.
  if (type !== 'payment' && type !== 'mobile_money' && type !== 'card') return ok('ignored_type')
  if (!UUID.test(reference)) return ok('unknown_reference')
  const status = SUCCEEDED.has(raw) ? 'succeeded' : FAILED.has(raw) ? 'failed' : null
  if (!status) return ok('pending')

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data, error } = await admin.rpc('bictorys_settle', {
    p_payment: reference,
    p_status: status,
    p_amount: e.amount == null ? null : Number(e.amount),
    p_currency: e.currency == null ? null : String(e.currency),
    p_ref: e.id == null ? null : String(e.id),
    p_payload: event,
  })
  if (error) {
    console.error('bictorys_settle failed', error.message)
    // 500 : Bictorys renverra la notification.
    return new Response('error', { status: 500 })
  }
  return ok(String(data))
})
