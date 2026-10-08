"use client";
// Aceternity Apple Cards Carousel (original file), TypeScript + dark theme only.
// Changes vs original: types, no light-mode classes, `fill` prop removed from <img>, optional card.bg (CSS gradient, no network image).
import React, { useEffect, useRef, useState, createContext, useContext } from "react";
import { IconArrowNarrowLeft, IconArrowNarrowRight, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useOutsideClick } from "@/lib/use-outside-click";

export type CardData = { src?: string; title: string; category: string; content: React.ReactNode; bg?: string };

export const CarouselContext = createContext<{ onCardClose: (i: number) => void; currentIndex: number }>({ onCardClose: () => {}, currentIndex: 0 });

export const Carousel = ({ items, initialScroll = 0 }: { items: React.ReactNode[]; initialScroll?: number }) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const checkScrollability = () => {
    const el = carouselRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  };
  useEffect(() => {
    if (carouselRef.current) { carouselRef.current.scrollLeft = initialScroll; checkScrollability(); }
  }, [initialScroll, items.length]);

  const scrollBy = (left: number) => carouselRef.current?.scrollBy({ left, behavior: "smooth" });
  const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;
  const handleCardClose = (index: number) => {
    if (!carouselRef.current) return;
    const cardWidth = isMobile() ? 230 : 384, gap = isMobile() ? 4 : 8;
    carouselRef.current.scrollTo({ left: (cardWidth + gap) * (index + 1), behavior: "smooth" });
    setCurrentIndex(index);
  };

  return (
    <CarouselContext.Provider value={{ onCardClose: handleCardClose, currentIndex }}>
      <div className="relative w-full">
        <div ref={carouselRef} onScroll={checkScrollability} className="flex w-full overflow-x-scroll overscroll-x-auto scroll-smooth py-6 [scrollbar-width:none] md:py-10">
          <div className="mx-auto flex max-w-7xl flex-row justify-start gap-4 pl-4">
            {items.map((item, index) => (
              <motion.div key={"card" + index} initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2 * index, ease: "easeOut" } }}
                className="rounded-3xl last:pr-[5%] md:last:pr-[33%]">{item}</motion.div>
            ))}
          </div>
        </div>
        <div className="mr-4 flex justify-end gap-2 md:mr-10">
          <button className="relative z-40 flex h-10 w-10 items-center justify-center rounded-full border border-[#2a2a30] bg-[#16161a] disabled:opacity-40" onClick={() => scrollBy(-300)} disabled={!canScrollLeft} aria-label="Previous">
            <IconArrowNarrowLeft className="h-6 w-6 text-zinc-300" />
          </button>
          <button className="relative z-40 flex h-10 w-10 items-center justify-center rounded-full border border-[#2a2a30] bg-[#16161a] disabled:opacity-40" onClick={() => scrollBy(300)} disabled={!canScrollRight} aria-label="Next">
            <IconArrowNarrowRight className="h-6 w-6 text-zinc-300" />
          </button>
        </div>
      </div>
    </CarouselContext.Provider>
  );
};

export const Card = ({ card, index, layout = false }: { card: CardData; index: number; layout?: boolean }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { onCardClose } = useContext(CarouselContext);

  const handleClose = () => { setOpen(false); onCardClose(index); };
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); onCardClose(index); } };
    document.body.style.overflow = open ? "hidden" : "auto";
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); document.body.style.overflow = "auto"; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  // Original closed on every outside click even when closed (scrolled the carousel); only react while open.
  useOutsideClick(containerRef, () => { if (open) handleClose(); });

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 h-screen overflow-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 h-full w-full bg-black/80 backdrop-blur-lg" />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} ref={containerRef} layoutId={layout ? `card-${card.title}` : undefined}
              className="relative z-[60] mx-auto my-10 h-fit max-w-5xl rounded-3xl border border-[#232328] bg-[#131316] p-4 font-sans md:p-10">
              <button className="sticky top-4 right-0 ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-white" onClick={handleClose} aria-label="Close">
                <IconX className="h-5 w-5 text-neutral-900" />
              </button>
              <motion.p layoutId={layout ? `category-${card.title}` : undefined} className="text-base font-medium text-zinc-400">{card.category}</motion.p>
              <motion.p layoutId={layout ? `title-${card.title}` : undefined} className="mt-4 text-2xl font-semibold text-white md:text-5xl">{card.title}</motion.p>
              <div className="py-10">{card.content}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <motion.button layoutId={layout ? `card-${card.title}` : undefined} onClick={() => setOpen(true)}
        className="relative z-10 flex h-80 w-56 flex-col items-start justify-start overflow-hidden rounded-3xl bg-[#16161a] md:h-[34rem] md:w-80">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-full bg-gradient-to-b from-black/60 via-transparent to-transparent" />
        <div className="relative z-40 p-8">
          <motion.p layoutId={layout ? `category-${card.category}` : undefined} className="text-left font-sans text-sm font-medium text-white/80 md:text-base">{card.category}</motion.p>
          <motion.p layoutId={layout ? `title-${card.title}` : undefined} className="mt-2 max-w-xs text-left font-sans text-xl font-semibold [text-wrap:balance] text-white md:text-3xl">{card.title}</motion.p>
        </div>
        {card.src ? <BlurImage src={card.src} alt={card.title} className="absolute inset-0 z-10 object-cover" /> : <div className={cn("absolute inset-0 z-10", card.bg || "bg-gradient-to-br from-orange-500/25 via-[#16161a] to-pink-500/25")} />}
      </motion.button>
    </>
  );
};

export const BlurImage = ({ height, width, src, className, alt, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) => {
  const [isLoading, setLoading] = useState(true);
  return (
    <img className={cn("h-full w-full transition duration-300", isLoading ? "blur-sm" : "blur-0", className)} onLoad={() => setLoading(false)} src={src} width={width} height={height}
      loading="lazy" decoding="async" alt={alt ? alt : "Background"} {...rest} />
  );
};
