import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
const wasmSrc = 'node_modules/@mediapipe/tasks-vision/wasm';
if (existsSync(wasmSrc)) {
  cpSync(wasmSrc, 'public/mediapipe/wasm', { recursive: true });
  console.log('[setup] mediapipe wasm copied');
} else console.warn('[setup] wasm folder nahi mila');
const model = 'public/models/hand_landmarker.task';
const url = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
if (!existsSync(model)) {
  try {
    mkdirSync('public/models', { recursive: true });
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    writeFileSync(model, Buffer.from(await r.arrayBuffer()));
    console.log('[setup] hand_landmarker.task downloaded');
  } catch (e) {
    console.warn('[setup] model download fail:', e.message, '\nManually public/models/hand_landmarker.task mein rakho. URL:', url);
  }
}
