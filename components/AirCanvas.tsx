'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconArrowBackUp, IconArrowForwardUp, IconEraser, IconPencil, IconSparkles, IconTrash, IconCamera, IconCameraOff } from '@tabler/icons-react';
import { classify } from '@/lib/gestures';
import type { RecognizeResult } from '@/lib/types';

type Pt = { x: number; y: number; p: number };
type Stroke = { pts: Pt[]; w: number };
const W = 1280, H = 640;
const INK = '#18181b';
const SIZES = [3, 6, 11];
const ERASE_R = 24;
const MP_VERSION = '0.10.35';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// One Euro filter: dheere haath par smooth, tez haath par responsive (lag nahi). Pointer smoothing ka standard tareeka.
class OneEuro {
  private xp = 0; private dxp = 0; private tp = 0; private init = false;
  constructor(private minCutoff = 1.6, private beta = 0.02, private dCutoff = 1) {}
  private alpha(c: number, dt: number) { const tau = 1 / (2 * Math.PI * c); return 1 / (1 + tau / dt); }
  filter(x: number, t: number) {
    if (!this.init) { this.init = true; this.xp = x; this.tp = t; return x; }
    const dt = Math.max((t - this.tp) / 1000, 0.001);
    const dx = (x - this.xp) / dt, aD = this.alpha(this.dCutoff, dt);
    const dxh = aD * dx + (1 - aD) * this.dxp;
    const a = this.alpha(this.minCutoff + this.beta * Math.abs(dxh), dt);
    const xh = a * x + (1 - a) * this.xp;
    this.xp = xh; this.dxp = dxh; this.tp = t;
    return xh;
  }
}

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
    if (s.length === 1) g.lineTo(ox + (s[0].x - minX) * sc + 0.1, oy + (s[0].y - minY) * sc);
    g.stroke();
  }
  return c.toDataURL('image/png');  // model ko white-on-black sketch jaata hai (whiteboard sirf screen par hai)
}

// Stroke ko midpoints ke beech quadratic curves se draw karte hain (pressure se width badalti hai): lines kone-kone nahi dikhti.
function drawStroke(g: CanvasRenderingContext2D, s: Stroke) {
  const n = s.pts.length;
  if (!n) return;
  g.strokeStyle = INK; g.fillStyle = INK; g.lineCap = 'round'; g.lineJoin = 'round';
  if (n < 3) { const p = s.pts[0]; g.beginPath(); g.arc(p.x, p.y, s.w * (0.6 + 0.8 * p.p) / 2, 0, Math.PI * 2); g.fill(); if (n === 2) { g.lineWidth = s.w; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(s.pts[1].x, s.pts[1].y); g.stroke(); } return; }
  let prev = s.pts[0];
  for (let i = 1; i < n - 1; i++) {
    const a = s.pts[i], b = s.pts[i + 1], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const sx = i === 1 ? prev.x : (prev.x + a.x) / 2, sy = i === 1 ? prev.y : (prev.y + a.y) / 2;
    g.lineWidth = s.w * (0.6 + 0.8 * ((a.p + b.p) / 2));
    g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(a.x, a.y, mx, my); g.stroke();
    prev = a;
  }
  const last = s.pts[n - 1], pa = s.pts[n - 2];
  g.lineWidth = s.w * (0.6 + 0.8 * last.p); g.beginPath(); g.moveTo((pa.x + last.x) / 2, (pa.y + last.y) / 2); g.lineTo(last.x, last.y); g.stroke();
}

const hit = (s: Stroke, x: number, y: number) => s.pts.some((p) => Math.hypot(p.x - x, p.y - y) < ERASE_R + s.w);

