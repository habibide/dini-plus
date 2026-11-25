// Catalogue de lancement : pays de résidence, langues d'enseignement, matières.
// Les libellés existent en français, en anglais (Gambie, États-Unis, Canada anglophone) et en arabe.

export type Locale = 'fr' | 'en' | 'ar'
export type Label = Record<Locale, string>
export type CurrencyCode = 'XOF' | 'GMD' | 'EUR' | 'USD' | 'CAD'
export type PaymentMethod = 'card' | 'wave' | 'orange_money' | 'afrimoney'

export type Country = {
  code: 'SN' | 'GM' | 'FR' | 'US' | 'CA'
  label: Label
  currency: CurrencyCode
  locale: Locale
  timezones: { id: string; label: string }[]
  payments: PaymentMethod[]
}

export const COUNTRIES: Country[] = [
  { code: 'SN', label: { fr: 'Sénégal', en: 'Senegal', ar: 'السنغال' }, currency: 'XOF', locale: 'fr', timezones: [{ id: 'Africa/Dakar', label: 'Dakar' }], payments: ['wave', 'orange_money', 'card'] },
  { code: 'GM', label: { fr: 'Gambie', en: 'The Gambia', ar: 'غامبيا' }, currency: 'GMD', locale: 'en', timezones: [{ id: 'Africa/Banjul', label: 'Banjul' }], payments: ['wave', 'afrimoney', 'card'] },
  { code: 'FR', label: { fr: 'France', en: 'France', ar: 'فرنسا' }, currency: 'EUR', locale: 'fr', timezones: [{ id: 'Europe/Paris', label: 'Paris' }], payments: ['card'] },
  {
    code: 'US', label: { fr: 'États-Unis', en: 'United States', ar: 'الولايات المتحدة' }, currency: 'USD', locale: 'en',
    timezones: [{ id: 'America/New_York', label: 'New York' }, { id: 'America/Chicago', label: 'Chicago' }, { id: 'America/Denver', label: 'Denver' }, { id: 'America/Los_Angeles', label: 'Los Angeles' }],
    payments: ['card'],
  },
  {
    code: 'CA', label: { fr: 'Canada', en: 'Canada', ar: 'كندا' }, currency: 'CAD', locale: 'fr',
    timezones: [{ id: 'America/Toronto', label: 'Montréal, Toronto' }, { id: 'America/Winnipeg', label: 'Winnipeg' }, { id: 'America/Edmonton', label: 'Edmonton' }, { id: 'America/Vancouver', label: 'Vancouver' }],
    payments: ['card'],
  },
]
export const country = (code: Country['code']) => COUNTRIES.find((c) => c.code === code)!

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  card: 'Carte bancaire',
  wave: 'Wave',
  orange_money: 'Orange Money',
  afrimoney: 'Afrimoney',
}

export type LanguageId = 'fr' | 'wo' | 'ff' | 'srr' | 'bm' | 'soce' | 'mnk' | 'snk'
export const LANGUAGES: { id: LanguageId; label: Label }[] = [
  { id: 'fr', label: { fr: 'Français', en: 'French', ar: 'الفرنسية' } },
  { id: 'wo', label: { fr: 'Wolof', en: 'Wolof', ar: 'الولوفية' } },
  { id: 'ff', label: { fr: 'Peul', en: 'Fula', ar: 'الفولانية' } },
  { id: 'srr', label: { fr: 'Sérère', en: 'Serer', ar: 'السيرية' } },
  { id: 'bm', label: { fr: 'Bambara', en: 'Bambara', ar: 'البمبارية' } },
  { id: 'soce', label: { fr: 'Soosé', en: 'Soce', ar: 'السوسية' } },
  { id: 'mnk', label: { fr: 'Mandingue', en: 'Mandinka', ar: 'الماندينكية' } },
  { id: 'snk', label: { fr: 'Soninké (Sarakholé)', en: 'Soninke (Sarakhole)', ar: 'السوننكية (السراخولية)' } },
]

