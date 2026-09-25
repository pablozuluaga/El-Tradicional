/** Short unique id for client-side records (cart lines, addresses, drinks, promos). */
export const newId = (prefix = '') => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
