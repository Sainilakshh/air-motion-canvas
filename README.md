# Air Motion Canvas
Rough idea (text ya optional whiteboard drawing) -> semantic understanding -> animated visual -> B-roll -> research -> hook + script -> editable storyboard -> save.

## Install
1. Node 18.17+ (`node -v`).
2. `npm install`.
3. `cp .env.example .env.local` phir keys bharo (neeche list hai).
4. `npm run dev` -> http://localhost:3000 (desktop browser).

## Keys (sirf server par, `.env.local` / Vercel env)
| Var | Kaam |
|---|---|
| `GEMINI_API_KEY`, `GEMINI_MODEL` | understanding, plan, hooks, script, shot regenerate (AI Studio se apne account ka available model naam) |
| `PIXABAY_API_KEY` | B-roll (Pixabay Videos API) |
| `DEMO_ACCESS_CODE` | API lock (neeche) |

## Flow
1. **Idea** (Direct Search, default) ya **Whiteboard** (optional; mouse/pen/touch se draw, camera nahi khulta).
2. `/api/recognize` -> labels + confidence + alternatives, intent, keywords, aur **animation spec**.
3. Visual turant dikhta hai. Parallel mein `/api/facts` (Wikipedia, search fallback) -> `/api/plan` (4 hooks + shots).
4. Hook choose karo -> `/api/script` shot-wise lines. Pehli line hook se khulti hai.
5. **Content plan** edit karo (title, visual, B-roll idea, fact, line, seconds, regenerate/remove) -> **Commit to storyboard**.
6. Storyboard: visual + B-roll picker + concept + script + duration, reorder/add/delete/regenerate, timeline, export `.md`.
7. Projects: Save/rename/open/delete (localStorage). Current project auto-save hota hai.

## Flexible animation (user ko preset list nahi dikhti)
- AI concept samajh ke `anim` deta hai: 1-3 **primitives** (compose hote hain, jaise grow+sway), backdrop, effects, emoji, optional simple SVG.
- Primitives sirf internal building blocks hain (`components/AnimationStage.tsx`, Web Animations API, nested layers). Unknown/galat output validate hota hai (`lib/animation.ts`), SVG strict whitelist se sanitize hota hai.
- Fallback: keyword heuristics -> emoji + float/pulse + sparkles. Hand-drawn sketch ho to wahi sketch animate hota hai.

## Fallbacks
AI down: "AI temporarily unavailable — your work is safe." + 8 demo concepts (Rocket, Earth, Solar energy, Tree, Car, Ball, House, Water) ke liye hooks/shots/facts/animation. Wiki fail: demo fact / continue without facts. Footage empty: "No relevant footage found — try another keyword." (workflow nahi rukta). Unclear drawing: alternatives + concept chips.

## Privacy / security
App camera ka use nahi karta. Server ko sirf whiteboard strokes ki chhoti PNG jaati hai (Understand par). Saari API keys server-side env mein; `.env.local` gitignored.

## Access code (API lock)
Saare /api routes `x-access-code` header maangte hain. Dev mein code set na ho to khule; production mein set na ho to band (401). Bina sahi code ke site demo mode mein chalti hai (8 demo concepts), live AI/B-roll nahi.

## Pages and UI components (Round 1)
- `/` = intro page (Navbar Menu + Timeline "How it works", "Skip to app" link). `/studio` = the app.
- Search box in Studio = GooeyInput. Components live in `components/ui/` (Tailwind v3 compatible, dark class enabled).
- Extra deps: `motion`, `clsx`, `tailwind-merge`.
- Model + wasm: after `npm install` (postinstall downloads them), they are NOT gitignored anymore, so `git add` includes them for the Vercel build.
- Vercel: set the 4 env vars from the Keys table, then redeploy. All API routes have `maxDuration = 60`.

## Round 3
- `components/ui/apple-cards-carousel.tsx` = your original Aceternity file (TypeScript, dark only). Used on `/` ("Made for every platform") and in Studio ("Preview strip").
- Intro: CardSpotlight cards (WebGL `CanvasRevealEffect`, mounts only on hover; only on `/`).
- Studio UI: search bar fills the row (gooey bubble stays on the left), one banner at a time, demo-concept chips whenever AI is locked/down, Access code box with a Live AI / Demo mode badge (`GET /api/access`).

## Access code: how to use
1. Make any long random string, e.g. `openssl rand -hex 16`.
2. Local: put it in `.env.local` as `DEMO_ACCESS_CODE=...` (or leave empty in dev, then everything is open).
3. Vercel: Project -> Settings -> Environment Variables: `DEMO_ACCESS_CODE`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `PIXABAY_API_KEY`, then Redeploy.
4. Open `/studio`, type the same code in the "Access code" box. Badge turns to "Live AI".
Without the code: Demo mode (8 built-in concepts only). In production with no `DEMO_ACCESS_CODE` set, all APIs stay locked on purpose.

## What's new in r7 (UI + features)
- **Composer:** ek hero card — Type | Draw switch, platform chips (9:16 / 16:9 icons), duration stepper, ek hi primary "Generate story". Voice input (mic) Chrome/Edge/Safari mein; unsupported browser mein button hide hota hai.
- **Top bar:** Projects popover (new / save / open / rename / delete, autosave) aur status popover (Live AI / AI issue / Demo mode, access code yahin).
- **Pipeline rail:** Understand → Research → Plan → B-roll → Script, har step ka live state.
- **Empty state:** 8 concept tiles + example ideas.
- **Play storyboard (animatic):** shots ek ke baad ek chalte hain (B-roll clip ya concept animation + script caption). Space = play/pause, ← → = shots, Esc = close, 1×/2×, optional voice (browser TTS, free).
- **Whiteboard:** pen pressure, One Euro smoothing, curved strokes, eraser, brush sizes, undo/redo (Ctrl/Cmd+Z), palm rejection, two-finger tap = undo, shortcuts (E, P, [ ], Ctrl+Enter).
- **Intro:** lamp hero (coral/violet) Macbook scroll ke upar.
- Preview-strip carousel Studio se hata kar uski jagah animatic aaya; carousel Intro mein hi hai.

## Footage (Pexels + Pixabay) and camera drawing
- `PEXELS_API_KEY` (primary) aur `PIXABAY_API_KEY` (fallback) dono optional; ek bhi ho to chalega. Footage dono se aata hai, keywords se rank hota hai (subject word ka zyada weight), kam-relevant hata diye jaate hain.
- Whiteboard toolbar mein camera icon: pinch = draw, fist 1s = clear, thumbs-up = understand. MediaPipe browser mein local chalta hai. `npm install` ka postinstall wasm copy karta hai aur model download karta hai; na ho to runtime par CDN se load hota hai (internet chahiye).


## R10
- Intro: floating navbar + 200vh MacbookScroll hata ke sticky header, scroll-linked preview, naya hero.
- Understanding: AI scan overlay (lock-on, label+confidence, keywords). Storyboard: script word-by-word preview + words/sec pace check, "Set Ns" fix.

## R9
- Footage: Pexels optional. Wikimedia Commons (keyless) hamesha chalta hai; `PIXABAY_API_KEY` ho to wo bhi. Video na mile to photo (Ken Burns zoom ke saath).
- Animations: camera drift + entrance pop, glow, contact shadow, parallax clouds/stars/planet, moving road, shot crossfade.
- UI: bade storyboard previews, staggered reveal, hover/focus polish.
