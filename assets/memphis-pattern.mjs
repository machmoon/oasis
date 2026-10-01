// Memphis confetti: seeded squiggles, zigzags, triangles, rings and dots, packed by size-aware toroidal dart-throwing so the tile repeats seamlessly.
export const meta = {
  title: "Memphis Confetti",
  kind: "pattern",
  description: "Playful, seamlessly tiling Memphis-style confetti of squiggles, zigzags, triangles and dots for packaging, social posts, event branding and backgrounds.",
  tags: ["memphis", "confetti", "pattern", "seamless", "geometric", "80s", "playful", "squiggle"],
  price: 4,
  author: "oasis-factory",
  size: [800, 800],
};

export const params = {
  knobs: {
    background: { type: "color", label: "Background", default: "#F6EFE3" },
    color1: { type: "color", label: "Colour 1", default: "#FF5A5F" },
    color2: { type: "color", label: "Colour 2", default: "#2EC4B6" },
    color3: { type: "color", label: "Colour 3", default: "#FFC93C" },
    color4: { type: "color", label: "Colour 4", default: "#1D1D3F" },
    style: { type: "choice", label: "Fill style", default: "mixed", options: ["mixed", "solid", "outline", "shadowed"] },
    density: { type: "range", label: "Density", default: 5, min: 1, max: 10, step: 1 },
    size: { type: "range", label: "Shape size", default: 1, min: 0.5, max: 2, step: 0.05 },
    stroke: { type: "range", label: "Stroke", default: 6, min: 2, max: 14, step: 0.5 },
    seed: { type: "range", label: "Seed", default: 42, min: 1, max: 999, step: 1 },
  },
  presets: {
    Milano: { background: "#F6EFE3", color1: "#FF5A5F", color2: "#2EC4B6", color3: "#FFC93C", color4: "#1D1D3F" },
    Miami: { background: "#1B1B2F", color1: "#FF4F9A", color2: "#3DE0F5", color3: "#FFE45C", color4: "#9B5DE5" },
    Sorbet: { background: "#FFF7F2", color1: "#F497AE", color2: "#8FD3E3", color3: "#FCD96A", color4: "#A99AE6" },
    Bauhaus: { background: "#F2E8D5", color1: "#D7263D", color2: "#1B4DE4", color3: "#F4C430", color4: "#141414" },
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

const f = (n) => +n.toFixed(1);

function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
function lum(c) {
  const [r, g, b] = hex(c);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
function shuffle(a, r) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const TYPES = [
  ["squiggle", 3], ["zigzag", 2], ["triangle", 3], ["ring", 3], ["half", 2],
  ["dot", 3], ["dotgrid", 1], ["plus", 2], ["dashes", 1],
];
const HERO = ["squiggle", "zigzag", "triangle", "ring", "half"];

function dims(type, R, sw) {
  const dotR = Math.max(sw * 0.45, 2.5);
  const grid = Math.max(R * 0.42, dotR * 2.8);
  const dash = Math.max(R * 0.38, sw * 1.8);
  let e;
  if (type === "squiggle") e = R * 1.15;
  else if (type === "zigzag") e = R * 1.1;
  else if (type === "triangle") e = R * 0.97;
  else if (type === "ring") e = R * 0.6;
  else if (type === "half") e = R * 0.82;
  else if (type === "dot") e = Math.max(R * 0.26, sw * 0.9) - sw / 2;
  else if (type === "dotgrid") e = grid * 1.414 + dotR - sw / 2;
  else if (type === "plus") e = R * 0.55;
  else e = Math.hypot(R * 0.55, dash);
  return { e: e + sw / 2, dotR, grid, dash };
}

function shape(type, R, col, solid, sw) {
  const D = dims(type, R, sw);
  const st = `fill="none" stroke="${col}" stroke-width="${f(sw)}" stroke-linecap="round" stroke-linejoin="round"`;
  const fl = `fill="${col}"`;
  if (type === "squiggle") {
    const L = R * 1.15, n = 4, w = (2 * L) / n, a = R * 0.32;
    let d = `M${f(-L)},0 Q${f(-L + w / 2)},${f(-a * 2)} ${f(-L + w)},0`;
    for (let i = 2; i <= n; i++) d += ` T${f(-L + w * i)},0`;
    return `<path d="${d}" ${st}/>`;
  }
  if (type === "zigzag") {
    const L = R * 1.1, n = 6, a = R * 0.28, pts = [];
    for (let i = 0; i <= n; i++) pts.push(`${f(-L + (2 * L * i) / n)},${f(i % 2 ? -a : a)}`);
    return `<polyline points="${pts.join(" ")}" ${st}/>`;
  }
  if (type === "triangle") {
    const r = R * 0.85;
    const pts = [-90, 30, 150].map((d) => `${f(Math.cos((d * Math.PI) / 180) * r)},${f(Math.sin((d * Math.PI) / 180) * r + r * 0.12)}`).join(" ");
    return `<polygon points="${pts}" ${solid ? fl + ` stroke="${col}" stroke-width="${f(sw * 0.6)}" stroke-linejoin="round"` : st}/>`;
  }
  if (type === "ring") return `<circle r="${f(R * 0.6)}" ${solid ? fl : st}/>`;
  if (type === "half") {
    const r = R * 0.75, h = r * 0.42;
    return `<path d="M${f(-r)},${f(h)} A${f(r)},${f(r)} 0 0 1 ${f(r)},${f(h)} Z" ${solid ? fl : st}/>`;
  }
  if (type === "dot") return `<circle r="${f(Math.max(R * 0.26, sw * 0.9))}" ${fl}/>`;
  if (type === "dotgrid") {
    let s = "";
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) s += `<circle cx="${f(i * D.grid)}" cy="${f(j * D.grid)}" r="${f(D.dotR)}"/>`;
    return `<g ${fl}>${s}</g>`;
  }
  if (type === "plus") {
    const L = R * 0.55;
    return `<path d="M${f(-L)},0 H${f(L)} M0,${f(-L)} V${f(L)}" ${st}/>`;
  }
  const L = R * 0.55, g = D.dash;
  return `<path d="M${f(-L)},${f(-g)} H${f(L)} M${f(-L)},0 H${f(L)} M${f(-L)},${f(g)} H${f(L)}" ${st}/>`;
}

export default function render(p) {
  const S = 800;
  const r = rng(p.seed * 2654435761);
  const cols = [p.color1, p.color2, p.color3, p.color4];
  const sw = p.stroke;
  const R = 20 * p.size + sw * 1.4;
  const count = 12 + p.density * 10;
  const gap = 8 + sw * 0.8 + (10 - p.density) * 5.5;

  const deck = [];
  for (const [t, w] of TYPES) for (let i = 0; i < w; i++) deck.push(t);
  const items = [];
  for (let i = 0; i < count; i++) {
    if (i % deck.length === 0) shuffle(deck, r);
    const type = deck[i % deck.length];
    const scale = HERO.includes(type) && r() < 0.16 ? 1.3 + r() * 0.16 : 0.72 + r() * 0.4;
    const Rs = R * scale, w = Math.min(sw, Rs * 0.34);
    items.push({ type, Rs, w, e: dims(type, Rs, w).e });
  }
  items.sort((a, b) => b.e - a.e);

  const td2 = (a, b) => {
    let dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
    dx = Math.min(dx, S - dx); dy = Math.min(dy, S - dy);
    return dx * dx + dy * dy;
  };
  const placed = [];
  for (const it of items) {
    for (let k = 0; k < 70; k++) {
      const c = { ...it, x: r() * S, y: r() * S };
      if (placed.every((q) => td2(c, q) >= (c.e + q.e + gap) ** 2)) { placed.push(c); break; }
    }
  }

  const used = [0, 0, 0, 0];
  placed.forEach((it, idx) => {
    const near = new Set();
    for (let j = 0; j < idx; j++) {
      const q = placed[j], lim = it.e + q.e + gap * 2;
      if (td2(it, q) < lim * lim) near.add(q.ci);
    }
    const order = shuffle([0, 1, 2, 3], r);
    let best = -1;
    for (const c of order) if (!near.has(c) && (best < 0 || used[c] < used[best])) best = c;
    if (best < 0) for (const c of order) if (best < 0 || used[c] < used[best]) best = c;
    it.ci = best; used[best]++;
  });

  const shadowCol = lum(p.background) > 0.4 ? mix(p.background, "#141414", 0.85) : mix(p.background, "#000000", 0.6);
  const off = f(sw * 0.7 + 3);
  const shadowed = p.style === "shadowed";

  let body = "";
  for (const it of placed) {
    const { type, Rs, w, x, y } = it;
    const rot = type === "dot" || type === "ring" ? 0 : f(r() * 360);
    const solid = p.style === "solid" ? true : p.style === "outline" ? false : r() < 0.5;
    const main = shape(type, Rs, cols[it.ci], solid, w);
    const shade = shadowed ? shape(type, Rs, shadowCol, solid, w) : "";
    const m = it.e + 2 + (shadowed ? off : 0);
    for (const ox of [-S, 0, S]) {
      for (const oy of [-S, 0, S]) {
        const X = x + ox, Y = y + oy;
        if (X < -m || X > S + m || Y < -m || Y > S + m) continue;
        if (shadowed) body += `<g transform="translate(${f(X + off)},${f(Y + off)}) rotate(${rot})">${shade}</g>`;
        body += `<g transform="translate(${f(X)},${f(Y)}) rotate(${rot})">${main}</g>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><defs><clipPath id="tile"><rect width="${S}" height="${S}"/></clipPath></defs><rect width="${S}" height="${S}" fill="${p.background}"/><g clip-path="url(#tile)">${body}</g></svg>`;
}
