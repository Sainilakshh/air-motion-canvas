"use client";
// Equivalent of the Aceternity Apple Cards Carousel (original file was not provided): same API, Carousel + Card.
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useOutsideClick } from "@/lib/use-outside-click";

export type CardData = { src: string; title: string; category: string; content: React.ReactNode };

export const Carousel = ({ items }: { items: React.ReactNode[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [canL, setCanL] = useState(false), [canR, setCanR] = useState(true);
  const check = () => { const el = ref.current; if (!el) return; setCanL(el.scrollLeft > 0); setCanR(el.scrollLeft < el.scrollWidth - el.clientWidth - 2); };
  useEffect(check, [items.length]);
  const by = (d: number) => ref.current?.scrollBy({ left: d * 300, behavior: "smooth" });
  return (
    <div className="relative w-full">
      <div ref={ref} onScroll={check} className="flex w-full gap-4 overflow-x-auto scroll-smooth py-4 [scrollbar-width:none]">{items.map((it, i) => <div key={i} className="shrink-0">{it}</div>)}</div>
      <div className="flex justify-end gap-2">
        <button className="btn text-sm" disabled={!canL} onClick={() => by(-1)} aria-label="Previous">←</button>
        <button className="btn text-sm" disabled={!canR} onClick={() => by(1)} aria-label="Next">→</button>
      </div>
    </div>
  );
};

export const Card = ({ card, index }: { card: CardData; index: number }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.body.style.overflow = open ? "hidden" : "auto";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = "auto"; };
  }, [open]);
  useOutsideClick(boxRef, () => setOpen(false));
  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 h-screen overflow-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 h-full w-full bg-black/80 backdrop-blur-sm" />
            <motion.div ref={boxRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-[60] mx-auto my-10 h-fit max-w-3xl rounded-3xl border border-[#232328] bg-[#131316] p-6 md:p-10">
              <button className="btn absolute right-4 top-4 text-sm" onClick={() => setOpen(false)}>Close</button>
              <p className="text-sm font-medium opacity-70">{card.category}</p>
              <h3 className="mt-1 text-2xl font-semibold md:text-4xl">{card.title}</h3>
              <div className="py-8">{card.content}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * index }} onClick={() => setOpen(true)}
        className={cn("relative flex h-72 w-56 flex-col items-start justify-start overflow-hidden rounded-3xl bg-[#16161a] text-left md:h-[26rem] md:w-72")}>
        {card.src ? <img src={card.src} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-pink-500/30" />}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-full bg-gradient-to-b from-black/60 via-transparent to-transparent" />
        <div className="relative z-20 p-6">
          <p className="text-sm font-medium text-white/90">{card.category}</p>
          <p className="mt-2 max-w-xs text-xl font-semibold text-white md:text-2xl">{card.title}</p>
        </div>
      </motion.button>
    </>
  );
};
