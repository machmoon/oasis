// Friendly failure illustration: unplugged cable, toppled road sign or spilled coffee, with one anchored severity marker.
export const meta = {
  title: "Gentle Mishaps",
  kind: "illustration",
  description: "Friendly error-state spot illustrations (unplugged cable, warning sign, spilled coffee) for empty states, 404s and failed actions.",
  tags: ["error", "empty state", "warning", "404", "illustration", "ui", "failure", "spot"],
  price: 5,
  author: "oasis-factory",
  size: [640, 520],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#F6F2EA" },
    surface: { type: "color", role: "surface", label: "Backdrop shape", default: "#EAE2D3" },
    ink: { type: "color", role: "ink", label: "Ink", default: "#1F1B2D" },
    primary: { type: "color", role: "primary", label: "Object colour", default: "#6C8CFF" },
    scenario: { type: "choice", label: "Scenario", default: "plug", options: ["plug", "sign", "coffee"] },
    severity: { type: "choice", label: "Severity", default: "warning", options: ["warning", "error"] },
    shape: { type: "choice", label: "Background shape", default: "blob", options: ["blob", "circle", "squircle", "none"] },
    lineWeight: { type: "range", label: "Line weight", default: 3.5, min: 2, max: 6, step: 0.5 },
    seed: { type: "range", label: "Seed", default: 7, min: 1, max: 100, step: 1 },
    headline: { type: "text", label: "Headline (empty hides caption)", default: "Well, that didn't work" },
  },
  presets: {
    Mint: { background: "#EEF6F1", surface: "#D2E9DD", ink: "#12352A", primary: "#3FB58A", scenario: "coffee", severity: "warning", shape: "circle" },
    Midnight: { background: "#14141C", surface: "#25253A", ink: "#F1EFE8", primary: "#8B7BFF", scenario: "sign", severity: "error", shape: "squircle" },
    Blush: { background: "#FFF1EE", surface: "#FFD8CF", ink: "#3A1D24", primary: "#FF8A5B", scenario: "plug", severity: "error", shape: "blob" },
    Harbour: { background: "#EAF2FB", surface: "#CFE0F4", ink: "#13294B", primary: "#2EC4B6", scenario: "coffee", severity: "error", shape: "none" },
  },
};

const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (c) => { const [r, g, b] = hex(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const ensure = (c, against, min, toward) => { for (let t = 0; t <= 1.001; t += 0.05) { const m = mix(c, toward, t); if (cr(m, against) >= min) return m; } return toward; };
const best = (c) => (cr("#FFFFFF", c) >= cr("#17171C", c) ? "#FFFFFF" : "#17171C");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f = (n) => n.toFixed(1);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blobPath(R, n, r) {
  const ang = (Math.PI * 2) / n, pts = [];
  for (let i = 0; i < n; i++) { const rad = R * (0.84 + 0.18 * r()); pts.push([Math.sin(i * ang) * rad, Math.cos(i * ang) * rad]); }
  const k = ((4 / 3) * Math.tan(ang / 4)) / (2 * Math.sin(ang));
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) * k)},${f(p1[1] + (p2[1] - p0[1]) * k)} ${f(p2[0] - (p3[0] - p1[0]) * k)},${f(p2[1] - (p3[1] - p1[1]) * k)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + "Z";
}

