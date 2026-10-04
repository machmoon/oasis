// Vending Machines: a kerbside row of 1-3 life-size drink vending machines with glowing display fronts, shelves of
// chunky brand-coordinated cans, lit header signs and an optional hood canopy carried by the cabinets themselves.
// Block asset on the Oasis Town grid (origin at the footprint's corner, y up, street side at z = 0).
export const meta = {
  title: "Vending Machines",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A kerbside row of life-size drink vending machines with glowing fronts and shelves of cans, ready to tuck beside any shop.",
  tags: ["3d", "low poly", "vending machine", "drinks", "street prop", "kerbside", "town", "kit"],
  price: 2,
  author: "oasis-factory",
  footprint: [2, 1],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    bodyA: { type: "color", role: "primary", label: "Machine 1", default: "#E5484D" },
    bodyB: { type: "color", role: "secondary", label: "Machine 2", default: "#3E7BFA" },
    bodyC: { type: "color", role: "highlight", label: "Machine 3 & logos", default: "#2F7A55" },
    trim: { type: "color", role: "ink", label: "Panels & hoods", default: "#5B6270" },
    machines: { type: "range", label: "Machines", default: 2, min: 1, max: 3, step: 1 },
    height: { type: "range", label: "Height (m)", default: 1.85, min: 1.7, max: 2.1, step: 0.05 },
    shelter: { type: "choice", label: "Hood", default: "canopy", options: ["canopy", "open"] },
    lights: { type: "toggle", label: "Lit fronts", default: true },
  },
  presets: {
    Harbour: { bodyA: "#2F7A55", bodyB: "#F2B33D", bodyC: "#3E7BFA", trim: "#3B4A44" },
    Sorbet: { bodyA: "#F7B8CF", bodyB: "#F2B33D", bodyC: "#79B86A", trim: "#4A4458" },
    Midnight: { bodyA: "#7D5BA6", bodyB: "#2B6E8F", bodyC: "#C8553D", trim: "#2B3242" },
  },
};

