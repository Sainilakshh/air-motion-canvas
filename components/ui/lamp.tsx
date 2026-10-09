"use client";
import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

// Lamp hero (Aceternity-style): cyan -> coral/violet, slate -> #09090b. Height fixed taaki geometry viewport par depend na kare.
export const LampContainer = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const t = { delay: 0.3, duration: 0.8, ease: "easeInOut" as const };
  return (
    <div className={cn("relative z-0 flex h-[760px] w-full flex-col items-center justify-center overflow-hidden bg-[#09090b]", className)}>
      <div className="relative isolate z-0 flex w-full flex-1 scale-y-125 items-center justify-center">
        <motion.div initial={{ opacity: 0.5, width: "15rem" }} whileInView={{ opacity: 1, width: "30rem" }} transition={t}
          style={{ backgroundImage: "conic-gradient(var(--conic-position), var(--tw-gradient-stops))" }}
          className="absolute inset-auto right-1/2 h-56 w-[30rem] overflow-visible from-[#ff6a4d] via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]">
          <div className="absolute bottom-0 left-0 z-20 h-40 w-full bg-[#09090b] [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute bottom-0 left-0 z-20 h-full w-40 bg-[#09090b] [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>
        <motion.div initial={{ opacity: 0.5, width: "15rem" }} whileInView={{ opacity: 1, width: "30rem" }} transition={t}
          style={{ backgroundImage: "conic-gradient(var(--conic-position), var(--tw-gradient-stops))" }}
          className="absolute inset-auto left-1/2 h-56 w-[30rem] from-transparent via-transparent to-[#8b5cf6] text-white [--conic-position:from_290deg_at_center_top]">
          <div className="absolute bottom-0 right-0 z-20 h-full w-40 bg-[#09090b] [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute bottom-0 right-0 z-20 h-40 w-full bg-[#09090b] [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>
        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-[#09090b] blur-2xl" />
        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10" />
        <div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full bg-[#ff6a4d] opacity-40 blur-3xl" />
        <motion.div initial={{ width: "8rem" }} whileInView={{ width: "16rem" }} transition={t} className="absolute inset-auto z-30 h-36 w-64 -translate-y-[6rem] rounded-full bg-[#ff9d8a] blur-2xl" />
        <motion.div initial={{ width: "15rem" }} whileInView={{ width: "30rem" }} transition={t} className="absolute inset-auto z-50 h-0.5 w-[30rem] -translate-y-[7rem] bg-gradient-to-r from-[#ff6a4d] via-[#ffb4a4] to-[#8b5cf6]" />
        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-[#09090b]" />
      </div>
      <div className="relative z-50 flex -translate-y-[17rem] flex-col items-center px-5">{children}</div>
    </div>
  );
};
