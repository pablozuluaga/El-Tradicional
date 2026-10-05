import { test } from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { buildReport } from '../src/owner/report.ts'
import type { ReportRow } from '../src/domain/report.ts'

const row = (p: Partial<ReportRow>): ReportRow => ({
  numero: 1043, fecha: new Date(2026, 9, 2, 12), cliente: 'Ana', pedido: '1× Bandeja Paisa', metodoPago: 'Efectivo',
  valorPlato: 35000, valorDomicilio: 3000, correo: 'a@b.co', celular: '3001234567', items: [{ nombre: 'Bandeja Paisa', cantidad: 1, valor: 35000 }], ...p,
})

async function read(rows: ReportRow[], from = '', to = '') {
  const { blob, name } = await buildReport(rows, from, to)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await blob.arrayBuffer())
  return { ws: wb.getWorksheet('Reporte')!, name }
}

test('report v2: totals are values, rows numbered from 1, sorted by date', async () => {
  const { ws, name } = await read([
    row({ numero: 1050, fecha: new Date(2026, 9, 3, 12), valorPlato: 20000, valorDomicilio: 0 }),
    row({ numero: 1049 }),
  ], '2026-10-01', '2026-10-03')
  assert.equal(name, 'Reporte-ElTradicional-20261001-20261003.xlsx')
  assert.equal(ws.getCell('A4').value, 1)
  assert.equal(ws.getCell('A5').value, 2)
  assert.equal(ws.getCell('F4').value, 35000, 'oldest first')
  assert.equal(ws.getCell('H4').value, 38000, 'order total is a number, not a formula')
  assert.equal(ws.getCell('H5').value, 20000)
  assert.deepEqual([4, 5, 6, 7, 8].map(r => ws.getCell('M' + r).value), [55000, 3000, 58000, 2, 29000])
  assert.equal(ws.getCell('L6').value, 'Total ingresos:')
  assert.match(String(ws.getCell('A2').value), /2 pedidos$/)
  assert.equal(ws.getCell('J4').value, '3001234567')
})

test('report v2: empty range keeps a filled summary and a placeholder row', async () => {
  const { ws } = await read([])
  assert.equal(ws.getCell('A4').value, 'No hay pedidos en el rango seleccionado.')
  assert.deepEqual([4, 5, 6, 7, 8].map(r => ws.getCell('M' + r).value), [0, 0, 0, 0, 0])
  assert.match(String(ws.getCell('A2').value), /^Todos los pedidos .* 0 pedidos$/)
})

test('report v3: platos vendidos (total + most sold first, with money) and a payment column that fits', async () => {
  const pago = 'Transferencia a Bancolombia (comprobante por WhatsApp)'
  const { ws } = await read([
    row({ items: [{ nombre: 'Bandeja Paisa', cantidad: 2, valor: 70000 }, { nombre: 'Jugo en agua', cantidad: 1, valor: 10000 }] }),
    row({ metodoPago: pago, items: [{ nombre: 'Trucha', cantidad: 1, valor: 35000 }, { nombre: 'Bandeja Paisa', cantidad: 1, valor: 35000 }] }),
  ])
  assert.equal(ws.getCell('L11').value, 'PLATOS VENDIDOS')
  assert.deepEqual(['L12', 'M12', 'N12'].map(a => ws.getCell(a).value), ['Plato', 'Cantidad', 'Total vendido'])
  const fila = (r: number) => ['L', 'M', 'N'].map(c => ws.getCell(c + r).value)
  assert.deepEqual(fila(13), ['Total platos vendidos:', 5, 150000])
  // most sold first; same quantity → more money first
  assert.deepEqual([14, 15, 16].map(fila), [['Bandeja Paisa', 3, 105000], ['Trucha', 1, 35000], ['Jugo en agua', 1, 10000]])
  assert.ok(ws.getColumn(5).width! >= pago.length, 'payment method not cut')
})
