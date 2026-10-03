import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './pwa/install.ts'
import './pwa/update.ts'
import App from './App.tsx'

// No pinch zoom (iOS Safari ignores user-scalable=no in the viewport).
for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, e => e.preventDefault(), { passive: false })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
