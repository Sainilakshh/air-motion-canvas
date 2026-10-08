export async function gemini(parts: any[], json = true, temperature = 0.4): Promise<string> {
  const key = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL;
  if (!key || !model) throw new Error('.env.local mein GEMINI_API_KEY aur GEMINI_MODEL bharo');
  const call = () => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature, ...(json ? { responseMimeType: 'application/json' } : {}) } }),
    signal: AbortSignal.timeout(30000),
  });
  let r = await call();
  if (r.status === 429 || r.status >= 500) { await new Promise((x) => setTimeout(x, 800)); r = await call(); }  // ek retry
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || 'Gemini ' + r.status);
  return String(d.candidates?.[0]?.content?.parts?.[0]?.text ?? '').replace(/```json|```/g, '').trim();
}
