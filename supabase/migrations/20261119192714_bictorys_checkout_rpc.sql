-- Le rôle serveur (service_role) n'a pas accès direct aux tables : l'Edge Function create-payment
-- passe par ces deux fonctions, appelables par lui seul.

/** Données nécessaires pour ouvrir le paiement, si p_user est bien la famille du paiement (sinon null). */
create function public.bictorys_checkout_context(p_payment uuid, p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'amount', p.amount, 'currency', p.currency, 'method', p.method,
    'provider', p.provider, 'status', p.status, 'checkout_url', p.checkout_url, 'booking_id', p.booking_id,
    'booking_status', b.status, 'hold_until', b.hold_until,
    'full_name', (select pr.full_name from public.profiles pr where pr.id = f.owner_id)
  )
  from public.payments p
  join public.families f on f.id = p.family_id
  left join public.bookings b on b.id = p.booking_id
  where p.id = p_payment and f.owner_id = p_user
$$;

/** Mémorise la page de paiement créée chez Bictorys (réutilisée si la famille la redemande). */
create function public.bictorys_save_checkout(p_payment uuid, p_url text, p_ref text) returns void
language sql security definer set search_path = '' as $$
  update public.payments set checkout_url = p_url, provider_ref = coalesce(p_ref, provider_ref), updated_at = now()
  where id = p_payment and provider = 'bictorys' and status = 'pending'
$$;

revoke execute on function public.bictorys_checkout_context(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.bictorys_save_checkout(uuid, text, text) from public, anon, authenticated;
grant execute on function public.bictorys_checkout_context(uuid, uuid) to service_role;
grant execute on function public.bictorys_save_checkout(uuid, text, text) to service_role;
