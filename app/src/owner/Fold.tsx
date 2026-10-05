import { useState, type ReactNode } from 'react'
import o from './o.module.css'

const KEY = 'et-owner-fold:'
const remembered = (id: string, def: boolean) => {
  try { const v = localStorage.getItem(KEY + id); return v === null ? def : v === '1' } catch { return def }
}

/** A section of the owner panel that opens and closes; it remembers how the owner left it. */
export function Fold({ id, icon, title, sub, defaultOpen = false, children }: {
  id: string; icon: string; title: string; sub?: ReactNode; defaultOpen?: boolean; children: ReactNode
}) {
  const [open, setOpen] = useState(() => remembered(id, defaultOpen))
  const toggle = () => setOpen(v => {
    try { localStorage.setItem(KEY + id, v ? '0' : '1') } catch { /* private mode */ }
    return !v
  })
  return (
    <section className={`${o.fold} ${open ? o.foldOpen : ''}`}>
      <button type="button" className={o.foldHead} aria-expanded={open} onClick={toggle}>
        <span className={o.foldIcon} aria-hidden="true">{icon}</span>
        <span className={o.foldText}><span className={o.foldTitle}>{title}</span>{sub && <span className={o.foldSub}>{sub}</span>}</span>
        <span className={o.foldChev} aria-hidden="true">›</span>
      </button>
      {open && <div className={o.foldBody}>{children}</div>}
    </section>
  )
}

/** Small heading that groups several sections. */
export const FoldGroup = ({ children }: { children: ReactNode }) => <div className={o.foldGroup}>{children}</div>
