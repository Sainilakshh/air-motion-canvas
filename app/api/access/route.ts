import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
export const runtime = 'nodejs';
// Studio ye route code check karne ke liye call karta hai (live AI unlocked ya demo mode).
export async function GET(req: Request) {
  const locked = guard(req);
  if (locked) return locked;
  return NextResponse.json({ ok: true, ai: !!process.env.GEMINI_API_KEY && !!process.env.GEMINI_MODEL, footage: !!process.env.PIXABAY_API_KEY });
}
