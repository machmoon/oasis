// Security shield spot: guilloché-engraved shield, ceramic padlock on a vault-dial ring, data packets in orbit.
export const meta = {
  title: "Guarded Orbit",
  kind: "illustration",
  description: "A privacy and security spot with a banknote-engraved shield, ceramic padlock and orbiting data, for onboarding, settings and trust pages.",
  tags: ["security", "privacy", "shield", "lock", "illustration", "spot", "trust", "encryption"],
  price: 0,
  author: "oasis-factory",
  size: [600, 600],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#0E1726" },
    shield: { type: "color", role: "primary", label: "Shield", default: "#4C6FFF" },
    lock: { type: "color", role: "surface", label: "Lock body", default: "#F5F2EA" },
    accent: { type: "color", role: "highlight", label: "Particles", default: "#6EE7C5" },
    shape: { type: "choice", label: "Shield shape", default: "classic", options: ["classic", "heater", "round", "badge"] },
    state: { type: "choice", label: "Lock state", default: "closed", options: ["closed", "open"] },
    particles: { type: "choice", label: "Particle style", default: "dots", options: ["dots", "packets", "sparks"] },
    count: { type: "range", label: "Particles", default: 10, min: 0, max: 24, step: 1 },
    seed: { type: "range", label: "Seed", default: 7, min: 1, max: 100, step: 1 },
    glow: { type: "toggle", label: "Glow", default: true },
  },
  presets: {
    Paper: { background: "#F4F1EA", shield: "#1F3A2E", lock: "#F9F6EF", accent: "#D9962B", shape: "heater", state: "open", particles: "packets", glow: false },
    Ember: { background: "#1A1210", shield: "#E4572E", lock: "#FFF4E8", accent: "#FFC857", shape: "round", state: "closed", particles: "sparks", glow: true },
    Lilac: { background: "#EEEAFB", shield: "#6B5BD6", lock: "#FFFFFF", accent: "#1FA99C", shape: "badge", state: "open", particles: "dots", glow: true },
    Arctic: { background: "#E8F3F8", shield: "#0F4C5C", lock: "#F2FBFF", accent: "#FF7A59", shape: "classic", state: "closed", particles: "packets", glow: false },
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

const rgb = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (c) => {
  const [r, g, b] = rgb(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function ensure(fg, bg, min) {
  if (contrast(fg, bg) >= min) return fg;
  const target = contrast("#FFFFFF", bg) > contrast("#000000", bg) ? "#FFFFFF" : "#000000";
  for (let t = 0.1; t <= 1.001; t += 0.1) { const c = mix(fg, target, t); if (contrast(c, bg) >= min) return c; }
  return target;
}
const f = (n) => n.toFixed(1);

function shieldPath(shape, cx, ty, hw, h) {
  const X = (k) => f(cx + hw * k), Y = (k) => f(ty + h * k);
  if (shape === "heater") {
    return `M${X(-0.86)},${Y(0)} L${X(0.86)},${Y(0)} Q${X(1)},${Y(0)} ${X(1)},${Y(0.06)} L${X(1)},${Y(0.36)} C${X(1)},${Y(0.7)} ${X(0.52)},${Y(0.88)} ${X(0)},${Y(1)} C${X(-0.52)},${Y(0.88)} ${X(-1)},${Y(0.7)} ${X(-1)},${Y(0.36)} L${X(-1)},${Y(0.06)} Q${X(-1)},${Y(0)} ${X(-0.86)},${Y(0)} Z`;
  }
  if (shape === "round") {
    return `M${X(-0.84)},${Y(0.02)} L${X(0.84)},${Y(0.02)} Q${X(1)},${Y(0.02)} ${X(1)},${Y(0.09)} L${X(1)},${Y(0.5)} C${X(1)},${Y(0.82)} ${X(0.56)},${Y(1)} ${X(0)},${Y(1)} C${X(-0.56)},${Y(1)} ${X(-1)},${Y(0.82)} ${X(-1)},${Y(0.5)} L${X(-1)},${Y(0.09)} Q${X(-1)},${Y(0.02)} ${X(-0.84)},${Y(0.02)} Z`;
  }
  if (shape === "badge") {
    return `M${X(0)},${Y(0)} L${X(1)},${Y(0.17)} L${X(1)},${Y(0.56)} Q${X(1)},${Y(0.78)} ${X(0)},${Y(1)} Q${X(-1)},${Y(0.78)} ${X(-1)},${Y(0.56)} L${X(-1)},${Y(0.17)} Z`;
  }
  return `M${X(0)},${Y(0)} Q${X(0.55)},${Y(0.1)} ${X(1)},${Y(0.1)} L${X(1)},${Y(0.45)} C${X(1)},${Y(0.75)} ${X(0.45)},${Y(0.9)} ${X(0)},${Y(1)} C${X(-0.45)},${Y(0.9)} ${X(-1)},${Y(0.75)} ${X(-1)},${Y(0.45)} L${X(-1)},${Y(0.1)} Q${X(-0.55)},${Y(0.1)} ${X(0)},${Y(0)} Z`;
}

function particle(x, y, r, kind, fill, op, rot) {
  if (kind === "sparks") {
    const R = r * 1.9;
    return `<path d="M${f(x)},${f(y - R)} Q${f(x)},${f(y)} ${f(x + R)},${f(y)} Q${f(x)},${f(y)} ${f(x)},${f(y + R)} Q${f(x)},${f(y)} ${f(x - R)},${f(y)} Q${f(x)},${f(y)} ${f(x)},${f(y - R)}Z" fill="${fill}" opacity="${op}"/>`;
  }
  if (kind === "packets") return `<rect x="${f(x - r)}" y="${f(y - r)}" width="${f(r * 2)}" height="${f(r * 2)}" rx="${f(r * 0.35)}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})" fill="${fill}" opacity="${op}"/>`;
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" opacity="${op}"/>`;
}

function rosette(cx, cy) {
  let d = "";
  for (let j = 0; j < 14; j++) {
    const R = 62 + j * 13;
    for (let i = 0; i <= 240; i++) {
      const t = (i / 240) * Math.PI * 2;
      const rr = R + 5 * Math.sin(9 * t + j * 0.7) + 2.2 * Math.sin(23 * t - j * 0.4);
      d += `${i ? "L" : "M"}${f(cx + rr * Math.cos(t))},${f(cy + rr * Math.sin(t))}`;
    }
    d += "Z";
  }
  return d;
}

export default function render(p) {
  const S = 600, cx = 300, ty = 140, h = 290, hw = 122, ocy = 336;
  const dark = lum(p.background) < 0.2;
  let body = p.lock;
  if (lum(body) < 0.4) body = mix(body, "#FFFFFF", 0.82);
  let sBase = p.shield;
  for (let t = 0.1; t <= 0.81 && contrast(body, sBase) < 3.2; t += 0.1) sBase = mix(p.shield, "#000000", t);
  const tint = mix(sBase, "#FFFFFF", 0.22), shade = mix(sBase, "#000000", 0.32);
  const edge = ensure(shade, p.background, 1.5);
  const key = ensure(mix(sBase, "#000000", 0.5), body, 4.5);
  const acc = ensure(p.accent, p.background, 2.2);
  const ringC = mix(p.background, tint, dark ? 0.3 : 0.26);
  const d = shieldPath(p.shape, cx, ty, hw, h);
  const vcy = ty + h * 0.47, tip = ty + h;

  const bw = 112, bh = 88, bx = cx - bw / 2, by = 262, lx = cx - 31, rx2 = cx + 31, sy = by - 24;
  const open = p.state === "open", off = open ? 26 : 0;
  const leftEnd = open ? sy - off + 14 : by + 6;
  const shPath = `M${lx},${leftEnd} L${lx},${sy - off} A31,31 0 0 1 ${rx2},${sy - off} L${rx2},${by + 6}`;
  const inZone = (x, y, m) =>
    (x > bx - m && x < bx + bw + m && y > by - m && y < by + bh + m) ||
    (x > lx - 8 - m && x < rx2 + 8 + m && y > sy - off - 39 - m && y < by);
  const kcy = by + 40;

  const defs = `<defs>
<linearGradient id="sf" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${tint}"/><stop offset="0.55" stop-color="${sBase}"/><stop offset="1" stop-color="${shade}"/></linearGradient>
<linearGradient id="lb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(body, "#FFFFFF", 0.55)}"/><stop offset="0.18" stop-color="${body}"/><stop offset="0.82" stop-color="${mix(body, key, 0.08)}"/><stop offset="1" stop-color="${mix(body, key, 0.2)}"/></linearGradient>
<linearGradient id="sk" gradientUnits="userSpaceOnUse" x1="${lx - 8}" y1="0" x2="${rx2 + 8}" y2="0"><stop offset="0" stop-color="${mix(body, key, 0.34)}"/><stop offset="0.3" stop-color="${mix(body, "#FFFFFF", 0.6)}"/><stop offset="0.62" stop-color="${mix(body, key, 0.14)}"/><stop offset="1" stop-color="${mix(body, key, 0.42)}"/></linearGradient>
<radialGradient id="es" cx="0.5" cy="0.3" r="0.65"><stop offset="0" stop-color="${mix(body, key, 0.18)}"/><stop offset="1" stop-color="${mix(body, "#FFFFFF", 0.4)}"/></radialGradient>
<radialGradient id="gl" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${tint}" stop-opacity="${dark ? 0.5 : 0.32}"/><stop offset="0.6" stop-color="${sBase}" stop-opacity="${dark ? 0.14 : 0.08}"/><stop offset="1" stop-color="${sBase}" stop-opacity="0"/></radialGradient>
<clipPath id="sc"><path d="${d}"/></clipPath>
<mask id="lk" maskUnits="userSpaceOnUse" x="0" y="0" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="#FFFFFF"/><rect x="${bx - 10}" y="${by - 10}" width="${bw + 20}" height="${bh + 20}" rx="28" fill="#000000"/><path d="${shPath}" fill="none" stroke="#000000" stroke-width="36" stroke-linecap="round"/></mask>
<filter id="pb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="sb" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="sg" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="18"/></filter>
</defs>`;

  let bg = `<rect width="${S}" height="${S}" fill="${p.background}"/>`;
  if (p.glow) bg += `<circle cx="${cx}" cy="${vcy}" r="270" fill="url(#gl)"/>`;
  bg += `<circle cx="${cx}" cy="290" r="205" fill="none" stroke="${ringC}" stroke-width="1.2" opacity="0.55"/>`;
  for (let i = 0; i < 72; i++) {
    const t = (i / 72) * Math.PI * 2, major = i % 6 === 0, l = major ? 11 : 5, r1 = 258;
    bg += `<line x1="${f(cx + r1 * Math.cos(t))}" y1="${f(290 + r1 * Math.sin(t))}" x2="${f(cx + (r1 + l) * Math.cos(t))}" y2="${f(290 + (r1 + l) * Math.sin(t))}" stroke="${ringC}" stroke-width="${major ? 2 : 1.2}" stroke-linecap="round"/>`;
  }
  const shadowC = dark ? "#000000" : mix(p.background, "#000000", 0.6);
  bg += `<ellipse cx="${cx}" cy="${tip + 22}" rx="${hw * 0.6}" ry="8" fill="${shadowC}" opacity="${dark ? 0.55 : 0.24}" filter="url(#pb)"/>`;

  const r = rng(p.seed * 7919 + 13);
  const tilt = -12 + (r() - 0.5) * 8;
  const a = 236, b = 58, th = (tilt * Math.PI) / 180, ct = Math.cos(th), st = Math.sin(th);
  const pt = (t, k) => { const x = a * k * Math.cos(t), y = b * k * Math.sin(t); return [cx + x * ct - y * st, ocy + x * st + y * ct]; };
  const [x0, y0] = pt(0, 1), [x1, y1] = pt(Math.PI, 1);
  const dash = open ? ` stroke-dasharray="3 9"` : "";
  const backRing = `<ellipse cx="${cx}" cy="${ocy}" rx="${a}" ry="${b}" transform="rotate(${f(tilt)} ${cx} ${ocy})" fill="none" stroke="${acc}" stroke-width="1.5" opacity="0.3"${dash}/>`;
  const frontRing = `<path d="M${f(x0)},${f(y0)} A${a},${b} ${f(tilt)} 0 1 ${f(x1)},${f(y1)}" fill="none" stroke="${acc}" stroke-width="2" stroke-linecap="round" opacity="0.7"${dash}/>`;

  let back = "", front = "", halo = "";
  const n = p.count, phase = r() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const t = phase + (i / n) * Math.PI * 2 + (r() - 0.5) * (Math.PI * 2 / n) * 0.3;
    const k = open ? 1 + (r() - 0.5) * 0.24 : 1;
    const [x, y] = pt(t, k), depth = Math.sin(t);
    const rad = (i % 3 === 0 ? 6.5 : 4.2) * (0.75 + 0.25 * depth);
    const rot = tilt + (open ? r() * 90 : 45);
    if (depth > 0) {
      if (inZone(x, y, rad * 2 + 12)) continue;
      front += particle(x, y, rad, p.particles, acc, 1, rot);
      if (p.glow) halo += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad * 2.4)}" fill="${acc}" opacity="0.55"/>`;
    } else {
      back += particle(x, y, rad, p.particles, acc, (0.4 + 0.25 * (1 + depth)).toFixed(2), rot);
    }
  }

  const s = 0.9, tr = `translate(${cx} ${vcy}) scale(${s}) translate(${-cx} ${-vcy})`;
  let sh = p.glow ? `<path d="${d}" fill="${tint}" opacity="${dark ? 0.5 : 0.35}" filter="url(#sg)"/>` : "";
  sh += `<path d="${d}" fill="url(#sf)"/>`;
  sh += `<g clip-path="url(#sc)"><path d="${rosette(cx, by + bh / 2)}" fill="none" stroke="${mix(sBase, "#FFFFFF", 0.55)}" stroke-width="1" opacity="0.2"/></g>`;
  sh += `<path d="${d}" fill="none" stroke="${edge}" stroke-width="3" stroke-linejoin="round"/>`;
  sh += `<path d="${d}" transform="${tr}" fill="none" stroke="${tint}" stroke-width="${f(2 / s)}" stroke-linejoin="round" opacity="0.6"/>`;

  let lock = `<path d="${shPath}" fill="none" stroke="url(#sk)" stroke-width="16" stroke-linecap="round"/>`;
  lock += `<rect x="${bx + 4}" y="${by + 10}" width="${bw - 8}" height="${bh}" rx="20" fill="${shade}" opacity="0.5" filter="url(#sb)"/>`;
  lock += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="20" fill="url(#lb)"/>`;
  lock += `<rect x="${bx + 1.5}" y="${by + 1.5}" width="${bw - 3}" height="${bh - 3}" rx="18.5" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity="0.5"/>`;
  [[bx + 14, by + 14], [bx + bw - 14, by + 14], [bx + 14, by + bh - 14], [bx + bw - 14, by + bh - 14]].forEach(([x, y]) => {
    lock += `<circle cx="${x}" cy="${y}" r="2.6" fill="${mix(body, key, 0.22)}"/><circle cx="${x - 0.6}" cy="${y - 0.6}" r="1" fill="#FFFFFF" opacity="0.7"/>`;
  });
  lock += `<circle cx="${cx}" cy="${kcy}" r="23" fill="url(#es)" stroke="${mix(body, key, 0.18)}" stroke-width="1.2"/>`;
  lock += `<circle cx="${cx}" cy="${kcy - 4}" r="8.5" fill="${key}"/><path d="M${cx - 4},${kcy} L${cx - 7},${kcy + 15} L${cx + 7},${kcy + 15} L${cx + 4},${kcy} Z" fill="${key}" stroke="${key}" stroke-width="2" stroke-linejoin="round"/>`;

  const haloG = halo ? `<g filter="url(#pb)">${halo}</g>` : "";
  const orbitFront = `<g mask="url(#lk)">${frontRing}${haloG}${front}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">${defs}${bg}${backRing}${back}${sh}${orbitFront}${lock}</svg>`;
}
