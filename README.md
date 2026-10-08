# Air Motion Canvas
Rough idea (text ya optional air drawing) -> semantic understanding -> animated visual -> B-roll -> research -> hook + script -> editable storyboard -> save.

## Install
1. Node 18.17+ (`node -v`).
2. `npm install` (postinstall mein MediaPipe wasm copy hota hai + hand model download hota hai).
3. `cp .env.example .env.local` phir keys bharo (neeche list hai).
4. `npm run dev` -> Chrome mein http://localhost:3000.

Model download fail ho to `hand_landmarker.task` manually `public/models/` mein rakho.

## Keys (sirf server par, `.env.local` / Vercel env)
| Var | Kaam |
|---|---|
| `GEMINI_API_KEY`, `GEMINI_MODEL` | understanding, plan, hooks, script, shot regenerate (AI Studio se apne account ka available model naam) |
| `PEXELS_API_KEY` | B-roll (primary) |
| `PIXABAY_API_KEY` | B-roll (fallback) |
| `DEMO_ACCESS_CODE` | API lock (neeche) |

## Flow
1. **Idea** (Direct Search, default) ya **Air drawing** (optional; camera na ho to mouse/touch).
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
AI down: "AI temporarily unavailable — your work is safe." + 8 demo concepts (Rocket, Earth, Solar energy, Tree, Car, Ball, House, Water) ke liye hooks/shots/facts/animation. Wiki fail: demo fact / continue without facts. Footage empty: "No relevant footage found — try another keyword." (workflow nahi rukta). Camera fail: "Camera unavailable — Continue with Mouse/Touch." + Retry. Unclear drawing: alternatives + concept chips.

## Privacy / security
Camera video sirf browser mein MediaPipe ko jaati hai; upload/store nahi hoti. Server ko sirf strokes ki chhoti PNG jaati hai (Process par). Saari API keys server-side env mein; `.env.local` gitignored.

## Access code (API lock)
Saare /api routes `x-access-code` header maangte hain. Dev mein code set na ho to khule; production mein set na ho to band (401). Bina sahi code ke site demo mode mein chalti hai (8 demo concepts), live AI/B-roll nahi.

## Pages and UI components (Round 1)
- `/` = intro page (Navbar Menu + Timeline "How it works", "Skip to app" link). `/studio` = the app.
- Search box in Studio = GooeyInput. Components live in `components/ui/` (Tailwind v3 compatible, dark class enabled).
- Extra deps: `motion`, `clsx`, `tailwind-merge`.
- Model + wasm: after `npm install` (postinstall downloads them), they are NOT gitignored anymore, so `git add` includes them for the Vercel build.
- Vercel: set the 5 env vars from the Keys table, then redeploy. All API routes have `maxDuration = 60`.

## Round 3
- Intro: CardSpotlight cards (WebGL `CanvasRevealEffect`, mounts only on hover; only on `/`, never on the MediaPipe page). Deps: `three`, `@react-three/fiber`.
- Studio: "Preview strip" (Apple-style cards carousel) above the committed storyboard; click a card for the full shot.
- The carousel is an equivalent written from the demo API (original `apple-cards-carousel` file was not provided). Paste the original over `components/ui/apple-cards-carousel.tsx` if you want it exact (keep `Carousel` and `Card` exports).
