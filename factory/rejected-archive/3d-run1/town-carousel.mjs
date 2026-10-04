// Town Carousel: a fairground carousel with a tall banded witch-hat roof, a candy-striped centre pole and chunky
// horses on brass poles. Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the
// footprint corner, y up, street side at z = 0).
export const meta = {
  title: "Town Carousel",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A toy fairground carousel for the town square: a tall striped cone roof, a candy-striped centre pole and 4-8 horses riding brass poles, ringed with bulbs that glow at night.",
  tags: ["3d", "low poly", "carousel", "merry-go-round", "fairground", "funfair", "park", "town"],
  price: 4,
  author: "oasis-factory",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    roofA: { type: "color", role: "primary", label: "Roof stripe", default: "#E5484D" },
    roofB: { type: "color", role: "background", label: "Roof stripe 2", default: "#F6EEE0" },
    trim: { type: "color", role: "secondary", label: "Deck & valance", default: "#2F7A55" },
    horse: { type: "color", role: "surface", label: "Horses", default: "#F3E3C8" },
    accent: { type: "color", role: "highlight", label: "Brass", default: "#F2B33D" },
    horses: { type: "range", label: "Horses", default: 6, min: 4, max: 8, step: 1 },
    stripes: { type: "range", label: "Roof stripes", default: 4, min: 2, max: 6, step: 1 },
    lights: { type: "toggle", label: "Lights", default: true },
  },
  presets: {
    Tram: { roofA: "#2F7A55", roofB: "#F6EEE0", trim: "#C8553D", horse: "#F6EEE0", accent: "#F2B33D" },
    Bluebell: { roofA: "#3E7BFA", roofB: "#F6EEE0", trim: "#5B6270", horse: "#F3E3C8", accent: "#F2B33D" },
    Blossom: { roofA: "#E87DA3", roofB: "#FFF6EC", trim: "#7D5BA6", horse: "#F6EEE0", accent: "#F2B33D" },
  },
};

