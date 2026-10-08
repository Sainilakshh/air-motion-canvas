import { heuristicAnim, normalizeAnim } from './animation';
import type { Hook, RecognizeResult, Shot } from './types';

// [title, concept, visual, line]
type Beat = [string, string, string, string];
const mk = (name: string, intent: string, kw: string[], wiki: string, vd: string): RecognizeResult => {
  const anim = heuristicAnim(name + ' ' + intent);
  return { labels: [{ name, confidence: 0.9 }], intent, context: intent, keywords: kw, wikiTitle: wiki, motion: anim.primitives[0].type === 'bounce' ? 'bounce' : 'float', visualDirection: vd, confident: true, anim };
};
export const DEMO: { keys: string[]; r: RecognizeResult; fact: string; story: Beat[] }[] = [
  { keys: ['rocket', 'spacecraft'], r: mk('Rocket', 'Space Exploration', ['rocket launch', 'spacecraft', 'orbit'], 'Rocket', 'Launch and ascent into orbit'),
    fact: 'A rocket moves by pushing exhaust one way so the vehicle goes the other way.',
    story: [['Liftoff', 'Rocket launch', 'A rocket lifting off the pad', 'Every launch starts with a controlled explosion.'], ['The engine', 'Rocket engine', 'Close-up of engine flames', 'The engine throws exhaust down so the rocket goes up.'], ['Earth from orbit', 'Earth from orbit', 'Earth seen from space', 'Once in orbit, the whole planet fits in one frame.'], ['The takeaway', 'Space exploration', 'Rocket ascending into the stars', 'Reaching space takes a huge amount of engineering.']] },
  { keys: ['earth', 'planet'], r: mk('Earth', 'Planet Earth', ['earth from space', 'globe', 'planet'], 'Earth', 'Earth seen from orbit'),
    fact: 'Earth is the third planet from the Sun.',
    story: [['Blue marble', 'Earth from space', 'Earth rotating slowly in space', 'This is the only home we have ever known.'], ['Land and sea', 'Ocean and continents', 'Aerial view of continents and ocean', 'Most of its surface is ocean.'], ['Day and night', 'Sunrise over Earth', 'Terminator line moving across the globe', 'Every spin brings a new sunrise.'], ['The takeaway', 'Planet Earth', 'Earth glowing against black space', 'Small, fragile and absolutely worth protecting.']] },
  { keys: ['solar', 'sun'], r: mk('Solar energy', 'Renewable Energy', ['solar panels', 'sunlight', 'renewable energy'], 'Solar energy', 'Panels in sunlight'),
    fact: 'Solar panels turn sunlight into electricity using photovoltaic cells.',
    story: [['Sunlight', 'Sunlight', 'Sun rising over a field', 'The sun sends us far more energy than we use.'], ['The panel', 'Solar panels', 'Close-up of solar cells', 'Photovoltaic cells turn light straight into electricity.'], ['At scale', 'Solar farm', 'Aerial view of a solar farm', 'Thousands of panels together can power a town.'], ['The takeaway', 'Renewable energy', 'Panels glowing at sunset', 'Clean power that keeps coming every day.']] },
  { keys: ['tree'], r: mk('Tree', 'Growth', ['tree growing', 'forest', 'leaves'], 'Tree', 'A tree growing over time'),
    fact: 'Trees make food from sunlight, water and carbon dioxide.',
    story: [['The seed', 'Seed sprouting', 'A seed breaking through soil', 'Every forest begins as one tiny seed.'], ['Reaching up', 'Tree growing', 'Time-lapse of a sapling growing', 'It reaches for the light a little every day.'], ['The leaves', 'Leaves in sunlight', 'Sunlight through leaves', 'Leaves turn sunlight, water and air into food.'], ['The takeaway', 'Forest', 'Wide shot of a forest', 'Patience grows the biggest things.']] },
  { keys: ['car'], r: mk('Car', 'Driving', ['car driving', 'road', 'traffic'], 'Car', 'A car moving on a road'),
    fact: 'Most cars use an engine or electric motor to turn the wheels.',
    story: [['On the road', 'Car driving', 'Car moving along a highway', 'It looks simple, but a lot is happening under the hood.'], ['The engine', 'Car engine', 'Close-up of a running engine', 'The engine or motor turns power into wheel motion.'], ['The wheels', 'Wheels spinning', 'Wheels rolling on asphalt', 'The wheels turn that power into distance.'], ['The takeaway', 'Road trip', 'Car at sunset on an open road', 'Every journey starts with one turn of the wheel.']] },
  { keys: ['ball'], r: mk('Ball', 'Motion', ['bouncing ball', 'sports ball', 'slow motion'], 'Ball', 'A ball bouncing'),
    fact: 'A bouncing ball loses a little energy every bounce, so each bounce is lower.',
    story: [['The drop', 'Ball dropping', 'A ball falling in slow motion', 'It starts with gravity pulling the ball down.'], ['The bounce', 'Bouncing ball', 'Ball bouncing off the ground', 'The ground pushes back and the ball goes up again.'], ['Losing energy', 'Energy loss', 'Each bounce lower than the last', 'Each bounce is a little lower than the one before.'], ['The takeaway', 'Physics of motion', 'Ball coming to rest', 'Energy never vanishes, it just changes form.']] },
  { keys: ['house', 'home'], r: mk('House', 'Home', ['house exterior', 'home', 'architecture'], 'House', 'A house exterior'),
    fact: 'Houses shelter people from weather and temperature changes.',
    story: [['Home', 'House exterior', 'Warm-lit house at dusk', 'A house is more than walls and a roof.'], ['The structure', 'Building construction', 'Frame of a house being built', 'Strong structure is what keeps it standing.'], ['The shelter', 'Home interior', 'Cozy living room', 'It shelters us from weather and temperature swings.'], ['The takeaway', 'Home', 'Street of houses at night', 'Home is where everything else begins.']] },
  { keys: ['water', 'ocean', 'wave'], r: mk('Water', 'Waves', ['ocean waves', 'water', 'sea'], 'Water', 'Moving water'),
    fact: 'Water covers about 71% of the Earth’s surface.',
    story: [['Calm surface', 'Ocean surface', 'Still water at sunrise', 'Water looks calm, but it is always moving.'], ['The wave', 'Ocean waves', 'Waves rolling toward shore', 'Waves carry energy, not water, across the sea.'], ['Under the surface', 'Underwater', 'Sunbeams under the sea', 'Most of our planet is covered by it.'], ['The takeaway', 'Water cycle', 'Rain over the ocean', 'Water connects every living thing.']] },
];
export const findDemo = (t: string) => DEMO.find((d) => d.keys.some((k) => new RegExp('\\b' + k + '\\b', 'i').test(t)));

