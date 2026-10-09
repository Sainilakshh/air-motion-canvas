'use client';
import { useEffect, useRef, useState } from 'react';
import { IconChevronDown, IconDownload, IconX } from '@tabler/icons-react';
import { useOutsideClick } from '@/lib/use-outside-click';
import { download, slug, toCsv, toSrt } from '@/lib/export';
import { exportVideo, type Progress } from '@/lib/videoExport';
import type { Shot } from '@/lib/types';

type Props = { shots: Shot[]; aspect: string; title: string; script: string; sketchFor: (s: Shot) => string | undefined; headers: () => Record<string, string>; onMd: () => void };

export default function ExportMenu(p: Props) {
  const [open, setOpen] = useState(false), [dlg, setDlg] = useState(false);
  const [prog, setProg] = useState<Progress>({ phase: 'load', pct: 0 });
  const [res, setRes] = useState<{ url: string; blob: Blob; ext: string; fallbacks: number } | null>(null), [err, setErr] = useState('');
  const ref = useRef<HTMLDivElement>(null), ctl = useRef<AbortController | null>(null);
  useOutsideClick(ref, () => setOpen(false));
  useEffect(() => () => { ctl.current?.abort(); }, []);
  useEffect(() => () => { if (res) URL.revokeObjectURL(res.url); }, [res]);
  const name = slug(p.title), portrait = p.aspect === '9:16';

  const start = async () => {
    setOpen(false); setDlg(true); setErr(''); setRes(null); setProg({ phase: 'load', pct: 0, note: 'Preparing…' });
    const c = new AbortController(); ctl.current = c;
    try {
      const r = await exportVideo({ shots: p.shots, w: portrait ? 720 : 1280, h: portrait ? 1280 : 720, sketchFor: p.sketchFor, headers: p.headers(), onProgress: setProg, signal: c.signal });
      setRes({ url: URL.createObjectURL(r.blob), blob: r.blob, ext: r.ext, fallbacks: r.fallbacks });
    } catch (e: any) { if (e?.message !== 'cancelled') setErr(e?.message || 'Export failed'); else setDlg(false); }
  };
  const close = () => { ctl.current?.abort(); setDlg(false); };
  const item = 'flex w-full flex-col rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.06]';
  const pct = Math.round(((prog.phase === 'load' ? prog.pct * 0.3 : 0.3 + prog.pct * 0.7)) * 100);

  return (
    <div ref={ref} className="relative">
      <button type="button" className="chip" onClick={() => setOpen((v) => !v)} aria-expanded={open}><IconDownload size={15} />Export<IconChevronDown size={14} /></button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[300px] max-w-[88vw] rounded-2xl border border-white/[0.08] bg-[#131316] p-2 shadow-2xl">
          <button type="button" className={item} onClick={start}><span className="text-[15px] font-medium text-white">Video (.webm)</span><span className="label">Footage + captions burned in, silent. Takes as long as the video.</span></button>
          <button type="button" className={item} onClick={() => { download(name + '.srt', toSrt(p.shots), 'application/x-subrip;charset=utf-8'); setOpen(false); }}><span className="text-[15px] font-medium text-white">Captions (.srt)</span><span className="label">Import in CapCut, Premiere, YouTube, Instagram</span></button>
          <button type="button" className={item} onClick={() => { download(name + '-shotlist.csv', toCsv(p.shots), 'text/csv;charset=utf-8'); setOpen(false); }}><span className="text-[15px] font-medium text-white">Shot list (.csv)</span><span className="label">Timing, script, footage links, credits</span></button>
          <button type="button" className={item} onClick={() => { p.onMd(); setOpen(false); }}><span className="text-[15px] font-medium text-white">Storyboard (.md)</span><span className="label">Full document</span></button>
          <button type="button" className={item} onClick={() => { download(name + '-script.txt', p.script); setOpen(false); }}><span className="text-[15px] font-medium text-white">Script (.txt)</span><span className="label">Just the voiceover lines</span></button>
        </div>)}
      {dlg && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Video export">
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#131316] p-6">
            <button type="button" className="iconbtn absolute right-4 top-4" onClick={close} aria-label="Close"><IconX size={16} /></button>
            <h3 className="text-xl font-semibold">{res ? 'Your video is ready' : err ? 'Export failed' : 'Rendering video'}</h3>
            {!res && !err && (<>
              <p className="label mt-3">{prog.note}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#ff6a4d] to-[#8b5cf6] transition-[width]" style={{ width: pct + '%' }} /></div>
              <p className="label mt-3">The video is recorded live, so it takes as long as it plays. Leave this tab in front.</p>
              <button type="button" className="chip mt-5" onClick={close}>Cancel</button></>)}
            {err && <><p className="mt-3 text-[15px] text-zinc-300">{err}</p><button type="button" className="chip mt-5" onClick={start}>Try again</button></>}
            {res && (<>
              <video src={res.url} controls playsInline className="mt-4 w-full rounded-2xl bg-black" style={{ maxHeight: '52vh' }} />
              {res.fallbacks > 0 && <p className="label mt-3">{res.fallbacks} clip{res.fallbacks > 1 ? 's' : ''} could not be loaded for export (blocked by the host or too big), so a still or the animation was used instead.</p>}
              <p className="label mt-3">No voice in this file: add your voiceover in your editor and import the .srt for timing.</p>
              <button type="button" className="cta mt-5" onClick={() => download(`${name}.${res.ext}`, res.blob)}><IconDownload size={16} />Download .{res.ext}</button></>)}
          </div>
        </div>)}
    </div>
  );
}
