import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { fail, guard } from '@/lib/auth';
import { geminiJson } from '@/lib/gemini';
import { okHost } from '@/lib/mediaHosts';
export const runtime = 'nodejs';
export const maxDuration = 60;
const cache = new Map<string, any>();

// Shot ke liye footage thumbnails Gemini ko dikhake best chunta hai. Fail ho to { order: null }: client apni purani ranking rakhta hai.
export async function POST(req: Request) {
  const g = guard(req); if (g) return g;
  try {
    const { concept = '', visual = '', line = '', thumbs = [] } = await req.json();
    const urls: string[] = (Array.isArray(thumbs) ? thumbs : []).map(String).filter(okHost).slice(0, 6);
    if (urls.length < 2) return NextResponse.json({ order: null });
    const ck = createHash('sha1').update(JSON.stringify([concept, visual, line, urls])).digest('hex');
    if (cache.has(ck)) return NextResponse.json(cache.get(ck));
    const imgs = (await Promise.all(urls.map(async (u) => {
      try {
        const r = await fetch(u, { signal: AbortSignal.timeout(6000) });
        const buf = Buffer.from(await r.arrayBuffer());
        const mt = (r.headers.get('content-type') || '').split(';')[0];
        if (!r.ok || buf.length > 1_500_000 || !/^image\/(jpeg|png|webp)$/.test(mt)) return null;
        return { data: buf.toString('base64'), mt };
      } catch { return null; }
    })));
    const ok = imgs.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
    if (ok.length < 2) return NextResponse.json({ order: null });
    const parts: any[] = [{ text: `A video shot needs stock footage. Concept: "${String(concept).slice(0, 120)}". What the viewer should see: "${String(visual).slice(0, 200)}". Narration: "${String(line).slice(0, 200)}".
Below are ${ok.length} candidate thumbnails, numbered 0 to ${ok.length - 1} in order. Score each 0-10 for how well it shows the needed subject (literal match first, then mood). Penalise watermarks/text, wrong subject, and cluttered or dull frames.
Return ONLY JSON: {"scores":[${ok.length} numbers],"best":index,"reason":"max 8 words"}` }];
    ok.forEach((i, n) => { parts.push({ text: `Image ${n}:` }); parts.push({ inline_data: { mime_type: imgs[i]!.mt, data: imgs[i]!.data } }); });
    const d = await geminiJson(parts, 0.1, 'pick');
    const sc: number[] = Array.isArray(d.scores) ? d.scores.map((x: any) => Math.max(0, Math.min(10, Number(x) || 0))) : [];
    if (sc.length !== ok.length) return NextResponse.json({ order: null });
    const scores: number[] = urls.map(() => -1);   // vision ke liye jo load na hue unko -1 (neeche)
    ok.forEach((i, n) => { scores[i] = sc[n]; });
    const out = { order: scores, reason: String(d.reason || '').slice(0, 80) };
    cache.set(ck, out);
    return NextResponse.json(out);
  } catch (e: any) {
    console.error('[pick]', e?.message || e);
    return fail(e);
  }
}
