import { useState } from 'react'
import { DAILY_MENUS } from '../domain/catalog.ts'
import { newId } from '../domain/ids.ts'
import { dayOffKey, dayProteinList, daySoupList, isDayOff, serviceDay } from '../domain/menu.ts'
import type { DayId, Opt, Settings } from '../domain/types.ts'
import { useSnapshot, useStore } from '../data/hooks.ts'
import { Toggle } from '../ui/ui.tsx'
import o from './o.module.css'

const GREEN = '#2F7D46', RED = '#C8161D'

const KINDS = {
  sopa: {
    title: 'Sopas', noun: 'sopa', empty: 'Sin sopas este día.', placeholder: 'Nueva sopa',
    help: 'Las del día salen en el menú del día y en los platos que traen sopa. Crea, quita o apaga las de cada día.',
    list: daySoupList, field: 'daySoups' as const,
  },
  prot: {
    title: 'Proteínas especiales del día', noun: 'proteína', empty: 'Sin proteínas especiales este día.', placeholder: 'Nueva proteína',
    help: 'De lunes a viernes salen en el menú del día; sábado y domingo, en los platos donde se elige proteína (Bandeja Especial, Cazuela…).',
    list: dayProteinList, field: 'dayProteins' as const,
  },
}

/** Each day's soups or special proteins: the owner adds, removes or switches them off. */
export function DayListPanel({ kind }: { kind: 'sopa' | 'prot' }) {
  const K = KINDS[kind]
  const store = useStore()
  const s = useSnapshot().settings
  // follows the published day (or today) until the owner picks another one
  const [picked, setDay] = useState<DayId | null>(null)
  const day = picked ?? serviceDay(s)
  const [draft, setDraft] = useState('')
  const upd = (fn: (s: Settings) => Partial<Settings>) => { void store.updateSettings(fn) }
  const list = K.list(s, day)
  const setList = (fn: (l: Opt[]) => Opt[]) => upd(st => ({ [K.field]: { ...st[K.field], [day]: fn(K.list(st, day)) } }))

  const add = () => {
    const label = draft.trim()
    if (!label) return
    const item = { id: newId(kind), label }
    // new soups go before "Sin sopa" so that one stays last
    setList(l => {
      const i = l.findIndex(x => x.id === 'sinsopa')
      return i < 0 ? [...l, item] : [...l.slice(0, i), item, ...l.slice(i)]
    })
    setDraft('')
  }

  return (
    <div className={o.panel}>
      <div className={o.panelHead} style={{ marginBottom: 4 }}>{K.title}</div>
      <div style={{ fontSize: 12, color: '#c9bfae', marginBottom: 10, lineHeight: 1.4 }}>{K.help}</div>
      <div className={o.chipsWrap}>
        {DAILY_MENUS.map(dm => (
          <button key={dm.day} type="button" aria-pressed={day === dm.day} className={`${o.dayChip} ${day === dm.day ? o.dayChipOn : ''}`} onClick={() => setDay(dm.day)}>{dm.label}</button>
        ))}
      </div>
      <div className={o.list} style={{ gap: 8, marginTop: 12 }}>
        {list.length === 0 && <div style={{ fontSize: 12.5, color: '#a08a7a' }}>{K.empty}</div>}
        {list.map(op => {
          const off = isDayOff(s, day, kind, op.id)
          const k = dayOffKey(day, kind, op.id)
          return (
            <div key={op.id} className={o.row} style={{ background: 'var(--ink)' }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: off ? '#8b8070' : '#fff' }}>{op.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button type="button" className={o.quitar} aria-label={`Quitar ${op.label}`} onClick={() => setList(l => l.filter(x => x.id !== op.id))}>Quitar</button>
                <Toggle on={!off} onBg={GREEN} offBg={RED} label={`${op.label}: ${off ? 'apagada' : 'disponible'}`}
                  onClick={() => upd(st => { const n = { ...st.dayOff }; if (n[k]) delete n[k]; else n[k] = true; return { dayOff: n } })} />
              </div>
            </div>
          )
        })}
        <form style={{ display: 'flex', gap: 8 }} onSubmit={e => { e.preventDefault(); add() }}>
          <input className={o.darkInput} style={{ flex: 1 }} value={draft} onChange={e => setDraft(e.target.value)} placeholder={K.placeholder} aria-label={K.placeholder} maxLength={40} />
          <button type="submit" className={o.redBtn} style={{ padding: '0 18px' }}>Añadir</button>
        </form>
      </div>
    </div>
  )
}
