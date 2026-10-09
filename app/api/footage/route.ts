import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
export const runtime = 'nodejs';
export const maxDuration = 60;
type Raw = { still?: boolean; thumb: string; link: string; credit: string; preview?: string; text: string; fit?: boolean };
const cache = new Map<string, { t: number; items: any[] }>();
const sig = () => AbortSignal.timeout(8000);
const STOP = new Set(['the', 'and', 'with', 'for', 'from', 'into', 'video', 'footage', 'stock', 'shot', 'view', 'clip']);
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/(ing|es|ed|s)$/, ''));

async function pexels(key: string, q: string, o: string): Promise<Raw[]> {
  const base = `https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=15`;
  const get = (u: string) => fetch(u, { headers: { Authorization: key }, signal: sig() });
  let r = await get(base + (o ? `&orientation=${o}` : ''));
  if (!r.ok && o) r = await get(base);
  if (!r.ok) return [];
  const d: any = await r.json().catch(() => null);
  return (d?.videos || []).map((v: any) => {
    const slug = String(v.url || '').split('/').filter(Boolean).pop() || '';
    const f = (v.video_files || []).filter((x: any) => x.file_type === 'video/mp4').sort((a: any, b: any) => (a.width || 0) - (b.width || 0))[0];
    return { thumb: v.image, link: v.url, credit: 'Pexels / ' + (v.user?.name || ''), preview: f?.link, text: slug.replace(/-\d+$/, '').replace(/-/g, ' '), fit: o ? (o === 'portrait' ? v.height > v.width : v.width >= v.height) : true };
  });
}
async function pixabay(key: string, q: string, o: string): Promise<Raw[]> {
  const p = new URLSearchParams({ key, q: q.slice(0, 100), per_page: '15', safesearch: 'true' });
  const r = await fetch(`https://pixabay.com/api/videos/?${p}`, { signal: sig() });
  if (!r.ok) return [];
  const d: any = await r.json().catch(() => null);
  return (d?.hits || []).map((h: any) => {
    const v = h.videos?.medium || h.videos?.small || h.videos?.tiny, t = h.videos?.tiny, s = h.videos?.small;
    return { thumb: t?.thumbnail || s?.thumbnail || v?.thumbnail || (h.picture_id ? `https://i.vimeocdn.com/video/${h.picture_id}_640x360.jpg` : ''), link: h.pageURL, credit: 'Pixabay / ' + (h.user || ''), preview: t?.url || s?.url, text: String(h.tags || ''), fit: o && v ? (o === 'portrait' ? v.height > v.width : v.width >= v.height) : true };
  });
}

// Wikimedia Commons: koi key nahi chahiye. Free-licensed video (aur video na mile to photo) — Pexels/Pixabay key na ho tab bhi footage aata hai.
async function wikimedia(q: string, o: string): Promise<Raw[]> {
  const run = async (kind: 'video' | 'bitmap') => {
    const p = new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrnamespace: '6', gsrlimit: '12', gsrsearch: `filetype:${kind} ${q}`, prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '640' });
    const r = await fetch(`https://commons.wikimedia.org/w/api.php?${p}`, { headers: { 'User-Agent': 'AirMotionCanvas/1.0 (storyboard tool)' }, signal: sig() });
    if (!r.ok) return [] as Raw[];
    const d: any = await r.json().catch(() => null);
    return Object.values(d?.query?.pages || {}).map((pg: any) => {
      const ii = pg.imageinfo?.[0]; if (!ii) return null;
      const title = String(pg.title || '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ');
      const desc = String(ii.extmetadata?.ImageDescription?.value || '').replace(/<[^>]+>/g, ' ').slice(0, 160);
      const small = kind === 'video' && ii.size && ii.size < 18e6 && /webm|ogg|mp4/.test(ii.mime || '');
      return { thumb: ii.thumburl || '', link: ii.descriptionurl, credit: 'Wikimedia Commons', preview: small ? ii.url : undefined, text: title + ' ' + desc, fit: o ? (o === 'portrait' ? ii.height > ii.width : ii.width >= ii.height) : true } as Raw;
    }).filter(Boolean) as Raw[];
  };
  const vid = await run('video');
  return vid.length >= 3 ? vid : [...vid, ...(await run('bitmap')).map((x) => ({ ...x, still: true }))];
}

// Relevance: pehla (subject) word double weight, aage ki queries thoda kam. Kam-relevant footage hata dete hain.
function score(qw: string[], text: string, qi: number) {
  const have = new Set(words(text));
  const wt = qw.map((_, i) => (i === 0 ? 2 : 1));
  const tot = wt.reduce((a, b) => a + b, 0) || 1;
  return (qw.reduce((a, w, i) => a + (have.has(w) ? wt[i] : 0), 0) / tot) * (1 - 0.1 * qi);
}

// q = "kw1|kw2|kw3" (specific pehle). Kabhi 500 nahi deta: fail ya empty ho to { items: [] }.
export async function GET(req: Request) {
  const g = guard(req); if (g) return g;
  try {
    const u = new URL(req.url);
    const queries = (u.searchParams.get('q') || '').split('|').map((x) => x.trim()).filter(Boolean).slice(0, 3);
    const page = Math.max(1, Math.min(5, Number(u.searchParams.get('page')) || 1));
    const o = ['portrait', 'landscape'].includes(u.searchParams.get('o') || '') ? u.searchParams.get('o')! : '';
    const px = process.env.PEXELS_API_KEY, pb = process.env.PIXABAY_API_KEY;
    if (!queries.length) return NextResponse.json({ items: [] });
    const ck = JSON.stringify([queries, o]);
    let ranked = cache.get(ck);
    if (!ranked || Date.now() - ranked.t > 600000) {
      const best = new Map<string, { it: Raw; s: number }>();
      await Promise.all(queries.flatMap((q, qi) => {
        const qw = words(q);
        return [px ? pexels(px, q, o) : Promise.resolve([] as Raw[]), pb ? pixabay(pb, q, o) : Promise.resolve([] as Raw[]), wikimedia(q, o)].map((p) =>
          p.catch((e: any) => { console.error('[footage]', e?.message || e); return [] as Raw[]; }).then((list) => {
            for (const it of list) {
              if (!it.thumb || !it.link) continue;
              const s = score(qw, it.text, qi) + (it.fit ? 0.1 : 0) - (it.still ? 0.15 : 0) + (it.preview ? 0.05 : 0);
              if (!best.has(it.link) || best.get(it.link)!.s < s) best.set(it.link, { it, s });
            }
          }));
      }));
      const all = [...best.values()].sort((a, b) => b.s - a.s);
      const good = all.filter((x) => x.s >= 0.45);
      const pick = good.length >= 2 ? good : all.slice(0, 4);   // relevant kam hon to top kuch dikhao
      ranked = { t: Date.now(), items: pick.map(({ it }) => ({ thumb: it.thumb, link: it.link, credit: it.credit, preview: it.preview })) };
      if (ranked.items.length) cache.set(ck, ranked);
    }
    return NextResponse.json({ items: ranked.items.slice((page - 1) * 6, page * 6) });
  } catch (e: any) {
    console.error('[footage]', e?.message || e);
    return NextResponse.json({ items: [] });
  }
}
