// Picket Fence: a painted picket run with posts, rails, an optional garden gate and post lanterns. Block asset:
// build(p) returns parts in metres on the Oasis Town grid (origin at the footprint's corner, y up, street side at z = 0).
export const meta = {
  title: "Picket Fence",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A painted picket fence run on a stone kerb with chunky posts, pointed, flat or scalloped pickets and an optional garden gate, sized to edge front gardens beside the town shop.",
  tags: ["3d", "low poly", "fence", "picket fence", "garden", "gate", "town", "kit", "block"],
  price: 1,
  author: "parkline", payout: "parkline@creators.oasis.example",
  footprint: [6, 0.5],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    paint: { type: "color", role: "surface", label: "Pickets", default: "#F6EEE0" },
    frame: { type: "color", role: "secondary", label: "Posts & rails", default: "#8A6E52" },
    accent: { type: "color", role: "primary", label: "Caps, gate & lanterns", default: "#2F7A55" },
    height: { type: "range", label: "Height (m)", default: 1.0, min: 0.8, max: 1.6, step: 0.1 },
    length: { type: "range", label: "Length (m)", default: 6, min: 2, max: 6, step: 1 },
    style: { type: "choice", label: "Pickets", default: "pointed", options: ["pointed", "flat", "scalloped"] },
    gate: { type: "choice", label: "Gate", default: "none", options: ["none", "centre", "end"] },
    lights: { type: "toggle", label: "Post lanterns lit", default: true },
  },
  presets: {
    Meadow: { paint: "#F3E3C8", frame: "#2F7A55", accent: "#F2B33D" },
    Cottage: { paint: "#F7B8CF", frame: "#F6EEE0", accent: "#C8553D" },
    Harbour: { paint: "#D8DEE3", frame: "#5B6270", accent: "#3E7BFA" },
  },
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });
  const gable = (x, y, z, w, h, d, c) => parts.push({ t: "gable", p: [x, y, z], s: [w, h, d], c, axis: "z" });

  // ---- colour helpers: derive dark metalwork from the frame hue, keep pickets readable
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const hex = (a) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); };
  const lum = (h) => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const paint = lum(p.paint) < 0.35 ? mix(p.paint, "#FFFFFF", 0.35) : p.paint;
  const metal = mix(p.frame, "#1F2430", 0.62); // lantern bands, hinges, latch: tinted by the frame colour

  const H = p.height, L = p.length;
  const x0 = (6 - L) / 2, ZC = 0.25;
  const FOOT = 0.06;
  const PW = 0.09, PD = 0.05, TIP = 0.12, RH = 0.08;
  const stone = "#D9DCE1", slab = "#BFC3CA";
  const glass = p.lights ? "#FFD58A" : "#7E93A8";

  // picket top profile per style; rails always sit below the lowest picket body
  const amp = 0.08 + 0.2 * H; // scallop dip depth: 0.24 m at 0.8 m tall, 0.40 m at 1.6 m
  const pointed = p.style !== "flat";
  const fenceTop =
    p.style === "scalloped" ? (t) => H - amp * Math.sin(Math.PI * t)
    : p.style === "flat" ? () => H - 0.05
    : () => H;
  const lowestTop = p.style === "scalloped" ? H - amp : H;
  const railLo = 0.16;
  const railHi = Math.max(railLo + 0.18, Math.min(H - 0.34, lowestTop - TIP - 0.1));

  // stone kerb: the whole run stands on it, contained inside the 6 x 0.5 footprint
  const KZ0 = 0.04, KD = 0.42;
  box(x0, 0, KZ0, L, FOOT, KD, stone);

  // ---- post layout from one shared run
  const run = (a, b) => {
    const n = Math.max(1, Math.ceil((b - a) / 2 - 1e-6));
    const xs = [];
    for (let i = 0; i <= n; i++) xs.push(a + ((b - a) * i) / n);
    return xs;
  };
  const inset = 0.13, xs = x0 + inset, xe = x0 + L - inset;
  const GW = 1.0, MINBAY = 0.6; // gate opening between post centres; smallest side bay allowed
  let mode = p.gate;
  if (mode === "centre" && (x0 + L / 2 - GW / 2) - xs < MINBAY) mode = "end"; // short runs: gate moves to the end
  const posts = [];
  if (mode === "none") {
    run(xs, xe).forEach((x) => posts.push({ x, hw: 0.06, gate: false }));
  } else {
    const g1 = mode === "end" ? xe : x0 + L / 2 + GW / 2;
    const g0 = g1 - GW;
    run(xs, g0).forEach((x, i, a) => posts.push({ x, hw: i === a.length - 1 ? 0.08 : 0.06, gate: i === a.length - 1 }));
    if (g1 >= xe - 1e-6) posts.push({ x: g1, hw: 0.08, gate: true });
    else run(g1, xe).forEach((x, i) => posts.push({ x, hw: i === 0 ? 0.08 : 0.06, gate: i === 0 }));
  }

  // ---- posts, caps, lanterns
  const lantern = (x, T) => {
    box(x - 0.1, T, ZC - 0.1, 0.2, 0.04, 0.2, metal);
    box(x - 0.065, T + 0.04, ZC - 0.065, 0.13, 0.16, 0.13, glass, p.lights);
    box(x - 0.1, T + 0.2, ZC - 0.1, 0.2, 0.04, 0.2, metal);
    parts.push({ t: "cone", p: [x, T + 0.24, ZC], r: 0.11, h: 0.12, c: p.accent, n: 6 });
  };
  posts.forEach((q, i) => {
    const top = q.gate ? H + 0.3 : H + 0.05;
    box(q.x - q.hw, FOOT, ZC - q.hw, q.hw * 2, top - FOOT, q.hw * 2, p.frame);
    const isEnd = i === 0 || i === posts.length - 1;
    const hasLantern = mode === "none" ? isEnd : q.gate;
    if (hasLantern) lantern(q.x, top);
    else {
      box(q.x - 0.09, top, ZC - 0.09, 0.18, 0.05, 0.18, p.accent);
      box(q.x - 0.05, top + 0.05, ZC - 0.05, 0.1, 0.05, 0.1, p.accent);
    }
  });

  // ---- pickets laid out evenly between two x bounds
  const pickets = (left, right, y0, topAt, c, pt) => {
    const span = right - left;
    const n = Math.max(1, Math.floor((span - 0.08) / (PW + 0.08)));
    const gap = (span - n * PW) / (n + 1);
    for (let i = 0; i < n; i++) {
      const x = left + gap + i * (PW + gap);
      const t = (x + PW / 2 - left) / span;
      const top = topAt(t);
      const bodyTop = pt ? top - TIP : top;
      box(x, y0, ZC - PD, PW, bodyTop - y0, PD, c);
      if (pt) gable(x, bodyTop, ZC - PD, PW, TIP, PD, c);
    }
  };

  // ---- bays between consecutive posts
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i], b = posts[i + 1];
    const left = a.x + a.hw, right = b.x - b.hw;
    if (a.gate && b.gate) {
      // threshold step, flush inside the kerb's depth
      box(left, 0, KZ0 + 0.02, right - left, FOOT + 0.03, KD - 0.04, slab);
      // gate leaf in the accent colour: frame, brace and an arched picket top
      const lL = left + 0.04, lR = right - 0.04;
      const g0 = 0.15, gHi = H - 0.34, gTop = gHi + RH;
      box(lL, g0, ZC, lR - lL, RH, 0.05, p.accent);
      box(lL, gHi, ZC, lR - lL, RH, 0.05, p.accent);
      box(lL, g0, ZC, 0.07, gTop - g0, 0.05, p.accent);
      box(lR - 0.07, g0, ZC, 0.07, gTop - g0, 0.05, p.accent);
      box(lL + 0.07, (g0 + gHi) / 2, ZC, lR - lL - 0.14, RH, 0.05, p.accent);
      const gateTop = p.style === "flat"
        ? (t) => H + 0.04 + 0.1 * Math.sin(Math.PI * t)
        : (t) => H + 0.1 * Math.sin(Math.PI * t);
      pickets(lL + 0.05, lR - 0.05, g0, gateTop, p.accent, pointed);
      // hinges and latch on the street face of the gate pickets
      for (const hy of [g0 + 0.01, gHi + 0.01]) box(left + 0.01, hy, ZC - PD - 0.03, 0.15, 0.06, 0.03, metal);
      box(lR - 0.14, (g0 + gHi) / 2 + 0.01, ZC - PD - 0.04, 0.12, 0.06, 0.04, metal);
    } else {
      box(left, railLo, ZC, right - left, RH, 0.05, p.frame);
      box(left, railHi, ZC, right - left, RH, 0.05, p.frame);
      pickets(left, right, FOOT, fenceTop, paint, pointed);
      // flat style gets a continuous cap board that seats on the square picket tops
      if (p.style === "flat") box(left, H - 0.05, ZC - PD - 0.01, right - left, 0.06, PD + 0.07, p.frame);
    }
  }

  return { parts };
}
