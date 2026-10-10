'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { LampContainer } from '@/components/ui/lamp';
import { CardSpotlight } from '@/components/ui/card-spotlight';
import { Timeline } from '@/components/ui/timeline';
import { TextReveal } from '@/components/ui/text-reveal';

const P = ({ children }: { children: React.ReactNode }) => <p className="mb-8 text-base md:text-xl leading-relaxed text-neutral-800 dark:text-neutral-300 max-w-2xl">{children}</p>;
const steps = [
  ['1. Drop an idea', 'Type (or say, or sketch) a rough idea in English, Hindi or Hinglish: "30 sec reel on why rockets are expensive". No brief, no template.'],
  ['2. AI understands it', 'Gemini finds the core subject, intent and search keywords, and shows alternatives when it is unsure instead of guessing.'],
  ['3. Facts with sources', 'Facts come from Wikipedia first, with a link. The AI only rewrites them for creators and never invents numbers.'],
  ['4. Hook + shot-wise script', 'Four hook styles to choose from. Every shot gets its own line, duration and a pace check (words per second).'],
  ['5. B-roll picked for you', 'Pexels, Pixabay and Wikimedia clips are ranked per shot and an AI picks the best thumbnail. Swap or upload your own any time.'],
  ['6. Hand off to the editor', 'Export an .edl timeline for Premiere / DaVinci, .srt captions, a shot list CSV, a posting pack, or a quick preview video.'],
].map(([title, text]) => ({ title, content: <div><P>{text}</P></div> }));

const deliverables = [
  ['.edl', 'Timeline', 'Cuts with exact timing. Opens in Premiere Pro and DaVinci Resolve.'],
  ['.srt', 'Captions', 'Script split into readable cues, timed per shot.'],
  ['.csv', 'Shot list', 'Script, visual, footage link and credit for every shot. Opens in Excel or Sheets.'],
  ['.txt', 'Posting pack', '3 title options, a caption and hashtags, written from the script.'],
  ['.webm', 'Preview video', 'Captions burned in, so a client can see the idea before editing starts.'],
];
const pains = [
  ['Blank page', 'Staring at an empty doc deciding the hook.'],
  ['B-roll hunt', '30 tabs of stock footage for a 30-second video.'],
  ['Messy brief', 'Voice notes and WhatsApp threads sent to the editor.'],
];
// Sample output: demo "Rocket" concept ke asli shots (lib/demo.ts), design preview ke liye.
const sample = [
  { t: 'Liftoff', s: 0, d: 8, l: 'Every launch starts with a controlled explosion.', v: 'A rocket lifting off the pad', e: '🚀', bg: 'from-[#2a1740] to-[#0d0a14]' },
  { t: 'The engine', s: 8, d: 8, l: 'The engine throws exhaust down so the rocket goes up.', v: 'Close-up of engine flames', e: '🔥', bg: 'from-[#7a3a12] to-[#1a0c08]' },
  { t: 'Earth from orbit', s: 16, d: 7, l: 'Once in orbit, the whole planet fits in one frame.', v: 'Earth seen from space', e: '🌍', bg: 'from-[#0b3347] to-[#07151c]' },
  { t: 'The takeaway', s: 23, d: 7, l: 'Reaching space takes a huge amount of engineering.', v: 'Rocket ascending into the stars', e: '✨', bg: 'from-[#5b2a5e] to-[#170f28]' },
];

const platforms = [
  { name: 'Instagram Reel', ratio: '9 / 16', spec: '9:16 · ~30s · 3-4 shots', text: 'Fast hook, tight shots. Every shot carries its own script line and B-roll.', glow: 'from-[#ff6a4d]/30' },
  { name: 'YouTube Short', ratio: '9 / 16', spec: '9:16 · ~45s · 4-5 shots', text: 'Vertical, a bit longer. Edit the timing and the storyboard bar updates as you go.', glow: 'from-[#f23d2b]/30' },
  { name: 'YouTube', ratio: '16 / 9', spec: '16:9 · ~2 min · 5-6 shots', text: 'Room to explain. Good for explainers where each shot needs a fact and a source.', glow: 'from-[#8b5cf6]/30' },
  { name: 'Whiteboard', ratio: '4 / 3', spec: 'Optional · mouse, pen, touch', text: 'Sketch the idea on a clean board. The sketch itself gets animated.', glow: 'from-[#ff9d8a]/25' },
];

