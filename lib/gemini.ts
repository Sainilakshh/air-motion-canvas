export class GeminiError extends Error {
  code: string; status: number;
  constructor(code: string, message: string, status = 0) { super(message); this.code = code; this.status = status; }
}
// Vercel env mein aksar quotes / spaces / "models/" prefix chala jaata hai: sab saaf karte hain.
const clean = (v?: string) => (v || '').trim().replace(/^['"]+|['"]+$/g, '').trim();

// Configured model galat/unavailable ho (404) to in safe stable models ko try karte hain.
const FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.5-flash'];
let working = '';  // jo model chal gaya, usse is server instance par yaad rakhte hain

export async function gemini(parts: any[], json = true, temperature = 0.4): Promise<string> {
  const key = clean(process.env.GEMINI_API_KEY);
  const configured = clean(process.env.GEMINI_MODEL).replace(/^models\//, '');
  if (!key) throw new GeminiError('NO_KEY', 'GEMINI_API_KEY missing');
  const candidates = Array.from(new Set([working, configured, ...FALLBACK_MODELS].filter(Boolean)));
  const call = (model: string) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature, ...(json ? { responseMimeType: 'application/json' } : {}) } }),
    signal: AbortSignal.timeout(30000),
  });
  let r: Response | undefined, used = '';
  for (const model of candidates) {
    try {
      r = await call(model);
      if (r.status === 429 || r.status >= 500) { await new Promise((x) => setTimeout(x, 800)); r = await call(model); }  // ek retry
    } catch (e: any) {
      throw new GeminiError(e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK', e?.message || 'network error');
    }
    used = model;
    if (![404, 429, 503].includes(r.status)) break;  // 404 = model nahi mila, 429/503 = quota ya overload: agla model try karo
    console.warn('[gemini] model unavailable (' + r.status + '):', model);
  }
  const d: any = await r!.json().catch(() => ({}));
  if (!r!.ok) {
    const msg = d?.error?.message || 'Gemini ' + r!.status;
    const code = r!.status === 429 ? 'QUOTA' : r!.status === 404 ? 'NOT_FOUND' : r!.status === 401 || r!.status === 403 || /api key/i.test(msg) ? 'BAD_KEY' : r!.status >= 500 ? 'UPSTREAM' : 'REQUEST';
    throw new GeminiError(code, msg, r!.status);
  }
  if (used !== working) { working = used; if (used !== configured) console.warn(`[gemini] using "${used}" because GEMINI_MODEL "${configured}" did not work`); }
  const text = String((d.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('')).replace(/```json|```/g, '').trim();
  if (!text) throw new GeminiError('EMPTY', 'empty answer: ' + (d.candidates?.[0]?.finishReason || d.promptFeedback?.blockReason || 'unknown'));
  if (!json) return text;
  const m = text.match(/[\[{][\s\S]*[\]}]/);  // extra text ke beech se JSON nikaalo
  return m ? m[0] : text;
}
