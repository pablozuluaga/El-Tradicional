import { useEffect, useState, type ReactNode } from 'react'
import { deviceStore } from './device.ts'
import { StoreCtx } from './hooks.ts'
import { LocalStore } from './localStore.ts'
import type { RestaurantStore, Role } from './store.ts'

async function createStore(role: Role): Promise<RestaurantStore> {
  // Env values are inlined at build time, so a local-only build drops the Supabase chunk entirely.
  if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
    const { SupabaseStore } = await import('./supabaseStore.ts')
    return new SupabaseStore(role)
  }
  return new LocalStore(role, deviceStore().getSnapshot().deviceId)
}

/** Creates the backend for one app (customer or owner) and provides it to the tree. */
export function StoreProvider({ role, children, fallback }: { role: Role; children: ReactNode; fallback: ReactNode }) {
  const [store, setStore] = useState<RestaurantStore | null>(null)
  useEffect(() => {
    let alive = true
    let made: RestaurantStore | null = null
    createStore(role).then(s => {
      made = s
      if (alive) setStore(s)
      else s.dispose()
    })
    return () => { alive = false; made?.dispose() }
  }, [role])
  if (!store) return <>{fallback}</>
  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>
}
