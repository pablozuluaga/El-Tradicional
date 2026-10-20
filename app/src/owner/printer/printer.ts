import type { Order, OrderStatus } from '../../domain/types.ts'
import { escposRaster, type PrinterLang } from './encode.ts'
import { escposText, layoutText, TEST_BYTES } from './text.ts'
import { ticketBitmap } from './render.ts'
import { buildTicket, type Block } from './ticket.ts'
import { shortUuid } from './uuid.ts'

/*
 * The kitchen printer, over Bluetooth Low Energy from Chrome (Web Bluetooth). Safari/iPhone has
 * no Web Bluetooth, so an Android phone with the panel open in Chrome acts as the print station:
 * it prints every order accepted from any device.
 */

// Minimal Web Bluetooth types (not in TypeScript's DOM lib).
interface BtCharacteristic {
  uuid: string
  properties: { write: boolean; writeWithoutResponse: boolean; read?: boolean }
  readValue?(): Promise<DataView>
  writeValueWithoutResponse?(v: BufferSource): Promise<void>
  writeValueWithResponse?(v: BufferSource): Promise<void>
  writeValue(v: BufferSource): Promise<void>
}
interface BtService { uuid: string; getCharacteristics(): Promise<BtCharacteristic[]> }
interface BtServer { connected: boolean; connect(): Promise<BtServer>; disconnect(): void; getPrimaryServices(): Promise<BtService[]> }
interface BtDevice extends EventTarget { id: string; name?: string; gatt?: BtServer }
interface Bluetooth {
  requestDevice(o: { acceptAllDevices?: boolean; filters?: { namePrefix: string }[]; optionalServices: string[] }): Promise<BtDevice>
  getDevices?(): Promise<BtDevice[]>
}
const bt = (): Bluetooth | undefined => (navigator as Navigator & { bluetooth?: Bluetooth }).bluetooth

/** Write services used by portable thermal printers (Gprinter and most generic brands). */
const SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '0000ae00-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  '0000ffe5-0000-1000-8000-00805f9b34fb',
  '0000ff12-0000-1000-8000-00805f9b34fb',
  '0000af30-0000-1000-8000-00805f9b34fb',
  '0000fee0-0000-1000-8000-00805f9b34fb',
  '0000ff80-0000-1000-8000-00805f9b34fb',
]

/** Characteristics that carry print data on known modules, best first (others are config/OTA). */
const DATA_CHARS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000ffe1-0000-1000-8000-00805f9b34fb',
  '0000fff2-0000-1000-8000-00805f9b34fb',
  '0000ae01-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
]


export interface Channel { key: string; service: string; char: string; write: boolean; noResponse: boolean }

/** How fast the ticket goes out: printers with a small buffer lose data (and print nothing) if rushed. */
export type Speed = 'lenta' | 'normal' | 'rapida'
const SPEEDS: Record<Speed, { chunk: number; pause: number }> = {
  lenta: { chunk: 20, pause: 20 },
  normal: { chunk: 100, pause: 25 },
  rapida: { chunk: 180, pause: 6 },
}

export type PrinterStatus = 'unsupported' | 'off' | 'connecting' | 'ready' | 'printing' | 'error'

export interface PrinterState {
  status: PrinterStatus
  name: string | null
  /** what went wrong, in words for the owner */
  error: string | null
  /** an order that couldn't be printed, to retry */
  failed: number | null
  lang: PrinterLang
  /** print every order accepted (from any device) on this phone */
  auto: boolean
  /** writable channels found on the printer, and the one in use */
  channels: Channel[]
  channel: string | null
  speed: Speed
  /** 0–100 while a ticket is going out */
  progress: number | null
  /** technical detail of the last failure, for support */
  detail: string | null
  /** the link dropped and the app is bringing it back on its own */
  reconnecting: boolean
}

interface Saved { lang: PrinterLang; auto: boolean; name: string | null; channel: string | null; speed: Speed }
const KEY = 'et-printer'
const PRINTED_KEY = 'et-printed'