// Whiteboard: mouse / pen / touch. Camera nahi kholta. Pen pressure, palm rejection, eraser, undo/redo, shortcuts, two-finger-tap undo.
export default function AirCanvas({ onResult, onError }: { onResult: (r: RecognizeResult, sketch: string) => void; onError?: (kind: 'locked' | 'fail' | 'empty') => void }) {
  const onRes = useRef(onResult); onRes.current = onResult;
  const onErr = useRef(onError); onErr.current = onError;
  const wrap = useRef<HTMLDivElement>(null);
  const board = useRef<HTMLCanvasElement>(null);
  const hist = useRef<Stroke[][]>([[]]);      // snapshots: undo/redo ek jagah
  const idx = useRef(0);
  const cur = useRef<Stroke | null>(null);
  const eraseWork = useRef<Stroke[] | null>(null);
  const fx = useRef(new OneEuro()), fy = useRef(new OneEuro());
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const tf = useRef<{ t: number; moved: boolean } | null>(null);   // two-finger tap
  const lastPen = useRef(0);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const dirty = useRef(true);
  const busyRef = useRef(false);
  const motion = useRef({ m: 'none', cx: 0, cy: 0 });
  const toolRef = useRef<'pen' | 'eraser'>('pen');
  const sizeRef = useRef(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const camCursor = useRef<{ x: number; y: number; pinch: boolean; ring: number } | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [camStatus, setCamStatus] = useState<'idle' | 'starting' | 'on' | 'error'>('idle');
  const [camMsg, setCamMsg] = useState('');
  const [gest, setGest] = useState('none');
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [size, setSize] = useState(1);
  const [busy, setBusy] = useState(false);
  const [ui, setUi] = useState({ count: 0, canUndo: false, canRedo: false });
  toolRef.current = tool; sizeRef.current = size;

  const base = () => hist.current[idx.current];
  const sync = useCallback(() => { setUi({ count: base().length, canUndo: idx.current > 0, canRedo: idx.current < hist.current.length - 1 }); dirty.current = true; }, []);
  const commit = (next: Stroke[]) => { hist.current = [...hist.current.slice(0, idx.current + 1), next].slice(-60); idx.current = hist.current.length - 1; motion.current.m = 'none'; sync(); };
  const undo = useCallback(() => { if (idx.current > 0) { idx.current--; motion.current.m = 'none'; sync(); } }, [sync]);
  const redo = useCallback(() => { if (idx.current < hist.current.length - 1) { idx.current++; motion.current.m = 'none'; sync(); } }, [sync]);
  const clear = useCallback(() => { if (base().length) commit([]); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const process = useCallback(async () => {
    if (busyRef.current) return;
    const strokes = base();
    if (!strokes.length) { onErr.current?.('empty'); return; }
    busyRef.current = true; setBusy(true);
    try {
      const png = exportPng(strokes.map((s) => s.pts));
      const res = await fetch('/api/recognize', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-access-code': localStorage.getItem('amc.code') || '' }, body: JSON.stringify({ image: png }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 401 ? 'locked' : data.error || 'fail');
      const pts = strokes.flatMap((s) => s.pts);
      motion.current = { m: data.motion, cx: pts.reduce((a, p) => a + p.x, 0) / pts.length, cy: pts.reduce((a, p) => a + p.y, 0) / pts.length };
      dirty.current = true;
      onRes.current(data, png);
    } catch (e: any) { onErr.current?.(e?.message === 'locked' ? 'locked' : 'fail'); }
    finally { busyRef.current = false; setBusy(false); }
  }, []);

  // Render loop: sirf tab draw karta hai jab kuch badla ho (ya result ka motion preview chal raha ho)
  useEffect(() => {
    let raf = 0;
    const c = board.current!, g = c.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = W * dpr; c.height = H * dpr;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const mo = motion.current;
      if (!dirty.current && mo.m === 'none') return;
      dirty.current = false;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const t = performance.now() / 1000;
      g.save();
      if (mo.m !== 'none') {
        g.translate(mo.cx, mo.cy);
        if (mo.m === 'bounce') g.translate(0, -Math.abs(Math.sin(t * 3)) * 60);
        if (mo.m === 'float') g.translate(Math.sin(t * 1.2) * 20, Math.sin(t * 2) * 14);
        if (mo.m === 'spin') g.rotate(t * 1.5);
        if (mo.m === 'pulse') { const k = 1 + Math.sin(t * 4) * 0.08; g.scale(k, k); }
        g.translate(-mo.cx, -mo.cy);
      }
      for (const s of eraseWork.current ?? base()) drawStroke(g, s);
      if (cur.current) drawStroke(g, cur.current);
      g.restore();
      const cc = camCursor.current;
      if (cc) {
        if (cc.ring > 0) { g.strokeStyle = '#ff5a3c'; g.lineWidth = 4; g.beginPath(); g.arc(cc.x, cc.y, 22, -Math.PI / 2, -Math.PI / 2 + cc.ring * Math.PI * 2); g.stroke(); }
        g.fillStyle = cc.pinch ? '#ff5a3c' : '#8b5cf6'; g.beginPath(); g.arc(cc.x, cc.y, cc.pinch ? 8 : 6, 0, Math.PI * 2); g.fill();
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keyboard shortcuts (board focused ho tab): Ctrl/Cmd+Z, Shift+Ctrl+Z / Ctrl+Y, E, P, [ ], Ctrl+Enter
  const onKey = (e: React.KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
    if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (mod && k === 'y') { e.preventDefault(); redo(); }
    else if (mod && k === 'enter') { e.preventDefault(); process(); }
    else if (!mod && k === 'e') setTool('eraser');
    else if (!mod && (k === 'p' || k === 'b')) setTool('pen');
    else if (k === '[') setSize((s) => Math.max(0, s - 1));
    else if (k === ']') setSize((s) => Math.min(SIZES.length - 1, s + 1));
    else if (k === 'backspace' && e.shiftKey) { e.preventDefault(); clear(); }
  };
  useEffect(() => { wrap.current?.focus({ preventScroll: true }); }, []);

  // Camera air-draw (optional): MediaPipe browser mein local chalta hai, camera video kahin upload nahi hota
  useEffect(() => {
    if (!camOn) return;
    let stop = false, raf = 0, stream: MediaStream | undefined, lm: any;
    setCamStatus('starting');
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 960, height: 540 } });
        const v = videoRef.current!; v.srcObject = stream; await v.play();
        const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
        const ok = (u: string) => fetch(u, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
        const fs = await FilesetResolver.forVisionTasks((await ok('/mediapipe/wasm/vision_wasm_internal.js')) ? '/mediapipe/wasm' : `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`);
        lm = await HandLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: (await ok('/models/hand_landmarker.task')) ? '/models/hand_landmarker.task' : MODEL_URL, delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 1 });
        if (stop) return;
        setCamStatus('on');
        let cand = 'none', count = 0, stable = 'none', lastTs = -1, fistAt = 0, lastProc = 0;
        const endStroke = () => { const s = cur.current; cur.current = null; lastPt.current = null; if (s && s.pts.length) commit([...base(), s]); };
        const loop = () => {
          raf = requestAnimationFrame(loop);
          if (v.readyState < 2 || v.currentTime === lastTs) return;
          lastTs = v.currentTime;
          const now = performance.now();
          const l = lm.detectForVideo(v, now).landmarks[0];
          if (!l) { if (stable !== 'none') { endStroke(); stable = 'none'; cand = 'none'; count = 0; setGest('none'); } camCursor.current = null; dirty.current = true; return; }
          const g = classify(l);
          count = g === cand ? count + 1 : 1; cand = g;   // gesture 4 frame stable ho tab hi maano (jitter se bachav)
          if (count >= 4 && g !== stable) {
            if (stable === 'pinch') endStroke();
            stable = g; setGest(g);
            if (g === 'pinch') { motion.current.m = 'none'; fx.current = new OneEuro(); fy.current = new OneEuro(); lastPt.current = null; cur.current = { pts: [], w: SIZES[sizeRef.current] }; }
          }
          const x = (1 - (l[4].x + l[8].x) / 2) * W, y = ((l[4].y + l[8].y) / 2) * H;
          let ring = 0;
          if (stable === 'pinch') addPoint(x, y, 0.5, now);
          if (stable === 'fist') { fistAt ||= now; ring = Math.min((now - fistAt) / 1000, 1); if (ring >= 1) { clear(); fistAt = 0; } } else fistAt = 0;
          if (stable === 'thumbs' && now - lastProc > 3000) { lastProc = now; process(); }
          camCursor.current = { x, y, pinch: stable === 'pinch', ring }; dirty.current = true;
        };
        loop();
      } catch (e: any) {
        setCamStatus('error'); setCamOn(false);
        setCamMsg(e?.name === 'NotAllowedError' ? 'Camera permission denied — allow it in the browser, or keep using mouse/pen.' : 'Camera or hand model unavailable — the whiteboard still works.');
      }
    })();
    return () => { stop = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); lm?.close?.(); camCursor.current = null; dirty.current = true; setCamStatus('idle'); setGest('none'); };
  }, [camOn]); // eslint-disable-line react-hooks/exhaustive-deps

  const pos = (cx: number, cy: number) => { const r = board.current!.getBoundingClientRect(); return { x: ((cx - r.left) / r.width) * W, y: ((cy - r.top) / r.height) * H }; };
  const press = (e: PointerEvent | React.PointerEvent) => (e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5);
  const addPoint = (x: number, y: number, p: number, t: number) => {
    const s = cur.current; if (!s) return;
    const fxv = fx.current.filter(x, t), fyv = fy.current.filter(y, t);
    const lp = lastPt.current;
    if (lp && Math.hypot(fxv - lp.x, fyv - lp.y) < 0.8) return;  // bahut paas ke points skip
    lastPt.current = { x: fxv, y: fyv };
    s.pts.push({ x: fxv, y: fyv, p }); dirty.current = true;
  };
  const eraseAt = (x: number, y: number) => {
    const work = eraseWork.current ?? [...base()];
    const next = work.filter((s) => !hit(s, x, y));
    if (next.length !== work.length) { eraseWork.current = next; dirty.current = true; }
    else if (!eraseWork.current) eraseWork.current = work;
  };

  const down = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerType === 'pen') lastPen.current = performance.now();
    if (e.pointerType === 'touch' && performance.now() - lastPen.current < 1500) return;  // palm rejection: pen chal raha ho to touch ignore
    wrap.current?.focus({ preventScroll: true });
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pos(e.clientX, e.clientY);
    ptrs.current.set(e.pointerId, p);
    if (e.pointerType === 'touch' && ptrs.current.size === 2) {  // do ungli: stroke cancel, tap hua to undo
      cur.current = null; eraseWork.current = null; lastPt.current = null; dirty.current = true;
      tf.current = { t: performance.now(), moved: false };
      return;
    }
    if (ptrs.current.size > 1) return;
    motion.current.m = 'none';
    fx.current = new OneEuro(); fy.current = new OneEuro(); lastPt.current = null;
    if (toolRef.current === 'eraser') { eraseAt(p.x, p.y); return; }
    cur.current = { pts: [], w: SIZES[sizeRef.current] };
    addPoint(p.x, p.y, press(e), e.timeStamp);
    if (cur.current.pts.length === 0) cur.current.pts.push({ x: p.x, y: p.y, p: press(e) });
  };
  const move = (e: React.PointerEvent) => {
    const prev = ptrs.current.get(e.pointerId);
    if (!prev) return;
    if (e.pointerType === 'pen') lastPen.current = performance.now();  // pen chal raha hai: palm rejection active rakho
    const p0 = pos(e.clientX, e.clientY);
    if (tf.current) { if (Math.hypot(p0.x - prev.x, p0.y - prev.y) > 14) tf.current.moved = true; return; }
    if (ptrs.current.size > 1) return;
    if (toolRef.current === 'eraser') { eraseAt(p0.x, p0.y); return; }
    if (!cur.current) return;
    const evs = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [];  // high-rate points: tez stroke mein bhi smooth
    const list = evs.length ? evs : [e.nativeEvent as PointerEvent];
    for (const ev of list) { const q = pos(ev.clientX, ev.clientY); addPoint(q.x, q.y, press(ev), ev.timeStamp); }
  };
  const up = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return;  // ignored pointer (palm) ka up stroke ko commit na kare
    ptrs.current.delete(e.pointerId);
    if (tf.current) {
      if (ptrs.current.size === 0) { const tap = performance.now() - tf.current.t < 350 && !tf.current.moved; tf.current = null; if (tap) undo(); }
      return;
    }
    if (eraseWork.current) { const w = eraseWork.current; eraseWork.current = null; if (w.length !== base().length) commit(w); else dirty.current = true; }
    if (cur.current) { const s = cur.current; cur.current = null; if (s.pts.length) commit([...base(), s]); }
    lastPt.current = null;
  };

  return (
    <section className="w-full">
      <div ref={wrap} tabIndex={0} onKeyDown={onKey} className="relative w-full overflow-hidden rounded-2xl border border-[#2a2a30] outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a4d]/50" style={{ aspectRatio: `${W} / ${H}`, backgroundColor: '#f6f4f0', backgroundImage: 'radial-gradient(circle, rgba(24,24,27,.13) 1px, transparent 1.4px)', backgroundSize: '26px 26px' }}>
        {camOn && <video ref={videoRef} className="absolute inset-0 h-full w-full -scale-x-100 object-fill opacity-40" playsInline muted />}
        <canvas ref={board} className={`absolute inset-0 h-full w-full touch-none ${tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Drawing whiteboard" />
        {ui.count === 0 && <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg text-zinc-400">Sketch your idea here — mouse, pen or touch</p>}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-[#1a1a1f] p-1">
          <button type="button" className="iconbtn !border-0" data-on={tool === 'pen'} onClick={() => setTool('pen')} title="Pen (P)" aria-label="Pen"><IconPencil size={18} /></button>
          <button type="button" className="iconbtn !border-0" data-on={tool === 'eraser'} onClick={() => setTool('eraser')} title="Eraser (E)" aria-label="Eraser"><IconEraser size={18} /></button>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-[#1a1a1f] p-1" aria-label="Brush size">
          {SIZES.map((s, i) => <button key={s} type="button" className="iconbtn !border-0" data-on={size === i} onClick={() => setSize(i)} title={`Brush ${['small', 'medium', 'large'][i]} ( [ ] )`} aria-label={`Brush ${i + 1}`}><span className="rounded-full bg-current" style={{ width: 4 + i * 4, height: 4 + i * 4 }} /></button>)}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="iconbtn" onClick={undo} disabled={!ui.canUndo} title="Undo (Ctrl/Cmd+Z)" aria-label="Undo"><IconArrowBackUp size={18} /></button>
          <button type="button" className="iconbtn" onClick={redo} disabled={!ui.canRedo} title="Redo (Shift+Ctrl/Cmd+Z)" aria-label="Redo"><IconArrowForwardUp size={18} /></button>
          <button type="button" className="iconbtn" onClick={clear} disabled={!ui.count} title="Clear (Shift+Backspace)" aria-label="Clear"><IconTrash size={18} /></button>
        </div>
        <button type="button" className="iconbtn" data-on={camOn} onClick={() => { setCamMsg(''); setCamOn((c) => !c); }} title="Camera air-draw" aria-label="Camera air-draw">{camOn ? <IconCameraOff size={18} /> : <IconCamera size={18} />}</button>
        {camStatus === 'starting' && <span className="label">Starting camera…</span>}
        {camStatus === 'on' && <span className="label">Pinch = draw · Fist 1s = clear · Thumbs-up = understand · <b>{gest}</b></span>}
        {camStatus === 'error' && <span className="label text-amber-300">{camMsg}</span>}
        <span className="label hidden lg:inline">Two-finger tap = undo · E eraser · [ ] size · Ctrl+Enter understand</span>
        <span className="flex-1" />
        <button type="button" onClick={process} disabled={busy || !ui.count} className="cta"><IconSparkles size={18} />{busy ? 'Understanding…' : 'Understand drawing'}</button>
      </div>
    </section>
  );
}
