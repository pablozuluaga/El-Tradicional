import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import { defaultSettings } from '../domain/catalog.ts'
import { reportRange, reportRows } from '../domain/report.ts'
import type { Order, OrderDraft, Settings } from '../domain/types.ts'
import { SUPABASE_KEY, SUPABASE_URL } from './backend.ts'
import {
  draftToPayload, mergeOrderRow, rowToEligibility, rowToMessage, rowToOrder, rowToSettings, settingsPatchToRow, withMessage,
  type MessageRow, type OrderRow, type SettingsRow,
} from './supabaseMappers.ts'
import { StoreError, type ReviewPatch, type RestaurantStore, type Role, type Snapshot } from './store.ts'

const OWNER_WINDOW_DAYS = 7
const OPEN_STATUSES = '(nuevo,aceptado,camino)'
const REPORT_LIMIT = 5000

const fail = (e: { message?: string } | null, fallback = 'No se pudo completar la acción. Revisa tu conexión.'): never => {
  throw new StoreError(e?.message && !/fetch|network/i.test(e.message) ? e.message : fallback)
}

/**
 * Supabase backend. Customers get an anonymous, device-bound session; the owner signs in
 * with email/password and must be listed in `public.owners`. Reads come from row-level
 * security, writes from the RPCs in supabase/schema.sql, live updates from Realtime.
 */
export class SupabaseStore implements RestaurantStore {
  readonly backend = 'supabase' as const
  readonly role: Role
  private sb: SupabaseClient
  private listeners = new Set<() => void>()
  private snap: Snapshot = {
    ready: false, authorized: false, error: null, settings: defaultSettings(), orders: [], eligibility: { rate: 0, kind: null, count: 0 },
  }
  private uid: string | null = null
  private email = ''
  private channel: RealtimeChannel | null = null
  private needsResync = false
  private disposed = false
  private unsubAuth: (() => void) | null = null
  private eligTimer: ReturnType<typeof setTimeout> | null = null

