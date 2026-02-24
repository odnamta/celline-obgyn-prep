import crypto from 'crypto'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No 0/O/1/I to avoid confusion

export function generatePublicCode(): string {
  const bytes = crypto.randomBytes(6)
  return Array.from(bytes)
    .map((b) => CHARS[b % CHARS.length])
    .join('')
}
