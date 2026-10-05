import { useState } from 'react'
import { DESSERT_ID, EXTRA_DRINK_IDS, EXTRA_JUICE_IDS, MENU } from '../domain/catalog.ts'
import { fmt } from '../domain/format.ts'
import { newId } from '../domain/ids.ts'
import { addonKey, allAddons, dessertFlavorList, priceOf } from '../domain/menu.ts'
import { PriceEditor } from './PriceEditor.tsx'
import type { Settings } from '../domain/types.ts'
import { useSnapshot, useStore } from '../data/hooks.ts'
import { Toggle } from '../ui/ui.tsx'
import { Fold } from './Fold.tsx'
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

/** Name + price + "Añadir", for items the owner creates. */
function NewPricedItem({ noun, onAdd }: { noun: string; onAdd: (name: string, price: number) => void }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [err, setErr] = useState('')
  const add = () => {
    const n = name.trim(), p = Number(price.replace(/\D/g, ''))
    if (!n) return setErr('Escribe el nombre.')
    if (!p) return setErr('Escribe el precio.')
    onAdd(n, p); setName(''); setPrice(''); setErr('')
  }
  return (
    <form style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }} onSubmit={e => { e.preventDefault(); add() }}>
      <input className={o.darkInput} style={{ flex: '2 1 140px' }} value={name} onChange={e => setName(e.target.value)} placeholder={`Nuevo ${noun}`} aria-label={`Nombre del nuevo ${noun}`} maxLength={40} />
      <input className={o.darkInput} style={{ flex: '1 1 90px' }} value={price} onChange={e => setPrice(e.target.value)} placeholder="Precio" aria-label={`Precio del nuevo ${noun}`} inputMode="numeric" maxLength={9} />
      <button type="submit" className={o.redBtn} style={{ padding: '0 18px' }}>Añadir</button>
      {err && <div role="alert" style={{ width: '100%', fontSize: 12, color: '#F0B7A0' }}>{err}</div>}
    </form>
  )
}

/** Drinks and desserts bought apart, other items and plate add-ons: one section each. */
export function ExtrasPanel() {
  const store = useStore()
  const s = useSnapshot().settings
  const upd = (fn: (s: Settings) => Partial<Settings>) => { void store.updateSettings(fn) }
  const withPrice = (d: typeof MENU[number]) => ({ ...d, price: priceOf(s, d.id, d.price) })
  const drinks = MENU.filter(d => EXTRA_JUICE_IDS.includes(d.id) || EXTRA_DRINK_IDS.includes(d.id)).map(withPrice)
  const addons = allAddons(s)
  const customAddonIds = new Set((s.customAddons ?? []).map(a => a.id))
  const dessert = withPrice(MENU.find(d => d.id === DESSERT_ID)!)
  const row = (key: string, name: string, priceId: string, price: number, soldKey: string, onRemove?: () => void) => (
    <div key={key} className={o.row} style={{ background: 'var(--ink)' }}>
      <div style={{ minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 500 }}>{name}</div><PriceEditor id={priceId} name={name} price={price} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 'none' }}>
        {onRemove && <button type="button" className={o.quitar} aria-label={`Quitar ${name}`} onClick={() => { if (confirm(`¿Quitar ${name}?`)) onRemove() }}>Quitar</button>}
        {soldToggle(soldKey, name)}
      </div>
    </div>
  )
  const soldToggle = (id: string, name: string) => {
    const out = !!s.soldDishes[id]
    return <Toggle on={!out} onBg={GREEN} offBg={RED} label={`${name}: ${out ? 'agotado' : 'disponible'}`}
      onClick={() => upd(st => ({ soldDishes: { ...st.soldDishes, [id]: !st.soldDishes[id] } }))} />
  }

  return (
    <>

      <Fold id="bebidas-aparte" icon="🧃" title="Bebidas aparte" sub={drinks.map(d => `${d.name} ${fmt(d.price)}`).join(' · ')}>
        <div className={o.list} style={{ gap: 8, marginBottom: 12 }}>
          {drinks.map(d => row(d.id, d.name, d.id, d.price, d.id))}
        </div>
        <div className={o.optHead}>Sabores de los jugos</div>
        <ItemEditor noun="sabor de jugo"
          items={(s.juiceFlavors ?? []).map(j => ({ id: j.id, label: j.label, off: j.out }))}
          onToggle={id => upd(st => ({ juiceFlavors: st.juiceFlavors.map(x => x.id === id ? { ...x, out: !x.out } : x) }))}
          onRemove={id => upd(st => ({ juiceFlavors: st.juiceFlavors.filter(x => x.id !== id) }))}
          onAdd={label => upd(st => ({ juiceFlavors: [...(st.juiceFlavors ?? []), { id: newId('jf'), label, out: false }] }))} />
      </Fold>

      <Fold id="postres" icon="🍰" title="Postres" sub={`${fmt(dessert.price)} · ${dessertFlavorList(s).length} sabores`}>
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
      </Fold>

      <Fold id="otros" icon="🛍️" title="Otros productos aparte" sub={(s.customExtras ?? []).length ? (s.customExtras ?? []).map(x => x.name).join(', ') : 'Crea lo que quieras vender aparte'}>
        <div className={o.list} style={{ gap: 8 }}>
          {(s.customExtras ?? []).length === 0 && <div style={{ fontSize: 12.5, color: '#a08a7a' }}>Salen en “Bebidas y postres” y al final de cada plato.</div>}
          {(s.customExtras ?? []).map(x => row(x.id, x.name, x.id, priceOf(s, x.id, x.price), x.id,
            () => upd(st => ({ customExtras: st.customExtras.filter(y => y.id !== x.id) }))))}
        </div>
        <NewPricedItem noun="adicional" onAdd={(name, price) => upd(st => ({ customExtras: [...(st.customExtras ?? []), { id: newId('extra'), name, price }] }))} />
      </Fold>

      <Fold id="adiciones" icon="➕" title="Adiciones al plato" sub={addons.map(a => a.label).join(', ')}>
        <div className={o.list} style={{ gap: 8 }}>
          {addons.map(a => row(a.id, a.label, addonKey(a.id), a.price, addonKey(a.id),
            customAddonIds.has(a.id) ? () => upd(st => ({ customAddons: st.customAddons.filter(y => y.id !== a.id) })) : undefined))}
        </div>
        <NewPricedItem noun="adición" onAdd={(label, price) => upd(st => ({ customAddons: [...(st.customAddons ?? []), { id: newId('ad'), label, price }] }))} />
      </Fold>
    </>
  )
}
