// Floating 3D-feeling spheres, toruses and pills: lit tonal shading, soft contact shadows, depth-of-field blur and a guaranteed clear text zone for hero backgrounds.
export const meta = {
  title: "Floating Forms",
  kind: "background",
  description: "Seeded composition of softly lit spheres, toruses and pills around a clear text zone, with depth blur, made for landing-page heroes and launch banners.",
  tags: ["hero", "3d", "abstract", "shapes", "background", "gradient", "geometric", "landing page"],
  price: 7,
  author: "oasis-factory",
  size: [1600, 1000],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#ECEEF6" },
    primary: { type: "color", role: "primary", label: "Primary", default: "#5B5BF0" },
    secondary: { type: "color", role: "secondary", label: "Secondary", default: "#A9AAFF" },
    highlight: { type: "color", role: "highlight", label: "Accent", default: "#FF8A65" },
    shapes: { type: "choice", label: "Shape mix", default: "mixed", options: ["mixed", "spheres", "toruses", "pills", "spheres + rings", "spheres + pills"] },
    zone: { type: "choice", label: "Text space", default: "left", options: ["left", "center", "right", "none"] },
    count: { type: "range", label: "Shape count", default: 9, min: 3, max: 16, step: 1 },
    scale: { type: "range", label: "Shape scale", default: 100, min: 60, max: 140, step: 5 },
    clear: { type: "range", label: "Text space size", default: 45, min: 20, max: 80, step: 5 },
    shading: { type: "range", label: "Shading intensity", default: 75, min: 0, max: 100, step: 5 },
    blur: { type: "range", label: "Blur depth", default: 10, min: 0, max: 32, step: 1 },
    seed: { type: "range", label: "Seed", default: 42, min: 1, max: 999, step: 1 },
  },
  presets: {
    Peach: { background: "#FFF3EA", primary: "#FF7A59", secondary: "#FFC2A8", highlight: "#F2A541" },
    Midnight: { background: "#0D0F1A", primary: "#7C5CFF", secondary: "#B9A8FF", highlight: "#35D0BA" },
    Mint: { background: "#E4F3EC", primary: "#1F7A5C", secondary: "#9ED9C0", highlight: "#F6C177" },
    Graphite: { background: "#151515", primary: "#E6E6E6", secondary: "#7D7D7D", highlight: "#FF4D2E" },
  },
};

const W = 1600, H = 1000, TUBE = 0.44;
const BF = { sphere: 1, torus: 1.02, pill: 1.2 };
const MIX = { mixed: ["sphere", "torus", "pill"], spheres: ["sphere"], toruses: ["torus"], pills: ["pill"], "spheres + rings": ["sphere", "torus"], "spheres + pills": ["sphere", "pill"] };
const f = (v) => +v.toFixed(1);
const o2 = (v) => +Math.max(0, Math.min(1, v)).toFixed(2);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sq = (v) => v * v;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (h) => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const tone = (c, t) => (t > 0 ? mix(c, "#FFFFFF", t) : mix(c, "#000000", -t * 0.7));

function separate(c, bg) {
  const dark = lum(bg) < 0.2;
  let out = c;
  for (let i = 0; i < 8 && contrast(out, bg) < 1.5; i++) out = mix(out, dark ? "#FFFFFF" : "#000000", 0.14);
  return out;
}

function shuffle(a, r) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const ell = (rx, ry) => `M${f(rx)} 0A${f(rx)} ${f(ry)} 0 1 1 ${f(-rx)} 0A${f(rx)} ${f(ry)} 0 1 1 ${f(rx)} 0Z`;
const ring = (R, ry, t) => ell(R + t / 2, ry + t / 2) + ell(R - t / 2, ry - t / 2);
const stop = (o, c, op = 1) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${o2(op)}"/>`;
const lg = (id, x1, y1, x2, y2, st) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}">${st}</linearGradient>`;
const dg = (id, lx, ly, e, st) => lg(id, lx * e, ly * e, -lx * e, -ly * e, st);

function lit(a) {
  const t = (a * Math.PI) / 180, Lx = -0.55, Ly = -0.83;
  return [Lx * Math.cos(t) + Ly * Math.sin(t), -Lx * Math.sin(t) + Ly * Math.cos(t)];
}

