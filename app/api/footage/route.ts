import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
export const runtime = 'nodejs';
export const maxDuration = 60;
const cache = new Map<string, any[]>();
const sig = () => AbortSignal.timeout(8000);

// Pixabay Videos API. Koi bhi error (network, quota, bad key) yaha [] ban jata hai, upar tak nahi jata.
async function pixabay(key: string, q: string, page: number, o: string): Promise<any[]> {
  const params = new URLSearchParams({ key, q: q.slice(0, 100), per_page: '4', page: String(page), safesearch: 'true' });
  const r = await fetch(`https://pixabay.com/api/videos/?${params}`, { signal: sig() });
  if (!r.ok) return [];
  const d = await r.json().catch(() => null);
  let hits: any[] = Array.isArray(d?.hits) ? d.hits : [];
  // Pixabay mein orientation filter nahi hai, isliye width/height se sort: matching orientation wale pehle
  if (o) {
    const fit = (h: any) => { const v = h.videos?.medium || h.videos?.small || h.videos?.tiny; return v ? (o === 'portrait' ? v.height > v.width : v.width >= v.height) : false; };
    hits = [...hits.filter(fit), ...hits.filter((h) => !fit(h))];
  }
  return hits.map((h: any) => {
    const small = h.videos?.small, tiny = h.videos?.tiny, med = h.videos?.medium;
    return {
      thumb: tiny?.thumbnail || small?.thumbnail || med?.thumbnail || (h.picture_id ? `https://i.vimeocdn.com/video/${h.picture_id}_640x360.jpg` : ''),
      link: h.pageURL, credit: 'Pixabay / ' + (h.user || ''), preview: tiny?.url || small?.url,
    };
  }).filter((x: any) => x.thumb && x.link);
}

// q = "kw1|kw2|kw3" (expanded keywords, specific pehle). Kabhi 500 nahi deta: fail ya empty ho to { items: [] }.
export async function GET(req: Request) {
  const g = guard(req); if (g) return g;
  try {
    const u = new URL(req.url);
    const queries = (u.searchParams.get('q') || '').split('|').map((x) => x.trim()).filter(Boolean).slice(0, 3);
    const page = Math.max(1, Math.min(5, Number(u.searchParams.get('page')) || 1));
    const o = ['portrait', 'landscape'].includes(u.searchParams.get('o') || '') ? u.searchParams.get('o')! : '';
    const key = process.env.PIXABAY_API_KEY;
    if (!queries.length || !key) return NextResponse.json({ items: [] });
    const ck = JSON.stringify([queries, page, o]);
    const hit = cache.get(ck);
    if (hit) return NextResponse.json({ items: hit });
    let items: any[] = [];
    for (const q of queries) {
      try { items = await pixabay(key, q, page, o); } catch (e: any) { console.error('[footage]', e?.message || e); }
      if (items.length) break;
    }
    if (items.length) cache.set(ck, items);
    return NextResponse.json({ items });
  } catch (e: any) {
    console.error('[footage]', e?.message || e);
    return NextResponse.json({ items: [] });
  }
}
