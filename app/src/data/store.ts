import type { Order, OrderDraft, Settings } from '../domain/types.ts'
import type { ReportRow } from '../domain/report.ts'
import type { ZoneUse } from '../domain/pricing.ts'
import type { Zone } from '../domain/catalog.ts'

export type Role = 'customer' | 'owner'

export interface Snapshot {
  ready: boolean
  settings: Settings
  /** Customer: their own orders. Owner: recent + open orders. Newest first. */
  orders: Order[]
  /** Owner (Supabase): signed in as an owner account. Always true in local mode. */
  authorized: boolean
  error: string | null
}

export interface ReviewPatch { stars?: number; comment?: string; rated?: boolean }

export interface RestaurantStore {
  readonly role: Role
  readonly backend: 'local' | 'supabase'
  subscribe(listener: () => void): () => void
  getSnapshot(): Snapshot
  /** Customer id bound to this device (local uuid or Supabase anonymous user). */
  customerId(): string | null

  // owner
  updateSettings(fn: (s: Settings) => Partial<Settings>): Promise<void>
  advanceOrder(num: number): Promise<void>
  rejectOrder(num: number, reason: string): Promise<void>
  reportRows(from: string, to: string): Promise<ReportRow[]>
  reportCount(from: string, to: string): Promise<number>
  /** every barrio customers chose on an order, newest first (to bring back barrios that were lost) */
  zoneHistory(): Promise<ZoneUse[]>
  /** barrios: each one is saved on its own, so no other change can undo it */
  addZone(z: Zone): Promise<void>
  setZoneFee(id: string, fee: number): Promise<void>
  removeZone(id: string): Promise<void>

  // customer
  placeOrder(draft: OrderDraft): Promise<Order>
  setReview(num: number, patch: ReviewPatch): Promise<void>

  // both
  sendMessage(num: number, text: string): Promise<void>
  markSeen(num: number): Promise<void>

  // owner auth (Supabase only; local resolves immediately)
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  dispose(): void
}

export class StoreError extends Error {}
