import { NextResponse } from 'next/server';
import { fail, guard } from '@/lib/auth';
export const runtime = 'nodejs';
export const maxDuration = 60;
const cache = new Map<string, any>();
const UA = { 'User-Agent': 'AirMotionCanvas/0.2 (hackathon demo)' };

async function summary(t: string) {
  const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, '_'))}`, { headers: UA, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const d = await r.json();
  return d.type === 'disambiguation' || !d.extract ? null : d;
}
async function search(q: string): Promise<string[]> {
  const r = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=3&format=json`, { headers: UA, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return [];
  const d = await r.json();
  return Array.isArray(d?.[1]) ? d[1] : [];
}

// Pehle reliable source (Wikipedia) se facts, phir Gemini unhe creator-friendly banata hai (/api/plan)
export async function GET(req: Request) {
  const g = guard(req); if (g) return g;
  const t = (new URL(req.url).searchParams.get('title') || '').trim().slice(0, 120);
  if (!t) return NextResponse.json({ error: 'title missing' }, { status: 400 });
  if (cache.has(t)) return NextResponse.json(cache.get(t));
  try {
    let d = await summary(t);
    if (!d) for (const alt of await search(t)) { d = await summary(alt); if (d) break; }  // exact title na mile to search fallback
    if (!d) return NextResponse.json({ error: 'wiki not found' }, { status: 404 });
    const out = { title: d.title, extract: String(d.extract).slice(0, 900), description: d.description, url: d.content_urls?.desktop?.page };
    cache.set(t, out);
    return NextResponse.json(out);
  } catch (e: any) {
    return fail(e);
  }
}
