// Traffic Light: a kerbside signal pole with a braced mast arm reaching over the road. Block asset: build(p) returns
// parts in metres on the Oasis Town grid (origin at the footprint's corner, y up, street side at -z). The arm overhangs the street.
export const meta = {
  title: "Traffic Light",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A kerbside traffic light whose braced arm reaches out over the street to hang a backplated three-lamp signal facing both ways along the road.",
  tags: ["3d", "low poly", "traffic light", "signal", "street", "road", "crossing", "town", "kit"],
  price: 1,
  author: "oasis-factory",
  footprint: [1, 1],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    pole: { type: "color", role: "secondary", label: "Pole & arm", default: "#5B6270" },
    housing: { type: "color", role: "ink", label: "Signal housing", default: "#2B3242" },
    band: { type: "color", role: "highlight", label: "Backplate border", default: "#F2B33D" },
    active: { type: "choice", label: "Active light", default: "green", options: ["red", "amber", "green"] },
    arm: { type: "range", label: "Arm length (m)", default: 2.5, min: 1.5, max: 4, step: 0.5 },
    height: { type: "range", label: "Pole height (m)", default: 5.6, min: 5, max: 6.6, step: 0.2 },
    lights: { type: "toggle", label: "Powered", default: true },
  },
  presets: {
    Tram: { pole: "#2F7A55", housing: "#2B3242", band: "#F6EEE0" },
    Kyoto: { pole: "#C8553D", housing: "#2B3242", band: "#F2B33D" },
    Harbour: { pole: "#3E7BFA", housing: "#24304A", band: "#F6EEE0" },
  },
};

