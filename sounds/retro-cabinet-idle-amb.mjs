// Cabinet idle: a loopable 2 s arcade cabinet at rest. Mains hum and CRT flyback whine through the cabinet body, a fan
// built from a blade-pass tone and a wobbling air band, and square-wave attract-mode chirps from the speaker on top.
export const meta = {
  title: "Cabinet Idle Hum", kind: "ambience", format: "sound", duration: 2, price: 4, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Retro Arcade", description: "A seamless 2 s idle bed of one arcade cabinet: CRT hum, cooling fan and attract-mode chirps, with the cabinet type and every layer as knobs, for arcade rooms and retro menus.",
  tags: ["arcade", "cabinet", "crt", "hum", "fan", "chiptune", "loop", "retro"],
};
export const params = { knobs: {
  cabinet: { type: "choice", label: "Cabinet type", default: "upright", options: ["upright", "cocktail", "sit-down"] },
  hum: { type: "range", label: "Hum", default: 0.5, min: 0, max: 1, step: 0.01 },
  fan: { type: "range", label: "Fan noise", default: 0.4, min: 0, max: 1, step: 0.01 },
  rate: { type: "range", label: "Chirp rate (per s)", default: 1.5, min: 0.5, max: 6, step: 0.5 },
  loop: { type: "toggle", label: "Seamless loop", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, ci = params.knobs.cabinet.options.indexOf(p.cabinet), TAU = c.TAU;
  const r = c.rng(p.seed * 4513 + ci * 97 + 3), n = c.seconds(2, sr), X = c.seconds(0.25, sr), P = c.seconds(0.3, sr), L = P + X + n, O = P + X;
  const cab = [
    { body: 190, bq: 2.2, fanF: 900, blade: 112, spk: 1900, spkQ: 1.4, rumble: 0.4 },
    { body: 140, bq: 1.5, fanF: 1500, blade: 156, spk: 2900, spkQ: 0.8, rumble: 0.25 },
    { body: 85, bq: 2.8, fanF: 620, blade: 88, spk: 1250, spkQ: 1.1, rumble: 0.7 },
  ][ci];
  const hg = 0.04 + 0.22 * p.hum, fg = 0.03 + 0.24 * p.fan;
  const hf = [60, 120, 180, 240, 360], ha = [1, 0.5 + 0.4 * r(), 0.3 + 0.3 * r(), 0.12 + 0.2 * r(), 0.08 + 0.15 * r()];
  const whine = sr >= 44100 ? 0.05 * hg : 0, kb = 1 + Math.floor(r() * 2), pb = r() * TAU;
  const hum = new Float32Array(L), bodyH = c.biquad("bp", cab.body * (0.97 + 0.06 * r()), cab.bq, sr);
  for (let i = 0; i < L; i++) {
    const t = (i - O) / sr; let h = 0;
    for (let k = 0; k < 5; k++) h += ha[k] * Math.sin(TAU * hf[k] * t);
    h *= (1 + 0.07 * Math.sin(TAU * kb * t / 2 + pb)) / 2.2;
    hum[i] = hg * (h + 0.9 * bodyH(h)) + whine * Math.sin(TAU * 15734 * t);
  }
  const bladeHz = Math.round(cab.blade * (0.94 + 0.12 * r()) * 2) / 2;
  const k1 = 1 + Math.floor(r() * 3), k2 = 4 + Math.floor(r() * 4), p1 = r() * TAU, p2 = r() * TAU, d1 = 0.08 + 0.08 * r(), d2 = 0.03 + 0.05 * r();
  const air = c.pink(r, L), low = c.brown(r, L), fbp = c.biquad("bp", cab.fanF * (0.9 + 0.2 * r()), 0.8, sr);
  const flp = c.biquad("lp", 220, 0.7, sr), bodyF = c.biquad("bp", cab.body, cab.bq * 0.7, sr), fanB = new Float32Array(L);
  let wob = 1;
  for (let i = 0; i < L; i++) {
    const t = (i - O) / sr;
    if (i % 64 === 0) wob = 1 + d1 * Math.sin(TAU * k1 * t / 2 + p1) + d2 * Math.sin(TAU * k2 * t / 2 + p2);
    const bl = Math.sin(TAU * bladeHz * t), f = (2.0 * fbp(air[i]) * (0.6 + 0.4 * bl) + cab.rumble * flp(low[i])) * wob;
    const tone = (0.34 * bl + 0.12 * Math.sin(TAU * 2 * bladeHz * t)) * wob;
    fanB[i] = fg * (f + tone + 0.5 * bodyF(f + tone));
  }
  const out = new Float32Array(n);
  for (let j = 0; j < n; j++) out[j] = hum[O + j] + fanB[O + j];
  if (p.loop) for (let j = n - X; j < n; j++) {
    const a = (j - n + X) / X;
    out[j] = hum[O + j] + fanB[O + j] * Math.cos(a * Math.PI / 2) + fanB[O + j - n] * Math.sin(a * Math.PI / 2);
  }
  const blip = (dur, fn, gate, duty) => {
    const m = c.seconds(dur, sr), x = c.osc("square", fn, m, sr, { duty }), hp = c.biquad("hp", 140, 0.7, sr), bp = c.biquad("bp", cab.spk, cab.spkQ, sr);
    for (let i = 0; i < m; i++) {
      const t = i / sr, y = hp(x[i] * gate(t) * Math.min(1, i / (0.0015 * sr), (dur - t) / 0.004));
      x[i] = 0.35 * y + bp(y);
    }
    return x;
  };
  const scale = [0, 3, 5, 7, 10, 12, 15, 17], root = 392 * Math.pow(2, Math.floor(r() * 6) / 12);
  const count = Math.max(1, Math.round(p.rate * 2));
  let placed = 0;
  for (let k = 0; k < count; k++) {
    const t0 = (k + 0.15 + 0.7 * r()) / count * 2, type = Math.floor(r() * 3), duty = r() < 0.5 ? 0.5 : 0.25;
    if (count > 3 && placed > 0 && r() < 0.2) continue;
    let x;
    if (type === 0) {
      const m = 3 + Math.floor(r() * 3), s = 0.03 + 0.015 * r(), up = r() < 0.6, b = Math.floor(r() * 3);
      const notes = []; for (let q = 0; q < m; q++) notes.push(root * Math.pow(2, scale[b + (up ? q : m - 1 - q)] / 12));
      x = blip(m * s + 0.02, (t) => notes[Math.min(m - 1, Math.floor(t / s))], (t) => Math.exp(-(t % s) / (s * 0.7)), duty);
    } else if (type === 1) {
      const hi = root * (3 + r() * 2);
      x = blip(0.09, (t) => hi * Math.exp(-t * 16), (t) => Math.exp(-t / 0.05), duty);
    } else {
      const f1 = root * 2, s = 0.035 + 0.01 * r();
      x = blip(0.15, (t) => (t < s ? f1 : f1 * 4 / 3), (t) => (t < s ? 1 : Math.exp(-(t - s) / 0.04)), duty);
    }
    placed++;
    const st = Math.floor(t0 * sr), cg = 0.42 * (0.65 + 0.35 * r());
    for (let i = 0; i < x.length; i++) {
      let q = st + i;
      if (q >= n) { if (!p.loop) break; q -= n; }
      out[q] += x[i] * cg;
    }
  }
  c.finish(out, 0.8);
  c.fade(out, p.loop ? 10 : 250, sr);
  return { samples: out };
}
