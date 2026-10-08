// @ts-nocheck
"use client";
import React from "react";
import { cn } from "@/lib/utils";

const DEFAULT_COLORS = ["#93c5fd", "#2563eb"];
const TAU = Math.PI * 2, GW = 5, GH = 7;
const PIXEL_FONT = {
  A: "01110/10001/10001/11111/10001/10001/10001", B: "11110/10001/10001/11110/10001/10001/11110", C: "01111/10000/10000/10000/10000/10000/01111", D: "11110/10001/10001/10001/10001/10001/11110", E: "11111/10000/10000/11110/10000/10000/11111", F: "11111/10000/10000/11110/10000/10000/10000", G: "01111/10000/10000/10111/10001/10001/01111", H: "10001/10001/10001/11111/10001/10001/10001", I: "11111/00100/00100/00100/00100/00100/11111", J: "00111/00010/00010/00010/10010/10010/01100", K: "10001/10010/10100/11000/10100/10010/10001", L: "10000/10000/10000/10000/10000/10000/11111", M: "10001/11011/10101/10101/10001/10001/10001", N: "10001/11001/10101/10011/10001/10001/10001", O: "01110/10001/10001/10001/10001/10001/01110", P: "11110/10001/10001/11110/10000/10000/10000", Q: "01110/10001/10001/10001/10101/10010/01101", R: "11110/10001/10001/11110/10100/10010/10001", S: "01111/10000/10000/01110/00001/00001/11110", T: "11111/00100/00100/00100/00100/00100/00100", U: "10001/10001/10001/10001/10001/10001/01110", V: "10001/10001/10001/10001/10001/01010/00100", W: "10001/10001/10001/10101/10101/10101/01010", X: "10001/10001/01010/00100/01010/10001/10001", Y: "10001/10001/01010/00100/00100/00100/00100", Z: "11111/00001/00010/00100/01000/10000/11111",
  "0": "01110/10001/10011/10101/11001/10001/01110", "1": "00100/01100/00100/00100/00100/00100/01110", "2": "01110/10001/00001/00010/00100/01000/11111", "3": "11110/00001/00001/01110/00001/00001/11110", "4": "00010/00110/01010/10010/11111/00010/00010", "5": "11111/10000/10000/11110/00001/00001/11110", "6": "01110/10000/10000/11110/10001/10001/01110", "7": "11111/00001/00010/00100/01000/01000/01000", "8": "01110/10001/10001/01110/10001/10001/01110", "9": "01110/10001/10001/01111/00001/00001/01110",
  "-": "00000/00000/00000/11111/00000/00000/00000", ".": "00000/00000/00000/00000/00000/01100/01100", ":": "00000/01100/01100/00000/01100/01100/00000", "?": "01110/10001/00001/00010/00100/00000/00100",
};
const randomFrom = (x, y, salt) => { const v = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719); return v * 43758.5453 - Math.floor(v * 43758.5453); };
const CURVES = { linear: [0, 0, 1, 1], "ease-in": [0.42, 0, 1, 1], "ease-out": [0, 0, 0.58, 1], "ease-in-out": [0.42, 0, 0.58, 1] };
const cc = (t, p1, p2) => { const i = 1 - t; return 3 * i * i * t * p1 + 3 * i * t * t * p2 + t * t * t; };
const cd = (t, p1, p2) => { const i = 1 - t; return 3 * i * i * p1 + 6 * i * t * (p2 - p1) + 3 * t * t * (1 - p2); };
const bezier = (x1, y1, x2, y2) => {
  const a = Math.min(1, Math.max(0, x1)), b = Math.min(1, Math.max(0, x2));
  return (p) => { let t = p; for (let k = 0; k < 6; k++) { const d = cc(t, a, b) - p, dv = cd(t, a, b); if (Math.abs(dv) < 0.0001) break; t = Math.min(1, Math.max(0, t - d / dv)); } return cc(t, y1, y2); };
};
const resolveEasing = (e) => {
  if (typeof e === "function") return e;
  if (typeof e !== "string") return bezier(e[0], e[1], e[2], e[3]);
  if (CURVES[e]) return bezier(...CURVES[e]);
  const m = e.match(/^cubic-bezier\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)$/);
  return m ? bezier(+m[1], +m[2], +m[3], +m[4]) : (p) => p;
};

