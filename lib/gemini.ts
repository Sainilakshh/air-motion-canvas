export class GeminiError extends Error {
  code: string; status: number;
  constructor(code: string, message: string, status = 0) { super(message); this.code = code; this.status = status; }
}
// Vercel env mein aksar quotes / spaces / "models/" prefix chala jaata hai: sab saaf karte hain.
const clean = (v?: string) => (v || '').trim().replace(/^['"]+|['"]+$/g, '').trim();

// Configured model galat/unavailable ho (404/429/503/timeout) to in safe models ko try karte hain.
const FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.5-flash'];
let working = '';   // jo model chal gaya, usse is server instance par yaad rakhte hain
let noThink = false; // agar model thinkingConfig reject kare to dobara nahi bhejte
const BUDGET = 50000; // Vercel function limit (60s) se pehle khatam

export async function gemini(parts: any[], json = true, temperature = 0.4): Promise<string> {
  const key = clean(process.env.GEMINI_API_KEY);
  const configured = clean(process.env.GEMINI_MODEL).replace(/^models\//, '');
  if (!key) throw new GeminiError('NO_KEY', 'GEMINI_API_KEY missing');
  const candidates = Array.from(new Set([working, configured, ...FALLBACK_MODELS].filter(Boolean)));
  const started = Date.now();
  // JSON structuring ko deep thinking nahi chahiye: low thinking se jawab kaafi tez aata hai
  const call = (model: string, think: boolean) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature, ...(json ? { responseMimeType: 'application/json' } : {}), ...(think ? { thinkingConfig: { thinkingLevel: 'low' } } : {}) } }),
    signal: AbortSignal.timeout(Math.max(3000, Math.min(25000, BUDGET - (Date.now() - started)))),
  });
  let r: Response | undefined, used = '';
  for (const model of candidates) {
    try {
      r = await call(model, !noThink);
      if (r.status === 400 && !noThink && /think/i.test(await r.clone().text())) { noThink = true; r = await call(model, false); }
      if (r.status === 429 || r.status >= 500) { await new Promise((x) => setTimeout(x, 800)); r = await call(model, !noThink); }  // ek retry
    } catch (e: any) {
      if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {  // slow model: agla try karo (budget bacha ho to)
        console.warn('[gemini] timeout:', model); r = undefined;
        if (Date.now() - started > BUDGET - 4000) break;
        continue;
      }
      throw new GeminiError('NETWORK', e?.message || 'network error');
    }
    used = model;
    if (![404, 429, 503].includes(r.status)) break;  // 404 = model nahi mila, 429/503 = quota ya overload: agla model try karo
    console.warn('[gemini] model unavailable (' + r.status + '):', model);
  }
  if (!r) throw new GeminiError('TIMEOUT', 'Gemini did not answer in time');
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = d?.error?.message || 'Gemini ' + r.status;
    const code = r.status === 429 ? 'QUOTA' : r.status === 404 ? 'NOT_FOUND' : r.status === 401 || r.status === 403 || /api key/i.test(msg) ? 'BAD_KEY' : r.status >= 500 ? 'UPSTREAM' : 'REQUEST';
    throw new GeminiError(code, msg, r.status);
  }
  if (used !== working) { working = used; if (used !== configured) console.warn(`[gemini] using "${used}" because GEMINI_MODEL "${configured}" did not work`); }
  const text = String((d.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('')).replace(/```json|```/g, '').trim();
  if (!text) throw new GeminiError('EMPTY', 'empty answer: ' + (d.candidates?.[0]?.finishReason || d.promptFeedback?.blockReason || 'unknown'));
  if (!json) return text;
  const m = text.match(/[\[{][\s\S]*[\]}]/);  // extra text ke beech se JSON nikaalo
  return m ? m[0] : text;
}

// Gemini ke JSON mein kabhi trailing text, raw newline, trailing comma ya cut-off aa jaata hai: use theek karke parse karo.
export function parseLooseJson(text: string): any {
  try { return JSON.parse(text); } catch {}
  const start = text.search(/[\[{]/);
  if (start < 0) throw new SyntaxError('no json found');
  let out = '', inStr = false, esc = false;
  const stack: string[] = [];
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) { esc = false; out += c; }
      else if (c === '\\') { esc = true; out += c; }
      else if (c === '"') { inStr = false; out += c; }
      else if (c === '\n') out += '\\n';
      else if (c === '\r') out += '';
      else if (c === '\t') out += '\\t';
      else out += c;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') stack.push('}');
    else if (c === '[') stack.push(']');
    else if (c === '}' || c === ']') { stack.pop(); out += c; if (!stack.length) break; continue; }
    out += c;
  }
  if (inStr) out += '"';  // cut-off string band karo
  out = out.replace(/,\s*([}\]])/g, '$1').replace(/,\s*$/, '');
  out += stack.reverse().join('');  // cut-off hone par khule brackets band karo
  return JSON.parse(out);
}

// JSON jawab: parse fail ho to ek baar aur maangta hai (chhote, compact jawab ke saath).
export async function geminiJson(parts: any[], temperature = 0.4, label = 'json'): Promise<any> {
  const first = await gemini(parts, true, temperature);
  try { return parseLooseJson(first); } catch {
    console.error(`[${label}] bad json (will retry), head:`, first.slice(0, 300), '| tail:', first.slice(-120));
  }
  const retry = [...parts];
  const i = retry.findIndex((p) => typeof p.text === 'string');
  if (i >= 0) retry[i] = { text: retry[i].text + '\n\nIMPORTANT: your previous answer was not valid JSON. Return ONE compact, valid JSON value only. Escape quotes inside strings. If an "svg" field exists, set it to null.' };
  const second = await gemini(retry, true, Math.min(temperature, 0.2));
  try { return parseLooseJson(second); } catch {
    console.error(`[${label}] bad json again, head:`, second.slice(0, 300));
    throw new GeminiError('BAD_JSON', 'AI returned invalid JSON');
  }
}
