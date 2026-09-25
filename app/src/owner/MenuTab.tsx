import { useState } from 'react'
import { newId } from '../domain/ids.ts'
import { DAILY_MENUS, PROTEINS } from '../domain/catalog.ts'
import { fmt } from '../domain/format.ts'
import { dailyMenuFor, dayOffKey, descOf, isDayOff, specials } from '../domain/menu.ts'
import type { DayId, Opt, Settings } from '../domain/types.ts'
import { useSnapshot, useStore } from '../data/hooks.ts'
import { Toggle } from '../ui/ui.tsx'
import o from './o.module.css'

const GREEN = '#2F7D46', RED = '#C8161D'

function DescEditor({ id, current, editing, onEdit, onClose }: { id: string; current: string; editing: boolean; onEdit: () => void; onClose: () => void }) {
  const store = useStore()
  const [draft, setDraft] = useState(current)
  if (!editing) {
    return (
      <>
        <div style={{ fontSize: 12.5, color: '#c9bfae', marginTop: 3, lineHeight: 1.45 }}>{current}</div>
        <button type="button" className={o.linkBtn} onClick={() => { setDraft(current); onEdit() }}>Editar descripción</button>
      </>
    )
  }
  const save = async () => {
    const v = draft.trim()
    if (v) await store.updateSettings(s => ({ descOverrides: { ...s.descOverrides, [id]: v } }))
    onClose()
  }
  return (
    <>
      <textarea className={o.textarea} rows={3} value={draft} onChange={e => setDraft(e.target.value)} aria-label="Descripción" maxLength={400} autoFocus />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" className={o.smallRed} onClick={save}>Guardar</button>
        <button type="button" className={o.smallGhost} onClick={onClose}>Cancelar</button>
      </div>
    </>
  )
}

