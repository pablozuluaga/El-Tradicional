import { useState } from 'react'
import { newId } from '../domain/ids.ts'
import type { CustomDish } from '../domain/types.ts'
import { useStore } from '../data/hooks.ts'
import o from './o.module.css'

const check = { display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: '#fff', cursor: 'pointer' } as const

/** Lets the owner add a dish to the fixed menu (served every day until they delete it). */
export function NewDishForm({ onDone }: { onDone: () => void }) {
  const store = useStore()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [cat, setCat] = useState<CustomDish['cat']>('Especiales')
  const [desc, setDesc] = useState('')
  const [soup, setSoup] = useState(true)
  const [proteins, setProteins] = useState(true)
  const [drink, setDrink] = useState(false)
  const [rem, setRem] = useState('')
  const [err, setErr] = useState('')

  const save = async () => {
    const n = name.trim(), p = Number(price.replace(/\D/g, ''))
    if (!n) return setErr('Escribe el nombre del plato.')
    if (!p) return setErr('Escribe el precio.')
    const dish: CustomDish = {
      id: newId('plato'), name: n, cat, price: p, desc: desc.trim(), soup, proteins, drink,
      rem: rem.split(',').map(x => x.trim()).filter(Boolean),
    }
    try {
      await store.updateSettings(st => ({ customDishes: [...st.customDishes, dish] }))
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar el plato.')
    }
  }

  return (
    <form className={o.panel} onSubmit={e => { e.preventDefault(); void save() }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className={o.panelHead}>Nuevo plato</div>
      <input className={o.darkInput} value={name} onChange={e => setName(e.target.value)} placeholder="Nombre" aria-label="Nombre del plato" maxLength={50} autoFocus />
      <div style={{ display: 'flex', gap: 8 }}>
        <input className={o.darkInput} style={{ flex: 1 }} value={price} onChange={e => setPrice(e.target.value)} placeholder="Precio (ej. 30000)" aria-label="Precio" inputMode="numeric" maxLength={9} />
        <select className={o.darkInput} style={{ flex: 1 }} value={cat} onChange={e => setCat(e.target.value as CustomDish['cat'])} aria-label="Categoría">
          <option value="Especiales">Especiales</option>
          <option value="Pescados">Pescados</option>
        </select>
      </div>
      <textarea className={o.textarea} style={{ marginTop: 0 }} rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción: qué trae el plato" aria-label="Descripción del plato" maxLength={400} />
      <label style={check}><input type="checkbox" checked={soup} onChange={e => setSoup(e.target.checked)} /> Trae sopa (la sopa del día)</label>
      <label style={check}><input type="checkbox" checked={proteins} onChange={e => setProteins(e.target.checked)} /> El cliente elige la proteína</label>
      <label style={check}><input type="checkbox" checked={drink} onChange={e => setDrink(e.target.checked)} /> Incluye bebida</label>
      <input className={o.darkInput} value={rem} onChange={e => setRem(e.target.value)} placeholder="Qué se puede quitar, separado por comas (ej. Arroz, Maduro)" aria-label="Ingredientes que se pueden quitar" maxLength={300} />
      {err && <div role="alert" style={{ fontSize: 12.5, color: '#F0B7A0' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className={o.smallRed}>Crear plato</button>
        <button type="button" className={o.smallGhost} onClick={onDone}>Cancelar</button>
      </div>
    </form>
  )
}
