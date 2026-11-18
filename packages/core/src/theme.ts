// Identité DINE, commune au web et au mobile : charte du prototype Claude Design (vert, or, blanc cassé chaud).
export const colors = {
  paper: '#FAFAF7', // fond
  leaf: '#F4F1EA', // fond chaud : survols, encadrés
  soft: '#E8F5EE', // vert très clair : pastilles, sélection
  sand: '#FBF3DC', // or très clair
  gold: '#C9A02E', // or : étoiles, accents décoratifs
  ochre: '#7A5A1B', // or foncé : texte et filets sur fond clair
  green: '#20915B', // vert DINE : boutons, liens, en-têtes
  green2: '#176B43', // vert foncé : survol, dégradés
  ink: '#1F1F1B',
  muted: '#6E6B62',
  faint: '#9C998F',
  line: '#E9E6DD',
  white: '#FFFFFF',
  warnBg: '#FBF3DC',
  warn: '#7A5A1B',
  bad: '#C7503D',
} as const

export const radius = { input: 12, button: 14, card: 16 } as const

export const fonts = {
  display: 'Plus Jakarta Sans',
  body: 'Plus Jakarta Sans',
  arabic: 'Amiri',
} as const