  constructor(role: Role) {
    this.role = role
    this.sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { storageKey: `et-${role}-auth`, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
    document.addEventListener('visibilitychange', this.onVisible)
    window.addEventListener('online', this.onVisible)
    void this.init()
  }

  // ---- state plumbing ----------------------------------------------------
  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l) } }
  getSnapshot = () => this.snap
  private set(p: Partial<Snapshot>) {
    if (this.disposed) return
    this.snap = { ...this.snap, ...p }
    this.listeners.forEach(l => l())
  }
  private setOrders(fn: (orders: Order[]) => Order[]) {
    this.set({ orders: fn(this.snap.orders).slice().sort((a, b) => b.num - a.num) })
  }
  private upsertOrder(o: Order) {
    this.setOrders(list => [o, ...list.filter(x => x.num !== o.num)])
  }

  customerId() { return this.role === 'customer' ? this.uid : null }

  // ---- lifecycle -----------------------------------------------------------
  private async init() {
    try {
      await this.loadSettings()
      const { data } = await this.sb.auth.getSession()
      let session = data.session
      if (this.role === 'customer' && !session) {
        const res = await this.sb.auth.signInAnonymously()
        if (res.error) throw res.error
        session = res.data.session
      }
      this.uid = session?.user.id ?? null
      if (this.role === 'owner') {
        const { data: sub } = this.sb.auth.onAuthStateChange((event, s) => {
          if (event === 'SIGNED_OUT') { this.uid = null; this.teardownChannel(); this.set({ authorized: false, orders: [] }) }
          else if (s) this.uid = s.user.id
        })
        this.unsubAuth = () => sub.subscription.unsubscribe()
        if (session) await this.enterOwner()
        this.set({ ready: true })
      } else {
        await this.loadOrders()
        this.subscribeRealtime()
        this.set({ ready: true, authorized: true })
        this.scheduleEligibility()
      }
    } catch (e) {
      this.set({ ready: true, error: 'No pudimos conectarnos con el restaurante. Revisa tu conexión e intenta de nuevo.' })
      console.error('[supabase] init', e)
    }
  }

  private async enterOwner() {
    const { data, error } = await this.sb.rpc('is_owner')
    if (error) fail(error)
    if (!data) {
      await this.sb.auth.signOut()
      throw new StoreError('Esta cuenta no tiene acceso al panel del dueño.')
    }
    await this.loadOrders()
    this.subscribeRealtime()
    this.set({ authorized: true, error: null })
  }

  private onVisible = () => {
    if (document.visibilityState === 'visible' && this.snap.authorized) void this.resync()
  }

  private async resync() {
    try {
      await Promise.all([this.loadSettings(), this.loadOrders()])
      this.set({ error: null })
      this.scheduleEligibility()
    } catch (e) {
      console.error('[supabase] resync', e)
    }
  }

  dispose() {
    this.disposed = true
    this.teardownChannel()
    this.unsubAuth?.()
    document.removeEventListener('visibilitychange', this.onVisible)
    window.removeEventListener('online', this.onVisible)
    if (this.eligTimer) clearTimeout(this.eligTimer)
    this.listeners.clear()
  }

  // ---- loading ---------------------------------------------------------------
  private async loadSettings() {
    const { data, error } = await this.sb.from('settings').select('*').eq('id', 1).single()
    if (error) fail(error)
    this.set({ settings: rowToSettings(data as SettingsRow) })
  }

  private async loadOrders() {
    let q = this.sb.from('orders').select('*').order('num', { ascending: false })
    if (this.role === 'owner') {
      const since = new Date(Date.now() - OWNER_WINDOW_DAYS * 864e5).toISOString()
      q = q.or(`created_at.gte."${since}",status.in.${OPEN_STATUSES}`).limit(500)
    }
    const { data, error } = await q
    if (error) fail(error)
    const rows = (data ?? []) as OrderRow[]
    const msgs = await this.loadMessages(rows.map(r => Number(r.num)))
    this.set({ orders: rows.map(r => rowToOrder(r, msgs.get(Number(r.num)) ?? [])) })
  }

  private async loadMessages(nums: number[]) {
    const byOrder = new Map<number, ReturnType<typeof rowToMessage>[]>()
    for (let i = 0; i < nums.length; i += 100) {
      const chunk = nums.slice(i, i + 100)
      const { data, error } = await this.sb.from('order_messages').select('*').in('order_num', chunk).order('id')
      if (error) fail(error)
      for (const m of (data ?? []) as MessageRow[]) {
        const k = Number(m.order_num)
        byOrder.set(k, [...(byOrder.get(k) ?? []), rowToMessage(m)])
      }
    }
    return byOrder
  }

  private async refreshOrder(num: number) {
    const { data, error } = await this.sb.from('orders').select('*').eq('num', num).maybeSingle()
    if (error || !data) return
    const msgs = await this.loadMessages([num])
    this.upsertOrder(rowToOrder(data as OrderRow, msgs.get(num) ?? []))
  }

  // ---- realtime ----------------------------------------------------------------
  private subscribeRealtime() {
    this.teardownChannel()
    this.channel = this.sb
      .channel(`et-${this.role}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, p => {
        if (p.new && 'id' in p.new) this.set({ settings: rowToSettings(p.new as SettingsRow) })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, p => {
        const r = p.new as OrderRow | undefined
        if (!r || !('num' in r)) return
        const num = Number(r.num)
        const prev = this.snap.orders.find(o => o.num === num)
        if (prev) this.upsertOrder(mergeOrderRow(prev, r))
        else void this.refreshOrder(num)
        if (this.role === 'customer') this.scheduleEligibility()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages' }, p => {
        const m = p.new as MessageRow
        const num = Number(m.order_num)
        const prev = this.snap.orders.find(o => o.num === num)
        if (prev) this.upsertOrder(withMessage(prev, rowToMessage(m)))
        else void this.refreshOrder(num)
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          if (this.needsResync) { this.needsResync = false; void this.resync() }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          this.needsResync = true
        }
      })
  }

  private teardownChannel() {
    if (this.channel) void this.sb.removeChannel(this.channel)
    this.channel = null
  }

  // ---- customer ------------------------------------------------------------------
  setCustomerEmail(email: string) {
    if (email === this.email) return
    this.email = email
    this.scheduleEligibility()
  }

  private scheduleEligibility() {
    if (this.role !== 'customer' || !this.uid) return
    if (this.eligTimer) clearTimeout(this.eligTimer)
    this.eligTimer = setTimeout(async () => {
      const { data, error } = await this.sb.rpc('discount_eligibility', { p_email: this.email })
      if (!error) this.set({ eligibility: rowToEligibility(data) })
    }, 150)
  }

  async placeOrder(draft: OrderDraft): Promise<Order> {
    if (!this.uid) fail(null, 'No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.')
    const { data, error } = await this.sb.rpc('place_order', { p: draftToPayload(draft) })
    if (error) fail(error, 'No se pudo enviar el pedido. Revisa tu conexión e intenta de nuevo.')
    const row = data as OrderRow
    const msgs = await this.loadMessages([Number(row.num)]).catch(() => new Map())
    const order = rowToOrder(row, msgs.get(Number(row.num)) ?? [])
    this.upsertOrder(order)
    this.scheduleEligibility()
    return order
  }

  async setReview(num: number, p: ReviewPatch) {
    const { data, error } = await this.sb.rpc('set_review', {
      p_num: num, p_stars: p.stars ?? null, p_comment: p.comment ?? null, p_rated: p.rated ?? null,
    })
    if (error) fail(error)
    const prev = this.snap.orders.find(o => o.num === num)
    this.upsertOrder(mergeOrderRow(prev, data as OrderRow))
  }

  // ---- both ------------------------------------------------------------------------
  async sendMessage(num: number, text: string) {
    const t = text.trim()
    if (!t) return
    const { data, error } = await this.sb.rpc('send_message', { p_num: num, p_body: t })
    if (error) fail(error)
    const m = rowToMessage(data as MessageRow)
    const prev = this.snap.orders.find(o => o.num === num)
    if (prev) {
      const seen = this.role === 'owner' ? { ownerSeenId: m.id } : { clientSeenId: m.id }
      this.upsertOrder({ ...withMessage(prev, m), ...seen })
    }
  }

  async markSeen(num: number) {
    const o = this.snap.orders.find(x => x.num === num)
    if (!o) return
    const last = o.chat.reduce((mx, m) => Math.max(mx, m.id), 0)
    const seen = this.role === 'owner' ? o.ownerSeenId : o.clientSeenId
    if (last <= seen) return
    this.upsertOrder({ ...o, ...(this.role === 'owner' ? { ownerSeenId: last } : { clientSeenId: last }) })
    const { error } = await this.sb.rpc('mark_seen', { p_num: num })
    if (error) console.error('[supabase] mark_seen', error)
  }

  // ---- owner -------------------------------------------------------------------------
  async updateSettings(fn: (s: Settings) => Partial<Settings>) {
    const patch = fn(this.snap.settings)
    const before = this.snap.settings
    this.set({ settings: { ...before, ...patch } })
    const { error } = await this.sb.from('settings').update(settingsPatchToRow(patch)).eq('id', 1)
    if (error) {
      this.set({ settings: before })
      fail(error)
    }
  }

  async advanceOrder(num: number) {
    const { error } = await this.sb.rpc('advance_order', { p_num: num })
    if (error) fail(error)
    await this.refreshOrder(num)
  }

  async rejectOrder(num: number, reason: string) {
    const { error } = await this.sb.rpc('reject_order', { p_num: num, p_reason: reason })
    if (error) fail(error)
    await this.refreshOrder(num)
  }

  private rangeQuery(from: string, to: string, head: boolean) {
    const { desde, hasta } = reportRange(from, to)
    let q = head
      ? this.sb.from('orders').select('num', { count: 'exact', head: true })
      : this.sb.from('orders').select('*').order('created_at').limit(REPORT_LIMIT)
    q = q.neq('status', 'rechazado')
    if (desde) q = q.gte('created_at', desde.toISOString())
    if (hasta) q = q.lte('created_at', hasta.toISOString())
    return q
  }

  async reportRows(from: string, to: string) {
    const { data, error } = await this.rangeQuery(from, to, false)
    if (error) fail(error)
    return reportRows(((data ?? []) as OrderRow[]).map(r => rowToOrder(r, [])), from, to)
  }

  async reportCount(from: string, to: string) {
    const { count, error } = await this.rangeQuery(from, to, true)
    if (error) fail(error)
    return count ?? 0
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password })
    if (error) fail(null, 'Correo o contraseña incorrectos.')
    this.uid = data.user?.id ?? null
    try {
      await this.enterOwner()
    } catch (e) {
      this.set({ authorized: false })
      throw e
    }
  }

  async signOut() {
    await this.sb.auth.signOut()
    this.teardownChannel()
    this.set({ authorized: false, orders: [] })
  }
}
