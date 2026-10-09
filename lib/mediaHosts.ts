// Sirf in stock-footage hosts se media server-side fetch hota hai (SSRF se bachne ke liye allowlist).
const HOSTS = ['cdn.pixabay.com', 'pixabay.com', 'i.vimeocdn.com', 'upload.wikimedia.org', 'commons.wikimedia.org', 'videos.pexels.com', 'images.pexels.com'];
export function okHost(u: string): boolean {
  try { const x = new URL(u); return x.protocol === 'https:' && HOSTS.some((h) => x.hostname === h || x.hostname.endsWith('.' + h)); } catch { return false; }
}
