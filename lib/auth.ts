import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
const prod = process.env.NODE_ENV === 'production';
const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

// Dev mein code na ho to khula; production mein DEMO_ACCESS_CODE na ho to band (fail closed).
export function guard(req: Request) {
  const code = process.env.DEMO_ACCESS_CODE;
  const locked = NextResponse.json({ error: 'locked' }, { status: 401 });
  if (!code) return prod ? locked : null;
  return same(req.headers.get('x-access-code') || '', code) ? null : locked;
}
// Production mein raw error client ko nahi jaata, sirf server log mein.
export function fail(e: any, status = 502) {
  console.error('[api]', e?.message || e);
  return NextResponse.json({ error: prod ? 'Service temporarily unavailable' : String(e?.message || e) }, { status });
}
