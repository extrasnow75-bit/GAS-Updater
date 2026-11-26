/**
 * The only places the app sends people to in their web browser: Google documents, Drive and
 * Sheets, the Apps Script editor and settings, the Google Cloud console pages that Google's own
 * error messages link to, GitHub's help pages, and this project's own GitHub repos. Anything
 * else is ignored, so a bad link can never be used to open something unexpected.
 */
const ALLOWED_HOSTS = new Set([
  'docs.google.com',
  'drive.google.com',
  'script.google.com',
  'console.cloud.google.com',
  'console.developers.google.com',
  'docs.github.com',
])

/** github.com itself only for this project's owner, so a link cannot point at someone else's download. */
const GITHUB_OWNER_PATH = '/extrasnow75-bit/'

export function isAllowedExternalUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return false
    if (u.hostname === 'github.com') return u.pathname.startsWith(GITHUB_OWNER_PATH)
    return ALLOWED_HOSTS.has(u.hostname)
  } catch {
    return false
  }
}
