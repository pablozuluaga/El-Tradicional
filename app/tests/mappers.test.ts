import { test } from 'node:test'
import assert from 'node:assert/strict'
import { draftToPayload, mergeOrderRow, rowToEligibility, rowToMessage, rowToOrder, rowToSettings, settingsPatchToRow, withMessage, type OrderRow } from '../src/data/supabaseMappers.ts'

const row: OrderRow = {
  num: 1043, customer_id: 'u1', name: 'Ana', email: 'a@b.co', phone: '—', origin: 'domicilio', zone_id: 'obrero', zone_label: 'El Obrero',
  address: 'Calle 1', address_notes: '', items: '1 X', items_list: ['1× X'], lines: [{ dishId: 'paisa', name: 'Bandeja Paisa', qty: 1, unit: 35000 }],
  subtotal: 35000, discount: 7000, discount_kind: 'primer', delivery: 3000, total: 31000, pay: 'Efectivo', status: 'nuevo', reject_reason: null,
  rated: false, review_stars: null, review_comment: null, client_seen_id: 5, owner_seen_id: 5, created_at: '2026-09-25T17:00:00Z',
}

test('settings row ↔ domain', () => {
  const s = rowToSettings({ id: 1, store_open: false, plato_dia: 'lunes', day_off: { 'lunes:sopa:campesina': true }, sold_proteins: null, sold_dishes: {}, juices: null, promos: [], desc_overrides: null })
  assert.equal(s.storeOpen, false)
  assert.equal(s.platoDia, 'lunes')
  assert.deepEqual(s.soldProteins, {})
  assert.equal(s.juices.length, 2)
  assert.deepEqual(s.promos, [])
  assert.deepEqual(settingsPatchToRow({ storeOpen: true, descOverrides: { paisa: 'x' } }), { store_open: true, desc_overrides: { paisa: 'x' } })
})

test('order row → domain, chat sorted, messages deduplicated', () => {
  const m1 = rowToMessage({ id: 5, order_num: 1043, sender: 'dueno', body: 'hola', created_at: '' })
  const m2 = rowToMessage({ id: 7, order_num: 1043, sender: 'cliente', body: 'gracias', created_at: '' })
  const o = rowToOrder(row, [m2, m1])
  assert.equal(o.discountKind, 'primer')
  assert.deepEqual(o.chat.map(m => m.id), [5, 7])
  assert.equal(withMessage(o, m2), o)
  assert.equal(withMessage(o, { ...m2, id: 6 }).chat[1].id, 6)
  const merged = mergeOrderRow(o, { ...row, status: 'aceptado' })
  assert.equal(merged.status, 'aceptado')
  assert.equal(merged.chat.length, 2)
})

test('payload and eligibility', () => {
  const p = draftToPayload({ customerId: 'u1', name: 'Ana', email: 'a@b.co', phone: '—', origin: 'recoger', zoneId: null, zoneLabel: null, address: 'Recoge en el local', addressNotes: '', items: 'x', itemsList: ['x'], lines: [], subtotal: 1, delivery: 0, pay: 'Efectivo' })
  assert.equal(p.zone_id, null)
  assert.equal('customerId' in p, false)
  assert.deepEqual(rowToEligibility({ rate: '0.2', kind: 'primer', count: 0 }), { rate: 0.2, kind: 'primer', count: 0 })
  assert.deepEqual(rowToEligibility(null), { rate: 0, kind: null, count: 0 })
})
