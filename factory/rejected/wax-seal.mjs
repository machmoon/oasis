// Wax or embossed-foil seal: seeded organic wax puddle or serrated foil, recessed stamp, raised legible monogram.
export const meta = {
  title: "Sealed With Wax",
  kind: "brand",
  description: "A tactile wax or embossed metallic foil seal with a raised monogram, for wedding stationery, packaging, certificates and brand stamps.",
  tags: ["wax seal", "monogram", "stamp", "wedding", "foil", "emblem", "invitation", "badge"],
  price: 4,
  author: "oasis-factory",
  size: [600, 600],
};

export const params = {
  knobs: {
    wax: { type: "color", role: "primary", label: "Seal colour", default: "#8A1F2D" },
    background: { type: "color", role: "background", label: "Paper", default: "#EFE7DA" },
    finish: { type: "choice", label: "Material", default: "wax", options: ["wax", "foil"] },
    letterStyle: { type: "choice", label: "Monogram font", default: "serif", options: ["serif", "script", "sans"] },
    frame: { type: "choice", label: "Stamp frame", default: "laurel", options: ["laurel", "ring", "beaded", "plain"] },
    letters: { type: "text", label: "Monogram (1-3 letters)", default: "J&M" },
    wobble: { type: "range", label: "Edge wobble", default: 55, min: 0, max: 100, step: 1 },
    dripLength: { type: "range", label: "Drip / ribbon length", default: 40, min: 0, max: 100, step: 1 },
    shine: { type: "range", label: "Shine highlight", default: 60, min: 0, max: 100, step: 1 },
    seed: { type: "range", label: "Seed", default: 7, min: 1, max: 99, step: 1 },
    drip: { type: "toggle", label: "Drips (ribbons on foil)", default: true },
  },
  presets: {
    Gilded: { wax: "#C9A13B", background: "#F4EFE6", finish: "foil", frame: "beaded", letterStyle: "serif", letters: "R" },
    Navy: { wax: "#26365F", background: "#E9E4D8", frame: "ring", letterStyle: "sans", letters: "AWM" },
    Sage: { wax: "#6E8C64", background: "#F3F0E8", frame: "plain", letterStyle: "script", letters: "E&W" },
    Noir: { wax: "#A3172F", background: "#141416", frame: "laurel", letters: "KL", drip: false },
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
const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (a) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (c) => { const [r, g, b] = hex(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const f = (n) => n.toFixed(1);
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function toHsl(c) {
  const [r, g, b] = hex(c).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function fromHsl(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2, k = Math.floor(h / 60) % 6;
  const t = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][k];
  return toHex(t.map((v) => (v + m) * 255));
}

function smooth(pts) {
  const n = pts.length;
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + "Z";
}

function dripPath(x, y0, L, w) {
  const wn = w * 2.2, br = w * 0.6, yb = y0 + L, ym = y0 + L * 0.5;
  return `M${f(x - wn / 2)},${f(y0)} C${f(x - w * 0.55)},${f(y0 + 2)} ${f(x - w / 2)},${f(y0 + L * 0.25)} ${f(x - w / 2)},${f(ym)} C${f(x - w / 2)},${f(yb - br * 0.8)} ${f(x - br)},${f(yb - br * 0.9)} ${f(x - br)},${f(yb)} A${f(br)},${f(br)} 0 0 0 ${f(x + br)},${f(yb)} C${f(x + br)},${f(yb - br * 0.9)} ${f(x + w / 2)},${f(yb - br * 0.8)} ${f(x + w / 2)},${f(ym)} C${f(x + w / 2)},${f(y0 + L * 0.25)} ${f(x + w * 0.55)},${f(y0 + 2)} ${f(x + wn / 2)},${f(y0)}Z`;
}

const WID = (ch) => ("MW".includes(ch) ? 0.92 : ch === "I" ? 0.36 : ch === "J" ? 0.52 : ch === "&" ? 0.8 : 0.72);

export default function render(p) {
  const S = 600, cx = 300, cy = p.drip ? 266 : 294, R = 158;
  const foil = p.finish === "foil", bg = p.background, darkBg = lum(bg) < 0.2;
  const r = rng(p.seed * 977 + 13), s = p.shine / 100, wob = p.wobble / 100, dl = p.dripLength / 100;
  const [H0, S0, L0] = toHsl(p.wax);
  const sat = Math.min(S0, foil ? 0.62 : 0.72), lig = cl(L0, foil ? 0.34 : 0.2, foil ? 0.54 : 0.48);
  const T = (d, ds = 0) => fromHsl(H0, cl(sat + ds, 0, 1), cl(lig + d, 0.04, 0.95));

  const harm = [2, 3, 4, 5, 7, 10].map((k, i) => ({ k, a: (0.35 + r()) / (1 + i * 0.45), ph: r() * 6.283 }));
  const asum = harm.reduce((t, h) => t + h.a, 0);
  const amp = wob * (foil ? 0.05 : 0.17), N = foil ? 88 : 96, pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    let nz = 0; harm.forEach((h) => { nz += h.a * Math.sin(h.k * t + h.ph); });
    let rr = R * (1 + (amp * 1.6 * nz) / asum);
    if (foil && i % 2) rr *= 0.96 - 0.03 * wob;
    pts.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]);
  }
  const blob = foil ? "M" + pts.map((q) => `${f(q[0])},${f(q[1])}`).join(" L") + "Z" : smooth(pts);
  const lip = smooth(pts.filter((q, i) => !foil || i % 2 === 0).map((q) => [cx + (q[0] - cx) * 0.88, cy + (q[1] - cy) * 0.88]));
  const dx = cx + (r() - 0.5) * R * 0.07 * wob, dy = cy + (r() - 0.5) * R * 0.07 * wob, ri = R * 0.66, rf = ri * 0.86;

  const shCol = darkBg ? "#000000" : mix(bg, "#000000", 0.7), shOp = darkBg ? 0.8 : 0.32, gv = darkBg ? 1 : 0;
  const defs = `<defs>
<filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="7" stdDeviation="8" flood-color="${shCol}" flood-opacity="${shOp}"/></filter>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="blur1"><feGaussianBlur stdDeviation="1.2"/></filter>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3"/><feColorMatrix type="matrix" values="0 0 0 0 ${gv} 0 0 0 0 ${gv} 0 0 0 0 ${gv} 0.14 0 0 0 0"/></filter>
<radialGradient id="vig" cx="0.5" cy="0.47" r="0.72"><stop offset="0.55" stop-color="${mix(bg, "#000000", 0.25)}" stop-opacity="0"/><stop offset="1" stop-color="${mix(bg, "#000000", 0.25)}" stop-opacity="0.5"/></radialGradient>
<radialGradient id="waxG" gradientUnits="userSpaceOnUse" cx="${f(cx - R * 0.35)}" cy="${f(cy - R * 0.4)}" r="${f(R * 1.9)}"><stop offset="0" stop-color="${T(0.13, -0.04)}"/><stop offset="0.45" stop-color="${T(0)}"/><stop offset="1" stop-color="${T(-0.17, 0.04)}"/></radialGradient>
<linearGradient id="metal" gradientUnits="userSpaceOnUse" x1="${cx - R}" y1="${cy - R}" x2="${cx + R}" y2="${cy + R}"><stop offset="0" stop-color="${T(0.38, -0.15)}"/><stop offset="0.2" stop-color="${T(0.08)}"/><stop offset="0.4" stop-color="${T(-0.18, 0.05)}"/><stop offset="0.56" stop-color="${T(0.32, -0.1)}"/><stop offset="0.76" stop-color="${T(0)}"/><stop offset="1" stop-color="${T(-0.22, 0.04)}"/></linearGradient>
<linearGradient id="faceG" gradientUnits="userSpaceOnUse" x1="${f(dx - ri)}" y1="${f(dy - ri * 0.5)}" x2="${f(dx + ri)}" y2="${f(dy + ri * 0.5)}"><stop offset="0" stop-color="${T(0.36, -0.14)}"/><stop offset="0.5" stop-color="${T(0.12)}"/><stop offset="1" stop-color="${T(0.3, -0.1)}"/></linearGradient>
<linearGradient id="disc" gradientUnits="userSpaceOnUse" x1="${f(dx - ri)}" y1="${f(dy - ri)}" x2="${f(dx + ri * 0.6)}" y2="${f(dy + ri)}"><stop offset="0" stop-color="${T(foil ? -0.2 : -0.14, 0.04)}"/><stop offset="0.55" stop-color="${T(foil ? -0.11 : -0.08)}"/><stop offset="1" stop-color="${T(foil ? -0.04 : -0.03)}"/></linearGradient>
<linearGradient id="bevel" gradientUnits="userSpaceOnUse" x1="${f(dx - ri)}" y1="${f(dy - ri)}" x2="${f(dx + ri)}" y2="${f(dy + ri)}"><stop offset="0" stop-color="${T(-0.26, 0.04)}"/><stop offset="1" stop-color="${T(0.24, -0.06)}"/></linearGradient>
<linearGradient id="lipG" gradientUnits="userSpaceOnUse" x1="${f(dx - ri)}" y1="${f(dy - ri)}" x2="${f(dx + ri)}" y2="${f(dy + ri)}"><stop offset="0" stop-color="${T(0.26, -0.08)}"/><stop offset="1" stop-color="${T(-0.24, 0.04)}"/></linearGradient>
<linearGradient id="band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="clip"><path d="${blob}"/></clipPath>
</defs>`;

  const sealFill = foil ? "url(#metal)" : "url(#waxG)";
  let under = "", over = "";
  if (p.drip && !foil) {
    const angs = [118, 95, 71].map((a) => a + (r() - 0.5) * 10), vars = [1, 0.68, 0.45], rot = Math.floor(r() * 3);
    angs.forEach((a, i) => {
      const e = pts[Math.round((a / 360) * N) % N], w = R * (0.13 + r() * 0.05), br = w * 0.6;
      const x = e[0], y0 = e[1] - w * 0.5;
      const L = Math.min(w * 0.9 + R * (0.06 + 0.3 * dl) * vars[(i + rot) % 3], S - 30 - br - y0);
      const d = dripPath(x, y0, L, w), yb = y0 + L;
      under += `<path d="${d}" fill="${sealFill}"/>`;
      over += `<path d="${d}" fill="${sealFill}"/>`;
      if (s > 0) over += `<ellipse cx="${f(x - br * 0.4)}" cy="${f(yb - br * 0.1)}" rx="${f(br * 0.22)}" ry="${f(br * 0.38)}" fill="#fff" opacity="${(0.55 * s).toFixed(2)}"/>`;
    });
  }
  if (p.drip && foil) {
    const w = 62, Lr = R * (0.95 + 0.75 * dl);
    [-1, 1].forEach((sd) => {
      under += `<g transform="rotate(${sd * -24} ${cx} ${cy})"><polygon points="${cx - w / 2},${cy} ${cx + w / 2},${cy} ${cx + w / 2},${f(cy + Lr)} ${cx},${f(cy + Lr - 22)} ${cx - w / 2},${f(cy + Lr)}" fill="${T(-0.12)}"/><path d="M${cx - w / 2 + 7},${cy} V${f(cy + Lr - 5)} M${cx + w / 2 - 7},${cy} V${f(cy + Lr - 5)}" stroke="${T(0.2, -0.08)}" stroke-width="2" opacity="0.75"/><polygon points="${cx - w / 2},${cy} ${cx},${cy} ${cx},${f(cy + Lr - 22)} ${cx - w / 2},${f(cy + Lr)}" fill="#000" opacity="0.14"/></g>`;
    });
  }

  let rim = `<rect width="${S}" height="${S}" filter="url(#grain)" opacity="${foil ? 0.3 : 0.7}"/>`;
  if (foil) {
    for (let i = 0; i < 36; i++) {
      const a0 = (i / 36) * Math.PI * 2, a1 = ((i + 1) / 36) * Math.PI * 2, rr = R * 1.2;
      rim += `<path d="M${f(dx)},${f(dy)} L${f(dx + Math.cos(a0) * rr)},${f(dy + Math.sin(a0) * rr)} L${f(dx + Math.cos(a1) * rr)},${f(dy + Math.sin(a1) * rr)}Z" fill="${i % 2 ? "#fff" : "#000"}" opacity="0.04"/>`;
    }
    for (let rr = ri + 8; rr < R * 0.86; rr += 4.5) rim += `<circle cx="${f(dx)}" cy="${f(dy)}" r="${f(rr)}" fill="none" stroke="${T(-0.25)}" stroke-width="0.8" opacity="0.22"/>`;
  }
  rim += `<path d="${lip}" fill="none" stroke="${T(0.24, -0.06)}" stroke-width="2.5" opacity="${foil ? 0.6 : 0.35}" filter="url(#blur1)"/><path d="${lip}" transform="translate(1.5 2)" fill="none" stroke="${T(-0.24)}" stroke-width="1.6" opacity="0.35" filter="url(#blur1)"/>`;

  let frame = "";
  if (p.frame === "ring") {
    frame = `<circle cx="${f(dx)}" cy="${f(dy)}" r="${f(rf)}" fill="none" stroke-width="3"/><circle cx="${f(dx)}" cy="${f(dy)}" r="${f(rf - 7)}" fill="none" stroke-width="1.2"/>`;
  } else if (p.frame === "beaded") {
    const n = Math.round((2 * Math.PI * rf) / 10);
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; frame += `<circle cx="${f(dx + Math.cos(a) * rf)}" cy="${f(dy + Math.sin(a) * rf)}" r="${f(ri * 0.027)}" stroke="none"/>`; }
  } else if (p.frame === "laurel") {
    const rl = rf - 2, rad = (d) => (d * Math.PI) / 180;
    [-1, 1].forEach((sd) => {
      const a0 = 90 + sd * 18, a1 = 90 + sd * 158;
      frame += `<path d="M${f(dx + Math.cos(rad(a0)) * rl)},${f(dy + Math.sin(rad(a0)) * rl)} A${f(rl)},${f(rl)} 0 0 ${sd > 0 ? 1 : 0} ${f(dx + Math.cos(rad(a1)) * rl)},${f(dy + Math.sin(rad(a1)) * rl)}" fill="none" stroke-width="1.6"/>`;
      for (let j = 0; j < 10; j++) {
        const a = 90 + sd * (26 + j * 14), off = j % 2 ? 4.5 : -4.5;
        const x = dx + Math.cos(rad(a)) * (rl + off), y = dy + Math.sin(rad(a)) * (rl + off);
        frame += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(ri * 0.088)}" ry="${f(ri * 0.036)}" transform="rotate(${f(a + 90 + sd * (j % 2 ? 28 : -28))} ${f(x)} ${f(y)})" stroke="none"/>`;
      }
    });
  }

  const raw = String(p.letters || "").trim().slice(0, 3).toUpperCase();
  const fam = { serif: "Baskerville, 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif", script: "'Snell Roundhand', 'Apple Chancery', 'URW Chancery L', 'Brush Script MT', cursive", sans: "Futura, 'Century Gothic', 'Avenir Next', 'Helvetica Neue', Arial, sans-serif" }[p.letterStyle];
  let mono, sw = 1.2;
  if (raw.length) {
    const chars = Array.from(raw), em = chars.reduce((t, c) => t + WID(c), 0) * (p.letterStyle === "script" ? 0.95 : 1);
    const rIn = p.frame === "plain" ? ri - 12 : p.frame === "laurel" ? rf - 15 : p.frame === "ring" ? rf - 12 : rf - 9;
    const fs = Math.min(ri * (chars.length === 1 ? 1.15 : 0.92), rIn / Math.sqrt((em / 2) ** 2 + 0.38 ** 2));
    sw = Math.max(0.8, fs * 0.018);
    const tl = chars.length > 1 ? ` textLength="${f(em * fs)}" lengthAdjust="spacingAndGlyphs"` : "";
    mono = `<text x="${f(dx)}" y="${f(dy)}" dy="0.35em" text-anchor="middle"${tl} font-family="${fam}" font-size="${f(fs)}" font-weight="${p.letterStyle === "serif" ? 600 : 700}" font-style="${p.letterStyle === "script" ? "italic" : "normal"}">${esc(raw)}</text>`;
  } else {
    const k = ri * 0.4, q = k * 0.22;
    mono = `<path d="M${f(dx)},${f(dy - k)} L${f(dx + q)},${f(dy - q)} L${f(dx + k)},${f(dy)} L${f(dx + q)},${f(dy + q)} L${f(dx)},${f(dy + k)} L${f(dx - q)},${f(dy + q)} L${f(dx - k)},${f(dy)} L${f(dx - q)},${f(dy - q)}Z"/>`;
  }
  const face = foil ? "url(#faceG)" : T(0.11, -0.03), shd = T(-0.27, 0.04), hil = T(0.32, -0.08);
  const emb = (c, w) => `<g transform="translate(1.8 2.4)" fill="${shd}" stroke="${shd}" stroke-width="${w}" stroke-linejoin="round" opacity="0.9">${c}</g><g transform="translate(-1.1 -1.3)" fill="${hil}" stroke="${hil}" stroke-width="${w}" stroke-linejoin="round" opacity="0.9">${c}</g><g fill="${face}" stroke="${face}" stroke-width="${w}" stroke-linejoin="round">${c}</g>`;

  const disc = `<circle cx="${f(dx)}" cy="${f(dy)}" r="${f(ri + 3)}" fill="none" stroke="url(#lipG)" stroke-width="2.5" opacity="0.8"/><circle cx="${f(dx)}" cy="${f(dy)}" r="${f(ri)}" fill="url(#disc)"/><circle cx="${f(dx)}" cy="${f(dy)}" r="${f(ri - 2)}" fill="none" stroke="url(#bevel)" stroke-width="4"/>`;

  let shine = "";
  if (s > 0) {
    const hx = cx - R * 0.55, hy = cy - R * 0.55;
    if (foil) {
      shine = `<rect x="${cx - R * 0.35}" y="${cy - R * 1.4}" width="${f(R * 0.5)}" height="${f(R * 2.8)}" fill="url(#band)" transform="rotate(38 ${cx} ${cy})" opacity="${(0.75 * s).toFixed(2)}"/><rect x="${f(cx + R * 0.25)}" y="${cy - R * 1.4}" width="${f(R * 0.14)}" height="${f(R * 2.8)}" fill="url(#band)" transform="rotate(38 ${cx} ${cy})" opacity="${(0.55 * s).toFixed(2)}"/>`;
      const z = 9 + 14 * s;
      shine += `<path d="M${f(hx)},${f(hy - z)} Q${f(hx)},${f(hy)} ${f(hx + z)},${f(hy)} Q${f(hx)},${f(hy)} ${f(hx)},${f(hy + z)} Q${f(hx)},${f(hy)} ${f(hx - z)},${f(hy)} Q${f(hx)},${f(hy)} ${f(hx)},${f(hy - z)}Z" fill="#fff" opacity="${(0.95 * s).toFixed(2)}"/>`;
    } else {
      const lx = cx + R * 0.6, ly = cy + R * 0.56;
      shine = `<ellipse cx="${f(hx)}" cy="${f(hy)}" rx="${f(R * 0.26)}" ry="${f(R * 0.085)}" transform="rotate(-45 ${f(hx)} ${f(hy)})" fill="#fff" opacity="${(0.5 * s).toFixed(2)}" filter="url(#soft)"/><ellipse cx="${f(hx + 2)}" cy="${f(hy + 2)}" rx="${f(R * 0.1)}" ry="${f(R * 0.026)}" transform="rotate(-45 ${f(hx + 2)} ${f(hy + 2)})" fill="#fff" opacity="${(0.85 * s).toFixed(2)}"/><circle cx="${f(hx + R * 0.13)}" cy="${f(hy - R * 0.06)}" r="${f(R * 0.016)}" fill="#fff" opacity="${(0.8 * s).toFixed(2)}"/><ellipse cx="${f(lx)}" cy="${f(ly)}" rx="${f(R * 0.14)}" ry="${f(R * 0.035)}" transform="rotate(-45 ${f(lx)} ${f(ly)})" fill="#fff" opacity="${(0.28 * s).toFixed(2)}" filter="url(#blur1)"/>`;
    }
    shine += `<path d="M${f(dx + Math.cos(0.25) * (ri - 3))},${f(dy + Math.sin(0.25) * (ri - 3))} A${f(ri - 3)},${f(ri - 3)} 0 0 1 ${f(dx + Math.cos(1.15) * (ri - 3))},${f(dy + Math.sin(1.15) * (ri - 3))}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="${(0.45 * s).toFixed(2)}"/>`;
  }

  const rimLight = `<path d="${blob}" fill="none" stroke="${T(darkBg ? 0.3 : 0.18, -0.06)}" stroke-width="1.4" opacity="${darkBg ? 0.8 : 0.45}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">${defs}<rect width="${S}" height="${S}" fill="${bg}"/><rect width="${S}" height="${S}" filter="url(#grain)"/><rect width="${S}" height="${S}" fill="url(#vig)"/><g filter="url(#shadow)">${under}<path d="${blob}" fill="${sealFill}"/></g><g clip-path="url(#clip)">${rim}${disc}${emb(frame, 0)}${emb(mono, f(sw))}${shine}</g>${rimLight}${over}</svg>`;
}
