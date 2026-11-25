-- Invitation : élèves de la famille déjà inscrits, pour qu'une famille puisse inscrire un autre enfant.
create or replace function public.group_by_code(p_code text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  g public.groups;
  fam public.families;
  share_amount numeric;
  share_currency text;
begin
  select * into g from public.groups where invite_code = upper(trim(p_code));
  if g.id is null then raise exception 'group_not_found' using errcode = 'P0001'; end if;
  select * into fam from public.families where owner_id = (select auth.uid());
  if fam.id is not null then select x.amount, x.currency into share_amount, share_currency from private.group_share(g.id, fam.country) x; end if;
  return jsonb_build_object(
    'id', g.id, 'teacherId', g.teacher_id, 'teacherName', (select name from public.teachers where id = g.teacher_id),
    'teacherTimezone', (select timezone from public.teachers where id = g.teacher_id),
    'subject', g.subject, 'planId', g.plan_id, 'slots', g.slots, 'status', g.status, 'paymentDeadline', g.payment_deadline,
    'members', private.active_members(g.id), 'max', (select group_max from public.pricing_settings), 'min', (select group_min from public.pricing_settings),
    'isMember', exists (select 1 from public.group_members m where m.group_id = g.id and m.status in ('joined', 'paid') and private.owns_family(m.family_id)),
    'myLearners', (select coalesce(jsonb_agg(m.learner_id), '[]'::jsonb) from public.group_members m
      where m.group_id = g.id and m.status in ('joined', 'paid') and private.owns_family(m.family_id)),
    'share', case when share_amount is not null then jsonb_build_object('amount', share_amount, 'currency', share_currency) end
  );
end
$$;
