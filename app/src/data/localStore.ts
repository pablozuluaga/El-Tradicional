import { defaultSettings, ORDER_NUM_START } from '../domain/catalog.ts'
import { countingOrders, eligibility, emailUsedElsewhere, LOYALTY_RATE } from '../domain/loyalty.ts'
import { advanceStep, canReject, lastMessageId, normalizeReason, rejectNote, WELCOME_MSG } from '../domain/orders.ts'
import { discountFor, isOtherZone, orderTotal } from '../domain/pricing.ts'
import { finalizeTotals, validateDraft } from '../domain/placement.ts'
import { reportRows } from '../domain/report.ts'
import type { ChatMessage, Order, OrderDraft, Settings } from '../domain/types.ts'
import { StoreError, type ReviewPatch, type RestaurantStore, type Role, type Snapshot } from './store.ts'

const KEY = 'et:shared:v1'
const CHANNEL = 'et-shared'

interface Doc { settings: Settings; orders: Order[]; orderSeq: number; msgSeq: number }

const emptyDoc = (): Doc => ({ settings: defaultSettings(), orders: [], orderSeq: ORDER_NUM_START, msgSeq: 0 })

function readDoc(): Doc {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyDoc()
    const d = JSON.parse(raw) as Doc
    return { ...emptyDoc(), ...d, settings: { ...defaultSettings(), ...d.settings } }
  } catch {
    return emptyDoc()
  }
}

/**
 * Browser-only backend: one shared document in localStorage. Every operation is a synchronous
 * read-modify-write, and other tabs (e.g. /admin next to /) are told through BroadcastChannel.
 */
export class LocalStore implements RestaurantStore {
  readonly backend = 'local' as const
  private listeners = new Set<() => void>()
  private snap: Snapshot
  private email = ''
  private channel: BroadcastChannel | null = null
  private readonly role_: Role
  private readonly deviceId: string

