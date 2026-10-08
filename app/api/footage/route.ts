import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
export const runtime = 'nodejs';
export const maxDuration = 60;
const cache = new Map<string, any[]>();
const sig = () => AbortSignal.timeout(8000);

async function pexels(key: string, q: string, page: number, o: string): Promise<any[]> {
  const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=4&page=${page}${o ? `&orientation=${o}` : ''}`, { headers: { Authorization: key }, signal: sig() });
  if (!r.ok) return [];
  return ((await r.json()).videos || []).map((v: any) => {
    const files = (v.video_files || []).filter((f: any) => f.file_type === 'video/mp4').sort((a: any, b: any) => a.width - b.width);
    return { thumb: v.image, link: v.url, credit: 'Pexels / ' + (v.user?.name || ''), preview: (files.find((f: any) => f.width >= 240) || files[0])?.link };
  });
}
async function pixabay(key: string, q: string, page: number): Promise<any[]> {
  const r = await fetch(`https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(q)}&per_page=4&page=${page}`, { signal: sig() });
  if (!r.ok) return [];
  return ((await r.json()).hits || []).map((h: any) => ({
    thumb: h.videos?.tiny?.thumbnail || h.videos?.small?.thumbnail || `https://i.vimeocdn.com/video/${h.picture_id}_640x360.jpg`,
    link: h.pageURL, credit: 'Pixabay / ' + (h.user || ''), preview: h.videos?.tiny?.url,
  }));
}

// q = "kw1|kw2|kw3" (expanded keywords, specific pehle). Pexels pehle, fail/empty ho to Pixabay. Kabhi 500 nahi deta.
export async function GET(req: Request) {
  const g = guard(req); if (g) return g;
  const u = new URL(req.url);
  const queries = (u.searchParams.get('q') || '').split('|').map((x) => x.trim()).filter(Boolean).slice(0, 3);
  const page = Math.max(1, Math.min(5, Number(u.searchParams.get('page')) || 1));
  const o = ['portrait', 'landscape'].includes(u.searchParams.get('o') || '') ? u.searchParams.get('o')! : '';
  if (!queries.length) return NextResponse.json({ items: [] });
  const ck = JSON.stringify([queries, page, o]);
  if (cache.has(ck)) return NextResponse.json({ items: cache.get(ck) });
  const px = process.env.PEXELS_API_KEY, pb = process.env.PIXABAY_API_KEY;
  let items: any[] = [];
  if (px) for (const q of queries) {
    try { items = await pexels(px, q, page, o); if (!items.length && o) items = await pexels(px, q, page, ''); } catch {}
    if (items.length) break;
  }
  if (!items.length && pb) for (const q of queries) {
    try { items = await pixabay(pb, q, page); } catch {}
    if (items.length) break;
  }
  if (items.length) cache.set(ck, items);
  return NextResponse.json({ items });
}
