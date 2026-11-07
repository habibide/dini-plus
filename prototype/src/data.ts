// Catalogue (§5 du document projet) et données de démonstration, toutes fictives.

export const DISCIPLINES = [
  { id: 'lecture', name: 'Lecture du Coran', ar: 'التلاوة', desc: 'Apprendre à lire correctement le mushaf', public: 'Débutants de tout âge' },
  { id: 'hifz', name: 'Hifz (mémorisation)', ar: 'الحفظ', desc: 'Mémoriser avec un plan et des révisions', public: 'Surtout les enfants' },
  { id: 'tajwid', name: 'Tajwid', ar: 'التجويد', desc: 'Règles de récitation, théorie et application', public: 'Tous niveaux' },
  { id: 'qiraat', name: 'Qira’at', ar: 'القراءات', desc: 'Lectures canoniques', public: 'Avancés' },
  { id: 'arabe', name: 'Langue arabe', ar: 'اللغة العربية', desc: 'Grammaire, morphologie, expression', public: 'Tous' },
  { id: 'fiqh', name: 'Fiqh', ar: 'الفقه', desc: 'Jurisprudence, par madhhab', public: 'Adultes' },
  { id: 'aqida', name: 'Aqida', ar: 'العقيدة', desc: 'Croyance et fondements', public: 'Tous' },
  { id: 'sira', name: 'Sira et hadith', ar: 'السيرة والحديث', desc: 'Biographie prophétique, sciences du hadith', public: 'Tous' },
  { id: 'tafsir', name: 'Tafsir', ar: 'التفسير', desc: 'Exégèse coranique', public: 'Niveau intermédiaire et plus' },
  { id: 'initiation', name: 'Initiation', ar: 'التأسيس', desc: 'Prière, ablutions, bases. Parcours nouveau musulman', public: 'Débutants' },
]
export const lowerFirst = (x: string) => x[0].toLowerCase() + x.slice(1)
export const disciplineName = (id: string) => DISCIPLINES.find((d) => d.id === id)?.name ?? id

export const RIWAYAT = ['Warsh', 'Hafs', 'Qalun', 'Douri']
export const MADHAHIB = ['Maliki', 'Hanafi', 'Shafi’i', 'Hanbali']
export const LANGUES = ['français', 'arabe', 'wolof', 'anglais', 'peul', 'bambara']
export const NIVEAUX = ['débutant', 'intermédiaire', 'avancé']
export const AGES = [
  { id: 'enfant', label: 'Enfant (5-12 ans)' },
  { id: 'ado', label: 'Adolescent' },
  { id: 'adulte', label: 'Adulte' },
]

export const PLANS = [
  { id: 'decouverte', name: 'Découverte', n: 4, use: '1 séance par semaine' },
  { id: 'regulier', name: 'Régulier', n: 8, use: '2 séances par semaine' },
  { id: 'intensif', name: 'Intensif', n: 12, use: '3 séances par semaine' },
  { id: 'hifz', name: 'Hifz', n: 20, use: '5 séances par semaine, mémorisation sérieuse' },
]

export const TIERS = [
  { from: 0, to: 20, rate: 0.3 },
  { from: 20, to: 50, rate: 0.25 },
  { from: 50, to: 200, rate: 0.2 },
  { from: 200, to: Infinity, rate: 0.15 },
]
export const commissionFor = (hours: number) => TIERS.find((t) => hours < t.to)!.rate

export const MARKETS: Record<string, { label: string; tz: string; cur: 'EUR' | 'FCFA'; tzLabel: string }> = {
  paris: { label: 'France', tz: 'Europe/Paris', cur: 'EUR', tzLabel: 'heure de Paris' },
  montreal: { label: 'Canada', tz: 'America/Montreal', cur: 'EUR', tzLabel: 'heure de Montréal' },
  dakar: { label: 'Sénégal', tz: 'Africa/Dakar', cur: 'FCFA', tzLabel: 'heure de Dakar' },
  abidjan: { label: 'Côte d’Ivoire', tz: 'Africa/Abidjan', cur: 'FCFA', tzLabel: 'heure d’Abidjan' },
}

