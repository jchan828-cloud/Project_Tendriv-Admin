import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyVercelSignature(
  rawBody: string | Buffer,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false
  const expected = createHmac('sha1', secret)
    .update(typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody)
    .digest('hex')
  const sigBuf = Buffer.from(signature, 'hex')
  const expBuf = Buffer.from(expected, 'hex')
  if (sigBuf.length !== expBuf.length) return false
  return timingSafeEqual(sigBuf, expBuf)
}

export function verifyBearer(authHeader: string | null, expected: string): boolean {
  if (!authHeader) return false
  const prefix = 'Bearer '
  if (!authHeader.startsWith(prefix)) return false
  const token = authHeader.slice(prefix.length)
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
