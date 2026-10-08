// @ts-nocheck
"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import { IconBrightnessDown, IconBrightnessUp, IconCaretDownFilled, IconCaretLeftFilled, IconCaretRightFilled, IconCaretUpFilled, IconChevronUp, IconCommand, IconMicrophone, IconMoon, IconPlayerSkipForward, IconPlayerTrackNext, IconPlayerTrackPrev, IconSearch, IconTable, IconVolume, IconVolume2, IconVolume3, IconWorld } from "@tabler/icons-react";

export const MacbookScroll = ({ src, showGradient, title, badge }: any) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { if (window.innerWidth < 768) setIsMobile(true); }, []);
  const scaleX = useTransform(scrollYProgress, [0, 0.3], [1.2, isMobile ? 1 : 1.5]);
  const scaleY = useTransform(scrollYProgress, [0, 0.3], [0.6, isMobile ? 1 : 1.5]);
  const translate = useTransform(scrollYProgress, [0, 1], [0, 1500]);
  const rotate = useTransform(scrollYProgress, [0.1, 0.12, 0.3], [-28, -28, 0]);
  const textTransform = useTransform(scrollYProgress, [0, 0.3], [0, 100]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  return (
    <div ref={ref} className="flex min-h-[200vh] shrink-0 scale-[0.35] transform flex-col items-center justify-start py-0 [perspective:800px] sm:scale-50 md:scale-100 md:py-80">
      <motion.h2 style={{ translateY: textTransform, opacity: textOpacity }} className="mb-20 text-center text-4xl font-bold leading-[1.1] tracking-tight text-neutral-800 md:text-7xl dark:text-white">{title}</motion.h2>
      <Lid src={src} scaleX={scaleX} scaleY={scaleY} rotate={rotate} translate={translate} />
      <div className="relative -z-10 h-[22rem] w-[32rem] overflow-hidden rounded-2xl bg-gray-200 dark:bg-[#272729]">
        <div className="relative h-10 w-full"><div className="absolute inset-x-0 mx-auto h-4 w-[80%] bg-[#050505]" /></div>
        <div className="relative flex">
          <div className="mx-auto h-full w-[10%] overflow-hidden"><SpeakerGrid /></div>
          <div className="mx-auto h-full w-[80%]"><Keypad /></div>
          <div className="mx-auto h-full w-[10%] overflow-hidden"><SpeakerGrid /></div>
        </div>
        <Trackpad />
        <div className="absolute inset-x-0 bottom-0 mx-auto h-2 w-20 rounded-tl-3xl rounded-tr-3xl bg-gradient-to-t from-[#272729] to-[#050505]" />
        {showGradient && <div className="absolute inset-x-0 bottom-0 z-50 h-40 w-full bg-gradient-to-t from-white via-white to-transparent dark:from-black dark:via-black" />}
        {badge && <div className="absolute bottom-4 left-4">{badge}</div>}
      </div>
    </div>
  );
};

export const Lid = ({ scaleX, scaleY, rotate, translate, src }) => (
  <div className="relative [perspective:800px]">
    <div style={{ transform: "perspective(800px) rotateX(-25deg) translateZ(0px)", transformOrigin: "bottom", transformStyle: "preserve-3d" }} className="relative h-[12rem] w-[32rem] rounded-2xl bg-[#010101] p-2">
      <div style={{ boxShadow: "0px 2px 0px 2px #171717 inset" }} className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#010101]">
        <span className="text-2xl font-bold" style={{ color: "#ff6a4d" }}>A</span>
      </div>
    </div>
    <motion.div style={{ scaleX, scaleY, rotateX: rotate, translateY: translate, transformStyle: "preserve-3d", transformOrigin: "top" }} className="absolute inset-0 h-96 w-[32rem] rounded-2xl bg-[#010101] p-2">
      <div className="absolute inset-0 rounded-lg bg-[#272729]" />
      <img src={src} alt="Air Motion Canvas" className="absolute inset-0 h-full w-full rounded-lg object-cover object-left-top" />
    </motion.div>
  </div>
);

export const Trackpad = () => <div className="mx-auto my-1 h-32 w-[40%] rounded-xl" style={{ boxShadow: "0px 0px 1px 1px #00000020 inset" }} />;

