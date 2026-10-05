// Push-start button: a plastic press (body thump + bright contact snap + spring release tick) then a clear two-note confirmation beep, with an optional short cabin room tail.
export const meta = {
  title: "Push Start Button", kind: "ui", format: "sound", duration: 0.6, price: 2, author: "quietmachine", payout: "quietmachine@creators.oasis.example", kit: "Car Interior", description: "An engine start button press with a soft or clicky feel, a spring release and a rising two-note confirmation beep, for car dashboards, consoles and sci-fi cockpits.",
  tags: ["car", "start", "button", "push", "beep", "dashboard", "interface", "confirm"],
};
export const params = { knobs: {
  feel: { type: "choice", label: "Button feel", default: "soft", options: ["soft", "clicky"] },
  click: { type: "range", label: "Click level", default: 0.6, min: 0, max: 1, step: 0.01 },
  beep: { type: "range", label: "Beep amount", default: 0.6, min: 0, max: 1, step: 0.01 },
  pitch: { type: "range", label: "Beep pitch", default: 1500, min: 800, max: 2600, step: 10 },
  length: { type: "range", label: "Beep length", default: 0.5, min: 0, max: 1, step: 0.01 },
  tail: { type: "toggle", label: "Cabin tail", default: true },
  seed: { type: "range", label: "Seed", default: 1, min: 1, max: 9999, step: 1 },
} };
export function build(p, c) {
  const sr = c.sr, r = c.rng(p.seed * 613 + 29), N = c.seconds(0.6, sr), out = new Float32Array(N);
  const soft = p.feel === "soft", k = p.click;
  const f0 = (soft ? 240 : 330) * (0.97 + r() * 0.06);
  c.mix(out, c.ring([[f0, 1], [f0 * 2.3, 0.3]], 0.06, soft ? 0.022 : 0.012, sr), 0.001, 0.35, sr);
  c.mix(out, c.burst(r, 0.015, "lp", 600, 0.8, 0.002, 0.005, sr), 0, soft ? 0.3 : 0.15, sr);
  const cf = soft ? 3200 : 5600;
  c.mix(out, c.burst(r, 0.01, "hp", cf * (0.95 + r() * 0.1), soft ? 0.8 : 1.5, 0.0004, soft ? 0.003 : 0.0016, sr), 0.0012, (0.2 + 0.9 * k) * (soft ? 0.7 : 1.2), sr);
  if (!soft) c.mix(out, c.ring([[3300 * (0.98 + r() * 0.04), 1], [5900, 0.5]], 0.03, 0.006, sr), 0.002, 0.4 * (0.3 + k), sr);
  const rt = 0.07 + r() * 0.012;
  c.mix(out, c.burst(r, 0.008, "hp", soft ? 2400 : 4200, 1, 0.0004, 0.0018, sr), rt, 0.2 + 0.5 * k, sr);
  c.mix(out, c.ring([[f0 * 1.5, 1]], 0.03, 0.008, sr), rt, 0.12, sr);
  const note = (f, d) => {
    const n = c.seconds(d, sr), x = new Float32Array(n), a = c.osc("sine", f, n, sr), b = c.osc("sine", f * 2, n, sr), h = c.osc("sine", f * 3, n, sr);
    const att = c.seconds(0.004, sr), rel = c.seconds(0.025, sr);
    for (let i = 0; i < n; i++) {
      const s = Math.min(1, i / att), q = Math.min(1, (n - i) / rel), body = 0.75 + 0.25 * Math.exp(-3 * i / n);
      x[i] = (a[i] * 0.8 + b[i] * 0.16 + h[i] * 0.05) * s * q * body;
    }
    return x;
  };
  const d1 = 0.07 + 0.08 * p.length, d2 = 0.11 + 0.15 * p.length, t1 = 0.14, t2 = t1 + d1 + 0.03;
  const g = 0.1 + 0.9 * p.beep;
  c.mix(out, note(p.pitch, d1), t1, g * 0.8, sr);
  c.mix(out, note(p.pitch * 1.335, d2), t2, g * 0.8, sr);
  if (p.tail) {
    const w = c.reverb(out.slice(), { size: 0.3, decay: 0.45, mixAmt: 1 }, sr);
    for (let i = 0; i < N; i++) out[i] = out[i] * 0.8 + w[i] * 0.35;
  }
  c.filter(out, c.biquad("lp", 12000, 0.7, sr));
  c.finish(out, 0.85, 1.05);
  c.fade(out, 25, sr);
  return { samples: out };
}
