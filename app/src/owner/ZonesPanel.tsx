import { useState } from 'react'
import { newId } from '../domain/ids.ts'
import { zonesOf } from '../domain/pricing.ts'
import type { Settings } from '../domain/types.ts'
import { useSnapshot, useStore } from '../data/hooks.ts'
import { PriceEditor } from './PriceEditor.tsx'
import o from './o.module.css'

/** Barrios for delivery: the owner adds, removes and changes each delivery price. */
export function ZonesPanel() {
  const store = useStore()
  const s = useSnapshot().settings
  const zones = zonesOf(s)
  const [name, setName] = useState('')
  const [fee, setFee] = useState('')
  const [err, setErr] = useState('')
  const save = (fn: (z: NonNullable<Settings['zones']>) => NonNullable<Settings['zones']>) => store.updateSettings(st => ({ zones: fn(zonesOf(st)) }))
  const add = () => {
    const n = name.trim(), f = Number(fee.replace(/\D/g, ''))
    if (!n) return setErr('Escribe el nombre del barrio.')
    if (fee.trim() === '' || f > 1_000_000) return setErr('Escribe el valor del domicilio (0 si es gratis).')
    if (zones.some(z => z.label.toLowerCase() === n.toLowerCase())) return setErr('Ese barrio ya está en la lista.')
    void save(z => [...z, { id: newId('z'), label: n, fee: f }])
    setName(''); setFee(''); setErr('')
  }
  return (
    <div className={o.panel} style={{ marginTop: 18 }}>
      <details className={o.details} style={{ borderTop: 'none', paddingTop: 0 }}>
        <summary className={o.summary}><span>Barrios y domicilios</span><span className={o.summarySub}>{zones.length} barrios · toca para ver, agregar o cambiar precios</span></summary>
        <div className={o.list} style={{ gap: 8, paddingTop: 12 }}>
          {zones.map(z => (
            <div key={z.id} className={o.row} style={{ background: 'var(--ink)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{z.label}</div>
                <PriceEditor id={'zone:' + z.id} name={z.label} price={z.fee} allowZero
                  onSave={v => save(list => list.map(x => (x.id === z.id ? { ...x, fee: v } : x)))} />
              </div>
              <button type="button" className={o.quitar} aria-label={`Quitar ${z.label}`}
                onClick={() => { if (confirm(`¿Quitar ${z.label} de la lista de barrios?`)) void save(list => list.filter(x => x.id !== z.id)) }}>Quitar</button>
            </div>
          ))}
          <form style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }} onSubmit={e => { e.preventDefault(); add() }}>
            <input className={o.darkInput} style={{ flex: '2 1 140px' }} value={name} onChange={e => setName(e.target.value)} placeholder="Nuevo barrio" aria-label="Nombre del nuevo barrio" maxLength={50} />
            <input className={o.darkInput} style={{ flex: '1 1 90px' }} value={fee} onChange={e => setFee(e.target.value)} placeholder="Domicilio" aria-label="Valor del domicilio del nuevo barrio" inputMode="numeric" maxLength={9} />
            <button type="submit" className={o.redBtn} style={{ padding: '0 18px' }}>Añadir</button>
            {err && <div role="alert" style={{ width: '100%', fontSize: 12, color: '#F0B7A0' }}>{err}</div>}
          </form>
          <div style={{ fontSize: 11.5, color: '#a89d8c' }}>La opción “Otro (escribe tu barrio)” siempre aparece al final para el cliente.</div>
        </div>
      </details>
    </div>
  )
}
