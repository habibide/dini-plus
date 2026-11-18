import { Redirect } from 'expo-router'

// Adresse de retour de Google (et d'Apple hors iPhone). La session est déjà récupérée par OAuthButtons.
export default function AuthCallback() {
  return <Redirect href="/" />
}
