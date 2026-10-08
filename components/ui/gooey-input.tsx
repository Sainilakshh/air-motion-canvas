"use client";
import { useState, useRef, useEffect, useId, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

function GooeyFilter({ filterId, blur }: any) {
  return (
    <svg className="absolute hidden h-0 w-0" aria-hidden>
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
          <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

function SearchIcon({ layoutId }: any) {
  return (
    <motion.svg layoutId={layoutId} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} className="size-4 shrink-0">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </motion.svg>
  );
}

const transition: any = { duration: 0.4, type: "spring", bounce: 0.25 };
const iconBubbleVariants = { collapsed: { scale: 0, opacity: 0 }, expanded: { scale: 1, opacity: 1 } };

export function GooeyInput({ placeholder = "Type to search...", className, classNames, collapsedWidth = 115, expandedWidth = 200, expandedOffset = 50, gooeyBlur = 5, value: valueProp, defaultValue = "", onValueChange, onOpenChange, onKeyDown, defaultOpen = false, keepOpen = false, disabled = false }: any) {
  const reactId = useId();
  const safeId = reactId.replace(/:/g, "");
  const filterId = `gooey-filter-${safeId}`;
  const iconLayoutId = `gooey-input-icon-${safeId}`;
  const inputLayoutId = `gooey-input-field-${safeId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const prevExpandedRef = useRef(false);
  const [isExpanded, setIsExpanded] = useState(defaultOpen);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = valueProp !== undefined;
  const searchText = isControlled ? valueProp : uncontrolledValue;

  const setSearchText = useCallback((next: string) => {
    if (!isControlled) setUncontrolledValue(next);
    onValueChange?.(next);
  }, [isControlled, onValueChange]);
  const setExpanded = useCallback((next: boolean) => { setIsExpanded(next); onOpenChange?.(next); }, [onOpenChange]);

  useEffect(() => {
    if (isExpanded) inputRef.current?.focus();
    else if (prevExpandedRef.current) setSearchText("");
    prevExpandedRef.current = isExpanded;
  }, [isExpanded, setSearchText]);

  const buttonVariants = useMemo(() => ({ collapsed: { width: collapsedWidth, marginLeft: 0 }, expanded: { width: expandedWidth, marginLeft: expandedOffset } }), [collapsedWidth, expandedWidth, expandedOffset]);
  const handleExpand = useCallback(() => { if (!disabled) setExpanded(true); }, [disabled, setExpanded]);
  const handleChange = useCallback((e: any) => setSearchText(e.target.value), [setSearchText]);
  const handleBlur = useCallback(() => { if (!searchText && !keepOpen) setExpanded(false); }, [searchText, keepOpen, setExpanded]);

  // Colors: dark bento pill (original used shadcn tokens)
  const surfaceClass = "bg-[#16161a] text-zinc-100 ring-1 ring-white/10";

  return (
    <div className={cn("relative flex items-center justify-center", className, classNames?.root)}>
      <GooeyFilter filterId={filterId} blur={gooeyBlur} />
      <div className={cn("relative flex h-12 items-center justify-center", classNames?.filterWrap)} style={{ filter: `url(#${filterId})` }}>
        <motion.div className={cn("flex h-12 items-center justify-center", classNames?.buttonRow)} variants={buttonVariants} initial="collapsed" animate={isExpanded ? "expanded" : "collapsed"} transition={transition}>
          <button type="button" disabled={disabled} onClick={handleExpand}
            className={cn("flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-base font-medium outline-none transition-[color,box-shadow] focus-visible:ring-2 focus-visible:ring-[#ff6a4d] disabled:pointer-events-none disabled:opacity-50", surfaceClass, classNames?.trigger)}>
            {!isExpanded ? <SearchIcon layoutId={iconLayoutId} /> : null}
            <motion.input layoutId={inputLayoutId} ref={inputRef} type="search" enterKeyHint="search" autoComplete="off" value={searchText} onChange={handleChange} onBlur={handleBlur} onKeyDown={onKeyDown}
              disabled={disabled || !isExpanded} placeholder={placeholder}
              className={cn("h-full min-w-0 flex-1 bg-transparent text-base text-zinc-100 outline-none", isExpanded ? "placeholder:text-zinc-500" : "pointer-events-none placeholder:text-zinc-400", classNames?.input)} />
          </button>
        </motion.div>
        <motion.div className={cn("absolute top-0 left-0 flex size-12 items-center justify-center", classNames?.bubble)} variants={iconBubbleVariants} initial="collapsed" animate={isExpanded ? "expanded" : "collapsed"} transition={transition}>
          <div className={cn("flex size-12 items-center justify-center rounded-full", surfaceClass, classNames?.bubbleSurface)}><SearchIcon layoutId={iconLayoutId} /></div>
        </motion.div>
      </div>
    </div>
  );
}
