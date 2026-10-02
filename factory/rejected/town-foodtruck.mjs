// Food Truck: a two-tone street-food van with a flip-up serving hatch, a striped awning flap, a chalk menu board on
// its back door and a glowing roof sign topped with a giant snack. Block asset: build(p) returns parts in metres on
// the Oasis Town grid (origin at the footprint's corner, y up, street side at z = 0, the cab points to +x).
export const meta = {
  title: "Town Food Truck",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A chunky two-tone food truck with a flip-up serving hatch, striped awning, chalk menu board and a giant snack on its roof sign. It parks on the kerb beside the town shops.",
  tags: ["3d", "low poly", "food truck", "street food", "vehicle", "van", "town", "kit"],
  price: 3,
  author: "oasis-factory",
  footprint: [5, 2.5],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    body: { type: "color", role: "surface", label: "Body", default: "#F6EEE0" },
    awning: { type: "color", role: "primary", label: "Awning & stripe", default: "#E5484D" },
    sign: { type: "color", role: "highlight", label: "Roof sign", default: "#F2B33D" },
    length: { type: "range", label: "Length (m)", default: 4.4, min: 3.6, max: 4.8, step: 0.2 },
    height: { type: "range", label: "Kitchen height (m)", default: 3.0, min: 2.7, max: 3.6, step: 0.1 },
    snack: { type: "choice", label: "Roof snack", default: "burger", options: ["burger", "coffee"] },
    hatch: { type: "toggle", label: "Hatch open", default: true },
    lights: { type: "toggle", label: "Lights", default: true },
  },
  presets: {
    Blossom: { body: "#F7B8CF", awning: "#2F7A55", sign: "#F2B33D" },
    Sunshine: { body: "#F6D58A", awning: "#C8553D", sign: "#3E7BFA" },
    Harbour: { body: "#BFD3F7", awning: "#3E7BFA", sign: "#F2B33D" },
  },
};

