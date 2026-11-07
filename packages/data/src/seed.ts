import { DAY, HOUR, generateSlots, type Booking, type Family, type Learner, type Subscription, type Teacher } from '@dini/core'

// Données de démonstration. Toutes les personnes, avis, diplômes et sanad sont fictifs.

const h = (hh: number, mm = 0) => hh * 60 + mm
const week = (days: number[], start: number, end: number) => days.map((weekday) => ({ weekday, start, end }))

export const SEED_TEACHERS: Teacher[] = [
  {
    id: 't-aissatou', name: 'Aïssatou Ndiaye', gender: 'F', city: 'Dakar', countryLabel: 'Sénégal', timezone: 'Africa/Dakar',
    headline: 'Coran et tajwid pour enfants et jeunes filles, riwaya Warsh',
    bio: 'J’accompagne les enfants dans la mémorisation depuis neuf ans, d’abord en daara puis en ligne. Chaque séance suit le même rythme : révision de la veille, nouveau passage, puis tajwid. Les parents reçoivent un compte rendu après chaque cours.',
    subjects: ['quran', 'tajwid', 'azkar'], arabicTracks: [], languages: ['fr', 'wo'], riwayat: ['Warsh'], madhahib: ['Maliki'],
    levels: ['beginner', 'intermediate'], ageGroups: ['child', 'teen'], rates: { XOF: 2500, EUR: 7 },
    verification: { identity: true, diploma: true, ijaza: true }, hoursTaught: 142, rating: 4.9, disputes: 0,
    credentials: [
      { kind: 'ijaza', title: 'Ijaza de récitation, riwaya Warsh', institution: 'Transmise par Oustaz Malick Gaye, Dakar', year: 2016, riwaya: 'Warsh', sanad: ['Aïssatou Ndiaye', 'Oustaz Malick Gaye', 'Cheikh Abdou Fall'] },
      { kind: 'diploma', title: 'Licence en sciences coraniques', institution: 'Institut islamique de Dakar', year: 2014 },
    ],
    availability: [...week([1, 2, 3, 4], h(17), h(20)), ...week([6], h(9), h(12))],
    reviews: [
      { author: 'Rokhaya, mère de deux enfants', rating: 5, text: 'Ma fille récite maintenant sans que je le lui demande. Je sais chaque semaine où elle en est.', date: 'septembre 2026' },
      { author: 'Mamadou, père à Lyon', rating: 5, text: 'Patiente et exigeante. Les comptes rendus sont précis, verset par verset.', date: 'août 2026' },
    ],
  },
  {
    id: 't-lamin', name: 'Lamin Jallow', gender: 'M', city: 'Serrekunda', countryLabel: 'Gambie', timezone: 'Africa/Banjul',
    headline: 'Coran et lecture de l’arabe, en mandingue, wolof et anglais',
    bio: 'Enseignant à Serrekunda depuis douze ans, je fais lire le mushaf aux enfants et aux adultes. Cours en mandingue, en wolof ou en anglais, avec un peu de français.',
    subjects: ['quran', 'arabic', 'tajwid'], arabicTracks: ['reading', 'writing'], languages: ['mnk', 'wo', 'fr'], riwayat: ['Warsh'], madhahib: ['Maliki'],
    levels: ['beginner', 'intermediate'], ageGroups: ['child', 'teen', 'adult'], rates: { XOF: 2000, EUR: 6 },
    verification: { identity: true, diploma: false, ijaza: true }, hoursTaught: 96, rating: 4.8, disputes: 0,
    credentials: [{ kind: 'ijaza', title: 'Ijaza de récitation, riwaya Warsh', institution: 'Transmise par Alhaji Ousman Touray, Brikama', year: 2012, riwaya: 'Warsh', sanad: ['Lamin Jallow', 'Alhaji Ousman Touray', 'Alhaji Kebba Sanneh'] }],
    availability: [...week([0, 2, 4], h(18), h(21)), ...week([6], h(10), h(13))],
    reviews: [{ author: 'Isatou, mère à Londres', rating: 5, text: 'Mes enfants comprennent ses explications en mandingue, c’est ce que je cherchais.', date: 'octobre 2026' }],
  },
  {
    id: 't-fatimata', name: 'Fatimata Ba', gender: 'F', city: 'Saint-Louis', countryLabel: 'Sénégal', timezone: 'Africa/Dakar',
    headline: 'Coran pour enfants, en peul et en français',
    bio: 'Formée dans une famille d’enseignants du Fouta, je suis des enfants du Sénégal et de la diaspora. Je fixe avec les parents un objectif réaliste pour chaque trimestre.',
    subjects: ['quran', 'azkar'], arabicTracks: [], languages: ['ff', 'fr', 'wo'], riwayat: ['Warsh'], madhahib: ['Maliki'],
    levels: ['beginner'], ageGroups: ['child'], rates: { XOF: 2000, EUR: 6 },
    verification: { identity: true, diploma: false, ijaza: true }, hoursTaught: 76, rating: 4.8, disputes: 0,
    credentials: [{ kind: 'ijaza', title: 'Ijaza de récitation, riwaya Warsh', institution: 'Transmise par Thierno Amadou Sy, Podor', year: 2017, riwaya: 'Warsh', sanad: ['Fatimata Ba', 'Thierno Amadou Sy', 'Thierno Mamadou Kane'] }],
    availability: [...week([0, 1, 3, 5], h(9), h(11)), ...week([1, 3], h(17), h(19))],
    reviews: [{ author: 'Kadiatou, Paris', rating: 5, text: 'Mes deux enfants lui récitent avec plaisir, et je reçois un compte rendu après chaque cours.', date: 'octobre 2026' }],
  },
  {
    id: 't-ousmane', name: 'Ousmane Fall', gender: 'M', city: 'Thiès', countryLabel: 'Sénégal', timezone: 'Africa/Dakar',
    headline: 'Arabe : lire, écrire et parler, pour adolescents et adultes',
    bio: 'Diplômé de Médine, j’enseigne l’arabe aux élèves qui veulent comprendre les textes directement. En français ou en wolof.',
    subjects: ['arabic', 'aqida', 'history'], arabicTracks: ['reading', 'writing', 'practice'], languages: ['fr', 'wo'], riwayat: ['Warsh'], madhahib: ['Maliki'],
    levels: ['beginner', 'intermediate', 'advanced'], ageGroups: ['teen', 'adult'], rates: { XOF: 3500, EUR: 9 },
    verification: { identity: true, diploma: true, ijaza: false }, hoursTaught: 118, rating: 4.8, disputes: 0,
    credentials: [{ kind: 'diploma', title: 'Licence de langue arabe', institution: 'Université islamique de Médine', year: 2015 }],
    availability: week([1, 2, 3, 5], h(18), h(21)),
    reviews: [{ author: 'Pape, Toulouse', rating: 5, text: 'Mon fils de 13 ans comprend enfin la grammaire.', date: 'septembre 2026' }],
  },
  {
    id: 't-khady', name: 'Khady Faye', gender: 'F', city: 'Fatick', countryLabel: 'Sénégal', timezone: 'Africa/Dakar',
    headline: 'Fiqh maliki et azkar pour femmes adultes, en sérère et en français',
    bio: 'J’enseigne aux femmes qui reprennent l’étude à l’âge adulte : la prière, la purification, les invocations du quotidien. On avance à votre rythme, sans jugement.',
    subjects: ['fiqh', 'azkar', 'aqida'], arabicTracks: [], languages: ['srr', 'fr', 'wo'], riwayat: ['Warsh'], madhahib: ['Maliki'],
    levels: ['beginner', 'intermediate'], ageGroups: ['adult'], rates: { XOF: 3000, EUR: 8 },
    verification: { identity: true, diploma: true, ijaza: false }, hoursTaught: 64, rating: 5, disputes: 0,
    credentials: [{ kind: 'diploma', title: 'Certificat d’études islamiques', institution: 'Institut islamique de Dakar', year: 2018 }],
    availability: [...week([1, 3, 5], h(10), h(12)), ...week([2, 4], h(20), h(22))],
    reviews: [{ author: 'Coumba, Montréal', rating: 5, text: 'J’avais honte de recommencer à 40 ans. Elle m’a remise en confiance.', date: 'septembre 2026' }],
  },
  {
    id: 't-modibo', name: 'Modibo Keïta', gender: 'M', city: 'Tambacounda', countryLabel: 'Sénégal', timezone: 'Africa/Dakar',
    headline: 'Hadith et fiqh maliki, en bambara et en français',
    bio: 'Imam et enseignant, je propose un parcours structuré en hadith et en fiqh maliki pour les adultes, avec des exemples tirés de la vie de tous les jours.',
    subjects: ['hadith', 'fiqh', 'history'], arabicTracks: [], languages: ['bm', 'fr', 'mnk'], riwayat: ['Warsh'], madhahib: ['Maliki'],
    levels: ['beginner', 'intermediate'], ageGroups: ['adult'], rates: { XOF: 2500, EUR: 7 },
    verification: { identity: true, diploma: true, ijaza: false }, hoursTaught: 34, rating: 4.6, disputes: 0,
    credentials: [{ kind: 'diploma', title: 'Licence en études islamiques', institution: 'Université Al-Azhar', year: 2009 }],
    availability: week([0, 2, 4], h(19), h(22)),
    reviews: [{ author: 'Adama, New York', rating: 5, text: 'Clair, et il répond vraiment aux questions de la vie quotidienne.', date: 'août 2026' }],
  },
  {
    id: 't-ndeye', name: 'Ndèye Sarr', gender: 'F', city: 'Kaolack', countryLabel: 'Sénégal', timezone: 'Africa/Dakar',
    headline: 'Hifz intensif pour jeunes filles, cinq séances par semaine',
    bio: 'Hafiza depuis l’âge de quinze ans, je travaille avec des adolescentes qui veulent terminer leur mémorisation. Séances courtes et quotidiennes.',
    subjects: ['quran', 'tajwid'], arabicTracks: [], languages: ['wo', 'fr'], riwayat: ['Warsh', 'Hafs'], madhahib: ['Maliki'],
    levels: ['intermediate', 'advanced'], ageGroups: ['child', 'teen'], rates: { XOF: 3000, EUR: 8 },
    verification: { identity: true, diploma: true, ijaza: true }, hoursTaught: 52, rating: 4.7, disputes: 0,
    credentials: [
      { kind: 'ijaza', title: 'Ijaza de récitation, riwaya Warsh', institution: 'Transmise par Astou Seck, Kaolack', year: 2019, riwaya: 'Warsh', sanad: ['Ndèye Sarr', 'Astou Seck', 'Oustaz Modou Lo'] },
      { kind: 'diploma', title: 'Certificat d’études coraniques', institution: 'Institut islamique de Dakar', year: 2020 },
    ],
    availability: [...week([1, 2, 3, 4, 5], h(7), h(8)), ...week([1, 2, 3, 4, 5], h(17), h(18, 30))],
    reviews: [{ author: 'Dieynaba, Milan', rating: 5, text: 'Ma fille a repris le rythme en deux semaines.', date: 'septembre 2026' }],
  },
  {
    id: 't-ebrima', name: 'Ebrima Ceesay', gender: 'M', city: 'Banjul', countryLabel: 'Gambie', timezone: 'Africa/Banjul',
    headline: 'Tajwid avancé, riwaya Hafs, pour adolescents et adultes',
    bio: 'Formé au Caire, j’accompagne les élèves avancés vers une récitation maîtrisée. Cours en anglais, en wolof ou en mandingue.',
    subjects: ['tajwid', 'quran'], arabicTracks: [], languages: ['wo', 'mnk'], riwayat: ['Hafs', 'Warsh'], madhahib: ['Maliki', 'Shafi’i'],
    levels: ['intermediate', 'advanced'], ageGroups: ['teen', 'adult'], rates: { XOF: 4500, EUR: 12 },
    verification: { identity: true, diploma: true, ijaza: true }, hoursTaught: 230, rating: 4.9, disputes: 0,
    credentials: [
      { kind: 'ijaza', title: 'Ijaza de récitation, riwaya Hafs', institution: 'Transmise par Cheikh Hassan Zaki, Le Caire', year: 2013, riwaya: 'Hafs', sanad: ['Ebrima Ceesay', 'Cheikh Hassan Zaki', 'Cheikh Mahmoud Salem'] },
      { kind: 'diploma', title: 'Master en sciences du Coran', institution: 'Université Al-Azhar', year: 2012 },
    ],
    availability: [...week([0, 6], h(9), h(12)), ...week([2, 4], h(19), h(21))],
    reviews: [{ author: 'Yacine, Bruxelles', rating: 5, text: 'Il entend tout. En trois mois mon articulation a changé.', date: 'octobre 2026' }],
  },
  {
    id: 't-mariama', name: 'Mariama Sow', gender: 'F', city: 'Ziguinchor', countryLabel: 'Sénégal', timezone: 'Africa/Dakar',
    headline: 'Arabe pour enfants : lire et écrire, en soosé, mandingue et français',
    bio: 'Professeure d’arabe en Casamance, j’enseigne l’alphabet et les premières phrases aux enfants de 5 à 12 ans. Séances courtes, beaucoup de lecture à voix haute.',
    subjects: ['arabic', 'quran'], arabicTracks: ['reading', 'writing'], languages: ['soce', 'mnk', 'fr'], riwayat: ['Warsh'], madhahib: ['Maliki'],
    levels: ['beginner'], ageGroups: ['child'], rates: { XOF: 2000, EUR: 6 },
    verification: { identity: true, diploma: true, ijaza: false }, hoursTaught: 18, rating: 4.8, disputes: 0,
    credentials: [{ kind: 'diploma', title: 'Licence de langue arabe', institution: 'Université Cheikh Anta Diop', year: 2019 }],
    availability: [...week([2, 3, 6], h(15), h(18))],
    reviews: [{ author: 'Aminata, Atlanta', rating: 5, text: 'Ma fille attend le cours toute la semaine.', date: 'septembre 2026' }],
  },
  {
    id: 't-aminata', name: 'Aminata Diallo', gender: 'F', city: 'Paris', countryLabel: 'France', timezone: 'Europe/Paris',
    headline: 'Initiation pour adultes : aqida, azkar et histoire de l’islam',
    bio: 'Beaucoup de mes élèves reprennent tout de zéro ou découvrent l’islam. On commence par ce dont vous avez besoin aujourd’hui, avec des mots simples.',
    subjects: ['aqida', 'azkar', 'history', 'fiqh'], arabicTracks: [], languages: ['fr', 'ff'], riwayat: ['Hafs'], madhahib: ['Maliki'],
    levels: ['beginner'], ageGroups: ['adult', 'teen'], rates: { XOF: 4000, EUR: 10 },
    verification: { identity: true, diploma: true, ijaza: false }, hoursTaught: 88, rating: 4.9, disputes: 0,
    credentials: [{ kind: 'diploma', title: 'Licence en sciences islamiques', institution: 'Université Zitouna', year: 2016 }],
    availability: [...week([1, 3], h(19), h(21)), ...week([6], h(10), h(12))],
    reviews: [{ author: 'Élodie, Bordeaux', rating: 5, text: 'Je n’osais poser mes questions nulle part. Ici, oui.', date: 'octobre 2026' }],
  },
]

