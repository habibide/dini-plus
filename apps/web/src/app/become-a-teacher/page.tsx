import type { Metadata } from 'next'
import { BecomeTeacherScreen } from './become-teacher-screen'

export const metadata: Metadata = {
  title: 'Devenir professeur',
  description: 'Enseignez le Coran, le tajwid, l’arabe ou le fiqh en ligne. Créez votre profil, faites-le valider, commencez à enseigner.',
}

export default function Page() {
  return <BecomeTeacherScreen />
}
