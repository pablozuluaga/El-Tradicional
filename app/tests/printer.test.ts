import { test } from 'node:test'
import assert from 'node:assert/strict'
import { escposRaster, packBits, tsplBitmap } from '../src/owner/printer/encode.ts'
import { buildTicket, parseDetailLine, ticketLines } from '../src/owner/printer/ticket.ts'
import { orderLines } from '../src/domain/orders.ts'
import { mkOrder } from './helpers.ts'

test('old orders: the detail line is read back into choices, what to leave out, add-ons and note', () => {
  assert.deepEqual(parseDetailLine('2× Bandeja Paisa — res, guandolo, sopa campesina, sin arroz, maduro, adición: huevo, nota: bien caliente, sin sal'), {
    qty: 2, name: 'Bandeja Paisa',
    detail: { opts: ['res', 'guandolo', 'sopa campesina'], removed: ['arroz', 'maduro'], addons: ['huevo'], note: 'bien caliente, sin sal' },
  })
  assert.deepEqual(parseDetailLine('1× Trucha'), { qty: 1, name: 'Trucha', detail: { opts: [], removed: [], addons: [], note: '' } })
})

test('new orders carry the kitchen detail on each line', () => {
  const [l] = orderLines([{ key: 'k', dishId: 'paisa', name: 'Bandeja Paisa', cat: 'Especiales', basePrice: 35000, domPrice: 35000, qty: 1,
    opts: ['Sopa campesina'], proteinLabel: 'Res', juiceLabel: 'Guandolo', note: ' poco hielo ', removed: ['Arroz'], addons: ['Huevo'] }], 'recoger')
  assert.deepEqual(l.detail, { opts: ['Res', 'Guandolo', 'Sopa campesina'], removed: ['Arroz'], addons: ['Huevo'], note: 'poco hielo' })
})

test('the comanda: number, delivery banner, each dish and a SIN block for what to leave out', () => {
  const o = mkOrder({
    num: 1043, origin: 'domicilio', zoneLabel: 'La Magnolia', address: 'Calle 40 Sur # 27-15', addressNotes: 'Edificio / Apto / Torre: Torre 2\nPortería azul',
    lines: [{ dishId: 'paisa', name: 'Bandeja Paisa', qty: 2, unit: 35000, detail: { opts: ['res'], removed: ['Arroz', 'Maduro'], addons: [], note: 'bien caliente' } }],
  })
  const b = buildTicket(o)
  const texts = b.map(x => ('text' in x ? `${x.kind}:${x.text}` : x.kind === 'row' ? `row:${x.left}=${x.right}` : x.kind))
  assert.ok(texts.includes('number:#1043'))
  assert.ok(texts.includes('banner:DOMICILIO'))
  assert.ok(texts.includes('text:Torre 2') && texts.includes('text:Indicaciones: Portería azul'))
  assert.ok(texts.includes('dish:2× Bandeja Paisa'))
  assert.ok(texts.includes('sin:SIN ARROZ, MADURO'))
  assert.ok(texts.includes('text:Nota: bien caliente'))
  assert.ok(texts.some(t => t.startsWith('row:Total=')))
  assert.equal(buildTicket(mkOrder({ origin: 'recoger' })).find(x => x.kind === 'banner')?.kind, 'banner')
  // orders without structured lines fall back to their detail text
  assert.deepEqual(ticketLines(mkOrder({ lines: [{ dishId: 'x', name: 'X', qty: 1, unit: 1 }], itemsList: ['1× Trucha — sin patacón'] }))[0].detail.removed, ['patacón'])
})

