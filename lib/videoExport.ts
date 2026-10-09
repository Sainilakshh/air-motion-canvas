import type { Shot } from './types';

export type Progress = { phase: 'load' | 'render'; pct: number; note?: string };
type Media = { video?: HTMLVideoElement; img?: HTMLImageElement; sketch?: HTMLImageElement; still?: boolean };
const BD: Record<string, [string, string]> = { space: ['#2a1740', '#050407'], sky: ['#170f28', '#e0735a'], ocean: ['#07151c', '#0e4a5e'], ground: ['#0f0b14', '#17110d'], sun: ['#7a3a12', '#0a0908'], night: ['#1d1411', '#0a0908'], none: ['#0a0908', '#0a0908'] };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Pehle seedha (CORS) try, nahi to apne /api/media proxy se: dono same-origin blob dete hain, canvas taint nahi hota.
async function blobUrl(url: string, headers: Record<string, string>): Promise<string> {
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  try { const r = await fetch(url, { mode: 'cors' }); if (r.ok) return URL.createObjectURL(await r.blob()); } catch {}
  const r = await fetch('/api/media?u=' + encodeURIComponent(url), { headers });
  if (!r.ok) throw new Error('media ' + r.status);
  return URL.createObjectURL(await r.blob());
}
const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('img')); i.src = src; });
const loadVideo = (src: string) => new Promise<HTMLVideoElement>((res, rej) => {
  const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
  const t = setTimeout(() => rej(new Error('video timeout')), 12000);
  v.onloadeddata = () => { clearTimeout(t); res(v); }; v.onerror = () => { clearTimeout(t); rej(new Error('video')); }; v.src = src;
});

