/** HMAC-SHA256 JWT signing using Web Crypto API (no external deps) */

function base64url(data: Uint8Array): string {
  let binary = ''
  for (const byte of data) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function textToBase64url(text: string): string {
  return base64url(new TextEncoder().encode(text))
}

async function hmacSha256(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data))
  return base64url(new Uint8Array(signature))
}

export async function signGateToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = textToBase64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = textToBase64url(JSON.stringify(payload))
  const signature = await hmacSha256(secret, `${header}.${body}`)
  return `${header}.${body}.${signature}`
}

export async function verifyGateToken(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const header = parts[0]
  const body = parts[1]
  const signature = parts[2]
  const expected = await hmacSha256(secret, `${header}.${body}`)
  if (signature !== expected) return null

  try {
    const decoded = JSON.parse(atob(body!.replace(/-/g, '+').replace(/_/g, '/')))
    if (typeof decoded.exp === 'number' && decoded.exp < Math.floor(Date.now() / 1000)) return null
    return decoded
  } catch {
    return null
  }
}
