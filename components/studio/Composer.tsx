'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { IconArrowRight, IconMicrophone, IconMinus, IconPlus } from '@tabler/icons-react';

export type PlatformOpt = { key: string; label: string; short: string; aspect: string };
type Props = {
  mode: 'type' | 'draw'; setMode: (m: 'type' | 'draw') => void;
  idea: string; setIdea: (v: string) => void; onSubmit: () => void; busy: boolean;
  platforms: PlatformOpt[]; platform: string; setPlatform: (k: string) => void;
  target: number; setTarget: (n: number) => void; onNotice: (m: string) => void;
  children: React.ReactNode;  // whiteboard (Draw mode)
};
const EXAMPLES = ['A 30-second video about why rockets are expensive', 'How solar panels turn sunlight into electricity', 'The story of a tree growing from a tiny seed'];

export default function Composer(p: Props) {
  const [ph, setPh] = useState(0), [focus, setFocus] = useState(false), [micOk, setMicOk] = useState(false), [listening, setListening] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null), rec = useRef<any>(null);
  useEffect(() => { setMicOk(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)); }, []);
  useEffect(() => {  // placeholder examples rotate hote hain (sirf khali + unfocused)
    if (focus || p.idea || p.mode !== 'type') return;
    const t = setInterval(() => setPh((i) => (i + 1) % EXAMPLES.length), 3600);
    return () => clearInterval(t);
  }, [focus, p.idea, p.mode]);
  useEffect(() => { const el = ta.current; if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 180) + 'px'; } }, [p.idea, p.mode]);
  useEffect(() => () => rec.current?.stop?.(), []);

  const toggleMic = () => {
    if (listening) { rec.current?.stop(); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'en-IN'; r.interimResults = true; r.continuous = false;
    r.onresult = (e: any) => p.setIdea(Array.from(e.results).map((x: any) => x[0].transcript).join('').trim());
    r.onerror = (e: any) => { setListening(false); if (e.error === 'not-allowed' || e.error === 'service-not-allowed') p.onNotice('Microphone is blocked — allow it in the browser to speak your idea.'); else if (e.error !== 'no-speech' && e.error !== 'aborted') p.onNotice('Voice input failed — you can still type your idea.'); };
    r.onend = () => { setListening(false); ta.current?.focus(); };
    rec.current = r; setListening(true);
    try { r.start(); } catch { setListening(false); }
  };

  return (
    <div className="composer p-5 sm:p-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative inline-flex rounded-full border border-white/[0.07] bg-[#1a1a1f] p-1" role="tablist" aria-label="Input mode">
          {(['type', 'draw'] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={p.mode === m} onClick={() => p.setMode(m)} className={`relative z-10 rounded-full px-5 py-1.5 text-[15px] font-medium transition-colors ${p.mode === m ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>
              {p.mode === m && <motion.span layoutId="seg-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} className="absolute inset-0 -z-10 rounded-full bg-[#2a2a31]" />}
              {m === 'type' ? 'Type' : 'Draw'}
            </button>))}
        </div>
        <span className="label hidden sm:block">{p.mode === 'type' ? 'Enter to generate · Shift+Enter for a new line' : 'Sketch, then press Understand'}</span>
      </div>

      {p.mode === 'type' ? (
        <div className="relative">
          <textarea ref={ta} rows={2} maxLength={400} value={p.idea} onChange={(e) => p.setIdea(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (p.idea.trim() && !p.busy) p.onSubmit(); } }}
            placeholder={EXAMPLES[ph]} aria-label="Your video idea" className={`composer-ta ${micOk ? 'pr-14' : ''}`} />
          {micOk && <button type="button" onClick={toggleMic} data-on={listening} className="iconbtn absolute right-0 top-0 !h-11 !w-11 !rounded-full" aria-label={listening ? 'Stop listening' : 'Speak your idea'} title={listening ? 'Listening… tap to stop' : 'Speak your idea'}>
            <IconMicrophone size={20} className={listening ? 'animate-pulse' : ''} /></button>}
        </div>
      ) : p.children}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
        {p.platforms.map((o) => (
          <button key={o.key} type="button" className="chip" data-on={p.platform === o.key} onClick={() => p.setPlatform(o.key)} title={`${o.label} · ${o.aspect}`} aria-pressed={p.platform === o.key}>
            <span className="inline-block rounded-[2px] border border-current" style={o.aspect === '9:16' ? { width: 9, height: 15 } : { width: 16, height: 9 }} />{o.short}
          </button>))}
        <div className="chip !gap-1 !px-2" aria-label="Target duration">
          <button type="button" className="rounded-full p-1 hover:bg-white/10" onClick={() => p.setTarget(Math.max(5, p.target - 5))} aria-label="Shorter"><IconMinus size={14} /></button>
          <input inputMode="numeric" value={p.target || ''} onChange={(e) => p.setTarget(Math.min(600, Number(e.target.value.replace(/\D/g, '')) || 0))} className="w-9 bg-transparent text-center outline-none" aria-label="Target seconds" />
          <span className="-ml-1 text-zinc-500">s</span>
          <button type="button" className="rounded-full p-1 hover:bg-white/10" onClick={() => p.setTarget(Math.min(600, p.target + 5))} aria-label="Longer"><IconPlus size={14} /></button>
        </div>
        <span className="flex-1" />
        {p.mode === 'type' && <button type="button" className="cta" disabled={!p.idea.trim() || p.busy} onClick={p.onSubmit}>{p.busy ? 'Working…' : 'Generate story'}<IconArrowRight size={18} /></button>}
      </div>
    </div>
  );
}
