export type Concept = { name: string; intent: string; emoji: string; backdrop: string };
export default function EmptyState({ concepts, examples, onPick, onExample }: { concepts: Concept[]; examples: string[]; onPick: (name: string) => void; onExample: (t: string) => void }) {
  return (
    <section className="space-y-10 pt-2">
      <div>
        <div className="mb-4 flex items-end justify-between"><h2 className="text-2xl font-semibold tracking-tight">Start from a concept</h2><span className="label hidden sm:block">Tap one to see the whole flow</span></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {concepts.map((c) => (
            <button key={c.name} type="button" onClick={() => onPick(c.name)} className={`tile bd-${c.backdrop}`} aria-label={`Start with ${c.name}`}>
              {c.backdrop === 'space' && <div className="fx-stars" />}
              <span className="emo">{c.emoji}</span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8"><span className="block text-[15px] font-semibold leading-tight">{c.name}</span><span className="block text-[12px] text-zinc-400">{c.intent}</span></span>
            </button>))}
        </div>
      </div>
      <div>
        <p className="label mb-3">Or try an idea</p>
        <div className="flex flex-wrap gap-2">{examples.map((t) => <button key={t} type="button" className="chip !rounded-2xl !py-2.5 text-left" onClick={() => onExample(t)}>{t}</button>)}</div>
      </div>
    </section>
  );
}
