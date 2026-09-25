import { fmt } from '../domain/format.ts'
import { isDishSoldOut } from '../domain/menu.ts'
import type { Dish, Settings } from '../domain/types.ts'
import c from './c.module.css'

export function DishCard({ d, s, onOpen }: { d: Dish; s: Settings; onOpen: () => void }) {
  const out = isDishSoldOut(s, d)
  const note = !d.avail ? (d.availNote ?? 'No disponible hoy') : 'Agotado'
  return (
    <button type="button" className={c.dishCard} aria-disabled={out} onClick={() => { if (!out) onOpen() }}>
      <div className={c.thumb}>
        {d.img && <img src={d.img} alt={d.name} loading="lazy" />}
        {out && <div className={c.soldOverlay}>{note}</div>}
      </div>
      <div className={c.dishBody}>
        <div className={c.dishNameRow}><span className={c.dishName}>{d.name}</span>{d.tag && <span className={c.tag}>{d.tag}</span>}</div>
        <div className={c.dishDesc}>{d.desc}</div>
        <div className={c.dishPrice}>{fmt(d.price)}</div>
      </div>
    </button>
  )
}