export const SURAHS = [
  { id: 'fatiha', name: 'Al-Fatiha', ar: 'الفاتحة', ayat: 7 },
  { id: 'nas', name: 'An-Nas', ar: 'الناس', ayat: 6 },
  { id: 'falaq', name: 'Al-Falaq', ar: 'الفلق', ayat: 5 },
  { id: 'ikhlas', name: 'Al-Ikhlas', ar: 'الإخلاص', ayat: 4 },
  { id: 'masad', name: 'Al-Masad', ar: 'المسد', ayat: 5 },
  { id: 'nasr', name: 'An-Nasr', ar: 'النصر', ayat: 3 },
  { id: 'kafirun', name: 'Al-Kafirun', ar: 'الكافرون', ayat: 6 },
  { id: 'kawthar', name: 'Al-Kawthar', ar: 'الكوثر', ayat: 3 },
  { id: 'maun', name: 'Al-Ma’un', ar: 'الماعون', ayat: 7 },
  { id: 'quraysh', name: 'Quraysh', ar: 'قريش', ayat: 4 },
  { id: 'fil', name: 'Al-Fil', ar: 'الفيل', ayat: 5 },
  { id: 'humaza', name: 'Al-Humaza', ar: 'الهمزة', ayat: 9 },
  { id: 'asr', name: 'Al-Asr', ar: 'العصر', ayat: 3 },
  { id: 'takathur', name: 'At-Takathur', ar: 'التكاثر', ayat: 8 },
  { id: 'qaria', name: 'Al-Qari’a', ar: 'القارعة', ayat: 11 },
  { id: 'adiyat', name: 'Al-Adiyat', ar: 'العاديات', ayat: 11 },
  { id: 'zalzala', name: 'Az-Zalzala', ar: 'الزلزلة', ayat: 8 },
  { id: 'qadr', name: 'Al-Qadr', ar: 'القدر', ayat: 5 },
  { id: 'alaq', name: 'Al-Alaq', ar: 'العلق', ayat: 19 },
  { id: 'naba', name: 'An-Naba', ar: 'النبأ', ayat: 40 },
  { id: 'mulk', name: 'Al-Mulk', ar: 'الملك', ayat: 30 },
  { id: 'yasin', name: 'Ya-Sin', ar: 'يس', ayat: 83 },
]
export const surah = (id: string) => SURAHS.find((x) => x.id === id)!

export type Credential = { type: 'Diplôme' | 'Ijaza'; title: string; institution: string; year: number; riwaya?: string; sanad?: string[] }
export type Review = { author: string; rating: number; text: string; date: string }
export type Teacher = {
  id: string; name: string; gender: 'F' | 'M'; city: string; tz: string; headline: string; bio: string
  subjects: string[]; riwaya: string[]; madhhab: string[]; langs: string[]; levels: string[]; ages: string[]
  rateEur: number; rateFcfa: number; rating: number; hours: number; balance: number
  badges: { identity: boolean; diploma: boolean; ijaza: boolean }
  credentials: Credential[]; days: number[]; utcHours: number[]; reviews: Review[]; isNew?: boolean
}

const R = (author: string, rating: number, text: string, date: string): Review => ({ author, rating, text, date })

