// Town Car: a boxy toy hatchback for the Oasis Town streets. Block asset: build(p) returns parts in metres on the
// Oasis Town grid (origin at the footprint's corner, y up, street side at z = 0). The car parks along the kerb
// with its nose towards -x, so the kit camera sees the headlights, bonnet and near side first.
// Construction rule: no two solids share volume. The wheels tuck under the body, between skirt panels, so the
// painter never has to sort interpenetrating boxes.
export const meta = {
  title: "Town Car",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A chunky toy hatchback that parks along any Oasis Town kerb, with glass all round, block wheels tucked under its arches and headlights that glow at night.",
  tags: ["3d", "low poly", "car", "vehicle", "hatchback", "street", "traffic", "town", "kit"],
  price: 2,
  author: "oasis-factory",
  footprint: [4, 2],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    body: { type: "color", role: "primary", label: "Body", default: "#3E7BFA" },
    roof: { type: "color", role: "secondary", label: "Roof panel", default: "#F6EEE0" },
    style: { type: "choice", label: "Body style", default: "hatchback", options: ["hatchback", "van", "pickup"] },
    length: { type: "range", label: "Length (m)", default: 3.4, min: 3.0, max: 3.8, step: 0.2 },
    rack: { type: "toggle", label: "Roof rack", default: false },
    lights: { type: "toggle", label: "Headlights", default: true },
  },
  presets: {
    Cherry: { body: "#E5484D", roof: "#F6EEE0" },
    Fern: { body: "#2F7A55", roof: "#F3E3C8" },
    Sunny: { body: "#F2B33D", roof: "#5B6270" },
  },
};

