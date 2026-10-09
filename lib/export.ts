import type { Shot } from './types';

const pad = (n: number, l = 2) => String(n).padStart(l, '0');
export const stamp = (sec: number) => { const ms = Math.round(sec * 1000); return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`; };
const wrap = (t: string, max = 38) => {   // 2 lines tak balanced wrap
  const w = t.split(/\s+/); if (t.length <= max) return t;
  let best = 0, bd = 1e9, acc = 0;
  w.forEach((x, i) => { acc += x.length + 1; if (i < w.length - 1) { const d = Math.abs(acc - (t.length - acc)); if (d < bd) { bd = d; best = i; } } });
  return w.slice(0, best + 1).join(' ') + '\n' + w.slice(best + 1).join(' ');
};

// Har shot ki line us shot ki duration ke andar; lambi line chhote cues (<=9 words) mein tootti hai, words ke hisaab se timing.
export function toSrt(shots: Shot[]): string {
  let t = 0, n = 1, out = '';
  for (const s of shots) {
    const d = Math.max(0.5, Number(s.duration) || 0), words = (s.line || '').trim().split(/\s+/).filter(Boolean);
    if (words.length) {
      const k = Math.ceil(words.length / 9), per = Math.ceil(words.length / k);
      for (let i = 0; i < k; i++) {
        const chunk = words.slice(i * per, (i + 1) * per); if (!chunk.length) continue;
        const a = t + (d * (i * per)) / words.length, b = t + (d * Math.min(words.length, (i + 1) * per)) / words.length - 0.05;
        out += `${n++}\n${stamp(a)} --> ${stamp(Math.max(a + 0.4, b))}\n${wrap(chunk.join(' '))}\n\n`;
      }
    }
    t += d;
  }
  return out;
}

const q = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
export function toCsv(shots: Shot[]): string {
  let t = 0;
  const head = ['shot', 'start_s', 'end_s', 'duration_s', 'title', 'script', 'visual', 'footage_link', 'footage_credit', 'search_keywords'];
  const rows = shots.map((s, i) => {
    const a = t, d = Number(s.duration) || 0; t += d;
    const link = s.broll && !s.broll.link.startsWith('blob:') ? s.broll.link : '';
    return [i + 1, a, a + d, d, s.title, s.line, s.visual, link, s.broll?.credit || '', s.keywords.join(' | ')].map(q).join(',');
  });
  return '﻿' + head.join(',') + '\n' + rows.join('\n');   // BOM: Excel mein Hindi sahi dikhe
}

export function download(name: string, data: Blob | string, type = 'text/plain;charset=utf-8') {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
export const slug = (s: string) => (s || 'storyboard').toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'storyboard';