export function ImageGenerationLoader({ className, cellSize = 5, gap = 2, bandHeight = 48, duration = 4000, effect = "shimmer", waveAmplitude = 12, scaleAmplitude = 0.75, colors = DEFAULT_COLORS, text, textLetterSpacing, textWordSpacing, overlayOpacity = 0.3, overlayExitDuration = 700, easing = "ease-in-out" }: any) {
  const canvasRef = React.useRef(null), overlayRef = React.useRef(null);
  const [fromColor, toColor] = colors;
  React.useEffect(() => {
    const canvas = canvasRef.current, overlay = overlayRef.current, parent = canvas?.parentElement;
    if (!canvas || !overlay || !parent) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const probe = document.createElement("span"); probe.hidden = true; parent.appendChild(probe);
    const cvs = document.createElement("canvas"); cvs.width = 1; cvs.height = 1;
    const cctx = cvs.getContext("2d", { willReadFrequently: true });
    const decode = (color) => { probe.style.color = color; const r = getComputedStyle(probe).color; cctx?.clearRect(0, 0, 1, 1); if (cctx) { cctx.fillStyle = r; cctx.fillRect(0, 0, 1, 1); } const px = cctx?.getImageData(0, 0, 1, 1).data; return [px?.[0] ?? 0, px?.[1] ?? 0, px?.[2] ?? 0]; };
    const fromRgb = decode(fromColor), toRgb = decode(toColor); probe.remove();
    const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
    let width = 0, height = 0, cells = [], frameId = 0, startTime = performance.now(), isVisible = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pitch = Math.max(2, cellSize + gap), ease = resolveEasing(easing);

    const buildCells = () => {
      const cols = Math.ceil(width / pitch) + 1, rows = Math.max(1, Math.floor((bandHeight + gap) / pitch));
      const next = [], textCells = new Set();
      if (text && rows >= GH) {
        const chars = Array.from(text.trim().toUpperCase());
        const lg = textLetterSpacing === undefined ? 1 : Math.max(0, Math.round(textLetterSpacing / pitch));
        const wg = textWordSpacing === undefined ? 3 : Math.max(1, Math.round(textWordSpacing / pitch));
        const widths = chars.map((c) => (c === " " ? wg : GW));
        const tw = widths.reduce((t, w) => t + w, 0) + Math.max(0, chars.length - 1) * lg;
        const vis = Math.max(1, Math.floor((width + gap) / pitch));
        const startCol = Math.max(0, Math.floor((vis - tw) / 2)), startRow = Math.floor((rows - GH) / 2);
        let gc = startCol;
        chars.forEach((ch, ci) => {
          if (ch === " ") gc += wg;
          else {
            const glyph = (PIXEL_FONT[ch] ?? PIXEL_FONT["?"]).split("/");
            for (let r = 0; r < GH; r++) for (let p = 0; p < GW; p++) if (glyph[r]?.[p] === "1") textCells.add(`${gc + p}:${startRow + r}`);
            gc += GW;
          }
          if (ci < chars.length - 1) gc += lg;
        });
      }
      for (let row = 0; row < rows; row++) for (let column = 0; column < cols; column++)
        next.push({ column, row, opacity: 0.45 + randomFrom(column, row, 4) * 0.55, phase: randomFrom(column, row, 5) * TAU, scaleSeed: randomFrom(column, row, 6), isText: textCells.has(`${column}:${row}`) });
      cells = next;
    };
    const resize = () => {
      const b = parent.getBoundingClientRect(); width = Math.max(1, b.width); height = Math.max(1, b.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); buildCells();
    };
    const draw = (now) => {
      ctx.clearRect(0, 0, width, height);
      const cycle = Math.max(1, duration), elapsed = (now - startTime) % cycle;
      const progress = reduced.matches ? 0.5 : ease(elapsed / cycle);
      const centerY = -bandHeight + progress * (height + bandHeight * 2);
      const bandTop = Math.round(centerY - bandHeight / 2), bandCenter = bandTop + bandHeight / 2;
      const revealEdge = Math.max(0, Math.min(height, bandTop));
      const exitWin = Math.min(Math.max(1, overlayExitDuration), cycle / 2);
      const exitAmt = reduced.matches ? 1 : Math.min(1, (cycle - elapsed) / exitWin);
      const eased = exitAmt * exitAmt * (3 - 2 * exitAmt);
      overlay.style.clipPath = `inset(0 0 ${height - revealEdge}px 0)`; overlay.style.opacity = `${overlayOpacity * eased}`;
      const rows = Math.max(1, Math.floor((bandHeight + gap) / pitch)), gridH = rows * cellSize + (rows - 1) * gap;
      const gridTop = bandTop + Math.round((bandHeight - gridH) / 2);
      const waveP = reduced.matches ? 0.5 : ((now - startTime) % 1800) / 1800, waveX = -100 + waveP * (width + 200);
      const bulge = (x) => (effect !== "wave" || reduced.matches ? 0 : waveAmplitude * Math.exp(-((x - waveX) ** 2) / (2 * 72 * 72)));
      const bg = ctx.createLinearGradient(0, bandTop - waveAmplitude, 0, bandTop + bandHeight + waveAmplitude);
      bg.addColorStop(0, rgba(toRgb, 0.03)); bg.addColorStop(0.18, rgba(toRgb, 0.12)); bg.addColorStop(0.5, rgba(fromRgb, 0.2)); bg.addColorStop(0.82, rgba(toRgb, 0.12)); bg.addColorStop(1, rgba(toRgb, 0.03));
      ctx.fillStyle = bg;
      if (effect === "wave" && !reduced.matches) {
        ctx.beginPath(); ctx.moveTo(0, bandTop - bulge(0));
        for (let x = 4; x <= width; x += 4) ctx.lineTo(x, bandTop - bulge(x));
        for (let x = width; x >= 0; x -= 4) ctx.lineTo(x, bandTop + bandHeight + bulge(x));
        ctx.closePath(); ctx.fill();
      } else ctx.fillRect(0, bandTop, width, bandHeight);
      if (effect === "shimmer") {
        const sp = reduced.matches ? 0.5 : ((now - startTime) % 1400) / 1400, sx = -120 + sp * (width + 240);
        const sg = ctx.createLinearGradient(sx - 120, 0, sx + 120, 0);
        sg.addColorStop(0, rgba(fromRgb, 0)); sg.addColorStop(0.5, rgba(fromRgb, 0.18)); sg.addColorStop(1, rgba(fromRgb, 0));
        ctx.fillStyle = sg; ctx.fillRect(0, bandTop, width, bandHeight);
      }
      for (const cell of cells) {
        const x = cell.column * pitch, baseY = gridTop + cell.row * pitch;
        const stretch = 1 + bulge(x + cellSize / 2) / (bandHeight / 2);
        const y = bandCenter + (baseY + cellSize / 2 - bandCenter) * stretch - cellSize / 2;
        if (y + cellSize < 0 || y > height) continue;
        const mixA = (Math.sin(now * 0.0022 + cell.phase) + 1) / 2;
        const mix = text ? (cell.isText ? 0.82 + mixA * 0.18 : mixA * 0.35) : mixA;
        const red = Math.round(fromRgb[0] + (toRgb[0] - fromRgb[0]) * mix), green = Math.round(fromRgb[1] + (toRgb[1] - fromRgb[1]) * mix), blue = Math.round(fromRgb[2] + (toRgb[2] - fromRgb[2]) * mix);
        const pulse = 0.16 + ((Math.sin(now * 0.0045 + cell.phase) + 1) / 2) * 0.84, cx = x + cellSize / 2;
        let size = cellSize;
        if (effect === "scale-wave" && !reduced.matches && cell.scaleSeed > 0.42) {
          const d = cx - (waveX - cell.row * 9), infl = Math.exp(-(d * d) / (2 * 52 * 52)), rs = (cell.scaleSeed - 0.42) / 0.58;
          size = cellSize * (1 + scaleAmplitude * infl * (0.35 + rs * 0.65));
        }
        const cy = y + cellSize / 2;
        if (text && cell.isText) {
          ctx.globalAlpha = 0.76 + pulse * 0.24; ctx.fillStyle = `rgb(${fromRgb[0]} ${fromRgb[1]} ${fromRgb[2]})`; ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
          const inner = Math.max(1, size * 0.55); ctx.globalAlpha = 0.84 + pulse * 0.16; ctx.fillStyle = `rgb(${toRgb[0]} ${toRgb[1]} ${toRgb[2]})`; ctx.fillRect(cx - inner / 2, cy - inner / 2, inner, inner);
        } else {
          ctx.globalAlpha = text ? pulse * (0.32 + cell.opacity * 0.3) : pulse * (0.7 + cell.opacity * 0.3); ctx.fillStyle = `rgb(${red} ${green} ${blue})`; ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
        }
      }
      ctx.globalAlpha = 1;
      if (!reduced.matches && isVisible) frameId = requestAnimationFrame(draw);
    };
    const start = () => { cancelAnimationFrame(frameId); startTime = performance.now(); frameId = requestAnimationFrame(draw); };
    const ro = new ResizeObserver(() => { resize(); if (reduced.matches) draw(performance.now()); });
    const io = new IntersectionObserver(([e]) => { isVisible = e.isIntersecting; if (isVisible) start(); else cancelAnimationFrame(frameId); });
    const onMotion = () => start();
    resize(); ro.observe(parent); io.observe(canvas); reduced.addEventListener("change", onMotion); start();
    return () => { cancelAnimationFrame(frameId); ro.disconnect(); io.disconnect(); reduced.removeEventListener("change", onMotion); };
  }, [bandHeight, cellSize, duration, easing, effect, fromColor, gap, overlayExitDuration, overlayOpacity, scaleAmplitude, text, textLetterSpacing, textWordSpacing, toColor, waveAmplitude]);
  return (
    <>
      <div ref={overlayRef} aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[var(--loader-overlay-color)] will-change-[clip-path,opacity]" style={{ "--loader-overlay-color": toColor, clipPath: "inset(0 0 100% 0)", opacity: overlayOpacity }} />
      <canvas ref={canvasRef} aria-hidden="true" className={cn("pointer-events-none absolute inset-0 size-full", className)} />
    </>
  );
}
