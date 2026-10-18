import { useEffect, useState } from 'react'
import { useSnapshot, useStore } from '../data/hooks.ts'
import { downloadBlob } from './download.ts'
import { TabHead } from './Fold.tsx'
import { buildReport } from './report.ts'
import o from './o.module.css'

function ReportCard() {
  const store = useStore()
  const snap = useSnapshot()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [count, setCount] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let alive = true
    const t = setTimeout(() => { store.reportCount(from, to).then(n => { if (alive) setCount(n) }, () => {}) }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [store, from, to, snap.orders])

  const download = async () => {
    try {
      const rows = await store.reportRows(from, to)
      if (!rows.length) { setMsg('No hay pedidos en ese rango de fechas.'); return }
      setMsg('Generando el reporte…')
      const { blob, name } = await buildReport(rows, from, to)
      downloadBlob(blob, name)
      setMsg('Listo: ' + name + ' · ' + rows.length + ' pedidos.')
    } catch {
      setMsg('No se pudo generar el archivo. Revisa la conexión e intenta de nuevo.')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <label style={{ flex: 1 }}><div className={o.small}>Desde</div><input type="date" className={o.dateInput} value={from} max={to || undefined} onChange={e => { setFrom(e.target.value); setMsg('') }} /></label>
        <label style={{ flex: 1 }}><div className={o.small}>Hasta</div><input type="date" className={o.dateInput} value={to} min={from || undefined} onChange={e => { setTo(e.target.value); setMsg('') }} /></label>
      </div>
      <button type="button" className={o.greenBtn} onClick={download}>⬇ Descargar reporte en Excel (.xlsx)</button>
      <div className={o.hint}>
        Archivo con formato profesional: pedidos, cliente, detalle, pago, totales y resumen del periodo. Los pedidos rechazados o eliminados no se incluyen.
        {count !== null && <> {count} {count === 1 ? 'pedido en el rango' : 'pedidos en el rango'}.</>}
      </div>
      {msg && <div className={o.msg} role="status">{msg}</div>}
    </div>
  )
}

export function BillingTab() {
  return (
    <>
      <TabHead title="Facturación" sub="Descarga en Excel los pedidos de un rango de fechas" />
      <div className={o.panel}><ReportCard /></div>
    </>
  )
}
