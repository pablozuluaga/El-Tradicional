import type { TonoPose } from '../domain/orders.ts'

/** Toño, the frijolito mascot. Two body geometries from the design: 100×110 ("short") and 100×116 ("tall"). */
interface Spec {
  tall: boolean
  arms?: 'right' | 'both'
  armR?: number
  shadow?: boolean
  brimStroke?: boolean
  eyes: { cy: number; r: number }
  cheeks?: { cy: number; r: number }
  brows?: [string, string]
  mouth: { d: string; sw: number } | { circle: { cy: number; r: number } }
  food?: boolean
}

const INK = '#2A1A12'

function Svg({ s, width, height }: { s: Spec; width: number; height: number }) {
  const g = s.tall
    ? { vb: '0 0 100 116', body: { y: 44, h: 60 }, b1: { y: 72, h: 8 }, b2: { y: 80, h: 4 }, brim: { cy: 42, rx: 40, ry: 7.5 },
        crown: 'M33 43 Q34 20 50 20 Q66 20 67 43 Z', band: 'M33 39 Q50 36 67 39 L67 43 Q50 40 33 43 Z' }
    : { vb: '0 0 100 110', body: { y: 40, h: 58 }, b1: { y: 66, h: 7 }, b2: { y: 73, h: 4 }, brim: { cy: 38, rx: 38, ry: 7 },
        crown: 'M34 39 Q35 18 50 18 Q65 18 66 39 Z', band: 'M34 35 Q50 32 66 35 L66 39 Q50 36 34 39 Z' }
  const armR = s.armR ?? 6.5
  return (
    <svg viewBox={g.vb} width={width} height={height} style={{ display: 'block' }} aria-hidden="true">
      {s.shadow && <ellipse cx="50" cy="108" rx="26" ry="5" fill="rgba(20,17,14,.10)" />}
      {s.arms === 'both' && <><circle cx="24" cy="70" r={armR} fill="#9E4326" /><circle cx="76" cy="70" r={armR} fill="#9E4326" /></>}
      {s.arms === 'right' && <circle cx="80" cy="44" r={armR} fill="#9E4326" />}
      <rect x="24" y={g.body.y} width="52" height={g.body.h} rx="26" fill="#B5502E" />
      <rect x="24" y={g.b1.y} width="52" height={g.b1.h} fill="#E0A83B" />
      <rect x="24" y={g.b2.y} width="52" height={g.b2.h} fill="#C8161D" />
      <ellipse cx="50" cy={g.brim.cy} rx={g.brim.rx} ry={g.brim.ry} fill="#ECDCAE" />
      {s.brimStroke && <ellipse cx="50" cy={g.brim.cy} rx={g.brim.rx} ry={g.brim.ry} fill="none" stroke="#DCC792" strokeWidth="1" />}
      <path d={g.crown} fill="#ECDCAE" />
      <path d={g.band} fill="#C8161D" />
      {s.brows && s.brows.map(d => <path key={d} d={d} stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />)}
      <circle cx="42" cy={s.eyes.cy} r={s.eyes.r} fill={INK} />
      <circle cx="58" cy={s.eyes.cy} r={s.eyes.r} fill={INK} />
      {s.cheeks && <><circle cx="36" cy={s.cheeks.cy} r={s.cheeks.r} fill="#E68A6A" /><circle cx="64" cy={s.cheeks.cy} r={s.cheeks.r} fill="#E68A6A" /></>}
      {'d' in s.mouth
        ? <path d={s.mouth.d} stroke={INK} strokeWidth={s.mouth.sw} fill="none" strokeLinecap="round" />
        : <circle cx="50" cy={s.mouth.circle.cy} r={s.mouth.circle.r} fill={INK} />}
      {s.food && (
        <g style={{ animation: 'bite 1.5s ease-in-out infinite' }}>
          <circle cx="80" cy="72" r="6" fill="#9E4326" />
          <circle cx="84" cy="67" r="7" fill="#ECDCAE" />
        </g>
      )}
    </svg>
  )
}

const SMILE_S = { d: 'M43 61 Q50 67 57 61', sw: 2.2 }
const SMILE_T = { d: 'M43 65 Q50 71 57 65', sw: 2.4 }

const PRESETS = {
  /** Menú tip (smiling) */
  menuTip: { tall: false, eyes: { cy: 56, r: 3.2 }, cheeks: { cy: 62, r: 2.8 }, mouth: SMILE_S },
  /** Empty cart (sad, hungry) */
  cartEmpty: { tall: false, brows: ['M38 51 L46 54', 'M62 51 L54 54'], eyes: { cy: 58, r: 3.2 }, cheeks: { cy: 64, r: 2.8 }, mouth: { d: 'M43 68 Q50 62 57 68', sw: 2.2 } },
  /** Cart summary (eating an arepa) */
  eating: { tall: false, eyes: { cy: 56, r: 3.2 }, cheeks: { cy: 62, r: 2.8 }, mouth: { circle: { cy: 63, r: 3.4 } }, food: true },
  /** Order confirmation (waving) */
  confirm: { tall: false, arms: 'right', armR: 6, eyes: { cy: 56, r: 3.2 }, cheeks: { cy: 62, r: 2.8 }, mouth: SMILE_S },
  /** Floating help button */
  helper: { tall: true, eyes: { cy: 60, r: 3.4 }, cheeks: { cy: 66, r: 3 }, mouth: SMILE_T },
  /** Name gate (waving) */
  gate: { tall: true, arms: 'right', eyes: { cy: 60, r: 3.4 }, cheeks: { cy: 66, r: 3.2 }, mouth: SMILE_T },
  /** Onboarding tour (both arms, shadow) */
  tour: { tall: true, arms: 'both', shadow: true, brimStroke: true, eyes: { cy: 60, r: 3.4 }, cheeks: { cy: 66, r: 3.2 }, mouth: SMILE_T },
  /** "Mis pedidos" empty state (sad, no cheeks) */
  ordersEmpty: { tall: true, brows: ['M38 55 L46 58', 'M62 55 L54 58'], eyes: { cy: 61, r: 3.2 }, mouth: { d: 'M43 70 Q50 64 57 70', sw: 2.2 } },
} satisfies Record<string, Spec>

export type TonoVariant = keyof typeof PRESETS

export function Tono({ variant, width, height }: { variant: TonoVariant; width: number; height: number }) {
  return <Svg s={PRESETS[variant] as Spec} width={width} height={height} />
}

/** Order-tracking poses (the prototype's mascotNode). */
export function TonoPoseSvg({ pose, size = 50 }: { pose: TonoPose; size?: number }) {
  const sad = pose === 'sad'
  const s: Spec = {
    tall: true,
    arms: pose === 'wave' || pose === 'celebrate' ? 'right' : undefined,
    brows: sad ? ['M38 55 L46 58', 'M62 55 L54 58'] : undefined,
    eyes: { cy: sad ? 62 : 60, r: 3.2 },
    cheeks: { cy: 66, r: 2.8 },
    mouth: pose === 'eat' ? { circle: { cy: 65, r: 3.6 } } : { d: sad ? 'M43 68 Q50 62 57 68' : 'M43 65 Q50 71 57 65', sw: 2.2 },
    food: pose === 'eat',
  }
  return <Svg s={s} width={size} height={Math.round(size * 1.15)} />
}