export const TEACHERS: Teacher[] = [
  {
    id: 't1', name: 'Aïssatou Ndiaye', gender: 'F', city: 'Dakar', tz: 'Africa/Dakar',
    headline: 'Hifz pour enfants et jeunes filles, en riwaya Warsh',
    bio: 'J’accompagne les enfants dans la mémorisation depuis neuf ans, d’abord en daara puis en ligne. Chaque séance suit le même rythme : révision de la veille, nouveau passage, puis application du tajwid. Les parents reçoivent un compte rendu après chaque cours.',
    subjects: ['hifz', 'lecture', 'tajwid'], riwaya: ['Warsh'], madhhab: ['Maliki'], langs: ['français', 'wolof', 'arabe'], levels: ['débutant', 'intermédiaire'], ages: ['enfant', 'ado'],
    rateEur: 7, rateFcfa: 2500, rating: 4.9, hours: 142, balance: 64,
    badges: { identity: true, diploma: true, ijaza: true },
    credentials: [
      { type: 'Ijaza', title: 'Ijaza de récitation, riwaya Warsh', institution: 'Transmise par Oustaz Malick Gaye, Dakar', year: 2016, riwaya: 'Warsh', sanad: ['Aïssatou Ndiaye', 'Oustaz Malick Gaye', 'Cheikh Abdou Fall'] },
      { type: 'Diplôme', title: 'Licence en sciences coraniques', institution: 'Institut islamique de Dakar', year: 2014 },
    ],
    days: [1, 2, 3, 4, 6], utcHours: [8, 9, 17, 18, 19],
    reviews: [
      R('Rokhaya, mère de deux enfants', 5, 'Ma fille récite maintenant sans que je le lui demande. Je sais chaque semaine où elle en est.', 'septembre 2026'),
      R('Mamadou, père à Lyon', 5, 'Patiente et exigeante. Les comptes rendus sont précis, verset par verset.', 'août 2026'),
      R('Nabou, mère à Dakar', 4, 'Très bonne enseignante, les créneaux du soir partent vite.', 'juillet 2026'),
    ],
  },
  {
    id: 't11', name: 'Fatimata Barry', gender: 'F', city: 'Conakry', tz: 'Africa/Conakry',
    headline: 'Hifz et lecture pour enfants, en français et en peul',
    bio: 'Formée dans une famille d’enseignants du Fouta, je suis des enfants de Guinée et de la diaspora. Je fixe avec les parents un objectif réaliste pour chaque trimestre.',
    subjects: ['hifz', 'lecture'], riwaya: ['Warsh'], madhhab: ['Maliki'], langs: ['français', 'peul', 'arabe'], levels: ['débutant'], ages: ['enfant'],
    rateEur: 6, rateFcfa: 2000, rating: 4.8, hours: 76, balance: 33,
    badges: { identity: true, diploma: false, ijaza: true },
    credentials: [{ type: 'Ijaza', title: 'Ijaza de récitation, riwaya Warsh', institution: 'Transmise par Thierno Oumar Bah, Labé', year: 2017, riwaya: 'Warsh', sanad: ['Fatimata Barry', 'Thierno Oumar Bah', 'Thierno Saïdou Sow'] }],
    days: [0, 1, 3, 5], utcHours: [9, 10, 17, 18],
    reviews: [R('Kadiatou, Paris', 5, 'Mes deux enfants lui récitent avec plaisir, et je reçois un compte rendu après chaque cours.', 'octobre 2026')],
  },
  {
    id: 't12', name: 'Ndèye Sarr', gender: 'F', city: 'Kaolack', tz: 'Africa/Dakar',
    headline: 'Hifz intensif pour jeunes filles, cinq séances par semaine',
    bio: 'Hafiza depuis l’âge de quinze ans, je travaille avec des adolescentes qui veulent terminer leur mémorisation. Séances courtes et quotidiennes, révisions suivies de près.',
    subjects: ['hifz', 'tajwid'], riwaya: ['Warsh', 'Hafs'], madhhab: ['Maliki'], langs: ['français', 'wolof', 'arabe'], levels: ['intermédiaire', 'avancé'], ages: ['ado', 'enfant'],
    rateEur: 8, rateFcfa: 3000, rating: 4.7, hours: 52, balance: 29,
    badges: { identity: true, diploma: true, ijaza: true },
    credentials: [
      { type: 'Ijaza', title: 'Ijaza de récitation, riwaya Warsh', institution: 'Transmise par Astou Seck, Kaolack', year: 2019, riwaya: 'Warsh', sanad: ['Ndèye Sarr', 'Astou Seck', 'Oustaz Modou Lo'] },
      { type: 'Diplôme', title: 'Certificat d’études coraniques', institution: 'Institut islamique de Dakar', year: 2020 },
    ],
    days: [1, 2, 3, 4, 5], utcHours: [7, 16, 17, 21],
    reviews: [R('Dieynaba, Milan', 5, 'Ma fille a repris le rythme en deux semaines.', 'septembre 2026')],
  },
  {
    id: 't2', name: 'Ahmed Mansour', gender: 'M', city: 'Le Caire', tz: 'Africa/Cairo',
    headline: 'Tajwid avancé et qira’at, diplômé d’Al-Azhar',
    bio: 'Enseignant au Caire depuis quinze ans, je prépare les élèves avancés aux lectures canoniques et à l’obtention de l’ijaza. Cours en arabe, en anglais ou en français simple.',
    subjects: ['qiraat', 'tajwid'], riwaya: ['Hafs', 'Warsh', 'Douri'], madhhab: ['Shafi’i'], langs: ['arabe', 'anglais', 'français'], levels: ['intermédiaire', 'avancé'], ages: ['ado', 'adulte'],
    rateEur: 14, rateFcfa: 5500, rating: 4.8, hours: 412, balance: 120,
    badges: { identity: true, diploma: true, ijaza: true },
    credentials: [
      { type: 'Ijaza', title: 'Ijaza des dix lectures', institution: 'Transmise par Cheikh Hassan Zaki, Le Caire', year: 2012, riwaya: 'Hafs', sanad: ['Ahmed Mansour', 'Cheikh Hassan Zaki', 'Cheikh Mahmoud Salem'] },
      { type: 'Diplôme', title: 'Master en qira’at', institution: 'Université Al-Azhar', year: 2010 },
    ],
    days: [0, 1, 3, 5], utcHours: [7, 13, 14, 19],
    reviews: [R('Yacine, Bruxelles', 5, 'Il entend tout. En trois mois mon articulation a changé.', 'octobre 2026'), R('Sara, Montréal', 5, 'Sérieux et très clair sur les règles.', 'juin 2026')],
  },
  {
    id: 't3', name: 'Khadija El Amrani', gender: 'F', city: 'Fès', tz: 'Africa/Casablanca',
    headline: 'Fiqh maliki et arabe pour femmes adultes',
    bio: 'Diplômée d’Al-Qarawiyyin, j’enseigne le fiqh maliki et la langue arabe à des femmes qui reprennent l’étude à l’âge adulte. On avance à votre rythme, sans jugement.',
    subjects: ['fiqh', 'arabe'], riwaya: ['Warsh', 'Qalun'], madhhab: ['Maliki'], langs: ['français', 'arabe'], levels: ['débutant', 'intermédiaire', 'avancé'], ages: ['adulte'],
    rateEur: 12, rateFcfa: 4500, rating: 4.9, hours: 228, balance: 88,
    badges: { identity: true, diploma: true, ijaza: false },
    credentials: [{ type: 'Diplôme', title: 'Licence en charia', institution: 'Université Al-Qarawiyyin', year: 2013 }],
    days: [1, 2, 4, 6], utcHours: [9, 10, 18, 20],
    reviews: [R('Coumba, Paris', 5, 'J’avais honte de recommencer à 40 ans. Elle m’a remise en confiance.', 'septembre 2026')],
  },
  {
    id: 't4', name: 'Mamadou Diallo', gender: 'M', city: 'Conakry', tz: 'Africa/Conakry',
    headline: 'Lecture et hifz pour débutants, en français et en peul',
    bio: 'Maître de daara à Conakry, j’ai formé plus de deux cents enfants à la lecture du mushaf. En ligne, je garde la même méthode, avec des séances courtes et régulières.',
    subjects: ['lecture', 'hifz'], riwaya: ['Warsh'], madhhab: ['Maliki'], langs: ['français', 'peul', 'arabe'], levels: ['débutant', 'intermédiaire'], ages: ['enfant', 'ado', 'adulte'],
    rateEur: 6, rateFcfa: 2000, rating: 4.7, hours: 88, balance: 41,
    badges: { identity: true, diploma: false, ijaza: true },
    credentials: [{ type: 'Ijaza', title: 'Ijaza de récitation, riwaya Warsh', institution: 'Transmise par Thierno Oumar Bah, Labé', year: 2009, riwaya: 'Warsh', sanad: ['Mamadou Diallo', 'Thierno Oumar Bah', 'Thierno Saïdou Sow'] }],
    days: [0, 2, 3, 5, 6], utcHours: [9, 16, 17, 18],
    reviews: [R('Ibrahima, Conakry', 5, 'Mon fils lit maintenant seul.', 'octobre 2026')],
  },
  {
    id: 't5', name: 'Hawa Cissé', gender: 'F', city: 'Dakar', tz: 'Africa/Dakar',
    headline: 'Premiers pas : prière, ablutions et lecture pour adultes',
    bio: 'Beaucoup de mes élèves sont de nouveaux musulmans ou reprennent tout de zéro. On commence par ce dont vous avez besoin aujourd’hui, avec des mots simples.',
    subjects: ['initiation', 'lecture', 'aqida'], riwaya: ['Hafs', 'Warsh'], madhhab: ['Maliki'], langs: ['français', 'wolof', 'anglais'], levels: ['débutant'], ages: ['adulte', 'ado'],
    rateEur: 8, rateFcfa: 3000, rating: 5, hours: 64, balance: 37,
    badges: { identity: true, diploma: true, ijaza: false },
    credentials: [{ type: 'Diplôme', title: 'Certificat d’enseignement islamique', institution: 'Institut islamique de Dakar', year: 2018 }],
    days: [1, 3, 5, 6], utcHours: [10, 11, 19, 20],
    reviews: [R('Élodie, Bordeaux', 5, 'Je n’osais poser mes questions nulle part. Ici, oui.', 'octobre 2026')],
  },
  {
    id: 't6', name: 'Ibrahima Traoré', gender: 'M', city: 'Bamako', tz: 'Africa/Bamako',
    headline: 'Fiqh maliki et sira, en français et en bambara',
    bio: 'Imam et enseignant à Bamako, je propose un parcours structuré en fiqh maliki et une lecture suivie de la sira pour les adultes.',
    subjects: ['fiqh', 'sira', 'aqida'], riwaya: ['Warsh'], madhhab: ['Maliki'], langs: ['français', 'bambara', 'arabe'], levels: ['débutant', 'intermédiaire'], ages: ['adulte'],
    rateEur: 7, rateFcfa: 2500, rating: 4.6, hours: 34, balance: 22,
    badges: { identity: true, diploma: true, ijaza: false },
    credentials: [{ type: 'Diplôme', title: 'Licence en études islamiques', institution: 'Université de Médine', year: 2008 }],
    days: [0, 2, 4], utcHours: [18, 19, 20],
    reviews: [R('Adama, Bamako', 5, 'Clair, et il répond vraiment aux questions de la vie quotidienne.', 'août 2026')],
  },
  {
    id: 't7', name: 'Mariam Koné', gender: 'F', city: 'Abidjan', tz: 'Africa/Abidjan',
    headline: 'Arabe pour enfants, par le jeu et la lecture',
    bio: 'Professeure d’arabe à Abidjan, j’enseigne l’alphabet et les premières phrases aux enfants de 5 à 12 ans. Séances courtes, beaucoup de lecture à voix haute.',
    subjects: ['arabe', 'lecture'], riwaya: ['Hafs'], madhhab: ['Maliki'], langs: ['français', 'arabe', 'bambara'], levels: ['débutant'], ages: ['enfant'],
    rateEur: 6, rateFcfa: 2000, rating: 4.8, hours: 18, balance: 16,
    badges: { identity: true, diploma: true, ijaza: false },
    credentials: [{ type: 'Diplôme', title: 'Licence de langue arabe', institution: 'Université Al-Azhar', year: 2019 }],
    days: [2, 3, 6], utcHours: [15, 16, 17],
    reviews: [R('Aminata, Abidjan', 5, 'Ma fille attend le cours toute la semaine.', 'septembre 2026')],
  },
  {
    id: 't8', name: 'Youssef Ben Salah', gender: 'M', city: 'Tunis', tz: 'Africa/Tunis',
    headline: 'Tafsir et tajwid en riwaya Qalun',
    bio: 'Formé à la Zitouna, j’enseigne le tafsir aux adultes de niveau intermédiaire et la récitation en riwaya Qalun.',
    subjects: ['tafsir', 'tajwid'], riwaya: ['Qalun'], madhhab: ['Maliki'], langs: ['français', 'arabe'], levels: ['intermédiaire', 'avancé'], ages: ['adulte'],
    rateEur: 11, rateFcfa: 4500, rating: 4.7, hours: 156, balance: 73,
    badges: { identity: true, diploma: true, ijaza: true },
    credentials: [
      { type: 'Ijaza', title: 'Ijaza de récitation, riwaya Qalun', institution: 'Transmise par Cheikh Tahar Gharbi, Tunis', year: 2011, riwaya: 'Qalun', sanad: ['Youssef Ben Salah', 'Cheikh Tahar Gharbi', 'Cheikh Mokhtar Saïd'] },
      { type: 'Diplôme', title: 'Master en sciences du Coran', institution: 'Université Zitouna', year: 2012 },
    ],
    days: [1, 4, 5], utcHours: [8, 17, 18],
    reviews: [R('Nadia, Marseille', 5, 'Des cours très structurés, chaque sourate replacée dans son contexte.', 'juillet 2026')],
  },
  {
    id: 't9', name: 'Salma Haddad', gender: 'F', city: 'Amman', tz: 'Asia/Amman',
    headline: 'Hifz et tajwid pour adolescentes et femmes, riwaya Hafs ou Douri',
    bio: 'Enseignante à Amman, je suis des élèves francophones et anglophones. Mes plans de mémorisation s’adaptent aux études et au travail.',
    subjects: ['hifz', 'tajwid'], riwaya: ['Hafs', 'Douri'], madhhab: ['Hanafi', 'Shafi’i'], langs: ['arabe', 'anglais', 'français'], levels: ['intermédiaire', 'avancé'], ages: ['ado', 'adulte'],
    rateEur: 13, rateFcfa: 5000, rating: 4.9, hours: 301, balance: 95,
    badges: { identity: true, diploma: false, ijaza: true },
    credentials: [{ type: 'Ijaza', title: 'Ijaza de récitation, riwaya Hafs', institution: 'Transmise par Cheikha Amal Odeh, Amman', year: 2015, riwaya: 'Hafs', sanad: ['Salma Haddad', 'Cheikha Amal Odeh', 'Cheikh Bakr Nasser'] }],
    days: [0, 1, 2, 4], utcHours: [6, 7, 15, 16],
    reviews: [R('Inès, Liège', 5, 'Elle a réussi à faire tenir le hifz dans mon année de médecine.', 'octobre 2026')],
  },
  {
    id: 't10', name: 'Ousmane Fall', gender: 'M', city: 'Thiès', tz: 'Africa/Dakar',
    headline: 'Grammaire arabe (nahw, sarf) et expression',
    bio: 'Diplômé de Médine, j’enseigne l’arabe aux élèves qui veulent comprendre les textes directement. Lycéens et adultes, en français ou en wolof.',
    subjects: ['arabe', 'tafsir'], riwaya: ['Warsh'], madhhab: ['Maliki', 'Hanbali'], langs: ['français', 'wolof', 'arabe'], levels: ['débutant', 'intermédiaire', 'avancé'], ages: ['ado', 'adulte'],
    rateEur: 9, rateFcfa: 3500, rating: 4.8, hours: 118, balance: 52,
    badges: { identity: true, diploma: true, ijaza: false },
    credentials: [{ type: 'Diplôme', title: 'Licence de langue arabe', institution: 'Université de Médine', year: 2015 }],
    days: [1, 2, 3, 5], utcHours: [17, 18, 19, 20],
    reviews: [R('Pape, Toulouse', 5, 'Mon fils de 13 ans comprend enfin la grammaire.', 'septembre 2026')],
  },
]

