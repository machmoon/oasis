// Delivery Van: a Luton box van with a tall cargo body, a framed logo panel and twin rear doors.
// Block asset: build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up,
// street side at z = 0). The van parks along the kerb with the cab at +x and the rear doors at -x, so the kit
// camera sees the doors and the street side.
// Scale: a 2.9 m box, a 0.72 m wheel, a 1.5 m cab door and a 1.7 m body width match town-shop's 2.6 m storeys.
// The brief asks for a 5 x 2 m footprint and a 4-6 m length, which cannot both hold. The plot is therefore
// 6 x 2 m: a 6 m van fills it exactly, and the default 5 m van leaves 0.5 m clear at each end.
export const meta = {
  title: "Delivery Van",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A chunky Luton delivery van with a tall cargo box, a framed logo panel and twin rear doors, ready to park on any Oasis Town kerb.",
  tags: ["3d", "low poly", "vehicle", "van", "delivery", "parcel", "street", "town"],
  price: 3,
  author: "oasis-factory",
  footprint: [6, 2],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    body: { type: "color", role: "surface", label: "Body", default: "#2F7A55" },
    logo: { type: "color", role: "primary", label: "Logo", default: "#F2B33D" },
    length: { type: "range", label: "Length (m)", default: 5, min: 4, max: 6, step: 0.5 },
    height: { type: "range", label: "Box height (m)", default: 2.9, min: 2.6, max: 3.3, step: 0.1 },
    livery: { type: "choice", label: "Livery", default: "parcel", options: ["parcel", "arrow", "stripes"] },
    lights: { type: "toggle", label: "Lights on", default: true },
  },
  presets: {
    "Blossom Bakery": { body: "#F7B8CF", logo: "#C8553D" },
    "Night Courier": { body: "#2B3242", logo: "#3E7BFA" },
    "Post Office": { body: "#C8553D", logo: "#F2B33D" },
  },
};

