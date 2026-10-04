import { useId, type ReactNode } from 'react'
import css from './install.module.css'

// Drawing kit for the install guide: phone frames, the browser parts each step points at, and the
// red arrow + ring that says "tap here". Scenes use a 300×600 canvas.

export const RED = '#E0141B'
export const BLUE = '#0A7AFF'
const FONT = "-apple-system, 'SF Pro Text', Roboto, 'Helvetica Neue', Arial, sans-serif"
export type Os = 'ios' | 'android'

const uid = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '')

/** Phone body with a clipped screen; children draw the screen from (12,12) to (288,588). */
export function Phone({ os, label, children }: { os: Os; label: string; children: ReactNode }) {
  const id = uid(useId())
  const rx = os === 'ios' ? 38 : 26
  return (
    <svg viewBox="0 0 300 600" className={css.scene} role="img" aria-label={label} fontFamily={FONT}>
      <defs><clipPath id={`scr${id}`}><rect x="12" y="12" width="276" height="576" rx={rx} /></clipPath></defs>
      <rect x="3" y="3" width="294" height="594" rx={rx + 9} fill="#1d1d1f" />
      <g clipPath={`url(#scr${id})`}>
        <rect x="12" y="12" width="276" height="576" fill="#fff" />
        {children}
      </g>
      {os === 'ios'
        ? <rect x="119" y="20" width="62" height="18" rx="9" fill="#000" />
        : <circle cx="150" cy="24" r="5" fill="#000" />}
    </svg>
  )
}

export function StatusBar({ os, light = false }: { os: Os; light?: boolean }) {
  const c = light ? '#fff' : '#111'
  return os === 'ios' ? (
    <g fill={c}>
      <text x="40" y="34" fontSize="13" fontWeight="600">9:41</text>
      {[0, 1, 2, 3].map(i => <rect key={i} x={218 + i * 4.5} y={30 - i * 2.2} width="3" height={4 + i * 2.2} rx="0.8" />)}
      <rect x="240" y="23" width="22" height="11" rx="3" fill="none" stroke={c} strokeWidth="1.2" />
      <rect x="242" y="25" width="16" height="7" rx="1.5" />
    </g>
  ) : (
    <g fill={c}>
      <text x="26" y="32" fontSize="12" fontWeight="500">9:41</text>
      <path d="M232 33 l10 -10 v10z" />
      <rect x="250" y="24" width="7" height="11" rx="1.5" />
      <rect x="262" y="22" width="8" height="13" rx="1.5" fill="none" stroke={c} strokeWidth="1.2" />
    </g>
  )
}

/** The El Tradicional install page, as it looks behind the browser bars. */
export function Site({ top = 40, cta = false }: { top?: number; cta?: boolean }) {
  const id = uid(useId())
  return (
    <g>
      <rect x="12" y={top} width="276" height={170} fill="#B3121A" />
      <defs><clipPath id={`logo${id}`}><circle cx="150" cy={top + 48} r="27" /></clipPath></defs>
      <circle cx="150" cy={top + 48} r="29" fill="#fff" />
      <image href="/assets/logo.jpeg" x="123" y={top + 21} width="54" height="54" clipPath={`url(#logo${id})`} preserveAspectRatio="xMidYMid slice" />
      <text x="150" y={top + 102} fontSize="10" fill="#FFD9C7" textAnchor="middle" fontWeight="700" letterSpacing="1.5">COCINA TÍPICA · ENVIGADO</text>
      <text x="150" y={top + 128} fontSize="19" fill="#fff" textAnchor="middle" fontFamily="Georgia, serif">Lleva El Tradicional</text>
      <text x="150" y={top + 150} fontSize="19" fill="#fff" textAnchor="middle" fontFamily="Georgia, serif">en tu celular</text>
      {[0, 1, 2].map(i => (
        <g key={i}>
          <rect x="30" y={top + 196 + i * 34} width="24" height="24" rx="7" fill="#F6EFE4" />
          <rect x="64" y={top + 203 + i * 34} width={150 - i * 22} height="9" rx="4.5" fill="#E7E0D5" />
        </g>
      ))}
      {cta && (
        <g>
          <rect x="30" y={top + 310} width="240" height="46" rx="14" fill="#C8161D" />
          <text x="150" y={top + 338} fontSize="14" fill="#fff" textAnchor="middle" fontWeight="700">⬇ Instalar la app</text>
        </g>
      )}
    </g>
  )
}

/** Light grey veil behind menus and sheets. */
export const Dim = ({ o = 0.28 }: { o?: number }) => <rect x="12" y="12" width="276" height="576" fill={`rgba(0,0,0,${o})`} />

