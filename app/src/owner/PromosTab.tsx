import { useState } from 'react'
import { newId } from '../domain/ids.ts'
import { useSnapshot, useStore } from '../data/hooks.ts'
import { Toggle } from '../ui/ui.tsx'
import { Fold } from './Fold.tsx'
import o from './o.module.css'

export function PromosTab() {
  const store = useStore()
  const promos = useSnapshot().settings.promos
  const [title, setTitle] = useState('')
  const [sub, setSub] = useState('')
  const add = () => {
    const t = title.trim()
    if (!t) return
    void store.updateSettings(s => ({ promos: [...s.promos, { id: newId('p'), title: t, sub: sub.trim() || 'Promoción del restaurante', active: true }] }))
    setTitle(''); setSub('')
  }
  const active = promos.filter(p => p.active).length
  return (
    <>
      <Fold id="promos" icon="🎁" title="Promociones" defaultOpen sub={`${active} ${active === 1 ? 'activa' : 'activas'} · las activas se ven en la app del cliente`}>
        <div className={o.list}>
          {promos.length === 0 && <div style={{ fontSize: 12.5, color: '#a08a7a' }}>No hay promociones. Crea una abajo.</div>}
          {promos.map(p => (
            <div key={p.id} className={o.row} style={{ display: 'block', background: 'var(--ink)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: p.active ? '#fff' : '#8b8070' }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: '#c9bfae', marginTop: 4, lineHeight: 1.4 }}>{p.sub}</div>
                </div>
                <Toggle on={p.active} onBg="#2F7D46" offBg="#4a453c" label={`${p.title}: ${p.active ? 'activa' : 'inactiva'}`}
                  onClick={() => void store.updateSettings(s => ({ promos: s.promos.map(x => x.id === p.id ? { ...x, active: !x.active } : x) }))} />
              </div>
              <button type="button" className={o.quitar} style={{ marginTop: 10 }}
                onClick={() => void store.updateSettings(s => ({ promos: s.promos.filter(x => x.id !== p.id) }))}>Eliminar promoción</button>
            </div>
          ))}
        </div>
      </Fold>
      <Fold id="crear-promo" icon="✨" title="Crear promoción" sub="Se publica al instante en la app del cliente">
        <form onSubmit={e => { e.preventDefault(); add() }}>
          <input className={o.darkInput} style={{ marginBottom: 8 }} value={title} onChange={e => setTitle(e.target.value)} placeholder="Título (ej: 2x1 los martes)" aria-label="Título" maxLength={60} />
          <input className={o.darkInput} style={{ marginBottom: 10 }} value={sub} onChange={e => setSub(e.target.value)} placeholder="Descripción corta" aria-label="Descripción corta" maxLength={120} />
          <button type="submit" className={o.redBtn} style={{ width: '100%' }}>Crear y publicar</button>
        </form>
      </Fold>
    </>
  )
}
