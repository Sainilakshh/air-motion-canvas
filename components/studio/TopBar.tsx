'use client';
import { useRef, useState } from 'react';
import { IconCheck, IconChevronDown, IconFolder, IconLock, IconPlus, IconTrash } from '@tabler/icons-react';
import { useOutsideClick } from '@/lib/use-outside-click';
import type { Proj } from '@/lib/projects';

type Props = {
  saved: number; projects: Proj[]; curId: string;
  onNew: () => void; onSave: () => void; onOpen: (p: Proj) => void; onDelete: (id: string) => void; onRename: (id: string, name: string) => void;
  access: 'checking' | 'live' | 'locked'; aiStatus: string; accessInfo: { ai: boolean; footage: boolean };
  codeVal: string; onCode: (v: string) => void;
};

export default function TopBar(p: Props) {
  const [proj, setProj] = useState(false), [stat, setStat] = useState(false);
  const projRef = useRef<HTMLDivElement>(null), statRef = useRef<HTMLDivElement>(null);
  useOutsideClick(projRef, () => setProj(false));
  useOutsideClick(statRef, () => setStat(false));
  const live = p.access === 'live', issue = live && p.aiStatus !== 'ok';
  const label = live ? (issue ? 'AI issue' : 'Live AI') : p.access === 'checking' ? 'Checking…' : 'Demo mode · Unlock';
  const dot = live ? (issue ? 'bg-amber-400' : 'bg-emerald-400') : p.access === 'checking' ? 'bg-zinc-500' : 'bg-[#ff6a4d]';

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#09090b]/95">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-5">
        <a href="/" className="flex items-center gap-3" aria-label="Air Motion Canvas home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl text-base font-bold text-white" style={{ background: 'linear-gradient(135deg,#ff6a4d,#8b5cf6)' }}>A</span>
          <span className="hidden text-[17px] font-semibold tracking-tight sm:block" style={{ fontFamily: 'var(--font-display)' }}>Air Motion Canvas</span>
        </a>
        <span className="flex-1" />
        {p.saved > 0 && p.curId && <span className="label hidden items-center gap-1.5 md:flex"><IconCheck size={14} className="text-emerald-400" />Saved {new Date(p.saved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}

        <div ref={projRef} className="relative">
          <button type="button" className="chip" onClick={() => { setProj((v) => !v); setStat(false); }} aria-expanded={proj}><IconFolder size={16} />Projects<span className="text-zinc-500">{p.projects.length}</span><IconChevronDown size={14} /></button>
          {proj && (
            <div className="absolute right-0 mt-2 w-[360px] max-w-[92vw] rounded-2xl border border-white/[0.08] bg-[#131316] p-3 shadow-2xl">
              <div className="mb-2 flex gap-2">
                <button type="button" className="chip flex-1 justify-center" onClick={() => { p.onNew(); setProj(false); }}><IconPlus size={15} />New project</button>
                <button type="button" className="chip flex-1 justify-center" onClick={p.onSave}>Save now</button>
              </div>
              <div className="max-h-72 space-y-1 overflow-auto">
                {p.projects.length === 0 && <p className="label px-2 py-5 text-center">No saved projects yet. Press “Save now” — the current one then auto-saves.</p>}
                {p.projects.map((x) => (
                  <div key={x.id} className={`group flex items-center gap-1 rounded-xl p-1.5 ${x.id === p.curId ? 'bg-[#ff6a4d]/10' : 'hover:bg-white/[0.04]'}`}>
                    <input value={x.name} onChange={(e) => p.onRename(x.id, e.target.value)} className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 text-[15px] outline-none focus:bg-white/5" aria-label="Project name" />
                    <button type="button" className="chip !px-3 !py-1 text-[13px]" onClick={() => { p.onOpen(x); setProj(false); }}>Open</button>
                    <button type="button" className="iconbtn !h-8 !w-8 !border-0 !bg-transparent" onClick={() => p.onDelete(x.id)} aria-label={`Delete ${x.name}`}><IconTrash size={16} /></button>
                  </div>))}
              </div>
            </div>)}
        </div>

        <div ref={statRef} className="relative">
          <button type="button" className="chip" onClick={() => { setStat((v) => !v); setProj(false); }} aria-expanded={stat}>
            {live || p.access === 'checking' ? <span className={`h-2 w-2 rounded-full ${dot}`} /> : <IconLock size={15} className="text-[#ff6a4d]" />}{label}
          </button>
          {stat && (
            <div className="absolute right-0 mt-2 w-[320px] max-w-[92vw] rounded-2xl border border-white/[0.08] bg-[#131316] p-4 text-[15px] leading-relaxed text-zinc-300 shadow-2xl">
              <p className="mb-1 font-semibold text-white">{live ? (issue ? 'Live AI — with a problem' : 'Live AI is on') : 'Demo mode'}</p>
              <p className="label mb-3">{live
                ? `Access code accepted.${!p.accessInfo.ai ? ' GEMINI_API_KEY / GEMINI_MODEL are not set on the server.' : ''}${!p.accessInfo.footage ? ' Footage works without keys (Wikimedia); add a free PIXABAY_API_KEY for better results.' : ''}`
                : 'Without a code only the 8 demo concepts run. Enter the DEMO_ACCESS_CODE set on the server to unlock live AI.'}</p>
              <input type="password" value={p.codeVal} onChange={(e) => p.onCode(e.target.value)} placeholder="Access code" aria-label="Access code" autoComplete="off" className="inp w-full" />
            </div>)}
        </div>
      </div>
    </header>
  );
}
