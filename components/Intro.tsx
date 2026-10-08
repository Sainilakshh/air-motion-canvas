'use client';
import { useState } from 'react';
import { HoveredLink, Menu, MenuItem } from '@/components/ui/navbar-menu';
import { MacbookScroll } from '@/components/ui/macbook-scroll';
import { CardSpotlight } from '@/components/ui/card-spotlight';
import { Timeline } from '@/components/ui/timeline';

const P = ({ children }: { children: React.ReactNode }) => <p className="mb-8 text-xs md:text-sm text-neutral-800 dark:text-neutral-200 max-w-xl">{children}</p>;
const steps = [
  ['1. Idea', 'Type a rough idea like "A 30-second video about why rockets are expensive", or draw it in the air. No camera? Mouse and touch work too.'],
  ['2. Understand', 'Gemini finds the concept, intent and keywords, and shows alternatives when it is unsure.'],
  ['3. Research', 'Facts come from Wikipedia first, with a source link. AI only rewrites them for creators.'],
  ['4. Hook + script', 'Pick one of four hook styles. Every shot gets its own script line.'],
  ['5. B-roll', 'Pexels footage (Pixabay as fallback) for each shot, replaceable any time.'],
  ['6. Storyboard', 'Edit, reorder and time your shots for Reel, Short or YouTube. Save and reopen projects.'],
].map(([title, text]) => ({ title, content: <div><P>{text}</P></div> }));

export default function Intro() {
  const [active, setActive] = useState<string | null>(null);
  return (
    <main>
      <div className="fixed inset-x-0 top-6 z-50 mx-auto max-w-md">
        <Menu setActive={setActive}>
          <MenuItem setActive={setActive} active={active} item="Product">
            <div className="flex flex-col space-y-4 text-sm">
              <HoveredLink href="#how">How it works</HoveredLink>
              <HoveredLink href="/studio">Open Studio</HoveredLink>
            </div>
          </MenuItem>
          <MenuItem setActive={setActive} active={active} item="Platforms">
            <div className="flex flex-col space-y-4 text-sm">
              <HoveredLink href="/studio">Instagram Reel</HoveredLink>
              <HoveredLink href="/studio">YouTube Short</HoveredLink>
              <HoveredLink href="/studio">YouTube</HoveredLink>
            </div>
          </MenuItem>
        </Menu>
      </div>
      <a href="/studio" className="btn fixed right-4 top-6 z-50 text-sm bg-black/60">Skip to app →</a>
      <div className="w-full overflow-hidden bg-[#09090b]"><MacbookScroll src="/intro/screen.png" showGradient={false} title={<span>Idea in. <span style={{ color: "#ff6a4d" }}>Storyboard</span> out.</span>} /></div>
      <section id="how"><Timeline data={steps} heading="How Air Motion Canvas works" sub="From rough idea to storyboard in six steps." /></section>
      <section className="py-20 px-4"><div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        {[['Private by design', 'Hand tracking runs locally in your browser. Webcam video is never uploaded or stored.'], ['Fails gracefully', 'If AI or footage is unavailable, you get a clear message and demo data instead of a broken screen.'], ['Works without a camera', 'Text input is the default. Mouse and touch drawing are always available.']].map(([h, t]) => (
          <CardSpotlight key={h} className="h-64 w-full rounded-3xl"><p className="relative z-20 text-xl font-bold text-white">{h}</p><p className="relative z-20 mt-3 text-neutral-300">{t}</p></CardSpotlight>))}
      </div></section>
      <section className="py-24 text-center"><a href="/studio" className="btn btn-main px-8 py-3 text-lg">Try it now</a></section>
    </main>
  );
}
