-- Généré par supabase/scripts/generate-seed.ts. Ne pas modifier à la main.

insert into public.countries (code, currency, payments) values
  ('SN', 'XOF', array['wave', 'orange_money', 'card']::text[]),
  ('GM', 'GMD', array['wave', 'afrimoney', 'card']::text[]),
  ('FR', 'EUR', array['card']::text[]),
  ('US', 'USD', array['card']::text[]),
  ('CA', 'CAD', array['card']::text[]);

insert into public.plans (id, sessions) values
  ('discovery', 4),
  ('regular', 8),
  ('intensive', 12),
  ('hifz', 20);

insert into public.pricing_settings (xof_to_gmd, eur_to_usd, eur_to_cad, trial_discount, escrow_hours, free_cancel_hours, booking_lead_minutes) values
  (0.115, 1.08, 1.5, 0.5, 48, 24, 120);

insert into public.teachers (id, name, gender, city, country_label, timezone, headline, bio, subjects, arabic_tracks, languages, riwayat, madhahib, levels, age_groups, rate_xof, rate_eur, identity_verified, diploma_verified, ijaza_verified, hours_taught, rating, disputes, published) values
  ('t-aissatou', 'Aïssatou Ndiaye', 'F', 'Dakar', 'Sénégal', 'Africa/Dakar', 'Coran et tajwid pour enfants et jeunes filles, riwaya Warsh', 'J’accompagne les enfants dans la mémorisation depuis neuf ans, d’abord en daara puis en ligne. Chaque séance suit le même rythme : révision de la veille, nouveau passage, puis tajwid. Les parents reçoivent un compte rendu après chaque cours.', array['quran', 'tajwid', 'azkar']::text[], '{}'::text[], array['fr', 'wo']::text[], array['Warsh']::text[], array['Maliki']::text[], array['beginner', 'intermediate']::text[], array['child', 'teen']::text[], 2500, 7, true, true, true, 142, 4.9, 0, true),
  ('t-lamin', 'Lamin Jallow', 'M', 'Serrekunda', 'Gambie', 'Africa/Banjul', 'Coran et lecture de l’arabe, en mandingue, wolof et anglais', 'Enseignant à Serrekunda depuis douze ans, je fais lire le mushaf aux enfants et aux adultes. Cours en mandingue, en wolof ou en anglais, avec un peu de français.', array['quran', 'arabic', 'tajwid']::text[], array['reading', 'writing']::text[], array['mnk', 'wo', 'fr']::text[], array['Warsh']::text[], array['Maliki']::text[], array['beginner', 'intermediate']::text[], array['child', 'teen', 'adult']::text[], 2000, 6, true, false, true, 96, 4.8, 0, true),
  ('t-fatimata', 'Fatimata Ba', 'F', 'Saint-Louis', 'Sénégal', 'Africa/Dakar', 'Coran pour enfants, en peul et en français', 'Formée dans une famille d’enseignants du Fouta, je suis des enfants du Sénégal et de la diaspora. Je fixe avec les parents un objectif réaliste pour chaque trimestre.', array['quran', 'azkar']::text[], '{}'::text[], array['ff', 'fr', 'wo']::text[], array['Warsh']::text[], array['Maliki']::text[], array['beginner']::text[], array['child']::text[], 2000, 6, true, false, true, 76, 4.8, 0, true),
  ('t-ousmane', 'Ousmane Fall', 'M', 'Thiès', 'Sénégal', 'Africa/Dakar', 'Arabe : lire, écrire et parler, pour adolescents et adultes', 'Diplômé de Médine, j’enseigne l’arabe aux élèves qui veulent comprendre les textes directement. En français ou en wolof.', array['arabic', 'aqida', 'history']::text[], array['reading', 'writing', 'practice']::text[], array['fr', 'wo']::text[], array['Warsh']::text[], array['Maliki']::text[], array['beginner', 'intermediate', 'advanced']::text[], array['teen', 'adult']::text[], 3500, 9, true, true, false, 118, 4.8, 0, true),
  ('t-khady', 'Khady Faye', 'F', 'Fatick', 'Sénégal', 'Africa/Dakar', 'Fiqh maliki et azkar pour femmes adultes, en sérère et en français', 'J’enseigne aux femmes qui reprennent l’étude à l’âge adulte : la prière, la purification, les invocations du quotidien. On avance à votre rythme, sans jugement.', array['fiqh', 'azkar', 'aqida']::text[], '{}'::text[], array['srr', 'fr', 'wo']::text[], array['Warsh']::text[], array['Maliki']::text[], array['beginner', 'intermediate']::text[], array['adult']::text[], 3000, 8, true, true, false, 64, 5, 0, true),
  ('t-modibo', 'Modibo Keïta', 'M', 'Tambacounda', 'Sénégal', 'Africa/Dakar', 'Hadith et fiqh maliki, en bambara et en français', 'Imam et enseignant, je propose un parcours structuré en hadith et en fiqh maliki pour les adultes, avec des exemples tirés de la vie de tous les jours.', array['hadith', 'fiqh', 'history']::text[], '{}'::text[], array['bm', 'fr', 'mnk']::text[], array['Warsh']::text[], array['Maliki']::text[], array['beginner', 'intermediate']::text[], array['adult']::text[], 2500, 7, true, true, false, 34, 4.6, 0, true),
  ('t-ndeye', 'Ndèye Sarr', 'F', 'Kaolack', 'Sénégal', 'Africa/Dakar', 'Hifz intensif pour jeunes filles, cinq séances par semaine', 'Hafiza depuis l’âge de quinze ans, je travaille avec des adolescentes qui veulent terminer leur mémorisation. Séances courtes et quotidiennes.', array['quran', 'tajwid']::text[], '{}'::text[], array['wo', 'fr']::text[], array['Warsh', 'Hafs']::text[], array['Maliki']::text[], array['intermediate', 'advanced']::text[], array['child', 'teen']::text[], 3000, 8, true, true, true, 52, 4.7, 0, true),
  ('t-ebrima', 'Ebrima Ceesay', 'M', 'Banjul', 'Gambie', 'Africa/Banjul', 'Tajwid avancé, riwaya Hafs, pour adolescents et adultes', 'Formé au Caire, j’accompagne les élèves avancés vers une récitation maîtrisée. Cours en anglais, en wolof ou en mandingue.', array['tajwid', 'quran']::text[], '{}'::text[], array['wo', 'mnk']::text[], array['Hafs', 'Warsh']::text[], array['Maliki', 'Shafi’i']::text[], array['intermediate', 'advanced']::text[], array['teen', 'adult']::text[], 4500, 12, true, true, true, 230, 4.9, 0, true),
  ('t-mariama', 'Mariama Sow', 'F', 'Ziguinchor', 'Sénégal', 'Africa/Dakar', 'Arabe pour enfants : lire et écrire, en soosé, mandingue et français', 'Professeure d’arabe en Casamance, j’enseigne l’alphabet et les premières phrases aux enfants de 5 à 12 ans. Séances courtes, beaucoup de lecture à voix haute.', array['arabic', 'quran']::text[], array['reading', 'writing']::text[], array['soce', 'mnk', 'fr']::text[], array['Warsh']::text[], array['Maliki']::text[], array['beginner']::text[], array['child']::text[], 2000, 6, true, true, false, 18, 4.8, 0, true),
  ('t-aminata', 'Aminata Diallo', 'F', 'Paris', 'France', 'Europe/Paris', 'Initiation pour adultes : aqida, azkar et histoire de l’islam', 'Beaucoup de mes élèves reprennent tout de zéro ou découvrent l’islam. On commence par ce dont vous avez besoin aujourd’hui, avec des mots simples.', array['aqida', 'azkar', 'history', 'fiqh']::text[], '{}'::text[], array['fr', 'ff']::text[], array['Hafs']::text[], array['Maliki']::text[], array['beginner']::text[], array['adult', 'teen']::text[], 4000, 10, true, true, false, 88, 4.9, 0, true);

