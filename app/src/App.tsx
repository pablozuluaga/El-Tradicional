import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import CustomerApp from './customer/CustomerApp.tsx'
import { Install } from './customer/screens/Install.tsx'

const OwnerApp = lazy(() => import('./owner/OwnerApp.tsx'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/instalar" element={<Install />} />
        <Route path="/admin/*" element={<Suspense fallback={<div className="app-shell dark" />}><OwnerApp /></Suspense>} />
        <Route path="/*" element={<CustomerApp />} />
      </Routes>
    </BrowserRouter>
  )
}