/** Red "tap here": a pulsing ring around the target, an arrow and a label at the arrow's tail. */
export function Tap({ ring, from, to, label = 'Toca aquí', labelAt }: {
  ring: [number, number, number, number, number?]
  from: [number, number]
  to: [number, number]
  label?: string
  labelAt?: [number, number]
}) {
  const [x, y, w, h, rx = 10] = ring
  const [fx, fy] = from, [tx, ty] = to
  const a = Math.atan2(ty - fy, tx - fx)
  const L = 17, W = 11
  const bx = tx - L * Math.cos(a), by = ty - L * Math.sin(a)
  const head = `${tx},${ty} ${bx + W * Math.sin(a)},${by - W * Math.cos(a)} ${bx - W * Math.sin(a)},${by + W * Math.cos(a)}`
  const [lx, ly] = labelAt ?? [fx, fy + (fy > ty ? 16 : -16)]
  const lw = label.length * 7.4 + 22
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="rgba(224,20,27,.10)" stroke={RED} strokeWidth="3.5" className={css.pulse} />
      <line x1={fx} y1={fy} x2={bx} y2={by} stroke="#fff" strokeWidth="10" strokeLinecap="round" />
      <polygon points={head} fill="#fff" stroke="#fff" strokeWidth="5" strokeLinejoin="round" />
      <line x1={fx} y1={fy} x2={bx} y2={by} stroke={RED} strokeWidth="5.5" strokeLinecap="round" />
      <polygon points={head} fill={RED} />
      {label && (
        <g>
          <rect x={lx - lw / 2} y={ly - 13} width={lw} height="26" rx="13" fill={RED} stroke="#fff" strokeWidth="2" />
          <text x={lx} y={ly + 5} fontSize="13" fontWeight="700" fill="#fff" textAnchor="middle">{label}</text>
        </g>
      )}
    </g>
  )
}

/** A red ring with a short note, for "check this" (not a tap). */
export function Check({ ring, note, at }: { ring: [number, number, number, number, number?]; note: string; at: [number, number] }) {
  const [x, y, w, h, rx = 10] = ring
  const nw = note.length * 6.2 + 18
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke={RED} strokeWidth="3" strokeDasharray="7 5" />
      <rect x={at[0] - nw / 2} y={at[1] - 11} width={nw} height="22" rx="11" fill="#fff" stroke={RED} strokeWidth="1.5" />
      <text x={at[0]} y={at[1] + 4} fontSize="11" fontWeight="700" fill={RED} textAnchor="middle">{note}</text>
    </g>
  )
}

// ---- small glyphs -------------------------------------------------------------

export const ShareGlyph = ({ x, y, s = 1, c = BLUE }: { x: number; y: number; s?: number; c?: string }) => (
  <g transform={`translate(${x},${y}) scale(${s})`} fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M0 -9 v11 M-4 -5 l4 -4 4 4 M-5 -2 h-2 v11 h14 v-11 h-2" />
  </g>
)

export const PlusSquare = ({ x, y, c = '#111' }: { x: number; y: number; c?: string }) => (
  <g fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round">
    <rect x={x - 8} y={y - 8} width="16" height="16" rx="4" />
    <path d={`M${x} ${y - 4} v8 M${x - 4} ${y} h8`} />
  </g>
)

export const Dots = ({ x, y, c = '#111', vertical = false }: { x: number; y: number; c?: string; vertical?: boolean }) => (
  <g fill={c}>{[-6, 0, 6].map(d => <circle key={d} cx={vertical ? x : x + d} cy={vertical ? y + d : y} r="2.1" />)}</g>
)

export const Lines = ({ x, y, c = '#111' }: { x: number; y: number; c?: string }) => (
  <g stroke={c} strokeWidth="1.9" strokeLinecap="round">
    <path d={`M${x - 7} ${y - 5} h14 M${x - 7} ${y} h14 M${x - 7} ${y + 5} h9`} />
  </g>
)

/** iOS/Android home-screen style app tile. */
export function AppIcon({ x, y, size, label, color, img, light = true, round = false }: {
  x: number; y: number; size: number; label: string; color?: string; img?: string; light?: boolean; round?: boolean
}) {
  const id = uid(useId())
  const rx = round ? size / 2 : size * 0.24
  return (
    <g>
      {img ? (
        <>
          <defs><clipPath id={`ic${id}`}><rect x={x} y={y} width={size} height={size} rx={rx} /></clipPath></defs>
          <image href={img} x={x} y={y} width={size} height={size} clipPath={`url(#ic${id})`} preserveAspectRatio="xMidYMid slice" />
        </>
      ) : (
        <rect x={x} y={y} width={size} height={size} rx={rx} fill={color} />
      )}
      <text x={x + size / 2} y={y + size + 13} fontSize="9.5" fill={light ? '#fff' : '#222'} textAnchor="middle" fontWeight={img ? 700 : 400}>{label}</text>
    </g>
  )
}

/** A white menu card; row i spans y+4+i·rowH to y+4+(i+1)·rowH. */
export function MenuCard({ x, y, w, rows, rowH = 36, fontSize = 13.5 }: {
  x: number; y: number; w: number; rows: { label: string; icon?: ReactNode; bold?: boolean }[]; rowH?: number; fontSize?: number
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={rows.length * rowH + 8} rx="16" fill="#fff" stroke="rgba(0,0,0,.06)" />
      {rows.map((r, i) => (
        <g key={r.label}>
          {i > 0 && <line x1={x + 14} x2={x + w - 14} y1={y + 4 + i * rowH} y2={y + 4 + i * rowH} stroke="#ececf0" />}
          <text x={x + 16} y={y + 4 + i * rowH + rowH / 2 + 5} fontSize={fontSize} fill="#111" fontWeight={r.bold ? 700 : 400}>{r.label}</text>
          {r.icon}
        </g>
      ))}
    </g>
  )
}
