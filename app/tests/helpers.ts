import type { Order } from '../src/domain/types.ts'

let n = 1043
export function mkOrder(p: Partial<Order> = {}): Order {
  return {
    num: n++, customerId: 'dev-a', name: 'Ana Pérez', email: 'ana@example.com', phone: '—',
    origin: 'domicilio', zoneId: 'obrero', zoneLabel: 'El Obrero', address: 'Calle 1', addressNotes: '',
    items: '1 Bandeja Paisa (Res)', itemsList: ['1× Bandeja Paisa — res'], lines: [{ dishId: 'paisa', name: 'Bandeja Paisa', qty: 1, unit: 35000 }],
    subtotal: 35000, discount: 0, discountKind: null, delivery: 3000, total: 38000, pay: 'Efectivo (contra entrega)',
    createdAt: '2026-09-20T17:00:00.000Z', status: 'nuevo', rejectReason: null, rated: false, reviewStars: null, reviewComment: null,
    clientSeenId: 1, ownerSeenId: 1, chat: [{ id: 1, from: 'dueno', text: 'hola', at: '2026-09-20T17:00:00.000Z' }],
    ...p,
  }
}