export function MenuTab() {
  const store = useStore()
  const s = useSnapshot().settings
  const [editing, setEditing] = useState<string | null>(null)
  const [newJuice, setNewJuice] = useState('')
  const upd = (fn: (s: Settings) => Partial<Settings>) => { void store.updateSettings(fn) }
  const m = dailyMenuFor(s.platoDia)

  const dayOpts = (day: DayId, kind: 'sopa' | 'prot', list: Opt[]) => (
    <div className={o.chipsWrap}>
      {list.map(op => {
        const off = isDayOff(s, day, kind, op.id)
        const k = dayOffKey(day, kind, op.id)
        return (
          <button key={op.id} type="button" aria-pressed={!off} className={off ? o.optOff : o.optOn}
            onClick={() => upd(st => { const n = { ...st.dayOff }; if (n[k]) delete n[k]; else n[k] = true; return { dayOff: n } })}>
            {op.label}{off ? '' : ' ✓'}
          </button>
        )
      })}
    </div>
  )

  const addJuice = () => {
    const v = newJuice.trim()
    if (!v) return
    upd(st => ({ juices: [...st.juices, { id: newId('j'), label: v, out: false }] }))
    setNewJuice('')
  }

  return (
    <>
      <div className={o.panel}>
        <div className={o.panelHead} style={{ marginBottom: 4 }}>Menú del día</div>
        <div style={{ fontSize: 12, color: '#c9bfae', marginBottom: 10, lineHeight: 1.4 }}>Elige el día y el menú se publica ya cargado. Toca de nuevo para quitarlo.</div>
        <div className={o.chipsWrap}>
          {DAILY_MENUS.map(dm => {
            const sel = s.platoDia === dm.day
            return <button key={dm.day} type="button" aria-pressed={sel} className={`${o.dayChip} ${sel ? o.dayChipOn : ''}`} onClick={() => upd(st => ({ platoDia: st.platoDia === dm.day ? null : dm.day }))}>{dm.label}</button>
          })}
        </div>
        {m ? (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.08)' }}>
            <div style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7FC795', fontWeight: 600 }}>{m.label} · visible para el cliente</div>
            <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{m.name ?? 'Menú del día'}</div>
            <DescEditor key={m.day} id={m.day} current={descOf(s, m.day, m.desc)} editing={editing === m.day} onEdit={() => setEditing(m.day)} onClose={() => setEditing(null)} />
            <div style={{ fontSize: 12.5, marginTop: 6 }}>{fmt(m.price)}</div>
            {(m.sopas || m.proteins) && (
              <div style={{ marginTop: 13 }}>
                {m.sopas && <><div className={o.optHead}>Sopas · toca para quitar o poner</div>{dayOpts(m.day, 'sopa', m.sopas)}</>}
                {m.proteins && <><div className={o.optHead} style={{ margin: '13px 0 7px' }}>Proteínas · toca para quitar o poner</div>{dayOpts(m.day, 'prot', m.proteins)}</>}
              </div>
            )}
            <button type="button" className={o.smallGhost} style={{ marginTop: 10, color: '#fff', borderRadius: 10, fontSize: 12.5, fontWeight: 600, padding: '8px 14px' }} onClick={() => upd(() => ({ platoDia: null }))}>Quitar del menú</button>
          </div>
        ) : (
          <div style={{ marginTop: 12, fontSize: 12.5, color: '#a08a7a' }}>Sin elegir: el menú del día no aparece en la app del cliente.</div>
        )}
      </div>

      <div className={o.label}>Bebidas: incluidas con el plato</div>
      <div className={o.list} style={{ gap: 9, marginBottom: 12 }}>
        {s.juices.map(j => (
          <div key={j.id} className={o.row}>
            <span style={{ fontSize: 14, fontWeight: 500, color: j.out ? '#8b8070' : '#fff' }}>{j.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button type="button" className={o.quitar} onClick={() => upd(st => ({ juices: st.juices.filter(x => x.id !== j.id) }))}>Quitar</button>
              <Toggle on={!j.out} onBg={GREEN} offBg={RED} label={`${j.label}: ${j.out ? 'agotado' : 'disponible'}`}
                onClick={() => upd(st => ({ juices: st.juices.map(x => x.id === j.id ? { ...x, out: !x.out } : x) }))} />
            </div>
          </div>
        ))}
        <form style={{ display: 'flex', gap: 8 }} onSubmit={e => { e.preventDefault(); addJuice() }}>
          <input className={o.darkInput} style={{ flex: 1, background: '#201C18' }} value={newJuice} onChange={e => setNewJuice(e.target.value)} placeholder="Agregar bebida" aria-label="Nueva bebida" maxLength={40} />
          <button type="submit" className={o.redBtn} style={{ padding: '0 18px' }}>Añadir</button>
        </form>
      </div>

      <div className={o.label}>Proteínas: apaga lo que se agotó</div>
      <div className={o.list} style={{ gap: 9, marginBottom: 18 }}>
        {PROTEINS.map(p => {
          const out = !!s.soldProteins[p.id]
          return (
            <div key={p.id} className={o.row}>
              <span style={{ fontSize: 14, fontWeight: 500, color: out ? '#8b8070' : '#fff' }}>{p.label}</span>
              <Toggle on={!out} onBg={GREEN} offBg={RED} label={`${p.label}: ${out ? 'agotado' : 'disponible'}`}
                onClick={() => upd(st => ({ soldProteins: { ...st.soldProteins, [p.id]: !st.soldProteins[p.id] } }))} />
            </div>
          )
        })}
      </div>

      <div className={o.label}>Platos: apaga los que no hay hoy · edita su descripción</div>
      <div className={o.list} style={{ gap: 9 }}>
        {specials(s).map(d => {
          const out = !!s.soldDishes[d.id]
          return (
            <div key={d.id} className={o.row} style={{ display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div><span style={{ fontSize: 14, fontWeight: 500, color: out ? '#8b8070' : '#fff' }}>{d.name}</span><span style={{ fontSize: 12, color: '#8b8070', marginLeft: 8 }}>{fmt(d.price)}</span></div>
                <Toggle on={!out} onBg={GREEN} offBg={RED} label={`${d.name}: ${out ? 'agotado' : 'disponible'}`}
                  onClick={() => upd(st => ({ soldDishes: { ...st.soldDishes, [d.id]: !st.soldDishes[d.id] } }))} />
              </div>
              <div style={{ marginTop: 4 }}>
                <DescEditor key={d.id} id={d.id} current={d.desc} editing={editing === d.id} onEdit={() => setEditing(d.id)} onClose={() => setEditing(null)} />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
