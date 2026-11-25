// Entrée dans la salle vidéo d'une séance (Daily).
// 1. Vérifie, avec les droits de l'appelant, qu'il est l'enseignant ou la famille de la séance et que la salle est ouverte.
// 2. Crée la salle privée à la première entrée et la mémorise sur la séance.
// 3. Renvoie une adresse personnelle (jeton nominatif, valable jusqu'à la fermeture de la salle).
// Secret requis : DAILY_API_KEY (Supabase, Edge Functions, Secrets).
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

type Access = { booking_id: string; room: string | null; role: 'teacher' | 'family'; display_name: string; opens_at: string; closes_at: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const apiKey = Deno.env.get('DAILY_API_KEY')
  if (!apiKey) return json({ error: 'video_not_configured' }, 503)
  const authorization = req.headers.get('Authorization')
  if (!authorization) return json({ error: 'not_signed_in' }, 401)
  const { bookingId } = await req.json().catch(() => ({}))
  if (typeof bookingId !== 'string' || !/^[0-9a-f-]{36}$/.test(bookingId)) return json({ error: 'invalid_request' }, 400)

  const url = Deno.env.get('SUPABASE_URL')!
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } })
  const { data, error } = await asUser.rpc('video_access', { p_booking: bookingId }).single()
  if (error) return json({ error: error.message }, error.code === '42501' ? 403 : 409)
  const access = data as Access

  const daily = (path: string, init?: { method?: string; body?: unknown }) =>
    fetch(`https://api.daily.co/v1${path}`, {
      method: init?.method ?? 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
    })
  const nbf = Math.floor(Date.parse(access.opens_at) / 1000)
  const exp = Math.floor(Date.parse(access.closes_at) / 1000)

  let roomUrl = access.room
  if (!roomUrl) {
    // Nom de salle tiré de la séance renvoyée par la base : pour un cours de groupe, c'est la séance de groupe,
    // donc tous les membres et le professeur arrivent dans la même salle (jusqu'à 10 élèves et le professeur).
    const name = `dini-${access.booking_id.replaceAll('-', '').slice(0, 24)}`
    let res = await daily('/rooms', {
      method: 'POST',
      body: { name, privacy: 'private', properties: { nbf, exp, eject_at_room_exp: true, max_participants: 11, enable_prejoin_ui: true, enable_chat: true, enable_screenshare: true } },
    })
    // Les participants peuvent arriver en même temps : si la salle existe déjà, on la relit.
    if (!res.ok) res = await daily(`/rooms/${name}`)
    if (!res.ok) return json({ error: 'video_unavailable' }, 502)
    roomUrl = (await res.json()).url as string
  }

  const roomName = new URL(roomUrl).pathname.slice(1)
  const tokenRes = await daily('/meeting-tokens', {
    method: 'POST',
    body: { properties: { room_name: roomName, user_name: access.display_name, is_owner: access.role === 'teacher', exp, eject_at_token_exp: true } },
  })
  if (!tokenRes.ok) return json({ error: 'video_unavailable' }, 502)
  const { token } = await tokenRes.json()
  return json({ url: `${roomUrl}?t=${token}`, role: access.role, closesAt: access.closes_at })
})
