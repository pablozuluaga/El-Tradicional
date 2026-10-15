/** "0000ff02-0000-1000-8000-00805f9b34fb" → "FF02"; long custom ones keep their first block. */
export const shortUuid = (u: string) => (/^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/i.exec(u)?.[1] ?? u.split('-')[0]).toUpperCase()