test('printer commands for a 1-bit image: ESC/POS raster bands and a TSPL bitmap on continuous paper', () => {
  // 16×2 image: first row black on the left 8 pixels, second row white
  const rgba = new Uint8ClampedArray(16 * 2 * 4).fill(255)
  for (let x = 0; x < 8; x++) rgba.set([0, 0, 0, 255], x * 4)
  const img = packBits(rgba, 16, 2)
  assert.deepEqual([...img.bits], [0xff, 0x00, 0x00, 0x00])
  const esc = escposRaster(img)
  assert.deepEqual([...esc.subarray(0, 10)], [0x1b, 0x40, 0x1d, 0x76, 0x30, 0x00, 2, 0, 2, 0])
  assert.deepEqual([...esc.subarray(10, 14)], [0xff, 0x00, 0x00, 0x00])
  const tspl = new TextDecoder('latin1').decode(tsplBitmap(img))
  assert.match(tspl, /^SIZE 2 mm,7 mm\r\nGAP 0 mm,0 mm\r\n/)
  assert.ok(tspl.includes('BITMAP 0,0,2,2,0,'))
  assert.ok(tspl.endsWith('PRINT 1,1\r\n'))
  // TSPL prints 0 bits: data inverted
  const at = tspl.indexOf('BITMAP 0,0,2,2,0,') + 'BITMAP 0,0,2,2,0,'.length
  assert.deepEqual([...tsplBitmap(img).subarray(at, at + 4)], [0x00, 0xff, 0xff, 0xff])
})

test('printer channels are named by their short id', async () => {
  const { shortUuid } = await import('../src/owner/printer/uuid.ts')
  assert.equal(shortUuid('000018f0-0000-1000-8000-00805f9b34fb'), '18F0')
  assert.equal(shortUuid('49535343-8841-43f4-a8d4-ecbe34729bb3'), '49535343')
})

test('text comanda: ASCII only, 32 columns, banner between rules, SIN in big bold', async () => {
  const { COLS, escposText, layoutText, plain, wrapCols } = await import('../src/owner/printer/text.ts')
  assert.equal(plain('2× Menú del día · Ñoño “ok”'), '2x Menu del dia - Nono "ok"')
  assert.deepEqual(wrapCols('Calle 40 Sur # 27-15 Torre 2 apartamento 503 portería azul', 16), ['Calle 40 Sur #', '27-15 Torre 2', 'apartamento 503', 'portería azul'])
  const lines = layoutText(buildTicket(mkOrder({
    num: 2001, lines: [{ dishId: 'dia', name: 'Menú del día', qty: 2, unit: 22000, detail: { opts: ['Res'], removed: ['Arroz', 'Maduro'], addons: [], note: '' } }],
  })))
  assert.ok(lines.every(l => l.text.length <= (l.size === 3 ? COLS / 2 : COLS) && /^[\x20-\x7e]*$/.test(l.text)))
  assert.deepEqual(lines.find(l => l.text === '#2001'), { text: '#2001', align: 'center', bold: true, size: 3 })
  const i = lines.findIndex(l => l.text === 'DOMICILIO')
  assert.equal(lines[i - 1].text, '='.repeat(COLS)); assert.equal(lines[i + 1].text, '='.repeat(COLS))
  assert.deepEqual(lines.find(l => l.text.startsWith('>> SIN')), { text: '>> SIN ARROZ, MADURO', align: 'left', bold: true, size: 2 })
  assert.ok(lines.some(l => l.text.startsWith('Total') && l.text.length === COLS))
  const bytes = escposText(lines)
  assert.deepEqual([...bytes.subarray(0, 7)], [0x1b, 0x40, 0x1c, 0x2e, 0x1b, 0x74, 0x00], 'init, Chinese mode off')
  assert.deepEqual([...bytes.subarray(-3)], [0x1b, 0x64, 4], 'feed at the end, nothing after')
  assert.ok(bytes.length < 1500, 'a few hundred bytes, not a 30 KB image: ' + bytes.length)
})

test('a Bluetooth call that never answers gives up instead of hanging the panel', async () => {
  const { withTimeout, TimeoutError } = await import('../src/owner/printer/timeout.ts')
  const never = new Promise<void>(() => {})
  await assert.rejects(withTimeout(never, 20, 'La impresora dejó de responder'), (e: unknown) => e instanceof TimeoutError && e.message === 'La impresora dejó de responder')
  assert.equal(await withTimeout(Promise.resolve(7), 20, 'x'), 7)
  await assert.rejects(withTimeout(Promise.reject(new Error('GATT error')), 20, 'x'), /GATT error/)
})
