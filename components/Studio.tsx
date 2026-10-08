'use client';
import { useEffect, useRef, useState } from 'react';
import { IconCheck, IconLock } from '@tabler/icons-react';
import { loadProjects, saveProjects, type Proj } from '@/lib/projects';
import AirCanvas from './AirCanvas';
import { TextReveal } from './ui/text-reveal';
import { GooeyInput } from './ui/gooey-input';
import { Card, Carousel } from './ui/apple-cards-carousel';
import { ImageGenerationLoader } from './ui/image-generation-loader';
import AnimationStage from './AnimationStage';
import { DEMO, fallbackHooks, fallbackShots, findDemo, normalizeShot } from '@/lib/demo';
import { heuristicAnim } from '@/lib/animation';
import type { Hook, Item, RecognizeResult, Shot } from '@/lib/types';

const AI_DOWN = 'AI temporarily unavailable — your work is safe.';
const NEED_CODE = 'This idea needs live AI, which is locked. Enter the access code above, or try one of the demo concepts below.';
const NO_FOOTAGE = 'No relevant footage found — try another keyword.';
const UNCLEAR = "Couldn't confidently understand the drawing — try a simpler sketch, or pick an alternative below.";
const code = () => { try { return localStorage.getItem('amc.code') || ''; } catch { return ''; } };
const uid = () => Math.random().toString(36).slice(2, 8);
const post = async (url: string, body: any) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-access-code': code() }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 401 ? '401' : d.error || 'fail');
  return d;
};
type Fact = { title: string; extract: string; url?: string; source: string };
// Targets / shot counts sirf sensible defaults hain (editable). Platform ke asli limits verify nahi kiye.
const PRESETS = {
  reel: { label: 'Instagram Reel', aspect: '9:16', ratio: '9 / 16', target: 30, shots: [3, 4] },
  short: { label: 'YouTube Short', aspect: '9:16', ratio: '9 / 16', target: 45, shots: [4, 5] },
  youtube: { label: 'YouTube', aspect: '16:9', ratio: '16 / 9', target: 120, shots: [5, 6] },
};
type PK = keyof typeof PRESETS;
const kwq = (k: string[]) => k.map((x) => x.trim()).filter(Boolean).join('|');
const sumDur = (a: Shot[]) => a.reduce((t, s) => t + (Number(s.duration) || 0), 0);

const Sk = ({ n = 2 }: { n?: number }) => <div className="space-y-3">{Array.from({ length: n }).map((_, i) => <div key={i} className="h-3 rounded bg-white/10 animate-pulse" style={{ width: `${92 - i * 20}%` }} />)}</div>;
const Fld = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block text-sm"><span className="mb-1 block text-zinc-400">{label}</span>{children}</label>;
function Clip({ it, ratio }: { it: Item; ratio: string }) {  // hover par chhota preview
  const [on, setOn] = useState(false);
  return (
    <a href={it.link} target="_blank" rel="noreferrer" onMouseEnter={() => setOn(true)} onMouseLeave={() => setOn(false)} className="block rounded overflow-hidden bg-black/40" style={{ aspectRatio: ratio }}>
      {on && it.preview ? <video src={it.preview} autoPlay muted loop playsInline className="w-full h-full object-cover" /> : <img src={it.thumb} alt="" className="w-full h-full object-cover" />}
    </a>
  );
}

