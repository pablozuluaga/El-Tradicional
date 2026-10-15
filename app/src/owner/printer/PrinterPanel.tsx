import { useEffect, useMemo, useRef } from 'react'
import type { Order } from '../../domain/types.ts'
import { Toggle } from '../../ui/ui.tsx'
import { Fold } from '../Fold.tsx'
import o from '../o.module.css'
import { printer } from './printer.ts'
import { drawTicket } from './render.ts'
import { buildTicket, type Block } from './ticket.ts'
import { usePrinter } from './usePrinter.ts'

/** A made-up order for the test print and the preview. */
const SAMPLE: Order = {
  num: 1001, customerId: '', name: 'Prueba Cliente', email: '', phone: '3001234567', origin: 'domicilio',
  zoneId: 'magnolia', zoneLabel: 'La Magnolia', address: 'Calle 40 Sur # 27-15', addressNotes: 'Edificio / Apto / Torre: Torre 2 apto 503\nPortería azul',
  items: '', itemsList: [], subtotal: 57000, discount: 0, discountKind: null, delivery: 0, deliveryPending: false, total: 57000,
  pay: 'Efectivo (contra entrega)', createdAt: new Date().toISOString(), status: 'aceptado', rejectReason: null, rated: false,
  reviewStars: null, reviewComment: null, clientSeenId: 0, ownerSeenId: 0, chat: [],
  lines: [
    { dishId: 'dia', name: 'Menú del día', qty: 2, unit: 22000, detail: { opts: ['Res', 'Guandolo', 'Sopa campesina'], removed: ['Arroz', 'Maduro'], addons: [], note: 'Bien caliente' } },
    { dishId: 'trucha', name: 'Trucha', qty: 1, unit: 35000, detail: { opts: ['Jugo'], removed: [], addons: ['Arroz'], note: '' } },
  ],
}

const STATUS: Record<string, string> = {
  unsupported: 'Este celular no puede conectarse a la impresora',
  off: 'Sin conectar',
  connecting: 'Conectando…',
  ready: 'Conectada',
  printing: 'Imprimiendo…',
  error: 'Error',
}

/** The ticket drawn exactly as it is sent to the printer. */
function TicketPreview({ blocks }: { blocks: Block[] }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const c = drawTicket(blocks)
    c.style.width = '100%'; c.style.height = 'auto'; c.style.display = 'block'
    box.current?.replaceChildren(c)
  }, [blocks])
  return <div ref={box} style={{ background: '#fff', borderRadius: 8, padding: 6, marginTop: 10, maxWidth: 260 }} />
}

/** Kitchen printer setup: connect once, print a test, choose automatic printing on accept. */
export function PrinterPanel() {
  const st = usePrinter()
  const sample = useMemo(() => buildTicket(SAMPLE), [])

  const sub = st.status === 'ready' || st.status === 'printing'
    ? `${STATUS[st.status]}: ${st.name}${st.auto ? ' · imprime al aceptar' : ''}`
    : STATUS[st.status]

  return (
    <Fold id="impresora" icon="🖨️" title="Impresora de comandas" sub={sub}>
      {st.status === 'unsupported' ? (
        <div style={{ fontSize: 13, color: '#e7ddce', lineHeight: 1.5 }}>
          Para imprimir, abre este panel en el <b>celular Android con Chrome</b> que queda junto a la impresora. Desde Safari (iPhone) no se puede conectar,
          pero si aceptas los pedidos aquí, el Android los imprime solo.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {st.status === 'ready' || st.status === 'printing' ? (
            <div className={o.row} style={{ background: 'var(--ink)' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>✅ {st.name}</span>
              <button type="button" className={o.smallGhost} onClick={() => printer.disconnect()}>Desconectar</button>
            </div>
          ) : (
            <button type="button" className={o.greenBtn} disabled={st.status === 'connecting'} onClick={() => void printer.connect()}>
              {st.status === 'connecting' ? 'Conectando…' : '🔗 Conectar impresora'}
            </button>
          )}
          {st.status === 'off' && <div className={o.hint} style={{ marginTop: -4 }}>Prende la impresora, toca el botón y elige <b>{st.name ?? 'DIG-M220'}</b> en la lista.</div>}

          <div className={o.row} style={{ background: 'var(--ink)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Imprimir solo al aceptar</div>
              <div style={{ fontSize: 11.5, color: '#a89d8c' }}>Cada pedido que se acepte, aquí o en otro celular, sale impreso.</div>
            </div>
            <Toggle on={st.auto} onBg="#2F7D46" offBg="#4a453c" label={`Imprimir al aceptar: ${st.auto ? 'sí' : 'no'}`} onClick={() => printer.setAuto(!st.auto)} />
          </div>

          <button type="button" className={o.smallRed} style={{ padding: 11, fontSize: 13.5 }} disabled={st.status !== 'ready'}
            onClick={() => void printer.printBlocks(sample)}>Imprimir comanda de prueba</button>

          {st.error && <div className={o.msg} role="alert" style={{ color: '#F0A0A0', marginTop: 0 }}>{st.error}</div>}

          <details className={o.details}>
            <summary className={o.summary}><span>Tipo de impresora</span><span className={o.summarySub}>Cámbialo solo si la prueba sale en blanco o con símbolos raros</span></summary>
            <div style={{ display: 'flex', gap: 8, paddingTop: 10 }}>
              {([['tspl', 'Etiquetas (TSPL)'], ['escpos', 'Recibos (ESC/POS)']] as const).map(([id, label]) => (
                <button key={id} type="button" aria-pressed={st.lang === id} className={`${o.dayChip} ${st.lang === id ? o.dayChipOn : ''}`}
                  onClick={() => printer.setLang(id)}>{label}</button>
              ))}
            </div>
          </details>

          <details className={o.details}>
            <summary className={o.summary}><span>Así se ve la comanda</span><span className={o.summarySub}>Ejemplo con 48 mm de ancho</span></summary>
            <TicketPreview blocks={sample} />
          </details>

          <div className={o.hint} style={{ marginTop: 0 }}>
            Usa <b>rollo térmico continuo</b> (sin etiquetas). Deja este celular con el panel abierto, la pantalla prendida y la impresora a menos de 10 metros.
          </div>
        </div>
      )}
    </Fold>
  )
}
