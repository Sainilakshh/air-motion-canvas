import { NextResponse } from 'next/server';
import { fail, guard } from '@/lib/auth';
import { createHash } from 'crypto';
import { gemini } from '@/lib/gemini';
import { BACKDROPS, EFFECTS, PRIMITIVES, legacyMotion, normalizeAnim } from '@/lib/animation';
import type { RecognizeResult } from '@/lib/types';
export const runtime = 'nodejs';
export const maxDuration = 60;
const cache = new Map<string, RecognizeResult>();

const SCHEMA = `Return ONLY JSON: {"labels":[{"name":string,"confidence":0-1}] (max 3, best first; if unsure include alternative interpretations),
"intent":string (semantic intent, e.g. "Space Exploration"),"context":string (one line),
"keywords":string[] (4-8 expanded stock-footage search phrases, e.g. "rocket launch","spacecraft","orbit"),
"visualDirection":string (one line: what the visuals should show),"wikiTitle":string (English Wikipedia article title),
"anim":{"primitives":[{"type":one of ${JSON.stringify(PRIMITIVES)},"speed":0.5-2,"amount":0.5-2}] (1-3 primitives composed to match how this concept naturally moves: rocket=launch, tree=grow+sway, car=drive, ocean=wave),
"backdrop":one of ${JSON.stringify(BACKDROPS)},"effects":subset of ${JSON.stringify(EFFECTS)},"emoji":one emoji depicting the concept,
"svg":null or a simple flat icon of the concept as <svg viewBox="0 0 100 100"> using only path/circle/ellipse/rect/line/polygon/g (stroke #fed7aa, warm orange/pink fills, max 12 shapes, no text)}}`;

function validate(x: any): RecognizeResult {
  if (!x || !Array.isArray(x.labels) || !x.labels.length) throw new Error('labels missing');
  const labels = x.labels.slice(0, 3).map((l: any) => ({ name: String(l.name), confidence: Math.max(0, Math.min(1, Number(l.confidence) || 0)) }));
  const intent = String(x.intent ?? '');
  const anim = normalizeAnim(x.anim, `${labels[0].name} ${intent}`);
  return {
    labels, intent, context: String(x.context ?? ''),
    keywords: Array.isArray(x.keywords) ? x.keywords.map(String).slice(0, 8) : [],
    visualDirection: String(x.visualDirection ?? ''), wikiTitle: String(x.wikiTitle ?? labels[0].name),
    motion: legacyMotion(anim), confident: labels[0].confidence >= 0.6, anim,
  };
}

export async function POST(req: Request) {
  const g = guard(req); if (g) return g;
  const { image, text } = await req.json();
  const img = String(image || '');
  if (img.length > 2_000_000) return NextResponse.json({ error: 'image too large' }, { status: 413 });
  const b64 = img.split(',')[1];
  const t = String(text || '').trim().slice(0, 500);
  if (!b64 && !t) return NextResponse.json({ error: 'input missing' }, { status: 400 });
  const h = createHash('sha1').update(b64 || t).digest('hex');
  const hit = cache.get(h);
  if (hit) return NextResponse.json(hit);
  try {
    const parts = b64
      ? [{ text: 'You see a rough hand-drawn sketch (white lines on black). Interpret it semantically (what it is AND what it represents/does), not just an object label. ' + SCHEMA }, { inline_data: { mime_type: 'image/png', data: b64 } }]
      : [{ text: `A video creator's idea: "${t}". Extract the core concrete visual subject (not the whole sentence) and what it represents. ` + SCHEMA }];
    const result = validate(JSON.parse(await gemini(parts, true, 0.2)));
    cache.set(h, result);
    return NextResponse.json(result);
  } catch (e: any) {
    return fail(e);
  }
}
