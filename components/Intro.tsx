'use client';
import { useState } from 'react';
import { HoveredLink, Menu, MenuItem } from '@/components/ui/navbar-menu';
import { MacbookScroll } from '@/components/ui/macbook-scroll';
import { LampContainer } from '@/components/ui/lamp';
import { motion } from 'motion/react';
import { CardSpotlight } from '@/components/ui/card-spotlight';
import { Timeline } from '@/components/ui/timeline';
import { Card, Carousel } from '@/components/ui/apple-cards-carousel';
import { TextReveal } from '@/components/ui/text-reveal';

const P = ({ children }: { children: React.ReactNode }) => <p className="mb-8 text-base md:text-xl leading-relaxed text-neutral-800 dark:text-neutral-300 max-w-2xl">{children}</p>;
const steps = [
  ['1. Idea', 'Type a rough idea like "A 30-second video about why rockets are expensive", or sketch it on the whiteboard with mouse, pen or touch.'],
  ['2. Understand', 'Gemini finds the concept, intent and keywords, and shows alternatives when it is unsure.'],
  ['3. Research', 'Facts come from Wikipedia first, with a source link. AI only rewrites them for creators.'],
  ['4. Hook + script', 'Pick one of four hook styles. Every shot gets its own script line.'],
  ['5. B-roll', 'Pixabay footage for each shot, replaceable any time.'],
  ['6. Storyboard', 'Edit, reorder and time your shots for Reel, Short or YouTube. Save and reopen projects.'],
].map(([title, text]) => ({ title, content: <div><P>{text}</P></div> }));

const Body = ({ lead, text }: { lead: string; text: string }) => <div className="rounded-3xl bg-[#16161a] p-6 md:p-10"><p className="mx-auto max-w-3xl text-base text-zinc-400 md:text-xl"><span className="font-bold text-zinc-100">{lead}</span> {text}</p></div>;
const platforms = [
  { category: '9:16 · ~30s', title: 'Instagram Reel', bg: 'bg-gradient-to-br from-[#ff6a4d]/40 via-[#16161a] to-[#8b5cf6]/30', content: <Body lead="Fast hook, tight shots." text="Start from a Reel preset: 3 to 4 shots, about 30 seconds, vertical framing. Every shot carries its own script line and B-roll." /> },
  { category: '9:16 · ~45s', title: 'YouTube Short', bg: 'bg-gradient-to-br from-[#f23d2b]/40 via-[#16161a] to-[#16161a]', content: <Body lead="Vertical, a bit longer." text="Short preset gives 4 to 5 shots at about 45 seconds. Edit the timing and the storyboard bar updates as you go." /> },
  { category: '16:9 · ~2 min', title: 'YouTube', bg: 'bg-gradient-to-br from-[#8b5cf6]/40 via-[#16161a] to-[#16161a]', content: <Body lead="Room to explain." text="Landscape preset with 5 to 6 shots. Good for explainers where each shot needs a fact and a source." /> },
  { category: 'Optional', title: 'Whiteboard', bg: 'bg-gradient-to-br from-[#8b5cf6]/30 via-[#16161a] to-[#ff6a4d]/30', content: <Body lead="Sketch the idea." text="Draw on a clean whiteboard with mouse, pen or touch. The sketch itself gets animated." /> },
];
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
      <div className="h-[600px] w-full overflow-hidden bg-[#09090b] sm:h-[640px]">
        <LampContainer>
          <motion.div initial={{ opacity: 0.4, y: 60 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8, ease: 'easeInOut' }} className="flex flex-col items-center text-center">
            <span className="chip !cursor-default mb-6">Idea → Storyboard in minutes</span>
            <h1 className="bg-gradient-to-br from-zinc-100 to-zinc-500 bg-clip-text py-2 text-5xl font-semibold tracking-tight text-transparent md:text-7xl">Air Motion Canvas</h1>
            <p className="mt-4 max-w-xl text-base text-zinc-400 md:text-lg">Type, say or sketch a rough idea. Get the concept, B-roll, research, hooks, a script, and a storyboard you can play.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3"><a href="/studio" className="cta">Open Studio</a><a href="#how" className="chip !py-3">How it works</a></div>
          </motion.div>
        </LampContainer>
      </div>
      <div className="w-full overflow-hidden bg-[#09090b]"><MacbookScroll className="md:pt-10" src="/intro/screen.png" showGradient={false} title={<TextReveal text="Idea in. Storyboard out." accent="Storyboard" />} /></div>
      <section id="how"><Timeline data={steps} heading="How Air Motion Canvas works" sub="From rough idea to storyboard in six steps." /></section>
      <section className="py-16"><div className="mx-auto max-w-7xl px-4"><h2 className="text-3xl font-bold md:text-5xl"><TextReveal text="Made for every platform." /></h2><p className="mt-3 text-base text-zinc-400 md:text-xl">Pick a format, the plan adapts.</p></div>
        <Carousel items={platforms.map((c, i) => <Card key={c.title} card={c} index={i} />)} /></section>
      <section className="py-20 px-4"><div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        {[['No camera needed', 'The whiteboard works with mouse, pen and touch. Nothing opens your webcam.'], ['Fails gracefully', 'If AI or footage is unavailable, you get a clear message and demo data instead of a broken screen.'], ['Text first', 'Type an idea and go. Drawing on the whiteboard is optional.']].map(([h, t]) => (
          <CardSpotlight key={h} className="h-64 w-full rounded-3xl"><p className="relative z-20 text-2xl font-bold text-white">{h}</p><p className="relative z-20 mt-3 text-lg leading-relaxed text-neutral-300">{t}</p></CardSpotlight>))}
      </div></section>
      <section className="py-24 text-center"><a href="/studio" className="btn btn-main px-10 py-4 text-xl">Try it now</a></section>
    </main>
  );
}
