'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { classify, type Gesture } from '@/lib/gestures';
import type { RecognizeResult } from '@/lib/types';

type Pt = { x: number; y: number };
const W = 960, H = 540;
const CAM_DOWN = 'Camera unavailable — Continue with Mouse/Touch.';

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
    g.stroke();
  }
  return c.toDataURL('image/png');
}

// Optional layer: camera na ho to mouse/touch se poora kaam chalta hai.
// Privacy: video frames sirf browser mein MediaPipe ko jaate hain; server ko sirf strokes ki chhoti PNG jaati hai (Process par).
export default function AirCanvas({ onResult, onError }: { onResult: (r: RecognizeResult, sketch: string) => void; onError?: (kind: 'locked' | 'fail' | 'empty') => void }) {
  const onRes = useRef(onResult); onRes.current = onResult;
  const onErr = useRef(onError); onErr.current = onError;
  const video = useRef<HTMLVideoElement>(null);
  const stroke = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Pt[][]>([]);
  const busyRef = useRef(false);
  const motion = useRef({ m: 'none', cx: 0, cy: 0 });
  const mouseCur = useRef<Pt[] | null>(null);
  const mouseSm = useRef<Pt | null>(null);
  const [status, setStatus] = useState('Starting camera...');
  const [camOk, setCamOk] = useState(true);
  const [camKey, setCamKey] = useState(0);
  const [gesture, setGesture] = useState<Gesture>('none');
  const [busy, setBusy] = useState(false);

  const clear = useCallback(() => { strokes.current = []; motion.current.m = 'none'; }, []);
  const process = useCallback(async () => {
    if (busyRef.current) return;
    if (!strokes.current.length) { onErr.current?.('empty'); return; }
    busyRef.current = true; setBusy(true);
    try {
      const png = exportPng(strokes.current);
      const res = await fetch('/api/recognize', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-access-code': localStorage.getItem('amc.code') || '' }, body: JSON.stringify({ image: png }) });
      const data = await res.json();
      if (!res.ok) throw new Error(res.status === 401 ? 'locked' : data.error || 'fail');
      const pts = strokes.current.flat();
      motion.current = { m: data.motion, cx: pts.reduce((a, p) => a + p.x, 0) / pts.length, cy: pts.reduce((a, p) => a + p.y, 0) / pts.length };
      onRes.current(data, png);
    } catch (e: any) { onErr.current?.(e?.message === 'locked' ? 'locked' : 'fail'); }
    finally { busyRef.current = false; setBusy(false); }
  }, []);

  useEffect(() => {
    let raf = 0, stream: MediaStream | undefined, lm: HandLandmarker | undefined, dead = false;
    setStatus('Starting camera...'); setCamOk(true);
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: W, height: H } });
        if (dead) { stream.getTracks().forEach((t) => t.stop()); return; }
        video.current!.srcObject = stream; await video.current!.play();
      } catch { if (!dead) { setCamOk(false); setStatus(CAM_DOWN); } return; }
      const fs = await FilesetResolver.forVisionTasks('/mediapipe/wasm').catch(() => null);
      for (const delegate of ['GPU', 'CPU'] as const) {  // GPU fail ho to CPU try karo
        if (!fs || dead) break;
        try { lm = await HandLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: '/models/hand_landmarker.task', delegate }, runningMode: 'VIDEO', numHands: 1 }); break; } catch {}
      }
      if (dead) { lm?.close(); return; }
      setStatus(lm ? 'Hand tracking ON (local)' : 'Hand tracking unavailable — Continue with Mouse/Touch.');
    })();

    let cand: Gesture = 'none', count = 0, stable: Gesture = 'none', lastTs = -1, fistAt = 0, lastProc = 0;
    let sm: Pt | null = null, cur: Pt[] | null = null;
    const sc = stroke.current!.getContext('2d')!, oc = overlay.current!.getContext('2d')!;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      oc.clearRect(0, 0, W, H);
      const v = video.current!;
      if (lm && v.readyState >= 2 && v.currentTime !== lastTs) {
        lastTs = v.currentTime;
        const l = lm.detectForVideo(v, performance.now()).landmarks[0];
        const now = performance.now();
        if (l) {
          const g = classify(l);
          count = g === cand ? count + 1 : 1; cand = g;
          if (count >= 4 && g !== stable) { stable = g; setGesture(g); }  // 4 frame stable (state sirf gesture badalne par)
          const raw = { x: ((l[4].x + l[8].x) / 2) * W, y: ((l[4].y + l[8].y) / 2) * H };
          sm = sm ? { x: sm.x + (raw.x - sm.x) * 0.35, y: sm.y + (raw.y - sm.y) * 0.35 } : raw;  // stroke smoothing
          if (stable === 'pinch') { if (!cur) { cur = []; strokes.current.push(cur); } cur.push({ ...sm }); } else cur = null;
          if (stable === 'fist') {
            fistAt ||= now;
            const p = Math.min((now - fistAt) / 1000, 1);
            oc.strokeStyle = '#f472b6'; oc.lineWidth = 6; oc.beginPath(); oc.arc(sm.x, sm.y, 28, -Math.PI / 2, -Math.PI / 2 + p * 2 * Math.PI); oc.stroke();
            if (p >= 1) { clear(); fistAt = 0; }
          } else fistAt = 0;
          if (stable === 'thumbs' && now - lastProc > 3000) { lastProc = now; process(); }
          oc.strokeStyle = 'rgba(251,146,60,.6)'; oc.lineWidth = 2;
          for (const c of HandLandmarker.HAND_CONNECTIONS) { oc.beginPath(); oc.moveTo(l[c.start].x * W, l[c.start].y * H); oc.lineTo(l[c.end].x * W, l[c.end].y * H); oc.stroke(); }
          oc.fillStyle = '#fff'; oc.beginPath(); oc.arc(sm.x, sm.y, stable === 'pinch' ? 8 : 5, 0, 7); oc.fill();
        } else if (stable !== 'none') { stable = 'none'; cand = 'none'; count = 0; cur = null; sm = null; setGesture('none'); }
      }
      sc.clearRect(0, 0, W, H); sc.lineCap = 'round'; sc.lineJoin = 'round';
      const mo = motion.current, t = performance.now() / 1000;
      sc.save();
      if (mo.m !== 'none') {  // result aane ke baad canvas par live preview
        sc.translate(mo.cx, mo.cy);
        if (mo.m === 'bounce') sc.translate(0, -Math.abs(Math.sin(t * 3)) * 60);
        if (mo.m === 'float') sc.translate(Math.sin(t * 1.2) * 20, Math.sin(t * 2) * 14);
        if (mo.m === 'spin') sc.rotate(t * 1.5);
        if (mo.m === 'pulse') { const k = 1 + Math.sin(t * 4) * 0.08; sc.scale(k, k); }
        sc.translate(-mo.cx, -mo.cy);
      }
      for (const [w, col] of [[14, 'rgba(251,146,60,.25)'], [4, '#fed7aa']] as const) {
        sc.lineWidth = w; sc.strokeStyle = col;
        for (const s of strokes.current) { sc.beginPath(); s.forEach((p, i) => (i ? sc.lineTo(p.x, p.y) : sc.moveTo(p.x, p.y))); sc.stroke(); }
      }
      sc.restore();
    };
    tick();
    return () => { dead = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); lm?.close(); };
  }, [clear, process, camKey]);

  // Mouse/touch fallback (canvas CSS-mirrored hai, isliye x flip) + same smoothing
  const pos = (e: React.PointerEvent) => { const r = e.currentTarget.getBoundingClientRect(); return { x: W - ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
  const down = (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); motion.current.m = 'none'; const p = pos(e); mouseSm.current = p; mouseCur.current = [p]; strokes.current.push(mouseCur.current); };
  const move = (e: React.PointerEvent) => {
    if (!mouseCur.current || !mouseSm.current) return;
    const r = pos(e), s = mouseSm.current;
    mouseSm.current = { x: s.x + (r.x - s.x) * 0.5, y: s.y + (r.y - s.y) * 0.5 };
    mouseCur.current.push(mouseSm.current);
  };
  const up = () => { mouseCur.current = null; mouseSm.current = null; };

  return (
    <section className="max-w-[960px]">
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden glass">
        <div className="absolute inset-0 -scale-x-100">
          <video ref={video} className="absolute inset-0 w-full h-full object-fill opacity-50" playsInline muted />
          <canvas ref={stroke} width={W} height={H} className="absolute inset-0 w-full h-full" />
          <canvas ref={overlay} width={W} height={H} className="absolute inset-0 w-full h-full touch-none cursor-crosshair" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        </div>
        <i className="hud-c tl" /><i className="hud-c tr" /><i className="hud-c bl" /><i className="hud-c br" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="glass rounded-full px-3 py-1">{status}</span>
        {!camOk && <button onClick={() => setCamKey((k) => k + 1)} className="btn text-xs">Retry camera</button>}
        <span className="glass rounded-full px-3 py-1">Gesture: {gesture}</span>
        <button onClick={clear} className="btn">Clear</button>
        <button onClick={process} disabled={busy} className="btn btn-main">{busy ? 'Understanding...' : 'Understand drawing'}</button>
      </div>
      <p className="mt-2 text-xs text-orange-200/60">Pinch = draw | Open hand = hover | Fist 1s = clear | Thumbs-up = process | Mouse/touch: just drag. Camera video stays in your browser — it is never uploaded or stored.</p>
    </section>
  );
}
