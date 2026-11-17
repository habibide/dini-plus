import { videoWindow } from '@dini/data'
import { useDini, useJoinSession } from '@dini/data/react'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import { View, type ViewStyle } from 'react-native'
import { FormError } from './auth'
import { Button } from './ui'
import { useFormat, useT } from './i18n'

/** Ouvre la salle vidéo dans le navigateur intégré. Actif de 10 min avant le début à 15 min après la fin. */
export function JoinButton({ booking, tz, style }: { booking: { id: string; startsAt: number; minutes: number }; tz: string; style?: ViewStyle }) {
  const { api } = useDini()
  const join = useJoinSession()
  const t = useT().video
  const fmt = useFormat()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id) }, [])
  const { opensAt, closesAt } = videoWindow(booking)
  const open = now >= opensAt && now <= closesAt
  return (
    <View style={[{ gap: 8, alignSelf: 'flex-start' }, style]}>
      <Button kind={open ? 'primary' : 'ghost'} disabled={!open || join.isPending} style={{ minHeight: 44 }}
        title={join.isPending ? t.opening : open ? t.join : now < opensAt ? t.opensAt(fmt.time(opensAt, tz)) : t.over}
        onPress={() => join.mutate({ api, bookingId: booking.id }, { onSuccess: ({ url }) => { void WebBrowser.openBrowserAsync(url) } })} />
      <FormError message={join.error?.message} />
    </View>
  )
}
