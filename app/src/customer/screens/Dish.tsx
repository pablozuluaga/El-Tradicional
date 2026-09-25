import { useState } from 'react'
import { newId } from '../../domain/ids.ts'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { fmt } from '../../domain/format.ts'
import { dishById, effRem, initialProtein, isDishSoldOut, proteinsOf } from '../../domain/menu.ts'
import type { CartLine, Dish as DishT, Settings } from '../../domain/types.ts'
import { useDevice, useSnapshot } from '../../data/hooks.ts'
import { BackButton } from '../../ui/ui.tsx'
import { P } from '../paths.ts'
import c from '../c.module.css'
import x from './Dish.module.css'

export function Dish() {
  const { id = '' } = useParams()
  const s = useSnapshot().settings
  const d = dishById(s, id)
  if (!d) return <Navigate to={P.menu} replace />
  return <DishDetail key={d.id} d={d} s={s} />
}

function DishDetail({ d, s }: { d: DishT; s: Settings }) {
  const nav = useNavigate()
  const [, setDev] = useDevice()
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [protein, setProtein] = useState<string | null>(() => initialProtein(s, d))
  const [juice, setJuice] = useState<string | null>(null)
  const [removed, setRemoved] = useState<Record<string, boolean>>({})
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')

  const groups = d.groups ?? []
  const prots = d.proteins ? proteinsOf(d) : []
  const rem = effRem(d, choices)
  const protOk = !d.proteins || (!!protein && !s.soldProteins[protein])
  const juiceObj = s.juices.find(j => j.id === juice && !j.out)
  const missing = groups.filter(g => !choices[g.id]).map(g => g.short)
  if (!protOk) missing.push('proteína')
  if (d.drink && !juiceObj) missing.push('bebida')
  const soldOut = isDishSoldOut(s, d)
  const canAdd = s.storeOpen && !soldOut && missing.length === 0
  const hint = !s.storeOpen ? 'Cocina cerrada ahora' : soldOut ? 'Agotado hoy' : 'Elige ' + missing.join(', ')

  const add = () => {
    if (!canAdd) return
    const line: CartLine = {
      key: newId(),
      dishId: d.id, name: d.name, cat: d.cat, basePrice: d.price, domPrice: d.priceDom || d.price, qty,
      opts: groups.map(g => g.options.find(o => o.id === choices[g.id])?.label).filter((v): v is string => !!v),
      proteinLabel: d.proteins && protein ? prots.find(p => p.id === protein)?.label ?? null : null,
      juiceLabel: d.drink && juiceObj ? juiceObj.label : null,
      note: note.trim(),
      removed: rem.filter(r => removed[r.id]).map(r => r.label),
    }
    setDev(st => ({ cart: [...st.cart, line] }))
    nav(P.cart)
  }

  return (
    <>
      <div className={`${c.scroll} noscroll`}>
        <div className={x.hero}>
          {d.img && <img src={d.img} alt={d.name} />}
          <BackButton overPhoto onClick={() => nav(P.menu)} />
        </div>
        <div className={x.head}>
          <div className={x.nameRow}><div className={x.name}>{d.name}</div><div className={x.price}>{fmt(d.price)}</div></div>
          <div className={x.desc}>{d.desc}</div>
        </div>

        {groups.map(g => (
          <div key={g.id} className={x.section} style={{ paddingTop: 8, paddingBottom: 8 }}>
            <div className={x.groupTitle}>{g.title} <span className={c.req}>*</span></div>
            <div className={x.groupSub}>{g.sub}</div>
            <div className={x.col} role="radiogroup" aria-label={g.title}>
              {g.options.map(o => {
                const sel = choices[g.id] === o.id
                return (
                  <button key={o.id} type="button" role="radio" aria-checked={sel} className={`${c.optRow} ${sel ? c.sel : ''}`} onClick={() => setChoices(ch => ({ ...ch, [g.id]: o.id }))}>
                    <span>{o.label}</span><span className={c.optMark}>{sel ? '●' : '○'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {d.proteins && (
          <div className={x.section} style={{ paddingTop: 8 }}>
            <div className={x.groupTitle}>Elige tu proteína <span className={c.req}>*</span></div>
            <div className={x.groupSub}>Incluida en el precio · escoge una</div>
            <div className={x.col} role="radiogroup" aria-label="Proteína">
              {prots.map(p => {
                if (s.soldProteins[p.id]) return <div key={p.id} className={c.optOut}>{p.label}<span style={{ fontSize: 11, fontWeight: 600 }}>Agotado hoy</span></div>
                const sel = protein === p.id
                return (
                  <button key={p.id} type="button" role="radio" aria-checked={sel} className={`${c.optRow} ${sel ? c.sel : ''}`} onClick={() => setProtein(p.id)}>
                    {p.label}<span className={c.optMark}>{sel ? '●' : '○'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {d.drink && (
          <div className={x.section}>
            <div className={x.groupTitle}>Elige tu bebida <span className={c.req}>*</span></div>
            <div className={x.groupSub}>Incluida con tu plato · escoge una</div>
            <div className={x.wrap} role="radiogroup" aria-label="Bebida">
              {s.juices.map(j => {
                if (j.out) return <div key={j.id} className={x.pillOut}>{j.label} · agotado</div>
                const sel = juice === j.id
                return <button key={j.id} type="button" role="radio" aria-checked={sel} className={`${x.pill} ${sel ? x.pillSel : ''}`} onClick={() => setJuice(j.id)}>{j.label}{sel ? ' ✓' : ''}</button>
              })}
            </div>
          </div>
        )}

        {rem.length > 0 && (
          <div className={x.section}>
            <div className={x.groupTitle}>¿Le quitamos algo?</div>
            <div className={x.groupSub}>Toca lo que NO quieres en tu plato</div>
            <div className={x.wrap}>
              {rem.map(r => (
                <button key={r.id} type="button" aria-pressed={!!removed[r.id]} className={`${x.rem} ${removed[r.id] ? x.remOff : ''}`}
                  onClick={() => setRemoved(v => ({ ...v, [r.id]: !v[r.id] }))}>{removed[r.id] ? 'Sin ' + r.label : r.label}</button>
              ))}
            </div>
          </div>
        )}

        <div className={x.section}>
          <div className={x.groupTitle}>Notas para la cocina <span className={c.optional} style={{ fontSize: 12 }}>(opcional)</span></div>
          <div className={x.groupSub}>Ej: bien caliente · sin sal · empacar aparte…</div>
          <textarea className={c.textarea} value={note} onChange={e => setNote(e.target.value)} placeholder="Escribe aquí si necesitas algo especial" rows={3} maxLength={300} />
        </div>
        <div style={{ height: 96 }} />
      </div>
      <div className={x.bar}>
        <div className={x.stepper}>
          <button type="button" className={x.stepBtn} aria-label="Menos" onClick={() => setQty(q => Math.max(1, q - 1))}>–</button>
          <span className={x.qty} aria-live="polite">{qty}</span>
          <button type="button" className={x.stepBtn} aria-label="Más" onClick={() => setQty(q => Math.min(20, q + 1))}>+</button>
        </div>
        {canAdd
          ? <button type="button" className={x.add} onClick={add}>Agregar · {fmt(d.price * qty)}</button>
          : <div className={x.blocked}>{hint}</div>}
      </div>
    </>
  )
}