const uid = () => Math.random().toString(36).slice(2, 8);
// AI down ho to bhi storyboard ban jaye: concept-specific demo beats, nahi to generic beats
export function fallbackShots(r: RecognizeResult, fact: string, count = 4, total = 30): Shot[] {
  const demo = findDemo(r.wikiTitle + ' ' + r.labels[0].name);
  const generic: Beat[] = [['Opening visual', r.labels[0].name, r.visualDirection || r.intent, `${r.labels[0].name}: ${r.intent}.`], ['Close-up detail', r.keywords[0] || r.labels[0].name, 'Close-up of the key detail', ''], ['Bigger picture', r.keywords[1] || r.intent, 'Wide shot showing context', ''], ['Takeaway', r.intent, 'Closing visual', '']];
  const beats = (demo?.story || generic).slice(0, Math.max(1, count));
  const each = Math.max(2, Math.round(total / beats.length));
  return beats.map(([title, concept, visual, line], i) => ({
    id: uid(), title, concept, visual, brollIdea: concept, keywords: [concept, ...r.keywords.filter((k) => k !== concept)].slice(0, 3),
    line, duration: each, fact: i === 1 ? fact : '', broll: null, options: [], anim: normalizeAnim(null, concept + ' ' + title),
  }));
}
export function fallbackHooks(r: RecognizeResult): Hook[] {
  const n = r.labels[0].name;
  return [
    { style: 'Curiosity', text: `What if I told you ${n.toLowerCase()} works differently than you think?` },
    { style: 'Question', text: `Have you ever really wondered how ${n.toLowerCase()} works?` },
    { style: 'Shock/Stat', text: `Here is something about ${n.toLowerCase()} most people never notice.` },
    { style: 'Storytelling', text: `It started with one simple idea about ${n.toLowerCase()}...` },
  ];
}
export const normalizeShot = (s: any): Shot => ({
  id: s.id || uid(), title: s.title || 'Shot', concept: s.concept || '', visual: s.visual || '', brollIdea: s.brollIdea || '',
  keywords: Array.isArray(s.keywords) ? s.keywords : [], line: s.line || '', duration: Number(s.duration) || 5, fact: s.fact || '',
  broll: s.broll || null, options: Array.isArray(s.options) ? s.options : [], note: s.note, page: s.page, anim: normalizeAnim(s.anim, (s.concept || '') + ' ' + (s.title || '')),
});
