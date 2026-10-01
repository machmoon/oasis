// Flat potted houseplant: monstera, snake plant or fern with seeded leaf placement, four pot shapes and a soft wall shadow.
export const meta = {
  title: "Potted Greenery",
  kind: "illustration",
  description: "A flat, two-tone potted houseplant (monstera, snake plant or fern) for interiors, wellness brands, empty states and editorial spots.",
  tags: ["plant", "houseplant", "monstera", "fern", "snake plant", "botanical", "flat", "interior"],
  price: 5,
  author: "oasis-factory",
  size: [600, 750],
};

export const params = {
  knobs: {
    leaf: { type: "color", label: "Leaf", default: "#2E6B4A" },
    leafLight: { type: "color", label: "Leaf highlight", default: "#7DBE8C" },
    pot: { type: "color", label: "Pot", default: "#D97B54" },
    background: { type: "color", label: "Background", default: "#F4EEE4" },
    plant: { type: "choice", label: "Plant", default: "monstera", options: ["monstera", "snake plant", "fern"] },
    potShape: { type: "choice", label: "Pot shape", default: "tapered", options: ["tapered", "belly", "cylinder", "bowl"] },
    leaves: { type: "range", label: "Leaf count", default: 7, min: 3, max: 12, step: 1 },
    height: { type: "range", label: "Plant height", default: 100, min: 70, max: 130, step: 5 },
    seed: { type: "range", label: "Seed", default: 17, min: 1, max: 100, step: 1 },
    shadow: { type: "toggle", label: "Shadow", default: true },
  },
  presets: {
    Terracotta: { leaf: "#2E6B4A", leafLight: "#7DBE8C", pot: "#D97B54", background: "#F4EEE4" },
    Nordic: { leaf: "#3F5E4E", leafLight: "#A9C8B0", pot: "#ECE7DE", background: "#D9E1E4" },
    Midnight: { leaf: "#1F7A5A", leafLight: "#6FE0A8", pot: "#F2B84B", background: "#16212B" },
    Blush: { leaf: "#4C7A3D", leafLight: "#B8D98A", pot: "#F09E97", background: "#FBEDE8" },
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

const hx = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) || 0);
function mix(a, b, t) {
  const A = hx(a), B = hx(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
const lum = (c) => { const [r, g, b] = hx(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const f = (v) => (+v).toFixed(1);
const DEG = 180 / Math.PI;

function rr(x, y, w, h, q) {
  return `M${x + q},${y} H${x + w - q} Q${x + w},${y} ${x + w},${y + q} V${y + h - q} Q${x + w},${y + h} ${x + w - q},${y + h} H${x + q} Q${x},${y + h} ${x},${y + h - q} V${y + q} Q${x},${y} ${x + q},${y}Z`;
}

const POTS = {
  tapered: { rim: rr(175, 466, 250, 36, 8), body: "M188,502 H412 L389,628 Q387,640 375,640 H225 Q213,640 211,628Z", soil: [470, 116], by: 472, open: 110, rimB: 502, shade: 342 },
  belly: { rim: rr(208, 472, 184, 22, 9), body: "M218,494 C150,520 142,604 204,632 Q218,640 236,640 H364 Q382,640 396,632 C458,604 450,520 382,494Z", soil: [474, 84], by: 476, open: 80, rimB: 494, shade: 345 },
  cylinder: { rim: rr(190, 474, 220, 16, 8), body: rr(198, 490, 204, 150, 14), soil: [476, 100], by: 478, open: 96, rimB: 490, shade: 340, band: [592, 10] },
  bowl: { rim: rr(158, 534, 284, 22, 11), body: "M168,556 C172,612 232,626 300,626 C368,626 428,612 432,556Z", foot: rr(254, 618, 92, 22, 5), soil: [536, 134], by: 538, open: 130, rimB: 556, shade: 350 },
};

function spreadItems(n, r, make) {
  const it = [];
  for (let i = 0; i < n; i++) it.push(make(n === 1 ? 0 : (i / (n - 1)) * 2 - 1));
  return it.sort((a, b) => a.d - b.d);
}

function monstera(n, H, bx, by, open, r, C, B) {
  let defs = "", stems = "", lv = "";
  const it = spreadItems(n, r, (u) => ({ u, a: u * 0.95 + (r() - 0.5) * 0.24, len: 180 * H * (0.55 + 0.47 * (1 - Math.abs(u))) * (0.76 + r() * 0.38), L: (120 - n * 2.6) * (0.82 + r() * 0.3), dr: r(), tw: r(), d: r() }));
  it.forEach((q, i) => {
    const t = n === 1 ? 1 : i / (n - 1), fill = mix(C.leaf, C.leafLight, t * 0.7), L = q.L;
    const ra = q.a * 1.2 + Math.sign(q.u) * (0.32 * Math.abs(q.u) + q.dr * 0.22) + (q.tw - 0.5) * 0.3;
    const sx = bx + q.u * open * 0.2, sy = by + 30;
    const ax = sx + Math.sin(q.a) * q.len, ay = by - Math.cos(q.a) * q.len;
    const cx = sx + Math.sin(q.a) * q.len * 0.25, cy = by - q.len * 0.82;
    stems += `<path d="M${f(sx)},${f(sy)} Q${f(cx)},${f(cy)} ${f(ax)},${f(ay)}" fill="none" stroke="${mix(C.leaf, C.leafLight, 0.3 + t * 0.3)}" stroke-width="5" stroke-linecap="round"/>`;
    const lp = `M0,${f(-L * 0.07)} C${f(-L * 0.22)},${f(L * 0.1)} ${f(-L * 0.56)},0 ${f(-L * 0.52)},${f(-L * 0.38)} C${f(-L * 0.48)},${f(-L * 0.76)} ${f(-L * 0.16)},${f(-L * 0.97)} 0,${f(-L)} C${f(L * 0.16)},${f(-L * 0.97)} ${f(L * 0.48)},${f(-L * 0.76)} ${f(L * 0.52)},${f(-L * 0.38)} C${f(L * 0.56)},0 ${f(L * 0.22)},${f(L * 0.1)} 0,${f(-L * 0.07)}Z`;
    let sl = "";
    for (let k = 1; k <= 3; k++) {
      const y = -L * (0.2 + 0.2 * k) + (r() - 0.5) * L * 0.05;
      for (const s of [-1, 1]) sl += `<path d="M${f(s * L * 0.1)},${f(y)} Q${f(s * L * 0.35)},${f(y - L * 0.04)} ${f(s * L * 0.62)},${f(y - L * 0.16)}"/>`;
    }
    defs += `<mask id="mm${i}"><path d="${lp}" fill="#fff"/><g fill="none" stroke="#000" stroke-width="${f(L * 0.055)}" stroke-linecap="round">${sl}</g></mask>`;
    lv += `<g transform="translate(${f(ax)} ${f(ay)}) rotate(${f(ra * DEG)})"><g mask="url(#mm${i})"><path d="${lp}" fill="${fill}"/><path d="M0,${f(-L * 0.05)} L0,${f(-L * 0.86)}" stroke="${mix(fill, "#FFFFFF", 0.22)}" stroke-width="${f(L * 0.022)}" stroke-linecap="round"/></g></g>`;
    B(ax + Math.sin(ra) * L * 0.5, ay - Math.cos(ra) * L * 0.5, L * 0.62);
  });
  return { defs, svg: stems + lv };
}

function snake(n, H, bx, by, open, r, C, B) {
  let defs = "", svg = "";
  const it = spreadItems(n, r, (u) => ({ u, lean: u * 0.36 + (r() - 0.5) * 0.1, h: 235 * H * (0.6 + 0.42 * (1 - Math.abs(u))) * (0.85 + r() * 0.25), w: 38 * (0.85 + r() * 0.3), ox: u * open * 0.55 + (r() - 0.5) * 10, d: r() }));
  it.forEach((q, i) => {
    const t = n === 1 ? 1 : i / (n - 1), fill = mix(C.leaf, C.leafLight, t * 0.3), h = q.h, w = q.w;
    const d = `M${f(-w / 2)},0 C${f(-w * 0.66)},${f(-h * 0.38)} ${f(-w * 0.48)},${f(-h * 0.72)} 0,${f(-h)} C${f(w * 0.48)},${f(-h * 0.72)} ${f(w * 0.66)},${f(-h * 0.38)} ${f(w / 2)},0Z`;
    let bd = "";
    for (let y = -12; y > -h * 0.92; y -= 16 + r() * 10) {
      const amp = 3 + r() * 3;
      bd += `M${f(-w)},${f(y)}`;
      for (let j = 1; j <= 8; j++) bd += ` L${f(-w + (j * w) / 4)},${f(y + (j % 2 ? -amp : amp))}`;
    }
    defs += `<clipPath id="sc${i}"><path d="${d}"/></clipPath>`;
    svg += `<g transform="translate(${f(bx + q.ox)} ${f(by + 22)}) rotate(${f(q.lean * DEG)})"><g clip-path="url(#sc${i})"><path d="${d}" fill="${fill}"/><path d="${bd}" fill="none" stroke="${mix(fill, C.leafLight, 0.45)}" stroke-width="3.5" stroke-linejoin="round" opacity="0.85"/><path d="${d}" fill="none" stroke="${C.leafLight}" stroke-width="5"/></g></g>`;
    B(bx + q.ox + Math.sin(q.lean) * h, by + 22 - Math.cos(q.lean) * h, 8);
  });
  return { defs, svg };
}

function fern(n, H, bx, by, open, r, C, B) {
  let svg = "";
  const it = spreadItems(n, r, (u) => ({ u, a: u + (r() - 0.5) * 0.2, len: 205 * H * (0.68 + 0.36 * (1 - Math.abs(u))) * (0.85 + r() * 0.22), Lm: 30 * (0.85 + r() * 0.3), d: r() }));
  it.forEach((q, i) => {
    const t = n === 1 ? 1 : i / (n - 1), fill = mix(C.leaf, C.leafLight, t * 0.65), ta = q.a * 1.3;
    const x0 = bx + q.u * open * 0.25, y0 = by + 18;
    const x2 = x0 + Math.sin(ta) * q.len, y2 = y0 - Math.cos(ta) * q.len + q.len * 0.2 * Math.abs(Math.sin(q.a));
    const x1 = x0 + Math.sin(q.a * 0.5) * q.len * 0.5, y1 = y0 - Math.cos(q.a * 0.5) * q.len * 0.95;
    let lf = "";
    const m = 20;
    for (let j = 2; j <= m; j++) {
      const s = j / m, k = 1 - s;
      const x = k * k * x0 + 2 * k * s * x1 + s * s * x2, y = k * k * y0 + 2 * k * s * y1 + s * s * y2;
      const th = Math.atan2(2 * k * (y1 - y0) + 2 * s * (y2 - y1), 2 * k * (x1 - x0) + 2 * s * (x2 - x1)) * DEG;
      const l = q.Lm * Math.pow(k, 0.55) * Math.min(1, s * 3.2) + 3;
      for (const sg of [-1, 1]) lf += `<path transform="translate(${f(x)} ${f(y)}) rotate(${f(th + sg * 55)})" d="M0,0 Q${f(l * 0.5)},${f(-l * 0.3)} ${f(l)},0 Q${f(l * 0.5)},${f(l * 0.3)} 0,0Z"/>`;
    }
    svg += `<g fill="${fill}">${lf}</g><path d="M${f(x0)},${f(y0)} Q${f(x1)},${f(y1)} ${f(x2)},${f(y2)}" fill="none" stroke="${mix(fill, "#000000", 0.18)}" stroke-width="2.5" stroke-linecap="round"/>`;
    B(x2, y2, 8);
    B(0.25 * x0 + 0.5 * x1 + 0.25 * x2, 0.25 * y0 + 0.5 * y1 + 0.25 * y2, q.Lm + 5);
  });
  return { defs: "", svg };
}

function potSvg(s, pot) {
  const light = mix(pot, "#FFFFFF", 0.16), dark = mix(pot, "#000000", 0.22), soil = mix(pot, "#2A1D16", 0.78);
  const defs = `<clipPath id="pb"><path d="${s.body}"/></clipPath><clipPath id="pa"><path d="${s.body}"/><path d="${s.rim}"/></clipPath>`;
  let g = `<ellipse cx="300" cy="${s.soil[0]}" rx="${s.soil[1]}" ry="8" fill="${soil}"/>`;
  if (s.foot) g += `<path d="${s.foot}" fill="${dark}"/>`;
  g += `<path d="${s.body}" fill="${pot}"/><g clip-path="url(#pb)">`;
  if (s.band) g += `<rect x="150" y="${s.band[0]}" width="300" height="${s.band[1]}" fill="${dark}"/>`;
  g += `<rect x="150" y="${s.rimB}" width="300" height="9" fill="#000" opacity="0.12"/></g>`;
  g += `<path d="${s.rim}" fill="${light}"/>`;
  g += `<g clip-path="url(#pa)"><rect x="${s.shade}" y="440" width="160" height="210" fill="#000" opacity="0.1"/></g>`;
  return { defs, svg: g };
}

export default function render(p) {
  const W = 600, H = 750, bg = p.background;
  const C = { leaf: p.leaf, leafLight: p.leafLight };
  const r = rng(p.seed * 7919 + 13);
  const sh = POTS[p.potShape] || POTS.tapered;
  const bx = 300, by = sh.by, n = Math.max(1, Math.round(p.leaves)), hs = p.height / 100;
  const bb = { x0: bx, x1: bx, y0: by };
  const B = (x, y, rad) => { bb.x0 = Math.min(bb.x0, x - rad); bb.x1 = Math.max(bb.x1, x + rad); bb.y0 = Math.min(bb.y0, y - rad); };
  const fn = { monstera, "snake plant": snake, fern }[p.plant] || monstera;
  const pl = fn(n, hs, bx, by, sh.open, r, C, B);
  const sc = Math.min(1, 270 / Math.max(bx - bb.x0, bb.x1 - bx, 1), (by - 50) / Math.max(by - bb.y0, 1));
  const pt = potSvg(sh, p.pot);
  const scene = `<g transform="translate(${bx} ${by}) scale(${sc.toFixed(3)}) translate(${-bx} ${-by})">${pl.svg}</g>${pt.svg}`;
  const dark = lum(bg) < 0.4, sa = dark ? 0.26 : 0.085;
  const defs = `<defs>${pl.defs}${pt.defs}<clipPath id="wall"><rect width="${W}" height="640"/></clipPath><filter id="cast" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${sa} 0"/></filter></defs>`;
  let body = `<path d="M120,640 V320 A180,180 0 0 1 480,320 V640Z" fill="${mix(bg, p.pot, dark ? 0.12 : 0.2)}"/>`;
  body += `<path d="M70,640 H530" stroke="${mix(bg, dark ? "#FFFFFF" : "#000000", 0.14)}" stroke-width="2" stroke-linecap="round"/>`;
  if (p.shadow) {
    body += `<g clip-path="url(#wall)"><g filter="url(#cast)" transform="translate(24 -8)">${scene}</g></g>`;
    body += `<ellipse cx="312" cy="640" rx="168" ry="12" fill="${mix(bg, "#000000", dark ? 0.35 : 0.14)}"/>`;
  }
  body += scene;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}<rect width="${W}" height="${H}" fill="${bg}"/><g transform="translate(0 -2)">${body}</g></svg>`;
}
