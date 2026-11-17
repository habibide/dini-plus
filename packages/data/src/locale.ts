import type { Locale } from '@dini/core'

// Langue des messages produits par la couche de données (erreurs du serveur, créneau déjà pris).
// L'application la règle à chaque changement de langue ; le français reste la valeur par défaut.
let current: Locale = 'fr'

export const setDataLocale = (l: Locale) => { current = l }
export const dataLocale = () => current
