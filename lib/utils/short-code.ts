/** Utility: Generate URL-safe short codes for UTM links */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function generateShortCode(length: number = 8): string {
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, (v) => CHARS[v % CHARS.length]).join('')
}