function hexRgb(h) {
  const n = parseInt(String(h).replace("#", "").slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}
function lum(h) {
  const [r, g, b] = hexRgb(h);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
function mix(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
// Tonal variant that survives any input: darken light colours, lighten dark ones.
function shade(h, a) {
  return lum(h) > 0.4 ? mix(h, "#000000", a) : mix(h, "#FFFFFF", a);
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => {
    if (w <= 0.001 || h <= 0.001 || d <= 0.001) return;
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  };

  // Fixed kit materials (never brand-coloured)
  const TYRE = "#2B3242", TRIM = "#5B6270", ALU = "#D9DCE1", GLASS = "#7E93A8", UNDER = "#3A4150";
  const on = !!p.lights;
  const RED = on ? "#FF3B3B" : "#9E2F2F";      // tail and brake lamps stay red when lit
  const AMB = on ? "#FFB23D" : "#C98A2E";      // marker lamps stay amber when lit
  const IND = "#E39A3B";                       // indicators: off, never glow
  const HEAD = on ? "#FFF4D6" : ALU;

  // Dimensions, clamped to the plot
  const L = Math.max(4, Math.min(6, Number(p.length) || 5));
  const Ht = Math.max(2.6, Math.min(3.3, Number(p.height) || 2.9));
  const x0 = (6 - L) / 2;          // van spans [x0, x0 + L]
  const xs = x0 + 0.1;             // rear face of the cargo box
  const xn = x0 + L - 0.1;         // cab nose face
  const CAB = 1.8;
  const xc = xn - CAB;             // cab / cargo boundary
  const Lc = xc - xs;              // cargo box length (2.0 .. 4.0)
  const ZF = 0.15, ZB = 1.85;      // street-side and kerb-side faces
  const YS = 0.45, YB = 0.75;      // skirt bottom, body floor
  const CABTOP = 2.35, R = 0.36;   // cab roof, wheel radius

  // Colours derived from the brand body colour
  const body = p.body;
  const doorTone = lum(body) < 0.3 ? mix(body, "#FFFFFF", 0.18) : shade(body, 0.06);
  const doorSeam = shade(doorTone, 0.4);
  const seam = shade(body, 0.32);
  const roofTone = shade(body, 0.12);
  const frame = lum(body) > 0.45 ? TRIM : ALU;              // panel frame contrasts with the body
  const ink = lum(body) > 0.5 ? "#2B3242" : "#FBF7EF";      // marks painted straight on the body
  const plate = lum(p.logo) > 0.55 ? "#2B3242" : "#FBF7EF"; // panel contrasts with the logo
  const lidTone = shade(p.logo, 0.22);

  // Paint layers on a long side (s = -1 street, +1 kerb): k = 1 sits on the body, k = 2 on that, ...
  const face = (s, k, x, y, w, h, c, e) => box(x, y, s < 0 ? ZF - 0.03 * k : ZB + 0.03 * (k - 1), w, h, 0.03, c, e);
  // Paint layers on the rear face (facing -x)
  const rear = (k, z, y, d, h, c, e) => box(xs - 0.03 * k, y, z, 0.03, h, d, c, e);

  // ---- Wheels: an octagonal tyre built from three overlapping blocks, with a rim and hub ------------
  const axles = [xs + 0.75];
  if (L >= 5.5) axles.push(xs + 0.75 + 0.86); // long vans get a tandem rear axle
  axles.push(xn - 0.5);
  const wheel = (cx, za, zb, out) => {
    const d = zb - za;
    box(cx - 0.15, 0, za, 0.3, 2 * R, d, TYRE);
    box(cx - R, R - 0.15, za + 0.01, 2 * R, 0.3, d - 0.02, TYRE);
    box(cx - 0.3, R - 0.3, za + 0.02, 0.6, 0.6, d - 0.04, TYRE);
    const rz = out < 0 ? za - 0.03 : zb - 0.02;
    box(cx - 0.13, R - 0.13, rz, 0.26, 0.26, 0.05, ALU);
    box(cx - 0.17, R - 0.07, rz, 0.34, 0.14, 0.05, ALU);
    box(cx - 0.07, R - 0.17, rz, 0.14, 0.34, 0.05, ALU);
    box(cx - 0.06, R - 0.06, out < 0 ? za - 0.06 : zb + 0.01, 0.12, 0.12, 0.05, TRIM);
  };
  for (const cx of axles) {
    wheel(cx, 0.18, 0.48, -1);
    wheel(cx, 1.52, 1.82, 1);
  }
  box(xs, 0.3, 0.48, xn - xs, YB - 0.3, 1.04, UNDER); // underbody between the tyres

  // Side skirts with real wheel-arch openings
  const arches = axles.map((cx) => [cx - 0.42, cx + 0.42]);
  let cur = xs;
  for (const [a, b] of arches.concat([[xn, xn]])) {
    if (a - cur > 0.02) {
      box(cur, YS, ZF, a - cur, YB - YS, 0.15, body);
      box(cur, YS, ZB - 0.15, a - cur, YB - YS, 0.15, body);
    }
    cur = b;
  }
  for (const s of [-1, 1]) {
    face(s, 1, xs, YB, xn - xs, 0.12, TRIM); // rubbing strip over the arches
    for (const cx of axles) {
      face(s, 1, cx - 0.46, YS, 0.04, YB - YS, TRIM); // arch lips
      face(s, 1, cx + 0.42, YS, 0.04, YB - YS, TRIM);
    }
  }

  // Bumpers and number plate
  box(x0 + 0.03, 0.35, 0.12, xs - x0 - 0.03, YB - 0.35, 1.76, TRIM);
  box(x0, 0.42, 0.72, 0.04, 0.2, 0.56, "#F6EEE0");
  box(xn, 0.35, 0.12, x0 + L - xn, 0.45, 1.76, TRIM);

  // ---- Body: cargo box, cab and the Luton peak, all in the body colour -------------------------------
  box(xs, YB, ZF, Lc, Ht - YB, ZB - ZF, body);
  box(xc, YB, ZF, CAB, 1.4 - YB, ZB - ZF, body);              // lower cab and bonnet
  box(xc, 1.4, ZF, CAB - 0.55, CABTOP - 1.4, ZB - ZF, body);  // upper cab
  box(xc, CABTOP, ZF, 0.9, Ht - CABTOP, ZB - ZF, body);       // Luton peak sits on the cab roof
  // Raked windscreen in two steps, framed by dark A-pillars
  for (const [a, b, top] of [[0.55, 0.42, 2.2], [0.42, 0.29, 1.85]]) {
    box(xn - a, 1.4, ZF + 0.08, a - b, top - 1.4, ZB - ZF - 0.16, GLASS);
    box(xn - a, 1.4, ZF, a - b, top - 1.4, 0.08, TRIM);
    box(xn - a, 1.4, ZB - 0.08, a - b, top - 1.4, 0.08, TRIM);
  }
  // Roof panel and ribs (rib count follows length)
  const rw = Lc + 0.78;
  box(xs + 0.06, Ht, ZF + 0.06, rw, 0.03, ZB - ZF - 0.12, roofTone);
  const nr = Math.max(2, Math.floor(rw / 0.7));
  for (let i = 1; i <= nr; i++) box(xs + 0.06 + (i * rw) / (nr + 1) - 0.03, Ht + 0.03, ZF + 0.12, 0.06, 0.03, ZB - ZF - 0.24, ALU);
  // Marker lamps on the peak nose
  for (const mz of [0.4, 1.3]) box(xc + 0.9, Ht - 0.2, mz, 0.03, 0.08, 0.3, AMB, on);

  // Front face: grille and headlamps
  box(xn, 0.9, 0.5, 0.03, 0.35, 1.0, TRIM);
  for (const hz of [0.2, 1.55]) box(xn, 0.95, hz, 0.03, 0.22, 0.25, HEAD, on);

  // ---- Both long sides: aluminium frame, cab details ------------------------------------------------
  for (const s of [-1, 1]) {
    face(s, 1, xs, Ht - 0.12, Lc + 0.9, 0.12, ALU);                     // top rail
    face(s, 1, xs, YB + 0.12, 0.1, Ht - 0.12 - YB - 0.12, ALU);         // rear corner post
    face(s, 1, xc - 0.1, YB + 0.12, 0.1, CABTOP - YB - 0.12, ALU);      // front corner post
    face(s, 1, xc - 0.1, CABTOP, 1.0, 0.08, ALU);                       // peak bottom rail
    face(s, 1, xc + 0.8, CABTOP + 0.08, 0.1, Ht - 0.12 - CABTOP - 0.08, ALU);
    box(xs - 0.03, YB, s < 0 ? ZF - 0.03 : ZB, 0.03, Ht - YB, 0.03, ALU); // corner fill
    const nm = Math.max(2, Math.round(Lc / 1.2));
    for (let i = 0; i < nm; i++) face(s, 2, xs + 0.3 + (i * (Lc - 0.74)) / (nm - 1), Ht - 0.1, 0.14, 0.07, AMB, on);

    // Cab: big framed side window split into door glass and quarter light
    face(s, 1, xc + 0.1, 1.48, xn - 0.6 - (xc + 0.1), 0.8, TRIM);
    face(s, 2, xc + 0.15, 1.53, 0.68, 0.7, GLASS);
    face(s, 2, xc + 0.88, 1.53, xn - 0.65 - (xc + 0.88), 0.7, GLASS);
    face(s, 1, xc + 0.04, YB + 0.12, 0.03, CABTOP - 0.08 - YB - 0.12, seam); // door seams
    face(s, 1, xc + 0.95, YB + 0.12, 0.03, 1.48 - YB - 0.12, seam);
    face(s, 1, xc + 0.18, 1.3, 0.18, 0.06, TRIM);                           // handle
    face(s, 1, xn - 0.22, 0.95, 0.22, 0.22, HEAD, on);                      // wrap-around headlamp
    face(s, 1, xn - 0.22, 1.2, 0.22, 0.08, IND);
    box(xc + 0.12, 0.5, s < 0 ? ZF - 0.14 : ZB, 0.6, 0.07, 0.14, TRIM);    // cab step
    box(xn - 0.52, 1.9, s < 0 ? ZF - 0.1 : ZB, 0.05, 0.05, 0.1, TRIM);     // mirror arm on the A-pillar
    box(xn - 0.56, 1.65, s < 0 ? ZF - 0.15 : ZB + 0.08, 0.14, 0.35, 0.07, TRIM);
  }

  // ---- Rear: framed twin doors, lock rods, hinges, tail lamps, reflective strip ----------------------
  const dy = YB + 0.12, dh = Ht - 0.12 - dy, zm = (ZF + ZB) / 2;
  rear(1, ZF, YB, ZB - ZF, 0.12, ALU);                        // sill
  rear(1, ZF, Ht - 0.12, ZB - ZF, 0.12, ALU);                 // header
  rear(1, ZF, dy, 0.1, dh, ALU);                              // posts
  rear(1, ZB - 0.1, dy, 0.1, dh, ALU);
  rear(1, ZF + 0.1, dy, zm - 0.02 - ZF - 0.1, dh, doorTone);  // left door
  rear(1, zm + 0.02, dy, ZB - 0.1 - zm - 0.02, dh, doorTone); // right door
  rear(1, zm - 0.02, dy, 0.04, dh, doorSeam);                 // centre seam
  for (const rz of [0.62, 1.33]) rear(2, rz, dy + 0.15, 0.05, dh - 0.3, ALU); // lock rods
  rear(3, 0.55, 1.3, 0.2, 0.08, TRIM);                        // handles
  rear(3, 1.25, 1.3, 0.2, 0.08, TRIM);
  for (const hy of [dy + 0.2, dy + dh - 0.3]) {
    rear(2, ZF + 0.1, hy, 0.12, 0.1, TRIM);                   // hinges
    rear(2, ZB - 0.22, hy, 0.12, 0.1, TRIM);
  }
  const segs = 6, sw = (ZB - ZF - 0.2) / segs;
  for (let i = 0; i < segs; i++) rear(2, ZF + 0.1 + i * sw, dy + 0.04, sw, 0.06, i % 2 ? "#FBFBFB" : "#E5484D");
  for (const tz of [ZF + 0.015, ZB - 0.085]) {
    rear(2, tz, YB + 0.2, 0.07, 0.5, RED, on);                // tail lamps
    rear(2, tz, YB + 0.76, 0.07, 0.14, IND);                  // indicators
  }
  rear(2, zm - 0.2, Ht - 0.1, 0.4, 0.07, RED, on);            // high brake light

  // ---- Livery on both long sides --------------------------------------------------------------------
  const parcelIcon = (s, k, ix, iy, sz, tape) => {
    face(s, k, ix, iy, sz, sz * 0.72, p.logo);                              // parcel
    face(s, k, ix - sz * 0.06, iy + sz * 0.72, sz * 1.12, sz * 0.26, lidTone); // overhanging lid
    face(s, k + 1, ix + sz * 0.42, iy + sz * 0.72, sz * 0.16, sz * 0.26, tape); // tape on the lid only
    face(s, k + 1, ix + sz * 0.55, iy + sz * 0.12, sz * 0.3, sz * 0.18, tape);  // address label
  };
  const avail = Ht - 0.12 - (YB + 0.12);

  for (const s of [-1, 1]) {
    parcelIcon(s, 1, xc + 0.45, 0.95, 0.3, ink); // cab door badge

    if (p.livery === "stripes") {
      // Twin stripes painted on the body, ending cleanly at the aluminium corner posts
      const lowC = Math.abs(lum(p.logo) - lum(body)) < 0.15;
      face(s, 1, xs + 0.1, 1.0, Lc - 0.2, 0.28, p.logo);
      face(s, 1, xs + 0.1, 1.36, Lc - 0.2, 0.08, lowC ? ink : p.logo);
      // Emblem: a framed parcel badge plus a wordmark, centred on the upper box
      const top = Ht - 0.12, sz = Math.min(0.6, (top - 1.55) * 0.7);
      const iy = 1.55 + (top - 1.55 - sz * 0.98) / 2;
      const bw = sz * 1.12 + 0.16;
      const tw = Math.max(0, Math.min(1.4, Lc - 0.6 - bw - 0.15));
      const gw = bw + (tw > 0.3 ? 0.15 + tw : 0);
      const gx = xs + (Lc - gw) / 2;
      face(s, 1, gx, iy - 0.1, bw, sz * 0.98 + 0.2, frame);
      face(s, 2, gx + 0.04, iy - 0.06, bw - 0.08, sz * 0.98 + 0.12, plate);
      parcelIcon(s, 3, gx + 0.08 + sz * 0.06, iy, sz, plate);
      if (tw > 0.3) {
        const tx = gx + bw + 0.15;
        face(s, 1, tx, iy + sz * 0.45, tw, sz * 0.26, ink);
        face(s, 1, tx, iy + sz * 0.12, tw * 0.6, sz * 0.13, ink);
      }
      continue;
    }

    // Framed logo panel, sized to about 60 % of the box length and half its height
    const pw = Math.min(Lc * 0.64, 2.4), ph = Math.min(1.0, avail * 0.52);
    const px = xs + (Lc - pw) / 2, py = YB + 0.12 + (avail - ph) / 2 + 0.12;
    face(s, 1, px - 0.06, py - 0.06, pw + 0.12, ph + 0.12, frame);
    face(s, 2, px, py, pw, ph, plate);
    const cy = py + ph / 2;

    if (p.livery === "parcel") {
      const sz = Math.min(ph * 0.62, pw * 0.28), zone = pw * 0.16;
      const textAvail = pw - 0.2 - zone - 0.12 - sz * 1.12 - 0.15;
      const hasText = textAvail > 0.3, tw = Math.min(1.2, textAvail);
      const gw = zone + 0.12 + sz * 1.12 + (hasText ? 0.15 + tw : 0);
      const gx = px + (pw - gw) / 2;
      const ix = gx + zone + 0.12 + sz * 0.06, iy = py + (ph - sz * 0.98) / 2;
      parcelIcon(s, 3, ix, iy, sz, plate);
      for (const [fy, fl] of [[0.2, 0.6], [0.42, 1], [0.64, 0.75]]) {
        const lw = zone * fl;
        face(s, 3, gx + zone - lw, iy + sz * fy - ph * 0.03, lw, ph * 0.06, p.logo); // speed lines
      }
      if (hasText) {
        const tx = ix + sz * 1.06 + 0.15;
        face(s, 3, tx, cy + ph * 0.02, tw, ph * 0.17, p.logo); // wordmark
        face(s, 3, tx, cy - ph * 0.2, tw * 0.6, ph * 0.09, p.logo);
      }
    } else {
      // Arrow pointing towards the cab
      const hh = ph * 0.7, ax = px + pw * 0.12, aw = pw * 0.76;
      const headW = Math.min(aw * 0.4, hh * 0.9), hx = ax + aw - headW;
      face(s, 3, ax, cy - hh * 0.17, hx - ax, hh * 0.34, p.logo);
      const n = 5, cw = headW / n;
      for (let i = 0; i < n; i++) {
        const ch = hh * (1 - i / n);
        face(s, 3, hx + i * cw, cy - ch / 2, cw, ch, p.logo);
      }
    }
  }

  return { parts };
}
