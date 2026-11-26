-- Commission de DINE : 15 % fixes sur chaque paiement, pour tous les enseignants
-- (remplace la grille 30 / 25 / 20 / 15 % selon les heures enseignées).
-- Même signature : credit_teacher continue de l'appeler, les écritures déjà passées gardent leur taux.
create or replace function private.commission_rate(p_hours numeric) returns numeric
language sql immutable set search_path = '' as $$
  select 0.15::numeric
$$;
