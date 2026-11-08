import { Redirect } from 'expo-router'

// Adresse de retour de Google, Facebook et Apple. La session est déjà récupérée par OAuthButtons.
export default function AuthCallback() {
  return <Redirect href="/" />
}
