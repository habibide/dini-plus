import { colors } from '@dini/core'
import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { Input } from '@/lib/auth'
import { Button, T } from '@/lib/ui'
import { useT } from '@/lib/i18n'

// Saisie d'un code d'invitation reçu par message (le lien partagé contient aussi ce code).

export default function EnterCode() {
  const m = useT().groups
  const [code, setCode] = useState('')
  // Le code seul, ou le lien complet collé tel quel : on garde la dernière partie.
  const clean = code.trim().split('/').pop()?.replace(/[^0-9a-z]/gi, '').toUpperCase() ?? ''
  return (
    <View style={{ flex: 1, padding: 20, gap: 14, backgroundColor: colors.paper }}>
      <T tone="muted">{m.discount}</T>
      <Input label={m.codeLabel} value={code} onChangeText={setCode} placeholder={m.codePlaceholder} autoCapitalize="characters" autoCorrect={false} />
      <Button title={m.findGroup} disabled={clean.length < 6} onPress={() => router.push({ pathname: '/join/[code]', params: { code: clean } })} />
    </View>
  )
}
