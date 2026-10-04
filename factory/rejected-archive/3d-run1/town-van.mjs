// Delivery Van: a parcel van with a tall cargo box, a livery logo panel and twin rear doors. Block asset:
// build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up, street side
// at z = 0). The van parks along the kerb heading +x, so the rear doors and the logo side face the camera.
export const meta = {
  title: "Delivery Van",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A chunky parcel van with a tall cargo box, a livery logo panel and twin rear doors, sized to park along an Oasis Town street.",
  tags: ["3d", "low poly", "vehicle", "van", "delivery", "truck", "town", "kit"],
  price: 3,
  author: "oasis-factory",
  footprint: [5, 2],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    body: { type: "color", role: "surface", label: "Body paint", default: "#F6EEE0" },
    logo: { type: "color", role: "primary", label: "Logo & livery", default: "#3E7BFA" },
    length: { type: "range", label: "Length (m)", default: 5, min: 4, max: 6, step: 0.5 },
    cargo: { type: "range", label: "Cargo box height (m)", default: 2.2, min: 1.6, max: 2.6, step: 0.1 },
    emblem: { type: "choice", label: "Logo emblem", default: "parcel", options: ["parcel", "arrow", "house"] },
    lights: { type: "toggle", label: "Lights on", default: true },
  },
  presets: {
    Tramline: { body: "#D8DEE3", logo: "#2F7A55" },
    Post: { body: "#F3E3C8", logo: "#E5484D" },
    Butter: { body: "#F2B33D", logo: "#C8553D" },
  },
};

