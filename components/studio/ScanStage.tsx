'use client';
import AnimationStage from '@/components/AnimationStage';
import type { AnimSpec } from '@/lib/types';

// "Understanding" ka visual: AI ne kya pakda woh dikhata hai. Subject par lock-on brackets, scan line, label + confidence tag, aur keywords jo bahar nikalte hain.
export default function ScanStage({ anim, sketch, ratio, label, intent, pct, keywords }: { anim: AnimSpec; sketch?: string; ratio: string; label: string; intent: string; pct: number; keywords: string[] }) {
  return (
    <div className="scan relative" style={{ containerType: 'inline-size' }}>
      <AnimationStage anim={anim} sketch={sketch} ratio={ratio} compact />
      <div className="scan-ov" aria-hidden="true">
        <i className="scan-line" />
        <i className="scan-box"><b className="c tl" /><b className="c tr" /><b className="c bl" /><b className="c br" /></i>
        <span className="scan-tag" style={{ ['--d' as any]: '.9s' }}><b>{label}</b><em>{pct}%</em></span>
        <span className="scan-tag alt" style={{ ['--d' as any]: '1.3s' }}>{intent}</span>
        {keywords.slice(0, 4).map((k, i) => <span key={k} className={`scan-kw k${i}`} style={{ ['--d' as any]: `${1.6 + i * 0.25}s` }}>{k}</span>)}
      </div>
    </div>
  );
}
