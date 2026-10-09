import { NextResponse } from 'next/server';
import { fail, guard } from '@/lib/auth';
import { geminiJson } from '@/lib/gemini';
import { asLang, asTone, styleRule } from '@/lib/style';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Posting pack: title, caption aur hashtags. Script ke bahar ka kuch invent nahi karta.
export async function POST(req: Request) {
  const g = guard(req); if (g) return g;
  const { title, script, platform, lang, tone } = await req.json();
  const text = String(script || '').slice(0, 3000);
  if (!text.trim()) return NextResponse.json({ error: 'script missing' }, { status: 400 });
  const rule = styleRule(asLang(lang), asTone(tone));
  const prompt = `Video topic: "${String(title || '').slice(0, 200)}". Platform: ${String(platform || 'reel').slice(0, 20)}.
Voiceover script:\n${text}\n
Write a posting pack for this video. Use ONLY information present in the script (no new facts or numbers).
Return ONLY JSON: {"titles": [3 strings, max 70 chars, scroll-stopping], "caption": string (2-3 short lines ending with a call to action), "hashtags": [8 to 12 strings without the # sign, mix of broad and niche, no spaces]}${rule}`;
  try {
    const o = await geminiJson([{ text: prompt }], 0.7, 'social');
    const titles = (Array.isArray(o?.titles) ? o.titles : []).map(String).slice(0, 3);
    const hashtags = (Array.isArray(o?.hashtags) ? o.hashtags : []).map((h: any) => String(h).replace(/[^\p{L}\p{N}_]/gu, '')).filter(Boolean).slice(0, 12);
    if (!titles.length || !o?.caption) throw new Error('social invalid');
    return NextResponse.json({ titles, caption: String(o.caption).slice(0, 600), hashtags });
  } catch (e: any) { return fail(e); }
}
