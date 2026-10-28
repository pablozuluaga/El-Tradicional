import { useEffect, useMemo, useRef } from 'react'
import type { Order } from '../../domain/types.ts'
import { Toggle } from '../../ui/ui.tsx'
import { TabHead } from '../Fold.tsx'
import o from '../o.module.css'
import { printer } from './printer.ts'
import { drawTextTicket, drawTicket } from './render.ts'
import { layoutText } from './text.ts'
import type { PrinterLang } from './encode.ts'
import { buildTicket, type Block } from './ticket.ts'
import { usePrinter } from './usePrinter.ts'

/** A made-up order for the test print and the preview. */
const SAMPLE: Order = {
  num: 1001, customerId: '', name: 'Prueba Cliente', email: '', phone: '3001234567', origin: 'domicilio',
  zoneId: 'magnolia', zoneLabel: 'La Magnolia', address: 'Calle 40 Sur # 27-15', addressNotes: 'Edificio / Apto / Torre: Torre 2 apto 503\nPortería azul',
  items: '', itemsList: [], subtotal: 57000, delivery: 0, deliveryPending: false, total: 57000,
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
function TicketPreview({ blocks, lang }: { blocks: Block[]; lang: PrinterLang }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const c = lang === 'texto' ? drawTextTicket(layoutText(blocks)) : drawTicket(blocks)
    c.style.width = '100%'; c.style.height = 'auto'; c.style.display = 'block'
    box.current?.replaceChildren(c)
  }, [blocks, lang])
  return <div ref={box} style={{ background: '#fff', borderRadius: 8, padding: 6, marginTop: 10, maxWidth: 260 }} />
}

