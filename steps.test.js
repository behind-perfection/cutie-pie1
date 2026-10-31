const { StepDetector } = require('./steps.js');
function run(gen, seconds, hz = 60, opts) {
  const d = StepDetector(opts); let total = 0;
  for (let i = 0; i < seconds * hz; i++) { const t = (i / hz) * 1000 + 1000; const [x, y, z] = gen(t / 1000); total += d.push(x, y, z, t); }
  return total;
}
const rnd = (a) => (Math.random() - 0.5) * 2 * a;
const tests = [
  ['walking 2 steps/s, 30s (expect ~56-60)', () => run((t) => [rnd(.3), 9.8 + 3 * Math.sin(2 * Math.PI * 2 * t), rnd(.3)], 30), (n) => n >= 52 && n <= 62],
  ['slow walk 1.5 steps/s, 20s (expect ~28-30)', () => run((t) => [0, 9.8 + 2.5 * Math.sin(2 * Math.PI * 1.5 * t), 0], 20), (n) => n >= 25 && n <= 32],
  ['phone resting with noise (expect 0)', () => run(() => [rnd(.15), 9.8 + rnd(.15), rnd(.15)], 30), (n) => n === 0],
  ['single bump / one shake (expect 0)', () => run((t) => [0, 9.8 + (t > 5 && t < 5.2 ? 4 : 0), 0], 10), (n) => n === 0],
  ['tilted phone, gravity on x, walking (expect ~56-60)', () => run((t) => [9.8 + 3 * Math.sin(2 * Math.PI * 2 * t), 0, 0], 30), (n) => n >= 52 && n <= 62],
  ['25 Hz sensor rate, walking 30s', () => run((t) => [0, 9.8 + 3 * Math.sin(2 * Math.PI * 2 * t), 0], 30, 25), (n) => n >= 50 && n <= 62],
];
let bad = 0;
for (const [name, f, ok] of tests) { const n = f(); const pass = ok(n); if (!pass) bad++; console.log(pass ? 'PASS' : 'FAIL', name, '->', n); }
process.exit(bad ? 1 : 0);
