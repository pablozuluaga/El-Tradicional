/** A Bluetooth call that never answers (printer switched off mid-way, link half dead) must not hang the panel. */
export class TimeoutError extends Error {
  constructor(message: string) { super(message); this.name = 'TimeoutError' }
}

/** Resolves like `p`, or rejects with a TimeoutError after `ms`. */
export function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new TimeoutError(message)), ms) })
  return Promise.race([p, late]).finally(() => clearTimeout(timer))
}