export const SEED_FAMILIES: Family[] = [
  { id: 'fam-diop', parentName: 'Fatou Diop', country: 'FR', timezone: 'Europe/Paris', isAdultLearner: false },
  { id: 'fam-sarr', parentName: 'Marème Sarr', country: 'SN', timezone: 'Africa/Dakar', isAdultLearner: true },
]

export const SEED_LEARNERS: Learner[] = [
  { id: 'l-awa', familyId: 'fam-diop', name: 'Awa Diop', birthYear: 2017, level: 'beginner', goals: 'Mémoriser le dernier juz en riwaya Warsh' },
  { id: 'l-ibrahim', familyId: 'fam-diop', name: 'Ibrahim Diop', birthYear: 2013, level: 'intermediate', goals: 'Lire et comprendre l’arabe' },
  { id: 'l-mareme', familyId: 'fam-sarr', name: 'Marème Sarr', birthYear: 1992, level: 'beginner', goals: 'Reprendre les bases de la prière et des invocations' },
]

/** Séances et forfaits de départ, placés autour de `now` pour que la démo soit toujours vivante. */
export function seedActivity(now: number): { subscriptions: Subscription[]; bookings: Booking[] } {
  const t = (id: string) => SEED_TEACHERS.find((x) => x.id === id)!
  const nextSlot = (id: string, afterDays: number) => generateSlots(t(id).availability, t(id).timezone, now + afterDays * DAY, 14)[0]
  const past = (daysAgo: number) => {
    const d = new Date(now - daysAgo * DAY)
    d.setUTCHours(17, 0, 0, 0)
    return d.getTime()
  }
  const plan = (id: string, learnerId: string, teacherId: string, startsAt: number, status: Booking['status'], extra: Partial<Booking> = {}): Booking => ({
    id, learnerId, teacherId, subscriptionId: learnerId === 'l-awa' ? 's-awa' : 's-ibrahim', kind: 'plan',
    subject: teacherId === 't-ousmane' ? 'arabic' : 'quran', startsAt, minutes: 30, amount: 7, currency: 'EUR', status, ...extra,
  })
  const done = (startsAt: number) => ({ deliveredAt: startsAt + 30 * 60_000 })
  return {
    subscriptions: [
      { id: 's-awa', learnerId: 'l-awa', teacherId: 't-aissatou', planId: 'regular', sessionsPerMonth: 8, sessionsRemaining: 2, price: 56, currency: 'EUR', renewsAt: now + 9 * DAY },
      { id: 's-ibrahim', learnerId: 'l-ibrahim', teacherId: 't-ousmane', planId: 'discovery', sessionsPerMonth: 4, sessionsRemaining: 1, price: 36, currency: 'EUR', renewsAt: now + 13 * DAY },
    ],
    bookings: [
      plan('b-1', 'l-awa', 't-aissatou', past(19), 'validated', { ...done(past(19)), report: { covered: 'Révision complète d’Al-Fatiha', surah: 1, ayahFrom: 1, ayahTo: 7, tajwidNotes: 'Allongements bien tenus.', homework: 'Réciter chaque matin.', comment: 'Très bon départ, Awa est concentrée.' } }),
      plan('b-2', 'l-awa', 't-aissatou', past(15), 'validated', { ...done(past(15)), report: { covered: 'An-Nas mémorisée', surah: 114, ayahFrom: 1, ayahTo: 6, tajwidNotes: 'Attention au « sîn » final.', homework: 'Réviser An-Nas et Al-Falaq.', comment: 'Bonne mémoire, un peu rapide.' } }),
      plan('b-3', 'l-awa', 't-aissatou', past(12), 'validated', { ...done(past(12)), report: { covered: 'Al-Falaq mémorisée', surah: 113, ayahFrom: 1, ayahTo: 5, tajwidNotes: 'Qalqala à consolider.', homework: 'Écouter puis répéter trois fois.', comment: 'Awa progresse bien.' } }),
      plan('b-4', 'l-awa', 't-aissatou', past(8), 'missed'),
      plan('b-5', 'l-awa', 't-aissatou', past(5), 'validated', { ...done(past(5)), report: { covered: 'Al-Ikhlas mémorisée', surah: 112, ayahFrom: 1, ayahTo: 4, tajwidNotes: 'Bonne sortie des lettres emphatiques.', homework: 'Réviser Al-Ikhlas.', comment: 'Séance joyeuse et efficace.' } }),
      plan('b-6', 'l-awa', 't-aissatou', now - 20 * HOUR, 'delivered', { deliveredAt: now - 20 * HOUR + 30 * 60_000, report: { covered: 'Al-Masad, versets 1 à 3', surah: 111, ayahFrom: 1, ayahTo: 3, tajwidNotes: 'Awa confond encore les deux « tâ ».', homework: 'Répéter les versets 1 à 3 avant le prochain cours.', comment: 'Il reste deux versets, on les finit la prochaine fois.' } }),
      plan('b-7', 'l-awa', 't-aissatou', nextSlot('t-aissatou', 1), 'scheduled'),
      plan('b-8', 'l-ibrahim', 't-ousmane', past(16), 'validated', { amount: 9, ...done(past(16)), report: { covered: 'Lecture : les voyelles longues', tajwidNotes: '', homework: 'Lire la page 4 à voix haute.', comment: 'Ibrahim lit déjà de manière fluide.' } }),
      plan('b-9', 'l-ibrahim', 't-ousmane', past(9), 'validated', { amount: 9, ...done(past(9)), report: { covered: 'Écriture : les lettres liées', tajwidNotes: '', homework: 'Copier cinq phrases.', comment: 'À retravailler : les lettres qui ne se lient pas à gauche.' } }),
      plan('b-10', 'l-ibrahim', 't-ousmane', nextSlot('t-ousmane', 2), 'scheduled', { amount: 9 }),
      { id: 'b-11', learnerId: 'l-mareme', teacherId: 't-khady', kind: 'trial', subject: 'fiqh', startsAt: nextSlot('t-khady', 2), minutes: 30, amount: 1500, currency: 'XOF', status: 'scheduled' },
    ],
  }
}
