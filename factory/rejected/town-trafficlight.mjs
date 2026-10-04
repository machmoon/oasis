// Traffic Light: a street-corner signal pole with a mast arm over the road and a three-lamp head.
// Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner,
// y up, street side toward -z). The arm overhangs the street by design. The pole is a fixed 6 m, and the
// zebra crossing always spans the full 6 m reach, so the model's bounds stay constant at every arm length
// and it holds the same grid scale as its siblings.
export const meta = {
  title: "Traffic Light",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A corner traffic signal whose mast arm reaches up to a full grid cell over the street to a three-lamp head, with a pedestrian signal, push button and zebra crossing.",
  tags: ["3d", "low poly", "traffic light", "signal", "street", "road", "crossing", "town", "kit"],
  price: 1,
  author: "oasis-factory",
  footprint: [1, 1],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    pole: { type: "color", role: "ink", label: "Pole & arm", default: "#5B6270" },
    plate: { type: "color", role: "highlight", label: "Reflective border", default: "#F2B33D" },
    active: { type: "choice", label: "Active light", default: "red", options: ["red", "amber", "green"] },
    arm: { type: "range", label: "Arm length (m)", default: 3.5, min: 2, max: 6, step: 0.5 },
    button: { type: "toggle", label: "Crossing button", default: true },
    zebra: { type: "toggle", label: "Zebra crossing", default: true },
    lights: { type: "toggle", label: "Signals on", default: true },
  },
  presets: {
    Civic: { pole: "#2B3242", plate: "#F6EEE0" },
    Tramline: { pole: "#2F7A55", plate: "#F2B33D" },
    Harbour: { pole: "#3E4A5C", plate: "#F7B8CF" },
  },
};

