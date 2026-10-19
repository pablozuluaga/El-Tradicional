import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import { defaultSettings, type Zone } from '../domain/catalog.ts'
import { zonesOf } from '../domain/pricing.ts'
import { reportRange, reportRows } from '../domain/report.ts'
import type { Order, OrderDraft, Settings } from '../domain/types.ts'
import { visibleOrders } from '../domain/orders.ts'
import { SUPABASE_KEY, SUPABASE_URL } from './backend.ts'
import {
  draftToPayload, mergeOrderRow, rowToMessage, rowToOrder, rowToSettings, settingsPatchToRow, withMessage,
  type MessageRow, type OrderRow, type SettingsRow,
} from './supabaseMappers.ts'
import { StoreError, type ReviewPatch, type RestaurantStore, type Role, type Snapshot } from './store.ts'

const OWNER_WINDOW_DAYS = 7
const OPEN_STATUSES = '(nuevo,aceptado,camino)'
const REPORT_LIMIT = 5000

/** Owner login errors, in Spanish, by Supabase auth error code. */
function signInMessage(e: { code?: string; status?: number; message?: string }): string {
  if (e.code === 'email_not_confirmed') return 'Esta cuenta aún no está confirmada. Confírmala en Supabase (Authentication → Users) e intenta de nuevo.'
  if (e.code === 'invalid_credentials' || e.status === 400) return 'Correo o contraseña incorrectos.'
  if (e.status === 429 || e.code === 'over_request_rate_limit') return 'Demasiados intentos. Espera un momento e intenta de nuevo.'
  return 'No pudimos iniciar sesión. Revisa tu conexión e intenta de nuevo.'
}

/** The project's database is older than the app (schema.sql not re-run after an update). */
export const OUTDATED_DB_MSG = 'Falta actualizar la base de datos: en Supabase → SQL Editor, ejecuta completo el archivo app/supabase/schema.sql.'
const isOutdatedDb = (e: { message?: string; code?: string }) =>
  e.code === 'PGRST202' || e.code === 'PGRST204' || e.code === '42703' || e.code === '42883' ||
  /could not find the (function|.*column)|does not exist/i.test(e.message ?? '')

