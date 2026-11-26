/**
 * The only places the app sends people to in their web browser: Google documents and
 * Drive, the Apps Script editor and settings, and GitHub. Anything else is ignored, so a
 * bad link can never be used to open something unexpected on the computer.
 */
const ALLOWED_HOSTS = new Set([
  'docs.google.com',
  'drive.google.com',
  'script.google.com',
  'github.com',
])

export function isAllowedExternalUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && ALLOWED_HOSTS.has(u.hostname)
  } catch {
    return false
  }
}