// colour helpers: seams and the roof panel follow the body colour's luminance (darken pale, lighten dark)
function hex2rgb(h) {
  const n = parseInt(String(h).replace("#", ""), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgb2hex(r) {
  return "#" + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function lum(h) {
  const [r, g, b] = hex2rgb(h);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
function shift(h, amt) {
  const c = hex2rgb(h);
  return rgb2hex(amt < 0 ? c.map((v) => v * (1 + amt)) : c.map((v) => v + (255 - v) * amt));
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });

  const glass = "#7E93A8", tyre = "#2B2F36", hub = "#C9CED6", trim = "#5B6270", grille = "#3A3F48";
  const bodyL = lum(p.body);
  const seam = bodyL > 0.45 ? shift(p.body, -0.3) : shift(p.body, 0.35);
  // roof panel keeps its role but always separates from the body, by day and by night
  let roofC = p.roof;
  if (Math.abs(lum(roofC) - bodyL) < 0.18) roofC = shift(roofC, bodyL > 0.5 ? -0.4 : 0.55);

  // ---- chassis anchor: nose at x0 (faces the camera), tail at x1; every part derives from these
  const L = Math.max(3.0, Math.min(3.8, p.length));
  const x0 = (4 - L) / 2, x1 = x0 + L;
  const zA = 0.2, zB = 1.8;            // lower body sides
  const cA = 0.3, cB = 1.7;            // cabin sides (tumblehome inset)
  const R = 0.27, SKIRT = 0.2;         // wheel half-size, skirt bottom
  const BOT = 2 * R, BELT = 0.85;      // body sits exactly on the wheel tops
  const hatch = p.style === "hatchback", van = p.style === "van", pickup = p.style === "pickup";

  let cabF, cabR, top, panes;
  if (van) { cabF = x0 + 0.55; cabR = x1 - 0.08; top = 1.75; panes = 3; }
  else if (pickup) { cabF = x0 + 0.85 + (L - 3.0) * 0.3; cabR = cabF + 1.1; top = 1.45; panes = 1; }
  else { cabF = x0 + 0.85 + (L - 3.0) * 0.5; cabR = x1 - 0.1; top = 1.45; panes = 2; }

  // ---- wheels: dark blocks lying sideways, flush under the body, hubcaps outboard, axles joining each pair
  const axles = [x0 + 0.65, x1 - 0.65];
  for (const ax of axles) {
    box(ax - R, 0, zA - 0.04, 2 * R, 2 * R, 0.24, tyre);
    box(ax - R, 0, zB - 0.2, 2 * R, 2 * R, 0.24, tyre);
    box(ax - 0.13, R - 0.13, zA - 0.07, 0.26, 0.26, 0.03, hub);
    box(ax - 0.13, R - 0.13, zB + 0.04, 0.26, 0.26, 0.03, hub);
    box(ax - 0.07, SKIRT, zA + 0.2, 0.14, 0.14, zB - zA - 0.4, grille);
  }

  // ---- skirts between and around the wheels, then the body above them
  const g = 0.03;
  const skirts = [[x0, axles[0] - R - g], [axles[0] + R + g, axles[1] - R - g], [axles[1] + R + g, x1]];
  for (const [a, b] of skirts) if (b - a > 0.02) box(a, SKIRT, zA, b - a, BOT - SKIRT, zB - zA, p.body);
  box(x0, BOT, zA, L, BELT - BOT, zB - zA, p.body);

  // bumpers wrap the full width, sitting against the skirt ends
  box(x0 - 0.06, SKIRT, zA - 0.02, 0.06, 0.18, zB - zA + 0.04, trim);
  box(x1, SKIRT, zA - 0.02, 0.06, 0.18, zB - zA + 0.04, trim);

  // nose: grille and headlights (warm white glow from their own hue), plate on the bumper
  const head = p.lights ? "#FFF4D6" : "#DDE3EA";
  box(x0 - 0.03, 0.6, 0.64, 0.03, 0.16, 0.72, grille);
  for (const z of [zA + 0.08, zB - 0.38]) box(x0 - 0.04, 0.6, z, 0.04, 0.18, 0.3, head, p.lights);
  box(x0 - 0.08, 0.24, 0.78, 0.02, 0.1, 0.44, "#F6F7F9");
  // tail: lights set flush inside the rear face, plate on the bumper
  const tail = p.lights ? "#FF6B5E" : "#B8434B";
  for (const z of [zA + 0.06, zB - 0.3]) box(x1, 0.6, z, 0.03, 0.18, 0.24, tail, p.lights);
  box(x1 + 0.06, 0.24, 0.78, 0.02, 0.1, 0.44, "#F6F7F9");

  // ---- cabin, with a raised roof panel inset inside a body-coloured frame
  box(cabF, BELT, cA, cabR - cabF, top - BELT, cB - cA, p.body);
  const rpx0 = cabF + 0.12, rpx1 = cabR - (hatch ? 0.26 : 0.12);
  box(rpx0, top, cA + 0.12, rpx1 - rpx0, 0.04, cB - cA - 0.24, roofC);
  // hatchback cue: a short spoiler over the tailgate glass
  if (hatch) box(cabR - 0.2, top, cA + 0.05, 0.25, 0.06, cB - cA - 0.1, p.body);

  // windscreen (faces the camera) and rear glass
  box(cabF - 0.03, BELT + 0.06, cA + 0.08, 0.03, top - BELT - 0.12, cB - cA - 0.16, glass);
  box(cabR, BELT + 0.08, cA + 0.12, 0.03, top - BELT - 0.16, cB - cA - 0.24, glass);

  // side windows split by pillars; door seams sit under the pillars
  const wx0 = cabF + 0.15, wx1 = cabR - 0.15, gap = 0.12;
  const pw = (wx1 - wx0 - gap * (panes - 1)) / panes;
  for (let i = 0; i < panes; i++) {
    const px = wx0 + i * (pw + gap);
    box(px, BELT + 0.07, cA - 0.03, pw, top - BELT - 0.15, 0.03, glass);
    box(px, BELT + 0.07, cB, pw, top - BELT - 0.15, 0.03, glass);
  }
  const seams = [cabF + 0.06, cabR - 0.08];
  for (let i = 1; i < panes; i++) seams.push(wx0 + i * (pw + gap) - gap / 2);
  for (const sx of seams) {
    box(sx - 0.015, BOT + 0.03, zA - 0.03, 0.03, BELT - BOT - 0.06, 0.03, seam);
    box(sx - 0.015, BOT + 0.03, zB, 0.03, BELT - BOT - 0.06, 0.03, seam);
  }
  // door handles at the trailing edge of the front door
  const doorEnd = panes > 1 ? wx0 + pw + gap / 2 : cabR - 0.08;
  box(doorEnd - 0.3, 0.74, zA - 0.03, 0.18, 0.04, 0.03, seam);
  box(doorEnd - 0.3, 0.74, zB, 0.18, 0.04, 0.03, seam);
  // wing mirrors on the A-pillars, touching the cabin sides, clear of windscreen and side glass
  box(cabF + 0.02, BELT + 0.1, cA - 0.14, 0.1, 0.12, 0.14, p.body);
  box(cabF + 0.02, BELT + 0.1, cB, 0.1, 0.12, 0.14, p.body);

  // ---- pickup bed: open tub from the cab's real rear face to the tail
  if (pickup) {
    const bedL = x1 - cabR;
    box(cabR, BELT, zA + 0.1, bedL - 0.1, 0.02, zB - zA - 0.2, trim);         // liner
    box(cabR, BELT, zA, bedL, 0.28, 0.1, p.body);                             // near side wall
    box(cabR, BELT, zB - 0.1, bedL, 0.28, 0.1, p.body);                       // far side wall
    box(x1 - 0.1, BELT, zA + 0.1, 0.1, 0.28, zB - zA - 0.2, p.body);          // tailgate
    box(cabR, BELT + 0.28, zA, bedL, 0.03, 0.1, seam);                        // rail caps
    box(cabR, BELT + 0.28, zB - 0.1, bedL, 0.03, 0.1, seam);
  }

  // ---- roof rack: open bars on feet that stand on the roof frame, plus one strapped bag
  if (p.rack) {
    const ry = top;
    const rx0 = cabF + 0.15, rx1 = cabR - (hatch ? 0.26 : 0.15), rl = rx1 - rx0;
    for (const fz of [cA + 0.02, cB - 0.1]) {
      for (const fx of [rx0, rx1 - 0.08]) box(fx, ry, fz, 0.08, 0.1, 0.08, trim);
      box(rx0, ry + 0.1, fz, rl, 0.05, 0.08, trim);                          // rail
    }
    const bars = [rx0, rx0 + (rl - 0.06) / 2, rx1 - 0.06];
    for (const bx of bars) box(bx, ry + 0.15, cA + 0.02, 0.06, 0.04, cB - cA - 0.04, grille);
    const lb = Math.min(0.8, rl * 0.6), lx = bars[1] + 0.03 - lb / 2;
    box(lx, ry + 0.19, cA + 0.25, lb, 0.26, cB - cA - 0.5, "#F2B33D");
    box(lx + lb / 2 - 0.05, ry + 0.45, cA + 0.25, 0.1, 0.03, cB - cA - 0.5, "#8A6E52"); // strap
  }

  return { parts };
}