export type SubjectId = 'quran' | 'hadith' | 'fiqh' | 'azkar' | 'tajwid' | 'arabic' | 'aqida' | 'history' | 'sirah' | 'tafsir'
export type ArabicTrack = 'reading' | 'writing' | 'practice'
export const SUBJECTS: { id: SubjectId; label: Label; ar: string; desc: Label }[] = [
  { id: 'quran', label: { fr: 'Al Qur’an', en: 'Qur’an', ar: 'القرآن' }, ar: 'القرآن', desc: { fr: 'Lecture et mémorisation du Coran', en: 'Reading and memorising the Qur’an', ar: 'قراءة القرآن وحفظه' } },
  { id: 'tajwid', label: { fr: 'At-Tajwid', en: 'Tajweed', ar: 'التجويد' }, ar: 'التجويد', desc: { fr: 'Règles de récitation', en: 'Rules of recitation', ar: 'أحكام التلاوة' } },
  { id: 'tafsir', label: { fr: 'At-Tafsir', en: 'Tafsir', ar: 'التفسير' }, ar: 'التفسير', desc: { fr: 'Explication et sens du Coran', en: 'Explanation and meaning of the Qur’an', ar: 'شرح معاني القرآن الكريم' } },
  { id: 'arabic', label: { fr: 'Arabe', en: 'Arabic', ar: 'اللغة العربية' }, ar: 'اللغة العربية', desc: { fr: 'Lecture, écriture et pratique', en: 'Reading, writing and speaking', ar: 'القراءة والكتابة والمحادثة' } },
  { id: 'hadith', label: { fr: 'Al Hadith', en: 'Hadith', ar: 'الحديث' }, ar: 'الحديث', desc: { fr: 'Paroles et tradition du Prophète ﷺ', en: 'Sayings and tradition of the Prophet ﷺ', ar: 'أقوال النبي ﷺ وسنته' } },
  { id: 'sirah', label: { fr: 'As-Sîrah', en: 'Seerah', ar: 'السيرة النبوية' }, ar: 'السيرة النبوية', desc: { fr: 'Vie du Prophète ﷺ', en: 'Life of the Prophet ﷺ', ar: 'حياة النبي ﷺ' } },
  { id: 'fiqh', label: { fr: 'Al Fiqh', en: 'Fiqh', ar: 'الفقه' }, ar: 'الفقه', desc: { fr: 'Jurisprudence, par madhhab', en: 'Jurisprudence, by madhhab', ar: 'الفقه حسب المذهب' } },
  { id: 'azkar', label: { fr: 'Al Azkaar', en: 'Adhkar', ar: 'الأذكار' }, ar: 'الأذكار', desc: { fr: 'Invocations du quotidien', en: 'Daily remembrance', ar: 'أذكار اليوم والليلة' } },
  { id: 'aqida', label: { fr: 'Al Aqidah', en: 'Aqeedah', ar: 'العقيدة' }, ar: 'العقيدة', desc: { fr: 'Croyance et fondements', en: 'Creed and foundations', ar: 'العقيدة وأصولها' } },
  { id: 'history', label: { fr: 'Histoire de l’islam', en: 'History of Islam', ar: 'تاريخ الإسلام' }, ar: 'تاريخ الإسلام', desc: { fr: 'De la révélation à nos jours', en: 'From revelation to today', ar: 'من نزول الوحي إلى اليوم' } },
]
export const subject = (id: SubjectId) => SUBJECTS.find((s) => s.id === id)!

export const ARABIC_TRACKS: { id: ArabicTrack; label: Label }[] = [
  { id: 'reading', label: { fr: 'Lecture', en: 'Reading', ar: 'القراءة' } },
  { id: 'writing', label: { fr: 'Écriture', en: 'Writing', ar: 'الكتابة' } },
  { id: 'practice', label: { fr: 'Pratique orale', en: 'Speaking', ar: 'المحادثة' } },
]

