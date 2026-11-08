import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Conditions d’utilisation' }

export default function Page() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-12">
      <h1 className="font-display text-4xl">Conditions d’utilisation</h1>
      <p className="bg-warnbg px-4 py-3 text-warn">Document en cours de rédaction, à faire valider juridiquement avant l’ouverture au public.</p>
    </div>
  )
}
