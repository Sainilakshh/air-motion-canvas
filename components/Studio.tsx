'use client';
import { useEffect, useRef, useState } from 'react';
import { IconArrowDown, IconArrowUp, IconCheck, IconDownload, IconPlayerPlay, IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
import { loadProjects, saveProjects, type Proj } from '@/lib/projects';
import AirCanvas from './AirCanvas';
import AnimationStage from './AnimationStage';
import TopBar from './studio/TopBar';
import Composer, { type PlatformOpt } from './studio/Composer';
import PipelineRail, { type RailStep } from './studio/PipelineRail';
import EmptyState from './studio/EmptyState';
import Animatic from './studio/Animatic';
import { ImageGenerationLoader } from './ui/image-generation-loader';
import { DEMO, fallbackHooks, fallbackShots, findDemo, normalizeShot } from '@/lib/demo';
import { heuristicAnim } from '@/lib/animation';
import type { Hook, Item, RecognizeResult, Shot } from '@/lib/types';

const AI_DOWN = 'AI temporarily unavailable — your work is safe.';
const NEED_CODE = 'This idea needs live AI, which is locked. Enter the access code above, or try one of the demo concepts below.';
const NO_FOOTAGE = 'No relevant footage found — try another keyword.';
const UNCLEAR = "Couldn't confidently understand the drawing — try a simpler sketch, or pick an alternative below.";
const code = () => { try { return localStorage.getItem('amc.code') || ''; } catch { return ''; } };
const HINT: Record<string, string> = {
  QUOTA: 'Gemini quota reached — wait a minute and retry.', NOT_FOUND: 'Model not found — check GEMINI_MODEL on the server.',
  BAD_KEY: 'Gemini key rejected — check GEMINI_API_KEY on the server.', NO_KEY: 'Server is missing GEMINI_API_KEY.', NO_MODEL: 'Server is missing GEMINI_MODEL.',
  TIMEOUT: 'The AI took too long — retry.', EMPTY: 'The AI returned no answer — try rephrasing.', BAD_JSON: 'The AI answer was malformed — retry.',
  UPSTREAM: 'Gemini is having trouble — retry shortly.', NETWORK: 'Server could not reach Gemini — retry.',
};
let lastAiCode = '';
const uid = () => Math.random().toString(36).slice(2, 8);
const post = async (url: string, body: any) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-access-code': code() }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { if (d.code) lastAiCode = d.code; throw new Error(r.status === 401 ? '401' : d.error || 'fail'); }
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
const PLATFORMS: PlatformOpt[] = [{ key: 'reel', label: 'Instagram Reel', short: 'Reel', aspect: '9:16' }, { key: 'short', label: 'YouTube Short', short: 'Short', aspect: '9:16' }, { key: 'youtube', label: 'YouTube', short: 'YouTube', aspect: '16:9' }];
const EXAMPLE_IDEAS = ['A 30-second video about why rockets are expensive', 'How solar panels turn sunlight into electricity', 'The story of a tree growing from a tiny seed'];
const CONCEPTS = DEMO.map((d) => ({ name: d.r.labels[0].name, intent: d.r.intent, emoji: d.r.anim.emoji || '✨', backdrop: d.r.anim.backdrop }));
const kwq = (k: string[]) => k.map((x) => x.trim()).filter(Boolean).join('|');
const sumDur = (a: Shot[]) => a.reduce((t, s) => t + (Number(s.duration) || 0), 0);

const Sk = ({ n = 2 }: { n?: number }) => <div className="space-y-3">{Array.from({ length: n }).map((_, i) => <div key={i} className="h-3 rounded bg-white/10 animate-pulse" style={{ width: `${92 - i * 20}%` }} />)}</div>;
const Fld = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block"><span className="label mb-1 block">{label}</span>{children}</label>;
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
  const [mode, setMode] = useState<'type' | 'draw'>('type');
  const [play, setPlay] = useState(false);
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
  const [aiStatus, setAiStatus] = useState('ok');
  const [accessInfo, setAccessInfo] = useState({ ai: true, footage: true });
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
        const r = await fetch('/api/access?deep=1', { headers: { 'x-access-code': codeVal } });
        if (r.ok) { const d = await r.json().catch(() => ({})); setAccessInfo({ ai: d.ai !== false, footage: d.footage !== false }); setAccess('live'); const st = d.aiStatus || 'ok'; setAiStatus(st); if (st !== 'ok') { lastAiCode = st; warn(AI_DOWN); } } else setAccess('locked');
      } catch { setAccess('locked'); }
    }, 400);
    return () => clearTimeout(t);
  }, [codeVal]);
  // Ek hi banner: locked/AI-down ke messages ek dusre ko replace karte hain, stack nahi hote
  const isSoft = (y: string) => y.startsWith(AI_DOWN) || y === NEED_CODE;
  const warn = (m0: string) => {
    const m = m0 === AI_DOWN && HINT[lastAiCode] ? AI_DOWN + ' ' + HINT[lastAiCode] : m0;
    setMsg((x) => (x.includes(m) ? x : isSoft(m) ? [...x.filter((y) => !isSoft(y)), m] : [...x, m]));
  };
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

  const submit = () => { if (idea.trim()) { setMode('type'); run({ text: idea.trim() }); } };
  const generating = busy.und || busy.fact || busy.plan;
  const anyBusy = generating || busy.script;
  const started = !!und || anyBusy || shots.length > 0;
  const stp = (active: boolean, done: boolean): RailStep['state'] => (active ? 'active' : done ? 'done' : 'pending');
  const brollSearching = shots.some((s) => s.note === 'Searching B-roll...');
  const rail: RailStep[] = [
    { label: 'Understand', state: stp(busy.und, !!und) },
    { label: 'Research', state: stp(busy.fact, !!fact || (!!und && !busy.und && !busy.fact && (busy.plan || shots.length > 0))) },
    { label: 'Plan', state: stp(busy.plan, shots.length > 0) },
    { label: 'B-roll', state: stp(shots.length > 0 && brollSearching, shots.length > 0 && !brollSearching) },
    { label: 'Script', state: stp(busy.script, !!hook && shots.some((s) => !!s.line)) },
  ];
  const pct = und ? Math.round(und.labels[0].confidence * 100) : 0;

  return (
    <div className="min-h-screen">
      <TopBar saved={savedAt} projects={projects} curId={curId} onNew={newProject} onSave={saveProject} onOpen={openProject} onDelete={deleteProject} onRename={renameProject}
        access={access} aiStatus={aiStatus} accessInfo={accessInfo} codeVal={codeVal} onCode={(v) => { setCodeVal(v); try { localStorage.setItem('amc.code', v); } catch {} }} />
      <main className="mx-auto max-w-[1200px] space-y-6 px-5 pb-28 pt-10">
        {!started && (
          <div className="pb-2 pt-4 text-center">
            <h1 className="mx-auto max-w-[16ch] text-[clamp(38px,6vw,68px)] font-semibold leading-[1.04] tracking-tight">Turn a rough idea into a <span style={{ background: 'linear-gradient(90deg,#ff6a4d,#8b5cf6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>visual story</span>.</h1>
            <p className="mx-auto mt-4 max-w-xl text-[17px] text-zinc-400">Type it, say it, or sketch it. You get the concept, B-roll, research, hooks, a script and a storyboard.</p>
          </div>)}

        <Composer mode={mode} setMode={setMode} idea={idea} setIdea={setIdea} onSubmit={submit} busy={generating}
          platforms={PLATFORMS} platform={platform} setPlatform={(k) => applyPreset(k as PK)} target={target} setTarget={setTarget} onNotice={warn}>
          <AirCanvas onResult={onDrawResult} onError={onDrawError} />
        </Composer>

        {started && <PipelineRail steps={rail} />}
        {anyBusy && (
          <div className="relative h-24 overflow-hidden rounded-2xl border border-white/[0.06] bg-neutral-900">
            <ImageGenerationLoader effect="scale-wave" easing="ease-in-out" text={busy.und ? 'Analysing' : busy.fact ? 'Researching' : 'Writing'} cellSize={3} gap={1} bandHeight={40} colors={['#ff7a62', '#8b5cf6']} />
          </div>)}
        {msg.map((m) => <p key={m} className="surface-hi px-4 py-3 text-[15px] text-zinc-300" role="status">{m}</p>)}
        {failDraw && (
          <div className="flex flex-wrap items-center gap-2"><span className="label">Try a demo concept:</span>
            {DEMO.map((d) => <button key={d.r.labels[0].name} type="button" className="chip" onClick={() => { setIdea(d.r.labels[0].name); setMode('type'); run({ text: d.r.labels[0].name }); }}>{d.r.labels[0].name}</button>)}</div>)}

        {!started && <EmptyState concepts={CONCEPTS} examples={EXAMPLE_IDEAS} onPick={(n) => { setIdea(n); setMode('type'); run({ text: n }); }} onExample={(t) => { setIdea(t); setMode('type'); run({ text: t }); }} />}

        {/* Understanding + Research (bento) */}
        {(busy.und || und || busy.fact || fact) && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
            {(busy.und || und) && (
              <section className={`surface rise p-6 sm:p-7 ${busy.fact || fact ? '' : 'lg:col-span-2'}`}>
                <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
                  <div className="min-w-0 space-y-4">
                    <p className="label">Understanding</p>
                    {busy.und && <Sk n={3} />}
                    {und && (<>
                      <h2 className="text-[clamp(30px,4vw,44px)] font-semibold tracking-tight">{und.labels[0].name}</h2>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="chip !cursor-default">{und.intent}</span>
                        <span className="chip !cursor-default"><span className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-gradient-to-r from-[#ff6a4d] to-[#8b5cf6]" style={{ width: `${pct}%` }} /></span>{pct}% sure</span>
                      </div>
                      <p className="text-[16px] leading-relaxed text-zinc-300">{und.context}</p>
                      <p className="label">Visual direction · <span className="text-zinc-300">{und.visualDirection}</span></p>
                      <div className="flex flex-wrap gap-2">{und.keywords.map((k) => <span key={k} className="rounded-full border border-white/[0.07] px-3 py-1 text-[14px] text-zinc-300">{k}</span>)}</div>
                      {und.labels.length > 1 && (<div className="flex flex-wrap items-center gap-2"><span className="label">Did you mean?</span>
                        {und.labels.slice(1).map((l) => <button key={l.name} type="button" className="chip" onClick={() => { setIdea(l.name); run({ text: l.name, keepSketch: true }); }}>{l.name} <span className="text-zinc-500">{Math.round(l.confidence * 100)}%</span></button>)}</div>)}
                    </>)}
                  </div>
                  {und && <div style={{ width: P.aspect === '9:16' ? 168 : 320 }} className="max-w-full justify-self-center"><AnimationStage anim={und.anim} sketch={sketch || undefined} ratio={P.ratio} label={`${und.labels[0].name} → ${und.intent}`} /></div>}
                </div>
              </section>)}
            {(busy.fact || fact) && (
              <section className="surface p-6 sm:p-7">
                <p className="label mb-3">Research</p>
                {busy.fact && <Sk n={4} />}
                {fact && <><p className="text-[16px] leading-relaxed text-zinc-200">{fact.extract}</p>
                  <p className="label mt-4">Source · {fact.url ? <a className="text-zinc-300 underline underline-offset-2" href={fact.url} target="_blank" rel="noreferrer">{fact.source}{fact.source === 'Wikipedia' ? ' (CC BY-SA)' : ''}</a> : <span className="text-zinc-300">{fact.source}</span>}</p></>}
              </section>)}
          </div>)}

        {/* Hooks */}
        {(busy.plan || hooks.length > 0) && (
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3"><h2 className="text-2xl font-semibold tracking-tight">Choose your hook</h2><span className="label">{hooks.length > 0 && !hook ? 'It becomes the opening line of your script' : busy.script ? 'Writing the script…' : ''}</span></div>
            {busy.plan && <div className="surface p-6"><Sk n={3} /></div>}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{hooks.map((h, hi) => {
              const on = hook === h.text;
              return (
                <button key={h.style} type="button" style={{ ['--i' as any]: hi }} onClick={() => pickHook(h.text)} aria-pressed={on} className={`rise hook-card relative rounded-2xl border p-5 text-left transition-colors ${on ? 'border-[#ff6a4d]/60 bg-[#ff6a4d]/[0.07]' : 'border-white/[0.07] bg-[#131316] hover:border-white/20'}`}>
                  <span className="label flex items-center gap-2">{h.style}{on && <IconCheck size={14} className="text-[#ff6a4d]" />}</span>
                  <span className="mt-2 block text-[17px] leading-snug text-zinc-100">{h.text}</span>
                </button>);
            })}</div>
          </section>)}

        {/* Content plan: edit, then commit */}
        {(busy.plan || shots.length > 0) && !committed && (
          <section className="surface rise space-y-4 p-6 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-2"><h2 className="text-2xl font-semibold tracking-tight">Content plan</h2><span className="label">Edit anything, then commit to the storyboard</span></div>
            {busy.plan && <Sk n={4} />}
            {shots.map((s, i) => (
              <div key={s.id} className="surface-hi space-y-3 p-4">
                <div className="flex items-end gap-3">
                  <span className="pb-2 text-lg font-semibold text-zinc-500">{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex-1"><Fld label="Shot title"><input value={s.title} onChange={(e) => patch(s.id, { title: e.target.value })} className="inp w-full font-semibold" /></Fld></div>
                  <div className="w-20"><Fld label="Seconds"><input type="number" value={s.duration} onChange={(e) => patch(s.id, { duration: Number(e.target.value) })} className="inp w-full" /></Fld></div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Fld label="Visual suggestion"><input value={s.visual} onChange={(e) => patch(s.id, { visual: e.target.value })} className="inp w-full" /></Fld>
                  <Fld label="B-roll suggestion"><input value={s.brollIdea} onChange={(e) => patch(s.id, { brollIdea: e.target.value })} className="inp w-full" /></Fld>
                  <Fld label="Relevant fact"><input value={s.fact} onChange={(e) => patch(s.id, { fact: e.target.value })} className="inp w-full" /></Fld>
                  <Fld label="Script line"><input value={s.line} onChange={(e) => patch(s.id, { line: e.target.value })} className="inp w-full" /></Fld>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="chip" disabled={rb[s.id]} onClick={() => regen(s, i)}><IconRefresh size={15} className={rb[s.id] ? 'animate-spin' : ''} />{rb[s.id] ? 'Regenerating…' : 'Regenerate'}</button>
                  <button type="button" className="chip" onClick={() => setShots((a) => a.filter((x) => x.id !== s.id))}><IconTrash size={15} />Remove</button>
                </div>
              </div>))}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="chip" onClick={addShot}><IconPlus size={15} />Add shot</button><span className="flex-1" />
              <span className="label">Total ~{total}s</span>
              <button type="button" className="cta" disabled={!shots.length || busy.plan} onClick={() => setCommitted(true)}>Commit to storyboard</button>
            </div>
          </section>)}

        {/* Storyboard */}
        {shots.length > 0 && committed && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-2xl font-semibold tracking-tight">Storyboard</h2>
                <p className={`label mt-1 ${total > target ? '!text-[#ff9d8a]' : ''}`}>~{total}s of {target}s target{shots.length > 0 && Math.abs(total - target) > 2 && <button type="button" className="ml-2 text-zinc-300 underline underline-offset-2" onClick={() => fit(target)}>Fit to target</button>}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="chip" onClick={() => setCommitted(false)}>Edit plan</button>
                <button type="button" className="chip" onClick={exportMd}><IconDownload size={15} />Export .md</button>
                <button type="button" className="cta" onClick={() => setPlay(true)}><IconPlayerPlay size={18} />Play storyboard</button>
              </div>
            </div>
            {hook && <p className="surface-hi px-4 py-3 text-[16px]"><span className="label mr-2">Hook</span>{hook}</p>}
            <div className="flex h-14 gap-1 text-[13px]" aria-label="Timeline">
              {shots.map((s, i) => {
                const st = sumDur(shots.slice(0, i)), d = Number(s.duration) || 0;
                return (<button key={s.id} type="button" onClick={() => document.getElementById('shot-' + s.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} style={{ flex: Math.max(d, 1), ['--i' as any]: Math.min(i, 8) }} title={s.title}
                  className="rise flex min-w-0 flex-col justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-[linear-gradient(135deg,rgba(255,106,77,.28),rgba(139,92,246,.28))] px-3 text-left transition-colors hover:bg-[linear-gradient(135deg,rgba(255,106,77,.45),rgba(139,92,246,.45))]">
                  <span className="truncate font-medium text-white">{st}–{st + d}s</span><span className="truncate text-zinc-300/80">Shot {String(i + 1).padStart(2, '0')}</span></button>);
              })}
            </div>
            {shots.map((s, i) => (
              <div id={'shot-' + s.id} key={s.id} className="surface rise grid scroll-mt-24 gap-4 p-4 sm:p-5 md:grid-cols-[minmax(150px,200px)_minmax(150px,200px)_minmax(0,1fr)]" style={{ ['--i' as any]: Math.min(i, 8) }}>
                <div><p className="label mb-1.5">Visual</p><AnimationStage anim={s.anim} sketch={stageFor(s)} ratio={P.ratio} compact />
                  <p className="mt-1.5 truncate text-[12px] text-zinc-500">{s.anim.primitives.map((p) => p.type).join(' + ')}</p></div>
                <div><p className="label mb-1.5">B-roll</p>
                  {s.broll ? <><Clip it={s.broll} ratio={P.ratio} /><span className="mt-1 block truncate text-[12px] text-zinc-500">{s.broll.credit}</span></>
                    : <div className="surface-hi flex items-center p-3 text-[13px] text-zinc-500" style={{ aspectRatio: P.ratio }}>{s.note || 'Finding B-roll…'}</div>}
                  {s.options.length > 1 && <div className="mt-2 flex gap-1.5">{s.options.map((o) => <button key={o.link} type="button" onClick={() => patch(s.id, { broll: o })} aria-label="Use this footage" className={`h-7 w-7 overflow-hidden rounded-md border ${o.link === s.broll?.link ? 'border-[#ff6a4d]' : 'border-white/10'}`}><img src={o.thumb} alt="" className="h-full w-full object-cover" /></button>)}</div>}
                  <button type="button" className="chip mt-2 !px-3 !py-1 text-[13px]" onClick={() => findBroll(s.id, s.keywords, (s.page || 1) + 1)}>More footage</button>
                </div>
                <div className="min-w-0 space-y-2.5">
                  <div className="flex items-center gap-2"><span className="w-7 text-lg font-semibold text-zinc-500">{String(i + 1).padStart(2, '0')}</span>
                    <input value={s.title} onChange={(e) => patch(s.id, { title: e.target.value })} className="inp min-w-0 flex-1 font-semibold" aria-label="Shot title" />
                    <input type="number" value={s.duration} onChange={(e) => patch(s.id, { duration: Number(e.target.value) })} className="inp w-16" aria-label="Seconds" /><span className="label">s</span></div>
                  <div className="flex items-center gap-2"><span className="label w-14 shrink-0">Concept</span>
                    <input value={s.concept} onChange={(e) => patch(s.id, { concept: e.target.value })} onBlur={(e) => { if (e.target.value && s.anim.emoji !== heuristicAnim(e.target.value).emoji && !s.anim.svg) patch(s.id, { anim: heuristicAnim(e.target.value + ' ' + s.title) }); }} className="inp min-w-0 flex-1" /></div>
                  <input value={s.visual} onChange={(e) => patch(s.id, { visual: e.target.value })} placeholder="Visual" className="inp w-full" aria-label="Visual" />
                  <textarea value={s.line} onChange={(e) => patch(s.id, { line: e.target.value })} rows={2} className="inp w-full" placeholder="Script line" aria-label="Script line" />
                  {s.fact && <p className="text-[14px] text-zinc-400"><span className="label mr-1">Fact</span>{s.fact}</p>}
                  <div className="flex flex-wrap items-center gap-2">
                    <input value={s.keywords.join(', ')} onChange={(e) => patch(s.id, { keywords: e.target.value.split(',').map((k) => k.trim()) })} className="inp min-w-[140px] flex-1" aria-label="B-roll keywords" />
                    <button type="button" className="chip" onClick={() => findBroll(s.id, s.keywords)}>Find footage</button>
                    <button type="button" className="chip" disabled={rb[s.id]} onClick={() => regen(s, i)}><IconRefresh size={15} className={rb[s.id] ? 'animate-spin' : ''} />{rb[s.id] ? 'Regenerating…' : 'Regenerate'}</button>
                    <button type="button" className="iconbtn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><IconArrowUp size={16} /></button>
                    <button type="button" className="iconbtn" onClick={() => move(i, 1)} disabled={i === shots.length - 1} aria-label="Move down"><IconArrowDown size={16} /></button>
                    <button type="button" className="iconbtn" onClick={() => setShots((a) => a.filter((x) => x.id !== s.id))} aria-label="Delete shot"><IconTrash size={16} /></button>
                  </div>
                </div>
              </div>))}
            <button type="button" className="chip" onClick={addShot}><IconPlus size={15} />Add shot</button>
            {scriptText && (
              <div className="surface space-y-2 p-6">
                <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Script</h3><button type="button" className="chip" onClick={() => navigator.clipboard?.writeText(scriptText)}>Copy</button></div>
                {shots.map((s, i) => s.line && <p key={s.id} className="text-[16px] leading-relaxed text-zinc-200"><span className="label mr-3 tabular-nums">{sumDur(shots.slice(0, i))}s</span>{s.line}</p>)}
              </div>)}
          </section>)}
      </main>
      {play && shots.length > 0 && <Animatic shots={shots} ratio={P.ratio} sketchFor={stageFor} onClose={() => setPlay(false)} />}
    </div>
  );
}