// ---- colour helpers: keep brand colours inside the band each slot was designed for ----
function toHsl(c) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(c || ""));
  const n = m ? parseInt(m[1], 16) : 0x5b6270;
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
function toHex(h, s, l) {
  const f = (t) => {
    t = ((t % 1) + 1) % 1;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p2 = 2 * l - q;
    if (t < 1 / 6) return p2 + (q - p2) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p2 + (q - p2) * (2 / 3 - t) * 6;
    return p2;
  };
  const v = (x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, "0");
  if (s === 0) return "#" + v(l) + v(l) + v(l);
  return "#" + v(f(h + 1 / 3)) + v(f(h)) + v(f(h - 1 / 3));
}
const clampTone = (c, lo, hi, smax) => {
  const [h, s, l] = toHsl(c);
  return toHex(h, Math.min(s, smax), Math.max(lo, Math.min(hi, l)));
};
const shade = (c) => {
  const [h, s, l] = toHsl(c);
  return toHex(h, s, l < 0.3 ? l + 0.08 : l - 0.08); // lighten dark bases, darken light ones
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n });
  const cone = (cx, y, cz, r, h, c, n) => parts.push({ t: "cone", p: [cx, y, cz], r, h, c, n });

  // structural metal stays a mid-to-dark tone for any brand, so it always reads on a pale ground
  const POLE = clampTone(p.pole, 0.2, 0.42, 0.6);
  const POLE2 = shade(POLE);
  // reflective tape: always a light, bright border on the black plate, whatever brand comes in
  const TAPE = clampTone(p.plate, 0.62, 0.8, 0.85);
  const HOUSING = "#2B3242", PLATE = "#1C2028", CONCRETE = "#BFC3CA", METAL = "#8C929C", PAINT = "#F6EEE0";

  // Lit tones are fully saturated mid-luminance hues, so bloom keeps them red / amber / green instead of
  // clipping to white. Each lit lens also gets a deep same-hue halo ring (not emissive) that holds the
  // colour even if the lens core blooms. Unlit lenses are clearly tinted and distinct from one another.
  const LAMP = {
    red: { on: "#E8231A", halo: "#8E140E", off: "#6E2622" },
    amber: { on: "#F59A00", halo: "#9A5A00", off: "#8A6A1C" },
    green: { on: "#0FBF55", halo: "#0A6E33", off: "#1E5A3A" },
  };

  const CX = 0.5, CZ = 0.5, PR = 0.1;
  const BASE = 0.15, H = 6;
  const top = BASE + H;

  // footing, collar, pole, cap
  box(0.2, 0, 0.2, 0.6, BASE, 0.6, CONCRETE);
  cyl(CX, BASE, CZ, 0.16, 0.4, POLE2, 10);
  cyl(CX, BASE, CZ, PR, H, POLE, 10);
  cyl(CX, top, CZ, 0.13, 0.07, POLE2, 10);
  cone(CX, top + 0.07, CZ, 0.11, 0.1, POLE2, 10);

  // zebra crossing on the road beside the pole: fixed 6 m span, so bounds never change with the arm
  if (p.zebra) {
    for (let i = 0; i < 6; i++) box(1.1, 0, -0.6 - i, 2.2, 0.02, 0.5, PAINT);
  }

  // mast arm over the street (-z), hung just below the pole top
  const L = p.arm;
  const AH = 0.16;
  const armY = top - 0.4;
  const zE = CZ - L;
  box(CX - 0.08, armY, zE, 0.16, AH, CZ - zE, POLE);
  box(CX - 0.1, armY - 0.02, zE - 0.04, 0.2, AH + 0.04, 0.04, POLE2); // end cap
  // stepped gusset under the arm, tapering away from the pole
  const braceLen = Math.min(0.9, L * 0.3);
  for (let i = 0; i < 3; i++) {
    const len = braceLen * (1 - i / 3);
    box(CX - 0.03, armY - (i + 1) * 0.14, CZ - PR - len + 0.02, 0.06, 0.14, len, POLE2);
  }

  // signal head hanging from the arm tip
  const HW = 0.6, HD = 0.4, HHt = 1.5, HANG = 0.15;
  const hx = CX - HW / 2;
  const hy = armY - HANG - HHt;
  box(CX - 0.05, armY - HANG, zE + HD / 2 - 0.05, 0.1, HANG, 0.1, METAL); // hanger
  box(hx, hy, zE, HW, HHt, HD, HOUSING);

  // black backplate behind the housing with a reflective border on its street face
  const bx = hx - 0.18, by = hy - 0.14, bw = HW + 0.36, bh = HHt + 0.26, bz = zE + HD, T = 0.08;
  box(bx, by, bz, bw, bh, 0.05, PLATE);
  box(bx, by, bz - 0.03, T, bh, 0.03, TAPE);
  box(bx + bw - T, by, bz - 0.03, T, bh, 0.03, TAPE);
  box(bx + T, by, bz - 0.03, bw - 2 * T, T, 0.03, TAPE);
  box(bx + T, by + bh - T, bz - 0.03, bw - 2 * T, T, 0.03, TAPE);

  // three big octagonal lenses on the street face, red on top, each under a visor
  const order = [["red", 1.23], ["amber", 0.75], ["green", 0.27]];
  for (const [k, cy] of order) {
    const lit = p.lights && p.active === k;
    const c = lit ? LAMP[k].on : LAMP[k].off;
    if (lit) {
      box(CX - 0.24, hy + cy - 0.16, zE - 0.02, 0.48, 0.32, 0.02, LAMP[k].halo);
      box(CX - 0.16, hy + cy - 0.24, zE - 0.02, 0.32, 0.48, 0.02, LAMP[k].halo);
    }
    box(CX - 0.21, hy + cy - 0.13, zE - 0.05, 0.42, 0.26, 0.05, c, lit);
    box(CX - 0.13, hy + cy - 0.21, zE - 0.055, 0.26, 0.42, 0.055, c, lit);
    box(CX - 0.25, hy + cy + 0.21, zE - 0.17, 0.5, 0.04, 0.17, HOUSING);
  }

  // pedestrian signal on a short bracket, facing the street: green walk while traffic is red, red stop otherwise
  const py = 2.4;
  const pz = CZ - PR - 0.08;
  const walk = p.lights && p.active === "red";
  const stop = p.lights && p.active !== "red";
  box(CX - 0.04, py + 0.22, pz, 0.08, 0.16, 0.1, METAL);
  box(CX - 0.15, py, pz - 0.26, 0.3, 0.64, 0.26, HOUSING);
  box(CX - 0.1, py + 0.34, pz - 0.29, 0.2, 0.22, 0.03, stop ? LAMP.red.on : LAMP.red.off, stop);
  box(CX - 0.1, py + 0.07, pz - 0.29, 0.2, 0.22, 0.03, walk ? LAMP.green.on : LAMP.green.off, walk);
  box(CX - 0.17, py + 0.64, pz - 0.32, 0.34, 0.04, 0.32, HOUSING); // hood

  // push-button box: grey metal body and kit-yellow button, never emissive
  if (p.button) {
    box(CX - 0.11, 0.95, CZ - PR - 0.12, 0.22, 0.32, 0.14, METAL);
    box(CX - 0.06, 1.04, CZ - PR - 0.15, 0.12, 0.12, 0.03, "#F2B33D");
    box(CX - 0.07, 1.2, CZ - PR - 0.14, 0.14, 0.04, 0.02, HOUSING);
  }

  return { parts };
}
