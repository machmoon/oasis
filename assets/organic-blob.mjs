// Organic blob shapes. Geometry follows g-harel/blobs (internal/gen.ts): points on a circle,
// each pushed out by a seeded offset, then smoothed with the circle-approximating handle length.
export const meta = {
  title: "Organic Blob",
  kind: "shape",
  description: "Smooth, seeded blob shapes for backgrounds, image masks and playful UI accents.",
  tags: ["blob", "shape", "organic", "abstract", "mask", "decoration"],
  price: 0,
  author: "oasis",
  size: [600, 600],
};

export const params = {
  knobs: {
    fill: { type: "color", label: "Fill", default: "#2F6B4F" },
    fill2: { type: "color", label: "Gradient to", default: "#8FD3B6" },
    background: { type: "color", label: "Background", default: "#F5F1EA" },
    seed: { type: "range", label: "Seed", default: 12, min: 1, max: 200, step: 1 },
    points: { type: "range", label: "Complexity", default: 6, min: 3, max: 12, step: 1 },
    randomness: { type: "range", label: "Randomness", default: 8, min: 0, max: 40, step: 1 },
    style: { type: "choice", label: "Style", default: "gradient", options: ["solid", "gradient", "outline", "stack"] },
    transparent: { type: "toggle", label: "Transparent background", default: false },
  },
  presets: {
    Palm: { fill: "#2F6B4F", fill2: "#8FD3B6", background: "#F5F1EA" },
    Coral: { fill: "#FF6B6B", fill2: "#FFD93D", background: "#FFF8F0" },
    Night: { fill: "#7B61FF", fill2: "#00D1FF", background: "#0B0B14" },
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

function blobPath(cx, cy, size, n, randomness, r) {
  const angle = (Math.PI * 2) / n;
  const rangeStart = 1 / (1 + randomness / 10);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const off = (rangeStart + r() * (1 - rangeStart)) / 2;
    pts.push([cx + Math.sin(i * angle) * off * size, cy + Math.cos(i * angle) * off * size]);
  }
  const k = ((4 / 3) * Math.tan(angle / 4)) / Math.sin(angle / 2) / 2;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

export default function render(p) {
  const S = 600;
  const r = rng(p.seed * 7919);
  const bg = p.transparent ? "" : `<rect width="${S}" height="${S}" fill="${p.background}"/>`;
  const defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.fill}"/><stop offset="1" stop-color="${p.fill2}"/></linearGradient></defs>`;
  let body = "";
  if (p.style === "stack") {
    for (let i = 0; i < 3; i++) {
      const rr = rng(p.seed * 7919 + i * 31);
      body += `<path d="${blobPath(S / 2, S / 2, S * (0.92 - i * 0.2), p.points, p.randomness, rr)}" fill="${i % 2 ? p.fill2 : p.fill}" opacity="${(0.55 + i * 0.2).toFixed(2)}"/>`;
    }
  } else {
    const d = blobPath(S / 2, S / 2, S * 0.9, p.points, p.randomness, r);
    if (p.style === "outline") body = `<path d="${d}" fill="none" stroke="${p.fill}" stroke-width="10" stroke-linejoin="round"/>`;
    else body = `<path d="${d}" fill="${p.style === "gradient" ? "url(#g)" : p.fill}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">${defs}${bg}${body}</svg>`;
}
