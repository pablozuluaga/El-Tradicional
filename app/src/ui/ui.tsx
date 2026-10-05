import type { CSSProperties, ReactNode } from 'react'
import { Tono, type TonoVariant } from './Tono.tsx'
import css from './ui.module.css'

export function SectionHeading({ eyebrow, title, sub, right, first }: { eyebrow: string; title: ReactNode; sub?: string; right?: ReactNode; first?: boolean }) {
  return (
    <>
      <div className={css.eyebrowRow} style={first ? { paddingTop: 20 } : undefined}>
        <span className={css.eyebrowBar} />
        <span className={css.eyebrow}>{eyebrow}</span>
      </div>
      {right
        ? <div className={css.title} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}><span>{title}</span>{right}</div>
        : <div className={css.title}>{title}</div>}
      {sub && <div className={css.sub} style={right ? { paddingTop: 4 } : undefined}>{sub}</div>}
    </>
  )
}

export function TonoTip({ variant, w, h, children, style, textStyle }: {
  variant: TonoVariant; w: number; h: number; children: ReactNode; style?: CSSProperties; textStyle?: CSSProperties
}) {
  return (
    <div className={css.tip} style={style}>
      <div className="bob" style={{ flex: 'none', width: w, height: h }}><Tono variant={variant} width={w} height={h} /></div>
      <div className={css.tipText} style={textStyle}><b>Toño:</b> {children}</div>
    </div>
  )
}

export function BackButton({ onClick, overPhoto, dark }: { onClick: () => void; overPhoto?: boolean; dark?: boolean }) {
  return (
    <button
      type="button"
      aria-label="Volver"
      onClick={onClick}
      className={overPhoto ? css.backPhoto : css.backPlain}
      style={dark ? { width: 36, height: 36, border: '1px solid rgba(255,255,255,.16)', background: 'transparent', color: '#fff' } : undefined}
    >‹</button>
  )
}

/** Owner-panel knob. `on` = knob right. */
export function Toggle({ on, onBg, offBg, onClick, label }: { on: boolean; onBg: string; offBg: string; onClick: () => void; label: string }) {
  return (
    <button type="button" className={css.toggleBtn} onClick={onClick} aria-label={label} aria-pressed={on}>
      <span className={css.track} style={{ background: on ? onBg : offBg }}>
        <span className={css.knob} style={on ? { right: 3 } : { left: 3 }} />
      </span>
    </button>
  )
}

export function UnreadDot({ size, top, right, ring = '#fff' }: { size: number; top: number; right: number; ring?: string }) {
  return <span className={css.dot} aria-label="Mensaje nuevo" style={{ width: size, height: size, top, right, borderColor: ring }} />
}

export function Silhouette({ size, stroke, width = 1.7 }: { size: number; stroke: string; width?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={stroke} strokeWidth={width} aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M5 20c0-3.6 3.2-5.6 7-5.6s7 2 7 5.6" strokeLinecap="round" />
    </svg>
  )
}

export function InstagramIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#fff" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.2" fill="#fff" stroke="none" />
    </svg>
  )
}

export function WhatsAppIcon({ size, color = '#fff' }: { size: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} aria-hidden="true">
      <path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.3Z" />
    </svg>
  )
}
