/** Standard API response envelope: { success, data, error } (+ meta on lists). */

export interface PageMeta {
  total: number
  page: number
  pageSize: number
}

export function ok<T>(data: T, meta?: PageMeta) {
  return { success: true as const, data, error: null, ...(meta ? { meta } : {}) }
}

export function err(message: string) {
  return { success: false as const, data: null, error: message }
}

/** JSON.stringify replacer: Prisma BigInt columns → strings. */
export function jsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v: unknown) => (typeof v === 'bigint' ? v.toString() : v))
  ) as T
}
