import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Amiri, Hanken_Grotesk, Young_Serif } from 'next/font/google'
import { Providers } from '@/components/providers'
import { ErrorBanner, SiteFooter, SiteHeader } from '@/components/chrome'
import './globals.css'

const hanken = Hanken_Grotesk({ variable: '--font-hanken', subsets: ['latin'] })
const young = Young_Serif({ variable: '--font-young', subsets: ['latin'], weight: '400' })
const amiri = Amiri({ variable: '--font-amiri', subsets: ['arabic'], weight: ['400', '700'] })

export const metadata: Metadata = {
  title: { default: 'DINE, enseignants vérifiés en sciences islamiques', template: '%s · DINE' },
  description: 'Coran, tajwid, arabe, fiqh : choisissez un enseignant vérifié, voyez ses diplômes et son sanad, suivez les progrès de vos enfants.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${hanken.variable} ${young.variable} ${amiri.variable} antialiased`}>
      <body className="flex min-h-screen flex-col font-sans">
        <Providers>
          <SiteHeader />
          <ErrorBanner />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  )
}
