import { useState } from 'react'
import { newId } from '../../domain/ids.ts'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { fmt } from '../../domain/format.ts'
import { DESSERT_ID, EXTRA_JUICE_IDS } from '../../domain/catalog.ts'
import { addonsFor, dishById, effRem, flavorsFor, simpleExtrasFor, initialProtein, isDishSoldOut, isExtra, juiceFlavorsFor, proteinsOf } from '../../domain/menu.ts'
import type { CartLine, Dish as DishT, Settings } from '../../domain/types.ts'
import { useDevice, useSnapshot } from '../../data/hooks.ts'
import { BackButton } from '../../ui/ui.tsx'
import { DishPhoto } from '../../ui/DishPhoto.tsx'
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
  // juices and desserts bought apart, offered at the end of every main dish
  const [extraQty, setExtraQty] = useState<Record<string, number>>({})
  const [flavors, setFlavors] = useState<Record<string, boolean>>({})
  // `${juiceId}:${flavorId}` → picked, once the owner has created juice flavors
  const [juicePicks, setJuicePicks] = useState<Record<string, boolean>>({})
  const offerExtras = !isExtra(d)
  // paid additions on the plate (each protein apart, rice, fries)
  const [addonPicks, setAddonPicks] = useState<Record<string, boolean>>({})
  const addons = offerExtras ? addonsFor(s) : []
  const pickedAddons = addons.filter(a => addonPicks[a.id])
  const addonsUnit = pickedAddons.reduce((t, a) => t + a.price, 0)
  const juices = offerExtras ? EXTRA_JUICE_IDS.map(id => dishById(s, id)).filter((j): j is DishT => !!j && !isDishSoldOut(s, j)) : []
  const others = offerExtras ? simpleExtrasFor(s) : []
  const dessert = offerExtras ? dishById(s, DESSERT_ID) : null
  const dessertOn = !!dessert && !isDishSoldOut(s, dessert)
  const pickedFlavors = dessertOn ? flavorsFor(s).filter(f => flavors[f.id]) : []
  const juiceFlavors = juiceFlavorsFor(s)
  const juiceByFlavor = (s.juiceFlavors ?? []).length > 0
  const juiceLines = juices.flatMap(j => juiceByFlavor
    ? juiceFlavors.filter(f => juicePicks[j.id + ':' + f.id]).map(f => ({ j, n: 1, opts: [f.label] }))
    : (extraQty[j.id] ?? 0) > 0 ? [{ j, n: extraQty[j.id], opts: [] as string[] }] : [])
  const otherLines = others.filter(x2 => (extraQty[x2.id] ?? 0) > 0).map(x2 => ({ j: x2, n: extraQty[x2.id], opts: [] as string[] }))
  const extrasTotal = [...juiceLines, ...otherLines].reduce((t, l) => t + l.j.price * l.n, 0) + (dessert ? dessert.price * pickedFlavors.length : 0)

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
      dishId: d.id, name: d.name, cat: d.cat, basePrice: d.price + addonsUnit, domPrice: (d.priceDom || d.price) + addonsUnit, qty,
      opts: groups.map(g => g.options.find(o => o.id === choices[g.id])?.label).filter((v): v is string => !!v),
      proteinLabel: d.proteins && protein ? prots.find(p => p.id === protein)?.label ?? null : null,
      juiceLabel: d.drink && juiceObj ? juiceObj.label : null,
      note: note.trim(),
      removed: rem.filter(r => removed[r.id]).map(r => r.label),
      ...(pickedAddons.length ? { addons: pickedAddons.map(a => a.label) } : {}),
    }
    const extra = (x: DishT, n: number, opts: string[] = []): CartLine => ({
      key: newId(), dishId: x.id, name: x.name, cat: x.cat, basePrice: x.price, domPrice: x.priceDom || x.price, qty: n,
      opts, proteinLabel: null, juiceLabel: null, note: '', removed: [],
    })
    const extras = [
      ...[...juiceLines, ...otherLines].map(l => extra(l.j, l.n, l.opts)),
      ...(dessert ? pickedFlavors.map(f => extra(dessert, 1, [f.label])) : []),
    ]
    setDev(st => ({ cart: [...st.cart, line, ...extras] }))
    nav(P.cart)
  }

  return (
    <>
      <div className={`${c.scroll} noscroll`}>
        <div className={`${x.hero} ${d.img ? '' : x.heroShort}`}>
          {d.img ? <DishPhoto src={d.img} alt={d.name} /> : d.icon && <span className={x.heroIcon} aria-hidden="true">{d.icon}</span>}
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
        {addons.length > 0 && (
          <div className={x.section}>
            <div className={x.groupTitle}>Adiciones <span className={c.optional} style={{ fontSize: 12 }}>(opcional)</span></div>
            <div className={x.groupSub}>Agrégale más a tu plato · se suma al precio</div>
            <div className={x.wrap}>
              {addons.map(a => (
                <button key={a.id} type="button" aria-pressed={!!addonPicks[a.id]} aria-label={`Adición ${a.label}`} className={`${x.pill} ${addonPicks[a.id] ? x.pillSel : ''}`}
                  onClick={() => setAddonPicks(v => ({ ...v, [a.id]: !v[a.id] }))}>
                  {a.label} <span className={x.extraPrice} style={{ marginLeft: 2 }}>+{fmt(a.price)}</span>{addonPicks[a.id] ? ' ✓' : ''}
                </button>
              ))}
            </div>
          </div>
        )}
        {offerExtras && (
          <div className={x.section}>
            <div className={x.groupTitle}>¿Algo más? <span className={c.optional} style={{ fontSize: 12 }}>(opcional)</span></div>
            <div className={x.groupSub}>Todos los platos incluyen jugo. Si quieres algo más, pídelo aparte:</div>
            {juiceByFlavor && juices.map(j => (
              <div key={j.id} style={{ marginBottom: 6 }}>
                <div className={x.extraRow} style={{ paddingBottom: 4 }}><span>{j.name}<span className={x.extraPrice}>{fmt(j.price)} c/u</span></span></div>
                <div className={x.wrap}>
                  {juiceFlavors.map(f => {
                    const k = j.id + ':' + f.id
                    return <button key={k} type="button" aria-pressed={!!juicePicks[k]} aria-label={`${j.name} de ${f.label}`} className={`${x.pill} ${juicePicks[k] ? x.pillSel : ''}`}
                      onClick={() => setJuicePicks(v => ({ ...v, [k]: !v[k] }))}>{f.label}{juicePicks[k] ? ' ✓' : ''}</button>
                  })}
                </div>
              </div>
            ))}
            {[...(juiceByFlavor ? [] : juices), ...others].map(j => {
              const n = extraQty[j.id] ?? 0
              const set = (v: number) => setExtraQty(q => ({ ...q, [j.id]: Math.max(0, Math.min(20, v)) }))
              return (
                <div key={j.id} className={x.extraRow}>
                  <span>{j.name}<span className={x.extraPrice}>{fmt(j.price)}</span></span>
                  <div className={x.miniStep}>
                    <button type="button" className={x.miniBtn} aria-label={`Menos ${j.name}`} onClick={() => set(n - 1)}>–</button>
                    <span className={x.miniQty} aria-live="polite">{n}</span>
                    <button type="button" className={x.miniBtn} aria-label={`Más ${j.name}`} onClick={() => set(n + 1)}>+</button>
                  </div>
                </div>
              )
            })}
            {dessertOn && dessert && (
              <>
                <div className={x.groupTitle} style={{ marginTop: 14 }}>Postres<span className={x.extraPrice}>{fmt(dessert.price)} c/u</span></div>
                <div className={x.groupSub}>Toca los sabores que quieras</div>
                <div className={x.wrap}>
                  {flavorsFor(s).map(f => (
                    <button key={f.id} type="button" aria-pressed={!!flavors[f.id]} className={`${x.pill} ${flavors[f.id] ? x.pillSel : ''}`}
                      onClick={() => setFlavors(v => ({ ...v, [f.id]: !v[f.id] }))}>{f.label}{flavors[f.id] ? ' ✓' : ''}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <div style={{ height: 96 }} />
      </div>
      <div className={x.bar}>
        <div className={x.stepper}>
          <button type="button" className={x.stepBtn} aria-label="Menos" onClick={() => setQty(q => Math.max(1, q - 1))}>–</button>
          <span className={x.qty} aria-live="polite">{qty}</span>
          <button type="button" className={x.stepBtn} aria-label="Más" onClick={() => setQty(q => Math.min(20, q + 1))}>+</button>
        </div>
        {canAdd
          ? <button type="button" className={x.add} onClick={add}>Agregar · {fmt((d.price + addonsUnit) * qty + extrasTotal)}</button>
          : <div className={x.blocked}>{hint}</div>}
      </div>
    </>
  )
}
