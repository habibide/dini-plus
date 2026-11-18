import { colors, isConfirmed, type CurrencyCode, type Teacher } from '@dini/core'
import { useDini } from '@dini/data/react'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View, type TextProps, type ViewStyle } from 'react-native'
import { useFormat, useT } from './i18n'

export const font = {
  display: 'YoungSerif_400Regular',
  body: 'HankenGrotesk_400Regular',
  medium: 'HankenGrotesk_500Medium',
  bold: 'HankenGrotesk_700Bold',
  semibold: 'HankenGrotesk_600SemiBold',
  arabic: 'Amiri_400Regular',
}

type Tone = 'body' | 'muted' | 'title' | 'h1' | 'h2' | 'label' | 'arabic'
const tones: Record<Tone, object> = {
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 23, color: colors.ink },
  muted: { fontFamily: font.body, fontSize: 14, lineHeight: 20, color: colors.muted },
  label: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
  title: { fontFamily: font.display, fontSize: 19, color: colors.ink },
  h2: { fontFamily: font.display, fontSize: 22, color: colors.ink },
  h1: { fontFamily: font.display, fontSize: 28, lineHeight: 33, color: colors.ink },
  arabic: { fontFamily: font.arabic, fontSize: 24, color: colors.green, writingDirection: 'rtl' },
}

export function T({ tone = 'body', style, ...p }: TextProps & { tone?: Tone }) {
  return <Text {...p} style={[tones[tone], style]} />
}

export function Button({ title, onPress, kind = 'primary', disabled, style }: { title: string; onPress?: () => void; kind?: 'primary' | 'ghost' | 'sand'; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.btn, s[kind], disabled && (kind === 'primary' ? s.disabled : { opacity: 0.4 }), pressed && { opacity: 0.85 }, style]}>
      <Text style={[s.btnText, kind === 'primary' ? { color: colors.white } : { color: kind === 'sand' ? colors.green : colors.ink }]}>{title}</Text>
    </Pressable>
  )
}

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={[s.chip, on && s.chipOn]}>
      <Text style={[s.chipText, on && { color: colors.white }]}>{label}</Text>
    </Pressable>
  )
}

export function Option({ on, onPress, title, detail, right }: { on: boolean; onPress: () => void; title: string; detail?: string; right?: string }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress} style={[s.option, on && s.optionOn]}>
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontFamily: font.semibold }}>{title}</T>
        {detail ? <T tone="muted">{detail}</T> : null}
      </View>
      {right ? <T style={{ fontFamily: font.display, fontSize: 18, color: colors.green }}>{right}</T> : null}
    </Pressable>
  )
}

export const Money = ({ amount, currency }: { amount: number; currency: CurrencyCode }) => useFormat().money(amount, currency)

export function Monogram({ name, size = 56 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('')
  return (
    <View accessible={false} style={{ width: size, height: size, borderRadius: 3, backgroundColor: colors.leaf, borderWidth: 1, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: font.display, fontSize: size * 0.36, color: colors.green }}>{initials}</Text>
    </View>
  )
}

export function Badges({ t }: { t: Teacher }) {
  const m = useT().badges
  const list: { label: string; dark?: boolean; gold?: boolean }[] = []
  if (t.verification.identity) list.push({ label: m.identity })
  if (t.verification.diploma) list.push({ label: m.diploma })
  if (t.verification.ijaza) list.push({ label: m.ijaza, dark: true })
  if (isConfirmed(t)) list.push({ label: t.gender === 'F' ? m.confirmedF : m.confirmedM, gold: true })
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
      {list.map((b) => (
        <View key={b.label} style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 3, backgroundColor: b.dark ? colors.green : b.gold ? '#F3E5C4' : colors.leaf }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 12, color: b.dark ? colors.white : b.gold ? '#6F4A0F' : colors.green }}>{b.label}</Text>
        </View>
      ))}
    </View>
  )
}

export function Section({ title, children, style }: { title?: string; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ paddingHorizontal: 20, paddingVertical: 18, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, style]}>
      {title ? <T tone="label">{title}</T> : null}
      {children}
    </View>
  )
}

export function Sanad({ chain }: { chain: string[] }) {
  return (
    <View style={{ borderStartWidth: 1, borderColor: colors.ochre, paddingStart: 14, gap: 6 }}>
      {chain.map((n, i) => <T key={n} style={i === 0 ? { fontFamily: font.semibold } : undefined}>{n}</T>)}
    </View>
  )
}

/** Erreur de chargement (réseau, accès refusé), affichée au-dessus de la barre d'onglets. */
export function ErrorBanner() {
  const { error, clearError } = useDini()
  const t = useT()
  if (!error) return null
  return (
    <Pressable accessibilityRole="alert" onPress={clearError} style={{ position: 'absolute', left: 12, right: 12, bottom: 104, padding: 12, borderRadius: 4, backgroundColor: colors.warnBg, borderWidth: 1, borderColor: colors.sand }}>
      <T style={{ color: colors.warn, fontSize: 15 }}>{t.common.loadError(error)}</T>
      <T tone="muted" style={{ marginTop: 4 }}>{t.common.tapToClose}</T>
    </Pressable>
  )
}

const s = StyleSheet.create({
  btn: { minHeight: 48, borderRadius: 4, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.green },
  ghost: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  sand: { backgroundColor: colors.sand },
  disabled: { backgroundColor: '#A9B4AE', borderWidth: 0 },
  btnText: { fontFamily: font.semibold, fontSize: 16 },
  chip: { minHeight: 40, paddingHorizontal: 13, borderRadius: 3, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontFamily: font.medium, fontSize: 14, color: colors.ink },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 4, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  optionOn: { borderColor: colors.green, borderWidth: 2, padding: 13, backgroundColor: '#F4F6EF' },
})