// ---- colour helpers (luminance-safe, palette-harmonised tonal variants) ----
function toRgb(h) {
  const s = (h || "#888888").replace("#", "");
  const n = parseInt(s.length === 3 ? s.split("").map((c) => c + c).join("") : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}
function toHsl(hex) {
  const [r, g, b] = toRgb(hex).map((v) => v / 255);
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
function fromHsl(h, s, l) {
  h = ((h % 1) + 1) % 1;
  if (s === 0) return toHex(l * 255, l * 255, l * 255);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return toHex(f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255);
}
// hold a brand colour inside the kit's saturation / lightness band (no neon lime, no black holes)
function tone(hex, smax, lo, hi) {
  const [h, s, l] = toHsl(hex);
  return fromHsl(h, Math.min(s, smax), Math.max(lo, Math.min(hi, l)));
}
// tonal shift that darkens light colours and lightens dark ones
function shade(hex, amt) {
  const [h, s, l] = toHsl(hex);
  return fromHsl(h, s, Math.max(0, Math.min(1, l < 0.42 ? l + amt : l - amt)));
}
// a can colour: hue-rotated from a brand colour, held in a punchy mid band so it reads on the pale backlight
function canTone(hex, dh) {
  const [h, s, l] = toHsl(hex);
  return fromHsl(h + dh, Math.max(0.45, Math.min(0.72, s)), Math.max(0.34, Math.min(0.5, l)));
}
function mix(a, b, t) {
  const A = toRgb(a), B = toRgb(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });

  const FW = 2, FD = 1, BASE = 0.05;
  const n = Math.max(1, Math.min(3, Math.round(p.machines)));
  const H = Math.max(1.7, Math.min(2.1, p.height));
  const lights = !!p.lights;
  // the row: 1.7 m span centred on the tile, so a pair is two ~0.83 m real-size machines
  const GAP = 0.04, RX0 = 0.15, SPAN = 1.7, RX1 = RX0 + SPAN;
  const MW = (SPAN - GAP * (n - 1)) / n;
  const ZF = 0.24, MD = 0.66, ZB = ZF + MD; // front and back faces of the row
  const glass = "#7E93A8", slot = "#2B3242", kerb = "#D9DCE1", lidC = "#E9ECEF";
  const trim = tone(p.trim, 0.25, 0.2, 0.42);        // muted ink: never overpowers the machines
  const accent = tone(p.bodyC, 0.7, 0.32, 0.52);     // shared logo / fascia accent

  // ground: kerb pavement strips around the row (never under the cabinets, so nothing overdraws them)
  box(0, 0, 0, FW, BASE, ZF, kerb);
  box(0, 0, ZB, FW, BASE, FD - ZB, kerb);
  box(0, 0, ZF, RX0, BASE, MD, kerb);
  box(RX1, 0, ZF, FW - RX1, BASE, MD, kerb);

  const bodies = [p.bodyA, p.bodyB, p.bodyC];
  for (let m = 0; m < n; m++) {
    const body = tone(bodies[m], 0.7, 0.38, 0.62);
    const cap = shade(body, 0.12);
    const xm = RX0 + m * (MW + GAP);

    // solid cabinet on the ground, flush tonal top cap, kick plate
    box(xm, 0, ZF, MW, H, MD, body);
    box(xm, H, ZF, MW, 0.06, MD, cap);
    box(xm, 0, ZF - 0.02, MW, 0.12, 0.02, trim);
    // dark joint between neighbours so the row reads as separate solid cabinets
    if (m < n - 1) box(xm + MW, 0, ZF + 0.04, GAP, H - 0.02, MD - 0.08, shade(trim, 0.04));

    // header sign kept clear of the hood's sight line; display window fills the face below it
    const hy = H - 0.32;
    const wx = xm + 0.05, ww = MW * 0.64;
    const wy0 = 0.48, wy1 = hy - 0.06, wh = wy1 - wy0;
    const glow = mix("#FFF3D6", body, 0.1);
    box(wx - 0.02, wy0 - 0.02, ZF - 0.02, ww + 0.04, wh + 0.04, 0.02, shade(body, 0.16)); // frame
    box(wx, wy0, ZF - 0.04, ww, wh, 0.02, lights ? glow : glass, lights);

    // cans coordinated with this machine's colour, the shared accent and kit sun
    const cans = [
      canTone(body, 0),
      "#F2B33D",
      m === 2 ? canTone(body, 0.5) : canTone(accent, 0),
      canTone(body, 0.1),
      canTone(body, -0.1),
    ];

    // chunky shelves of cans, laid out from the real window face and centred in it
    const PITCH = 0.26, DH = 0.19, SH = 0.025;
    const rows = Math.max(1, Math.floor((wh - 0.04) / PITCH));
    const cols = Math.max(2, Math.floor((ww - 0.04) / 0.13));
    const cStep = (ww - 0.04) / cols, DW = cStep * 0.72;
    const off = (wh - (rows - 1) * PITCH - SH - DH) / 2;
    for (let r = 0; r < rows; r++) {
      const sy = wy0 + off + r * PITCH;
      box(wx + 0.01, sy, ZF - 0.1, ww - 0.02, SH, 0.06, shade(trim, 0.12));
      for (let c = 0; c < cols; c++) {
        const col = cans[(r * 2 + c * 3 + m) % cans.length];
        const dx = wx + 0.02 + c * cStep + (cStep - DW) / 2;
        box(dx, sy + SH, ZF - 0.09, DW, DH - 0.04, 0.05, col);
        box(dx, sy + SH + DH - 0.04, ZF - 0.09, DW, 0.04, 0.05, lidC); // silver can top
      }
    }

    // control panel: ink strip, lit buttons, coin slot
    const px = wx + ww + 0.04;
    const pw = Math.max(0.06, xm + MW - 0.04 - px);
    const ph = Math.min(0.6, wh);
    const py = wy1 - ph;
    box(px, py, ZF - 0.02, pw, ph, 0.02, trim);
    const bw = pw * 0.6;
    for (let b = 0; b < 3; b++) {
      box(px + (pw - bw) / 2, wy1 - 0.1 - b * 0.11, ZF - 0.04, bw, 0.06, 0.02,
        lights ? mix(body, "#FFFFFF", 0.55) : shade(body, 0.15), lights);
    }
    box(px + (pw - bw) / 2, py + 0.08, ZF - 0.04, bw, 0.1, 0.02, slot);

    // pickup bay set into the cabinet face
    box(wx, 0.16, ZF - 0.02, ww, 0.22, 0.02, slot);
    box(wx + 0.03, 0.27, ZF - 0.04, ww - 0.06, 0.06, 0.02, shade(trim, 0.15));

    // lit header sign with a logo bar in the shared accent (white on the accent machine itself)
    box(xm + 0.05, hy, ZF - 0.03, MW - 0.1, 0.18, 0.03,
      lights ? mix(body, "#FFFFFF", 0.45) : shade(body, 0.1), lights);
    box(xm + MW * 0.25, hy + 0.055, ZF - 0.05, MW * 0.5, 0.07, 0.02, m === 2 ? "#FBFBFB" : accent);

    // outer side faces: recessed tonal panel + header band (glows at night)
    const sideZ = ZF + 0.08, sideD = MD - 0.16;
    const band = lights ? mix(body, "#FFFFFF", 0.5) : shade(body, 0.06);
    if (m === 0) {
      box(xm - 0.02, 0.35, sideZ, 0.02, H - 0.85, sideD, cap);
      box(xm - 0.04, H - 0.38, sideZ, 0.02, 0.16, sideD, band, lights);
    }
    if (m === n - 1) {
      box(xm + MW, 0.35, sideZ, 0.02, H - 0.85, sideD, cap);
      box(xm + MW + 0.02, H - 0.38, sideZ, 0.02, 0.16, sideD, band, lights);
    }

    // warm light spill on the pavement in front of each lit window
    if (lights) box(wx - 0.04, BASE, 0.03, ww + 0.08, 0.01, ZF - 0.05, mix(kerb, "#FFD58A", 0.55), true);

    // hood canopy: one slab per cabinet, resting on its own top so it never crosses a neighbour
    if (p.shelter === "canopy") {
      const hz = ZF - 0.1;
      box(xm, H + 0.06, hz, MW, 0.1, ZB - hz, trim);
      box(xm, H + 0.07, hz - 0.02, MW, 0.08, 0.02,
        lights ? mix(accent, "#FFFFFF", 0.35) : accent, lights); // lit fascia
    }
  }

  return { parts };
}