function Header() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${solid ? 'border-b border-white/[0.07] bg-[#09090b]/80 backdrop-blur-xl' : 'border-b border-transparent'}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5">
        <a href="/" className="flex items-center gap-2.5" aria-label="Air Motion Canvas">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#ff6a4d,#8b5cf6)' }}>A</span>
          <span className="hidden text-[16px] font-semibold tracking-tight sm:block">Air Motion Canvas</span>
        </a>
        <nav className="ml-4 hidden items-center gap-6 text-[15px] text-zinc-400 md:flex" aria-label="Sections">
          <a href="#preview" className="transition-colors hover:text-white">Preview</a>
          <a href="#how" className="transition-colors hover:text-white">How it works</a>
          <a href="#platforms" className="transition-colors hover:text-white">Platforms</a>
        </nav>
        <span className="flex-1" />
        <a href="/studio" className="cta !px-5 !py-2 text-[14px]">Open Studio</a>
      </div>
    </header>
  );
}

function SamplePackage() {
  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="chip !cursor-default">Hook · Curiosity</span>
        <span className="text-sm text-zinc-300">"What if I told you a rocket is just a controlled explosion?"</span>
      </div>
      <div className="mb-4 flex h-7 gap-1 overflow-hidden rounded-lg text-[11px] font-semibold text-white">
        {sample.map((x, i) => <div key={x.t} style={{ flex: x.d, background: i % 2 ? '#8b5cf6' : '#ff6a4d' }} className="flex items-center px-2">Shot {i + 1} · {x.d}s</div>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sample.map((x, i) => (
          <div key={x.t} className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#131316]">
            <div className={`flex aspect-video items-center justify-center bg-gradient-to-br ${x.bg} text-4xl`}>{x.e}</div>
            <div className="space-y-1.5 p-3 text-left">
              <p className="label">Shot {i + 1} · 00:{String(x.s).padStart(2, '0')}</p>
              <p className="text-[15px] font-semibold text-white">{x.t}</p>
              <p className="text-[13px] leading-snug text-zinc-300">"{x.l}"</p>
              <p className="text-[12px] text-zinc-500">B-roll: {x.v}</p>
            </div>
          </div>))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-[12px] text-zinc-400">{deliverables.map(([ext]) => <span key={ext} className="rounded-full border border-white/10 px-3 py-1">{ext}</span>)}<span className="px-1 py-1">ready to export</span></div>
    </div>
  );
}

// Scroll-linked product preview: screenshot dheere seedha hota hai. Koi fixed/200vh jaisi layout hack nahi.
function Preview() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [18, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.35], [0.3, 1]);
  return (
    <section id="preview" className="scroll-mt-20 px-4 pb-24 pt-4 md:pb-32">
      <h2 className="mx-auto mb-10 max-w-3xl text-center text-4xl font-semibold tracking-tight md:text-6xl"><TextReveal text="Idea in. Handoff out." accent="Handoff" /></h2>
      <div ref={ref} className="mx-auto max-w-5xl [perspective:1400px]">
        <motion.div style={{ rotateX, scale, opacity, transformOrigin: '50% 100%' }} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0f] shadow-[0_40px_120px_-40px_rgba(255,106,77,.35)]">
          <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-4 py-3">
            <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="mx-auto rounded-md bg-white/[0.05] px-10 py-1 text-[12px] text-zinc-500">sample output · "30 sec reel: why rockets are expensive"</span>
          </div>
          <SamplePackage />
        </motion.div>
      </div>
    </section>
  );
}

