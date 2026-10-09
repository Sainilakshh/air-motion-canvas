import { BACKDROPS, EFFECTS, PRIMITIVES, normalizeAnim } from './animation';
import type { CameraMove, Shot } from './types';
const uid = () => Math.random().toString(36).slice(2, 8);

export const SHOT_JSON = `{"title":string,"concept":string (main visual subject of this shot, e.g. "Rocket engine"),"purpose":string (narrative purpose),"visual":string (what the viewer sees),"broll":string (B-roll suggestion),"keywords":[3 English stock-footage search queries, 2-3 concrete visual words each (subject + setting or action, e.g. 'rocket launch night'), most specific first; no abstract words, brands or people names],"fact":string (ONLY from the provided facts, else ""),"line":string (one short spoken script line),"duration":number (seconds),"transition":string (short transition suggestion),"camera":one of ["static","push-in","pull-back","pan-left","pan-right","tilt-up","tilt-down","track-up","orbit"],"motion":{"primitives":[{"type":one of ${JSON.stringify(PRIMITIVES)},"speed":0.5-2,"amount":0.5-2}] (1-3 primitives composed to match how this concept naturally moves),"backdrop":one of ${JSON.stringify(BACKDROPS)},"effects":subset of ${JSON.stringify(EFFECTS)},"emoji":one emoji that depicts the concept}}`;

export function toShot(s: any, fallbackConcept = ''): Shot {
  const concept = String(s?.concept || fallbackConcept || s?.title || '');
  return {
    id: uid(), title: String(s?.title || 'Shot'), concept, visual: String(s?.visual || ''), brollIdea: String(s?.broll || ''),
    keywords: Array.isArray(s?.keywords) ? s.keywords.map(String).slice(0, 3) : [],
    line: String(s?.line || ''), duration: Math.max(2, Math.min(120, Number(s?.duration) || 5)), fact: String(s?.fact || ''),
    broll: null, options: [], anim: normalizeAnim(s?.motion, concept + ' ' + String(s?.title || '')),
    camera: (['static', 'push-in', 'pull-back', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down', 'track-up', 'orbit'].includes(s?.camera) ? s.camera : 'push-in') as CameraMove,
  };
}