// ---- colour helpers: brand inputs are clamped so the van always reads as a van ----
function toRgb(h) {
  const s = String(h || "#888888").replace("#", "");
  const n = parseInt(s.length === 3 ? s.split("").map((c) => c + c).join("") : s.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
}
function toHsl([r, g, b]) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function fromHsl([h, s, l]) {
  const f = (n) => {
    const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return "#" + [f(0), f(8), f(4)].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function tone(hex, lo, hi, sMax, dl) {
  const [h, s, l] = toHsl(toRgb(hex));
  return fromHsl([h, Math.min(s, sMax), Math.max(lo, Math.min(hi, l + (dl || 0)))]);
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });

  // Body is the big mass: always pale so it separates from the dark running gear under any brand.
  // Livery is the accent: always mid-dark so it reads on the body and on the white panel.
  const body = tone(p.body, 0.78, 0.93, 0.5);
  const bodyShade = tone(p.body, 0.66, 0.84, 0.45, -0.09); // roof cap and rear doors
  const logo = tone(p.logo, 0.34, 0.54, 0.85);
  const livery = tone(p.logo, 0.26, 0.44, 0.8, -0.08);
  const panel = "#FBFBFB", trim = "#5B6270", dark = "#2B3242", hub = "#D9DCE1", glass = "#7E93A8";
  const lit = "#FFD58A", amber = "#F2B33D";
  const on = !!p.lights;

  const L = p.length, H = p.cargo;
  const x0 = (5 - L) / 2, xr = x0 + L;          // rear at x0, nose at xr
  const z0 = 0.15, z1 = 1.85, W = z1 - z0;      // 1.7 m wide body
  const CHAS = 0.75;                            // floor of cab and cargo box
  const cargoEnd = xr - 1.65, CL = cargoEnd - x0;
  const cabEnd = xr - 0.55, CAB_TOP = CHAS + 1.55;
  const top = CHAS + H;
  // side-face helper: layer 0 sits 0.03 proud, each further layer another 0.03
  const sideZ = (side, layer) => (side < 0 ? z0 - (layer + 1) * 0.03 : z1 + layer * 0.03);
  const sb = (side, x, y, w, h, c, layer, e) => box(x, y, sideZ(side, layer), w, h, 0.03, c, e);

  // chassis (recessed so it reads as shadowed underside) and bumpers
  box(x0 + 0.05, 0.3, z0 + 0.06, L - 0.1, CHAS - 0.3, W - 0.12, trim);
  box(xr - 0.1, 0.3, z0 + 0.05, 0.14, 0.28, W - 0.1, trim);        // front bumper
  box(x0 - 0.15, 0.32, z0 + 0.1, 0.2, 0.2, W - 0.2, trim);         // rear step

  // wheels: flush with the body sides, tucked under dark arch lips; front axle under the cab door
  for (const ax of [x0 + 1.0, xr - 0.85]) {
    for (const side of [-1, 1]) {
      const zt = side < 0 ? z0 : z1 - 0.3;
      box(ax - 0.36, 0.11, zt, 0.72, 0.5, 0.3, dark);
      box(ax - 0.25, 0, zt, 0.5, 0.72, 0.3, dark);
      box(ax - 0.16, 0.2, side < 0 ? z0 - 0.03 : z1, 0.32, 0.32, 0.03, hub);
      sb(side, ax - 0.45, CHAS, 0.9, 0.1, dark, 0);                // wheel arch lip
    }
  }

  // cab: cabin + hood, with a roof fairing that blends into the cargo box
  box(cargoEnd, CHAS, z0, cabEnd - cargoEnd, 1.55, W, body);
  box(xr - 0.6, CHAS, z0, 0.6, 0.6, W, body);
  const fh = Math.min(0.8, top - CAB_TOP - 0.05);
  if (fh >= 0.2) parts.push({ t: "gable", p: [cargoEnd - 0.6, CAB_TOP, z0 + 0.1], s: [1.2, fh, W - 0.2], c: body, axis: "z" });
  box(cabEnd - 0.02, 1.5, z0 + 0.15, 0.06, 0.7, W - 0.3, glass);          // windscreen
  box(xr - 0.02, 0.9, z0 + 0.5, 0.06, 0.3, W - 1.0, dark);                // grille
  for (const hz of [z0 + 0.12, z1 - 0.42]) box(xr - 0.02, 0.95, hz, 0.06, 0.22, 0.3, on ? lit : hub, on); // headlights
  for (const side of [-1, 1]) {
    box(cabEnd - 0.85, 1.45, side < 0 ? z0 - 0.04 : z1 - 0.02, 0.75, 0.67, 0.06, glass); // side window
    sb(side, cargoEnd + 0.12, CHAS + 0.27, 0.04, 1.18, trim, -0.34);       // door seam (behind stripe)
    sb(side, cabEnd - 0.85, 1.3, 0.2, 0.06, trim, 0);                      // door handle
    box(cabEnd - 0.1, 1.6, side < 0 ? z0 - 0.14 : z1, 0.1, 0.28, 0.14, dark); // mirror
    sb(side, xr - 0.3, 1.1, 0.2, 0.12, amber, 0);                          // side indicator
    sb(side, x0, CHAS + 0.13, L, 0.12, livery, 0);                         // full-length livery stripe
  }

  // cargo box with a shaded roof cap and rear marker lights
  box(x0, CHAS, z0, CL, H, W, body);
  box(x0 - 0.05, top, z0 - 0.05, CL + 0.1, 0.12, W + 0.1, bodyShade);
  for (const mz of [z0 + 0.05, z1 - 0.25]) box(x0 + 0.05, top + 0.12, mz, 0.2, 0.1, 0.2, on ? amber : hub, on);

  // logo panel spans the cargo side and reflows with length and height
  const pw = CL - 0.5, ph = Math.min(1.6, H - 0.7);
  const px = x0 + 0.25;
  const pyLo = CHAS + 0.38, pyHi = top - 0.18;
  const py = pyLo + Math.max(0, (pyHi - pyLo - ph) / 2);
  const s = Math.min(ph * 0.78, pw * 0.4);
  const cx = px + pw * (pw > 2.2 ? 0.6 : 0.5), cy = py + ph / 2;
  for (const side of [-1, 1]) {
    const fb = (x, y, w, h, c, layer) => sb(side, x, y, w, h, c, layer);
    fb(px - 0.06, py - 0.06, pw + 0.12, ph + 0.12, logo, 0);  // frame
    fb(px, py, pw, ph, panel, 1);                             // panel
    if (p.emblem === "parcel") {
      const bw = s * 0.95, bh = s * 0.62, by = cy - s * 0.42;
      fb(cx - bw / 2, by, bw, bh, logo, 2);                               // box
      fb(cx - bw * 0.56, by + bh, bw * 1.12, s * 0.22, livery, 2);         // lid
      fb(cx - s * 0.06, by + bh * 0.45, s * 0.12, bh * 0.55 + s * 0.22, panel, 3); // tape
    } else if (p.emblem === "arrow") {
      fb(cx - s * 0.6, cy - s * 0.13, s * 0.62, s * 0.26, logo, 2);        // shaft
      for (let i = 0; i < 4; i++) {
        const hh = s * (1 - i * 0.24);
        fb(cx + i * s * 0.15, cy - hh / 2, s * 0.15, hh, logo, 2);         // head, points forward
      }
    } else {
      const y0 = cy - s * 0.47;
      fb(cx - s * 0.35, y0, s * 0.7, s * 0.45, logo, 2);                   // house body
      [0.95, 0.72, 0.48, 0.24].forEach((k, i) => fb(cx - (s * k) / 2, y0 + s * 0.45 + i * s * 0.12, s * k, s * 0.12, livery, 2)); // stepped roof
      fb(cx - s * 0.08, y0, s * 0.16, s * 0.26, panel, 3);                 // door
    }
    // speed lines trail behind the emblem when the panel has room
    const e = cx - s * 0.8, avail = e - (px + 0.15), t = Math.max(0.06, s * 0.09);
    if (avail >= 0.25) {
      [[0.28, 0.55], [0, 1], [-0.28, 0.75]].forEach(([dy, k]) => fb(e - avail * k, cy + dy * s - t / 2, avail * k, t, logo, 2));
    }
  }

  // rear: twin doors facing the camera, with seam, windows, handles, hinges and tail lights
  const zm = z0 + W / 2, yd = CHAS + 0.08, dh = H - 0.2;
  const dW = zm - 0.02 - (z0 + 0.15);
  box(x0 - 0.04, yd, z0 + 0.15, 0.04, dh, dW, bodyShade);
  box(x0 - 0.04, yd, zm + 0.02, 0.04, dh, dW, bodyShade);
  box(x0 - 0.03, yd, zm - 0.02, 0.03, dh, 0.04, dark);                     // centre seam
  for (const dz of [z0 + 0.15, zm + 0.02]) {
    box(x0 - 0.07, yd + dh - 0.65, dz + 0.12, 0.03, 0.4, dW - 0.24, glass); // door window
  }
  for (const hz of [zm - 0.12, zm + 0.06]) box(x0 - 0.07, yd + dh * 0.3, hz, 0.03, 0.25, 0.06, trim); // handles
  for (const hz of [z0 + 0.15, z1 - 0.27]) for (const hy of [yd + 0.25, yd + dh - 0.45]) box(x0 - 0.07, hy, hz, 0.03, 0.07, 0.12, dark); // hinges
  box(x0 - 0.07, yd + 0.12, z0 + 0.27, 0.03, 0.1, W - 0.54, livery);        // kick band
  for (const tz of [z0 + 0.02, z1 - 0.12]) box(x0 - 0.04, CHAS + 0.1, tz, 0.04, 0.5, 0.1, on ? "#E5484D" : "#8A6E52", on); // tail lights

  return { parts };
}