export default function render(p) {
  const W = 640, H = 520, lw = p.lineWeight;
  const bg = p.background, dark = lum(bg) < 0.18;
  const ink = ensure(p.ink, bg, 4.5, best(bg));
  const shapeFill = ensure(p.surface, bg, 1.2, dark ? "#FFFFFF" : ink);
  const backdrop = p.shape === "none" ? bg : shapeFill;
  const primary = ensure(p.primary, ink, 1.8, bg);
  const card = ensure(dark ? mix(bg, "#FFFFFF", 0.22) : mix(bg, "#FFFFFF", 0.85), primary, 1.6, best(primary));
  const muted = ensure(mix(ink, bg, dark ? 0.2 : 0.4), bg, dark ? 8 : 5.5, ink);
  const decor = ensure(mix(ink, bg, 0.6), backdrop, 1.6, ink);
  const err = p.severity === "error";
  const sev = err ? "#D93036" : "#F2A516", sevFg = best(sev);
  const coffee = "#6B4226", coffeeDeep = "#3E2414";
  const gw = lw * 1.15 + 1.6;
  const L = `stroke="${ink}" stroke-width="${lw}" stroke-linejoin="round" stroke-linecap="round"`;
  const tube = (d, fill) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${10 + 2 * lw}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${fill}" stroke-width="10" stroke-linecap="round"/>`;

  const glyph = (x, y, u, w, col) => {
    if (err) return `<path d="M${f(x - u)} ${f(y - u)}L${f(x + u)} ${f(y + u)}M${f(x + u)} ${f(y - u)}L${f(x - u)} ${f(y + u)}" stroke="${col}" stroke-width="${f(w)}" stroke-linecap="round"/>`;
    const dot = y + 1.05 * u, top = y - 1.3 * u + w / 2, end = Math.max(top + 1, dot - 1.5 * w);
    return `<path d="M${f(x)} ${f(top)}V${f(end)}" stroke="${col}" stroke-width="${f(w)}" stroke-linecap="round"/><circle cx="${f(x)}" cy="${f(dot)}" r="${f(w * 0.55)}" fill="${col}"/>`;
  };

  const badge = (x, y) => {
    const r = 22 + lw * 1.2;
    const d = err ? null : `M${x} ${f(y - r * 1.05)}L${f(x + r * 1.15)} ${f(y + r * 0.85)}L${f(x - r * 1.15)} ${f(y + r * 0.85)}Z`;
    const shp = (attrs) => err ? `<circle cx="${x}" cy="${y}" r="${f(r)}" ${attrs}/>` : `<path d="${d}" ${attrs}/>`;
    return shp(`fill="${backdrop}" stroke="${backdrop}" stroke-width="${f(lw + 12)}" stroke-linejoin="round"`)
      + shp(`fill="${sev}" ${L}`)
      + (err ? glyph(x, y, r * 0.34, gw, sevFg) : glyph(x, y + r * 0.16, r * 0.34, gw, sevFg));
  };

  const octagon = (cx, cy, R) => {
    let d = "";
    for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; d += `${i ? "L" : "M"}${f(cx + Math.cos(a) * R)} ${f(cy + Math.sin(a) * R)}`; }
    return d + "Z";
  };

  let art = "";
  if (p.scenario === "plug") {
    art += tube("M -96 0 C -140 0 -128 78 -178 78", primary);
    art += tube("M 118 0 C 160 0 146 70 192 70", card);
    art += `<rect x="-30" y="-21" width="28" height="9" rx="3" fill="${ink}"/><rect x="-30" y="12" width="28" height="9" rx="3" fill="${ink}"/>`;
    art += `<rect x="-100" y="-34" width="72" height="68" rx="16" fill="${primary}" ${L}/>`;
    art += `<path d="M -80 -14V14M -66 -14V14" fill="none" ${L}/>`;
    art += `<rect x="46" y="-44" width="76" height="88" rx="18" fill="${card}" ${L}/>`;
    art += `<rect x="58" y="-21" width="20" height="9" rx="3" fill="${ink}"/><rect x="58" y="12" width="20" height="9" rx="3" fill="${ink}"/>`;
    art += `<path d="M20 -30V-46M8 -26L2 -36M32 -26L38 -36M20 30V46M8 26L2 36M32 26L38 36" fill="none" ${L}/>`;
    art += badge(118, -44);
  } else if (p.scenario === "sign") {
    const cx = -40, cy = -44, ring = Math.max(2.5, lw * 0.8);
    art += `<g transform="rotate(-7 -40 104)">`;
    art += `<rect x="-47" y="-40" width="14" height="144" rx="4" fill="${card}" ${L}/>`;
    if (err) {
      art += `<path d="${octagon(cx, cy, 76)}" fill="${sev}" ${L}/><path d="${octagon(cx, cy, 62)}" fill="none" stroke="${sevFg}" stroke-width="${f(ring)}" stroke-linejoin="round"/>`;
    } else {
      art += `<rect x="${cx - 54}" y="${cy - 54}" width="108" height="108" rx="16" transform="rotate(45 ${cx} ${cy})" fill="${sev}" ${L}/>`;
      art += `<rect x="${cx - 42}" y="${cy - 42}" width="84" height="84" rx="10" transform="rotate(45 ${cx} ${cy})" fill="none" stroke="${sevFg}" stroke-width="${f(ring)}"/>`;
    }
    art += glyph(cx, cy + (err ? 0 : -4), 22, lw + 5, sevFg) + `</g>`;
    const cone = "M54 94L70 6Q80 -8 90 6L106 94Z";
    art += `<path d="${cone}" fill="${primary}"/><g clip-path="url(#coneClip)"><rect x="40" y="30" width="80" height="14" fill="${card}"/><rect x="40" y="60" width="80" height="14" fill="${card}"/></g>`;
    art += `<path d="${cone}" fill="none" ${L}/><rect x="34" y="92" width="92" height="14" rx="5" fill="${primary}" ${L}/>`;
  } else {
    art += `<g transform="translate(-24 0)">`;
    art += `<path d="M-6 100C-4 84 34 82 58 88C86 78 152 82 150 98C148 110 0 112 -6 100Z" fill="${coffee}" ${L}/>`;
    art += `<ellipse cx="96" cy="93" rx="16" ry="3" fill="#FFFFFF" opacity="0.28"/>`;
    art += tube("M -96 24 C -96 -18 -40 -18 -40 24", primary);
    art += `<rect x="-124" y="24" width="124" height="78" rx="16" fill="${primary}"/><rect x="-80" y="24" width="16" height="78" fill="${card}"/>`;
    art += `<rect x="-124" y="24" width="124" height="78" rx="16" fill="none" ${L}/>`;
    art += `<ellipse cx="0" cy="63" rx="15" ry="39" fill="${coffeeDeep}" ${L}/>`;
    art += `<path d="M2 92C12 96 20 98 34 96" fill="none" stroke="${coffee}" stroke-width="8" stroke-linecap="round"/>`;
    const sw = Math.max(1.5, lw * 0.6);
    art += [[50, 60, 6], [78, 48, 4.5], [104, 64, 3.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${coffee}" stroke="${ink}" stroke-width="${sw}"/>`).join("");
    const sx = 158;
    art += `<path d="M${sx - 26} 106L${sx - 14} 26Q${sx} 16 ${sx + 14} 26L${sx + 26} 106" fill="${sev}" ${L}/>`;
    art += `<path d="M${sx - 20} 92H${sx + 20}" fill="none" ${L}/>`;
    art += glyph(sx, err ? 56 : 58, 10, gw, sevFg) + `</g>`;
  }

  let back = "";
  if (p.shape === "blob") back = `<path d="${blobPath(164, 6, rng(p.seed * 7919))}" transform="translate(0 -4)" fill="${shapeFill}"/>`;
  else if (p.shape === "circle") back = `<circle cx="0" cy="-4" r="160" fill="${shapeFill}"/>`;
  else if (p.shape === "squircle") back = `<rect x="-150" y="-154" width="300" height="300" rx="96" fill="${shapeFill}"/>`;

  const r = rng(p.seed * 131 + 17), dw = Math.max(1.5, lw * 0.75);
  const mark = (x, y, t) => t === 0
    ? `<circle cx="${f(x)}" cy="${f(y)}" r="4" fill="${decor}"/>`
    : t === 1
      ? `<path d="M${f(x - 7)} ${f(y)}H${f(x + 7)}M${f(x)} ${f(y - 7)}V${f(y + 7)}" stroke="${decor}" stroke-width="${f(dw)}" stroke-linecap="round"/>`
      : `<circle cx="${f(x)}" cy="${f(y)}" r="6" fill="none" stroke="${decor}" stroke-width="${f(dw)}"/>`;
  let scatter = "";
  [28, 52, 76].forEach((slot) => {
    const a = ((slot + (r() - 0.5) * 12) * Math.PI) / 180, rad = 188 + r() * 14, t = Math.floor(r() * 3);
    const x = Math.sin(a) * rad, y = -4 - Math.cos(a) * rad;
    scatter += mark(-x, y, t) + mark(x, y, t);
  });

  const head = String(p.headline || "").trim();
  const cy = head ? 222 : 256;
  let caption = "";
  if (head) {
    const fs = Math.max(16, Math.min(28, 560 / (head.length * 0.56)));
    const font = "Helvetica Neue, Helvetica, Arial, sans-serif";
    const sub = err ? "We couldn't finish that. Please try again." : "Something went sideways. Give it another try.";
    caption = `<text x="${W / 2}" y="440" text-anchor="middle" font-family="${font}" font-size="${f(fs)}" font-weight="600" letter-spacing="-0.3" fill="${ink}">${esc(head)}</text>`
      + `<text x="${W / 2}" y="470" text-anchor="middle" font-family="${font}" font-size="16" fill="${muted}">${sub}</text>`;
  }

  const defs = `<defs><clipPath id="coneClip"><path d="M54 94L70 6Q80 -8 90 6L106 94Z"/></clipPath></defs>`;
  const ground = `<ellipse cx="0" cy="110" rx="132" ry="7" fill="${dark ? "#000000" : ink}" opacity="${dark ? 0.35 : 0.1}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}<rect width="${W}" height="${H}" fill="${bg}"/><g transform="translate(${W / 2} ${cy})">${back}${scatter}${ground}${art}</g>${caption}</svg>`;
}
