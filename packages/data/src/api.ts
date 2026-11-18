export * from './logic'

/** Stockage clé-valeur pour la session et les préférences : localStorage sur le web, AsyncStorage sur mobile. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null> | string | null
  setItem(key: string, value: string): Promise<void> | void
  removeItem?(key: string): Promise<void> | void
}

export const memoryStorage = (): KeyValueStorage => {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }
}
