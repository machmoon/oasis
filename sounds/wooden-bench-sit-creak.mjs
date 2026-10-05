// Bench sit: a body dropping onto a tavern bench. A cloth swish leads into a dominant pitched-down body thump with short plank modes, then irregular stick-slip creaks through age-tuned wood formants, an optional weight shift, settle rustle and an optional low-ceiling room tail.
export const meta = {
  title: "Heavy Bench Sit", kind: "foley", format: "sound", duration: 1.1, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Wooden Tavern", description: "Someone sitting heavily on a wooden tavern bench: a padded body thump, a plank knock and uneven stick-slip creaks as the wood takes the load, with bench age, body weight, creak amount, settle time and room tail as knobs.",
  tags: ["bench", "sit", "creak", "wood", "furniture", "tavern", "foley", "chair"],
};
export const params = { knobs: {
  age: { type: "choice", label: "Bench age", default: "worn", options: ["new", "worn", "rickety"] },
  weight: { type: "range", label: "Body weight", default: 0.7, min: 0, max: 1, step: 0.01 },
  creak: { type: "range", label: "Creak amount", default: 0.6, min: 0, max: 1, step: 0.01 },
  settle: { type: "range", label: "Settle duration", default: 0.6, min: 0.2, max: 2, step: 0.05 },
  tail: { type: "toggle", label: "Room tail", default: false },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ai = params.knobs.age.options.indexOf(p.age), r = c.rng(p.seed * 7919 + ai * 131 + 3);
  const w = p.weight, k = 1.12 - 0.28 * w, T = 0.05 + 0.03 * r(), S = p.settle, ca = p.creak;
  const A = [
    { modes: [[230, 1], [590, 0.5], [1450, 0.3]], dec: 0.025, click: ["hp", 3000, 0.0015], form: [1500, 2900, 4300], rate: [420, 560], len: 0.16, jit: 0.14, skip: 0.03, cg: 0.55 },
    { modes: [[160, 1], [410, 0.5], [980, 0.2]], dec: 0.04, click: ["lp", 1800, 0.004], form: [450, 1050, 2000], rate: [150, 75], len: 0.5, jit: 0.32, skip: 0.08, cg: 1 },
    { modes: [[120, 1], [300, 0.6], [760, 0.3]], dec: 0.022, click: ["bp", 1300, 0.003], form: [340, 800, 1650], rate: [65, 120], len: 0.32, jit: 0.5, skip: 0.16, cg: 0.9 },
  ][ai];
  const ev = [];
  if (ca > 0.01) {
    const len0 = A.len * (0.7 + 0.6 * w) * (0.7 + 0.6 * r());
    ev.push({ t: T + 0.05 + 0.06 * r(), len: len0, f0: A.rate[0] * (0.85 + 0.3 * r()), f1: A.rate[1] * (0.8 + 0.4 * r()), amp: 1 });
    const m = Math.floor(r() * (1 + 3.5 * ca * Math.min(1, S / 0.6)) + 0.4 * ca);
    let t = ev[0].t + len0 * (0.5 + 0.7 * r());
    for (let j = 0; j < m; j++) {
      t += 0.03 + r() * r() * S * 0.6;
      if (t > T + S) break;
      const len = A.len * (0.2 + 0.55 * r());
      ev.push({ t, len, f0: A.rate[0] * (0.8 + 0.4 * r()), f1: A.rate[1] * (0.75 + 0.5 * r()), amp: 0.3 + 0.5 * r() });
      t += len * (0.3 + 0.6 * r());
    }
  }
  const shift = r() < 0.35 + 0.45 * w ? T + 0.2 * S + r() * 0.6 * S : -1;
  if (shift > 0 && ca > 0.01) ev.push({ t: shift + 0.02, len: A.len * (0.3 + 0.3 * r()), f0: A.rate[0] * (0.9 + 0.2 * r()), f1: A.rate[1], amp: 0.45 });
  let end = T + S + 0.06;
  for (const e of ev) end = Math.max(end, e.t + e.len + 0.04);
  if (shift > 0) end = Math.max(end, shift + 0.18);
  const out = new Float32Array(c.seconds(end + (p.tail ? 0.55 : 0), sr));
  const thump = (t0, g, wt) => {
    const n = c.seconds(0.22, sr), x = new Float32Array(n), lp = c.biquad("lp", 200 + 200 * (1 - wt), 0.7, sr);
    const f0 = (95 - 40 * wt) * (0.92 + 0.16 * r()), td = 0.035 + 0.05 * wt; let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr; ph += f0 * (1 + 0.7 * Math.exp(-t / 0.012)) / sr;
      x[i] = (0.8 * Math.sin(c.TAU * ph) + 0.7 * lp(r() * 2 - 1)) * Math.min(1, t / 0.002) * Math.exp(-t / td);
    }
    c.mix(out, x, t0, g, sr);
  };
  const knock = (t, amp) => {
    c.mix(out, c.ring([[(600 + 700 * r()) * k, 1], [(1700 + 900 * r()) * k, 0.4]], 0.04, 0.006, sr), t, amp, sr);
    c.mix(out, c.burst(r, 0.008, "hp", 2000, 0.7, 0.0004, 0.002, sr), t, amp * 0.5, sr);
  };
  const creak = (e) => {
    const n = c.seconds(e.len, sr), imp = new Float32Array(n), x = new Float32Array(n);
    const b = A.form.map((f) => c.biquad("bp", f * k * (0.9 + 0.2 * r()), 4, sr)), g = [1, 0.6, 0.3];
    let pos = Math.floor(r() * 40), walk = 0;
    while (pos < n) {
      const t = pos / n; walk = c.clamp(walk + (r() - 0.5) * 0.3, -0.4, 0.4);
      imp[pos] = (0.3 + 0.7 * r()) * (r() < 0.12 ? 1.8 : 1);
      let per = sr / ((e.f0 + (e.f1 - e.f0) * t) * k * (1 + walk)) * (1 + A.jit * (r() - 0.5) * 2);
      if (r() < A.skip) per *= 2 + 3 * r();
      pos += Math.max(2, Math.round(per));
    }
    let fl = 0.6, tg = 1, ss = 0;
    for (let i = 0; i < n; i++) {
      if (i % 220 === 0) tg = 0.25 + 0.75 * r();
      fl += (tg - fl) * 0.004;
      const s = imp[i] + (r() - 0.5) * 0.02, t = i / n;
      x[i] = (b[0](s) * g[0] + b[1](s) * g[1] + b[2](s) * g[2]) * Math.pow(Math.sin(Math.PI * t), 0.7) * fl;
      ss += x[i] * x[i];
    }
    c.mix(out, c.gain(x, 0.3 / Math.sqrt(ss / n + 1e-12)), e.t, 0.5 * ca * e.amp * A.cg * (0.6 + 0.4 * w), sr);
  };
  c.mix(out, c.burst(r, 0.07, "bp", 1100 + 400 * r(), 0.8, 0.045, 0.015, sr), T - 0.05, 0.08 + 0.08 * w, sr);
  thump(T, 0.9 + 0.6 * w, w);
  c.mix(out, c.ring(A.modes.map(([f, a]) => [f * k * (0.97 + 0.06 * r()), a]), 0.12, A.dec * (0.9 + 0.4 * w), sr), T + 0.002, 0.35 + 0.25 * w, sr);
  c.mix(out, c.burst(r, A.click[2] * 4, A.click[0], A.click[1], 0.8, 0.0005, A.click[2], sr), T, 0.3 + 0.15 * w, sr);
  if (ai === 2) { const kn = 2 + Math.floor(r() * 4); for (let j = 0; j < kn; j++) knock(T + 0.02 + Math.pow(r(), 1.5) * 0.14, (0.12 + 0.18 * r()) * (0.5 + 0.5 * w)); }
  for (const e of ev) { creak(e); if (ai === 2 && r() < 0.7) knock(e.t + e.len * r(), 0.08 + 0.06 * w); }
  if (shift > 0) thump(shift, 0.25 + 0.2 * w, w * 0.5);
  const bn = c.seconds(S, sr), bed = c.pink(r, bn), bh = c.biquad("bp", 1500, 0.7, sr);
  for (let i = 0; i < bn; i++) { const u = i / bn; bed[i] = bh(bed[i]) * Math.min(1, i / (0.02 * sr)) * (1 - u) * (1 - u); }
  c.mix(out, bed, T + 0.01, 0.05 * (0.5 + 0.5 * w), sr);
  const grains = Math.round((8 + 18 * w) * Math.sqrt(S));
  for (let j = 0; j < grains; j++) {
    const near = shift > 0 && r() < 0.35, u = Math.pow(r(), 1.8);
    const t = near ? shift + r() * 0.12 : T + 0.015 + u * S;
    c.mix(out, c.burst(r, 0.02 + 0.04 * r(), "bp", 1200 + 2200 * r(), 1.2, 0.003, 0.008 + 0.015 * r(), sr), t, (0.05 + 0.07 * r()) * (0.4 + 0.6 * w) * (1 - 0.6 * u), sr);
  }
  if (p.tail) {
    const wv = c.reverb(out, { size: 0.35, decay: 0.6, mixAmt: 0.4 }, sr);
    if (wv && wv !== out) out.set(wv.length > out.length ? wv.subarray(0, out.length) : wv);
  }
  c.finish(out, 0.9, 1.1);
  c.gain(out, 0.65 + 0.3 * w);
  c.fade(out, 10, sr);
  return { samples: out };
}
