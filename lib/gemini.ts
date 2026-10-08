export class GeminiError extends Error {
  code: string; status: number;
  constructor(code: string, message: string, status = 0) { super(message); this.code = code; this.status = status; }
}
// Vercel env mein aksar quotes / spaces / "models/" prefix chala jaata hai: sab saaf karte hain.
const clean = (v?: string) => (v || '').trim().replace(/^['"]+|['"]+$/g, '').trim();

export async function gemini(parts: any[], json = true, temperature = 0.4): Promise<string> {
  const key = clean(process.env.GEMINI_API_KEY);
  const model = clean(process.env.GEMINI_MODEL).replace(/^models\//, '');
  if (!key) throw new GeminiError('NO_KEY', 'GEMINI_API_KEY missing');
  if (!model) throw new GeminiError('NO_MODEL', 'GEMINI_MODEL missing');
  const call = () => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature, ...(json ? { responseMimeType: 'application/json' } : {}) } }),
    signal: AbortSignal.timeout(30000),
  });
  let r: Response;
  try {
    r = await call();
    if (r.status === 429 || r.status >= 500) { await new Promise((x) => setTimeout(x, 800)); r = await call(); }  // ek retry
  } catch (e: any) {
    throw new GeminiError(e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK', e?.message || 'network error');
  }
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = d?.error?.message || 'Gemini ' + r.status;
    const code = r.status === 429 ? 'QUOTA' : r.status === 404 ? 'NOT_FOUND' : r.status === 401 || r.status === 403 || /api key/i.test(msg) ? 'BAD_KEY' : r.status >= 500 ? 'UPSTREAM' : 'REQUEST';
    throw new GeminiError(code, msg, r.status);
  }
  const text = String((d.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('')).replace(/```json|```/g, '').trim();
  if (!text) throw new GeminiError('EMPTY', 'empty answer: ' + (d.candidates?.[0]?.finishReason || d.promptFeedback?.blockReason || 'unknown'));
  if (!json) return text;
  const m = text.match(/[\[{][\s\S]*[\]}]/);  // extra text ke beech se JSON nikaalo
  return m ? m[0] : text;
}
