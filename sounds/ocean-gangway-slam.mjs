// Gangway slam: a plate dropping onto the quay. Layers: stone contact crack + bright metallic clang, pitch-dropping body thump, many inharmonic plate modes (higher die first, slightly bent in pitch), a rebound slap, clustered loose-hardware rattle with chain jangle, and an optional harbour-air tail.
export const meta = {
  title: "Gangway Slam", kind: "impact", format: "sound", duration: 1.4, price: 2, author: "stormfront", payout: "stormfront@creators.oasis.example", kit: "Ocean Harbour", description: "A metal or timber-clad gangway plate slamming onto the stone quay with a bright clang, rebound, rattle of loose fittings and a damped ringing decay; for harbour scenes, boarding moments and dockside foley.",
  tags: ["gangway", "slam", "metal", "quay", "harbour", "impact", "dock", "rattle"],
};
export const params = { knobs: {
  material: { type: "choice", label: "Material", default: "steel", options: ["steel", "aluminium", "wood"] },
  force: { type: "range", label: "Force", default: 0.6, min: 0, max: 1, step: 0.01 },
  rattle: { type: "range", label: "Rattle", default: 0.5, min: 0, max: 1, step: 0.01 },
  ring: { type: "range", label: "Ring", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Harbour tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, mi = params.knobs.material.options.indexOf(p.material);
  const r = c.rng(p.seed * 613 + mi * 97 + 11), f = p.force, wood = mi === 2;
  const len = 1.2 + (p.tail ? 0.2 : 0);
  const out = new Float32Array(c.seconds(len, sr));
  const M = [
    { base: 190, modes: [1, 2.32, 3.87, 5.41, 7.9, 10.3, 13.1, 16.8], dec: 0.35, click: 5200, rdec: 0.014, rc: 4 },
    { base: 300, modes: [1, 2.76, 5.4, 8.93, 11.3, 14.2, 18.5, 22.1], dec: 0.6, click: 7000, rdec: 0.022, rc: 6 },
    { base: 150, modes: [1, 1.9, 3.1, 4.4, 6.3, 8.7], dec: 0.12, click: 3200, rdec: 0.008, rc: 2 },
  ][mi];
  const hit = (at, lvl) => {
    c.mix(out, c.burst(r, 0.025, "hp", 2000 + 0.4 * M.click, 0.8, 0.0005, 0.006, sr), at, (0.6 + 0.5 * f) * lvl, sr);
    c.mix(out, c.burst(r, 0.06, "bp", M.click * 0.55, 2, 0.001, 0.015, sr), at + 0.001, (0.4 + 0.4 * f) * lvl, sr);
    const n = c.seconds(0.2, sr), th = c.osc("sine", (t) => (M.base * 0.4 + 100 * Math.exp(-t * 30)) * (1 - 0.15 * f), n, sr);
    c.multiply(th, c.env(n, 0.002, 0.035 + 0.05 * f, sr));
    c.mix(out, th, at + 0.001, (0.35 + 0.5 * f) * lvl, sr);
    const ringDec = M.dec * (0.5 + 0.9 * p.ring), amp = (wood ? 0.3 : 0.2) * (0.3 + 0.9 * p.ring) * (0.6 + 0.5 * f) * lvl;
    M.modes.forEach((m, i) => {
      const fr = M.base * m * (0.985 + r() * 0.03) * (1.08 - 0.12 * f), d = ringDec / (1 + i * 0.45);
      const md = c.ring([[fr, 1], [fr * (1.004 + r() * 0.01), 0.6]], d * 4 + 0.05, d, sr);
      c.mix(out, md, at + 0.002 + r() * 0.002, amp / (1 + i * 0.25) * (0.7 + 0.3 * r()), sr);
    });
    if (wood) c.mix(out, c.ring([[M.base * 1.7, 1], [M.base * 3.3, 0.5]], 0.15, 0.04, sr), at + 0.002, 0.3 * lvl, sr);
  };
  hit(0, 1);
  const t2 = 0.1 + 0.06 * r() + 0.04 * (1 - f);
  hit(t2, 0.4 + 0.2 * f);
  if (f > 0.4) hit(t2 + 0.07 + 0.05 * r(), 0.18 * f);
  const hits = Math.round(8 + 30 * p.rattle);
  let t = t2 + 0.05;
  for (let h = 0; h < hits; h++) {
    const k = 1 - h / hits;
    t += (0.01 + r() * 0.035) * (0.5 + 0.9 * k);
    if (t > len - 0.25) break;
    const fr = M.base * (4 + r() * 12) * (wood ? 0.6 : 1);
    const a = (0.15 + 0.4 * r()) * (0.25 + 0.5 * k) * (0.3 + 0.7 * p.rattle) * (0.5 + 0.5 * f);
    c.mix(out, c.burst(r, 0.015, "bp", fr, 3, 0.0005, M.rdec * (0.5 + r()), sr), t, a, sr);
    c.mix(out, c.ring([[fr * 0.7, 1], [fr * 1.9, 0.5], [fr * 3.1, 0.3]], 0.06, M.rdec * M.rc * 0.5, sr), t, 0.1 * k * (0.3 + p.rattle), sr);
  }
  if (p.tail) {
    const tl = c.seconds(len - 0.1, sr), nz = c.pink(r, tl), lp = c.biquad("lp", 2500, 0.7, sr), e = c.env(tl, 0.02, 0.3, sr);
    for (let i = 0; i < tl; i++) nz[i] = lp(nz[i]) * e[i];
    c.mix(out, nz, 0.03, 0.08 + 0.1 * f, sr);
    const rv = c.reverb(out.slice(0, c.seconds(0.5, sr)), { size: 0.7, decay: 0.6, mixAmt: 1 }, sr);
    c.mix(out, rv, 0.01, 0.25, sr);
  }
  c.finish(out, 0.9, 1.3);
  c.gain(out, 0.8 + 0.2 * f);
  c.fade(out, 40, sr);
  return { samples: out };
}