const Row = ({ children }) => <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">{children}</div>;
const One = ({ c }) => <KBtn><span className="block">{c}</span></KBtn>;
const Two = ({ a, b }) => <KBtn><span className="block">{a}</span><span className="block">{b}</span></KBtn>;
const Side = ({ w, left, children }) => <KBtn className={cn(w, left ? "items-end justify-start pb-[2px] pl-[4px]" : "items-end justify-end pr-[4px] pb-[2px]")} childrenClassName={left ? "items-start" : "items-end"}>{children}</KBtn>;
const Mod = ({ top, bottom, topRight = true, className = "" }) => (
  <KBtn className={className} childrenClassName="h-full justify-between py-[4px]">
    <div className={cn("flex w-full pl-1", topRight && "justify-end pr-1 pl-0")}>{top}</div>
    <div className="flex w-full justify-start pl-1">{bottom}</div>
  </KBtn>
);
const ic = "h-[6px] w-[6px]";
const FKEYS = [[IconBrightnessDown, "F1"], [IconBrightnessUp, "F2"], [IconTable, "F3"], [IconSearch, "F4"], [IconMicrophone, "F5"], [IconMoon, "F6"], [IconPlayerTrackPrev, "F7"], [IconPlayerSkipForward, "F8"], [IconPlayerTrackNext, "F9"], [IconVolume3, "F10"], [IconVolume2, "F11"], [IconVolume, "F12"]];
const NUMS = [["~", "`"], ["!", "1"], ["@", "2"], ["#", "3"], ["$", "4"], ["%", "5"], ["^", "6"], ["&", "7"], ["*", "8"], ["(", "9"], [")", "0"], ["—", "_"], ["+", "="]];

export const Keypad = () => (
  <div className="mx-1 h-full [transform:translateZ(0)] rounded-md bg-[#050505] p-1 [will-change:transform]">
    <Row>
      <Side w="w-10" left>esc</Side>
      {FKEYS.map(([I, l]) => <KBtn key={l}><I className={ic} /><span className="mt-1 inline-block">{l}</span></KBtn>)}
      <KBtn><div className="h-4 w-4 rounded-full bg-gradient-to-b from-neutral-900 from-20% via-black via-50% to-neutral-900 to-95% p-px"><div className="h-full w-full rounded-full bg-black" /></div></KBtn>
    </Row>
    <Row>{NUMS.map(([a, b]) => <Two key={b} a={a} b={b} />)}<Side w="w-10">delete</Side></Row>
    <Row><Side w="w-10" left>tab</Side>{"QWERTYUIOP".split("").map((c) => <One key={c} c={c} />)}<Two a="{" b="[" /><Two a="}" b="]" /><Two a="|" b={"\\"} /></Row>
    <Row><Side w="w-[2.8rem]" left>caps lock</Side>{"ASDFGHJKL".split("").map((c) => <One key={c} c={c} />)}<Two a=":" b=";" /><Two a={'"'} b="'" /><Side w="w-[2.85rem]">return</Side></Row>
    <Row><Side w="w-[3.65rem]" left>shift</Side>{"ZXCVBNM".split("").map((c) => <One key={c} c={c} />)}<Two a="<" b="," /><Two a=">" b="." /><Two a="?" b="/" /><Side w="w-[3.65rem]">shift</Side></Row>
    <Row>
      <Mod top="fn" bottom={<IconWorld className={ic} />} />
      <Mod top={<IconChevronUp className={ic} />} bottom="control" />
      <Mod top={<OptionKey className={ic} />} bottom="option" />
      <Mod className="w-8" top={<IconCommand className={ic} />} bottom="command" />
      <KBtn className="w-[8.2rem]" />
      <Mod className="w-8" topRight={false} top={<IconCommand className={ic} />} bottom="command" />
      <Mod topRight={false} top={<OptionKey className={ic} />} bottom="option" />
      <div className="mt-[2px] flex h-6 w-[4.9rem] flex-col items-center justify-end rounded-[4px] p-[0.5px]">
        <KBtn className="h-3 w-6"><IconCaretUpFilled className={ic} /></KBtn>
        <div className="flex">
          <KBtn className="h-3 w-6"><IconCaretLeftFilled className={ic} /></KBtn>
          <KBtn className="h-3 w-6"><IconCaretDownFilled className={ic} /></KBtn>
          <KBtn className="h-3 w-6"><IconCaretRightFilled className={ic} /></KBtn>
        </div>
      </div>
    </Row>
  </div>
);

export const KBtn = ({ className, children, childrenClassName, backlit = true }) => (
  <div className={cn("[transform:translateZ(0)] rounded-[4px] p-[0.5px] [will-change:transform]", backlit && "bg-white/[0.2] shadow-xl shadow-white")}>
    <div className={cn("flex h-6 w-6 items-center justify-center rounded-[3.5px] bg-[#0A090D]", className)} style={{ boxShadow: "0px -0.5px 2px 0 #0D0D0F inset, -0.5px 0px 2px 0 #0D0D0F inset" }}>
      <div className={cn("flex w-full flex-col items-center justify-center text-[5px] text-neutral-200", childrenClassName, backlit && "text-white")}>{children}</div>
    </div>
  </div>
);

export const SpeakerGrid = () => <div className="mt-2 flex h-40 gap-[2px] px-[0.5px]" style={{ backgroundImage: "radial-gradient(circle, #08080A 0.5px, transparent 0.5px)", backgroundSize: "3px 3px" }} />;

export const OptionKey = ({ className }) => (
  <svg fill="none" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect stroke="currentColor" strokeWidth={2} x="18" y="5" width="10" height="2" />
    <polygon stroke="currentColor" strokeWidth={2} points="10.6,5 4,5 4,7 9.4,7 18.4,27 28,27 28,25 19.6,25 " />
  </svg>
);