insert into public.teacher_credentials (teacher_id, kind, title, institution, year, riwaya, sanad, position) values
  ('t-aissatou', 'ijaza', 'Ijaza de récitation, riwaya Warsh', 'Transmise par Oustaz Malick Gaye, Dakar', 2016, 'Warsh', array['Aïssatou Ndiaye', 'Oustaz Malick Gaye', 'Cheikh Abdou Fall']::text[], 0),
  ('t-aissatou', 'diploma', 'Licence en sciences coraniques', 'Institut islamique de Dakar', 2014, null, null, 1),
  ('t-lamin', 'ijaza', 'Ijaza de récitation, riwaya Warsh', 'Transmise par Alhaji Ousman Touray, Brikama', 2012, 'Warsh', array['Lamin Jallow', 'Alhaji Ousman Touray', 'Alhaji Kebba Sanneh']::text[], 0),
  ('t-fatimata', 'ijaza', 'Ijaza de récitation, riwaya Warsh', 'Transmise par Thierno Amadou Sy, Podor', 2017, 'Warsh', array['Fatimata Ba', 'Thierno Amadou Sy', 'Thierno Mamadou Kane']::text[], 0),
  ('t-ousmane', 'diploma', 'Licence de langue arabe', 'Université islamique de Médine', 2015, null, null, 0),
  ('t-khady', 'diploma', 'Certificat d’études islamiques', 'Institut islamique de Dakar', 2018, null, null, 0),
  ('t-modibo', 'diploma', 'Licence en études islamiques', 'Université Al-Azhar', 2009, null, null, 0),
  ('t-ndeye', 'ijaza', 'Ijaza de récitation, riwaya Warsh', 'Transmise par Astou Seck, Kaolack', 2019, 'Warsh', array['Ndèye Sarr', 'Astou Seck', 'Oustaz Modou Lo']::text[], 0),
  ('t-ndeye', 'diploma', 'Certificat d’études coraniques', 'Institut islamique de Dakar', 2020, null, null, 1),
  ('t-ebrima', 'ijaza', 'Ijaza de récitation, riwaya Hafs', 'Transmise par Cheikh Hassan Zaki, Le Caire', 2013, 'Hafs', array['Ebrima Ceesay', 'Cheikh Hassan Zaki', 'Cheikh Mahmoud Salem']::text[], 0),
  ('t-ebrima', 'diploma', 'Master en sciences du Coran', 'Université Al-Azhar', 2012, null, null, 1),
  ('t-mariama', 'diploma', 'Licence de langue arabe', 'Université Cheikh Anta Diop', 2019, null, null, 0),
  ('t-aminata', 'diploma', 'Licence en sciences islamiques', 'Université Zitouna', 2016, null, null, 0);

