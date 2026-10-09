import { NextResponse } from 'next/server';
import { fail, guard } from '@/lib/auth';
import { geminiJson } from '@/lib/gemini';
export const runtime = 'nodejs';
export const maxDuration = 60;

type Msg = { role: 'user' | 'ai'; text: string };

// Chat se script badalna: user bolta hai "isko funny karo", "shot 2 chhota karo", "Hinglish mein likho".
// Poora script wapas aata hai; jo user ne nahi bola woh jaisa tha waisa hi rehta hai.
export async function POST(req: Request) {
  const g = guard(req); if (g) return g;
  const { idea, concept, hook, facts, shots, history, instruction } = await req.json();
  const ins = String(instruction || '').trim().slice(0, 600);
  if (!ins) return NextResponse.json({ error: 'instruction missing' }, { status: 400 });
  if (!Array.isArray(shots) || !shots.length || shots.length > 12) return NextResponse.json({ error: 'shots missing' }, { status: 400 });

  const list = shots.map((s: any, i: number) => ({ shot: i + 1, title: String(s.title || '').slice(0, 120), visual: String(s.visual || '').slice(0, 200), seconds: Number(s.seconds) || 5, line: String(s.line || '').slice(0, 600) }));
  const past = (Array.isArray(history) ? (history as Msg[]) : []).slice(-6)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${String(m.text || '').slice(0, 400)}`).join('\n');

  const prompt = `You are a script editor inside a video storyboard tool. The creator is chatting with you to improve the spoken script.
Creator idea: "${String(idea || '').slice(0, 500)}". Concept: ${concept || ''}. Chosen hook: "${hook || 'none'}".
Facts (the ONLY source for factual claims; never invent facts or numbers): ${facts || 'none'}
Current script, one line per shot: ${JSON.stringify(list)}
${past ? `Earlier chat:\n${past}\n` : ''}
The creator now says: "${ins}"

Rules:
- Apply exactly what the creator asked. If they point at specific shots (for example "shot 2" or "the last line"), change only those and return every other line EXACTLY as it is.
- If the request is general (tone, language, length, style), rewrite all lines accordingly.
- Keep the same language and tone as the current script unless the creator asks to change them (for example Hinglish means Hindi in Roman letters, mixed with everyday English words).
- Keep each line spoken and conversational, about 2.5 spoken words per second of that shot's seconds, unless the creator asks for a different length. No emojis or hashtags.
- Keep the first line opening with the chosen hook idea unless the creator asks to change it.
- If the request is unclear or impossible, keep the script unchanged and say so in "reply".
Return ONLY JSON: {"reply": string (one or two short sentences saying what you changed, in the language the creator wrote in), "lines": array of exactly ${shots.length} strings}`;

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const out = await geminiJson([{ text: prompt }], 0.7, 'refine');
      const lines = Array.isArray(out?.lines) ? out.lines : null;
      if (lines && lines.length === shots.length) {
        return NextResponse.json({ reply: String(out.reply || '').slice(0, 400), lines: lines.map(String) });
      }
    }
    throw new Error('refine invalid');
  } catch (e: any) {
    return fail(e);
  }
}
