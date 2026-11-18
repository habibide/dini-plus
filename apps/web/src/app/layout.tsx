import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Amiri, Noto_Sans_Arabic, Plus_Jakarta_Sans } from 'next/font/google'
import { Providers } from '@/components/providers'
import { ErrorBanner, SiteFooter, SiteHeader } from '@/components/chrome'
import { LOCALE_BOOT_SCRIPT, LocaleSync } from '@/i18n/locale'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({ variable: '--font-jakarta', subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })
const notoArabic = Noto_Sans_Arabic({ variable: '--font-noto-arabic', subsets: ['arabic'] })
const amiri = Amiri({ variable: '--font-amiri', subsets: ['arabic'], weight: ['400', '700'] })

export const metadata: Metadata = {
  title: { default: 'DINE, enseignants vérifiés en sciences islamiques', template: '%s · DINE' },
  description: 'Coran, tajwid, arabe, fiqh : choisissez un enseignant vérifié, voyez ses diplômes et son sanad, suivez les progrès de vos enfants.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // lang et dir sont ajustés avant l'affichage par le script de langue : React ne doit pas s'en étonner.
    <html lang="fr" suppressHydrationWarning className={`${jakarta.variable} ${amiri.variable} ${notoArabic.variable} antialiased`}>
      <head><script dangerouslySetInnerHTML={{ __html: LOCALE_BOOT_SCRIPT }} /></head>
      <body className="flex min-h-screen flex-col font-sans">
        <Providers>
          <LocaleSync />
          <SiteHeader />
          <ErrorBanner />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  )
}