// Clamp a colour's lightness (and optionally saturation) so any brand input keeps the form readable.
function tone(hex, lo, hi, maxS) {
  const n = parseInt(String(hex || "#808080").replace("#", ""), 16) || 0;
  let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0, l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  l = Math.min(hi, Math.max(lo, l));
  if (maxS !== undefined) s = Math.min(s, maxS);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return pp + (q - pp) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
    return pp;
  };
  const to = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  return s === 0 ? "#" + to(l) + to(l) + to(l) : "#" + to(f(h + 1 / 3)) + to(f(h)) + to(f(h - 1 / 3));
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (x, y, z, r, h, c, n) => parts.push({ t: "cyl", p: [x, y, z], r, h, c, n: n || 12 });

  // brand roles, clamped: pole is a mid-value paint, housing is always a near-neutral dark, border is a light accent
  const poleC = tone(p.pole, 0.3, 0.6, 0.75);
  const houseC = tone(p.housing, 0.14, 0.22, 0.22);
  const bandC = tone(p.band, 0.55, 0.82);
  const bezelC = "#15181F"; // fixed dark lens surround so every lens pops
  const plinth = "#BFC3CA", kerb = "#D9DCE1";

  // fixed signal lenses: semantic colours, never brand-driven; unlit lenses stay clearly lighter than the housing
  const order = ["red", "amber", "green"];
  const LIT = { red: "#FF5A4A", amber: "#FFC23D", green: "#4BE38C" };
  const DIM = { red: "#9C4A43", amber: "#A07A35", green: "#3F8058" };
  const lamp = (k) => {
    const on = p.lights && p.active === k;
    return { c: on ? LIT[k] : DIM[k], e: on };
  };

  const H = p.height, L = p.arm;
  const cx = 0.5, cz = 0.5;
  const k = (L - 1.5) / 2.5; // 0..1 across the arm range: the mast thickens as the arm grows
  const R = 0.12 + k * 0.08;

  // footing: two-step concrete plinth with a dark flange so the base reads on light backgrounds
  box(0.14, 0, 0.14, 0.72, 0.1, 0.72, plinth);
  box(0.2, 0.1, 0.2, 0.6, 0.06, 0.6, kerb);
  const fl = R + 0.12;
  box(cx - fl, 0.16, cz - fl, fl * 2, 0.08, fl * 2, houseC);
  cyl(cx, 0.24, cz, R + 0.03, 0.5, poleC); // thicker base sleeve
  cyl(cx, 0.74, cz, R, H - 0.74, poleC);
  cyl(cx, H, cz, R + 0.03, 0.08, houseC); // cap
  cyl(cx, H + 0.08, cz, R - 0.03, 0.06, houseC);

  // mast arm over the street (-z): thick inner half, slimmer outer half, top-aligned
  const aT = 0.2 + k * 0.08, aw = 0.15 + k * 0.05;
  const armTop = H - 0.35, armY = armTop - aT;
  const half = L * 0.5;
  box(cx - aw / 2, armY, cz - half, aw, aT, half, poleC);
  const oT = aT * 0.72, ow = aw * 0.8, oY = armTop - oT;
  box(cx - ow / 2, oY, cz - L, ow, oT, L - half, poleC);
  // pole collar where the arm meets the mast
  cyl(cx, armY - 0.06, cz, R + 0.04, aT + 0.12, poleC);
  // stepped gusset under the inner arm, sized from the arm length
  const gLen = L * 0.38, gH = 0.45 + k * 0.35, steps = 4;
  for (let i = 0; i < steps; i++) {
    const zA = cz - R - gLen * (steps - i) / steps, zB = cz - R - gLen * (steps - 1 - i) / steps;
    const h = gH * (i + 1) / steps;
    box(cx - 0.05, armY - h, zA, 0.1, h, zB - zA, poleC);
  }

  // signal head hung from the arm tip, lamps facing both ways along the road (±x)
  const zc = cz - L + 0.36;
  const hw = 0.42, hd = 0.56, headH = 1.45;
  const headTop = oY - 0.1, headY = headTop - headH;
  const hx0 = cx - hw / 2, hx1 = cx + hw / 2;
  box(cx - ow / 2 - 0.03, oY - 0.03, zc - 0.07, ow + 0.06, oT + 0.06, 0.14, houseC); // clamp on the arm
  box(cx - 0.05, headTop, zc - 0.05, 0.1, oY - 0.03 - headTop, 0.1, houseC); // hanger
  // backplate with a reflective border, framing the head
  box(cx - 0.015, headY - 0.14, zc - hd / 2 - 0.17, 0.03, headH + 0.22, hd + 0.34, bandC);
  box(cx - 0.025, headY - 0.08, zc - hd / 2 - 0.11, 0.05, headH + 0.1, hd + 0.22, houseC);
  box(hx0, headY, zc - hd / 2, hw, headH, hd, houseC);
  box(hx0 - 0.02, headTop - 0.05, zc - hd / 2 - 0.02, hw + 0.04, 0.05, hd + 0.04, houseC); // top rim

  order.forEach((key, i) => {
    const cy = headTop - 0.28 - i * 0.445;
    const { c, e } = lamp(key);
    for (const side of [-1, 1]) {
      const face = side < 0 ? hx0 : hx1;
      const out = (t, w) => (side < 0 ? face - t - w : face + t); // x of a slab w thick, t out from the face
      box(out(0, 0.02), cy - 0.2, zc - 0.2, 0.02, 0.4, 0.4, bezelC); // dark square bezel
      // rounded lens: a stepped octagon of three non-overlapping slabs
      box(out(0.02, 0.04), cy - 0.17, zc - 0.11, 0.04, 0.34, 0.22, c, e);
      box(out(0.02, 0.04), cy - 0.11, zc - 0.16, 0.04, 0.22, 0.05, c, e);
      box(out(0.02, 0.04), cy - 0.11, zc + 0.11, 0.04, 0.22, 0.05, c, e);
      box(out(0.02, 0.08), cy + 0.17, zc - 0.19, 0.08, 0.03, 0.38, houseC); // short hood on the bezel
    }
  });

  return { parts };
}