function geometry(sh, paint) {
  const r = sh.r;
  if (sh.kind === "sphere") return `<circle r="${f(r)}" fill="${paint}"/>`;
  if (sh.kind === "torus") return `<path d="${ring(r * 0.8, r * 0.8 * sh.tilt, r * TUBE)}" fill="${paint}" fill-rule="evenodd"/>`;
  return `<rect x="${f(-r * 1.2)}" y="${f(-r * 0.42)}" width="${f(r * 2.4)}" height="${f(r * 0.84)}" rx="${f(r * 0.42)}" fill="${paint}"/>`;
}

function shape(sh, i, s, shadowCol, sop) {
  const r = sh.r, [lx, ly] = lit(sh.a), d = [];
  let b = "";
  if (sh.kind === "sphere") {
    const bounce = mix(sh.base, "#FFFFFF", 0.3);
    d.push(`<radialGradient id="g${i}" cx="0.42" cy="0.38" r="0.64" fx="0.3" fy="0.25">${stop(0, sh.tint)}${stop(0.5, sh.base)}${stop(0.9, sh.shade)}${stop(1, sh.shade)}</radialGradient>`);
    d.push(lg(`k${i}`, -r * 0.4, -r * 0.5, r * 0.6, r * 0.8, stop(0, bounce, 0) + stop(0.6, bounce, 0) + stop(1, bounce, 0.6 * s)));
    b = `<circle r="${f(r)}" fill="url(#g${i})"/><circle r="${f(r * 0.95)}" fill="none" stroke="url(#k${i})" stroke-width="${f(r * 0.07)}"/>` +
      `<ellipse cx="${f(-r * 0.34)}" cy="${f(-r * 0.4)}" rx="${f(r * 0.32)}" ry="${f(r * 0.2)}" transform="rotate(-35 ${f(-r * 0.34)} ${f(-r * 0.4)})" fill="url(#spec)" opacity="${o2(0.9 * s)}"/>` +
      `<ellipse cx="${f(-r * 0.4)}" cy="${f(-r * 0.46)}" rx="${f(r * 0.11)}" ry="${f(r * 0.07)}" transform="rotate(-35 ${f(-r * 0.4)} ${f(-r * 0.46)})" fill="url(#spec)" opacity="${o2(s)}"/>`;
  } else if (sh.kind === "torus") {
    const R = r * 0.8, ry = R * sh.tilt, t = r * TUBE, e = Math.abs(lx) * (R + t / 2) + Math.abs(ly) * (ry + t / 2);
    d.push(dg(`g${i}`, lx, ly, e, stop(0, sh.tint) + stop(0.45, sh.base) + stop(1, sh.shade)));
    d.push(dg(`h${i}`, lx, ly, e, stop(0, sh.tint, 0.95 * s) + stop(0.55, sh.tint, 0)));
    d.push(dg(`n${i}`, lx, ly, e, stop(0, sh.shade, 0) + stop(0.4, sh.shade, 0) + stop(1, sh.shade, 0.7 * s)));
    d.push(dg(`m${i}`, lx, ly, e, stop(0, sh.shade, 0.85 * s) + stop(0.5, sh.shade, 0)));
    d.push(`<clipPath id="c${i}"><path d="${ring(R, ry, t)}" clip-rule="evenodd"/></clipPath>`);
    const th = Math.atan2(ly, lx), px = R * Math.cos(th) + lx * t * 0.12, py = ry * Math.sin(th) + ly * t * 0.12;
    const ta = (Math.atan2(ry * Math.cos(th), -R * Math.sin(th)) * 180) / Math.PI;
    b = `<path d="${ring(R, ry, t)}" fill="url(#g${i})" fill-rule="evenodd"/><g clip-path="url(#c${i})">` +
      `<path d="${ell(R, ry)}" transform="translate(${f(lx * t * 0.18)} ${f(ly * t * 0.18)})" fill="none" stroke="url(#h${i})" stroke-width="${f(t * 0.32)}"/>` +
      `<path d="${ell(R + t / 2, ry + t / 2)}" fill="none" stroke="url(#n${i})" stroke-width="${f(t * 0.42)}"/>` +
      `<path d="${ell(R - t / 2, ry - t / 2)}" fill="none" stroke="url(#m${i})" stroke-width="${f(t * 0.5)}"/></g>` +
      `<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(t * 0.34)}" ry="${f(t * 0.12)}" transform="rotate(${f(ta)} ${f(px)} ${f(py)})" fill="url(#spec)" opacity="${o2(0.85 * s)}"/>`;
  } else {
    const L = r * 1.2, h = r * 0.42, sy = ly <= 0 ? 1 : -1, sx = lx <= 0 ? 1 : -1;
    d.push(lg(`g${i}`, 0, -h * sy, 0, h * sy, stop(0, mix(sh.base, sh.tint, 0.5)) + stop(0.24, sh.tint) + stop(0.5, sh.base) + stop(0.82, sh.shade) + stop(1, mix(sh.shade, sh.base, 0.6))));
    d.push(lg(`e${i}`, -L * sx, 0, L * sx, 0, stop(0, "#FFFFFF", 0.22 * s) + stop(0.3, "#FFFFFF", 0) + stop(0.7, sh.shade, 0) + stop(1, sh.shade, 0.5 * s)));
    const pr = `x="${f(-L)}" y="${f(-h)}" width="${f(2 * L)}" height="${f(2 * h)}" rx="${f(h)}"`;
    b = `<rect ${pr} fill="url(#g${i})"/><rect ${pr} fill="url(#e${i})"/>` +
      `<rect x="${f(-L * 0.62 - sx * L * 0.1)}" y="${f(-sy * h * 0.5 - h * 0.09)}" width="${f(L * 1.24)}" height="${f(h * 0.18)}" rx="${f(h * 0.09)}" fill="#FFFFFF" opacity="${o2(0.55 * s)}"/>`;
  }
  d.push(`<filter id="s${i}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${f(Math.max(4, r * 0.16))}"/></filter>`);
  const cast = `<g transform="translate(${f(sh.x + r * 0.1)} ${f(sh.y + r * 0.36)}) rotate(${f(sh.a)}) scale(0.9)" opacity="${sop}" filter="url(#s${i})">${geometry(sh, shadowCol)}</g>`;
  return { defs: d.join(""), svg: cast + `<g transform="translate(${f(sh.x)} ${f(sh.y)}) rotate(${f(sh.a)})">${b}</g>` };
}

