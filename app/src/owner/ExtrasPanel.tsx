import { useState } from 'react'
import { DESSERT_ID, EXTRA_JUICE_IDS, MENU } from '../domain/catalog.ts'
import { fmt } from '../domain/format.ts'
import { newId } from '../domain/ids.ts'
import { dessertFlavorList, priceOf } from '../domain/menu.ts'
import { PriceEditor } from './PriceEditor.tsx'
import type { Settings } from '../domain/types.ts'
import { useSnapshot, useStore } from '../data/hooks.ts'
import { Toggle } from '../ui/ui.tsx'
import o from './o.module.css'

const GREEN = '#2F7D46', RED = '#C8161D'

interface Item { id: string; label: string; off: boolean }

/** A list the owner can add to, remove from and switch on/off (drinks, juice and dessert flavors). */
function ItemEditor({ items, noun, onToggle, onRemove, onAdd }: {
  items: Item[]; noun: string; onToggle: (id: string) => void; onRemove: (id: string) => void; onAdd: (label: string) => void
}) {
  const [draft, setDraft] = useState('')
  const add = () => { const v = draft.trim(); if (v) { onAdd(v); setDraft('') } }
  return (
    <div className={o.list} style={{ gap: 8 }}>
      {items.length === 0 && <div style={{ fontSize: 12.5, color: '#a08a7a' }}>Todavía no hay. Agrega el primero abajo.</div>}
      {items.map(it => (
        <div key={it.id} className={o.row} style={{ background: 'var(--ink)' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: it.off ? '#8b8070' : '#fff' }}>{it.label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button type="button" className={o.quitar} aria-label={`Quitar ${it.label}`} onClick={() => onRemove(it.id)}>Quitar</button>
            <Toggle on={!it.off} onBg={GREEN} offBg={RED} label={`${it.label}: ${it.off ? 'apagado' : 'disponible'}`} onClick={() => onToggle(it.id)} />
          </div>
        </div>
      ))}
      <form style={{ display: 'flex', gap: 8 }} onSubmit={e => { e.preventDefault(); add() }}>
        <input className={o.darkInput} style={{ flex: 1 }} value={draft} onChange={e => setDraft(e.target.value)} placeholder={`Nuevo ${noun}`} aria-label={`Nuevo ${noun}`} maxLength={40} />
        <button type="submit" className={o.redBtn} style={{ padding: '0 18px' }}>Añadir</button>
      </form>
    </div>
  )
}

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <details className={o.details}>
      <summary className={o.summary}><span>{title}</span><span className={o.summarySub}>{sub}</span></summary>
      <div style={{ paddingTop: 12 }}>{children}</div>
    </details>
  )
}

/** Drinks, juices bought apart and desserts: less used, so each part folds away. */
export function ExtrasPanel() {
  const store = useStore()
  const s = useSnapshot().settings
  const upd = (fn: (s: Settings) => Partial<Settings>) => { void store.updateSettings(fn) }
  const withPrice = (d: typeof MENU[number]) => ({ ...d, price: priceOf(s, d.id, d.price) })
  const juiceDishes = MENU.filter(d => EXTRA_JUICE_IDS.includes(d.id)).map(withPrice)
  const dessert = withPrice(MENU.find(d => d.id === DESSERT_ID)!)
  const soldToggle = (id: string, name: string) => {
    const out = !!s.soldDishes[id]
    return <Toggle on={!out} onBg={GREEN} offBg={RED} label={`${name}: ${out ? 'agotado' : 'disponible'}`}
      onClick={() => upd(st => ({ soldDishes: { ...st.soldDishes, [id]: !st.soldDishes[id] } }))} />
  }

  return (
    <div className={o.panel} style={{ marginTop: 18 }}>
      <div className={o.panelHead} style={{ marginBottom: 4 }}>Bebidas y postres</div>
      <div style={{ fontSize: 12, color: '#c9bfae', marginBottom: 6, lineHeight: 1.4 }}>Toca cada parte para abrirla.</div>

      <Section title="Jugos aparte" sub={juiceDishes.map(d => `${d.name.replace('Jugo ', '')} ${fmt(d.price)}`).join(' · ')}>
        <div className={o.list} style={{ gap: 8, marginBottom: 12 }}>
          {juiceDishes.map(d => (
            <div key={d.id} className={o.row} style={{ background: 'var(--ink)' }}>
              <div><div style={{ fontSize: 14, fontWeight: 500 }}>{d.name}</div><PriceEditor id={d.id} name={d.name} price={d.price} /></div>
              {soldToggle(d.id, d.name)}
            </div>
          ))}
        </div>
        <div className={o.optHead}>Sabores de los jugos</div>
        <ItemEditor noun="sabor de jugo"
          items={(s.juiceFlavors ?? []).map(j => ({ id: j.id, label: j.label, off: j.out }))}
          onToggle={id => upd(st => ({ juiceFlavors: st.juiceFlavors.map(x => x.id === id ? { ...x, out: !x.out } : x) }))}
          onRemove={id => upd(st => ({ juiceFlavors: st.juiceFlavors.filter(x => x.id !== id) }))}
          onAdd={label => upd(st => ({ juiceFlavors: [...(st.juiceFlavors ?? []), { id: newId('jf'), label, out: false }] }))} />
      </Section>

      <Section title="Postres" sub={`${fmt(dessert.price)} · ${dessertFlavorList(s).length} sabores`}>
        <div className={o.row} style={{ background: 'var(--ink)', marginBottom: 12 }}>
          <div><div style={{ fontSize: 14, fontWeight: 500 }}>Vender postres hoy</div><PriceEditor id={dessert.id} name="Postre" price={dessert.price} /></div>
          {soldToggle(dessert.id, 'Postres')}
        </div>
        <div className={o.optHead}>Sabores</div>
        <ItemEditor noun="sabor de postre"
          items={dessertFlavorList(s).map(f => ({ id: f.id, label: f.label, off: !!s.soldFlavors[f.id] }))}
          onToggle={id => upd(st => ({ soldFlavors: { ...st.soldFlavors, [id]: !st.soldFlavors[id] } }))}
          onRemove={id => upd(st => ({ dessertFlavors: dessertFlavorList(st).filter(x => x.id !== id) }))}
          onAdd={label => upd(st => ({ dessertFlavors: [...dessertFlavorList(st), { id: newId('pf'), label }] }))} />
      </Section>
    </div>
  )
}
