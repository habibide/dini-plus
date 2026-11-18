-- Un seul essai actif par élève et par enseignant, garanti par la base même si deux réservations arrivent en même temps.
create unique index bookings_one_trial on public.bookings (learner_id, teacher_id)
  where kind = 'trial' and status not in ('cancelled', 'refunded');
