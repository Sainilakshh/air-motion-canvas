import { NextResponse } from 'next/server';
import { fail, guard } from '@/lib/auth';
import { gemini } from '@/lib/gemini';
import { SHOT_JSON, toShot } from '@/lib/shotSchema';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Ek shot ko regenerate karta hai (baaki storyboard ko touch nahi karta)
export async function POST(req: Request) {
  const g = guard(req); if (g) return g;
  const { idea, concept, facts, hook, platform, shot, others, position } = await req.json();
  const prompt = `Creator idea: "${String(idea).slice(0, 500)}". Main concept: ${concept}. Selected hook: "${hook || 'none yet'}". Platform: ${platform}.
Facts (use ONLY these for factual claims, else leave fact empty): ${facts || 'none'}
Other shots in the storyboard (do not repeat them): ${JSON.stringify(others || [])}
Rewrite shot #${Number(position) + 1} with a fresh angle. Current version: ${JSON.stringify({ title: shot?.title, visual: shot?.visual, line: shot?.line })}. Keep duration near ${shot?.duration || 5}s. Same language as the idea. Return ONLY JSON: ${SHOT_JSON}`;
  try {
    const s = toShot(JSON.parse(await gemini([{ text: prompt }], true, 0.8)), concept);
    return NextResponse.json({ title: s.title, concept: s.concept, visual: s.visual, brollIdea: s.brollIdea, keywords: s.keywords, fact: s.fact, line: s.line, anim: s.anim });
  } catch (e: any) {
    return fail(e);
  }
}