/** Kitchen printer setup: connect once, print a test, choose automatic printing on accept. */
export function PrinterPanel() {
  const st = usePrinter()
  const sample = useMemo(() => buildTicket(SAMPLE), [])

  const sub = st.status === 'printing' && st.progress !== null
    ? `Imprimiendo… ${st.progress}%`
    : st.reconnecting && (st.status === 'off' || st.status === 'connecting')
      ? 'Se perdió la conexión · reconectando sola…'
      : st.status === 'ready' || st.status === 'printing'
      ? `${STATUS[st.status]}: ${st.name}${st.auto ? ' · imprime al aceptar' : ''}`
      : STATUS[st.status]

  return (
    <>
      <TabHead title="Impresora de comandas" sub={sub} />
      <div className={o.panel}>
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

          {st.status === 'printing' && st.progress !== null && (
            <div className={o.progress} aria-label={`Enviando a la impresora: ${st.progress}%`}><i style={{ width: st.progress + '%' }} /></div>
          )}
          {st.error && <div className={o.msg} role="alert" style={{ color: '#F0A0A0', marginTop: 0 }}>{st.error}{st.detail && <span style={{ display: 'block', color: '#a89d8c', fontSize: 11 }}>Detalle: {st.detail}</span>}</div>}

          <details className={o.details}>
            <summary className={o.summary}><span>Tipo de impresión</span><span className={o.summarySub}>Texto es más rápido y seguro; Imagen lleva tildes y letra más grande</span></summary>
            <div style={{ display: 'flex', gap: 8, paddingTop: 10 }}>
              {([['texto', 'Texto (recomendado)'], ['imagen', 'Imagen']] as const).map(([id, label]) => (
                <button key={id} type="button" aria-pressed={st.lang === id} className={`${o.dayChip} ${st.lang === id ? o.dayChipOn : ''}`}
                  onClick={() => printer.setLang(id)}>{label}</button>
              ))}
            </div>
          </details>

          {(st.status === 'ready' || st.status === 'printing') && st.channels.length > 0 && (
            <details className={o.details}>
              <summary className={o.summary}><span>Diagnóstico: si no imprime</span><span className={o.summarySub}>Encuentra el canal y el tipo de impresora</span></summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10 }}>
                <div style={{ fontSize: 12.5, color: '#e7ddce', lineHeight: 1.5 }}>
                  Toca <b>Probar</b> en cada canal, uno por uno, y mira la impresora:
                  <br />• Si sale <b>PRUEBA EL TRADICIONAL</b>: ese es el canal, toca <b>Usar este</b>.
                  <br />• Si no sale nada, prueba el siguiente.
                </div>
                {st.channels.map(ch => (
                  <div key={ch.key} className={o.row} style={{ background: 'var(--ink)', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, fontFamily: 'monospace' }}>{ch.key}{st.channel === ch.key && <span style={{ color: '#7ED694', fontFamily: 'inherit' }}> · en uso</span>}</div>
                      <div style={{ fontSize: 11, color: '#a89d8c' }}>{[ch.noResponse && 'rápido', ch.write && 'con confirmación'].filter(Boolean).join(' · ')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className={o.smallGhost} onClick={() => void printer.testChannel(ch.key)}>Probar</button>
                      {st.channel !== ch.key && <button type="button" className={o.smallRed} onClick={() => printer.setChannel(ch.key)}>Usar este</button>}
                    </div>
                  </div>
                ))}
                <div>
                  <div className={o.optHead}>Velocidad de envío</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {([['lenta', 'Lenta (más segura)'], ['normal', 'Normal'], ['rapida', 'Rápida']] as const).map(([id, label]) => (
                      <button key={id} type="button" aria-pressed={st.speed === id} className={`${o.dayChip} ${st.speed === id ? o.dayChipOn : ''}`}
                        onClick={() => printer.setSpeed(id)}>{label}</button>
                    ))}
                  </div>
                  <div className={o.hint}>Si la prueba sale pero la comanda no, o sale cortada, usa <b>Lenta</b>.</div>
                </div>
              </div>
            </details>
          )}

          <details className={o.details}>
            <summary className={o.summary}><span>Así se ve la comanda</span><span className={o.summarySub}>Ejemplo con 48 mm de ancho</span></summary>
            <TicketPreview blocks={sample} lang={st.lang} />
          </details>

          <details className={o.details}>
            <summary className={o.summary}><span>¿Sale papel en blanco sin parar o la comanda sale cortada?</span><span className={o.summarySub}>La impresora está en modo etiquetas: cámbiala a papel continuo</span></summary>
            <div style={{ fontSize: 12.5, color: '#e7ddce', lineHeight: 1.55, paddingTop: 8 }}>
              En modo etiquetas la impresora corta la comanda al largo de una etiqueta y luego busca la siguiente, así que con rollo continuo saca papel sin parar.
              <br />1. Desconecta la impresora aquí (botón <b>Desconectar</b>).
              <br />2. Abre <b>Gprinter Life</b>, conéctala y entra a los ajustes de la impresora.
              <br />3. En <b>Tipo de papel</b> elige <b>Papel continuo</b> (o "Recibo"), no "Etiqueta" ni "Marca negra", y guarda.
              <br />4. Comprueba con la autoprueba (mantén el botón de papel al prenderla): debe decir <b>PAPER TYPE: CONTINUOUS</b> o similar.
              <br />5. Vuelve aquí y conéctala de nuevo.
            </div>
          </details>

          <details className={o.details}>
            <summary className={o.summary}><span>¿Se desconecta seguido?</span><span className={o.summarySub}>La app reconecta sola, pero esto lo evita</span></summary>
            <div style={{ fontSize: 12.5, color: '#e7ddce', lineHeight: 1.55, paddingTop: 8 }}>
              Si se cae la conexión, la app vuelve a conectar sola y los pedidos que no salieron se imprimen al volver. Para que casi no pase:
              <br />1. <b>Ahorro de batería del celular:</b> en Ajustes → Aplicaciones → Chrome → Batería, elige <b>Sin restricciones</b>. Desactiva también el modo de ahorro de energía.
              <br />2. <b>Apagado automático de la impresora:</b> en <b>Gprinter Life</b>, en los ajustes de la impresora, pon el apagado automático en <b>Nunca</b> o en el tiempo más largo.
              <br />3. <b>Carga:</b> deja el celular y la impresora conectados al cargador; con poca batería el Bluetooth se debilita.
              <br />4. <b>Ubicación:</b> a menos de 3 metros y sin paredes, neveras, hornos o microondas en medio (el microondas interfiere con el Bluetooth).
              <br />5. <b>Pantalla:</b> deja este panel abierto en Chrome, en primer plano. Si el celular se bloquea, al desbloquearlo la impresora se reconecta sola.
            </div>
          </details>

          <div className={o.hint} style={{ marginTop: 0 }}>
            Usa <b>rollo térmico continuo</b> (sin etiquetas). Deja este celular con el panel abierto, la pantalla prendida y la impresora a menos de 10 metros.
          </div>
        </div>
      )}
      </div>
    </>
  )
}
