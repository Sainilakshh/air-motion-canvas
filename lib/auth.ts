import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
const prod = process.env.NODE_ENV === 'production';
const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

// Simple per-IP rate limit (in-memory: har serverless instance ka apna counter hota hai, to ye abuse rokne ki basic parat hai;
// pakka limit chahiye to Upstash/Vercel KV se badlo).
const hits = new Map<string, { n: number; t: number }>();
const WINDOW = 60_000, MAX = Number(process.env.RATE_LIMIT_PER_MIN) || 40;
function limited(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const now = Date.now(), h = hits.get(ip);
  if (!h || now - h.t > WINDOW) { hits.set(ip, { n: 1, t: now }); if (hits.size > 5000) for (const [k, v] of hits) if (now - v.t > WINDOW) hits.delete(k); return false; }
  return ++h.n > MAX;
}

// Dev mein code na ho to khula; production mein DEMO_ACCESS_CODE na ho to band (fail closed).
export function guard(req: Request) {
  const code = process.env.DEMO_ACCESS_CODE;
  const locked = NextResponse.json({ error: 'locked' }, { status: 401 });
  if (limited(req)) return NextResponse.json({ error: 'Too many requests, wait a minute.', code: 'RATE' }, { status: 429, headers: { 'Retry-After': '60' } });
  if (!code) return prod ? locked : null;
  return same(req.headers.get('x-access-code') || '', code) ? null : locked;
}
// Production mein raw error client ko nahi jaata, sirf server log mein.
export function fail(e: any, status = 502) {
  const code = e?.code || (e instanceof SyntaxError ? 'BAD_JSON' : 'ERROR');
  console.error('[api]', code, e?.message || e);
  // code (QUOTA, NOT_FOUND...) safe hai, secrets nahi; raw message production mein nahi jaata
  return NextResponse.json({ error: prod ? 'Service temporarily unavailable' : String(e?.message || e), code }, { status });
}