function load(): Saved {
  const d: Saved = { lang: 'texto', auto: true, name: null, channel: null, speed: 'normal' }
  try {
    const s: Saved = { ...d, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
    // earlier versions saved 'tspl'/'escpos' (the image): text works on this printer and is the default now
    return s.lang === 'texto' || s.lang === 'imagen' ? s : { ...s, lang: 'texto' }
  } catch { return d }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Waits between reconnection attempts after the link drops: quick at first, then every 30 s. */
const RETRY_MS = [1000, 2000, 4000, 8000, 15000, 30000]
/** A small exchange this often keeps the link busy, so neither the printer nor Android drops it as idle. */
const KEEPALIVE_MS = 45000
/** ESC/POS real-time status request: prints nothing. */
const STATUS_REQUEST = Uint8Array.of(0x10, 0x04, 0x01)

class Printer {
  private saved = load()
  private device: BtDevice | null = null
  private ch: BtCharacteristic | null = null
  private chars = new Map<string, BtCharacteristic>()
  /** a characteristic that can be read, for the keep-alive (reading prints nothing) */
  private readable: BtCharacteristic | null = null
  /** the owner tapped "Desconectar": don't reconnect on our own */
  private manualOff = false
  private attaching: Promise<void> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private retries = 0
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null
  /** accepted orders that didn't print (printer off or out of range): printed when it comes back */
  private pending = new Map<number, { o: Order; fees: Record<string, number> }>()
  private queue: Promise<void> = Promise.resolve()
  private seen = new Map<number, OrderStatus>()
  private primed = false
  private listeners = new Set<() => void>()
  private wakeLock: { release(): Promise<void> } | null = null
  constructor() {
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisible)
  }

  state: PrinterState = {
    status: bt() ? 'off' : 'unsupported',
    name: this.saved.name, error: null, failed: null, lang: this.saved.lang, auto: this.saved.auto,
    channels: [], channel: this.saved.channel, speed: this.saved.speed, progress: null, detail: null, reconnecting: false,
  }

  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l) } }
  getState = () => this.state
  private set(p: Partial<PrinterState>) { this.state = { ...this.state, ...p }; this.listeners.forEach(l => l()) }
  private save(p: Partial<Saved>) {
    this.saved = { ...this.saved, ...p }
    try { localStorage.setItem(KEY, JSON.stringify(this.saved)) } catch { /* settings stay for this visit */ }
  }

  setLang(lang: PrinterLang) { this.save({ lang }); this.set({ lang }) }
  setSpeed(speed: Speed) { this.save({ speed }); this.set({ speed }) }
  setChannel(key: string) {
    const c = this.chars.get(key)
    if (!c) return
    this.ch = c
    this.save({ channel: key }); this.set({ channel: key })
  }
  setAuto(auto: boolean) { this.save({ auto }); this.set({ auto }); void this.keepAwake() }

  /** First time (and after Chrome forgets it): the owner picks the printer from Chrome's list. */
  async connect() {
    const b = bt()
    if (!b) return
    this.manualOff = false
    this.stopRetry()
    this.set({ status: 'connecting', error: null })
    try {
      const device = await b.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES })
      await this.attach(device)
    } catch (e) {
      const cancelled = e instanceof Error && e.name === 'NotFoundError'
      this.set({ status: this.ch ? 'ready' : 'off', error: cancelled ? null : 'No se pudo conectar. Revisa que la impresora esté prendida y cerca.' })
    }
  }

  /** On opening the panel: reconnect to the printer Chrome already has permission for, if any. */
  async reconnect() {
    const b = bt()
    if (!b?.getDevices || !this.saved.name || this.ch || this.manualOff) return
    try {
      const known = (await b.getDevices()).find(d => d.name === this.saved.name)
      if (known) { this.set({ status: 'connecting' }); await this.attach(known) }
    } catch {
      // printer off or out of reach when the panel opened: keep trying
      this.set({ status: 'off' })
      this.scheduleRetry()
    }
  }

  disconnect() {
    this.manualOff = true
    this.stopRetry(); this.stopKeepAlive()
    this.device?.gatt?.disconnect()
    this.device = null; this.ch = null; this.readable = null; this.chars.clear()
    this.set({ status: 'off', channels: [] })
    void this.keepAwake()
  }

  /**
   * The Bluetooth link dropped (printer asleep or switched off, a moment out of range, Android
   * saving battery…): try again on our own, quickly at first and then every 30 seconds.
   */
  private onDisconnected = () => {
    this.ch = null
    this.stopKeepAlive()
    if (this.manualOff) return
    this.set({ status: 'off' })
    this.scheduleRetry()
  }

  private scheduleRetry() {
    if (this.retryTimer || this.manualOff || !this.device) return
    const wait = RETRY_MS[Math.min(this.retries, RETRY_MS.length - 1)]
    this.retries++
    if (!this.state.reconnecting) this.set({ reconnecting: true })
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      if (this.ch || this.manualOff || !this.device) return
      this.set({ status: 'connecting' })
      this.attach(this.device).catch(() => {
        if (!this.ch) { this.set({ status: 'off' }); this.scheduleRetry() }
      })
    }, wait)
  }

  private stopRetry() {
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.retryTimer = null
    this.retries = 0
    if (this.state.reconnecting) this.set({ reconnecting: false })
  }

  /** Back on screen (Chrome may have paused the tab): reconnect now instead of waiting. */
  private onVisible = () => {
    if (document.visibilityState !== 'visible') return
    void this.keepAwake()
    if (this.ch || this.manualOff) return
    if (this.device) { this.stopRetry(); this.scheduleRetry() } else void this.reconnect()
  }

  private startKeepAlive() {
    this.stopKeepAlive()
    this.keepAliveTimer = setInterval(() => {
      if (!this.ch || this.state.status !== 'ready') return
      // through the print queue, so it never cuts into a ticket
      this.queue = this.queue.then(async () => {
        try {
          const ping = this.readable?.readValue ? this.readable.readValue() : this.ch ? this.writeChunk(this.ch, STATUS_REQUEST) : null
          // a half-dead link may never answer: don't let it hold up the next ticket
          if (ping) await Promise.race([ping, sleep(5000)])
        } catch { /* a dead link shows up as a disconnect */ }
      })
    }, KEEPALIVE_MS)
  }

  private stopKeepAlive() {
    if (this.keepAliveTimer) clearInterval(this.keepAliveTimer)
    this.keepAliveTimer = null
  }

  /** One connection attempt at a time (a retry, a print and the owner's tap can coincide). */
  private attach(device: BtDevice): Promise<void> {
    if (!this.attaching) this.attaching = this.doAttach(device).finally(() => { this.attaching = null })
    return this.attaching
  }

  private async doAttach(device: BtDevice) {
    this.device?.removeEventListener('gattserverdisconnected', this.onDisconnected)
    this.device = device
    device.addEventListener('gattserverdisconnected', this.onDisconnected)
    const server = await device.gatt!.connect()
    // every channel the printer accepts data on; the print data one is picked below
    this.chars.clear()
    this.readable = null
    const channels: Channel[] = []
    for (const sv of await server.getPrimaryServices()) {
      for (const c of await sv.getCharacteristics()) {
        if (c.properties.read && c.readValue && !this.readable) this.readable = c
        if (!c.properties.writeWithoutResponse && !c.properties.write) continue
        const key = `${shortUuid(sv.uuid)}/${shortUuid(c.uuid)}`
        this.chars.set(key, c)
        channels.push({ key, service: sv.uuid, char: c.uuid, write: c.properties.write, noResponse: c.properties.writeWithoutResponse })
      }
    }
    const rank = (ch: Channel) => {
      const known = DATA_CHARS.indexOf(ch.char.toLowerCase())
      return known >= 0 ? known : DATA_CHARS.length + (ch.noResponse ? 0 : 1)
    }
    const pick = channels.find(ch => ch.key === this.saved.channel) ?? [...channels].sort((a, b) => rank(a) - rank(b))[0]
    if (!pick) throw new Error('La impresora no tiene un canal para recibir datos')
    this.ch = this.chars.get(pick.key)!
    this.set({ channels, channel: pick.key })
    this.save({ name: device.name ?? null })
    this.manualOff = false
    this.stopRetry()
    this.set({ status: 'ready', name: device.name ?? 'Impresora', error: null })
    this.startKeepAlive()
    void this.keepAwake()
    this.printPending()
  }

  /** Orders that couldn't print while the printer was away come out as soon as it is back. */
  private printPending() {
    for (const [num, { o, fees }] of [...this.pending].sort((a, b) => a[0] - b[0])) {
      this.pending.delete(num)
      void this.printOrder(o, fees)
    }
  }

  /** Keeps this phone's screen on while it is the print station (Chrome may pause a sleeping tab). */
  private async keepAwake() {
    const nav = navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }
    if (this.state.auto && this.ch && !this.wakeLock && nav.wakeLock && document.visibilityState === 'visible') {
      try {
        const lock = await nav.wakeLock.request('screen')
        this.wakeLock = lock
        // the browser lets go of it when the page is hidden; onVisible asks again
        ;(lock as unknown as EventTarget).addEventListener?.('release', () => { if (this.wakeLock === lock) this.wakeLock = null })
      } catch { /* not allowed now */ }
    } else if ((!this.state.auto || !this.ch) && this.wakeLock) {
      await this.wakeLock.release().catch(() => {}); this.wakeLock = null
    }
  }

  private async ensureConnected() {
    if (this.ch && this.device?.gatt?.connected) return
    if (this.device) { await this.attach(this.device); return }
    throw new Error('not connected')
  }

  private async writeChunk(c: BtCharacteristic, part: Uint8Array<ArrayBuffer>) {
    // without response is faster; with response waits for the printer (safer, and the only way on some)
    if (c.properties.writeWithoutResponse && c.writeValueWithoutResponse) await c.writeValueWithoutResponse(part)
    else if (c.writeValueWithResponse) await c.writeValueWithResponse(part)
    else await c.writeValue(part)
  }

  private async write(data: Uint8Array) {
    const c = this.ch!
    const { chunk, pause } = SPEEDS[this.saved.speed]
    let last = -1
    for (let i = 0; i < data.length; i += chunk) {
      await this.writeChunk(c, data.slice(i, i + chunk))
      if (pause) await sleep(pause)
      const pct = Math.floor(((i + chunk) / data.length) * 100)
      if (pct >= last + 5) { last = pct; this.set({ progress: Math.min(100, pct) }) }
    }
  }

  /**
   * Diagnostic: sends one short ESC/POS line ("PRUEBA EL TRADICIONAL") to a channel. If it prints,
   * that is the channel; nothing means a config channel that doesn't print.
   */
  async testChannel(key: string): Promise<void> {
    const c = this.chars.get(key)
    if (!c) return
    try {
      await this.ensureConnected()
      await this.writeChunk(c, TEST_BYTES)
      this.set({ error: null, detail: null })
    } catch (e) {
      this.set({ error: 'No se pudo enviar la prueba por ese canal.', detail: e instanceof Error ? e.message : String(e) })
    }
  }

  /** Prints the blocks; one at a time, in the order asked. */
  printBlocks(blocks: Block[], num: number | null = null): Promise<void> {
    const job = async () => {
      this.set({ status: 'printing', error: null })
      try {
        await this.ensureConnected()
        const data = this.saved.lang === 'texto' ? escposText(layoutText(blocks)) : escposRaster(ticketBitmap(blocks).bitmap)
        try {
          await this.write(data)
        } catch (e) {
          // some printers only take 20-byte writes: retry once that way
          if (this.saved.speed === 'lenta') throw e
          this.setSpeed('lenta')
          await this.write(data)
        }
        if (num !== null) this.markPrinted(num)
        const next = this.pending.keys().next()
        this.set({ status: 'ready', progress: null, detail: null, failed: this.state.failed === num ? (next.done ? null : next.value) : this.state.failed })
      } catch (e) {
        this.set({
          status: this.ch ? 'ready' : 'off',
          progress: null,
          detail: e instanceof Error ? e.message : String(e),
          failed: num,
          error: num !== null ? `No se pudo imprimir el pedido #${num}. Saldrá solo cuando la impresora se reconecte, o toca Reintentar.` : 'No se pudo imprimir. Revisa que la impresora esté prendida y conectada.',
        })
        if (!this.ch) this.scheduleRetry()
      }
    }
    this.queue = this.queue.then(job)
    return this.queue
  }

  async printOrder(o: Order, fees: Record<string, number>) {
    this.pending.delete(o.num)
    await this.printBlocks(buildTicket(o, fees), o.num)
    if (this.state.failed === o.num) this.pending.set(o.num, { o, fees })
  }

  private printed(): number[] {
    try { return JSON.parse(localStorage.getItem(PRINTED_KEY) ?? '[]') } catch { return [] }
  }
  private markPrinted(num: number) {
    try { localStorage.setItem(PRINTED_KEY, JSON.stringify([...this.printed().filter(n => n !== num), num].slice(-300))) } catch { /* fine */ }
  }

  /**
   * Called with the panel's orders on every change. Prints each order that becomes "aceptado"
   * while the panel is open (accepted here or on another phone), once. Orders already accepted
   * when the panel opened are not printed again; the "Imprimir" button reprints any order.
   */
  onOrders(orders: Order[], fees: Record<string, number>) {
    if (!this.primed) {
      for (const o of orders) this.seen.set(o.num, o.status)
      this.primed = true
      return
    }
    for (const o of orders) {
      const prev = this.seen.get(o.num)
      this.seen.set(o.num, o.status)
      if (o.status !== 'aceptado' || prev === 'aceptado' || prev === undefined) continue
      if (!this.state.auto || this.state.status === 'unsupported' || this.printed().includes(o.num)) continue
      void this.printOrder(o, fees)
    }
  }
}

export const printer = new Printer()