insert into public.availability_rules (teacher_id, weekday, start_min, end_min) values
  ('t-aissatou', 1, 1020, 1200),
  ('t-aissatou', 2, 1020, 1200),
  ('t-aissatou', 3, 1020, 1200),
  ('t-aissatou', 4, 1020, 1200),
  ('t-aissatou', 6, 540, 720),
  ('t-lamin', 0, 1080, 1260),
  ('t-lamin', 2, 1080, 1260),
  ('t-lamin', 4, 1080, 1260),
  ('t-lamin', 6, 600, 780),
  ('t-fatimata', 0, 540, 660),
  ('t-fatimata', 1, 540, 660),
  ('t-fatimata', 3, 540, 660),
  ('t-fatimata', 5, 540, 660),
  ('t-fatimata', 1, 1020, 1140),
  ('t-fatimata', 3, 1020, 1140),
  ('t-ousmane', 1, 1080, 1260),
  ('t-ousmane', 2, 1080, 1260),
  ('t-ousmane', 3, 1080, 1260),
  ('t-ousmane', 5, 1080, 1260),
  ('t-khady', 1, 600, 720),
  ('t-khady', 3, 600, 720),
  ('t-khady', 5, 600, 720),
  ('t-khady', 2, 1200, 1320),
  ('t-khady', 4, 1200, 1320),
  ('t-modibo', 0, 1140, 1320),
  ('t-modibo', 2, 1140, 1320),
  ('t-modibo', 4, 1140, 1320),
  ('t-ndeye', 1, 420, 480),
  ('t-ndeye', 2, 420, 480),
  ('t-ndeye', 3, 420, 480),
  ('t-ndeye', 4, 420, 480),
  ('t-ndeye', 5, 420, 480),
  ('t-ndeye', 1, 1020, 1110),
  ('t-ndeye', 2, 1020, 1110),
  ('t-ndeye', 3, 1020, 1110),
  ('t-ndeye', 4, 1020, 1110),
  ('t-ndeye', 5, 1020, 1110),
  ('t-ebrima', 0, 540, 720),
  ('t-ebrima', 6, 540, 720),
  ('t-ebrima', 2, 1140, 1260),
  ('t-ebrima', 4, 1140, 1260),
  ('t-mariama', 2, 900, 1080),
  ('t-mariama', 3, 900, 1080),
  ('t-mariama', 6, 900, 1080),
  ('t-aminata', 1, 1140, 1260),
  ('t-aminata', 3, 1140, 1260),
  ('t-aminata', 6, 600, 720);

insert into public.reviews (teacher_id, author, rating, body, date_label, position) values
  ('t-aissatou', 'Rokhaya, mère de deux enfants', 5, 'Ma fille récite maintenant sans que je le lui demande. Je sais chaque semaine où elle en est.', 'septembre 2026', 0),
  ('t-aissatou', 'Mamadou, père à Lyon', 5, 'Patiente et exigeante. Les comptes rendus sont précis, verset par verset.', 'août 2026', 1),
  ('t-lamin', 'Isatou, mère à Londres', 5, 'Mes enfants comprennent ses explications en mandingue, c’est ce que je cherchais.', 'octobre 2026', 0),
  ('t-fatimata', 'Kadiatou, Paris', 5, 'Mes deux enfants lui récitent avec plaisir, et je reçois un compte rendu après chaque cours.', 'octobre 2026', 0),
  ('t-ousmane', 'Pape, Toulouse', 5, 'Mon fils de 13 ans comprend enfin la grammaire.', 'septembre 2026', 0),
  ('t-khady', 'Coumba, Montréal', 5, 'J’avais honte de recommencer à 40 ans. Elle m’a remise en confiance.', 'septembre 2026', 0),
  ('t-modibo', 'Adama, New York', 5, 'Clair, et il répond vraiment aux questions de la vie quotidienne.', 'août 2026', 0),
  ('t-ndeye', 'Dieynaba, Milan', 5, 'Ma fille a repris le rythme en deux semaines.', 'septembre 2026', 0),
  ('t-ebrima', 'Yacine, Bruxelles', 5, 'Il entend tout. En trois mois mon articulation a changé.', 'octobre 2026', 0),
  ('t-mariama', 'Aminata, Atlanta', 5, 'Ma fille attend le cours toute la semaine.', 'septembre 2026', 0),
  ('t-aminata', 'Élodie, Bordeaux', 5, 'Je n’osais poser mes questions nulle part. Ici, oui.', 'octobre 2026', 0);
