// Op-art interference rings: overlapping sets of offset concentric rings that XOR into moiré and checkerboard fringes.
export const meta = {
  title: "Interference Rings",
  kind: "pattern",
  description: "Op-art concentric rings with offset centres that produce moiré interference, for posters, album art, covers and bold backgrounds.",
  tags: ["op-art", "moire", "concentric", "rings", "generative", "geometric", "interference", "abstract"],
  price: 3,
  author: "oasis-factory",
  size: [800, 800],
};

export const params = {
  knobs: {
    ink: { type: "color", label: "Ink", default: "#141414" },
    paper: { type: "color", label: "Paper", default: "#F2EEE6" },
    composition: { type: "choice", label: "Composition", default: "pair", options: ["pair", "triad", "nested", "scatter"] },
    frame: { type: "choice", label: "Frame", default: "disc", options: ["bleed", "disc", "tile"] },
    rings: { type: "range", label: "Ring count", default: 22, min: 6, max: 60, step: 1 },
    offset: { type: "range", label: "Offset", default: 18, min: 0, max: 100, step: 1 },
    stroke: { type: "range", label: "Stroke weight (% of pitch)", default: 50, min: 8, max: 92, step: 1 },
    rotation: { type: "range", label: "Rotation", default: 30, min: 0, max: 359, step: 1 },
    seed: { type: "range", label: "Seed", default: 7, min: 1, max: 200, step: 1 },
    filled: { type: "toggle", label: "Filled alternating", default: true },
  },
  presets: {
    Mono: { ink: "#141414", paper: "#F2EEE6" },
    Riley: { ink: "#1B2A6B", paper: "#F4E9D8" },
    Signal: { ink: "#FF4A1C", paper: "#121212" },
    Mint: { ink: "#0E3B34", paper: "#BFF0D4" },
  },
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const S = 800, C = 400, RB = 340;
const f = (n) => n.toFixed(2);

function circlePath(cx, cy, r) {
  return `M${f(cx - r)},${f(cy)}a${f(r)},${f(r)} 0 1,0 ${f(2 * r)},0a${f(r)},${f(r)} 0 1,0 ${f(-2 * r)},0`;
}

function buildSets(p, s, r) {
  const d = (p.offset / 100) * RB * 0.5;
  const rot = (p.rotation * Math.PI) / 180;
  const jit = () => (r() - 0.5) * 0.2 * d;
  const sets = [];
  const add = (x, y, sp) => sets.push({ x, y, sp, ph: 0.2 + r() * 0.8 });
  if (p.composition === "pair") {
    for (const i of [-1, 1]) add(C + Math.cos(rot) * d * i + jit(), C + Math.sin(rot) * d * i + jit(), s);
  } else if (p.composition === "triad") {
    for (let i = 0; i < 3; i++) {
      const a = rot + (i * Math.PI * 2) / 3 - Math.PI / 2;
      add(C + Math.cos(a) * d + jit(), C + Math.sin(a) * d + jit(), s);
    }
  } else if (p.composition === "nested") {
    add(C, C, s);
    add(C + Math.cos(rot) * d + jit(), C + Math.sin(rot) * d + jit(), s * 1.07);
  } else {
    for (let i = 0; i < 3; i++) {
      const a = rot + r() * Math.PI * 2;
      const dist = d * (0.35 + 0.65 * r());
      add(C + Math.cos(a) * dist, C + Math.sin(a) * dist, s * (0.95 + r() * 0.1));
    }
  }
  return sets;
}

function reachFor(st, frame) {
  const fromC = Math.hypot(st.x - C, st.y - C);
  if (frame === "disc") return fromC + RB;
  if (frame === "tile") return fromC + RB * 1.42;
  return Math.max(
    Math.hypot(st.x, st.y), Math.hypot(S - st.x, st.y),
    Math.hypot(st.x, S - st.y), Math.hypot(S - st.x, S - st.y)
  );
}

function ringsPath(sets, weight, frame, annuli) {
  let d = "";
  for (const st of sets) {
    const w = Math.max(0.5, st.sp * weight);
    const reach = reachFor(st, frame) + st.sp + w;
    for (let k = 0; ; k++) {
      const rr = st.sp * (k + st.ph);
      if (rr - w / 2 > reach) break;
      if (annuli) {
        const ro = rr + w / 2, ri = rr - w / 2;
        d += circlePath(st.x, st.y, ro);
        if (ri > 0.3) d += circlePath(st.x, st.y, ri);
      } else if (rr > 0.6) {
        d += circlePath(st.x, st.y, rr);
      }
    }
  }
  return d;
}

export default function render(p) {
  const rings = Math.max(6, Math.min(60, Math.round(p.rings)));
  const s = RB / rings;
  const weight = Math.max(0.08, Math.min(0.92, p.stroke / 100));
  const r = rng(p.seed * 7919 + 13);
  const sets = buildSets(p, s, r);
  const d = ringsPath(sets, weight, p.frame, p.filled);

  let clipDef = "", clipAttr = "", outline = "";
  if (p.frame === "disc") {
    clipDef = `<clipPath id="fr"><circle cx="${C}" cy="${C}" r="${RB}"/></clipPath>`;
    outline = `<circle cx="${C}" cy="${C}" r="${RB}" fill="none" stroke="${p.ink}" stroke-width="1.5"/>`;
  } else if (p.frame === "tile") {
    const m = C - RB;
    clipDef = `<clipPath id="fr"><rect x="${m}" y="${m}" width="${RB * 2}" height="${RB * 2}" rx="56"/></clipPath>`;
    outline = `<rect x="${m}" y="${m}" width="${RB * 2}" height="${RB * 2}" rx="56" fill="none" stroke="${p.ink}" stroke-width="1.5"/>`;
  }
  if (clipDef) clipAttr = ` clip-path="url(#fr)"`;

  const art = p.filled
    ? `<path d="${d}" fill="${p.ink}" fill-rule="evenodd"/>`
    : `<path d="${d}" fill="none" stroke="${p.ink}" stroke-width="${f(Math.max(0.5, s * weight))}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">` +
    `<defs>${clipDef}</defs>` +
    `<rect width="${S}" height="${S}" fill="${p.paper}"/>` +
    `<g${clipAttr}>${art}</g>${outline}</svg>`;
}