// ---- colour guards: every brand colour is clamped inside its role so the truck always reads as itself ----
function toRgb(h) {
  const s = (typeof h === "string" && /^#[0-9a-fA-F]{6}$/.test(h)) ? h : "#888888";
  return [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
}
function toHex(rgb) {
  return "#" + rgb.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function toHsl(hex) {
  const [r, g, b] = toRgb(hex);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function fromHsl(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return toHex([f(0), f(8), f(4)]);
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function tone(hex, lmin, lmax, smax) {
  const [h, s, l] = toHsl(hex);
  return fromHsl(h, Math.min(s, smax), clamp(l, lmin, lmax));
}
function mix(a, b, t) {
  const A = toRgb(a), B = toRgb(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * t));
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (cx, y, cz, r, h, c, n = 12) => parts.push({ t: "cyl", p: [cx, y, cz], r, h, c, n });

  // fixed kit materials (never brand-driven)
  const ROOFCAP = "#D8DEE3", KERB = "#D9DCE1", GLASS = "#7E93A8", LIT = "#FFD58A", TRIM = "#5B6270";
  const TYRE = "#2B3242", HUB = "#8C929C", WOOD = "#8A6E52", WHITE = "#FBFBFB", CREAM = "#F6EEE0";
  const SLATE = "#34403C", RED = "#E5484D", SUN = "#F2B33D", LEAF = "#79B86A";

  // role-guarded brand colours: light upper body, deeper lower body, accent always darker than the body
  const body = tone(p.body, 0.66, 0.9, 0.6);
  const [bh, bs, bodyL] = toHsl(body);
  const bodyLo = fromHsl(bh, Math.min(bs, 0.45), clamp(bodyL - 0.2, 0.46, 0.64));
  const awn = tone(p.awning, 0.32, Math.min(0.56, bodyL - 0.25), 0.8);
  const signC = tone(p.sign, 0.5, 0.7, 0.75);
  const L = !!p.lights, open = !!p.hatch;
  const signFace = L ? mix(signC, LIT, 0.3) : signC;

  // ---- shared anchors, all derived from the length and height knobs ----
  const Lt = clamp(+p.length || 4.4, 3.6, 4.8), KT = clamp(+p.height || 3.0, 2.7, 3.6);
  const xs = (5 - Lt) / 2, xe = xs + Lt;          // bumper to bumper, centred on the lot
  const F = 0.78, B = 2.45;                       // street and back faces (open awning reaches z = 0.08)
  const SK = 0.3, BOT = 0.78, BELT = 1.0;         // skirt bottom, arch top, two-tone line
  const CL = 1.5, CTOP = 2.4, HOOD = 1.35;        // fixed cab: the kitchen grows, the cab never shrinks
  const KX0 = xs + 0.1, CX1 = xe - 0.12, KX1 = CX1 - CL;
  const rw = KX0 + 0.65, fw = CX1 - 0.6, AR = 0.48; // axles near each end, arch half-width
  const HX0 = KX0 + 0.35, HX1 = KX1 - 0.22, HY0 = 1.35, HY1 = Math.min(KT - 0.45, 2.75), FR = 0.08;
  const AD = 0.7;

  // ---- wheels: a stepped round profile with an octagon hub ----
  for (const c of [rw, fw]) {
    for (const [z0, hz] of [[F - 0.03, F - 0.06], [B - 0.23, B + 0.03]]) {
      box(c - 0.38, 0.12, z0, 0.76, 0.52, 0.26, TYRE);
      box(c - 0.3, 0.04, z0, 0.6, 0.68, 0.26, TYRE);
      box(c - 0.2, 0, z0, 0.4, 0.76, 0.26, TYRE);
      box(c - 0.18, 0.26, hz, 0.36, 0.24, 0.03, HUB);
      box(c - 0.12, 0.2, hz, 0.24, 0.36, 0.03, HUB);
      box(c - 0.06, 0.32, hz < 1.5 ? hz - 0.02 : hz + 0.03, 0.12, 0.12, 0.02, KERB);
    }
    box(c - 0.3, 0.25, F + 0.23, 0.6, BOT - 0.25, B - F - 0.46, TYRE);   // axle between the tyres
    box(c - AR, BOT, F, AR * 2, BELT - BOT, B - F, bodyLo);              // arch top
    box(c - AR, BOT, F - 0.04, AR * 2, 0.06, 0.05, TRIM);                // arch lips
    box(c - AR, BOT, B - 0.01, AR * 2, 0.06, 0.05, TRIM);
  }

  // ---- lower body (deeper tone) as skirts between the arches ----
  for (const [a, b] of [[KX0, rw - AR], [rw + AR, fw - AR], [fw + AR, CX1]]) box(a, SK, F, b - a, BELT - SK, B - F, bodyLo);

  // ---- upper masses ----
  box(KX0, BELT, F, KX1 - KX0, KT - BELT, B - F, body);                  // kitchen
  box(KX1, BELT, F, CL, HOOD - BELT, B - F, body);                       // cab bonnet
  box(KX1, HOOD, F, CL - 0.5, CTOP - HOOD, B - F, body);                 // cab
  parts.push({ t: "gable", p: [CX1 - 1.0, HOOD, F + 0.04], s: [1.0, CTOP - HOOD, B - F - 0.08], c: GLASS, axis: "z" }); // raked windscreen
  box(KX1, CTOP, F - 0.03, CL - 0.5, 0.08, B - F + 0.06, ROOFCAP);       // cab roof, seated on the cab
  box(KX0 - 0.05, KT, F - 0.05, KX1 - KX0 + 0.1, 0.08, B - F + 0.1, ROOFCAP);
  box(KX1 - 0.6, KT + 0.08, 2.02, 0.45, 0.2, 0.36, KERB);                // roof vent (behind the sign)

  // accent belt on both long sides and the rear, plus a band under the kitchen roof
  box(KX0, BELT, F - 0.03, CX1 - KX0, 0.14, 0.05, awn);
  box(KX0, BELT, B - 0.02, CX1 - KX0, 0.14, 0.05, awn);
  box(KX0 - 0.03, BELT, F, 0.05, 0.14, B - F, awn);
  box(KX0, KT - 0.18, F - 0.03, KX1 - KX0, 0.1, 0.05, awn);
  box(KX0 - 0.03, KT - 0.18, F, 0.05, 0.1, B - F, awn);

  // bumpers butt onto the body ends
  box(xs, SK, F + 0.05, KX0 - xs, 0.3, B - F - 0.1, KERB);
  box(CX1, SK, F + 0.05, xe - CX1, 0.3, B - F - 0.1, KERB);

  // ---- cab details ----
  for (const z of [F - 0.03, B - 0.02]) {
    box(KX1 + 0.22, 1.5, z, CL - 0.84, 0.7, 0.05, GLASS);                // side window
    box(KX1 + 0.1, BELT + 0.14, z, 0.03, CTOP - BELT - 0.24, 0.05, TRIM); // door seam
    box(KX1 + 0.28, 1.38, z < 1.5 ? z - 0.02 : z + 0.01, 0.18, 0.05, 0.06, TRIM); // handle
  }
  box(CX1, 1.02, F + 0.5, 0.03, 0.26, B - F - 1.0, TRIM);                // grille
  for (const z of [F - 0.03, B - 0.3]) box(CX1 - 0.2, 1.16, z, 0.23, 0.16, 0.33, L ? LIT : CREAM, L); // corner headlights

  // ---- rear door: tail lights and a big chalk menu board with its own lamp ----
  for (const z of [F + 0.03, B - 0.21]) box(KX0 - 0.04, 1.18, z, 0.04, 0.3, 0.18, RED);
  const MZ0 = F + 0.26, MZ1 = B - 0.26, MY0 = 1.25, MY1 = KT - 0.45, mw = MZ1 - MZ0;
  box(KX0 - 0.04, MY0, MZ0, 0.04, MY1 - MY0, mw, CREAM);                 // frame
  box(KX0 - 0.07, MY0 + 0.06, MZ0 + 0.06, 0.03, MY1 - MY0 - 0.12, mw - 0.12, SLATE);
  box(KX0 - 0.09, MY1 - 0.26, MZ0 + 0.14, 0.02, 0.13, mw - 0.28, signC); // header
  for (let y = MY1 - 0.46; y >= MY0 + 0.14; y -= 0.18) {
    box(KX0 - 0.09, y, MZ0 + 0.14, 0.02, 0.06, mw * 0.5, CREAM);         // dish
    box(KX0 - 0.09, y, MZ1 - 0.26, 0.02, 0.06, 0.12, signC);             // price
  }
  const mz = (MZ0 + MZ1) / 2;
  box(KX0 - 0.16, MY1 + 0.12, mz - 0.05, 0.16, 0.06, 0.1, TRIM);         // lamp arm
  box(KX0 - 0.2, MY1 + 0.02, mz - 0.15, 0.14, 0.1, 0.3, L ? LIT : KERB, L);

  // ---- serving hatch ----
  const fz = F - 0.05;
  box(HX0 - FR, HY0 - FR, fz, HX1 - HX0 + 2 * FR, FR, 0.07, TRIM);       // sill
  box(HX0 - FR, HY1, fz, HX1 - HX0 + 2 * FR, 0.1, 0.07, TRIM);           // hinge head
  box(HX0 - FR, HY0, fz, FR, HY1 - HY0, 0.07, TRIM);
  box(HX1, HY0, fz, FR, HY1 - HY0, 0.07, TRIM);

  const AX0 = HX0 - FR, AW = HX1 - HX0 + 2 * FR;
  let N = Math.max(5, Math.round(AW / 0.3)); if (N % 2 === 0) N++;
  const sw = AW / N;
  if (open) {
    box(HX0, HY0, F - 0.03, HX1 - HX0, HY1 - HY0, 0.05, L ? LIT : TRIM, L); // galley behind the opening
    const shy = HY0 + (HY1 - HY0) * 0.58;
    box(HX0, shy, F - 0.07, HX1 - HX0, 0.05, 0.04, WOOD);                 // shelf
    const jars = Math.floor((HX1 - HX0 - 0.2) / 0.38);
    for (let i = 0; i < jars; i++) box(HX0 + 0.15 + i * 0.38, shy + 0.05, F - 0.07, 0.16, 0.18, 0.04, i % 2 ? SUN : WHITE);
    const CD = 0.4, cz = F - CD, top = HY0 - FR;
    box(AX0, top - 0.08, cz, AW, 0.08, CD, TRIM);                         // fold-down counter
    for (const x of [AX0 + 0.1, AX0 + AW - 0.16]) box(x, top - 0.13, F - 0.32, 0.06, 0.05, 0.32, TRIM); // brackets
    cyl(AX0 + 0.3, top, cz + 0.18, 0.06, 0.2, RED, 8);                    // ketchup + mustard
    cyl(AX0 + 0.47, top, cz + 0.18, 0.06, 0.2, SUN, 8);
    box(AX0 + AW - 0.5, top, cz + 0.1, 0.3, 0.16, 0.2, WHITE);            // napkins
    const ay = HY1 + 0.1, az = F - AD;
    for (let i = 0; i < N; i++) {
      const c = i % 2 ? WHITE : awn;
      box(AX0 + i * sw, ay, az, sw, 0.1, AD, c);
      box(AX0 + i * sw, ay - 0.15, az - 0.02, sw, 0.15, 0.04, c);         // valance
    }
    for (let i = 1; i < N; i++) box(AX0 + i * sw - 0.04, ay - 0.23, az - 0.02, 0.08, 0.08, 0.04, L ? LIT : KERB, L); // bulbs
    for (const x of [AX0, AX0 + AW - 0.05]) box(x, ay - 0.12, F - 0.45, 0.05, 0.12, 0.4, TRIM); // awning stays
  } else {
    const w = (HX1 - HX0) / N;
    for (let i = 0; i < N; i++) box(HX0 + i * w, HY0, F - 0.04, w, HY1 - HY0, 0.06, i % 2 ? WHITE : awn);
    box((HX0 + HX1) / 2 - 0.15, HY0 + 0.08, F - 0.07, 0.3, 0.06, 0.04, TRIM); // pull handle
  }

  // ---- roof sign: cream lightbox with brand-colour faces, topped with a giant snack ----
  const kc = (KX0 + KX1) / 2, SW = Math.min(1.9, KX1 - KX0 - 0.3), SX0 = kc - SW / 2;
  const SY = KT + 0.08, SH = 0.44, SZ0 = 1.05, SZ1 = 1.95, sz = (SZ0 + SZ1) / 2;
  box(SX0, SY, SZ0, SW, SH, SZ1 - SZ0, CREAM);
  box(SX0 - 0.03, SY, SZ0 - 0.03, SW + 0.06, 0.08, SZ1 - SZ0 + 0.06, awn); // base band
  box(SX0 + 0.1, SY + 0.13, SZ0 - 0.04, SW - 0.2, SH - 0.2, 0.06, signFace, L);
  box(SX0 - 0.04, SY + 0.13, SZ0 + 0.1, 0.06, SH - 0.2, SZ1 - SZ0 - 0.2, signFace, L);
  const y0 = SY + SH;
  if (p.snack === "coffee") {
    cyl(kc, y0, sz, 0.34, 0.2, WHITE);                                    // tapered cup
    cyl(kc, y0 + 0.2, sz, 0.4, 0.42, WHITE);
    cyl(kc, y0 + 0.28, sz, 0.42, 0.24, WOOD);                             // card sleeve
    cyl(kc, y0 + 0.62, sz, 0.46, 0.1, awn);                               // lid in the accent colour
    cyl(kc, y0 + 0.72, sz, 0.34, 0.08, awn);
    cyl(kc + 0.14, y0 + 0.8, sz - 0.1, 0.06, 0.08, WHITE, 8);             // sip spout
  } else {
    let y = y0;
    const layer = (r, h, c) => { cyl(kc, y, sz, r, h, c); y += h; };
    layer(0.42, 0.16, SUN);   // bottom bun
    layer(0.45, 0.13, WOOD);  // patty
    layer(0.48, 0.05, LEAF);  // lettuce
    layer(0.41, 0.05, RED);   // tomato
    layer(0.43, 0.14, SUN);   // top bun, stepped into a dome
    layer(0.34, 0.1, SUN);
    layer(0.2, 0.06, SUN);
  }

  return { parts };
}
