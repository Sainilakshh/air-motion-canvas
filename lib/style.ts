// Script ki bhasha aur tone. Server (prompts) aur client (selectors) dono use karte hain.
export type Lang = 'auto' | 'hinglish' | 'hi' | 'en';
export type Tone = 'auto' | 'casual' | 'energetic' | 'serious' | 'funny' | 'storytelling';
export const LANGS: { key: Lang; label: string }[] = [{ key: 'auto', label: 'Language: as typed' }, { key: 'hinglish', label: 'Hinglish' }, { key: 'hi', label: 'हिन्दी' }, { key: 'en', label: 'English' }];
export const TONES: { key: Tone; label: string }[] = [{ key: 'auto', label: 'Tone: auto' }, { key: 'casual', label: 'Casual' }, { key: 'energetic', label: 'Energetic' }, { key: 'serious', label: 'Serious' }, { key: 'funny', label: 'Funny' }, { key: 'storytelling', label: 'Storytelling' }];
export const asLang = (x: any): Lang => (LANGS.some((l) => l.key === x) ? x : 'auto');
export const asTone = (x: any): Tone => (TONES.some((t) => t.key === x) ? x : 'auto');

const L: Record<Exclude<Lang, 'auto'>, string> = {
  hinglish: 'LANGUAGE: Hinglish, i.e. Hindi written in ROMAN letters (never Devanagari), mixing everyday English words the way Indian creators talk on Reels, e.g. "Rocket itna mehenga kyun hota hai?". Hooks, titles and script lines must all be Hinglish.',
  hi: 'LANGUAGE: simple spoken Hindi in Devanagari script (common English words like "rocket" or "engine" are fine). Hooks, titles and script lines must all be Hindi.',
  en: 'LANGUAGE: clear spoken English, even if the idea was typed in another language.',
};
const T: Record<Exclude<Tone, 'auto'>, string> = {
  casual: 'TONE: relaxed, friendly, like talking to a friend.', energetic: 'TONE: high energy, punchy, fast, exciting.',
  serious: 'TONE: calm, credible, no jokes, explainer style.', funny: 'TONE: light humour and playful comparisons, never at anyone\'s expense.',
  storytelling: 'TONE: narrative, builds curiosity step by step, like telling a story.',
};
export function styleRule(lang: Lang, tone: Tone): string {
  const out: string[] = [];
  if (lang !== 'auto') out.push(L[lang]); if (tone !== 'auto') out.push(T[tone]);
  if (!out.length) return '';
  return '\n' + out.join(' ') + ' This overrides any earlier language instruction. Keep "keywords", "motion" and "svg" fields in English.';
}
export const speechLang = (lang: Lang, text: string) => (lang === 'hi' || lang === 'hinglish' || /[ऀ-ॿ]/.test(text) ? 'hi-IN' : 'en-IN');
