// Marque DINE : un livre ouvert dessiné en arcs, et le nom en très gras.

export function DineMark({ size = 36, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="30" stroke={color} strokeWidth="2.5" opacity="0.18" />
      <g stroke={color} strokeWidth="3" strokeLinecap="round">
        <path d="M14 22 L14 46 Q14 48 16 48 L30 48 Q32 48 32 46 L32 22" />
        <path d="M32 22 L32 46 Q32 48 34 48 L48 48 Q50 48 50 46 L50 22" />
        <path d="M14 22 Q14 16 22 16 Q32 16 32 22" />
        <path d="M32 22 Q32 16 42 16 Q50 16 50 22" />
      </g>
      <circle cx="32" cy="36" r="2.2" fill={color} />
    </svg>
  )
}

export function DineLogo({ inverted }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5" dir="ltr">
      <DineMark size={34} color={inverted ? '#ffffff' : 'var(--color-green)'} />
      <span className={`text-[22px] font-extrabold tracking-[-0.03em] ${inverted ? 'text-white' : 'text-ink'}`}>DINE</span>
    </span>
  )
}
