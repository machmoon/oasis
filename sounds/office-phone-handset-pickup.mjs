// Office phone handset: lifted off or set on a cradle. Layers: plastic body knock (inharmonic modes, lower and longer when heavy), hook-switch clack (plunger tick and spring return), handling scrape, cord-coil rattle grains, optional 350+440 Hz dial tone after a pickup, and a room tail. The render is sized to its content.
export const meta = {
  title: "Handset Clack", kind: "foley", format: "sound", duration: 1.2, price: 2, author: "foleyroom", payout: "foleyroom@creators.oasis.example", kit: "Office", description: "A desk phone handset lifted off or set back on its cradle with a hook-switch clack, cord rattle and optional dial tone; for open-plan office scenes and call moments.",
  tags: ["phone", "handset", "cradle", "hook switch", "office", "foley", "landline", "hangup"],
};
export const params = { knobs: {
  action: { type: "choice", label: "Action", default: "pickup", options: ["pickup", "hangup", "slam"] },
  plastic: { type: "choice", label: "Plastic weight", default: "light", options: ["light", "heavy"] },
  force: { type: "range", label: "Force", default: 0.5, min: 0, max: 1, step: 0.01 },
  cord: { type: "range", label: "Cord rattle", default: 0.4, min: 0, max: 1, step: 0.01 },
  dial: { type: "range", label: "Dial tone", default: 0.3, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Room tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.action.options.indexOf(p.action) * 97 + 11);
  const heavy = p.plastic === "heavy", f = p.force, pick = p.action === "pickup", slam = p.action === "slam";
  const dialOn = pick && p.dial > 0.02;
  const end = pick ? (dialOn ? 1.35 : 0.65) : slam ? 0.8 : 0.6;
  const out = new Float32Array(c.seconds(end + (p.tail ? 0.7 : 0.12), sr));
  const k = heavy ? 0.6 : 1, amp = 0.35 + 0.65 * f * (slam ? 1.4 : 1);
  const knock = (t, g) => {
    const b = (heavy ? 170 : 330) * (0.97 + r() * 0.06);
    const modes = [[b, 1], [b * 2.3, 0.5], [b * 3.7, 0.3], [b * 5.9, 0.15]].map(([x, a]) => [x * (0.99 + r() * 0.02), a]);
    c.mix(out, c.ring(modes, heavy ? 0.28 : 0.16, (heavy ? 0.075 : 0.03) + 0.02 * f, sr), t, 0.6 * g, sr);
    c.mix(out, c.burst(r, 0.015, "bp", 1800 * k + 1500 * f, 1.2, 0.0006, 0.005, sr), t, (heavy ? 0.3 : 0.55) * g, sr);
    if (heavy) c.mix(out, c.ring([[95 + 20 * r(), 1]], 0.15, 0.04, sr), t, 0.5 * g, sr);
  };
  const clack = (t, g) => {
    c.mix(out, c.burst(r, 0.006, "hp", 3000, 1, 0.0004, 0.0018, sr), t, 0.8 * g, sr);
    c.mix(out, c.ring([[2400 * (0.95 + r() * 0.1), 1], [4100 * (0.97 + r() * 0.06), 0.5], [900, 0.4]], 0.05, 0.008, sr), t, 0.5 * g, sr);
  };
  const rattle = (t0, len, g) => {
    const m = Math.round(len * (30 + 80 * p.cord));
    for (let i = 0; i < m; i++) {
      const t = t0 + Math.pow(r(), 1.3) * len;
      c.mix(out, c.burst(r, 0.005 + r() * 0.006, "bp", 2500 + r() * 3500, 5, 0.0003, 0.002, sr), t, g * (0.2 + 0.6 * r()) * Math.exp(-(t - t0) / (len * 0.8)), sr);
    }
  };
  if (pick) {
    clack(0.02, amp * 0.8);
    clack(0.06 + 0.02 * r(), amp * 0.5);
    const n = c.seconds(0.3, sr), x = c.noise(r, n), bp = c.biquad("bp", 700, 1.2, sr);
    for (let i = 0; i < n; i++) { const u = i / n; x[i] = bp(x[i]) * Math.sin(Math.PI * u) * (0.5 + 0.5 * r()); }
    c.mix(out, x, 0.07, 0.3 * amp, sr);
    knock(0.2 + 0.05 * r(), 0.35 * amp);
    rattle(0.08, 0.4, 0.55 * p.cord);
  } else {
    const t = 0.03;
    knock(t, amp);
    clack(t + 0.004, amp);
    clack(t + 0.045 + 0.02 * r(), 0.55 * amp);
    if (slam) { knock(t + 0.09 + 0.03 * r(), 0.6 * amp); knock(t + 0.2 + 0.04 * r(), 0.3 * amp); rattle(t + 0.01, 0.6, 1.1 * p.cord); c.mix(out, c.ring([[95, 1], [140, 0.4]], 0.2, 0.06, sr), t, 0.4 * f, sr); }
    else rattle(t + 0.03, 0.45, 0.6 * p.cord);
  }
  if (dialOn) {
    const n = c.seconds(0.9, sr), x = new Float32Array(n), a = c.TAU / sr;
    for (let i = 0; i < n; i++) { const s = i / sr, e = Math.min(1, s / 0.04, (0.9 - s) / 0.12); x[i] = (Math.sin(a * 350 * i) + Math.sin(a * 440 * i)) * 0.5 * Math.max(0, e); }
    c.mix(out, x, 0.42, 0.16 * p.dial, sr);
  }
  const res = p.tail ? c.reverb(out, { size: 0.35, decay: 0.5, mixAmt: 0.3 }, sr) : out;
  c.finish(res, 0.88, 1.1);
  c.fade(res, 25, sr);
  return { samples: res };
}