export default function Intro() {
  return (
    <main className="bg-[#09090b]">
      <Header />
      <div className="h-[600px] w-full overflow-hidden bg-[#09090b] sm:h-[640px]">
        <LampContainer>
          <motion.div initial={{ opacity: 0.4, y: 60 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8, ease: 'easeInOut' }} className="flex flex-col items-center text-center">
            <h1 className="bg-gradient-to-br from-zinc-100 to-zinc-500 bg-clip-text py-2 text-5xl font-semibold tracking-tight text-transparent md:text-7xl">Air Motion Canvas</h1>
            <div className="mt-8 flex flex-wrap justify-center gap-3"><a href="/studio" className="cta">Open Studio</a><a href="#how" className="chip !py-3">How it works</a></div>
          </motion.div>
        </LampContainer>
      </div>
      <Preview />
      <section id="how" className="scroll-mt-20"><Timeline data={steps} heading="From idea to handoff in six steps" sub="Planning a short video should not take longer than editing it." /></section>
      <section className="px-4 py-16"><div className="mx-auto max-w-6xl">
        <p className="label">The problem</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-bold md:text-5xl">Most of a reel's time goes into planning, not editing.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">{pains.map(([h, t]) => (
          <div key={h} className="rounded-3xl border border-white/[0.08] bg-[#111114] p-6"><h3 className="text-xl font-semibold text-white">{h}</h3><p className="mt-2 text-[15px] text-zinc-400">{t}</p></div>))}</div>
      </div></section>
      <section id="handoff" className="scroll-mt-20 px-4 py-16"><div className="mx-auto max-w-6xl">
        <p className="label">What you get</p>
        <h2 className="mt-2 text-3xl font-bold md:text-5xl">One idea. Five files your editor can use.</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{deliverables.map(([ext, h, t]) => (
          <div key={ext} className="rounded-3xl border border-white/[0.08] bg-[#111114] p-6"><span className="text-2xl font-bold" style={{ color: '#ff6a4d' }}>{ext}</span><h3 className="mt-3 text-lg font-semibold text-white">{h}</h3><p className="mt-2 text-[14px] leading-relaxed text-zinc-400">{t}</p></div>))}</div>
      </div></section>
      <section id="platforms" className="scroll-mt-20 py-16"><div className="mx-auto max-w-7xl px-4"><h2 className="text-3xl font-bold md:text-5xl"><TextReveal text="Made for every format." /></h2><p className="mt-3 text-base text-zinc-400 md:text-xl">Pick Reel, Short or YouTube and the plan adapts.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{platforms.map((c) => (
          <div key={c.name} className="group flex flex-col rounded-3xl border border-white/[0.08] bg-[#111114] p-6 transition-colors hover:border-white/20">
            <div className={`relative mb-6 flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${c.glow} via-[#16161a] to-[#16161a]`}>
              <div className="rounded-lg border border-white/25 bg-black/40 shadow-lg transition-transform duration-300 group-hover:scale-105" style={{ aspectRatio: c.ratio, height: c.ratio === '9 / 16' ? '78%' : undefined, width: c.ratio === '9 / 16' ? undefined : '58%' }} />
            </div>
            <p className="label">{c.spec}</p>
            <h3 className="mt-1 text-xl font-semibold text-white">{c.name}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">{c.text}</p>
          </div>))}</div></div></section>
      <section className="py-20 px-4"><div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        {[['Hindi + Hinglish', 'Write the idea the way you speak. Script and tone (casual, funny, serious) follow your language.'], ['Facts, not hallucinations', 'Every fact comes from Wikipedia with a link. The AI is told not to invent numbers.'], ['Never a dead end', 'If AI or footage is down you get a clear message and a working demo flow, not a broken screen.']].map(([h, t]) => (
          <CardSpotlight key={h} className="h-64 w-full rounded-3xl"><p className="relative z-20 text-2xl font-bold text-white">{h}</p><p className="relative z-20 mt-3 text-lg leading-relaxed text-neutral-300">{t}</p></CardSpotlight>))}
      </div></section>
      <section className="py-24 text-center"><a href="/studio" className="btn btn-main px-10 py-4 text-xl">Plan your first reel</a></section>
    </main>
  );
}
