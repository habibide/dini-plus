import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Les paquets partagés sont publiés en TypeScript source.
  transpilePackages: ['@dini/core', '@dini/data'],
  // Anciennes adresses en français : redirection permanente vers les adresses anglaises
  // (liens déjà partagés, e-mails de confirmation et de mot de passe déjà envoyés).
  async redirects() {
    const moves: [string, string][] = [
      ['/enseignants', '/teachers'], ['/enseignants/:id', '/teachers/:id'],
      ['/enseignant', '/teacher'], ['/enseignant/candidature', '/teacher/application'], ['/enseignant/disponibilites', '/teacher/availability'],
      ['/enseignant/seances/:id', '/teacher/sessions/:id'], ['/devenir-enseignant', '/become-a-teacher'],
      ['/inscription', '/signup'], ['/inscription/enseignant', '/signup/teacher'], ['/connexion', '/login'],
      ['/mot-de-passe-oublie', '/forgot-password'], ['/nouveau-mot-de-passe', '/reset-password'],
      ['/suivi', '/progress'], ['/suivi/seances/:id', '/progress/sessions/:id'], ['/reserver/:id/:at', '/book/:id/:at'],
      ['/cours/:id', '/lesson/:id'], ['/conditions', '/terms'], ['/confidentialite', '/privacy'],
    ]
    return moves.map(([source, destination]) => ({ source, destination, permanent: true }))
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default nextConfig
