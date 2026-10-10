'use client';
import { IconDownload } from '@tabler/icons-react';
import { download, slug, toEdl, toSrt, toVtt } from '@/lib/export';
import type { Shot } from '@/lib/types';

function time(sec: number) {
  const n = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}

export default function EditorHandoff({ shots, title }: { shots: Shot[]; title: string }) {
  let cursor = 0;
  const cues = shots.map((shot) => {
    const start = cursor;
    cursor += Math.max(0.5, Number(shot.duration) || 0);
    return { shot, start, end: cursor };
  });
  const name = slug(title);

  return (
    <section className="grid gap-4 lg:grid-cols-2" aria-label="Editor handoff">
      <div className="surface space-y-4 p-5 sm:p-6">
        <div>
          <p className="label">Premiere Pro · DaVinci Resolve</p>
          <h3 className="mt-1 text-xl font-semibold">Editor timeline</h3>
          <p className="mt-1 text-[13px] text-zinc-400">CMX 3600 EDL with shot cuts, durations and footage source links.</p>
        </div>
        <div className="flex h-8 gap-1 overflow-hidden rounded-lg" aria-label="Timeline overview">
          {cues.map(({ shot }, i) => <div key={shot.id} className="flex min-w-0 items-center px-2 text-[11px] font-medium text-white" style={{ flex: Math.max(1, Number(shot.duration) || 1), background: i % 2 ? '#8b5cf6' : '#ff6a4d' }}>Shot {i + 1}</div>)}
        </div>
        <div className="space-y-1.5">
          {cues.map(({ shot, start, end }, i) => <div key={shot.id} className="flex items-center gap-3 text-[13px]"><span className="w-12 shrink-0 font-mono text-zinc-500">{time(start)}–{time(end)}</span><span className="min-w-0 flex-1 truncate text-zinc-200">{shot.title || `Shot ${i + 1}`}</span><span className="shrink-0 text-zinc-500">{(end - start).toFixed(1)}s</span></div>)}
        </div>
        <button type="button" className="chip" onClick={() => download(`${name}-timeline.edl`, toEdl(shots, title))}><IconDownload size={15} />Download EDL</button>
      </div>

      <div className="surface space-y-4 p-5 sm:p-6">
        <div>
          <p className="label">Timed to your script</p>
          <h3 className="mt-1 text-xl font-semibold">Captions</h3>
          <p className="mt-1 text-[13px] text-zinc-400">Review each shot’s caption, then download subtitles for your editor.</p>
        </div>
        <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
          {cues.map(({ shot, start, end }, i) => <div key={shot.id} className="rounded-xl bg-black/20 px-3 py-2.5">
            <p className="label">{time(start)}–{time(end)} · Shot {i + 1}</p>
            <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-zinc-200">{shot.line || <span className="text-zinc-500">No caption yet — add a script line above.</span>}</p>
          </div>)}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="chip" onClick={() => download(`${name}-captions.srt`, toSrt(shots), 'application/x-subrip;charset=utf-8')}><IconDownload size={15} />Download SRT</button>
          <button type="button" className="chip" onClick={() => download(`${name}-captions.vtt`, toVtt(shots), 'text/vtt;charset=utf-8')}><IconDownload size={15} />Download VTT</button>
        </div>
      </div>
    </section>
  );
}
