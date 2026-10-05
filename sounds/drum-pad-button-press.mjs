// Drum pad button press: a step-button on a drum machine panel. Layered as plunger body (damped modes by switch type), a contact click edge (double snap on the clicky), a short bottom-out knock into the chassis, a faint panel resonance, then a separate release click after a hold, and an optional small-room tail. The buffer is sized to the content.
export const meta = {
  title: "Step Button Press", kind: "foley", format: "sound", duration: 0.4, price: 1, author: "kickdrum", payout: "kickdrum@creators.oasis.example", kit: "Drum Machine", description: "A mechanical step-button press and release on a drum machine panel, with switch type, force, release click and room as knobs; for sequencer UI foley and hardware close-ups.",
  tags: ["button", "press", "drum machine", "step", "switch", "panel", "foley", "click"],
};
export const params = { knobs: {
  switch: { type: "choice", label: "Switch", default: "tact", options: ["rubber", "tact", "clicky"] },
  force: { type: "range", label: "Force", default: 0.5, min: 0, max: 1, step: 0.01 },
  release: { type: "range", label: "Release click", default: 0.6, min: 0, max: 1, step: 0.01 },
  room: { type: "range", label: "Room", default: 0.3, min: 0, max: 1, step: 0.01 },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + params.knobs.switch.options.indexOf(p.switch) * 97 + 3);
  const f = p.force;
  const S = {
    rubber: { body: [[210, 1], [430, 0.35]], bd: 0.018, click: ["lp", 2200, 0.7], cg: 0.5, hold: 0.1, rel: ["lp", 2000, 0.8], rg: 0.5, hp: 90, knock: 1, pan: 260 },
    tact: { body: [[820, 1], [1900, 0.55], [3100, 0.25]], bd: 0.012, click: ["bp", 3800, 2], cg: 1, hold: 0.08, rel: ["bp", 3400, 2], rg: 0.9, hp: 220, knock: 0.6, pan: 520 },
    clicky: { body: [[1300, 1], [2700, 0.7], [4300, 0.45], [6100, 0.25]], bd: 0.02, click: ["bp", 5200, 5], cg: 1.2, hold: 0.12, rel: ["bp", 5600, 4], rg: 1.1, hp: 300, knock: 0.45, pan: 780 },
  }[p.switch];
  const j = () => 0.985 + r() * 0.03, strike = 0.4 + 0.8 * f, t0 = 0.006;
  const rt = t0 + S.hold + 0.03 * (1 - f) + r() * 0.02, rg = (0.2 + 0.8 * p.release) * S.rg;
  const n = c.seconds(rt + 0.1 + 0.3 * p.room, sr), dry = new Float32Array(n);
  c.mix(dry, c.ring(S.body.map(([hz, a]) => [hz * j(), a]), 0.12, S.bd * (0.8 + 0.5 * f), sr), t0 + 0.0008, 0.3 * strike, sr);
  c.mix(dry, c.burst(r, 0.012, S.click[0], S.click[1] * (0.9 + 0.2 * f), S.click[2], 0.0004, 0.003, sr), t0, S.cg * strike, sr);
  if (p.switch === "clicky") {
    const gap = 0.0028 + r() * 0.0012;
    c.mix(dry, c.burst(r, 0.01, "bp", 6800 * j(), 4, 0.0003, 0.002, sr), t0 + gap, 0.8 * strike, sr);
    c.mix(dry, c.ring([[7400 * j(), 1], [9300 * j(), 0.5]], 0.05, 0.007, sr), t0 + gap, 0.12 * strike, sr);
  }
  const bt = t0 + 0.007 + 0.004 * (1 - f);
  c.mix(dry, c.ring([[130 - 30 * f, 1], [260, 0.35]], 0.06, 0.01 + 0.012 * f, sr), bt, (0.2 + 0.5 * f) * S.knock, sr);
  c.mix(dry, c.burst(r, 0.015, "lp", 900 + 500 * f, 0.8, 0.0006, 0.004, sr), bt, (0.15 + 0.3 * f) * S.knock + 0.1, sr);
  c.mix(dry, c.ring([[S.pan * j(), 1], [S.pan * 1.9 * j(), 0.4]], 0.14, 0.045, sr), bt, 0.12 + 0.12 * f, sr);
  c.mix(dry, c.burst(r, 0.01, S.rel[0], S.rel[1] * j(), S.rel[2], 0.0004, 0.0025, sr), rt, rg * 1.1, sr);
  c.mix(dry, c.ring(S.body.map(([hz, a]) => [hz * 1.1 * j(), a]), 0.08, S.bd * 0.6, sr), rt + 0.0006, rg * 0.25, sr);
  c.mix(dry, c.ring([[160, 1]], 0.04, 0.008, sr), rt + 0.002, rg * 0.12, sr);
  c.mix(dry, c.ring([[S.pan * 1.05 * j(), 1]], 0.1, 0.035, sr), rt + 0.002, rg * 0.2, sr);
  c.filter(dry, c.biquad("hp", S.hp, 0.7, sr));
  c.finish(dry, 0.85, 1.1);
  const out = new Float32Array(n);
  const wet = c.reverb(dry.slice(), { size: 0.2 + 0.4 * p.room, decay: 0.15 + 0.35 * p.room, mixAmt: 1 }, sr);
  const lp = c.biquad("lp", 6500 - 2500 * p.room, 0.7, sr), wg = 0.55 * p.room;
  for (let i = 0; i < n; i++) out[i] = dry[i] * (1 - 0.2 * p.room) + lp(wet[i]) * wg;
  c.fade(out, 25, sr);
  c.finish(out, 0.85, 1.05);
  return { samples: out };
}