export const RIWAYAT = ['Warsh', 'Hafs', 'Qalun', 'Douri'] as const
export const MADHAHIB = ['Maliki', 'Hanafi', 'Shafi’i', 'Hanbali'] as const
export const LEVELS: { id: 'beginner' | 'intermediate' | 'advanced'; label: Label }[] = [
  { id: 'beginner', label: { fr: 'Débutant', en: 'Beginner', ar: 'مبتدئ' } },
  { id: 'intermediate', label: { fr: 'Intermédiaire', en: 'Intermediate', ar: 'متوسط' } },
  { id: 'advanced', label: { fr: 'Avancé', en: 'Advanced', ar: 'متقدم' } },
]
export const AGE_GROUPS: { id: 'child' | 'teen' | 'adult'; label: Label }[] = [
  { id: 'child', label: { fr: 'Enfant (5-12 ans)', en: 'Child (5-12)', ar: 'طفل (5-12 سنة)' } },
  { id: 'teen', label: { fr: 'Adolescent', en: 'Teenager', ar: 'مراهق' } },
  { id: 'adult', label: { fr: 'Adulte', en: 'Adult', ar: 'بالغ' } },
]

export const PLANS = [
  { id: 'discovery', sessions: 4, label: { fr: 'Découverte', en: 'Discovery', ar: 'اكتشاف' }, usage: { fr: '1 séance par semaine', en: '1 session a week', ar: 'حصة واحدة في الأسبوع' } },
  { id: 'regular', sessions: 8, label: { fr: 'Régulier', en: 'Regular', ar: 'منتظم' }, usage: { fr: '2 séances par semaine', en: '2 sessions a week', ar: 'حصتان في الأسبوع' } },
  { id: 'intensive', sessions: 12, label: { fr: 'Intensif', en: 'Intensive', ar: 'مكثف' }, usage: { fr: '3 séances par semaine', en: '3 sessions a week', ar: '3 حصص في الأسبوع' } },
  { id: 'hifz', sessions: 20, label: { fr: 'Hifz', en: 'Hifz', ar: 'تحفيظ' }, usage: { fr: '5 séances par semaine, mémorisation sérieuse', en: '5 sessions a week, serious memorisation', ar: '5 حصص في الأسبوع، حفظ جاد' } },
] as const
export type PlanId = (typeof PLANS)[number]['id']

export const SURAHS = [
  { id: 1, name: 'Al-Fatiha', ar: 'الفاتحة', ayat: 7 },
  { id: 78, name: 'An-Naba', ar: 'النبأ', ayat: 40 },
  { id: 97, name: 'Al-Qadr', ar: 'القدر', ayat: 5 },
  { id: 103, name: 'Al-Asr', ar: 'العصر', ayat: 3 },
  { id: 105, name: 'Al-Fil', ar: 'الفيل', ayat: 5 },
  { id: 106, name: 'Quraysh', ar: 'قريش', ayat: 4 },
  { id: 107, name: 'Al-Ma’un', ar: 'الماعون', ayat: 7 },
  { id: 108, name: 'Al-Kawthar', ar: 'الكوثر', ayat: 3 },
  { id: 109, name: 'Al-Kafirun', ar: 'الكافرون', ayat: 6 },
  { id: 110, name: 'An-Nasr', ar: 'النصر', ayat: 3 },
  { id: 111, name: 'Al-Masad', ar: 'المسد', ayat: 5 },
  { id: 112, name: 'Al-Ikhlas', ar: 'الإخلاص', ayat: 4 },
  { id: 113, name: 'Al-Falaq', ar: 'الفلق', ayat: 5 },
  { id: 114, name: 'An-Nas', ar: 'الناس', ayat: 6 },
] as const
export const surah = (id: number) => SURAHS.find((s) => s.id === id)
