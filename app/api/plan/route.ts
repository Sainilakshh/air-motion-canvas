import { NextResponse } from 'next/server';
import { fail, guard } from '@/lib/auth';
import { createHash } from 'crypto';
import { geminiJson } from '@/lib/gemini';
import { SHOT_JSON, toShot } from '@/lib/shotSchema';
export const runtime = 'nodejs';
export const maxDuration = 60;
const cache = new Map<string, any>();

export async function POST(req: Request) {
  const g = guard(req); if (g) return g;
  const { idea, understanding: u, facts, platform, aspect, targetSeconds, shotMin = 3, shotMax = 4 } = await req.json();
  const h = createHash('sha1').update(JSON.stringify([idea, u?.labels?.[0]?.name, facts, platform, targetSeconds, shotMin, shotMax])).digest('hex');
  if (cache.has(h)) return NextResponse.json(cache.get(h));
  const prompt = `Creator idea: "${String(idea).slice(0, 500)}". Concept: ${u?.labels?.[0]?.name} (${u?.intent}; ${u?.context}).
Facts (use ONLY these for factual claims, else leave fact empty): ${facts || 'none'}
Platform: ${platform} (${aspect}). Make ${shotMin} to ${shotMax} shots whose durations add up to about ${targetSeconds} seconds, with pacing suited to the platform (shorter shots for vertical short-form). Write in the same language as the idea. Return ONLY JSON:
{"hooks":[{"style":"Curiosity","text":string},{"style":"Question","text":string},{"style":"Shock/Stat","text":string},{"style":"Storytelling","text":string}],
"shots":[${SHOT_JSON}]}
Shots should tell a story (e.g. launch -> engine -> Earth from orbit -> cost/scale). Shock/Stat hook must not invent numbers beyond the facts.`;
  try {
    const p = await geminiJson([{ text: prompt }], 0.6, 'plan');
    if (!Array.isArray(p.shots) || !p.shots.length) throw new Error('plan invalid');
    const out = {
      hooks: (p.hooks || []).slice(0, 4).map((x: any) => ({ style: String(x.style), text: String(x.text) })),
      shots: p.shots.slice(0, Number(shotMax) || 4).map((s: any) => toShot(s, u?.labels?.[0]?.name)),
    };
    cache.set(h, out);
    return NextResponse.json(out);
  } catch (e: any) {
    return fail(e);
  }
}
