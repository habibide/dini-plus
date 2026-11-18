import { colors, isConfirmed, radius, type CurrencyCode, type Teacher } from '@dini/core'
import { useDini } from '@dini/data/react'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View, type TextProps, type ViewStyle } from 'react-native'
import { useFormat, useT } from './i18n'

export const font = {
  display: 'PlusJakartaSans_800ExtraBold',
  body: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  bold: 'PlusJakartaSans_700Bold',
  semibold: 'PlusJakartaSans_600SemiBold',
  arabic: 'Amiri_400Regular',
}

type Tone = 'body' | 'muted' | 'title' | 'h1' | 'h2' | 'label' | 'arabic'
const tones: Record<Tone, object> = {
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 23, color: colors.ink },
  muted: { fontFamily: font.body, fontSize: 14, lineHeight: 20, color: colors.muted },
  label: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
  title: { fontFamily: font.display, fontSize: 18, letterSpacing: -0.3, color: colors.ink },
  h2: { fontFamily: font.display, fontSize: 22, letterSpacing: -0.5, color: colors.ink },
  h1: { fontFamily: font.display, fontSize: 28, lineHeight: 33, letterSpacing: -0.6, color: colors.ink },
  arabic: { fontFamily: font.arabic, fontSize: 24, color: colors.green, writingDirection: 'rtl' },
}

export function T({ tone = 'body', style, ...p }: TextProps & { tone?: Tone }) {
  return <Text {...p} style={[tones[tone], style]} />
}

export function Button({ title, onPress, kind = 'primary', disabled, style }: { title: string; onPress?: () => void; kind?: 'primary' | 'ghost' | 'sand'; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.btn, s[kind], disabled && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.98 }] }, style]}>
      <Text style={[s.btnText, kind === 'primary' ? { color: colors.white } : { color: kind === 'sand' ? colors.green2 : colors.ink }]}>{title}</Text>
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
  // Couleur stable par personne, dans la gamme de la charte (mêmes teintes que le site).
  const palette = ['#20915B', '#176B43', '#B8901F', '#2F7D6D', '#3B8B5A', '#8A6A1E']
  const bg = palette[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length]
  return (
    <View accessible={false} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: font.bold, fontSize: size * 0.36, color: colors.white }}>{initials}</Text>
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
        <View key={b.label} style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: b.dark ? colors.green : b.gold ? colors.sand : colors.soft }}>
          <Text style={{ fontFamily: font.bold, fontSize: 12, color: b.dark ? colors.white : b.gold ? colors.ochre : colors.green2 }}>{b.label}</Text>
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
    <Pressable accessibilityRole="alert" onPress={clearError} style={{ position: 'absolute', left: 12, right: 12, bottom: 104, padding: 12, borderRadius: radius.input, backgroundColor: colors.warnBg, borderWidth: 1, borderColor: colors.gold }}>
      <T style={{ color: colors.warn, fontSize: 15 }}>{t.common.loadError(error)}</T>
      <T tone="muted" style={{ marginTop: 4 }}>{t.common.tapToClose}</T>
    </Pressable>
  )
}

const s = StyleSheet.create({
  btn: { minHeight: 52, borderRadius: radius.button, borderWidth: 1.5, borderColor: 'transparent', paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.green, borderColor: colors.green },
  ghost: { backgroundColor: colors.white, borderColor: '#D6D2C7' },
  sand: { backgroundColor: colors.white },
  btnText: { fontFamily: font.semibold, fontSize: 16 },
  chip: { minHeight: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
  optionOn: { borderColor: colors.green, backgroundColor: colors.white, boxShadow: `0 0 0 3px ${colors.soft}` },
})
