// Town Car: a boxy toy hatchback for parking along Oasis Town streets. Block asset: build(p) returns parts in
// metres on the Oasis Town grid (origin at the footprint's corner, y up, street side at z = 0). The nose points
// to -x so the headlights face the canonical 45-degree camera. The roof runs almost to the tail and drops in a
// sloped hatch.
export const meta = {
  title: "Town Car",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A chunky two-tone toy hatchback with a stubby bonnet, sloped rear hatch and glowing headlights that parks kerbside beside shops and stalls.",
  tags: ["3d", "low poly", "car", "vehicle", "hatchback", "street", "parking", "town", "kit", "block"],
  price: 2,
  author: "oasis-factory",
  footprint: [4, 2],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    body: { type: "color", role: "primary", label: "Body", default: "#3E7BFA" },
    roof: { type: "color", role: "surface", label: "Roof", default: "#F6EEE0" },
    trim: { type: "color", role: "ink", label: "Bumpers & trim", default: "#5B6270" },
    length: { type: "range", label: "Length (m)", default: 3.3, min: 3.0, max: 3.7, step: 0.1 },
    doors: { type: "choice", label: "Doors", default: "3-door", options: ["3-door", "5-door"] },
    rack: { type: "toggle", label: "Roof box", default: true },
    lights: { type: "toggle", label: "Headlights on", default: true },
  },
  presets: {
    Sunny: { body: "#F2B33D", roof: "#F6EEE0", trim: "#5B6270" },
    Garden: { body: "#2F7A55", roof: "#F3E3C8", trim: "#3B4A44" },
    Cherry: { body: "#E5484D", roof: "#5B6270", trim: "#4A3A40" },
  },
};

