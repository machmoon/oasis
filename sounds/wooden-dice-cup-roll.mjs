// Dice Cup Roll: bone dice shaken in a leather-to-wood cup, then thrown on a tavern table. Each shake reversal fires a wall knock
// (leather thump or hollow wood knock) and a front-loaded cluster of bone clicks that grows with the dice count. The throw gives
// each die bounces with shrinking gaps, an accelerating tumble and a final clack on short, randomised table modes. Tail: spin-down plus a dry room.
export const meta = {
  title: "Bone Dice Toss", kind: "sfx", format: "sound", duration: 2, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "Bone dice shaken in a leather or wooden cup and rolled across a wooden table. Use it for tavern gambling scenes, board-game UI or a game-of-chance beat.",
  tags: ["dice", "roll", "gambling", "tavern", "bone", "cup", "table", "foley"],
};
export const params = { knobs: {
  dice: { type: "choice", label: "Dice count", default: "2", options: ["1", "2", "5"] },
  shake: { type: "range", label: "Shake duration", default: 0.7, min: 0.2, max: 1.2, step: 0.05 },
  energy: { type: "range", label: "Roll energy", default: 0.5, min: 0, max: 1, step: 0.01 },
  cup: { type: "range", label: "Cup material (leather to wood)", default: 0.2, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Spin-down + room", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const N = +p.dice, sr = c.sr, r = c.rng(p.seed * 6113 + N * 97 + 3), E = p.energy, cup = p.cup, sh = p.shake;
  const shk = [], wall = [], roll = [];
  let t = 0.03, P = 0.075 + r() * 0.03;
  while (t < sh) {
    const A = Math.min(1, (t + 0.04) / 0.18) * (0.5 + 0.5 * r());
    wall.push([t, A]);
    const k = Math.round(N * (0.8 + 1.2 * r()) + (N > 1 ? N * (N - 1) * 0.3 * r() : 0));
    for (let j = 0; j < k; j++) shk.push([t + Math.pow(r(), 2) * 0.045, A * (0.3 + 0.7 * r())]);
    const half = P * (0.65 + 0.7 * r()), m = Math.round(N * 1.3 * r());
    for (let j = 0; j < m; j++) shk.push([t + 0.01 + r() * half, A * (0.1 + 0.25 * r())]);
    t += half; P = c.clamp(P + (r() - 0.5) * 0.025, 0.055, 0.125);
    if (r() < 0.12) t += 0.03 + r() * 0.06;
  }
  const t0 = sh + 0.1 + r() * 0.04; let lastT = t0, lastA = 0.2;
  for (let d = 0; d < N; d++) {
    let tt = t0 + (d ? 0.01 + r() * 0.09 : 0), G = (0.07 + 0.15 * E) * (0.85 + 0.3 * r()), A = (0.55 + 0.45 * E) * (d ? 0.65 + 0.35 * r() : 1);
    while (G > 0.035) { roll.push([tt, A, 1]); tt += G; G *= 0.5 + 0.15 * r(); A *= 0.62; }
    let g = 0.045 + 0.04 * r(), a = A * 1.1; const k = 3 + Math.round((3 + 5 * r()) * (0.3 + 0.7 * E));
    for (let j = 0; j < k; j++) { roll.push([tt, a * (0.55 + 0.45 * r()), 0]); tt += g * (0.75 + 0.5 * r()); g = Math.max(0.012, g * 0.8); a *= 0.9; }
    roll.push([tt, a * 1.3, 0.5]); roll.push([tt + 0.014 + r() * 0.012, a * 0.5, 0]); tt += 0.03;
    if (tt > lastT) { lastT = tt; lastA = a; }
  }
  if (N > 1) for (let j = 0; j < N * (N - 1) * (1 + 2 * E); j++) roll.push([t0 + 0.02 + r() * 0.4, (0.15 + 0.3 * r()) * (0.5 + 0.5 * E), 0]);
  let end = lastT;
  if (p.tail) {
    let te = lastT + 0.05, gap = 0.045, a = Math.max(0.12, lastA * 1.2);
    while (gap > 0.006) { roll.push([te, a * (0.8 + 0.2 * r()), 0]); te += gap; gap *= 0.87; a *= 0.97; }
    roll.push([te, a * 1.4, 0.4]); end = te + 0.02;
  }
  const n = Math.min(c.seconds(end + 0.15 + (p.tail ? 0.3 : 0), sr), c.seconds(3.5, sr));
  const out = new Float32Array(n), cupBuf = new Float32Array(n), inBuf = new Float32Array(n);
  const rubN = c.seconds(sh + 0.06, sr), rub = c.noise(r, rubN), rbp = c.biquad("bp", 500 + 2500 * cup, 1, sr);
  let ra = 0.5, rt = 0.5;
  for (let i = 0; i < rubN; i++) {
    if (i % 256 === 0) rt = 0.15 + 0.85 * r();
    ra += (rt - ra) * 0.004;
    rub[i] = rbp(rub[i]) * ra * Math.min(1, (rubN - i) / (0.04 * sr), i / (0.03 * sr));
  }
  c.mix(cupBuf, rub, 0, 0.12, sr);
  const cf = 650 + r() * 250;
  for (const [st, A] of wall) {
    c.mix(cupBuf, c.burst(r, 0.035, "lp", 190 + 80 * r(), 0.8, 0.002, 0.01, sr), st, (1 - cup) * 0.75 * A, sr);
    c.mix(cupBuf, c.burst(r, 0.006, "bp", 2400 + 800 * r(), 1.2, 0.0005, 0.002, sr), st, cup * 0.4 * A, sr);
    c.mix(cupBuf, c.ring([[cf * (0.96 + 0.08 * r()), 1], [cf * 2.7, 0.45], [cf * 5.1, 0.2]], 0.08, 0.008 + 0.012 * cup, sr), st + 0.0008, cup * 0.5 * A, sr);
  }
  for (const [et, a] of shk) {
    const f = 2300 + 2200 * r();
    c.mix(inBuf, c.burst(r, 0.003, "hp", 3000, 0.7, 0.0003, 0.0007, sr), et, a * 0.3, sr);
    c.mix(inBuf, c.ring([[f, 1], [f * 1.47, 0.6], [f * 2.3, 0.3]], 0.02, 0.0015 + 0.002 * r(), sr), et + 0.0003, a * 0.6, sr);
  }
  for (const [et, a, big] of roll) {
    const f = (2400 + 1800 * r()) * (0.9 + 0.2 * E);
    c.mix(out, c.burst(r, 0.004, "hp", 2800, 0.7, 0.0003, 0.0008, sr), et, a * 0.4, sr);
    c.mix(out, c.ring([[f, 1], [f * 1.51, 0.55], [f * 2.27, 0.25]], 0.02, 0.002 + 0.002 * r(), sr), et + 0.0003, a * 0.6, sr);
    c.mix(out, c.burst(r, 0.03, "lp", 350 + 300 * r(), 1, 0.0005, 0.005 + 0.006 * big, sr), et, a * (0.35 + 0.6 * big) * (0.6 + 0.5 * E), sr);
    if (a > 0.08) c.mix(out, c.ring([[150 + 120 * r(), 1], [380 + 200 * r(), 0.5], [800 + 400 * r(), 0.25]], 0.06, 0.006 + 0.007 * big, sr), et + 0.0006, a * (0.2 + 0.4 * big), sr);
  }
  c.filter(cupBuf, c.biquad("lp", 900 + 7000 * cup, 0.7, sr));
  c.filter(inBuf, c.biquad("lp", 1500 + 8500 * cup, 0.7, sr));
  c.mix(out, cupBuf, 0, 0.7, sr);
  c.mix(out, inBuf, 0, 0.5, sr);
  let o = out, fadeMs = 8;
  if (p.tail) { const rv = c.reverb(out, { size: 0.25, decay: 0.4, mixAmt: 0.12 }, sr); if (rv) o = rv; }
  const maxN = c.seconds(3.9, sr);
  if (o.length > maxN) { o = o.slice(0, maxN); fadeMs = 150; }
  c.fade(c.finish(o, 0.9), fadeMs, sr);
  return { samples: o };
}
