const { StepDetector } = require('./steps.js');

let seed = 12345;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const rnd = (a) => (rand() - 0.5) * 2 * a;

function run(gen, seconds, hz = 60, opts, jitter = false) {
  const d = StepDetector(opts); let total = 0;
  for (let i = 0; i < seconds * hz; i++) {
    const t = (i / hz) * 1000 + 1000 + (jitter ? rnd(4) : 0);
    const [x, y, z] = gen(t / 1000);
    total += d.push(x, y, z, t);
  }
  return total;
}
const TAU = 2 * Math.PI;
// walking with a second harmonic (the double bump real steps have) plus sensor noise
const walk = (f, A, harm = 0.5, noise = 0.3) => (t) => [rnd(noise), 9.8 + A * Math.sin(TAU * f * t) + harm * A * Math.sin(TAU * 2 * f * t + 1) + rnd(noise), rnd(noise)];

const tests = [
  ['walk 2.0 steps/s pocket, 30s (expect ~60)', () => run(walk(2, 3), 30), (n) => n >= 54 && n <= 62],
  ['walk 1.6 steps/s in hand with double bumps, 30s (expect ~48)', () => run(walk(1.6, 1.8, 0.7), 30), (n) => n >= 42 && n <= 52],
  ['slow walk 1.2 steps/s, 25s (expect ~30)', () => run(walk(1.2, 2.5), 25), (n) => n >= 25 && n <= 33],
  ['brisk walk 2.6 steps/s, 20s (expect ~52)', () => run(walk(2.6, 4), 20), (n) => n >= 44 && n <= 56],
  ['tilted phone, gravity on x (expect ~60)', () => run((t) => [9.8 + 3 * Math.sin(TAU * 2 * t), 0, 0], 30), (n) => n >= 54 && n <= 62],
  ['walking with sharp heel-strike spikes of 2.5 g (expect ~60)', () => run((t) => { const ph = (t * 2) % 1; const spike = ph < 0.05 ? 22 : 0; return [rnd(.3), 9.8 + 3 * Math.sin(TAU * 2 * t) + spike, rnd(.3)]; }, 30), (n) => n >= 52 && n <= 62],
  ['25 Hz sensor, walking 30s (expect ~60)', () => run(walk(2, 3), 30, 25), (n) => n >= 50 && n <= 62],
  ['jittery timestamps, walking 30s', () => run(walk(2, 3), 30, 60, {}, true), (n) => n >= 52 && n <= 62],
  ['8 steps then stop (expect 6-8)', () => run((t) => (t < 5 ? walk(2, 3)(t) : [0, 9.8, 0]), 10), (n) => n >= 6 && n <= 9],
  ['3 steps only (expect 0)', () => run((t) => (t < 2.5 ? walk(2, 3)(t) : [0, 9.8, 0]), 8), (n) => n === 0],
  ['phone resting with noise (expect 0)', () => run(() => [rnd(.15), 9.8 + rnd(.15), rnd(.15)], 60), (n) => n === 0],
  ['table vibration 12 Hz (expect 0)', () => run((t) => [0, 9.8 + 1.5 * Math.sin(TAU * 12 * t), 0], 30), (n) => n === 0],
  ['slow arm swing 0.5 Hz big (expect 0)', () => run((t) => [0, 9.8 + 5 * Math.sin(TAU * 0.5 * t), 0], 30), (n) => n === 0],
  ['random hand fidgeting, irregular bumps (expect <=3)', () => {
    let next = 1, amp = 0; return run((t) => { if (t > next) { amp = 3 + rnd(2); next = t + 0.35 + rand() * 1.8; } amp *= 0.9; return [0, 9.8 + amp * Math.sin(TAU * 3 * t), 0]; }, 40);
  }, (n) => n <= 3],
  ['violent shaking 4 Hz, 30 m/s2 (expect 0)', () => run((t) => [0, 9.8 + 30 * Math.sin(TAU * 4 * t), 0], 20), (n) => n === 0],
  ['phone put down / picked up thumps (expect 0)', () => run((t) => [0, 9.8 + ((t > 3 && t < 3.1) || (t > 9 && t < 9.1) ? 6 : 0), 0], 15), (n) => n === 0],
];
let bad = 0;
for (const [name, f, ok] of tests) { const n = f(); const pass = ok(n); if (!pass) bad++; console.log(pass ? 'PASS' : 'FAIL', name, '->', n); }
process.exit(bad ? 1 : 0);