export default function Studio() {
  const [idea, setIdea] = useState('');
  const [draw, setDraw] = useState(false);
  const [und, setUnd] = useState<RecognizeResult | null>(null);
  const [sketch, setSketch] = useState('');
  const [fact, setFact] = useState<Fact | null>(null);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [hook, setHook] = useState('');
  const [shots, setShots] = useState<Shot[]>([]);
  const [committed, setCommitted] = useState(false);
  const [busy, setBusy] = useState({ und: false, fact: false, plan: false, script: false });
  const [rb, setRb] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<string[]>([]);
  const [failDraw, setFailDraw] = useState(false);
  const [platform, setPlatform] = useState<PK>('reel');
  const [target, setTarget] = useState(30);
  const [projects, setProjects] = useState<Proj[]>([]);
  const [curId, setCurId] = useState('');
  const [showProj, setShowProj] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [codeVal, setCodeVal] = useState('');
  const [access, setAccess] = useState<'checking' | 'live' | 'locked'>('checking');
  const [accessInfo, setAccessInfo] = useState({ ai: true, footage: true });
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchW, setSearchW] = useState(420);
  const searchRef = useRef<HTMLDivElement>(null);
  const runId = useRef(0);
  const projRef = useRef<Proj[]>([]); projRef.current = projects;
  const platRef = useRef<PK>(platform); platRef.current = platform;
  const P = PRESETS[platform];

  useEffect(() => { setProjects(loadProjects()); setCodeVal(code()); }, []);
  // Code check: kisi bhi code change par (debounced) /api/access se poochho
  useEffect(() => {
    setAccess('checking');
    const t = setTimeout(async () => {
      try {
        const r = await fetch('/api/access', { headers: { 'x-access-code': codeVal } });
        if (r.ok) { const d = await r.json().catch(() => ({})); setAccessInfo({ ai: d.ai !== false, footage: d.footage !== false }); setAccess('live'); } else setAccess('locked');
      } catch { setAccess('locked'); }
    }, 400);
    return () => clearTimeout(t);
  }, [codeVal]);
  useEffect(() => {
    const el = searchRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setSearchW(Math.max(240, el.clientWidth - 64)));
    ro.observe(el); setSearchW(Math.max(240, el.clientWidth - 64));
    return () => ro.disconnect();
  }, []);
  // Ek hi banner: locked/AI-down ke messages ek dusre ko replace karte hain, stack nahi hote
  const SOFT = [AI_DOWN, NEED_CODE];
  const warn = (m: string) => setMsg((x) => (x.includes(m) ? x : SOFT.includes(m) ? [...x.filter((y) => !SOFT.includes(y)), m] : [...x, m]));
  const setB = (k: keyof typeof busy, v: boolean) => setBusy((b) => ({ ...b, [k]: v }));
  const patch = (id: string, p: Partial<Shot>) => setShots((s) => s.map((x) => (x.id === id ? { ...x, ...p } : x)));

  // ---------- B-roll ----------
  const findBroll = async (id: string, kws: string[], page = 1) => {
    const q = kwq(kws);
    if (!q) { patch(id, { note: NO_FOOTAGE }); return; }
    patch(id, { note: 'Searching B-roll...', page });
    try {
      const o = PRESETS[platRef.current].aspect === '9:16' ? 'portrait' : 'landscape';
      const d = await fetch(`/api/footage?q=${encodeURIComponent(q)}&page=${page}&o=${o}`, { headers: { 'x-access-code': code() } }).then((r) => r.json());
      const items: Item[] = d.items || [];
      if (!items.length && page > 1) { patch(id, { note: 'No more footage — try another keyword.', page: page - 1 }); return; }
      patch(id, { options: items, broll: items[0] || null, note: d.error === 'locked' ? 'Access code needed for live B-roll.' : items.length ? '' : NO_FOOTAGE });
    } catch { patch(id, { note: NO_FOOTAGE }); }
  };

  // ---------- main pipeline: understand -> visual -> research -> plan (B-roll per shot streams in) ----------
  const run = async (input: { text?: string; r?: RecognizeResult; sketch?: string; keepSketch?: boolean }) => {
    const id = ++runId.current, live = () => id === runId.current;
    setMsg([]); setHooks([]); setHook(''); setShots([]); setFact(null); setCommitted(false); setFailDraw(false);
    if (!input.keepSketch) setSketch(input.sketch || '');
    let r = input.r ?? null;
    if (!r) {
      setUnd(null); setB('und', true);
      try { r = await post('/api/recognize', { text: input.text }); }
      catch (e: any) {
        const locked = e?.message === '401';
        const d = findDemo(input.text || '');
        if (d) { r = d.r; warn(locked ? 'Demo mode — showing built-in data for this concept. Enter the access code for live AI.' : 'AI temporarily unavailable — showing demo data for this concept.'); }
        else { warn(locked ? NEED_CODE : AI_DOWN); setFailDraw(true); }
      }
      if (!live()) return;
      setB('und', false);
    }
    if (!r) return;
    setUnd(r);
    if (!input.text && !idea.trim()) setIdea(r.labels[0].name);
    if (!r.confident && !input.text) warn(UNCLEAR);
    const planIdea = input.text || idea.trim() || r.labels[0].name;

    setB('fact', true);
    let f: Fact | null = null;
    try {
      const w = await fetch('/api/facts?title=' + encodeURIComponent(r.wikiTitle), { headers: { 'x-access-code': code() } }).then((x) => x.json());
      if (!w.error) f = { title: w.title, extract: w.extract, url: w.url, source: 'Wikipedia' };
    } catch {}
    if (!f) {
      const d = findDemo(r.wikiTitle + ' ' + r.labels[0].name);
      if (d) f = { title: r.labels[0].name, extract: d.fact, source: 'Demo data' }; else warn('Research source unavailable — continuing without facts.');
    }
    if (!live()) return;
    setFact(f); setB('fact', false);

    setB('plan', true);
    const [lo, hi] = P.shots;
    let p: { hooks: Hook[]; shots: Shot[] };
    try { p = await post('/api/plan', { idea: planIdea, understanding: r, facts: f?.extract || '', platform: P.label, aspect: P.aspect, targetSeconds: target, shotMin: lo, shotMax: hi }); }
    catch (e: any) { if (e?.message === '401') warn(NEED_CODE); else warn(AI_DOWN); p = { hooks: [], shots: fallbackShots(r, f?.extract || '', hi, target) }; }
    if (!live()) return;
    if (!p.hooks.length) p.hooks = fallbackHooks(r);
    setB('plan', false);
    setHooks(p.hooks); setShots(p.shots);
    p.shots.forEach((s) => findBroll(s.id, s.keywords.length ? s.keywords : r!.keywords.slice(0, 3)));
  };

  // ---------- hook -> script ----------
  const pickHook = async (t: string) => {
    setHook(t); setB('script', true);
    try {
      const d = await post('/api/script', { idea: idea || und?.labels[0].name, concept: und?.labels[0].name, hook: t, facts: fact?.extract || '', shots: shots.map((s) => ({ title: s.title, visual: s.visual, fact: s.fact, seconds: s.duration })) });
      setShots((s) => s.map((x, i) => ({ ...x, line: d.lines[i] ?? x.line })));
    } catch (e: any) {
      warn(e?.message === '401' ? NEED_CODE : AI_DOWN);
      setShots((s) => s.map((x, i) => ({ ...x, line: i === 0 ? t : x.line || x.fact || x.visual })));  // local fallback: hook storyboard mein phir bhi flow karta hai
    }
    setB('script', false);
  };

  // ---------- shot ops ----------
  const regen = async (s: Shot, i: number) => {
    setRb((x) => ({ ...x, [s.id]: true }));
    try {
      const d = await post('/api/shot', { idea: idea || und?.labels[0].name, concept: und?.labels[0].name, facts: fact?.extract || '', hook, platform: P.label, shot: { title: s.title, visual: s.visual, line: s.line, duration: s.duration }, others: shots.filter((x) => x.id !== s.id).map((x) => x.title), position: i });
      patch(s.id, { title: d.title, concept: d.concept, visual: d.visual, brollIdea: d.brollIdea, keywords: d.keywords, fact: d.fact, line: d.line, anim: d.anim });
      findBroll(s.id, d.keywords);
    } catch (e: any) { warn(e?.message === '401' ? NEED_CODE : AI_DOWN); }
    setRb((x) => ({ ...x, [s.id]: false }));
  };
  const move = (i: number, d: number) => setShots((s) => { const a = [...s], j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const addShot = () => { const s: Shot = { id: uid(), title: 'New shot', concept: und?.labels[0].name || '', visual: '', brollIdea: '', keywords: und?.keywords.slice(0, 3) || [], line: '', duration: 5, fact: '', broll: null, options: [], anim: und?.anim || heuristicAnim('') }; setShots((a) => [...a, s]); if (s.keywords.length) findBroll(s.id, s.keywords); };
  const fit = (t: number) => setShots((a) => {
    const tot = sumDur(a); if (!tot || t <= 0) return a;
    const out = a.map((s) => ({ ...s, duration: Math.max(2, Math.round((Number(s.duration) || 0) * (t / tot))) }));
    out[out.length - 1].duration = Math.max(2, out[out.length - 1].duration + t - sumDur(out));
    return out;
  });
  const applyPreset = (k: PK) => { setPlatform(k); setTarget(PRESETS[k].target); if (shots.length) fit(PRESETS[k].target); };  // pacing adapt
  const total = sumDur(shots);
  const stageFor = (s: Shot) => (sketch && und && s.concept.toLowerCase().includes(und.labels[0].name.toLowerCase()) ? sketch : undefined);

  // ---------- projects ----------
  const snap = () => ({ idea, platform, target, und, sketch, fact, hooks, hook, shots, committed });
  const persist = (id: string) => {
    const list = projRef.current.map((p) => (p.id === id ? { ...p, updated: Date.now(), data: snap() } : p));
    setProjects(list);
    if (saveProjects(list)) setSavedAt(Date.now()); else warn('Save failed — browser storage is full or blocked.');
  };
  const saveProject = () => {
    if (!idea.trim() && !und && !shots.length) { warn('Nothing to save yet — start with an idea.'); return; }
    if (curId && projects.some((p) => p.id === curId)) { persist(curId); return; }
    const id = uid();
    const list = [{ id, name: (idea || und?.labels[0].name || 'Untitled').slice(0, 40), updated: Date.now(), data: snap() }, ...projects];
    setCurId(id); setProjects(list);
    if (saveProjects(list)) setSavedAt(Date.now()); else warn('Save failed — browser storage is full or blocked.');
  };
  useEffect(() => {  // current project auto-save (debounced)
    if (!curId) return;
    const t = setTimeout(() => persist(curId), 900);
    return () => clearTimeout(t);
  }, [idea, platform, target, und, sketch, fact, hooks, hook, shots, committed, curId]); // eslint-disable-line react-hooks/exhaustive-deps
  const openProject = (p: Proj) => {
    runId.current++;
    const d = p.data || {};
    setIdea(d.idea || ''); setPlatform(d.platform || 'reel'); setTarget(d.target || 30); setUnd(d.und || null); setSketch(d.sketch || ''); setFact(d.fact || null);
    setHooks(d.hooks || []); setHook(d.hook || ''); setShots((d.shots || []).map(normalizeShot)); setCommitted(!!d.committed);
    setBusy({ und: false, fact: false, plan: false, script: false }); setCurId(p.id); setMsg([]); setFailDraw(false); setShowProj(false);
  };
  const newProject = () => { runId.current++; setCurId(''); setIdea(''); setUnd(null); setSketch(''); setFact(null); setHooks([]); setHook(''); setShots([]); setCommitted(false); setMsg([]); setFailDraw(false); setBusy({ und: false, fact: false, plan: false, script: false }); };
  const deleteProject = (id: string) => { const l = projects.filter((p) => p.id !== id); setProjects(l); saveProjects(l); if (curId === id) setCurId(''); };
  const renameProject = (id: string, name: string) => { const l = projects.map((p) => (p.id === id ? { ...p, name } : p)); setProjects(l); saveProjects(l); };

  // ---------- export ----------
  const scriptText = shots.map((s) => s.line).filter(Boolean).join('\n');
  const exportMd = () => {
    let t = 0;
    const md = `# ${idea || und?.labels[0].name || 'Storyboard'}\n\nPlatform: ${P.label} (${P.aspect}) | Total ~${total}s\n${hook ? `\nHook: ${hook}\n` : ''}\n` + shots.map((s, i) => {
      const a = t; t += Number(s.duration) || 0;
      return `## Shot ${String(i + 1).padStart(2, '0')} — ${s.title} (${a}–${t}s)\n- Concept: ${s.concept}\n- Visual: ${s.visual}\n- B-roll: ${s.broll ? `${s.broll.link} (${s.broll.credit})` : s.brollIdea || '—'}\n- Fact: ${s.fact || '—'}\n- Script: ${s.line}\n`;
    }).join('\n') + (fact ? `\nSource: ${fact.source}${fact.url ? ' — ' + fact.url : ''}\n` : '');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })); a.download = 'storyboard.md'; a.click();
  };

  const onDrawResult = (r: RecognizeResult, png: string) => run({ r, sketch: png });
  const onDrawError = (k: 'locked' | 'fail' | 'empty') => {
    if (k === 'empty') { warn('Draw something first, then press Understand.'); return; }
    warn(k === 'locked' ? NEED_CODE : AI_DOWN); setFailDraw(true);
  };

  return (
    <main className="mx-auto max-w-[1360px] space-y-6 px-8 py-10 xl:px-12">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-5xl font-bold tracking-tight"><TextReveal text="Air Motion Canvas" /></h1><p className="mt-3 text-lg text-zinc-400">Rough idea → structured visual story</p></div>
        <div className="relative">
          <div className="flex items-center gap-2 rounded-full border border-[#26262c] bg-[#131316] py-1 pl-3 pr-1">
            {access === 'live' ? <IconCheck size={16} className="text-emerald-400" /> : <IconLock size={16} className={access === 'checking' ? 'text-zinc-500' : 'text-coral'} />}
            <input type="password" value={codeVal} placeholder="Access code" aria-label="Access code" autoComplete="off" onChange={(e) => { setCodeVal(e.target.value); try { localStorage.setItem('amc.code', e.target.value); } catch {} }} className="w-32 bg-transparent text-[15px] outline-none placeholder:text-zinc-500" />
            <button type="button" onClick={() => setHelpOpen((v) => !v)} className={`rounded-full px-3 py-1 text-sm font-medium ${access === 'live' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-zinc-300'}`}>
              {access === 'live' ? 'Live AI' : access === 'checking' ? 'Checking…' : 'Demo mode'}
            </button>
          </div>
          {helpOpen && (
            <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-[#232328] bg-[#131316] p-4 text-sm leading-relaxed text-zinc-300 shadow-xl">
              <p className="mb-1 font-semibold text-white">{access === 'live' ? 'Live AI is on' : 'Demo mode'}</p>
              {access === 'live'
                ? <p>Code sahi hai. Gemini + B-roll chalenge{!accessInfo.ai ? ' (lekin GEMINI_API_KEY / GEMINI_MODEL server par set nahi hain)' : ''}{!accessInfo.footage ? ' (PIXABAY_API_KEY set nahi hai, footage nahi aayegi)' : ''}.</p>
                : <p>Bina code ke sirf 8 demo concepts chalte hain: Rocket, Earth, Solar, Tree, Car, Ball, House, Water. Live AI ke liye server par jo <code className="text-coral">DEMO_ACCESS_CODE</code> set hai wahi code yahan dalo.</p>}
              <button className="mt-2 text-zinc-500 underline" onClick={() => setHelpOpen(false)}>Close</button>
            </div>)}
        </div>
      </header>
      <div className="flex flex-wrap items-center gap-2">
        <div ref={searchRef} className="min-w-[260px] flex-1">
          <GooeyInput value={idea} onValueChange={setIdea} defaultOpen expandedWidth={searchW} expandedOffset={56} className="w-full !justify-start" placeholder="Your idea, e.g. A 30-second video about why rockets are expensive"
            onKeyDown={(e: any) => e.key === 'Enter' && idea.trim() && run({ text: idea.trim() })} />
        </div>
        <button className="btn btn-main px-6" disabled={!idea.trim()} onClick={() => run({ text: idea.trim() })}>Start</button>
        <button className="btn" onClick={() => setDraw((d) => !d)}>{draw ? 'Hide whiteboard' : 'Draw on whiteboard'}</button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[15px]">
        {(Object.keys(PRESETS) as PK[]).map((k) => <button key={k} onClick={() => applyPreset(k)} className={`btn ${platform === k ? 'btn-main' : ''}`}>{PRESETS[k].label}</button>)}
        <label className="flex items-center gap-2 text-zinc-400">Target <input type="number" min={5} value={target} onChange={(e) => setTarget(Number(e.target.value) || 0)} className="inp w-16 text-center" />s</label>
        {shots.length > 0 && <button className="btn text-sm" onClick={() => fit(target)}>Fit shots to target</button>}
        <span className="flex-1" />
        {savedAt > 0 && curId && <span className="text-sm text-zinc-500">Saved {new Date(savedAt).toLocaleTimeString()}</span>}
        <button className="btn" onClick={newProject}>New</button>
        <button className="btn" onClick={saveProject}>Save</button>
        <button className="btn" onClick={() => setShowProj((v) => !v)}>My Projects ({projects.length})</button>
      </div>
      {showProj && (
        <div className="glass rounded-2xl p-5 space-y-2 text-[15px]">
          {projects.length === 0 && <p className="opacity-60">No saved projects yet — press Save.</p>}
          {projects.map((p) => (
            <div key={p.id} className={`flex gap-2 items-center ${p.id === curId ? 'text-coral' : ''}`}>
              <input value={p.name} onChange={(e) => renameProject(p.id, e.target.value)} className="inp flex-1" />
              <span className="text-sm opacity-50 hidden sm:inline">{new Date(p.updated).toLocaleString()}</span>
              <button className="btn text-sm" onClick={() => openProject(p)}>Open</button>
              <button className="btn text-sm" onClick={() => deleteProject(p.id)}>Delete</button>
            </div>))}
        </div>)}
      {draw && <div className="glass rounded-2xl p-5"><AirCanvas onResult={onDrawResult} onError={onDrawError} /></div>}
      {(busy.und || busy.fact || busy.plan || busy.script) && (
        <div className="relative h-32 rounded-2xl overflow-hidden bg-neutral-900 border border-white/5">
          <ImageGenerationLoader effect="scale-wave" easing="ease-in-out" text={busy.und ? 'Analysing' : busy.fact ? 'Researching' : 'Writing'} cellSize={3} gap={1} bandHeight={48} colors={['#ff7a62', '#8b5cf6']} />
        </div>)}
      {msg.map((m) => <p key={m} className="rounded-2xl border border-[#2a2a30] bg-[#131316] px-4 py-3 text-[15px] text-zinc-300">{m}</p>)}
      {failDraw && (
        <div className="flex flex-wrap gap-2 items-center text-[15px]"><span className="text-zinc-400">Try a demo concept:</span>
          {DEMO.map((d) => <button key={d.r.labels[0].name} className="btn text-sm" onClick={() => { setIdea(d.r.labels[0].name); run({ text: d.r.labels[0].name }); }}>{d.r.labels[0].name}</button>)}</div>)}

      {/* 1. Understanding + generated visual (appears first) */}
      {(busy.und || und) && (
        <section className="glass rounded-2xl p-6 text-[15px] grid md:grid-cols-[1fr_auto] gap-4">
          <div className="space-y-2">
            <h2 className="font-semibold grad text-xl">Understanding</h2>
            {busy.und && <><p className="animate-pulse">Understanding...</p><Sk n={3} /></>}
            {und && (<>
              <p><b>{und.labels[0].name}</b> → {und.intent} ({Math.round(und.labels[0].confidence * 100)}%)</p>
              <p className="opacity-80">{und.context} | Visual: {und.visualDirection}</p>
              <div className="flex flex-wrap gap-2">{und.keywords.map((k) => <span key={k} className="glass rounded-full px-2 py-0.5 text-sm">{k}</span>)}</div>
              {und.labels.length > 1 && (<div className="flex flex-wrap gap-2 items-center"><span className="opacity-70">Did you mean?</span>
                {und.labels.slice(1).map((l) => <button key={l.name} className="btn text-sm" onClick={() => { setIdea(l.name); run({ text: l.name, keepSketch: true }); }}>{l.name} ({Math.round(l.confidence * 100)}%)</button>)}</div>)}
            </>)}
          </div>
          {und && <div style={{ width: P.aspect === '9:16' ? 200 : 400 }} className="max-w-full"><AnimationStage anim={und.anim} sketch={sketch || undefined} ratio={P.ratio} label={`${und.labels[0].name} → ${und.intent}`} /></div>}
        </section>)}

      {/* 2. Research */}
      {(busy.fact || fact) && (
        <section className="glass rounded-2xl p-6 text-[15px]">
          <h2 className="font-semibold grad text-xl">Research</h2>
          {busy.fact && <><p className="animate-pulse mb-2">Fetching facts...</p><Sk /></>}
          {fact && <><p>{fact.extract}</p><p className="text-sm opacity-60 mt-1">Source: {fact.url ? <a className="underline" href={fact.url} target="_blank" rel="noreferrer">{fact.source}{fact.source === 'Wikipedia' ? ' (CC BY-SA)' : ''}</a> : fact.source}</p></>}
        </section>)}

      {/* 3. Hooks (+ script loading) */}
      {(busy.plan || hooks.length > 0) && (
        <section className="glass rounded-2xl p-6 text-[15px] space-y-2">
          <h2 className="font-semibold grad text-xl">Hook</h2>
          {busy.plan && <><p className="animate-pulse">Planning shots + hooks...</p><Sk n={3} /></>}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{hooks.map((h) => (
            <button key={h.style} onClick={() => pickHook(h.text)} className={`text-left rounded-2xl p-6 text-base leading-relaxed border ${hook === h.text ? 'border-orange-400 bg-orange-400/10' : 'border-white/10 hover:border-orange-400/40'}`}>
              <span className="text-sm opacity-60">{h.style}</span><br />{h.text}</button>))}</div>
          {hooks.length > 0 && !hook && <p className="text-sm opacity-60">Pick a hook — it becomes the opening of your script and storyboard.</p>}
          {busy.script && <p className="animate-pulse">Writing script...</p>}
        </section>)}

      {/* 4. Content plan: edit/refine, then commit */}
      {(busy.plan || shots.length > 0) && !committed && (
        <section className="glass rounded-2xl p-6 text-[15px] space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-semibold grad text-xl">Content plan</h2><span className="text-sm opacity-60">Edit anything, then commit to the storyboard</span></div>
          {busy.plan && <Sk n={4} />}
          {shots.map((s, i) => (
            <div key={s.id} className="rounded-lg border border-white/10 p-3 space-y-2">
              <div className="flex gap-2 items-end">
                <span className="opacity-50 pb-1">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex-1"><Fld label="Shot title"><input value={s.title} onChange={(e) => patch(s.id, { title: e.target.value })} className="inp w-full font-semibold" /></Fld></div>
                <div className="w-16"><Fld label="Seconds"><input type="number" value={s.duration} onChange={(e) => patch(s.id, { duration: Number(e.target.value) })} className="inp w-full" /></Fld></div>
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                <Fld label="Visual suggestion"><input value={s.visual} onChange={(e) => patch(s.id, { visual: e.target.value })} className="inp w-full" /></Fld>
                <Fld label="B-roll suggestion"><input value={s.brollIdea} onChange={(e) => patch(s.id, { brollIdea: e.target.value })} className="inp w-full" /></Fld>
                <Fld label="Relevant fact"><input value={s.fact} onChange={(e) => patch(s.id, { fact: e.target.value })} className="inp w-full" /></Fld>
                <Fld label="Script line"><input value={s.line} onChange={(e) => patch(s.id, { line: e.target.value })} className="inp w-full" /></Fld>
              </div>
              <div className="flex gap-2 text-sm items-center">
                <button className="btn" disabled={rb[s.id]} onClick={() => regen(s, i)}>{rb[s.id] ? 'Regenerating...' : 'Regenerate'}</button>
                <button className="btn" onClick={() => setShots((a) => a.filter((x) => x.id !== s.id))}>Remove</button>
              </div>
            </div>))}
          <div className="flex gap-2 items-center">
            <button className="btn text-sm" onClick={addShot}>+ Add shot</button><span className="flex-1" />
            <span className="text-sm opacity-60">Total ~{total}s</span>
            <button className="btn btn-main" disabled={!shots.length || busy.plan} onClick={() => setCommitted(true)}>Commit to storyboard →</button>
          </div>
        </section>)}

      {/* 5. Storyboard */}
      {shots.length > 0 && committed && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-semibold grad text-xl">Storyboard</h2>
            <div className="flex items-center gap-2 text-[15px]">
              <span className={total > target ? 'text-pink-400' : 'opacity-70'}>Total ~{total}s / target {target}s</span>
              <button className="btn text-sm" onClick={() => setCommitted(false)}>Edit plan</button>
              <button className="btn text-sm" onClick={exportMd}>Export .md</button>
            </div>
          </div>
          {hook && <p className="glass rounded-lg px-3 py-2 text-[15px]"><span className="hud mr-2">Hook</span>{hook}</p>}
          <div className="flex h-14 rounded-lg overflow-hidden text-[13px]">
            {shots.map((s, i) => {
              const st = sumDur(shots.slice(0, i)), d = Number(s.duration) || 0;
              return (<button key={s.id} onClick={() => document.getElementById('shot-' + s.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} style={{ flex: Math.max(d, 1) }} title={s.title} className="px-1 flex flex-col justify-center text-left truncate border-r border-black/40 bg-gradient-to-r from-orange-500/40 to-pink-500/40 hover:from-orange-500/60 hover:to-pink-500/60">
                <span>{st}–{st + d}s</span><span className="opacity-70">Shot {String(i + 1).padStart(2, '0')}</span></button>);
            })}
          </div>
          <div><p className="hud mb-1">Preview strip</p><Carousel items={shots.map((s, i) => <Card key={s.id} index={i} card={{ category: `Shot ${String(i + 1).padStart(2, '0')} · ${s.duration}s`, title: s.title, src: s.broll?.thumb || '', content: <ShotDetail s={s} /> }} />)} /></div>
          {shots.map((s, i) => (
            <div id={'shot-' + s.id} key={s.id} className="glass rounded-2xl p-5 grid md:grid-cols-[180px_200px_1fr] xl:grid-cols-[230px_250px_1fr] gap-3">
              <div><p className="hud mb-1">Visual</p><AnimationStage anim={s.anim} sketch={stageFor(s)} ratio={P.ratio} compact />
                <p className="text-[13px] opacity-60 mt-1 truncate">{s.anim.primitives.map((p) => p.type).join(' + ')}</p></div>
              <div><p className="hud mb-1">B-roll</p>
                {s.broll ? <><Clip it={s.broll} ratio={P.ratio} /><span className="text-[13px] opacity-60 block truncate">{s.broll.credit}</span></>
                  : <div className="rounded bg-white/5 text-sm p-2 opacity-70" style={{ aspectRatio: P.ratio }}>{s.note || 'Finding B-roll...'}</div>}
                {s.options.length > 1 && <div className="flex gap-1 mt-1">{s.options.map((o) => <button key={o.link} onClick={() => patch(s.id, { broll: o })} className={`w-6 h-6 rounded overflow-hidden border ${o.link === s.broll?.link ? 'border-orange-400' : 'border-white/10'}`}><img src={o.thumb} alt="" className="w-full h-full object-cover" /></button>)}</div>}
                <button className="btn text-sm mt-1" onClick={() => findBroll(s.id, s.keywords, (s.page || 1) + 1)}>More footage</button>
              </div>
              <div className="space-y-1 text-[15px] min-w-0">
                <div className="flex gap-2 items-center"><span className="opacity-50">{String(i + 1).padStart(2, '0')}</span>
                  <input value={s.title} onChange={(e) => patch(s.id, { title: e.target.value })} className="inp flex-1 font-semibold min-w-0" />
                  <input type="number" value={s.duration} onChange={(e) => patch(s.id, { duration: Number(e.target.value) })} className="inp w-14" />s</div>
                <div className="flex gap-2 items-center text-sm"><span className="opacity-60">Concept</span>
                  <input value={s.concept} onChange={(e) => patch(s.id, { concept: e.target.value })} onBlur={(e) => { if (e.target.value && s.anim.emoji !== heuristicAnim(e.target.value).emoji && !s.anim.svg) patch(s.id, { anim: heuristicAnim(e.target.value + ' ' + s.title) }); }} className="inp flex-1 min-w-0" /></div>
                <input value={s.visual} onChange={(e) => patch(s.id, { visual: e.target.value })} placeholder="Visual" className="inp w-full text-sm" />
                <textarea value={s.line} onChange={(e) => patch(s.id, { line: e.target.value })} rows={2} className="inp w-full" placeholder="Script line" />
                {s.fact && <p className="text-sm opacity-70">Fact: {s.fact}</p>}
                <div className="flex flex-wrap gap-2 text-sm items-center">
                  <input value={s.keywords.join(', ')} onChange={(e) => patch(s.id, { keywords: e.target.value.split(',').map((k) => k.trim()) })} className="inp flex-1 min-w-[140px]" />
                  <button className="btn" onClick={() => findBroll(s.id, s.keywords)}>Find footage</button>
                  <button className="btn" disabled={rb[s.id]} onClick={() => regen(s, i)}>{rb[s.id] ? 'Regenerating...' : 'Regenerate'}</button>
                  <button className="btn" onClick={() => move(i, -1)}>↑</button><button className="btn" onClick={() => move(i, 1)}>↓</button>
                  <button className="btn" onClick={() => setShots((a) => a.filter((x) => x.id !== s.id))}>Delete</button>
                </div>
              </div>
            </div>))}
          <button className="btn" onClick={addShot}>+ Add shot</button>
          {scriptText && (
            <div className="glass rounded-2xl p-6 text-[15px] space-y-2">
              <div className="flex justify-between items-center"><h3 className="font-semibold grad">Script</h3><button className="btn text-sm" onClick={() => navigator.clipboard?.writeText(scriptText)}>Copy</button></div>
              {shots.map((s, i) => s.line && <p key={s.id}><span className="hud mr-2">{sumDur(shots.slice(0, i))}s</span>{s.line}</p>)}
            </div>)}
        </section>)}
    </main>
  );
}

const ShotDetail = ({ s }: { s: Shot }) => (
  <div className="space-y-3 text-[15px] md:text-base">
    <p><span className="hud mr-2">Script</span>{s.line || '—'}</p>
    <p><span className="hud mr-2">Visual</span>{s.visual || '—'}</p>
    <p><span className="hud mr-2">Fact</span>{s.fact || '—'}</p>
    <p><span className="hud mr-2">B-roll</span>{s.broll ? <a className="underline" href={s.broll.link} target="_blank" rel="noreferrer">{s.broll.credit}</a> : s.brollIdea || '—'}</p>
  </div>
);