// --- colour guards
function hexToHsl(hex) {
  const n = parseInt(String(hex).replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hslToHex(h, s, l) {
  const f = (t) => {
    t = (t + 1) % 1;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
    if (t < 1 / 6) return pp + (q - pp) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
    return pp;
  };
  const toHex = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
  return "#" + toHex(f(h + 1 / 3)) + toHex(f(h)) + toHex(f(h - 1 / 3));
}
const clampL = (hex, lo, hi) => { const [h, s, l] = hexToHsl(hex); return hslToHex(h, s, Math.max(lo, Math.min(hi, l))); };
// roof: a softened tint that always sits at least 0.22 lightness away from the body, so the two-tone always reads
function roofTone(hex, bodyL) {
  const [h, s0] = hexToHsl(hex);
  let l = Math.max(0.14, Math.min(0.92, hexToHsl(hex)[2]));
  if (Math.abs(l - bodyL) < 0.22) l = l >= bodyL ? bodyL + 0.22 : bodyL - 0.22;
  if (l > 0.94) l = bodyL - 0.22;
  if (l < 0.1) l = bodyL + 0.22;
  return hslToHex(h, Math.min(s0, 0.35), l);
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  // long masses are laid as short segments so depth sorting never lets details pop through
  const segX = (x, y, z, w, h, d, c) => { const n = Math.max(1, Math.ceil(w / 0.6)), sw = w / n; for (let i = 0; i < n; i++) box(x + i * sw, y, z, sw, h, d, c); };
  const segZ = (x, y, z, w, h, d, c) => { const n = Math.max(1, Math.ceil(d / 0.6)), sd = d / n; for (let i = 0; i < n; i++) box(x, y, z + i * sd, w, h, sd, c); };

  const body = clampL(p.body, 0.38, 0.68);
  const bodyL = hexToHsl(body)[2];
  const roof = roofTone(p.roof, bodyL);
  const trim = clampL(p.trim, 0.14, Math.min(0.36, bodyL - 0.16));
  const glass = "#7E93A8", tyre = "#2B3242", metal = "#8C929C", plate = "#F6EEE0", pod = "#D9DCE1";
  const head = p.lights ? "#FFD58A" : "#D9DCE1";
  const tail = p.lights ? "#E5484D" : "#8A4A4D";

  // --- frame (one unit system everything hangs from)
  const L = Math.max(3.0, Math.min(3.7, p.length));
  const W = 1.6, x0 = (4 - L) / 2, x1 = x0 + L, z0 = 0.2, z1 = z0 + W;
  const BASE = 0.36, TOP = 0.9, ch = 0.64, RT = TOP + ch, SPLIT = TOP + ch * 0.55;
  const cz0 = z0 + 0.08, cw = W - 0.16, cz1 = cz0 + cw;
  const cx0 = x0 + 0.72;            // windscreen line: short bonnet
  const xe = x1 - 0.06;             // cabin runs almost to the tail
  const HS = 0.42, ux1 = xe - HS;   // flat roof ends here, hatch slopes down behind it

  // --- wheels: stepped tyres tucked under the body, peeking out below rounded dark arches
  const wd = 0.58, wt = 0.26;
  const fw = x0 + 0.22, rw = x1 - 0.26 - wd, wheels = [fw, rw];
  for (const wx of wheels) {
    for (const [zt, zh, za] of [[z0 + 0.04, z0 + 0.02, z0 - 0.02], [z1 - 0.04 - wt, z1 - 0.04, z1]]) {
      box(wx + 0.1, 0, zt, wd - 0.2, wd, wt, tyre);
      box(wx, 0.1, zt, wd, wd - 0.2, wt, tyre);
      box(wx + 0.2, 0.18, zh, 0.18, 0.18, 0.02, metal);
      box(wx - 0.06, BASE, za, wd + 0.12, 0.14, 0.02, tyre);        // arch, stepped round
      box(wx + 0.06, BASE + 0.14, za, wd - 0.12, 0.1, 0.02, tyre);
    }
  }
  const archTop = BASE + 0.24;
  const overWheel = (x) => wheels.some((wx) => x > wx - 0.08 && x < wx + wd + 0.08);

  // underbody: a dark shadow block tying body to wheels
  segX(x0 + 0.2, 0.12, z0 + 0.1, L - 0.4, BASE - 0.12, W - 0.2, tyre);

  // --- lower body, two-part cabin, sloped hatch, two-tone roof
  segX(x0, BASE, z0, L, TOP - BASE, W, body);
  segX(cx0, TOP, cz0, xe - cx0, SPLIT - TOP, cw, body);
  segX(cx0, SPLIT, cz0, ux1 - cx0, RT - SPLIT, cw, body);
  parts.push({ t: "gable", p: [xe - 2 * HS, SPLIT, cz0], s: [2 * HS, RT - SPLIT, cw], c: body, axis: "z" });
  const RS = RT + 0.07;
  segX(cx0 - 0.02, RT, cz0 - 0.02, ux1 - cx0 + 0.02, 0.07, cw + 0.04, roof);

  // sill strip between the arches
  const sx0 = fw + wd + 0.08, sx1 = rw - 0.08;
  box(sx0, BASE, z0 - 0.02, sx1 - sx0, 0.07, 0.02, trim);
  box(sx0, BASE, z1, sx1 - sx0, 0.07, 0.02, trim);

  // --- one shared bay grid: glass panes, pillars, door seams and handles all use these x lines
  const gx0 = fw + wd + 0.1, gx1 = ux1 - 0.12, span = gx1 - gx0;
  const five = p.doors === "5-door";
  const pillar = gx0 + span * (five ? 0.5 : 0.62), PIL = 0.1;
  const gy = TOP + 0.08, gt = RT - 0.08;
  for (const [a, b] of [[gx0, pillar - PIL / 2], [pillar + PIL / 2, gx1]]) {
    box(a, gy, cz0 - 0.02, b - a, gt - gy, 0.02, glass);
    box(a, gy, cz1, b - a, gt - gy, 0.02, glass);
  }
  const seams = five ? [gx0, pillar, gx1 + 0.04] : [gx0, pillar];
  seams.forEach((sx, i) => {
    const sb = overWheel(sx) ? archTop + 0.04 : BASE + 0.1, sh = TOP - 0.04 - sb;
    box(sx - 0.015, sb, z0 - 0.02, 0.03, sh, 0.02, trim);
    box(sx - 0.015, sb, z1, 0.03, sh, 0.02, trim);
    if (i < seams.length - 1) {
      const hx = seams[i + 1] - 0.28;
      box(hx, TOP - 0.16, z0 - 0.03, 0.18, 0.05, 0.03, trim);
      box(hx, TOP - 0.16, z1, 0.18, 0.05, 0.03, trim);
    }
  });

  // windscreen faces the camera; rear window sits under the hatch slope
  box(cx0 - 0.02, gy, cz0 + 0.1, 0.02, gt - gy, cw - 0.2, glass);
  box(xe, TOP + 0.08, cz0 + 0.12, 0.02, SPLIT - TOP - 0.12, cw - 0.24, glass);

  // wing mirrors: chunky, sitting on the shoulder against the cabin side
  box(cx0 + 0.02, TOP, cz0 - 0.12, 0.14, 0.12, 0.12, body);
  box(cx0 + 0.02, TOP, cz1, 0.14, 0.12, 0.12, body);

  // --- nose: a symmetric face of two big lamps with a slim grille between, bumper and plate below
  const lw = 0.36;
  box(x0 - 0.03, 0.6, z0 + 0.12, 0.03, 0.2, lw, head, p.lights);
  box(x0 - 0.03, 0.6, z1 - 0.12 - lw, 0.03, 0.2, lw, head, p.lights);
  box(x0 - 0.02, 0.66, z0 + 0.12 + lw + 0.08, 0.02, 0.08, W - 2 * (0.12 + lw + 0.08), trim);
  box(x0 - 0.08, BASE - 0.1, z0 - 0.03, 0.08, 0.2, W + 0.06, trim);
  box(x0 - 0.1, BASE - 0.06, z0 + W / 2 - 0.2, 0.02, 0.12, 0.4, plate);

  // --- tail: lamps, bumper, plate
  box(x1, 0.6, z0 + 0.1, 0.03, 0.2, 0.26, tail, p.lights);
  box(x1, 0.6, z1 - 0.36, 0.03, 0.2, 0.26, tail, p.lights);
  box(x1, BASE - 0.1, z0 - 0.03, 0.08, 0.2, W + 0.06, trim);
  box(x1 + 0.08, BASE - 0.06, z0 + W / 2 - 0.2, 0.02, 0.12, 0.4, plate);

  // --- roof: feet on the roof, crossbars on the feet, roof box on the bars, all centred on the flat roof
  const mid = (cx0 + ux1) / 2, RL = ux1 - cx0;
  if (p.rack) {
    const half = Math.min(0.45, RL * 0.28);
    const fz = [cz0 + 0.08, cz1 - 0.14];
    for (const bx of [mid - half - 0.03, mid + half - 0.03]) {
      for (const z of fz) box(bx, RS, z, 0.06, 0.06, 0.06, metal);
      segZ(bx, RS + 0.06, fz[0], 0.06, 0.05, fz[1] + 0.06 - fz[0], metal);
    }
    const pl = 2 * half + 0.3, px = mid - pl / 2, pz = cz0 + 0.16, pw = cw - 0.32;
    segX(px, RS + 0.11, pz, pl, 0.2, pw, pod);
    segX(px + 0.08, RS + 0.31, pz + 0.08, pl - 0.16, 0.05, pw - 0.16, pod);
  } else {
    const sl = Math.min(0.9, RL - 0.5);
    box(mid - sl / 2, RS, cz0 + 0.3, sl, 0.02, cw - 0.6, glass);
  }

  return { parts };
}
