// Ouvre le paiement Bictorys d'une réservation en attente (page de paiement hébergée).
// 1. Vérifie que l'appelant est la famille du paiement, encore en attente et dans le délai de blocage.
// 2. Crée la charge chez Bictorys avec la clé secrète (jamais exposée au client) et le montant lu en base.
// 3. Renvoie l'adresse de la page de paiement (réutilisée si on la redemande).
// Secrets requis (Supabase, Edge Functions, Secrets) : BICTORYS_SECRET_KEY.
// Facultatifs : BICTORYS_API_URL (par défaut l'environnement de test), SITE_URL, PAYMENT_RETURN_ORIGINS.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const API = (Deno.env.get('BICTORYS_API_URL') ?? 'https://api.test.bictorys.com').replace(/\/$/, '')
const SITE = (Deno.env.get('SITE_URL') ?? 'https://dine-ivory.vercel.app').replace(/\/$/, '')
const ORIGINS = new Set((Deno.env.get('PAYMENT_RETURN_ORIGINS') ?? SITE).split(',').map((o) => o.trim()).filter(Boolean))
const LOCALES: Record<string, string> = { fr: 'fr-FR', en: 'en-US', ar: 'ar' }

/** Page de retour : uniquement sur une origine autorisée et en https (exigé par Bictorys). */
function returnBase(wanted: unknown): string {
  try {
    const u = new URL(String(wanted))
    if (u.protocol === 'https:' && ORIGINS.has(u.origin)) return `${u.origin}${u.pathname}`
  } catch { /* adresse invalide : page par défaut */ }
  return `${SITE}/book/return`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const secret = Deno.env.get('BICTORYS_SECRET_KEY')
  if (!secret) return json({ error: 'payment_not_configured' }, 503)
  const authorization = req.headers.get('Authorization')
  if (!authorization) return json({ error: 'not_signed_in' }, 401)
  const { paymentId, returnUrl, locale } = await req.json().catch(() => ({}))
  if (typeof paymentId !== 'string' || !/^[0-9a-f-]{36}$/.test(paymentId)) return json({ error: 'invalid_request' }, 400)

  const url = Deno.env.get('SUPABASE_URL')!
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } })
  const { data: who } = await asUser.auth.getUser()
  if (!who.user) return json({ error: 'not_signed_in' }, 401)

  // Le rôle serveur n'a pas accès direct aux tables : tout passe par des fonctions réservées au serveur.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: ctx, error: ctxError } = await admin.rpc('bictorys_checkout_context', { p_payment: paymentId, p_user: who.user.id })
  if (ctxError) {
    console.error('bictorys_checkout_context failed', ctxError.message)
    return json({ error: 'payment_unavailable' }, 502)
  }
  const p = ctx as null | {
    id: string; amount: number; currency: string; method: string; provider: string; status: string; checkout_url: string | null
    booking_id: string; booking_status: string | null; hold_until: string | null; full_name: string | null
  }
  if (!p) return json({ error: 'forbidden' }, 403)
  if (p.provider !== 'bictorys' || p.status !== 'pending' || p.booking_status !== 'pending_payment') return json({ error: 'not_payable' }, 409)
  if (p.hold_until && Date.parse(p.hold_until) < Date.now()) return json({ error: 'payment_expired' }, 409)
  if (p.checkout_url) return json({ url: p.checkout_url })

  const base = returnBase(returnUrl)
  const res = await fetch(`${API}/pay/v1/charges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Api-Key': secret },
    body: JSON.stringify({
      amount: Number(p.amount),
      currency: p.currency,
      paymentReference: p.id,
      merchantReference: p.booking_id,
      successRedirectUrl: `${base}?payment=${p.id}`,
      errorRedirectUrl: `${base}?payment=${p.id}&failed=1`,
      customerObject: {
        name: p.full_name || undefined,
        email: who.user.email && !who.user.email.endsWith('privaterelay.appleid.com') ? who.user.email : undefined,
        locale: LOCALES[String(locale)] ?? 'fr-FR',
      },
      allowUpdateCustomer: false,
    }),
  })
  const text = await res.text()
  let body: { link?: string; chargeId?: string; id?: string } | null = null
  try { body = JSON.parse(text) } catch { /* réponse non JSON */ }
  if (!res.ok || !body?.link) {
    // Diagnostic sans révéler la clé : seulement sa forme (préfixe, longueur, espaces).
    const shape = { kind: /^(public|secret|private|test|live|sk|pk)[-_]/i.exec(secret)?.[1] ?? 'other', length: secret.length, spaces: /\s/.test(secret), api: API }
    console.error('bictorys charge failed', res.status, text.slice(0, 300), JSON.stringify(shape))
    return json({ error: 'payment_unavailable' }, 502)
  }

  // Ouvre directement le bon onglet (carte ou Mobile Money) selon le moyen choisi dans DINE.
  const link = new URL(body.link)
  link.searchParams.set('payment_category', p.method === 'card' ? 'card' : 'mobile_money')
  await admin.rpc('bictorys_save_checkout', { p_payment: p.id, p_url: link.toString(), p_ref: body.chargeId ?? body.id ?? null })
  return json({ url: link.toString() })
})