// ---- colour helpers: keep every brand input legible and harmonious ----
const rgb = (h) => [1, 3, 5].map((i) => parseInt(String(h).slice(i, i + 2), 16) || 0);
const hex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (h) => {
  const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const toward = (c, target, ok) => { for (let t = 0; t <= 1.001; t += 0.05) { const m = mix(c, target, t); if (ok(m)) return m; } return target; };

export function build(p) {
  const parts = [];
  const E = (e) => (e ? { e: true } : {});
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...E(e) });
  const cyl = (x, y, z, r, h, c, n, e) => parts.push({ t: "cyl", p: [x, y, z], r, h, c, n, ...E(e) });
  const cone = (x, y, z, r, h, c, n) => parts.push({ t: "cone", p: [x, y, z], r, h, c, n });

  const TAU = Math.PI * 2, CX = 3, CZ = 3;
  const ink = "#5B6270", wood = "#8A6E52", kerb = "#D9DCE1", glass = "#7E93A8";
  const on = !!p.lights;

  // brand-safe colours
  let trim = p.trim;
  if (lum(trim) > 0.22) trim = toward(trim, "#1F2630", (m) => lum(m) <= 0.22);
  if (lum(trim) < 0.04) trim = toward(trim, "#FFFFFF", (m) => lum(m) >= 0.04);
  const roofB = toward(p.roofB, "#FFFFFF", (m) => lum(m) >= 0.65);
  let roofA = p.roofA;
  if (lum(roofA) < 0.06) roofA = toward(roofA, "#FFFFFF", (m) => lum(m) >= 0.06);
  if (ratio(roofA, roofB) < 2.2) roofA = toward(roofA, "#2B3242", (m) => ratio(m, roofB) >= 2.2);
  const horseC = toward(p.horse, "#FFFFFF", (m) => lum(m) >= 0.5);
  const brass = toward(p.accent, "#FFF1C2", (m) => lum(m) >= 0.3);
  const lit = toward(mix("#FFD58A", brass, 0.2), "#FFF4D6", (m) => lum(m) >= 0.6);
  const bandOff = mix(trim, "#FFFFFF", 0.3);
  const bulb = on ? lit : glass;

  // ---- stepped round base: two full-circle treads, so the step meets the deck on every side ----
  const FLOOR = 0.58;
  cyl(CX, 0, CZ, 2.95, 0.18, kerb, 12);
  cyl(CX, 0.18, CZ, 2.8, 0.19, trim, 12);
  cyl(CX, 0.37, CZ, 2.62, 0.18, trim, 12);
  cyl(CX, 0.43, CZ, 2.66, 0.07, on ? lit : bandOff, 12, on); // deck light band
  cyl(CX, 0.55, CZ, 2.5, 0.03, wood, 12);

  // ---- canopy: chunky valance with a light band and a fringe of hanging bulbs ----
  const RIM_Y = 3.7, RIM_H = 0.5, RIM_R = 2.35;
  cyl(CX, RIM_Y, CZ, RIM_R, RIM_H, trim, 12);
  cyl(CX, RIM_Y + 0.19, CZ, RIM_R + 0.05, 0.12, on ? lit : bandOff, 12, on);
  const NB = 16, RBL = RIM_R - 0.12;
  for (let i = 0; i < NB; i++) {
    const a = ((i + 0.5) * TAU) / NB, bx = CX + Math.cos(a) * RBL, bz = CZ + Math.sin(a) * RBL;
    cyl(bx, RIM_Y - 0.14, bz, 0.05, 0.14, trim, 6);
    box(bx - 0.11, RIM_Y - 0.36, bz - 0.11, 0.22, 0.22, 0.22, bulb, on);
  }

  // ---- centre pole: brass foot, candy bands, glowing crown, brass collar ----
  cyl(CX, FLOOR, CZ, 0.55, 0.3, brass, 10);
  const bandY0 = FLOOR + 0.3, bandY1 = RIM_Y - 0.62, nb = 6, bh = (bandY1 - bandY0) / nb;
  for (let i = 0; i < nb; i++) cyl(CX, bandY0 + i * bh, CZ, 0.4, bh, i % 2 ? roofB : roofA, 10);
  cyl(CX, bandY1, CZ, 0.47, 0.32, on ? lit : glass, 10, on);
  cyl(CX, RIM_Y - 0.3, CZ, 0.55, 0.3, brass, 10);

  // ---- witch-hat roof: steep nested cones (H/R > 1.5 keeps every face sorting cleanly over the valance) ----
  const ROOF_Y = RIM_Y + RIM_H, R = 2.45, H = 3.75, LIP = 0.05, k = p.stripes;
  for (let i = 0; i < k; i++) {
    const hi = i === 0 ? 0 : (H * 0.9 * i) / k;
    const ri = R * (1 - hi / H) + (i ? LIP : 0);
    cone(CX, ROOF_Y + hi, CZ, ri, (ri * H) / R, i % 2 ? roofB : roofA, 12);
  }
  const apex = ROOF_Y + H + (k > 1 ? (LIP * H) / R : 0);

  // finial: brass spike, lamp, pennant
  cyl(CX, apex - 0.3, CZ, 0.08, 0.75, brass, 6);
  box(CX - 0.16, apex + 0.45, CZ - 0.16, 0.32, 0.32, 0.32, on ? lit : glass, on);
  cyl(CX, apex + 0.77, CZ, 0.03, 0.5, ink, 6);
  box(CX + 0.03, apex + 0.94, CZ - 0.02, 0.5, 0.28, 0.04, roofA);

  // ---- horses: one ring, layout solved so none touch, crowd the pole or leave the deck boards ----
  const n = p.horses, CAM = (5 * Math.PI) / 4;
  const U0 = -0.55, U1 = 0.74, V = 0.19;
  const frame = (a, HR) => {
    const cx = Math.cos(a) * HR, cz = Math.sin(a) * HR, tx = -Math.sin(a), tz = Math.cos(a);
    const alongX = Math.abs(tx) > Math.abs(tz), s = alongX ? Math.sign(tx) : Math.sign(tz);
    return { cx, cz, alongX, s };
  };
  const rect = (f, S) => {
    const a0 = Math.min(U0 * S * f.s, U1 * S * f.s), a1 = Math.max(U0 * S * f.s, U1 * S * f.s);
    return f.alongX ? [f.cx + a0, f.cx + a1, f.cz - V * S, f.cz + V * S] : [f.cx - V * S, f.cx + V * S, f.cz + a0, f.cz + a1];
  };
  let layout = { off: Math.PI / n, S: 0.7, HR: 1.85 };
  for (const S of [1.35, 1.25, 1.15, 1.05, 0.95, 0.88, 0.8, 0.72]) {
    let best = null;
    for (const HR of [1.85, 1.75, 1.95]) {
      for (let j = 0; j < 24; j++) {
        const off = ((j / 24) * TAU) / n;
        const rs = [];
        let ok = true, face = -1;
        for (let i = 0; i < n && ok; i++) {
          const a = off + (i * TAU) / n, r = rect(frame(a, HR), S);
          const far = Math.hypot(Math.max(Math.abs(r[0]), Math.abs(r[1])), Math.max(Math.abs(r[2]), Math.abs(r[3])));
          const nx = Math.max(r[0], Math.min(0, r[1])), nz = Math.max(r[2], Math.min(0, r[3]));
          if (far > 2.42 || Math.hypot(nx, nz) < 0.8) ok = false;
          face = Math.max(face, Math.cos(a - CAM));
          rs.push(r);
        }
        if (!ok) continue;
        let gap = Infinity;
        for (let i = 0; i < n; i++) for (let m = i + 1; m < n; m++) {
          const A = rs[i], B = rs[m];
          gap = Math.min(gap, Math.max(A[0] - B[1], B[0] - A[1], A[2] - B[3], B[2] - A[3]));
        }
        if (gap < 0.15) continue;
        const score = Math.min(gap, 0.4) + 0.3 * face;
        if (!best || score > best.score) best = { off, S, HR, score };
      }
    }
    if (best) { layout = best; break; }
  }

  const S = layout.S;
  for (let i = 0; i < n; i++) {
    const a = layout.off + (i * TAU) / n;
    const f = frame(a, layout.HR);
    const hx = CX + f.cx, hz = CZ + f.cz;
    const by = FLOOR + 0.44 * S + (i % 2 ? 0.5 : 0.18); // alternate up / down on the ride
    const hb = (u0, u1, dy, h, v0, v1, c) => {
      const a0 = Math.min(u0 * S * f.s, u1 * S * f.s), a1 = Math.max(u0 * S * f.s, u1 * S * f.s);
      const y = by + dy * S;
      if (f.alongX) box(hx + a0, y, hz + v0 * S, a1 - a0, h * S, (v1 - v0) * S, c);
      else box(hx + v0 * S, y, hz + a0, (v1 - v0) * S, h * S, a1 - a0, c);
    };
    cyl(hx, FLOOR, hz, 0.06, RIM_Y - FLOOR, brass, 8);          // brass pole, deck to valance
    hb(-0.42, 0.38, 0, 0.38, -0.16, 0.16, horseC);              // body
    hb(0.22, 0.48, 0.28, 0.4, -0.12, 0.12, horseC);             // neck
    hb(0.34, 0.74, 0.56, 0.24, -0.11, 0.11, horseC);            // head
    hb(0.2, 0.4, 0.64, 0.22, -0.05, 0.05, ink);                 // mane
    hb(0.42, 0.5, 0.78, 0.12, -0.05, 0.05, ink);                // ear
    for (const [u0, u1] of [[0.2, 0.32], [-0.38, -0.26]]) {
      for (const [v0, v1] of [[-0.14, -0.04], [0.04, 0.14]]) {
        hb(u0, u1, -0.36, 0.38, v0, v1, horseC);                // leg
        hb(u0, u1, -0.42, 0.06, v0, v1, ink);                   // hoof
      }
    }
    hb(-0.55, -0.4, 0.05, 0.3, -0.05, 0.05, ink);               // tail
    hb(-0.18, 0.12, 0.38, 0.06, -0.19, 0.19, roofA);            // saddle
    hb(-0.18, 0.12, 0.12, 0.26, -0.19, -0.16, roofA);
    hb(-0.18, 0.12, 0.12, 0.26, 0.16, 0.19, roofA);
    cyl(hx, by + 0.44 * S, hz, 0.1, 0.1, brass, 8);             // brass cuff where the pole leaves the saddle
    cyl(hx, by - 0.1, hz, 0.1, 0.1, brass, 8);                  // brass cuff under the belly
  }

  return { parts };
}
