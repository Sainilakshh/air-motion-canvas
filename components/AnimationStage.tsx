'use client';
import { useEffect, useRef, useState } from 'react';
import { sanitizeSvg } from '@/lib/animation';
import type { AnimSpec, CameraMove, Primitive, VisualStyle } from '@/lib/types';

type KF = { frames: Keyframe[]; opts: KeyframeAnimationOptions; origin?: string };
const orbit = (r: number) => Array.from({ length: 17 }, (_, i) => { const a = (i / 16) * 2 * Math.PI; return { transform: `translate(${Math.cos(a) * r}%, ${Math.sin(a) * r * 0.6}%)` }; });

// Reusable motion primitives. AI inhe compose karta hai (nested layers = transforms stack hote hain).
function build(p: Primitive, kind: 'img' | 'svg' | 'emoji'): KF {
  const s = p.speed ?? 1, a = p.amount ?? 1, d = (ms: number) => ms / s, inf = { iterations: Infinity };
  switch (p.type) {
    case 'float': return { frames: [{ transform: 'translate(0,0)' }, { transform: `translate(${2 * a}%,${-5 * a}%)` }, { transform: `translate(${-2 * a}%,${-2 * a}%)` }, { transform: 'translate(0,0)' }], opts: { ...inf, duration: d(4000), easing: 'ease-in-out' } };
    case 'bounce': return { origin: '50% 75%', frames: [{ transform: 'translateY(0) scaleY(1)', offset: 0, easing: 'cubic-bezier(.2,.7,.4,1)' }, { transform: `translateY(${-22 * a}%) scaleY(1.04)`, offset: 0.5, easing: 'cubic-bezier(.6,0,.8,.3)' }, { transform: 'translateY(0) scaleY(1)', offset: 0.9 }, { transform: 'translateY(0) scaleY(.88)', offset: 0.95 }, { transform: 'translateY(0) scaleY(1)', offset: 1 }], opts: { ...inf, duration: d(1200) } };
    case 'spin': return { frames: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], opts: { ...inf, duration: d(9000), easing: 'linear' } };
    case 'pulse': return { frames: [{ transform: 'scale(1)' }, { transform: `scale(${1 + 0.1 * a})` }, { transform: 'scale(1)' }], opts: { ...inf, duration: d(1800), easing: 'ease-in-out' } };
    case 'sway': return { origin: '50% 90%', frames: [{ transform: `rotate(${-4 * a}deg)` }, { transform: `rotate(${4 * a}deg)` }], opts: { ...inf, direction: 'alternate', duration: d(3200), easing: 'ease-in-out' } };
    case 'grow': return { origin: '50% 92%', frames: [{ transform: 'scale(.1)', opacity: 0, offset: 0 }, { transform: 'scale(.2)', opacity: 1, offset: 0.12 }, { transform: 'scale(1)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1, offset: 0.92 }, { transform: 'scale(1)', opacity: 0, offset: 1 }], opts: { ...inf, duration: d(5000), easing: 'ease-out' } };
    case 'launch': return { frames: [{ transform: 'translate(0,30%) scale(.9)', offset: 0 }, { transform: 'translate(-.5%,23%) scale(.92)', offset: 0.15 }, { transform: `translate(${3 * a}%,-8%)`, offset: 0.5 }, { transform: `translate(${8 * a}%,${-95 * a}%) scale(1.1)`, opacity: 1, offset: 0.9 }, { transform: `translate(${9 * a}%,-105%) scale(1.1)`, opacity: 0, offset: 1 }], opts: { ...inf, duration: d(3600), easing: 'ease-in' } };
    case 'drive': { const from = kind === 'emoji' ? 75 : -75; return { frames: [{ transform: `translateX(${from}%)`, opacity: 0, offset: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.9 }, { transform: `translateX(${-from}%)`, opacity: 0, offset: 1 }], opts: { ...inf, duration: d(4500), easing: 'linear' } }; }
    case 'wave': return { frames: [{ transform: 'translateY(0) rotate(-3deg)' }, { transform: `translateY(${-4 * a}%) rotate(0deg)` }, { transform: 'translateY(0) rotate(3deg)' }, { transform: `translateY(${3 * a}%) rotate(0deg)` }, { transform: 'translateY(0) rotate(-3deg)' }], opts: { ...inf, duration: d(3000), easing: 'ease-in-out' } };
    case 'orbit': return { frames: orbit(28 * a), opts: { ...inf, duration: d(7000), easing: 'linear' } };
    case 'shake': return { frames: [{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(${-1 * a}%,${0.6 * a}%) rotate(${-1 * a}deg)` }, { transform: `translate(${1 * a}%,${-0.6 * a}%) rotate(${1 * a}deg)` }, { transform: 'translate(0,0) rotate(0)' }], opts: { ...inf, duration: d(500) } };
    case 'fall': return { frames: [{ transform: 'translateY(-70%) rotate(0deg)', opacity: 0, offset: 0 }, { opacity: 1, offset: 0.15 }, { transform: `translateY(${50 * a}%) rotate(120deg)`, opacity: 1, offset: 0.85 }, { transform: 'translateY(60%) rotate(140deg)', opacity: 0, offset: 1 }], opts: { ...inf, duration: d(2800), easing: 'ease-in' } };
    case 'zoom': return { frames: [{ transform: 'scale(.85)' }, { transform: `scale(${1 + 0.25 * a})` }], opts: { ...inf, direction: 'alternate', duration: d(4500), easing: 'ease-in-out' } };
    case 'flicker': return { frames: [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0.55, transform: 'scale(.97)' }, { opacity: 1, transform: 'scale(1.03)' }, { opacity: 0.7, transform: 'scale(.98)' }, { opacity: 1, transform: 'scale(1)' }, { opacity: 0.45, transform: 'scale(1.02)' }, { opacity: 1, transform: 'scale(1)' }], opts: { ...inf, duration: d(1400) } };
    case 'draw': return { frames: [{ clipPath: 'inset(0 100% 0 0)', opacity: 1, offset: 0 }, { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: 0.6 }, { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: 0.9 }, { clipPath: 'inset(0 0 0 0)', opacity: 0, offset: 1 }], opts: { ...inf, duration: d(4000), easing: 'ease-in-out' } };
  }
}

const SPARK = [{ l: '12%', t: '0s', z: 0.8 }, { l: '27%', t: '2.1s', z: 1.2 }, { l: '38%', t: '1.4s', z: 0.7 }, { l: '51%', t: '3.3s', z: 1 }, { l: '62%', t: '2.6s', z: 1.4 }, { l: '73%', t: '0.6s', z: 0.9 }, { l: '82%', t: '0.8s', z: 1.1 }, { l: '92%', t: '3.8s', z: 0.8 }];
const CLOUDS = [{ t: '12%', w: 26, d: 38, o: 0.5 }, { t: '28%', w: 18, d: 55, o: 0.35 }, { t: '6%', w: 14, d: 70, o: 0.25 }];

// Sketch PNG white-on-black hai. Black ko transparent karte hain (luminance -> alpha), warna animated layers ke andar kala box dikhta hai.
const cleanCache = new Map<string, string>();
function useTransparentSketch(src?: string) {
  const [out, setOut] = useState('');
  useEffect(() => {
    if (!src) { setOut(''); return; }
    const hit = cleanCache.get(src);
    if (hit) { setOut(hit); return; }
    let dead = false;
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
      const g = c.getContext('2d'); if (!g) { setOut(src); return; }
      g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
      for (let i = 0; i < p.length; i += 4) { const a = p[i]; p[i] = 255; p[i + 1] = 226; p[i + 2] = 214; p[i + 3] = a; }
      g.putImageData(d, 0, 0);
      const url = c.toDataURL('image/png');
      if (cleanCache.size > 30) cleanCache.clear();
      cleanCache.set(src, url);
      if (!dead) setOut(url);
    };
    im.onerror = () => { if (!dead) setOut(src); };
    im.src = src;
    return () => { dead = true; };
  }, [src]);
  return out;
}

export default function AnimationStage({ anim, sketch, ratio = '16 / 9', label, compact = false, camera = 'push-in', visualStyle = 'cinematic' }: { anim: AnimSpec; sketch?: string; ratio?: string; label?: string; compact?: boolean; camera?: CameraMove; visualStyle?: VisualStyle }) {
  const root = useRef<HTMLDivElement>(null), cam = useRef<HTMLDivElement>(null), enter = useRef<HTMLDivElement>(null);
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const clean = useTransparentSketch(sketch);
  const kind: 'img' | 'svg' | 'emoji' = sketch ? 'img' : anim.svg ? 'svg' : 'emoji';
  const svg = kind === 'svg' ? sanitizeSvg(anim.svg) : '';
  const key = JSON.stringify(anim.primitives) + kind;
  layers.current.length = anim.primitives.length;

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const running: Animation[] = [];
    layers.current.forEach((el, i) => {
      const p = anim.primitives[i];
      if (!el || !p) return;
      const k = build(p, kind);
      el.style.transformOrigin = k.origin || '50% 50%';
      try { running.push(el.animate(k.frames, k.opts)); } catch {}
    });
    // Per-shot camera direction is rendered on the scene container, with restrained motion to avoid cropping.
    try {
      const moves: Record<CameraMove, [string, string]> = {
        static: ['scale(1)', 'scale(1)'],
        'push-in': ['scale(1)', 'scale(1.1)'], 'pull-back': ['scale(1.12)', 'scale(1)'],
        'pan-left': ['scale(1.08) translate(2%,0)', 'scale(1.08) translate(-2%,0)'],
        'pan-right': ['scale(1.08) translate(-2%,0)', 'scale(1.08) translate(2%,0)'],
        'tilt-up': ['scale(1.08) translateY(2%)', 'scale(1.08) translateY(-2%)'],
        'tilt-down': ['scale(1.08) translateY(-2%)', 'scale(1.08) translateY(2%)'],
        'track-up': ['scale(1.08) translateY(4%)', 'scale(1.08) translateY(-5%)'],
        orbit: ['scale(1) rotate(-1deg)', 'scale(1.06) rotate(1deg)'],
      };
      if (cam.current && camera !== 'static') running.push(cam.current.animate(moves[camera].map((transform) => ({ transform })), { duration: 9000, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }));
      if (enter.current && !reduce) enter.current.animate([{ opacity: 0, transform: 'scale(.55) translateY(10%)', filter: 'blur(6px)' }, { opacity: 1, transform: 'scale(1) translateY(0)', filter: 'blur(0)' }], { duration: 750, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' });
    } catch {}
    if (reduce) running.forEach((a) => a.pause());
    // offscreen stages pause ho jaate hain (performance)
    const io = typeof IntersectionObserver !== 'undefined' && root.current ? new IntersectionObserver(([e]) => running.forEach((a) => (e.isIntersecting && !reduce ? a.play() : a.pause()))) : null;
    if (io && root.current) io.observe(root.current);
    return () => { running.forEach((a) => a.cancel()); io?.disconnect(); };
  }, [key, camera]); // eslint-disable-line react-hooks/exhaustive-deps

  const fx = new Set(anim.effects);
  const lead = anim.primitives[0];
  const shadowFor = lead && ['bounce', 'float', 'pulse', 'sway'].includes(lead.type) && ['ground', 'sky', 'none', 'night'].includes(anim.backdrop) ? `${build(lead, kind).opts.duration}ms` : '';
  const subject = (
    <div className="relative flex items-center justify-center" style={{ width: '100%', height: '100%' }}>
      {kind === 'img' && clean && <img src={clean} alt="" className="max-h-[62%] max-w-[62%] object-contain" style={{ filter: 'drop-shadow(0 0 8px rgba(255,106,77,.7))' }} />}
      {kind === 'svg' && <div style={{ width: '46%', aspectRatio: '1', filter: 'drop-shadow(0 0 10px rgba(255,106,77,.5))' }} dangerouslySetInnerHTML={{ __html: svg }} />}
      {kind === 'emoji' && <span style={{ fontSize: 'clamp(1.6rem, 24cqw, 7rem)', lineHeight: 1, filter: 'drop-shadow(0 0 18px rgba(255,106,77,.55))' }}>{anim.emoji || '✨'}</span>}
      {fx.has('trail') && <span className={`fx-trail ${anim.emoji === '🚀' && kind === 'emoji' ? 'diag' : ''}`} style={{ top: '62%' }} />}
      {fx.has('smoke') && [0, 0.6, 1.2].map((d) => <span key={d} className="fx-smoke" style={{ left: '30%', top: '60%', animationDelay: `${d}s` }} />)}
    </div>
  );
  const nested = anim.primitives.reduceRight<React.ReactNode>((child, _p, i) => (
    <div key={i} ref={(el) => { layers.current[i] = el; }} className="absolute inset-0 flex items-center justify-center">{child}</div>
  ), subject);

  return (
    <div ref={root} className={`stage bd-${anim.backdrop}`} data-visual-style={visualStyle} style={{ aspectRatio: ratio, filter: visualStyle === 'storybook' ? 'sepia(.32) saturate(.78) contrast(1.08)' : visualStyle === 'neon' ? 'saturate(1.55) hue-rotate(9deg) contrast(1.08)' : 'contrast(1.08) saturate(1.08)' }}>
      {fx.has('stars') && <div className="fx-stars" />}
      {fx.has('rays') && <div className="fx-rays" />}
      {anim.backdrop === 'ocean' && ['rgba(14,116,144,.55)', 'rgba(34,211,238,.25)'].map((c, i) => (
        <svg key={i} className="fx-wave" viewBox="0 0 200 20" preserveAspectRatio="none" style={{ animationDuration: `${7 - i * 2}s`, bottom: `${i * 4}%` }}><path d="M0 10 Q25 0 50 10 T100 10 T150 10 T200 10 V20 H0Z" fill={c} /></svg>))}
      {fx.has('bubbles') && [10, 30, 55, 80].map((l, i) => <span key={l} className="fx-bubble" style={{ left: `${l}%`, width: 8 + i * 3, height: 8 + i * 3, animationDelay: `${i * 1.3}s` }} />)}
      {fx.has('sparkles') && SPARK.map((s) => <span key={s.l} className="fx-float" style={{ left: s.l, animationDelay: s.t, fontSize: `${s.z}em`, animationDuration: `${4 + s.z * 1.6}s` }}>✦</span>)}
      {anim.backdrop === 'sky' && CLOUDS.map((c, i) => <span key={i} className="fx-cloud" style={{ top: c.t, width: `${c.w}%`, opacity: c.o, animationDuration: `${c.d}s`, animationDelay: `${-i * 17}s` }} />)}
      {anim.backdrop === 'space' && <><div className="fx-stars2" /><span className="fx-planet" /></>}
      {anim.backdrop === 'ground' && <div className="fx-road" />}
      <span className="fx-glow" />
      <div ref={cam} className="absolute inset-0">
        {shadowFor && <span className="fx-shadow" style={{ animationDuration: shadowFor }} />}
        <div ref={enter} className="absolute inset-0">{nested}</div>
      </div>
      <i className="hud-c tl" /><i className="hud-c tr" /><i className="hud-c bl" /><i className="hud-c br" />
      {!compact && <div className="hud absolute left-4 bottom-3 right-4 flex justify-between gap-2"><span className="truncate">{label}</span><span className="truncate">{anim.primitives.map((p) => p.type).join(' + ')}</span></div>}
    </div>
  );
}
