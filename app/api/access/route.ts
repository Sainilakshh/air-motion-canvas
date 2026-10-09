import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { gemini } from '@/lib/gemini';
export const runtime = 'nodejs';
export const maxDuration = 60;
let cached: { t: number; v: string } | null = null;
// Studio ye route code check + (deep=1) ek chhota live Gemini test ke liye call karta hai.
export async function GET(req: Request) {
  const locked = guard(req);
  if (locked) return locked;
  const base = { ok: true, ai: !!process.env.GEMINI_API_KEY && !!process.env.GEMINI_MODEL, footage: true };
  if (new URL(req.url).searchParams.get('deep') !== '1') return NextResponse.json(base);
  if (cached && Date.now() - cached.t < 30000) return NextResponse.json({ ...base, aiStatus: cached.v });
  let v = 'ok';
  try { await gemini([{ text: 'Reply with the single word ok.' }], false, 0); } catch (e: any) { v = e?.code || 'ERROR'; console.error('[access] ai check', v, e?.message); }
  cached = { t: Date.now(), v };
  return NextResponse.json({ ...base, aiStatus: v });
}
