import { useEffect } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useDevice, useSnapshot, useStore } from '../data/hooks.ts'
import { StoreProvider } from '../data/StoreProvider.tsx'
import { BottomNav } from './BottomNav.tsx'
import { HelperButton, NameGate, Tour } from './Overlays.tsx'
import { P } from './paths.ts'
import { Cart } from './screens/Cart.tsx'
import { Chat } from './screens/Chat.tsx'
import { Checkout } from './screens/Checkout.tsx'
import { Confirm } from './screens/Confirm.tsx'
import { Corporate } from './screens/Corporate.tsx'
import { Dish } from './screens/Dish.tsx'
import { Home } from './screens/Home.tsx'
import { Menu } from './screens/Menu.tsx'
import { Orders } from './screens/Orders.tsx'
import { Profile } from './screens/Profile.tsx'

const NAV_PATHS = [P.home, P.menu, P.cart, P.profile, P.orders]

function Shell() {
  const store = useStore()
  const { error } = useSnapshot()
  const [dev, setDev] = useDevice()
  const { pathname } = useLocation()
  const nav = useNavigate()

  useEffect(() => { store.setCustomerEmail(dev.email) }, [store, dev.email])
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#FFFFFF')
  }, [])

  const showTour = dev.gateDone && !dev.tourDone
  return (
    <>
      {error && <div role="alert" style={{ flex: 'none', background: 'var(--ink)', color: '#fff', padding: '9px 22px', fontSize: 12.5, textAlign: 'center' }}>{error}</div>}
      <Routes>
        <Route path={P.home} element={<Home />} />
        <Route path={P.menu} element={<Menu />} />
        <Route path="/plato/:id" element={<Dish />} />
        <Route path={P.cart} element={<Cart />} />
        <Route path={P.checkout} element={<Checkout />} />
        <Route path={P.confirm} element={<Confirm />} />
        <Route path={P.profile} element={<Profile />} />
        <Route path={P.corp} element={<Corporate />} />
        <Route path={P.orders} element={<Orders />} />
        <Route path="/pedidos/:num/chat" element={<Chat />} />
        <Route path="*" element={<Home />} />
      </Routes>
      {(pathname === P.home || pathname === P.menu) && !showTour && (
        <HelperButton onClick={() => { setDev({ tourDone: false }); nav(P.home) }} />
      )}
      {NAV_PATHS.includes(pathname) && <BottomNav />}
      {!dev.gateDone && <NameGate />}
      {showTour && <Tour onDone={() => setDev({ tourDone: true })} />}
    </>
  )
}

function Loading() {
  return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src="/assets/logo.jpeg" alt="El Tradicional" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', animation: 'pop 1s ease infinite alternate' }} /></div>
}

export default function CustomerApp() {
  return (
    <div className="app-shell light">
      <StoreProvider role="customer" fallback={<Loading />}>
        <Shell />
      </StoreProvider>
    </div>
  )
}
