import { NextResponse } from 'next/server';
import { fail, guard } from '@/lib/auth';
import { geminiJson } from '@/lib/gemini';
import { asLang, asTone, styleRule } from '@/lib/style';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const g = guard(req); if (g) return g;
  const { idea, concept, hook, facts, shots, lang, tone } = await req.json();
  if (!Array.isArray(shots) || !shots.length) return NextResponse.json({ error: 'shots missing' }, { status: 400 });
  const prompt = `Idea: "${String(idea).slice(0, 500)}". Concept: ${concept || ''}. Selected hook: "${hook}". Facts (only source for factual claims): ${facts || 'none'}
Shots (in order, with seconds): ${JSON.stringify(shots)}
Write ONE script line per shot, same language as the idea. Rules: spoken, conversational voice (like a creator talking to camera); about 2.5 spoken words per second of that shot's duration (never longer); one clear idea per shot; concrete words, no filler or clichés, no emojis or hashtags; do not repeat the fact word for word, make it vivid; vary how lines start; the first line opens with the selected hook, the last line lands a payoff or takeaway. Do not invent facts.
Return ONLY a JSON array of exactly ${shots.length} strings.${styleRule(asLang(lang), asTone(tone))}`;
  try {
    const lines = await geminiJson([{ text: prompt }], 0.6, 'script');
    if (!Array.isArray(lines) || lines.length !== shots.length) throw new Error('script invalid');
    return NextResponse.json({ lines: lines.map(String) });
  } catch (e: any) {
    return fail(e);
  }
}
