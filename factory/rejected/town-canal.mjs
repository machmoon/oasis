// Town Canal: a 6 x 6 m stretch of town canal with stone quays, water and a little moored rowboat. Block asset.
// Origin at the footprint corner, y up, street side at z = 0. The canal runs along x so tiles chain end to end.
// Grid is locked: quays are 1.4 m deep each side and the water channel is 3.2 m wide on every knob value.
export const meta = {
  title: "Town Canal",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A canal tile with flush stone quays and a little rowboat moored to the far bank. It chains end to end to run water through town, with optional lamps, bench and bollards.",
  tags: ["3d", "low poly", "canal", "water", "boat", "rowboat", "quay", "town", "kit"],
  price: 3,
  author: "oasis-factory",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    stone: { type: "color", role: "surface", label: "Stone", default: "#CFC6B4" },
    water: { type: "color", role: "secondary", label: "Water", default: "#3E7BFA" },
    boatColor: { type: "color", role: "primary", label: "Boat", default: "#E5484D" },
    boat: { type: "toggle", label: "Moored boat", default: true },
    boatLength: { type: "range", label: "Boat length (m)", default: 3.6, min: 2.8, max: 4.4, step: 0.4 },
    furniture: { type: "toggle", label: "Lamps & bench", default: true },
    lights: { type: "toggle", label: "Lights on", default: true },
  },
  presets: {
    Amsterdam: { stone: "#C2A98A", water: "#355E8C", boatColor: "#2F7A55" },
    Venice: { stone: "#E8D7BE", water: "#2E9C8F", boatColor: "#2B3242" },
    Kyoto: { stone: "#B9BEC4", water: "#4F7FA8", boatColor: "#C8553D" },
  },
};