export default function render(p) {
  const r = rng(p.seed * 9301 + 49297);
  const bg = p.background, dark = lum(bg) < 0.2, s = p.shading / 100, sc = p.scale / 100, c = p.clear / 100;
  const z = p.zone === "none" ? null : { x: W * (p.zone === "left" ? 0.32 : p.zone === "right" ? 0.68 : 0.5), y: H / 2, rx: W * 0.55 * c, ry: H * (0.5 * c + 0.05) };
  const kinds = MIX[p.shapes] || MIX.mixed;
  const heroKind = kinds.includes("sphere") ? "sphere" : kinds[0];
  const spin = (k) => (k === "sphere" ? 0 : k === "torus" ? (r() * 2 - 1) * 25 : (r() < 0.5 ? -1 : 1) * (15 + r() * 55));
  const hero = { hero: true, kind: heroKind, layer: 0, r: H * 0.2 * sc * (heroKind === "pill" ? 0.78 : heroKind === "torus" ? 0.95 : 1), tilt: 0.46 + r() * 0.24 };
  hero.a = spin(heroKind);
  const others = shuffle(Array.from({ length: p.count - 1 }, (_, i) => kinds[i % kinds.length]), r)
    .map((kind) => ({ kind, r: H * sc * (0.035 + 0.1 * Math.pow(r(), 1.4)), a: spin(kind), tilt: 0.46 + r() * 0.24 }))
    .sort((a, b) => b.r - a.r);
  others.forEach((o, j) => { const fr = j / Math.max(1, others.length - 1); o.layer = fr < 0.34 ? 0 : fr < 0.67 ? 1 : 2; });

  const placed = [];
  const place = (sp, targ, rounds) => {
    let mx = 0, my = 0, mm = 0;
    placed.forEach((o) => { const m = o.br * o.br; mx += (o.x - W / 2) * m; my += (o.y - H / 2) * m; mm += m; });
    if (mm) { mx /= mm; my /= mm; }
    const ml = Math.hypot(mx, my) || 1, k = Math.min(1, ml / 220);
    for (let round = 0; round < rounds; round++) {
      const br = sp.r * BF[sp.kind], lo = sp.layer === 2 ? br * 0.3 : br + 32;
      let best = null, bs = -Infinity;
      for (let t = 0; t < 60; t++) {
        const x = targ ? clamp(targ[0] + (r() - 0.5) * W * 0.4, lo, W - lo) : lo + r() * (W - 2 * lo);
        const y = targ ? clamp(targ[1] + (r() - 0.5) * H * 0.4, lo, H - lo) : lo + r() * (H - 2 * lo);
        if (z && sq((x - z.x) / (z.rx + br)) + sq((y - z.y) / (z.ry + br)) <= 1) continue;
        let clear = 400, ok = true;
        for (const o of placed) {
          const g = Math.hypot(o.x - x, o.y - y) - o.br - br;
          if (g < 26 * sc + 0.2 * Math.min(br, o.br)) { ok = false; break; }
          clear = Math.min(clear, g);
        }
        if (!ok) continue;
        const score = targ ? -Math.hypot(x - targ[0], y - targ[1]) : clear - (0.45 * k * ((x - W / 2) * mx + (y - H / 2) * my)) / ml;
        if (score > bs) { bs = score; best = { x, y, br }; }
      }
      if (best) { placed.push(Object.assign(sp, best)); return; }
      sp.r *= 0.86;
    }
  };
  const hx = z && z.x < W / 2 ? 0.78 : z && z.x > W / 2 ? 0.22 : r() < 0.5 ? 0.24 : 0.76;
  place(hero, [W * hx, H * (r() < 0.5 ? 0.34 : 0.66)], 8);
  others.forEach((o) => place(o, null, 3));

  const rest = placed.filter((o) => !o.hero);
  hero.col = p.primary; hero.t = 0;
  rest.forEach((o, j) => { o.col = j === 0 ? p.secondary : r() < 0.5 ? p.primary : p.secondary; o.t = (r() * 2 - 1) * 0.16; });
  const pool = rest.slice(1).sort((a, b) => (a.layer === 2) - (b.layer === 2) || a.r - b.r);
  const nh = rest.length >= 9 ? 2 : 1, half = Math.max(nh, Math.ceil(pool.length / 2));
  shuffle(pool.slice(0, half), r).slice(0, nh).forEach((o) => { o.col = p.highlight; o.t = 0; });
  (pool.length ? [] : rest.slice(0, 1)).forEach((o) => { o.col = p.highlight; });

  placed.forEach((o) => {
    o.base = mix(separate(tone(o.col, o.t), bg), bg, [0, 0.08, 0.2][o.layer]);
    o.tint = mix(o.base, "#FFFFFF", 0.6 * s);
    o.shade = mix(o.base, "#000000", 0.5 * s);
  });

  const shadowCol = mix(bg, "#000000", dark ? 0.75 : 0.5), sop = (dark ? 0.5 : 0.24) * (0.4 + 0.6 * s);
  let defs = "";
  const layers = ["", "", ""];
  placed.forEach((sh, i) => { const o = shape(sh, i, s, shadowCol, o2(sop * (sh.layer === 2 ? 0.6 : 1))); defs += o.defs; layers[sh.layer] += o.svg; });
  const blurs = [0, p.blur * 0.35, p.blur];
  defs += blurs.map((b, i) => (b > 0 ? `<filter id="b${i}" filterUnits="userSpaceOnUse" x="-300" y="-300" width="${W + 600}" height="${H + 600}"><feGaussianBlur stdDeviation="${f(b)}"/></filter>` : "")).join("");
  const top = mix(bg, "#FFFFFF", dark ? 0.06 : 0.45), bottom = mix(bg, "#000000", dark ? 0.3 : 0.07);
  const ga = dark ? 0.28 : 0.18, gA = mix(p.primary, bg, 0.3), gB = mix(p.secondary, bg, 0.3);
  const ax = z ? z.x : W / 2, bx = W - (hero.x || W / 2), by = H - (hero.y || H / 2);
  defs += `<radialGradient id="bgG" cx="0.3" cy="0.2" r="1">${stop(0, top)}${stop(1, bottom)}</radialGradient>` +
    `<radialGradient id="glA" gradientUnits="userSpaceOnUse" cx="${f(ax)}" cy="${H / 2}" r="${W * 0.4}">${stop(0, gA, ga)}${stop(1, gA, 0)}</radialGradient>` +
    `<radialGradient id="glB" gradientUnits="userSpaceOnUse" cx="${f(bx)}" cy="${f(by)}" r="${W * 0.32}">${stop(0, gB, ga * 0.7)}${stop(1, gB, 0)}</radialGradient>` +
    `<radialGradient id="spec">${stop(0, "#FFFFFF", 0.95)}${stop(1, "#FFFFFF", 0)}</radialGradient>`;
  const body = [2, 1, 0].map((l) => (layers[l] ? `<g${blurs[l] > 0 ? ` filter="url(#b${l})"` : ""}>${layers[l]}</g>` : "")).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="${bg}"/><rect width="${W}" height="${H}" fill="url(#bgG)"/><rect width="${W}" height="${H}" fill="url(#glA)"/><rect width="${W}" height="${H}" fill="url(#glB)"/>${body}</svg>`;
}
