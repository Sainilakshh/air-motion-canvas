'use client';
import { useEffect, useRef, useState } from 'react';
import { IconPlayerPause, IconPlayerPlay, IconPlayerSkipBack, IconPlayerSkipForward, IconVolume, IconVolumeOff, IconX } from '@tabler/icons-react';
import AnimationStage from '@/components/AnimationStage';
import type { Shot, VisualStyle } from '@/lib/types';
import { speechLang, type Lang } from '@/lib/style';

const dur = (s: Shot) => Math.max(1, Number(s.duration) || 5);
const fmt = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
const cameraKey = (move?: Shot['camera']) => ({ 'push-in': 'cam-push', 'pull-back': 'cam-pull', 'pan-left': 'cam-left', 'pan-right': 'cam-right', 'tilt-up': 'cam-up', 'tilt-down': 'cam-down', 'track-up': 'cam-track', orbit: 'cam-orbit', static: 'cam-still' }[move || 'push-in']);

// Storyboard ko shot-by-shot chalata hai: B-roll (ya concept animation) + script caption + optional voice (browser TTS, free).
export default function Animatic({ shots, ratio, sketchFor, onClose, lang = 'auto', visualStyle = 'cinematic' }: { shots: Shot[]; ratio: string; sketchFor: (s: Shot) => string | undefined; onClose: () => void; lang?: Lang; visualStyle?: VisualStyle }) {
  const [i, setI] = useState(0), [t, setT] = useState(0), [playing, setPlaying] = useState(true), [voice, setVoice] = useState(false), [speed, setSpeed] = useState(1);
  const portrait = ratio.startsWith('9');
  const shot = shots[i];
  const total = shots.reduce((a, s) => a + dur(s), 0);
  const elapsed = shots.slice(0, i).reduce((a, s) => a + dur(s), 0) + t;
  const speedRef = useRef(speed); speedRef.current = speed;

  useEffect(() => {  // clock: 100ms ticks
    if (!playing) return;
    const id = setInterval(() => setT((x) => x + 0.1 * speedRef.current), 100);
    return () => clearInterval(id);
  }, [playing]);
  useEffect(() => {  // shot khatam -> agla; aakhri ke baad ruk jao
    if (t < dur(shot)) return;
    if (i < shots.length - 1) { setI(i + 1); setT(0); } else { setPlaying(false); setT(dur(shot)); }
  }, [t]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {  // voice: line ko shot ki duration mein fit karne ke liye rate adjust
    if (!canSpeak()) return;
    window.speechSynthesis.cancel();
    if (!voice || !playing || !shot?.line) return;
    const u = new SpeechSynthesisUtterance(shot.line); u.lang = speechLang(lang, shot.line);
    const words = shot.line.split(/\s+/).length;
    u.rate = Math.min(1.5, Math.max(0.85, words / ((dur(shot) / speed) * 2.6)));
    window.speechSynthesis.speak(u);
  }, [i, voice, playing, speed]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (canSpeak()) window.speechSynthesis.cancel(); }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (d: number) => { const n = Math.max(0, Math.min(shots.length - 1, i + d)); setI(n); setT(0); setPlaying(true); };
  const restart = () => { setI(0); setT(0); setPlaying(true); };
  const done = !playing && i === shots.length - 1 && t >= dur(shot);
  const b = shot.broll;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/95 p-4" role="dialog" aria-modal="true" aria-label="Storyboard preview">
      <button type="button" className="iconbtn absolute right-4 top-4 !rounded-full" onClick={onClose} aria-label="Close preview"><IconX size={18} /></button>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0f]" style={{ aspectRatio: ratio, ...(portrait ? { height: 'min(76vh, 780px)' } : { width: 'min(92vw, 1040px)' }) }}>
        <div key={shot.id} className="shot-in absolute inset-0">
          {b?.preview ? <video key={b.preview} src={b.preview} poster={b.thumb} autoPlay muted loop playsInline className="h-full w-full object-cover" style={{ animation: `${cameraKey(shot.camera)} ${dur(shot) / speed}s ease-in-out infinite alternate` }} />
            : b?.thumb ? <img src={b.thumb} alt="" className="h-full w-full object-cover" style={{ animation: `${cameraKey(shot.camera)} ${dur(shot) / speed}s ease-in-out infinite alternate` }} />
            : <AnimationStage anim={shot.anim} sketch={sketchFor(shot)} ratio={ratio} compact camera={shot.camera} visualStyle={visualStyle} />}
          {b && <div className="absolute right-3 top-14 w-[22%] min-w-[70px] max-w-[130px] opacity-95"><AnimationStage anim={shot.anim} sketch={sketchFor(shot)} ratio={ratio} compact camera={shot.camera} visualStyle={visualStyle} /></div>}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-x-0 top-0 flex gap-1 p-3">{shots.map((s, k) => <span key={s.id} className="h-1 overflow-hidden rounded-full bg-white/20" style={{ flex: dur(s) }}><span className="block h-full bg-white" style={{ width: `${k < i ? 100 : k === i ? Math.min(100, (t / dur(s)) * 100) : 0}%` }} /></span>)}</div>
        <div className="absolute left-4 top-8 rounded-full bg-black/55 px-3 py-1 text-[13px] font-medium text-white">{String(i + 1).padStart(2, '0')} · {shot.title}</div>
        <div key={'c' + i} className="cap-in absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <p className="max-w-[34ch] text-[clamp(18px,2.6vw,30px)] font-semibold leading-snug tracking-tight text-white" style={{ fontFamily: 'var(--font-display)', textShadow: '0 2px 18px rgba(0,0,0,.7)' }}>{shot.line || shot.visual || shot.title}</p>
          {b && <p className="mt-2 text-[12px] text-white/60">{b.credit}</p>}
        </div>
        {done && <button type="button" onClick={restart} className="absolute inset-0 flex items-center justify-center bg-black/45 text-lg font-semibold text-white"><span className="cta"><IconPlayerPlay size={18} />Replay</span></button>}
      </div>
      <div className="flex w-full max-w-[640px] items-center gap-2">
        <button type="button" className="iconbtn" onClick={() => go(-1)} disabled={i === 0} aria-label="Previous shot"><IconPlayerSkipBack size={18} /></button>
        <button type="button" className="iconbtn !h-11 !w-11 !rounded-full" onClick={() => (done ? restart() : setPlaying((p) => !p))} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <IconPlayerPause size={20} /> : <IconPlayerPlay size={20} />}</button>
        <button type="button" className="iconbtn" onClick={() => go(1)} disabled={i === shots.length - 1} aria-label="Next shot"><IconPlayerSkipForward size={18} /></button>
        <span className="label tabular-nums">{fmt(elapsed)} / {fmt(total)}</span>
        <span className="flex-1" />
        <button type="button" className="chip !px-3 !py-1.5 text-[13px]" onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))} aria-label="Playback speed">{speed}×</button>
        {canSpeak() && <button type="button" className="iconbtn" data-on={voice} onClick={() => setVoice((v) => !v)} aria-label={voice ? 'Voice on' : 'Voice off'} title="Read the script aloud">{voice ? <IconVolume size={18} /> : <IconVolumeOff size={18} />}</button>}
      </div>
    </div>
  );
}