export type Application = {
  id: string; name: string; gender: 'F' | 'M'; city: string; tz: string; phone: string
  subjects: string[]; riwaya: string[]; madhhab: string[]; langs: string[]; bio: string
  docs: { identity: boolean; diploma: boolean; ijaza: boolean }; diplomaLabel: string; ijazaLabel: string
  recitation: boolean; interview: string; refs: { name: string; role: string }[]
  rateEur: number; rateFcfa: number
  checks: { identity: boolean; phone: boolean; interview: boolean; diploma: boolean; ijaza: boolean; refs: boolean }
  status: 'pending' | 'accepted' | 'limited' | 'refused'; submitted: string
}

export const SEED_APPLICATIONS: Application[] = [
  {
    id: 'a1', name: 'Nafissatou Bah', gender: 'F', city: 'Labé', tz: 'Africa/Conakry', phone: '+224 620 00 00 00',
    subjects: ['hifz', 'lecture'], riwaya: ['Warsh'], madhhab: ['Maliki'], langs: ['français', 'peul', 'arabe'],
    bio: 'Enseignante en daara à Labé depuis six ans, je veux suivre des enfants de la diaspora qui parlent peul à la maison.',
    docs: { identity: true, diploma: true, ijaza: true }, diplomaLabel: 'Certificat d’enseignement coranique, Labé (2018)', ijazaLabel: 'Ijaza Warsh, sanad fourni',
    recitation: true, interview: 'Jeudi à 10 h', refs: [{ name: 'Thierno Oumar Bah', role: 'Maître de daara' }, { name: 'Aïcha Sow', role: 'Directrice d’école' }],
    rateEur: 6, rateFcfa: 2000, checks: { identity: true, phone: true, interview: true, diploma: false, ijaza: false, refs: false },
    status: 'pending', submitted: 'il y a 2 jours',
  },
  {
    id: 'a2', name: 'Souleymane Camara', gender: 'M', city: 'Kankan', tz: 'Africa/Conakry', phone: '+224 621 00 00 00',
    subjects: ['arabe', 'sira'], riwaya: ['Warsh'], madhhab: ['Maliki'], langs: ['français', 'arabe'],
    bio: 'Étudiant avancé en sciences islamiques, j’enseigne l’arabe aux lycéens de Kankan.',
    docs: { identity: true, diploma: true, ijaza: false }, diplomaLabel: 'Attestation d’études, en cours de vérification', ijazaLabel: '',
    recitation: false, interview: 'Vendredi à 15 h', refs: [{ name: 'Lansana Kaba', role: 'Imam' }, { name: 'Mory Condé', role: 'Enseignant' }],
    rateEur: 5, rateFcfa: 1500, checks: { identity: true, phone: true, interview: false, diploma: false, ijaza: false, refs: false },
    status: 'pending', submitted: 'hier',
  },
]

export const LEARNERS = [
  { id: 'awa', name: 'Awa Diop', age: 9, owner: 'parent' as const, level: 'débutant', goals: 'Mémoriser le dernier juz en riwaya Warsh' },
  { id: 'ibrahim', name: 'Ibrahim Diop', age: 13, owner: 'parent' as const, level: 'intermédiaire', goals: 'Comprendre la grammaire arabe' },
  { id: 'mareme', name: 'Marème Sarr', age: 34, owner: 'student' as const, level: 'débutant', goals: 'Reprendre la lecture depuis le début' },
]
