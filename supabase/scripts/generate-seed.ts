// Génère la migration du catalogue (pays, forfaits, réglages, enseignants) à partir de @dini/core et @dini/data,
// pour que la base et les données fictives restent identiques.
// Usage : npx tsx supabase/scripts/generate-seed.ts > supabase/migrations/<horodatage>_catalog_seed.sql
import { COUNTRIES, DEMO_RATES, ESCROW_HOURS, FREE_CANCEL_HOURS, PLANS, TRIAL_DISCOUNT } from '../../packages/core/src/index'
import { SEED_TEACHERS } from '../../packages/data/src/seed'

const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return v.length ? `array[${v.map(q).join(', ')}]::text[]` : `'{}'::text[]`
  return `'${String(v).replace(/'/g, "''")}'`
}
const row = (values: unknown[]) => `  (${values.map(q).join(', ')})`

const out: string[] = ['-- Généré par supabase/scripts/generate-seed.ts. Ne pas modifier à la main.', '']

out.push('insert into public.countries (code, currency, payments) values')
out.push(COUNTRIES.map((c) => row([c.code, c.currency, c.payments])).join(',\n') + ';', '')

out.push('insert into public.plans (id, sessions) values')
out.push(PLANS.map((p) => row([p.id, p.sessions])).join(',\n') + ';', '')

out.push('insert into public.pricing_settings (xof_to_gmd, eur_to_usd, eur_to_cad, trial_discount, escrow_hours, free_cancel_hours, booking_lead_minutes) values')
out.push(row([DEMO_RATES.XOF_TO_GMD, DEMO_RATES.EUR_TO_USD, DEMO_RATES.EUR_TO_CAD, TRIAL_DISCOUNT, ESCROW_HOURS, FREE_CANCEL_HOURS, 120]) + ';', '')

out.push('insert into public.teachers (id, name, gender, city, country_label, timezone, headline, bio, subjects, arabic_tracks, languages, riwayat, madhahib, levels, age_groups, rate_xof, rate_eur, identity_verified, diploma_verified, ijaza_verified, hours_taught, rating, disputes, published) values')
out.push(SEED_TEACHERS.map((t) => row([
  t.id, t.name, t.gender, t.city, t.countryLabel, t.timezone, t.headline, t.bio, t.subjects, t.arabicTracks, t.languages, t.riwayat,
  t.madhahib, t.levels, t.ageGroups, t.rates.XOF, t.rates.EUR, t.verification.identity, t.verification.diploma, t.verification.ijaza,
  t.hoursTaught, t.rating, t.disputes, true,
])).join(',\n') + ';', '')

out.push('insert into public.teacher_credentials (teacher_id, kind, title, institution, year, riwaya, sanad, position) values')
out.push(SEED_TEACHERS.flatMap((t) => t.credentials.map((c, i) => row([t.id, c.kind, c.title, c.institution, c.year, c.riwaya, c.sanad ?? null, i]))).join(',\n') + ';', '')

out.push('insert into public.availability_rules (teacher_id, weekday, start_min, end_min) values')
out.push(SEED_TEACHERS.flatMap((t) => t.availability.map((a) => row([t.id, a.weekday, a.start, a.end]))).join(',\n') + ';', '')

out.push('insert into public.reviews (teacher_id, author, rating, body, date_label, position) values')
out.push(SEED_TEACHERS.flatMap((t) => t.reviews.map((r, i) => row([t.id, r.author, r.rating, r.text, r.date, i]))).join(',\n') + ';')

console.log(out.join('\n'))
