import { guard } from '@/lib/auth';
import { okHost } from '@/lib/mediaHosts';
export const runtime = 'nodejs';
export const maxDuration = 30;

// Video export ke liye: kuch CDNs CORS nahi dete, to canvas "tainted" ho jaata hai. Yahan se same-origin mein laate hain.
// Vercel ki response limit ~4.5MB hai, isse bade clips fail honge (client phir thumbnail par fallback karta hai).
export async function GET(req: Request) {
  const g = guard(req); if (g) return g;
  const u = new URL(req.url).searchParams.get('u') || '';
  if (!okHost(u)) return new Response('bad host', { status: 400 });
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(20000), redirect: 'follow' });
    const len = Number(r.headers.get('content-length') || 0);
    if (!r.ok || len > 4_400_000) return new Response('unavailable', { status: 413 });
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 4_400_000) return new Response('too big', { status: 413 });
    return new Response(buf, { headers: { 'Content-Type': r.headers.get('content-type') || 'application/octet-stream', 'Cache-Control': 'private, max-age=600' } });
  } catch { return new Response('fetch failed', { status: 502 }); }
}
