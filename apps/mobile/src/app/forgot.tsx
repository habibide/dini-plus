import { colors } from '@dini/core'
import { useSendPasswordReset } from '@dini/data/react'
import { useState } from 'react'
import { ScrollView } from 'react-native'
import { FormError, Input } from '@/lib/auth'
import { Button, T } from '@/lib/ui'

// Le lien reçu par e-mail ouvre le site web, où se choisit le nouveau mot de passe.
const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function Forgot() {
  const send = useSendPasswordReset()
  const [email, setEmail] = useState('')
  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={{ backgroundColor: colors.paper }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <T tone="h1">Mot de passe oublié</T>
      {send.isSuccess ? <T>Si un compte existe pour {email}, vous allez recevoir un lien pour choisir un nouveau mot de passe.</T> : <>
        <T>Indiquez votre e-mail : nous vous envoyons un lien pour en choisir un nouveau.</T>
        <Input label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="Votre e-mail" />
        <FormError message={send.error?.message} />
        <Button title={send.isPending ? 'Envoi…' : 'Recevoir le lien'} disabled={send.isPending || !email}
          onPress={() => send.mutate({ email, redirectTo: `${SITE_URL}/nouveau-mot-de-passe` })} />
      </>}
    </ScrollView>
  )
}
