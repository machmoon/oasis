// Layered mountain ranges with atmospheric perspective, a sun or crescent moon, drifting clouds and a flock of birds.
export const meta = {
  title: "Distant Ranges",
  kind: "illustration",
  description: "Layered mountain ranges fading into haze under a sun or moon, for desktop wallpapers, hero banners and calm editorial backdrops.",
  tags: ["mountains", "landscape", "wallpaper", "sunset", "atmospheric", "nature", "layers", "night"],
  price: 6,
  author: "oasis-factory",
  size: [1600, 900],
};

export const params = {
  knobs: {
    sky: { type: "color", role: "background", label: "Sky", default: "#2B2D5C" },
    horizon: { type: "color", role: "primary", label: "Horizon", default: "#F4A47C" },
    ridge: { type: "color", role: "ink", label: "Nearest ridge", default: "#1B1838" },
    light: { type: "color", role: "highlight", label: "Sun / moon", default: "#FFE3B0" },
    celestial: { type: "choice", label: "Sky body", default: "sun", options: ["sun", "moon", "none"] },
    extras: { type: "choice", label: "Details", default: "both", options: ["none", "birds", "clouds", "both"] },
    layers: { type: "range", label: "Ranges", default: 5, min: 3, max: 8, step: 1 },
    jaggedness: { type: "range", label: "Jaggedness", default: 55, min: 0, max: 100, step: 1 },
    sunPos: { type: "range", label: "Sun position", default: 76, min: 0, max: 100, step: 1 },
    seed: { type: "range", label: "Seed", default: 42, min: 1, max: 999, step: 1 },
  },
  presets: {
    Dusk: { sky: "#2B2D5C", horizon: "#F4A47C", ridge: "#1B1838", light: "#FFE3B0" },
    Dawn: { sky: "#8DB8E0", horizon: "#FCE1D0", ridge: "#3B4566", light: "#FFF3D6" },
    Night: { sky: "#070B1F", horizon: "#2E3C6E", ridge: "#05070F", light: "#E6ECFF" },
    Alpine: { sky: "#3F86C2", horizon: "#D8ECF4", ridge: "#1E3638", light: "#FFFFFF" },
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

function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

function makeNoise(r) {
  const L = [];
  for (let i = 0; i < 256; i++) L.push(r());
  return (u) => {
    const i = Math.floor(u), f = u - i, s = f * f * (3 - 2 * f);
    const a = L[i & 255], b = L[(i + 1) & 255];
    return a + (b - a) * s;
  };
}

const f1 = (v) => v.toFixed(1);

export default function render(p) {
  const W = 1600, H = 900;
  const n = p.layers, j = p.jaggedness / 100, seed = p.seed;
  const haze = mix(p.horizon, p.sky, 0.3);
  const hasBody = p.celestial !== "none";
  const st = p.sunPos / 100;
  const sx = W * (0.1 + 0.8 * st);
  const sy = H * (0.66 - 0.5 * Math.sin(Math.PI * st));

  let defs = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${p.sky}"/>` +
    `<stop offset="0.42" stop-color="${mix(p.sky, p.horizon, 0.45)}"/>` +
    `<stop offset="0.74" stop-color="${p.horizon}"/>` +
    `<stop offset="1" stop-color="${p.horizon}"/></linearGradient>` +
    `<radialGradient id="glow"><stop offset="0" stop-color="${p.light}" stop-opacity="${p.celestial === "moon" ? 0.32 : 0.55}"/>` +
    `<stop offset="0.3" stop-color="${p.light}" stop-opacity="0.16"/><stop offset="1" stop-color="${p.light}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="band"><stop offset="0" stop-color="${p.light}" stop-opacity="0.3"/><stop offset="1" stop-color="${p.light}" stop-opacity="0"/></radialGradient>` +
    `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${seed}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>`;

  let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;

  if (p.celestial === "moon") {
    const r = rng(seed * 131 + 7);
    let stars = "";
    for (let i = 0; i < 110; i++) {
      const x = r() * W, y = Math.pow(r(), 1.4) * H * 0.58;
      const o = Math.max(0, 1 - y / (H * 0.6)) * (0.35 + r() * 0.6);
      stars += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${(0.6 + r() * r() * 1.4).toFixed(2)}" fill="${p.light}" opacity="${o.toFixed(2)}"/>`;
    }
    body += stars;
  }

  if (hasBody) {
    body += `<ellipse cx="${f1(sx)}" cy="${f1(H * 0.56)}" rx="${W * 0.62}" ry="${H * 0.26}" fill="url(#band)"/>`;
    body += `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="${H * 0.62}" fill="url(#glow)"/>`;
    if (p.celestial === "sun") {
      const R = H * 0.062;
      body += `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="${f1(R * 1.7)}" fill="${p.light}" opacity="0.18"/>`;
      body += `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="${f1(R)}" fill="${p.light}"/>`;
    } else {
      const R = H * 0.046;
      defs += `<mask id="cres"><circle cx="${f1(sx)}" cy="${f1(sy)}" r="${f1(R)}" fill="#fff"/>` +
        `<circle cx="${f1(sx + R * 0.42)}" cy="${f1(sy - R * 0.22)}" r="${f1(R * 0.92)}" fill="#000"/></mask>`;
      body += `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="${f1(R * 1.9)}" fill="${p.light}" opacity="0.08"/>`;
      body += `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="${f1(R)}" fill="${p.light}" opacity="0.12"/>`;
      body += `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="${f1(R)}" fill="${p.light}" mask="url(#cres)"/>`;
    }
  }

  if (p.extras === "clouds" || p.extras === "both") {
    const r = rng(seed * 977 + 3);
    const count = 3 + Math.floor(r() * 3);
    const cc = mix(mix(p.horizon, p.light, 0.45), "#FFFFFF", p.celestial === "moon" ? 0 : 0.12);
    for (let i = 0; i < count; i++) {
      const cx = W * (i + 0.2 + r() * 0.6) / count;
      const cy = H * (0.1 + r() * 0.28);
      const w = 170 + r() * 260, h = 11 + r() * 9;
      const o = (0.28 + 0.4 * (1 - cy / (H * 0.4)) * r() + 0.2).toFixed(2);
      const sh = (r() - 0.5) * w * 0.2;
      body += `<g fill="${cc}" opacity="${o}">` +
        `<rect x="${f1(cx - w / 2)}" y="${f1(cy)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}"/>` +
        `<rect x="${f1(cx - w * 0.3 + sh)}" y="${f1(cy - h * 0.72)}" width="${f1(w * 0.52)}" height="${f1(h)}" rx="${f1(h / 2)}"/>` +
        `<rect x="${f1(cx - w * 0.05 + sh)}" y="${f1(cy - h * 1.44)}" width="${f1(w * 0.24)}" height="${f1(h)}" rx="${f1(h / 2)}"/>` +
        `<rect x="${f1(cx - w * 0.12 - sh)}" y="${f1(cy + h * 0.72)}" width="${f1(w * 0.58)}" height="${f1(h)}" rx="${f1(h / 2)}"/></g>`;
    }
  }

  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const r = rng(seed * 7919 + i * 1013);
    const nz = makeNoise(r);
    const base = H * (0.5 + 0.34 * t);
    const amp = H * (0.1 + 0.17 * t);
    const freq = 2.2 + 3.2 * (1 - t);
    const pers = 0.36 + 0.22 * j;
    const off = r() * 100;
    let d = `M-10,${H}`, minY = H;
    for (let x = -10; x <= W + 10; x += 6) {
      const u = (x / W) * freq + off;
      let s = 0, a = 1, fq = 1, norm = 0;
      for (let o = 0; o < 6; o++) {
        const nv = nz(u * fq + o * 17.3);
        const rv = 1 - Math.abs(2 * nv - 1);
        s += a * (nv + (rv - nv) * j);
        norm += a; a *= pers; fq *= 2.03;
      }
      let v = (s / norm - 0.5) * 1.9 + 0.55;
      v = Math.max(0, Math.min(1.15, v));
      const env = 0.55 + 0.45 * nz(u * 0.3 + 50);
      const y = base - amp * v * env;
      if (y < minY) minY = y;
      d += ` L${f1(x)},${f1(y)}`;
    }
    d += ` L${W + 10},${H} Z`;
    let c = mix(haze, p.ridge, 0.2 + 0.8 * Math.pow(t, 1.35));
    if (hasBody) c = mix(c, p.light, 0.12 * (1 - t));
    const mist = mix(c, haze, 0.5 * (1 - t) + 0.12);
    defs += `<linearGradient id="l${i}" gradientUnits="userSpaceOnUse" x1="0" y1="${f1(minY)}" x2="0" y2="${f1(base + H * 0.06)}">` +
      `<stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${mist}"/></linearGradient>`;
    body += `<path d="${d}" fill="url(#l${i})"/>`;
  }

  if (p.extras === "birds" || p.extras === "both") {
    const r = rng(seed * 4271 + 11);
    const count = 5 + Math.floor(r() * 4);
    const fx = sx > W / 2 ? W * (0.16 + r() * 0.16) : W * (0.62 + r() * 0.16);
    const fy = H * (0.18 + r() * 0.13);
    const bc = mix(p.ridge, p.sky, 0.15);
    let birds = "";
    for (let i = 0; i < count; i++) {
      const x = fx + (r() - 0.5) * 230, y = fy + (r() - 0.5) * 90;
      const s = 6 + r() * 8, dip = s * (0.3 + r() * 0.45);
      birds += `<path d="M${f1(x - s)},${f1(y - dip)} Q${f1(x - s * 0.45)},${f1(y - dip * 1.4)} ${f1(x)},${f1(y)} Q${f1(x + s * 0.45)},${f1(y - dip * 1.4)} ${f1(x + s)},${f1(y - dip)}" stroke-width="${(1 + s * 0.16).toFixed(2)}"/>`;
    }
    body += `<g fill="none" stroke="${bc}" stroke-linecap="round" stroke-linejoin="round" opacity="0.85">${birds}</g>`;
  }

  body += `<rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.06"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs>${body}</svg>`;
}
