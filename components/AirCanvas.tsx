'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecognizeResult } from '@/lib/types';

type Pt = { x: number; y: number };
const W = 1280, H = 640;
const INK = '#18181b';

function exportPng(strokes: Pt[][]) {
  const pts = strokes.flat();
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const S = 384, pad = 32, sc = (S - 2 * pad) / Math.max(maxX - minX, maxY - minY, 1);
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  g.strokeStyle = '#fff'; g.lineWidth = 8; g.lineCap = 'round'; g.lineJoin = 'round';
  const ox = (S - (maxX - minX) * sc) / 2, oy = (S - (maxY - minY) * sc) / 2;
  for (const s of strokes) {
    g.beginPath();
    s.forEach((p, i) => { const x = ox + (p.x - minX) * sc, y = oy + (p.y - minY) * sc; i ? g.lineTo(x, y) : g.moveTo(x, y); });
    if (s.length === 1) g.lineTo(s[0].x + 0.1, s[0].y);
    g.stroke();
  }
  return c.toDataURL('image/png');  // model ko white-on-black sketch jaata hai (whiteboard sirf screen par hai)
}

// Whiteboard: mouse / pen / touch se draw karo. Camera nahi kholta.
export default function AirCanvas({ onResult, onError }: { onResult: (r: RecognizeResult, sketch: string) => void; onError?: (kind: 'locked' | 'fail' | 'empty') => void }) {
  const onRes = useRef(onResult); onRes.current = onResult;
  const onErr = useRef(onError); onErr.current = onError;
  const board = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Pt[][]>([]);
  const cur = useRef<Pt[] | null>(null);
  const sm = useRef<Pt | null>(null);
  const busyRef = useRef(false);
  const motion = useRef({ m: 'none', cx: 0, cy: 0 });
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);

  const clear = useCallback(() => { strokes.current = []; motion.current.m = 'none'; setCount(0); }, []);
  const undo = useCallback(() => { strokes.current.pop(); motion.current.m = 'none'; setCount(strokes.current.length); }, []);
  const process = useCallback(async () => {
    if (busyRef.current) return;
    if (!strokes.current.length) { onErr.current?.('empty'); return; }
    busyRef.current = true; setBusy(true);
    try {
      const png = exportPng(strokes.current);
      const res = await fetch('/api/recognize', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-access-code': localStorage.getItem('amc.code') || '' }, body: JSON.stringify({ image: png }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 401 ? 'locked' : data.error || 'fail');
      const pts = strokes.current.flat();
      motion.current = { m: data.motion, cx: pts.reduce((a, p) => a + p.x, 0) / pts.length, cy: pts.reduce((a, p) => a + p.y, 0) / pts.length };
      onRes.current(data, png);
    } catch (e: any) { onErr.current?.(e?.message === 'locked' ? 'locked' : 'fail'); }
    finally { busyRef.current = false; setBusy(false); }
  }, []);

  useEffect(() => {
    let raf = 0;
    const c = board.current!, g = c.getContext('2d')!;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      g.fillStyle = '#fafaf9'; g.fillRect(0, 0, W, H);
      g.lineCap = 'round'; g.lineJoin = 'round';
      const mo = motion.current, t = performance.now() / 1000;
      g.save();
      if (mo.m !== 'none') {  // result aane ke baad sketch board par hi animate hota hai
        g.translate(mo.cx, mo.cy);
        if (mo.m === 'bounce') g.translate(0, -Math.abs(Math.sin(t * 3)) * 60);
        if (mo.m === 'float') g.translate(Math.sin(t * 1.2) * 20, Math.sin(t * 2) * 14);
        if (mo.m === 'spin') g.rotate(t * 1.5);
        if (mo.m === 'pulse') { const k = 1 + Math.sin(t * 4) * 0.08; g.scale(k, k); }
        g.translate(-mo.cx, -mo.cy);
      }
      g.lineWidth = 5; g.strokeStyle = INK;
      for (const s of strokes.current) {
        g.beginPath();
        s.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
        if (s.length === 1) g.lineTo(s[0].x + 0.1, s[0].y);
        g.stroke();
      }
      g.restore();
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  const pos = (e: React.PointerEvent) => { const r = e.currentTarget.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
  const down = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId); motion.current.m = 'none';
    const p = pos(e); sm.current = p; cur.current = [p]; strokes.current.push(cur.current); setCount(strokes.current.length);
  };
  const move = (e: React.PointerEvent) => {
    if (!cur.current || !sm.current) return;
    const r = pos(e), s = sm.current;
    sm.current = { x: s.x + (r.x - s.x) * 0.6, y: s.y + (r.y - s.y) * 0.6 };
    cur.current.push(sm.current);
  };
  const up = () => { cur.current = null; sm.current = null; };

  return (
    <section className="w-full">
      <div className="relative w-full overflow-hidden rounded-2xl border border-[#2a2a30] bg-[#fafaf9]" style={{ aspectRatio: `${W} / ${H}` }}>
        <canvas ref={board} width={W} height={H} className="absolute inset-0 h-full w-full touch-none cursor-crosshair" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Drawing whiteboard" />
        {count === 0 && <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg text-zinc-400">Draw your idea here with the mouse</p>}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={undo} disabled={!count} className="btn">Undo</button>
        <button onClick={clear} disabled={!count} className="btn">Clear</button>
        <span className="flex-1" />
        <button onClick={process} disabled={busy || !count} className="btn btn-main">{busy ? 'Understanding…' : 'Understand drawing'}</button>
      </div>
    </section>
  );
}
