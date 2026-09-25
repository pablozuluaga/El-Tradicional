export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
/** Supabase's publishable key (new name) or anon key (old name); both are safe in the client. */
export const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
