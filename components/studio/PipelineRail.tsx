import { IconCheck } from '@tabler/icons-react';
export type RailStep = { label: string; state: 'pending' | 'active' | 'done' };
export default function PipelineRail({ steps }: { steps: RailStep[] }) {
  return (
    <ol className="surface flex items-center gap-3 px-5 py-4" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s.label} className="flex flex-1 items-center gap-3 last:flex-none" aria-current={s.state === 'active' ? 'step' : undefined}>
          <span className="rail-dot" data-s={s.state}>{s.state === 'done' ? <IconCheck size={13} stroke={3} /> : i + 1}</span>
          <span className={`${s.state === 'active' ? 'text-white' : s.state === 'done' ? 'text-zinc-300' : 'text-zinc-500'} ${s.state === 'active' ? '' : 'hidden sm:inline'} whitespace-nowrap text-[15px] font-medium`}>{s.label}</span>
          {i < steps.length - 1 && <span className="rail-line" data-on={s.state === 'done'} />}
        </li>))}
    </ol>
  );
}
