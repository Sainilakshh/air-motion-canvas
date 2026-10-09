'use client';
import { useEffect, useRef, useState } from 'react';
import { IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
import AnimationStage from '@/components/AnimationStage';
import type { Shot } from '@/lib/types';

// Storyboard shot ka preview: animation + script line ek-ek word karke (voiceover ki tarah) shot ki duration mein chalti hai.
// Isse dikhta hai ki line duration mein fit hoti hai ya nahi. Pace kharab ho to ek click mein duration fix.
export const wordsOf = (s: string) => s.trim().split(/\s+/).filter(Boolean);
export function pace(line: string, dur: number) {
  const n = wordsOf(line).length, d = Math.max(1, Number(dur) || 1), wps = n / d;
  const state = !n ? 'empty' : wps > 3.4 ? 'fast' : wps > 2.8 ? 'tight' : wps < 1 && d > 3 ? 'slow' : 'ok';
  return { n, wps, state, need: Math.max(2, Math.ceil(n / 2.5)) };
}

export default function ShotPreview({ shot, sketch, ratio, onDuration }: { shot: Shot; sketch?: string; ratio: string; onDuration: (n: number) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false), [paused, setPaused] = useState(false), [t, setT] = useState(0);
  const dur = Math.max(1, Number(shot.duration) || 1), words = wordsOf(shot.line || '');
  const pc = pace(shot.line || '', dur);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVis(e.isIntersecting), { threshold: 0.25 });
    if (root.current) io.observe(root.current);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!vis || paused) return;
    const id = setInterval(() => setT((x) => (x + 0.1 >= dur + 0.8 ? 0 : x + 0.1)), 100);   // thoda pause ke baad loop
    return () => clearInterval(id);
  }, [vis, paused, dur]);

  const on = words.length ? Math.min(words.length, Math.floor((t / dur) * words.length * 1.02) + (t > 0 ? 1 : 0)) : 0;
  const tone = pc.state === 'fast' ? 'text-[#ff8a75]' : pc.state === 'tight' ? 'text-amber-300' : 'text-emerald-300';
  return (
    <div ref={root}>
      <div className="shotp relative">
        <AnimationStage anim={shot.anim} sketch={sketch} ratio={ratio} compact />
        <div className="shotp-cap">
          {words.length ? <p>{words.map((w, i) => <span key={i} className={i < on ? 'on' : ''}>{w} </span>)}</p> : <p className="opacity-50">No script line yet</p>}
        </div>
        <button type="button" className="shotp-play" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play preview' : 'Pause preview'}>{paused ? <IconPlayerPlay size={13} /> : <IconPlayerPause size={13} />}</button>
        <span className="shotp-bar"><i style={{ width: `${Math.min(100, (t / dur) * 100)}%` }} /></span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
        {pc.state === 'empty' ? <span className="text-zinc-500">{dur}s · add a script line</span> : (<>
          <span className={tone}>{pc.n} words · {dur}s · {pc.wps.toFixed(1)}/s</span>
          {(pc.state === 'fast' || pc.state === 'tight') && <button type="button" className="underline underline-offset-2 text-zinc-300 hover:text-white" onClick={() => onDuration(pc.need)}>Set {pc.need}s</button>}
          {pc.state === 'slow' && <button type="button" className="underline underline-offset-2 text-zinc-400 hover:text-white" onClick={() => onDuration(pc.need)}>Trim to {pc.need}s</button>}
        </>)}
      </div>
    </div>
  );
}
