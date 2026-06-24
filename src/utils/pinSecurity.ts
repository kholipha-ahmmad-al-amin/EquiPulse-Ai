export async function hashStaffPin(tenantId: string, pin: string): Promise<string> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits.')
  }

  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure PIN hashing requires a modern browser context.')
  }

  const payload = new TextEncoder().encode(`${tenantId}:${pin}`)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', payload)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
