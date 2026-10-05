// Horse call: a snort onset, a rough low start that leaps up a register break into a held scream, then a falling glide in gated gasps with growl subharmonics (whinny), or a short low pulsed grunt train (nicker). Formants open on the squeal and close on the fall; breath, exhale chuff and an optional stable tail follow the voice.
export const meta = {
  title: "Horse Whinny", kind: "sfx", format: "sound", duration: 2, price: 2, author: "hollowbody", payout: "hollowbody@creators.oasis.example", kit: "Medieval Market", description: "A horse whinny with a leaping squeal and pulsed falling gasps, or a low pulsed nicker; size, agitation, breathiness, length, pitch and squeal sweep are knobs, for market stables in medieval scenes, games and film.",
  tags: ["horse", "whinny", "neigh", "nicker", "animal", "medieval", "market", "stable"],
};
export const params = { knobs: {
  call: { type: "choice", label: "Call", default: "whinny", options: ["whinny", "nicker"] },
  size: { type: "choice", label: "Horse size", default: "mare", options: ["pony", "mare", "warhorse"] },
  agitation: { type: "range", label: "Agitation", default: 0.5, min: 0, max: 1, step: 0.01 },
  breathiness: { type: "range", label: "Breathiness", default: 0.4, min: 0, max: 1, step: 0.01 },
  length: { type: "range", label: "Length", default: 0.5, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Pitch", default: 0.5, min: 0, max: 1, step: 0.01 },
  sweep: { type: "range", label: "Squeal sweep", default: 0.6, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Stable tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.size.options.indexOf(p.size) * 47 + (p.call === "nicker" ? 501 : 3));
  const S = { pony: { b: 600, fm: 1.25, np: 7, d: 0.85, rough: 0.25, pk: 1 }, mare: { b: 430, fm: 1, np: 5, d: 1, rough: 0.5, pk: 0.9 }, warhorse: { b: 290, fm: 0.76, np: 4, d: 1.2, rough: 1, pk: 0.75 } }[p.size];
  const nick = p.call === "nicker", a = p.agitation, b = p.breathiness, L = p.length;
  const dur = (nick ? 0.5 + 0.8 * L : 0.9 + 1 * L) * S.d, n = c.seconds(dur, sr);
  const base = S.b * (nick ? 0.55 : 1) * Math.pow(2, (p.pitch - 0.5) * 0.9);
  const pk = 1 + (0.8 + 1.1 * p.sweep) * S.pk * 1.2;
  const np = S.np + Math.round(3 * a), nn = Math.max(5, Math.round(dur * (8 + 5 * a)));
  const jit = [], pj = [];
  for (let k = 0; k < 80; k++) jit.push((r() - 0.5) * (0.02 + 0.05 * a));
  for (let k = 0; k < 40; k++) pj.push(r() - 0.5);
  const gate = new Float32Array(n), open = new Float32Array(n), sub = new Float32Array(n);
  const f0 = (i) => {
    const t = i / sr, u = t / dur; let g, m = 1, o = 0.5, sb = 0.5;
    if (nick) {
      const k = u * nn + pj[(u * 9) | 0] * 0.2, fr = k - Math.floor(k);
      g = (0.95 + 0.3 * Math.sin(Math.PI * Math.min(1, u * 1.6)) - 0.3 * u) * (1 - 0.15 * fr);
      m = (0.08 + 0.92 * Math.pow(Math.sin(Math.PI * (fr * 0.8 + 0.1)), 0.8)) * Math.pow(Math.sin(Math.PI * u), 0.4);
      o = 0.4 + 0.3 * Math.sin(Math.PI * u); sb = 0.7;
    } else if (u < 0.05) { g = 0.55 + 0.1 * u / 0.05; m = 0.4 + 0.3 * u / 0.05; o = 0.3; sb = 1; }
    else if (u < 0.17) {
      const x = (u - 0.05) / 0.12; g = (0.65 + (pk - 0.65) * (1 - (1 - x) * (1 - x))) * (x > 0.55 ? 1.12 : 1);
      m = 0.7 + 0.3 * x; o = x; sb = 1 - 0.6 * x;
    } else if (u < 0.42) {
      const x = (u - 0.17) / 0.25;
      g = pk * 1.05 * (1 + 0.08 * Math.sin(Math.PI * x)) * (1 + (0.03 + 0.04 * a) * Math.sin(t * 50)) * (1 + pj[(t * 14) | 0] * 0.12 * a);
      o = 1; sb = 0.2 + 0.8 * a * (0.5 + pj[(t * 11) | 0]);
    } else {
      const v = (u - 0.42) / 0.58, k = v * np + pj[(v * np) | 0] * 0.4, fr = k - Math.floor(k);
      g = (0.45 + (pk * 0.95 - 0.45) * Math.pow(1 - v, 1.2)) * (1 - 0.18 * fr);
      m = (0.08 + 0.92 * Math.pow(Math.sin(Math.PI * Math.min(1, fr * 0.85 + 0.08)), 0.8)) * Math.pow(1 - v, 0.6);
      o = 1 - 0.8 * v; sb = 0.4 + 0.6 * v;
    }
    gate[i] = m; open[i] = o; sub[i] = sb;
    return base * g * (1 + jit[Math.min(79, (t * 30) | 0)]);
  };
  const src = new Float32Array(n), asp = c.noise(r, n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const f = f0(i); ph += f / sr;
    let s = 0;
    const hn = Math.min(10, Math.floor(0.45 * sr / f));
    for (let h = 1; h <= hn; h++) s += Math.sin(c.TAU * ph * h) / Math.pow(h, 1.05);
    s += S.rough * (0.2 + a) * sub[i] * (Math.sin(c.TAU * ph * 0.5) + 0.6 * Math.sin(c.TAU * ph * 1.5));
    src[i] = s * 0.5 + asp[i] * (0.06 + 0.45 * b) * (0.5 + sub[i]);
  }
  const A = [c.biquad("bp", 900 * S.fm, 3, sr), c.biquad("bp", 2500 * S.fm, 4, sr), c.biquad("bp", 3800, 3, sr)];
  const B = [c.biquad("bp", 550 * S.fm, 3, sr), c.biquad("bp", 1150 * S.fm, 4, sr), c.biquad("bp", 2400, 3, sr)];
  const body = new Float32Array(n), att = c.seconds(0.008, sr), rel = c.seconds(0.12, sr);
  for (let i = 0; i < n; i++) {
    const x = src[i], o = open[i];
    body[i] = (o * (A[0](x) * 1.1 + A[1](x) * 0.9 + A[2](x) * (0.2 + 0.4 * a)) + (1 - o) * (B[0](x) * 1.3 + B[1](x) * 0.8 + B[2](x) * 0.15)) * gate[i] * Math.min(1, i / att, (n - i) / rel);
  }
  const out = new Float32Array(n + c.seconds(p.tail ? 1 : 0.35, sr));
  c.mix(out, body, 0.07, 0.9, sr);
  const sn = c.seconds(0.13, sr), snort = c.noise(r, sn), sl = c.biquad("bp", 1500, 0.9, sr), se = c.env(sn, 0.025, 0.045, sr);
  for (let i = 0; i < sn; i++) snort[i] = sl(snort[i]) * se[i] * (0.7 + 0.3 * Math.sin(i / sr * 160));
  c.mix(out, snort, 0.005, (0.35 + 0.6 * b) * (nick ? 0.4 : 1), sr);
  const br = c.noise(r, n), bh = c.biquad("hp", 3200, 0.7, sr);
  for (let i = 0; i < n; i++) br[i] = bh(br[i]) * gate[i] * (0.4 + 0.6 * open[i]) * Math.min(1, (n - i) / rel);
  c.mix(out, br, 0.07, 0.1 * b, sr);
  const en = c.seconds(0.3, sr), ex = c.noise(r, en), el = c.biquad("lp", 1600, 0.8, sr), ee = c.env(en, 0.06, 0.1, sr);
  for (let i = 0; i < en; i++) ex[i] = el(ex[i]) * ee[i];
  c.mix(out, ex, 0.07 + dur * 0.85, (0.2 + 0.4 * b) * (nick ? 0.6 : 1), sr);
  const res = p.tail ? c.reverb(out, { size: 0.7, decay: 0.5, mixAmt: 0.3 }, sr) : out;
  c.finish(res, 0.85, 1.1);
  c.fade(res, 40, sr);
  return { samples: res };
}
