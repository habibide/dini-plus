-- Retire les 10 enseignants d'exemple créés par 20261107120400_catalog_seed.sql :
-- seuls les vrais enseignants (candidature approuvée) restent visibles sur le site.
do $$
declare
  ids text[] := array['t-aissatou','t-aminata','t-ebrima','t-fatimata','t-khady','t-lamin','t-mariama','t-modibo','t-ndeye','t-ousmane'];
begin
  delete from public.ledger_entries
   where teacher_id = any(ids) or booking_id in (select id from public.bookings where teacher_id = any(ids));
  delete from public.payments where booking_id in (select id from public.bookings where teacher_id = any(ids));
  delete from public.bookings where teacher_id = any(ids);
  delete from public.subscriptions where teacher_id = any(ids);
  delete from public.teachers where id = any(ids) and user_id is null;
end $$;
