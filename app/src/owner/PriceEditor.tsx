import { useState } from 'react'
import { fmt } from '../domain/format.ts'
import { useStore } from '../data/hooks.ts'
import o from './o.module.css'

/** Shows a price with "Cambiar precio"; saves it as the owner's price for that dish (or day's menu). */
export function PriceEditor({ id, price, name, onSave, allowZero = false }: {
  id: string; price: number; name: string
  /** saves somewhere else than the dish prices (e.g. a barrio's delivery fee) */
  onSave?: (v: number) => Promise<void>
  allowZero?: boolean
}) {
  const store = useStore()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')
  if (!editing) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 12.5, color: '#c9bfae' }}>{allowZero && price === 0 ? 'Sin costo' : fmt(price)}</span>
        <button type="button" className={o.linkBtn} style={{ marginTop: 0 }} onClick={() => { setDraft(String(price)); setErr(''); setEditing(true) }}>Cambiar precio</button>
      </span>
    )
  }
  const save = async () => {
    const v = Number(draft.replace(/\D/g, ''))
    if ((!v && !(allowZero && draft.trim() !== '')) || v > 1_000_000) { setErr('Escribe un precio válido.'); return }
    try {
      if (onSave) await onSave(v)
      else await store.updateSettings(s => ({ priceOverrides: { ...s.priceOverrides, [id]: v } }))
      setEditing(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar el precio.')
    }
  }
  return (
    <form style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 6 }} onSubmit={e => { e.preventDefault(); void save() }}>
      <input className={o.darkInput} style={{ width: 130, padding: '8px 11px', fontSize: 13 }} value={draft} onChange={e => setDraft(e.target.value)}
        inputMode="numeric" aria-label={`Precio de ${name}`} maxLength={9} autoFocus />
      <button type="submit" className={o.smallRed}>Guardar</button>
      <button type="button" className={o.smallGhost} onClick={() => setEditing(false)}>Cancelar</button>
      {err && <span role="alert" style={{ fontSize: 12, color: '#F0B7A0', width: '100%' }}>{err}</span>}
    </form>
  )
}
