/**
 * Generiert ein kryptografisch sicheres Passwort im Renderer-Prozess
 * Verwendet Web Crypto API (window.crypto.getRandomValues) – BSI S-08 konform
 * KEIN Math.random()
 *
 * @returns {string} 16-stelliges Passwort
 */
export function generatePassword() {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&'
  const bytes = new Uint8Array(16)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => charset[b % charset.length]).join('')
}
