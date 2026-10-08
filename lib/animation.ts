import type { AnimSpec, Backdrop, Effect, Primitive, PrimitiveName } from './types';

// Ye primitives sirf internal building blocks hain. AI concept ke hisaab se inhe compose karta hai.
export const PRIMITIVES: PrimitiveName[] = ['float', 'bounce', 'spin', 'pulse', 'sway', 'grow', 'launch', 'drive', 'wave', 'orbit', 'shake', 'fall', 'zoom', 'flicker', 'draw'];
export const BACKDROPS: Backdrop[] = ['space', 'sky', 'ocean', 'ground', 'sun', 'night', 'none'];
export const EFFECTS: Effect[] = ['sparkles', 'trail', 'rays', 'bubbles', 'stars', 'smoke'];
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

type Rule = { re: RegExp; emoji: string; primitives: Primitive[]; backdrop: Backdrop; effects: Effect[] };
const RULES: Rule[] = [
  { re: /rocket|launch|spacecraft|spaceship|shuttle|missile/i, emoji: '🚀', primitives: [{ type: 'launch' }], backdrop: 'space', effects: ['trail', 'stars'] },
  { re: /earth|planet|globe|world|orbit/i, emoji: '🌍', primitives: [{ type: 'spin', speed: 0.5 }], backdrop: 'space', effects: ['stars'] },
  { re: /\bmoon\b|galaxy|universe|\bstars?\b|cosmos/i, emoji: '🌙', primitives: [{ type: 'float' }, { type: 'pulse', amount: 0.5 }], backdrop: 'space', effects: ['stars', 'sparkles'] },
  { re: /solar|\bsun\b|sunlight|energy|electric|power|light/i, emoji: '☀️', primitives: [{ type: 'pulse' }, { type: 'spin', speed: 0.3 }], backdrop: 'sun', effects: ['rays', 'sparkles'] },
  { re: /\btrees?\b|plant|forest|grow|seed|leaf|leaves|flower/i, emoji: '🌳', primitives: [{ type: 'grow' }, { type: 'sway', amount: 0.6 }], backdrop: 'sky', effects: ['sparkles'] },
  { re: /\bcars?\b|driv|truck|vehicle|\broad\b|traffic|\bbus\b/i, emoji: '🚗', primitives: [{ type: 'drive' }, { type: 'bounce', amount: 0.12, speed: 2 }], backdrop: 'ground', effects: ['smoke'] },
  { re: /plane|aircraft|flight|flying|\bfly\b|bird/i, emoji: '✈️', primitives: [{ type: 'drive', speed: 1.2 }, { type: 'float' }], backdrop: 'sky', effects: ['trail'] },
  { re: /train|bike|bicycle|motorcycle/i, emoji: '🚆', primitives: [{ type: 'drive' }, { type: 'shake', amount: 0.3 }], backdrop: 'ground', effects: [] },
  { re: /ocean|\bsea\b|water|wave|river|surf|tide|flood|swim/i, emoji: '🌊', primitives: [{ type: 'wave' }], backdrop: 'ocean', effects: ['bubbles'] },
  { re: /rain|storm|cloud|weather|snow/i, emoji: '🌧️', primitives: [{ type: 'float' }, { type: 'flicker', amount: 0.5 }], backdrop: 'night', effects: ['sparkles'] },
  { re: /\bball\b|bounce|football|soccer|basketball|cricket/i, emoji: '⚽', primitives: [{ type: 'bounce' }], backdrop: 'ground', effects: ['sparkles'] },
  { re: /house|\bhome\b|building|city|architecture|apartment/i, emoji: '🏠', primitives: [{ type: 'pulse', amount: 0.5 }, { type: 'sway', amount: 0.3 }], backdrop: 'sky', effects: ['sparkles'] },
  { re: /fire|flame|burn|explosion|heat/i, emoji: '🔥', primitives: [{ type: 'flicker' }, { type: 'pulse', speed: 1.5 }], backdrop: 'night', effects: ['smoke', 'sparkles'] },
  { re: /money|cost|price|expensive|cash|econom|budget|invest|dollar/i, emoji: '💰', primitives: [{ type: 'bounce', amount: 0.6 }, { type: 'pulse', amount: 0.5 }], backdrop: 'night', effects: ['sparkles'] },
  { re: /brain|mind|think|idea|\bai\b|learn|knowledge|memory/i, emoji: '🧠', primitives: [{ type: 'pulse' }, { type: 'float' }], backdrop: 'night', effects: ['sparkles'] },
  { re: /heart|love|health|life/i, emoji: '❤️', primitives: [{ type: 'pulse', speed: 1.4 }], backdrop: 'night', effects: ['sparkles'] },
  { re: /atom|dna|science|chemistry|physics|molecule|lab/i, emoji: '⚛️', primitives: [{ type: 'spin', speed: 0.8 }, { type: 'pulse', amount: 0.4 }], backdrop: 'night', effects: ['sparkles'] },
  { re: /robot|machine|tech|computer|code|software|engine|phone|battery/i, emoji: '🤖', primitives: [{ type: 'float' }, { type: 'shake', amount: 0.2 }], backdrop: 'night', effects: ['sparkles'] },
];
const DEFAULT: Rule = { re: /./, emoji: '✨', primitives: [{ type: 'float' }, { type: 'pulse', amount: 0.6 }], backdrop: 'night', effects: ['sparkles'] };

