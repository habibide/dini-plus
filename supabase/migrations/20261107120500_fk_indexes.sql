-- Index des deux clés étrangères signalées par le conseiller de performance Supabase.
create index on public.families (country);
create index on public.subscriptions (plan_id);