function cover(ctx: CanvasRenderingContext2D, el: CanvasImageSource, sw: number, sh: number, w: number, h: number, zoom = 1) {
  if (!sw || !sh) return;
  const s = Math.max(w / sw, h / sh) * zoom, dw = sw * s, dh = sh * s;
  ctx.drawImage(el, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function fallbackScene(ctx: CanvasRenderingContext2D, s: Shot, t: number, w: number, h: number, sketch?: HTMLImageElement) {
  const [a, b] = BD[s.anim.backdrop] || BD.night;
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  if (s.anim.effects.includes('stars') || s.anim.backdrop === 'space') {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) { const x = ((i * 97) % 100) / 100 * w, y = ((i * 53) % 100) / 100 * h; ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.2 + i)); ctx.fillRect(x, y, 2, 2); }
    ctx.globalAlpha = 1;
  }
  const lead = s.anim.primitives[0]?.type || 'float', p = (t % 3.5) / 3.5;
  let dx = 0, dy = 0, rot = 0, sc = 1;
  switch (lead) {
    case 'bounce': dy = -Math.abs(Math.sin(t * 3)) * h * 0.12; break;
    case 'spin': rot = t * 0.7; break;
    case 'pulse': sc = 1 + 0.08 * Math.sin(t * 3.5); break;
    case 'sway': rot = Math.sin(t * 1.8) * 0.08; break;
    case 'launch': dy = h * 0.18 - p * h * 0.5; sc = 0.9 + p * 0.25; break;
    case 'drive': dx = (p - 0.5) * w * 0.9; break;
    case 'wave': dy = Math.sin(t * 2.4) * h * 0.02; rot = Math.sin(t * 2.4) * 0.05; break;
    case 'grow': sc = 0.2 + 0.8 * Math.min(1, p * 1.4); break;
    default: dy = Math.sin(t * 1.6) * h * 0.025; dx = Math.sin(t * 0.8) * w * 0.015;
  }
  ctx.save(); ctx.translate(w / 2 + dx, h * 0.42 + dy); ctx.rotate(rot); ctx.scale(sc, sc);
  if (sketch) { ctx.globalCompositeOperation = 'screen'; const k = Math.min(w, h) * 0.6 / Math.max(sketch.width, sketch.height); ctx.drawImage(sketch, -sketch.width * k / 2, -sketch.height * k / 2, sketch.width * k, sketch.height * k); ctx.globalCompositeOperation = 'source-over'; }
  else { ctx.font = `${Math.min(w, h) * 0.34}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(255,106,77,.55)'; ctx.shadowBlur = 40; ctx.fillText(s.anim.emoji || '✨', 0, 0); }
  ctx.restore();
}

function caption(ctx: CanvasRenderingContext2D, line: string, prog: number, w: number, h: number) {
  const words = line.trim().split(/\s+/).filter(Boolean); if (!words.length) return;
  const fs = Math.round(Math.min(w, h) * (w < h ? 0.06 : 0.05)), maxW = w * 0.84, lh = fs * 1.3;
  ctx.font = `700 ${fs}px "Inter","Noto Sans Devanagari","Segoe UI",Arial,sans-serif`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const lines: { w: string; x: number }[][] = [[]]; let x = 0; const sp = ctx.measureText(' ').width;
  for (const wd of words) { const ww = ctx.measureText(wd).width; if (x + ww > maxW && lines[lines.length - 1].length) { lines.push([]); x = 0; } lines[lines.length - 1].push({ w: wd, x }); x += ww + sp; }
  const top = h - h * 0.1 - lines.length * lh, g = ctx.createLinearGradient(0, top - fs * 2, 0, h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.82)');
  ctx.fillStyle = g; ctx.fillRect(0, top - fs * 2, w, h - top + fs * 2);
  const on = Math.min(words.length, Math.floor(prog * words.length * 1.02) + 1); let k = 0;
  ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 10;
  lines.forEach((ln, li) => { const lw = ln.length ? ln[ln.length - 1].x + ctx.measureText(ln[ln.length - 1].w).width : 0; const ox = (w - lw) / 2;
    ln.forEach((it) => { ctx.fillStyle = k++ < on ? '#fff' : 'rgba(255,255,255,.4)'; ctx.fillText(it.w, ox + it.x, top + li * lh + fs); }); });
  ctx.shadowBlur = 0;
}

export async function exportVideo(o: { shots: Shot[]; w: number; h: number; sketchFor: (s: Shot) => string | undefined; headers: Record<string, string>; onProgress: (p: Progress) => void; signal: AbortSignal }): Promise<{ blob: Blob; ext: string; fallbacks: number }> {
  const { shots, w, h, onProgress, signal } = o;
  if (typeof MediaRecorder === 'undefined') throw new Error('This browser cannot record video. Use Chrome, Edge or Firefox.');
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error('No supported video format in this browser.');
  const urls: string[] = []; let fallbacks = 0;
  const media: Media[] = [];
  for (let i = 0; i < shots.length; i++) {
    if (signal.aborted) throw new Error('cancelled');
    onProgress({ phase: 'load', pct: i / shots.length, note: `Loading clip ${i + 1} of ${shots.length}` });
    const s = shots[i], m: Media = {}, b = s.broll;
    const sk = o.sketchFor(s); if (sk) { try { m.sketch = await loadImg(sk); } catch {} }
    if (b) {
      let done = false;
      if (b.preview) { try { const u = await blobUrl(b.preview, o.headers); urls.push(u); m.video = await loadVideo(u); done = true; } catch {} }
      if (!done && b.thumb) { try { const u = await blobUrl(b.thumb, o.headers); urls.push(u); m.img = await loadImg(u); m.still = true; if (b.preview) fallbacks++; done = true; } catch {} }
      if (!done) fallbacks++;
    }
    media.push(m);
  }
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d')!; const stream = cv.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 }); const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const starts: number[] = []; let total = 0;
  shots.forEach((s) => { starts.push(total); total += Math.max(1, Number(s.duration) || 1); });
  const stopped = new Promise<void>((r) => { rec.onstop = () => r(); });
  rec.start(250);
  let cur = -1; const t0 = performance.now();
  await new Promise<void>((resolve, reject) => {
    const tick = () => {
      if (signal.aborted) { reject(new Error('cancelled')); return; }
      const t = (performance.now() - t0) / 1000;
      if (t >= total) { resolve(); return; }
      let i = starts.findIndex((st, k) => t >= st && (k === starts.length - 1 || t < starts[k + 1]));
      if (i < 0) i = shots.length - 1;
      if (i !== cur) { if (cur >= 0) media[cur].video?.pause(); cur = i; const v = media[i].video; if (v) { try { v.currentTime = 0; void v.play(); } catch {} } }
      const s = shots[i], lt = t - starts[i], d = Math.max(1, Number(s.duration) || 1), m = media[i];
      ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
      if (m.video && m.video.videoWidth) cover(ctx, m.video, m.video.videoWidth, m.video.videoHeight, w, h);
      else if (m.img) cover(ctx, m.img, m.img.naturalWidth, m.img.naturalHeight, w, h, 1 + 0.1 * Math.min(1, lt / d));   // photo par slow zoom
      else fallbackScene(ctx, s, lt, w, h, m.sketch);
      caption(ctx, s.line || '', lt / d, w, h);
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(0, h - 5, w * (t / total), 5);
      if (lt < 0.2 && i > 0) { ctx.fillStyle = `rgba(0,0,0,${1 - lt / 0.2})`; ctx.fillRect(0, 0, w, h); }
      onProgress({ phase: 'render', pct: t / total, note: `Rendering ${Math.floor(t)}s / ${Math.round(total)}s — keep this tab open` });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }).finally(() => { media.forEach((m) => m.video?.pause()); rec.state !== 'inactive' && rec.stop(); });
  await stopped; urls.forEach((u) => u.startsWith('blob:') && URL.revokeObjectURL(u));
  return { blob: new Blob(chunks, { type: mime.split(';')[0] }), ext: mime.startsWith('video/mp4') ? 'mp4' : 'webm', fallbacks };
}
