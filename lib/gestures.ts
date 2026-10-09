export type Gesture = 'pinch' | 'open' | 'fist' | 'thumbs' | 'none';
type L = { x: number; y: number };
const d = (a: L, b: L) => Math.hypot(a.x - b.x, a.y - b.y);

// Thresholds andaze se hain, webcam par calibrate karne hain.
export function classify(l: L[]): Gesture {
  const size = d(l[0], l[9]) || 1;
  const up = (t: number, p: number) => d(l[0], l[t]) > d(l[0], l[p]) * 1.05;
  const f = [up(8, 6), up(12, 10), up(16, 14), up(20, 18)];
  const n = f.filter(Boolean).length;
  const others = f.slice(1).filter(Boolean).length;
  if (d(l[4], l[8]) / size < 0.3 && others >= 1) return 'pinch';
  if (n === 0) {
    const thumbUp = l[4].y < l[5].y - 0.3 * size && l[4].y < l[0].y - 0.5 * size;
    return thumbUp ? 'thumbs' : 'fist';
  }
  if (n >= 3) return 'open';
  return 'none';
}
