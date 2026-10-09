import type { Shot } from './types';

export type StoryNote = { level: 'check' | 'good'; text: string; shotId?: string };

// Lightweight editorial checks: flag likely issues without treating creative choices as errors.
export function checkStory(shots: Shot[], targetSeconds: number): StoryNote[] {
  if (!shots.length) return [{ level: 'check', text: 'Add at least one shot to review the story.' }];
  const notes: StoryNote[] = [];
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const seen = new Set<string>();
  shots.forEach((shot, i) => {
    const subject = norm(shot.concept || shot.title);
    if (subject && seen.has(subject)) notes.push({ level: 'check', text: 'This subject repeats; consider giving the shot a new visual angle.', shotId: shot.id });
    if (subject) seen.add(subject);
    if (!shot.line.trim()) notes.push({ level: 'check', text: 'Add a voice-over line for this shot.', shotId: shot.id });
    else if (shot.line.trim().split(/\s+/).length / Math.max(1, Number(shot.duration) || 1) > 3.4) notes.push({ level: 'check', text: 'The voice-over may be too fast for this shot duration.', shotId: shot.id });
    if (!shot.visual.trim()) notes.push({ level: 'check', text: 'Add a visual description so the shot is easy to produce.', shotId: shot.id });
    if (i > 0 && shot.title.trim() && norm(shot.title) === norm(shots[i - 1].title)) notes.push({ level: 'check', text: 'This title matches the previous shot.', shotId: shot.id });
  });
  const total = shots.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);
  if (targetSeconds > 0 && Math.abs(total - targetSeconds) > Math.max(3, targetSeconds * 0.15)) notes.push({ level: 'check', text: `The storyboard is ${Math.round(total)}s, noticeably different from the ${targetSeconds}s target.` });
  if (!notes.length) notes.push({ level: 'good', text: 'No obvious pacing, repetition, or missing-content issues found.' });
  return notes;
}
