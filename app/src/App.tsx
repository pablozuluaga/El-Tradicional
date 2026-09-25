import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import CustomerApp from './customer/CustomerApp.tsx'

const OwnerApp = lazy(() => import('./owner/OwnerApp.tsx'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<Suspense fallback={<div className="app-shell dark" />}><OwnerApp /></Suspense>} />
        <Route path="/*" element={<CustomerApp />} />
      </Routes>
    </BrowserRouter>
  )
}