  constructor(role: Role, deviceId: string) {
    this.role_ = role
    this.deviceId = deviceId
    this.snap = this.build(readDoc())
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL)
      this.channel.onmessage = () => this.reload()
    }
    window.addEventListener('storage', this.onStorage)
  }

  get role() { return this.role_ }

  private onStorage = (e: StorageEvent) => { if (e.key === KEY) this.reload() }

  private build(doc: Doc): Snapshot {
    const orders = (this.role_ === 'customer' ? doc.orders.filter(o => o.customerId === this.deviceId) : doc.orders)
      .slice().sort((a, b) => b.num - a.num)
    return {
      ready: true,
      authorized: true,
      error: null,
      settings: doc.settings,
      orders,
      eligibility: eligibility(doc.orders, this.deviceId, this.email),
    }
  }

  private reload() {
    this.snap = this.build(readDoc())
    this.listeners.forEach(l => l())
  }

  private write(mut: (d: Doc) => void) {
    const doc = readDoc()
    mut(doc)
    try {
      localStorage.setItem(KEY, JSON.stringify(doc))
    } catch {
      throw new StoreError('No se pudo guardar. El almacenamiento del navegador está lleno.')
    }
    this.channel?.postMessage('changed')
    this.snap = this.build(doc)
    this.listeners.forEach(l => l())
  }

  private mutOrder(num: number, fn: (o: Order, d: Doc) => void) {
    this.write(d => {
      const o = d.orders.find(x => x.num === num)
      if (!o) throw new StoreError('Pedido no encontrado.')
      fn(o, d)
    })
  }

  private msg(d: Doc, from: ChatMessage['from'], text: string): ChatMessage {
    d.msgSeq += 1
    return { id: d.msgSeq, from, text, at: new Date().toISOString() }
  }

  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l) } }
  getSnapshot = () => this.snap
  customerId() { return this.role_ === 'customer' ? this.deviceId : null }

  setCustomerEmail(email: string) {
    if (email === this.email) return
    this.email = email
    this.snap = this.build(readDoc())
    this.listeners.forEach(l => l())
  }

  async updateSettings(fn: (s: Settings) => Partial<Settings>) {
    this.write(d => { d.settings = { ...d.settings, ...fn(d.settings) } })
  }

  async placeOrder(draft: OrderDraft): Promise<Order> {
    let created = null as Order | null
    this.write(d => {
      const err = validateDraft(draft, d.settings)
      if (err) throw new StoreError(err)
      const deliveryPending = isOtherZone(draft.origin, draft.zoneId)
      if (deliveryPending) draft = { ...draft, delivery: 0 }
      const count = countingOrders(d.orders, this.deviceId).length
      const totals = finalizeTotals(draft, count, emailUsedElsewhere(d.orders, this.deviceId, draft.email))
      const welcome = this.msg(d, 'dueno', WELCOME_MSG)
      const num = d.orderSeq
      d.orderSeq += 1
      created = {
        ...draft,
        customerId: this.deviceId,
        num,
        ...totals,
        deliveryPending,
        createdAt: new Date().toISOString(),
        status: 'nuevo',
        rejectReason: null,
        rated: false,
        reviewStars: null,
        reviewComment: null,
        clientSeenId: welcome.id,
        ownerSeenId: welcome.id,
        chat: [welcome],
      }
      d.orders.push(created)
    })
    return created!
  }

  async updateOrder(num: number, draft: OrderDraft): Promise<Order> {
    let updated = null as Order | null
    this.mutOrder(num, (o, d) => {
      if (o.customerId !== this.deviceId) throw new StoreError('Pedido no encontrado.')
      if (o.status !== 'nuevo') throw new StoreError('El restaurante ya aceptó tu pedido. Escríbenos por el chat si necesitas cambiar algo.')
      const err = validateDraft(draft, d.settings)
      if (err) throw new StoreError(err)
      const deliveryPending = isOtherZone(draft.origin, draft.zoneId)
      const delivery = deliveryPending ? 0 : draft.delivery
      const discount = o.discountKind ? discountFor(draft.subtotal, LOYALTY_RATE) : 0
      Object.assign(o, {
        phone: draft.phone, origin: draft.origin, zoneId: draft.zoneId, zoneLabel: draft.zoneLabel, address: draft.address,
        addressNotes: draft.addressNotes, items: draft.items, itemsList: draft.itemsList, lines: draft.lines, pay: draft.pay,
        subtotal: draft.subtotal, discount, delivery, deliveryPending, total: orderTotal(draft.subtotal, discount, delivery),
      })
      const m = this.msg(d, 'cliente', ('✏️ Modifiqué mi pedido: ' + draft.items).slice(0, 1000))
      o.chat.push(m)
      o.clientSeenId = m.id
      updated = { ...o }
    })
    return updated!
  }

  async advanceOrder(num: number) {
    this.mutOrder(num, (o, d) => {
      const step = advanceStep(o)
      if (!step) return
      o.status = step.status
      o.chat.push(this.msg(d, 'dueno', step.note))
    })
  }

  async rejectOrder(num: number, reason: string) {
    this.mutOrder(num, (o, d) => {
      if (!canReject(o.status)) throw new StoreError('Este pedido ya no se puede rechazar.')
      const r = normalizeReason(reason)
      o.status = 'rechazado'
      o.rejectReason = r
      o.chat.push(this.msg(d, 'dueno', rejectNote(r)))
    })
  }

  async sendMessage(num: number, text: string) {
    const t = text.trim()
    if (!t) return
    this.mutOrder(num, (o, d) => {
      const m = this.msg(d, this.role_ === 'owner' ? 'dueno' : 'cliente', t)
      o.chat.push(m)
      if (this.role_ === 'owner') o.ownerSeenId = m.id
      else o.clientSeenId = m.id
    })
  }

  async markSeen(num: number) {
    const cur = this.snap.orders.find(o => o.num === num)
    if (!cur) return
    const last = lastMessageId(cur)
    const seen = this.role_ === 'owner' ? cur.ownerSeenId : cur.clientSeenId
    if (last <= seen) return
    this.mutOrder(num, o => {
      if (this.role_ === 'owner') o.ownerSeenId = lastMessageId(o)
      else o.clientSeenId = lastMessageId(o)
    })
  }

  async setReview(num: number, p: ReviewPatch) {
    this.mutOrder(num, o => {
      if (o.customerId !== this.deviceId) throw new StoreError('Pedido no encontrado.')
      if (p.stars !== undefined) o.reviewStars = Math.max(1, Math.min(5, Math.round(p.stars)))
      if (p.comment !== undefined) o.reviewComment = p.comment.trim() || null
      if (p.rated) o.rated = true
    })
  }

  async reportRows(from: string, to: string) { const d = readDoc(); return reportRows(d.orders, from, to, d.settings.deliveryFees) }
  async reportCount(from: string, to: string) { return reportRows(readDoc().orders, from, to).length }

  async signIn() {}
  async signOut() {}

  dispose() {
    this.channel?.close()
    window.removeEventListener('storage', this.onStorage)
    this.listeners.clear()
  }
}