// Graceful fallback: jab AI na ho ya concept unknown ho, keyword se animation + emoji chuno
export function heuristicAnim(text: string): AnimSpec {
  const r = RULES.find((x) => x.re.test(text)) || DEFAULT;
  return { primitives: r.primitives.map((p) => ({ ...p })), backdrop: r.backdrop, effects: [...r.effects], emoji: r.emoji };
}

const TAGS = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'defs', 'lineargradient', 'radialgradient', 'stop']);
const ATTRS = new Set(['viewbox', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform', 'offset', 'stop-color', 'stop-opacity', 'id', 'gradientunits', 'gradienttransform', 'fx', 'fy']);
// AI ka SVG inline render hota hai, isliye strict whitelist (no script/style/href/foreignObject/on*)
export function sanitizeSvg(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const s = raw.trim();
  if (s.length < 20 || s.length > 8000 || !/^<svg[\s>]/i.test(s)) return '';
  let out = '';
  for (const t of s.match(/<[^<>]+>/g) || []) {
    const m = t.match(/^<\/?\s*([a-zA-Z]+)/);
    if (!m) continue;
    const name = m[1].toLowerCase();
    if (!TAGS.has(name)) continue;
    const canon = name === 'lineargradient' ? 'linearGradient' : name === 'radialgradient' ? 'radialGradient' : name;
    if (t.startsWith('</')) { out += `</${canon}>`; continue; }
    const attrs: Record<string, string> = {};
    for (const a of t.matchAll(/([a-zA-Z:-]+)\s*=\s*"([^"]*)"/g)) {
      const k = a[1], v = a[2];
      if (!ATTRS.has(k.toLowerCase())) continue;
      if (/javascript|[<>]|expression|@import/i.test(v)) continue;
      if (/url\(/i.test(v) && !/^url\(#[\w-]+\)$/.test(v.trim())) continue;
      attrs[k] = v;
    }
    if (name === 'svg') { out += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(attrs.viewBox || '0 0 100 100').replace(/[^0-9 .\-,]/g, '')}" width="100%" height="100%">`; continue; }
    const attrStr = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    out += `<${canon}${attrStr ? ' ' + attrStr : ''}${/\/\s*>$/.test(t) ? '/' : ''}>`;
  }
  if (!out.startsWith('<svg')) return '';
  return out.endsWith('</svg>') ? out : out + '</svg>';
}

// AI ka output validate karke safe AnimSpec banata hai. Kuch bhi galat ho to heuristic fallback.
export function normalizeAnim(x: any, hint: string): AnimSpec {
  const h = heuristicAnim(hint);
  if (!x || typeof x !== 'object') return h;
  const seen = new Set<string>();
  const prims: Primitive[] = (Array.isArray(x.primitives) ? x.primitives : [])
    .map((p: any) => (typeof p === 'string' ? { type: p } : p))
    .filter((p: any) => p && PRIMITIVES.includes(p.type) && !seen.has(p.type) && seen.add(p.type))
    .slice(0, 3)
    .map((p: any) => ({ type: p.type as PrimitiveName, speed: clamp(Number(p.speed) || 1, 0.4, 2.5), amount: clamp(Number(p.amount) || 1, 0.1, 2) }));
  const effects = Array.isArray(x.effects) ? (x.effects.filter((e: any) => EFFECTS.includes(e)).slice(0, 3) as Effect[]) : h.effects;
  const emoji = typeof x.emoji === 'string' ? Array.from(x.emoji.trim()).slice(0, 4).join('') : '';
  return {
    primitives: prims.length ? prims : h.primitives,
    backdrop: BACKDROPS.includes(x.backdrop) ? x.backdrop : h.backdrop,
    effects,
    emoji: emoji && !/^[\x00-\x7F]+$/.test(emoji) ? emoji : h.emoji,
    svg: sanitizeSvg(x.svg) || undefined,
  };
}

// AirCanvas ke live stroke preview ke liye purana motion naam
export const legacyMotion = (a: AnimSpec) => {
  const t = a.primitives[0]?.type;
  return t === 'bounce' || t === 'spin' || t === 'pulse' ? t : 'float';
};
