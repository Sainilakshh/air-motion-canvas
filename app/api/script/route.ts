import { NextResponse } from 'next/server';
import { fail, guard } from '@/lib/auth';
import { gemini } from '@/lib/gemini';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const g = guard(req); if (g) return g;
  const { idea, concept, hook, facts, shots } = await req.json();
  if (!Array.isArray(shots) || !shots.length) return NextResponse.json({ error: 'shots missing' }, { status: 400 });
  const prompt = `Idea: "${String(idea).slice(0, 500)}". Concept: ${concept || ''}. Selected hook: "${hook}". Facts (only source for factual claims): ${facts || 'none'}
Shots (in order, with seconds): ${JSON.stringify(shots)}
Write ONE concise, creator-friendly script line per shot (speakable within that shot's duration), same language as the idea. The first line must open with the selected hook. Do not invent facts.
Return ONLY a JSON array of exactly ${shots.length} strings.`;
  try {
    const lines = JSON.parse(await gemini([{ text: prompt }], true, 0.6));
    if (!Array.isArray(lines) || lines.length !== shots.length) throw new Error('script invalid');
    return NextResponse.json({ lines: lines.map(String) });
  } catch (e: any) {
    return fail(e);
  }
}
