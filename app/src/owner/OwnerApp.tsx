import { useEffect, useState } from 'react'
import { hasUnread, isFinished } from '../domain/orders.ts'
import { missingZones, zonesOf } from '../domain/pricing.ts'
import { useSnapshot, useStore } from '../data/hooks.ts'
import { StoreProvider } from '../data/StoreProvider.tsx'
import { AdminChat } from './AdminChat.tsx'
import { BillingTab } from './BillingTab.tsx'
import { MenuTab } from './MenuTab.tsx'
import { OrdersTab } from './OrdersTab.tsx'
import { printer } from './printer/printer.ts'
import { PrinterPanel } from './printer/PrinterPanel.tsx'
import { InstallBanner } from './InstallBanner.tsx'
import { OwnerLogin } from './OwnerLogin.tsx'
import o from './o.module.css'

type Tab = 'pedidos' | 'menu' | 'impresora' | 'facturacion'
const TABS: [Tab, string, string][] = [['pedidos', '🧾', 'Pedidos'], ['menu', '🍽️', 'Menú'], ['impresora', '🖨️', 'Impresora'], ['facturacion', '📊', 'Facturación']]

function Panel() {
  const store = useStore()
  const snap = useSnapshot()
  const [tab, setTab] = useState<Tab>('pedidos')
  const [chatNum, setChatNum] = useState<number | null>(null)
  const open = snap.settings.storeOpen
  const newMsgs = snap.orders.filter(x => hasUnread(x, 'dueno')).length
  const pending = snap.orders.filter(x => x.status !== 'rechazado' && !isFinished(x.status)).length

  // kitchen printer: reconnect on open, print each order as it gets accepted (see printer.ts)
  useEffect(() => { void printer.reconnect() }, [])
  useEffect(() => { if (snap.ready && snap.authorized) printer.onOrders(snap.orders, snap.settings.deliveryFees) }, [snap.ready, snap.authorized, snap.orders, snap.settings.deliveryFees])

  // once: barrios that an older version of the panel overwrote come back from the orders placed with them
  const restored = snap.settings.zonesRestored
  useEffect(() => {
    if (!snap.ready || !snap.authorized || restored) return
    store.zoneHistory()
      .then(uses => store.updateSettings(st => {
        if (st.zonesRestored) return {}
        const lost = missingZones(uses, zonesOf(st))
        return lost.length ? { zones: [...zonesOf(st), ...lost], zonesRestored: true } : { zonesRestored: true }
      }))
      .catch(() => { /* tried again next time the panel opens */ })
  }, [store, snap.ready, snap.authorized, restored])

  useEffect(() => {
    document.title = (newMsgs ? `(${newMsgs}) ` : '') + 'Panel · El Tradicional'
  }, [newMsgs])

  if (!snap.ready) return <div style={{ flex: 1 }} />
  if (!snap.authorized) return <OwnerLogin />

  return (
    <>
      <div className={o.header}>
        <div className={o.brand}>
          <img className={o.logo} src="/assets/logo.jpeg" alt="El Tradicional" />
          <div><div className={o.kicker}>Panel del dueño</div><div className={o.brandName}>El Tradicional</div></div>
        </div>
        <button type="button" className={o.storeBtn} aria-pressed={open} aria-label={open ? 'Tienda abierta: tocar para cerrar' : 'Tienda cerrada: tocar para abrir'}
          onClick={() => void store.updateSettings(s => ({ storeOpen: !s.storeOpen }))}>
          <span className={o.storeTrack} style={{ background: open ? '#2F7D46' : '#4a453c' }}><span className={o.storeKnob} style={open ? { right: 3 } : { left: 3 }} /></span>
          <span className={o.storeLabel} style={{ color: open ? '#7ED694' : '#c9bfae' }}>{open ? 'Abierto' : 'Cerrado'}</span>
        </button>
      </div>
      <div className={o.tabs} role="tablist">
        {TABS.map(([id, icon, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`${o.tab} ${tab === id ? o.tabOn : ''}`} onClick={() => setTab(id)}>
            <span className={o.tabIcon} aria-hidden="true">{icon}</span>{label}
            {id === 'pedidos' && pending > 0 && <span className={o.tabCount} aria-label={`${pending} por atender`}>{pending}</span>}
          </button>
        ))}
      </div>
      <div className={`${o.content} noscroll`}>
        {snap.error && <div style={{ fontSize: 12, color: '#F0A0A0', marginBottom: 10 }} role="alert">{snap.error}</div>}
        <InstallBanner />
        {tab === 'pedidos' && <OrdersTab onChat={setChatNum} onPrinter={() => setTab('impresora')} />}
        {tab === 'menu' && <MenuTab />}
        {tab === 'impresora' && <PrinterPanel />}
        {tab === 'facturacion' && <BillingTab />}
        {store.backend === 'supabase' && <button type="button" className={o.signout} onClick={() => void store.signOut()}>Cerrar sesión</button>}
      </div>
      {chatNum !== null && <AdminChat num={chatNum} onClose={() => setChatNum(null)} />}
    </>
  )
}

export default function OwnerApp() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', '#14110E')
    return () => { meta?.setAttribute('content', '#FFFFFF') }
  }, [])
  return (
    <div className="app-shell dark">
      <StoreProvider role="owner" fallback={<div style={{ flex: 1 }} />}>
        <Panel />
      </StoreProvider>
    </div>
  )
}