const fail = (e: { message?: string; code?: string } | null, fallback = 'No se pudo completar la acción. Revisa tu conexión.'): never => {
  if (e && isOutdatedDb(e)) throw new StoreError(OUTDATED_DB_MSG)
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
    ready: false, authorized: false, error: null, settings: defaultSettings(), orders: [],
  }
  private uid: string | null = null
  private channel: RealtimeChannel | null = null
  private needsResync = false
  private disposed = false
  private unsubAuth: (() => void) | null = null
  /**
   * Barrios from their own table (supabase/barrios.sql): every add, price and removal is its own
   * row, so a phone saving other settings from an old copy can't bring back an old list. null
   * until that file has been run; then the list inside the settings is used, as before.
   */
  private zoneRows: Zone[] | null = null

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
    if (p.settings && this.zoneRows) p = { ...p, settings: { ...p.settings, zones: this.zoneRows } }
    const next = { ...this.snap, ...p }
    if (p.orders || p.settings) next.orders = visibleOrders(next.orders, next.settings)
    this.snap = next
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
    this.listeners.clear()
  }

  // ---- loading ---------------------------------------------------------------
  private async loadSettings() {
    const { data, error } = await this.sb.from('settings').select('*').eq('id', 1).single()
    if (error) fail(error)
    await this.loadZones()
    this.set({ settings: rowToSettings(data as SettingsRow) })
  }

  private async loadZones() {
    const { data, error } = await this.sb.from('zones').select('id, label, fee').order('ord')
    if (error) {
      // the table isn't there yet (barrios.sql not run): keep using the list inside the settings
      if (error.code === 'PGRST205' || error.code === '42P01' || /zones/.test(error.message ?? '')) this.zoneRows = null
      return
    }
    this.zoneRows = (data ?? []).map(r => ({ id: String(r.id), label: String(r.label), fee: Number(r.fee) || 0 }))
    this.set({ settings: this.snap.settings })
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zones' }, () => { void this.loadZones() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, p => {
        const r = p.new as OrderRow | undefined
        if (!r || !('num' in r)) return
        const num = Number(r.num)
        const prev = this.snap.orders.find(o => o.num === num)
        if (prev) this.upsertOrder(mergeOrderRow(prev, r))
        else void this.refreshOrder(num)
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
  async placeOrder(draft: OrderDraft): Promise<Order> {
    if (!this.uid) fail(null, 'No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.')
    const { data, error } = await this.sb.rpc('place_order', { p: draftToPayload(draft) })
    if (error) fail(error, 'No se pudo enviar el pedido. Revisa tu conexión e intenta de nuevo.')
    const row = data as OrderRow
    const msgs = await this.loadMessages([Number(row.num)]).catch(() => new Map())
    const order = rowToOrder(row, msgs.get(Number(row.num)) ?? [])
    this.upsertOrder(order)
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
  /**
   * The change is applied to the settings as they are in the database right now, not to this
   * phone's copy: a phone that missed updates (asleep, offline) must not write back old barrios,
   * prices or dishes. If someone else saved in between, it reads again and retries.
   */
  async updateSettings(fn: (s: Settings) => Partial<Settings>) {
    const before = this.snap.settings
    this.set({ settings: { ...before, ...fn(before) } })
    const undo = (e: { message?: string } | null): never => { this.set({ settings: before }); return fail(e) }
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: row, error: readError } = await this.sb.from('settings').select('*').eq('id', 1).single()
      if (readError || !row) return undo(readError)
      const fresh = rowToSettings(row as SettingsRow)
      const patch = fn(fresh)
      let q = this.sb.from('settings').update(settingsPatchToRow(patch, { ...fresh, ...patch }, (row as SettingsRow).desc_overrides)).eq('id', 1)
      if ((row as SettingsRow).updated_at) q = q.eq('updated_at', (row as SettingsRow).updated_at!)
      const { data, error } = await q.select('*')
      if (error) return undo(error)
      if (data?.length) { this.set({ settings: rowToSettings(data[0] as SettingsRow) }); return }
    }
    undo({ message: 'Otro celular estaba guardando cambios al mismo tiempo. Intenta de nuevo.' })
  }

  async addZone(z: Zone) {
    if (!this.zoneRows) return this.updateSettings(st => (zonesOf(st).some(x => x.id === z.id) ? {} : { zones: [...zonesOf(st), z] }))
    this.zoneRows = [...this.zoneRows.filter(x => x.id !== z.id), z]
    this.set({ settings: this.snap.settings })
    const { error } = await this.sb.from('zones').upsert({ id: z.id, label: z.label, fee: z.fee }, { onConflict: 'id', ignoreDuplicates: true })
    await this.loadZones()
    if (error) fail(error)
  }

  async setZoneFee(id: string, fee: number) {
    if (!this.zoneRows) return this.updateSettings(st => ({ zones: zonesOf(st).map(x => (x.id === id ? { ...x, fee } : x)) }))
    const { error } = await this.sb.from('zones').update({ fee }).eq('id', id)
    await this.loadZones()
    if (error) fail(error)
  }

  async removeZone(id: string) {
    if (!this.zoneRows) return this.updateSettings(st => ({ zones: zonesOf(st).filter(x => x.id !== id) }))
    const { error } = await this.sb.from('zones').delete().eq('id', id)
    await this.loadZones()
    if (error) fail(error)
  }

  async zoneHistory() {
    const { data, error } = await this.sb.from('orders').select('zone_id, zone_label, delivery')
      .eq('origin', 'domicilio').not('zone_id', 'is', null).order('created_at', { ascending: false }).limit(5000)
    if (error) fail(error)
    return (data ?? []).map(r => ({ id: r.zone_id as string, label: (r.zone_label as string | null) ?? '', fee: Number(r.delivery) || 0 }))
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
    const deleted = Object.keys(this.snap.settings.deletedOrders ?? {}).map(Number).filter(Number.isInteger)
    if (deleted.length) q = q.not('num', 'in', `(${deleted.join(',')})`)
    if (desde) q = q.gte('created_at', desde.toISOString())
    if (hasta) q = q.lte('created_at', hasta.toISOString())
    return q
  }

  async reportRows(from: string, to: string) {
    const { data, error } = await this.rangeQuery(from, to, false)
    if (error) fail(error)
    return reportRows(((data ?? []) as OrderRow[]).map(r => rowToOrder(r, [])), from, to, this.snap.settings.deliveryFees, this.snap.settings.deletedOrders)
  }

  async reportCount(from: string, to: string) {
    const { count, error } = await this.rangeQuery(from, to, true)
    if (error) fail(error)
    return count ?? 0
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password })
    if (error) fail(null, signInMessage(error))
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
