import { createContext, useContext, useSyncExternalStore } from 'react'
import { deviceStore, type DeviceState } from './device.ts'
import type { RestaurantStore } from './store.ts'

export const StoreCtx = createContext<RestaurantStore | null>(null)

export function useStore(): RestaurantStore {
  const s = useContext(StoreCtx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}

export function useSnapshot() {
  const s = useStore()
  return useSyncExternalStore(s.subscribe, s.getSnapshot)
}

export function useDevice(): [DeviceState, (p: Partial<DeviceState> | ((s: DeviceState) => Partial<DeviceState>)) => void] {
  const d = deviceStore()
  const state = useSyncExternalStore(d.subscribe, d.getSnapshot)
  return [state, d.update]
}
