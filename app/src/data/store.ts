import type { Eligibility, Order, OrderDraft, Settings } from '../domain/types.ts'
import type { ReportRow } from '../domain/report.ts'

export type Role = 'customer' | 'owner'

export interface Snapshot {
  ready: boolean
  settings: Settings
  /** Customer: their own orders. Owner: recent + open orders. Newest first. */
  orders: Order[]
  /** Customer only: benefit status for the next order. */
  eligibility: Eligibility
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
  /** Customer: tell the store which email to use for benefit eligibility. */
  setCustomerEmail(email: string): void

  // owner
  updateSettings(fn: (s: Settings) => Partial<Settings>): Promise<void>
  advanceOrder(num: number): Promise<void>
  rejectOrder(num: number, reason: string): Promise<void>
  reportRows(from: string, to: string): Promise<ReportRow[]>
  reportCount(from: string, to: string): Promise<number>

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
