export type PrimitiveName = 'float' | 'bounce' | 'spin' | 'pulse' | 'sway' | 'grow' | 'launch' | 'drive' | 'wave' | 'orbit' | 'shake' | 'fall' | 'zoom' | 'flicker' | 'draw';
export type Primitive = { type: PrimitiveName; speed?: number; amount?: number };
export type Backdrop = 'space' | 'sky' | 'ocean' | 'ground' | 'sun' | 'night' | 'none';
export type Effect = 'sparkles' | 'trail' | 'rays' | 'bubbles' | 'stars' | 'smoke';
// AI ek concept ke liye primitives ko compose karta hai (internal mechanism, user ko preset list nahi dikhti)
export type AnimSpec = { primitives: Primitive[]; backdrop: Backdrop; effects: Effect[]; emoji?: string; svg?: string };

export type RecognizeResult = {
  labels: { name: string; confidence: number }[];
  intent: string; context: string; keywords: string[];
  visualDirection: string; wikiTitle: string; motion: string; confident: boolean;
  anim: AnimSpec;
};
export type Item = { thumb: string; link: string; credit: string; preview?: string };
export type Hook = { style: string; text: string };
export type Shot = {
  id: string; title: string; concept: string; visual: string; brollIdea: string; keywords: string[]; line: string;
  duration: number; fact: string; broll: Item | null; options: Item[]; anim: AnimSpec; note?: string; page?: number; pick?: string;
};