// ---- colour helpers: brand colours keep their hue but are held inside a material-appropriate band
function toRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function toHex(r, g, b) {
  const f = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + f(r) + f(g) + f(b);
}
function mix(a, b, t) { const A = toRgb(a), B = toRgb(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
function toHsl(hex) {
  const [r, g, b] = toRgb(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function fromHsl(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return toHex(l * 255, l * 255, l * 255);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; if (t < 1 / 6) return pp + (q - pp) * 6 * t; if (t < 0.5) return q; if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6; return pp; };
  return toHex(f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255);
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Water: every input hue maps continuously into the teal-to-blue family (165-235 deg), so distinct brand
// colours give distinct waters, but never lava or carpet. A light cast of the raw colour keeps the probe visible.
function waterTone(hex) {
  const [h, s, l] = toHsl(hex);
  let wh = h;
  if (h < 165 || h > 235) { const t = ((h - 235 + 360) % 360) / 290; wh = 235 - t * 70; }
  const base = fromHsl(wh, clamp(s, 0.3, 0.65), clamp(l, 0.3, 0.52));
  return mix(base, hex, 0.12);
}
// Stone: low saturation, light enough that lit and shaded faces separate.
function stoneTone(hex) { const [h, s, l] = toHsl(hex); return fromHsl(h, Math.min(s, 0.22), clamp(l, 0.52, 0.8)); }
// Hull: the brand hue as a painted enamel; saturation and lightness capped so neon never glows.
function hullTone(hex) { const [h, s, l] = toHsl(hex); return fromHsl(h, Math.min(s, 0.55), clamp(l, 0.3, 0.52)); }

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) => parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const cyl = (x, y, z, r, h, c, n) => parts.push({ t: "cyl", p: [x, y, z], r, h, c, n: n || 10 });

  // ---- locked grid
  const S = 6, Wc = 3.2, B = (S - Wc) / 2;   // 1.4 m quay each side
  const TOP = 0.45, WL = 0.12, CP = 0.08;    // quay top, water surface, coping thickness
  const zBack = S - B;                       // 4.6: water face of the far quay

  const stone = stoneTone(p.stone);
  const stoneDark = mix(stone, "#000000", 0.2);
  const coping = mix(stone, "#FFFFFF", 0.4);
  const water = waterTone(p.water);
  const ripple = mix(water, "#FFFFFF", 0.5);
  const hc = hullTone(p.boatColor);
  const iron = "#3D4350", wood = "#8A6E52", lit = "#FFD58A", glass = "#7E93A8";
  const seatWood = "#A88B6A", oarWood = "#D9C29A", rope = "#F6EEE0", rim = "#FBFBFB";
  const glow = (c) => (p.lights ? lit : c);

  // ---- quays and water: everything flush inside the 6 x 6 footprint
  box(0, 0, 0, S, TOP, B, stone);
  box(0, 0, zBack, S, TOP, B, stone);
  box(0, 0, B, S, WL, Wc, water);
  // coping strips sit on the quay tops, flush with every edge (no lip over the water)
  box(0, TOP, 0, S, CP, 0.35, coping);
  box(0, TOP, B - 0.4, S, CP, 0.4, coping);
  box(0, TOP, zBack, S, CP, 0.4, coping);
  box(0, TOP, S - 0.35, S, CP, 0.35, coping);
  // wet waterline band along the visible far quay wall
  box(0, WL, zBack - 0.03, S, 0.1, 0.03, stoneDark);
  // paving joints between the coping strips
  for (const jx of [0.75, 2.25, 3.75, 5.25]) {
    box(jx - 0.02, TOP, 0.4, 0.04, 0.02, 0.55, stoneDark);
    box(jx - 0.02, TOP, zBack + 0.45, 0.04, 0.02, 0.55, stoneDark);
  }

  // ---- boat geometry, all derived from one hull profile and the length knob
  const L = p.boatLength, xs = 3.1 - L / 2;  // stern x; the bow stays inside the tile at max length
  const half = 0.6, zc = zBack - 0.18 - half; // 0.18 m clear of the far wall
  const HB = 0.06, FLOOR = 0.28, T = 0.08;
  const prof = [ // [u0, u1, beam fraction, gunwale top]
    [0, 0.08, 0.8, 0.46],
    [0.08, 0.2, 0.94, 0.46],
    [0.2, 0.62, 1.0, 0.46], // open well
    [0.62, 0.74, 0.9, 0.48],
    [0.74, 0.84, 0.72, 0.51],
    [0.84, 0.92, 0.5, 0.55],
    [0.92, 1.0, 0.26, 0.6],
  ];
  const sliceAt = (u) => prof.find(([a, b]) => u >= a && u < b);

  // bollards on the far quay coping, at the same x as the boat's cleats
  const bz = zBack + 0.22, bollardU = [0.14, 0.68];
  const bollardX = bollardU.map((u) => xs + u * L);
  if (p.boat || p.furniture) {
    for (const bx of bollardX) {
      cyl(bx, TOP + CP, bz, 0.12, 0.36, iron, 10);
      cyl(bx, TOP + CP + 0.36, bz, 0.15, 0.06, iron, 10);
    }
  }

  // ---- quay furniture: lamps on opposite corners (clear of the camera's line onto the boat) and a bench
  if (p.furniture) {
    const lamp = (x, z) => {
      box(x - 0.13, TOP, z - 0.13, 0.26, 0.1, 0.26, iron);
      cyl(x, TOP + 0.1, z, 0.06, 2.2, iron, 8);
      const hy = TOP + 2.3;
      box(x - 0.16, hy, z - 0.16, 0.32, 0.36, 0.32, glow(glass), p.lights);
      box(x - 0.21, hy + 0.36, z - 0.21, 0.42, 0.08, 0.42, iron);
    };
    lamp(5.5, 0.68);
    lamp(0.5, 5.3);

    // slatted bench on the near quay paving, back to the street, facing the water
    const x0 = 0.9, BL = 1.2, z0 = 0.42, D = 0.45, y = TOP;
    for (const fx of [x0, x0 + BL - 0.06]) {
      box(fx, y, z0, 0.06, 0.42, D, iron);                       // cast end frame
      box(fx, y + 0.42, z0, 0.06, 0.46, 0.06, iron);             // back post
      box(fx, y + 0.42, z0 + D - 0.06, 0.06, 0.22, 0.06, iron);  // arm post
      box(fx, y + 0.64, z0 + 0.06, 0.06, 0.04, D - 0.06, iron);  // armrest
    }
    const sd = (D - 0.03) / 2;
    for (let i = 0; i < 2; i++) box(x0 + 0.06, y + 0.42, z0 + i * (sd + 0.03), BL - 0.12, 0.05, sd, wood);
    for (const sy of [0.55, 0.72]) box(x0 + 0.06, y + sy, z0 + 0.01, BL - 0.12, 0.11, 0.04, wood);
  }

  // ---- ripples: two clean rows on open water, clear of the hull
  const openEnd = p.boat ? zc - half : zBack;
  const avail = openEnd - B;
  const rz = [B + avail * 0.32, B + avail * 0.68];
  [[0.5, 1.3, 0], [2.6, 1.3, 0], [4.6, 1.0, 0], [1.5, 1.3, 1], [3.6, 1.3, 1]].forEach(([x, w, row]) => {
    box(x, WL, rz[row] - 0.04, w, 0.02, 0.08, ripple);
  });

  // ---- the rowboat: tapered stern, open well with seats, rising pointed bow
  if (p.boat) {
    prof.forEach(([u0, u1, f, top], i) => {
      const x0 = xs + u0 * L, len = (u1 - u0) * L, hw = half * f;
      if (i === 2) {
        box(x0, HB, zc - hw, len, FLOOR - HB, hw * 2, hc);         // well bottom
        box(x0, FLOOR, zc - hw, len, top - FLOOR, T, hc);          // street-side wall
        box(x0, FLOOR, zc + hw - T, len, top - FLOOR, T, hc);      // bank-side wall
      } else {
        box(x0, HB, zc - hw, len, top - HB, hw * 2, hc);
      }
      box(x0, top - 0.13, zc - hw - 0.03, len, 0.06, 0.03, rim);   // white strake, street side
    });
    box(xs - 0.03, 0.33, zc - half * 0.8, 0.03, 0.06, half * 1.6, rim); // strake round the transom

    // inside the well: floorboards, two thwarts, a pair of oars resting on them
    const wx0 = xs + 0.2 * L, wx1 = xs + 0.62 * L, iz0 = zc - half + T, iw = 2 * (half - T);
    box(wx0, FLOOR, iz0, wx1 - wx0, 0.02, iw, wood);
    for (const u of [0.34, 0.5]) box(xs + u * L - 0.12, 0.36, iz0, 0.24, 0.05, iw, seatWood);
    const ox0 = wx0 + 0.08, ox1 = wx1 - 0.08;
    for (const oz of [zc - 0.24, zc + 0.16]) {
      box(ox0, 0.41, oz, ox1 - ox0 - 0.3, 0.035, 0.05, oarWood);   // loom
      box(ox1 - 0.3, 0.41, oz - 0.035, 0.3, 0.035, 0.12, oarWood); // blade
    }
    // stern sheets and foredeck in wood
    const s1 = prof[1], s3 = prof[3];
    box(xs + s1[0] * L + 0.04, 0.46, zc - half * s1[2] + 0.08, (s1[1] - s1[0]) * L - 0.04, 0.03, 2 * (half * s1[2] - 0.08), seatWood);
    box(xs + s3[0] * L + 0.04, 0.48, zc - half * s3[2] + 0.08, (s3[1] - s3[0]) * L - 0.08, 0.025, 2 * (half * s3[2] - 0.08), wood);

    // stern lantern and bow light
    const lx = xs + 0.04 * L;
    box(lx - 0.03, 0.46, zc - 0.03, 0.06, 0.5, 0.06, iron);
    box(lx - 0.09, 0.96, zc - 0.09, 0.18, 0.2, 0.18, glow(glass), p.lights);
    box(lx - 0.12, 1.16, zc - 0.12, 0.24, 0.05, 0.24, iron);
    const fx = xs + 0.96 * L;
    box(fx - 0.02, 0.6, zc - 0.02, 0.04, 0.2, 0.04, iron);
    box(fx - 0.06, 0.8, zc - 0.06, 0.12, 0.12, 0.12, glow(glass), p.lights);

    // cleats on the bank-side gunwale; short thin lines rise and run straight to the bollards
    const ry = 0.75;
    bollardU.forEach((u, i) => {
      const bx = bollardX[i], sl = sliceAt(u), top = sl[3], zEdge = zc + half * sl[2];
      box(bx - 0.09, top, zEdge - 0.08, 0.18, 0.06, 0.06, iron);
      const rz0 = zEdge - 0.0675;
      box(bx - 0.0175, top + 0.06, rz0, 0.035, ry - (top + 0.06), 0.035, rope);
      box(bx - 0.0175, ry, rz0, 0.035, 0.035, bz - rz0, rope);
    });
  }

  return { parts };
}
