// Heritage badge emblem: circle, seal, hexagon or shield with optically centred arc lettering, tiered rings, star arc and a centre icon.
export const meta = {
  title: "Heritage Badge Emblem",
  kind: "brand",
  description: "A vintage-style emblem with curved top and bottom lettering, tiered rings, stars and a centre icon, for logos, merch, labels and stickers.",
  tags: ["badge", "emblem", "logo", "seal", "vintage", "crest", "label", "stamp"],
  price: 6,
  author: "oasis-factory",
  size: [600, 600],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#EFE8DA" },
    badge: { type: "color", role: "primary", label: "Badge", default: "#1F3A34" },
    accent: { type: "color", role: "highlight", label: "Accent", default: "#D9A441" },
    shape: { type: "choice", label: "Outline shape", default: "circle", options: ["circle", "seal", "hexagon", "shield"] },
    icon: { type: "choice", label: "Centre icon", default: "mountain", options: ["mountain", "pine", "anchor", "compass", "crown"] },
    type: { type: "choice", label: "Typeface", default: "serif", options: ["serif", "grotesk", "condensed", "typewriter"] },
    topText: { type: "text", label: "Top text", default: "Northwind Outfitters" },
    bottomText: { type: "text", label: "Bottom text", default: "Mountain Supply" },
    year: { type: "text", label: "Est. year", default: "1998" },
    rings: { type: "range", label: "Ring count", default: 2, min: 1, max: 4, step: 1 },
    stars: { type: "range", label: "Stars", default: 3, min: 0, max: 7, step: 1 },
  },
  presets: {
    Brass: { background: "#14181F", badge: "#1D2633", accent: "#C9A45C", shape: "seal", icon: "compass", type: "grotesk", rings: 3, stars: 5 },
    Cherry: { background: "#F6EFE6", badge: "#9E2B25", accent: "#F2D7A6", shape: "shield", icon: "pine", type: "condensed", rings: 1, stars: 0 },
    Mint: { background: "#DDEFE6", badge: "#FFFFFF", accent: "#1E7A5A", shape: "hexagon", icon: "anchor", type: "typewriter", rings: 4, stars: 7 },
    Cobalt: { background: "#F1EDE4", badge: "#2747A8", accent: "#F2B544", shape: "circle", icon: "crown", type: "serif", rings: 3, stars: 1 },
  },
};

const TYPES = {
  serif: { f: "Georgia, 'Times New Roman', Times, serif", cw: 0.76, ls: 0.12, st: "" },
  grotesk: { f: "'Helvetica Neue', Helvetica, Arial, sans-serif", cw: 0.74, ls: 0.2, st: "" },
  condensed: { f: "'Avenir Next Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif", cw: 0.6, ls: 0.16, st: ` font-stretch="condensed"` },
  typewriter: { f: "'Courier New', Courier, monospace", cw: 0.6, ls: 0.08, st: "" },
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f1 = (n) => n.toFixed(1);

function rgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hex(c) {
  return "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function mix(a, b, t) {
  const x = rgb(a), y = rgb(b);
  return hex(x.map((v, i) => v + (y[i] - v) * t));
}
function lum(h) {
  const c = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function best(fill, cands) {
  return cands.reduce((m, c) => (contrast(c, fill) > contrast(m, fill) ? c : m), cands[0]);
}
function deriveAccent(acc, badge, fg) {
  const ok = (c) => contrast(c, badge) >= 1.9 && contrast(c, fg) >= 1.6;
  if (ok(acc)) return acc;
  for (let t = 0.08; t < 0.95; t += 0.08) {
    for (const tgt of ["#000000", "#FFFFFF"]) { const c = mix(acc, tgt, t); if (ok(c)) return c; }
  }
  return mix(mix(badge, fg, 0.5), acc, 0.3);
}

function circ(r) {
  return `M${f1(-r)},0 A${f1(r)},${f1(r)} 0 1 0 ${f1(r)},0 A${f1(r)},${f1(r)} 0 1 0 ${f1(-r)},0Z`;
}

function shapePath(shape, d) {
  if (shape === "hexagon") {
    const R = (272 - d) / Math.cos(Math.PI / 6);
    let s = "";
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      s += (i ? "L" : "M") + f1(R * Math.cos(a)) + "," + f1(R * Math.sin(a));
    }
    return s + "Z";
  }
  if (shape === "shield") {
    const w = 272 - d, yT = -(272 - d), B = 330 - d * 1.3;
    return `M${f1(-w)},${f1(yT + 6)} Q0,${f1(yT - 14)} ${f1(w)},${f1(yT + 6)} L${f1(w)},40 C${f1(w)},200 ${f1(140 - d * 0.5)},${f1(290 - d * 0.3)} 0,${f1(B)} C${f1(-140 + d * 0.5)},${f1(290 - d * 0.3)} ${f1(-w)},200 ${f1(-w)},40Z`;
  }
  if (shape === "seal" && d === 0) {
    let s = "";
    for (let i = 0; i < 216; i++) {
      const a = (i / 216) * Math.PI * 2, r = 276 + 8 * Math.cos(a * 36);
      s += (i ? "L" : "M") + f1(r * Math.cos(a)) + "," + f1(r * Math.sin(a));
    }
    return s + "Z";
  }
  return circ(272 - d);
}

function star(cx, cy, r, fill) {
  let s = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r;
    s += (i ? "L" : "M") + f1(cx + rr * Math.cos(a)) + "," + f1(cy + rr * Math.sin(a));
  }
  return `<path d="${s}Z" fill="${fill}"/>`;
}

function icon(name, fg, ac, disc) {
  const st = `fill="none" stroke="${fg}" stroke-linecap="round" stroke-linejoin="round"`;
  if (name === "pine")
    return `<path d="M50,4 L71,34 L60,34 L80,58 L66,58 L88,84 L12,84 L34,58 L20,58 L40,34 L29,34Z" fill="${fg}"/><rect x="44" y="84" width="12" height="12" rx="1.5" fill="${fg}"/><path d="M50,4 L58,15 L50,12 L42,15Z M34,58 L40,58 L44,64Z M66,58 L60,58 L56,64Z" fill="${ac}"/>`;
  if (name === "anchor")
    return `<g ${st} stroke-width="7"><circle cx="50" cy="15" r="8"/><path d="M50,23 V88"/><path d="M33,38 H67"/><path d="M16,62 Q20,88 50,89 Q80,88 84,62"/></g><path d="M8,68 L16,54 L25,66Z M92,68 L84,54 L75,66Z" fill="${fg}"/><circle cx="50" cy="15" r="3.5" fill="${ac}"/><circle cx="33" cy="38" r="4" fill="${ac}"/><circle cx="67" cy="38" r="4" fill="${ac}"/>`;
  if (name === "compass")
    return `<circle cx="50" cy="50" r="42" ${st} stroke-width="5"/><g ${st} stroke-width="4"><path d="M50,4 V12 M50,88 V96 M4,50 H12 M88,50 H96"/></g><path d="M50,14 L59,50 L50,86 L41,50Z" fill="${fg}"/><path d="M50,14 L59,50 L41,50Z" fill="${ac}"/><path d="M14,50 L50,44 L86,50 L50,56Z" fill="${fg}" opacity="0.55"/><circle cx="50" cy="50" r="4" fill="${disc}" stroke="${fg}" stroke-width="2"/>`;
  if (name === "crown")
    return `<path d="M15,76 L10,32 L32,54 L50,22 L68,54 L90,32 L85,76Z" fill="${fg}" stroke="${fg}" stroke-width="3" stroke-linejoin="round"/><rect x="14" y="81" width="72" height="10" rx="2.5" fill="${fg}"/><circle cx="10" cy="30" r="6" fill="${ac}"/><circle cx="50" cy="19" r="6" fill="${ac}"/><circle cx="90" cy="30" r="6" fill="${ac}"/><path d="M50,58 L55,65 L50,72 L45,65Z" fill="${ac}"/>`;
  return `<circle cx="20" cy="20" r="9" fill="${ac}"/>` +
    `<path d="M34,86 L64,18 L98,86Z" fill="${fg}"/>` +
    `<path d="M64,18 L74,39 L69,36 L64,42 L58,35 L54.7,39Z" fill="${ac}"/>` +
    `<path d="M2,86 L34,40 L66,86Z" fill="${fg}" stroke="${disc}" stroke-width="3.5" stroke-linejoin="round"/>` +
    `<path d="M34,40 L43.7,54 L39,51 L34,57 L29,51 L24.3,54Z" fill="${ac}"/>` +
    `<path d="M4,95 H96" stroke="${fg}" stroke-width="4" stroke-linecap="round"/>`;
}

function fit(n, F, r, span) {
  const units = n * F.cw + Math.max(0, n - 1) * F.ls;
  return Math.max(13, Math.min(30, (r * span) / Math.max(units, 0.01)));
}

export default function render(p) {
  const S = 600, bg = p.background, badge = p.badge;
  const F = TYPES[p.type] || TYPES.serif;
  const fg = best(badge, [bg, "#FFFFFF", "#141414"]);
  const ac = deriveAccent(p.accent, badge, fg);
  const disc = mix(badge, fg, 0.06);
  const light = lum(bg) > 0.4;
  const glow = light ? mix(bg, "#FFFFFF", 0.35) : mix(bg, "#FFFFFF", 0.07);
  const shadow = mix(bg, "#000000", light ? 0.22 : 0.55);
  const n = Math.round(p.rings), nStars = Math.round(p.stars);
  const T = { circle: [1, 0], seal: [0.95, 0], hexagon: [0.86, 0], shield: [0.84, -26] }[p.shape] || [1, 0];

  const topRaw = String(p.topText || "").toUpperCase().slice(0, 26);
  const botRaw = String(p.bottomText || "").toUpperCase().slice(0, 26);
  const yr = String(p.year || "").trim().toUpperCase().slice(0, 6);
  const SPAN = (2 * 68 * Math.PI) / 180, MID = 213;
  const fsT = fit(topRaw.length, F, MID, SPAN), fsB = fit(botRaw.length, F, MID, SPAN);
  const rT = MID - 0.35 * fsT, rB = MID + 0.35 * fsB;

  const ringC = (r, sw, col, x = "") => `<path d="${circ(r)}" fill="none" stroke="${col}" stroke-width="${sw}"${x}/>`;
  const ringO = (d, sw, col, x = "") => `<path d="${shapePath(p.shape, d)}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linejoin="round"${x}/>`;
  let lines = ringO(32, 2.4, fg) + ringC(186, 2.4, fg);
  if (n >= 2) lines += ringO(26, 1.2, fg) + ringC(180, 1.2, fg);
  if (n >= 3) {
    const bead = ` stroke-dasharray="0.1 8" stroke-linecap="round"`;
    lines += ringO(17, 3.4, ac, bead) + ringC(172, 3.4, ac, bead);
  }
  if (n >= 4) lines += ringO(8, 7, fg, ` stroke-dasharray="1.3 3.7" opacity="0.85"`);

  let stars = "";
  for (let i = 0; i < nStars; i++) {
    const off = i - (nStars - 1) / 2;
    const a = ((-90 + off * 17) * Math.PI) / 180;
    stars += star(144 * Math.cos(a), 144 * Math.sin(a), 10.5 - Math.abs(off) * 1.1, ac);
  }
  const side = nStars > 0
    ? star(-MID, 0, 8.5, ac) + star(MID, 0, 8.5, ac)
    : [-MID, MID].map((x) => `<path d="M${x},-5 L${x + 5},0 L${x},5 L${x - 5},0Z" fill="${ac}"/>`).join("");

  const hasYear = yr.length > 0, hasStars = nStars > 0;
  const isz = hasYear ? (hasStars ? 168 : 184) : (hasStars ? 186 : 206);
  const icy = hasYear ? (hasStars ? -16 : -26) : (hasStars ? 10 : 0);
  const iconG = `<g transform="translate(${f1(-isz / 2)} ${f1(icy - isz / 2)}) scale(${(isz / 100).toFixed(3)})">${icon(p.icon, fg, ac, disc)}</g>`;

  let yearG = "";
  if (hasYear) {
    const fs = 16, ls = fs * 0.24, yb = hasStars ? 112 : 110, gap = 13;
    const dw = Math.min(F.cw * 0.85, 0.62);
    const w1 = 3 * fs * F.cw + 2 * ls, w2 = yr.length * fs * dw + (yr.length - 1) * ls;
    const t = (x, anchor, s) => `<text x="${f1(x)}" y="${yb}" text-anchor="${anchor}" font-family="${F.f}"${F.st} font-weight="700" font-size="${fs}" letter-spacing="${f1(ls)}" fill="${fg}">${esc(s)}</text>`;
    const my = yb - fs * 0.35;
    yearG = t(-gap, "end", "EST") + t(gap, "start", yr) +
      `<path d="M0,${f1(my - 4)} L4,${f1(my)} L0,${f1(my + 4)} L-4,${f1(my)}Z" fill="${ac}"/>` +
      `<path d="M${f1(-gap - w1 - 10)},${f1(my)} H${f1(-gap - w1 - 38)} M${f1(gap + w2 + 10)},${f1(my)} H${f1(gap + w2 + 38)}" stroke="${ac}" stroke-width="2" stroke-linecap="round"/>`;
  }

  const txt = (id, s, fs) => s ? `<text font-family="${F.f}"${F.st} font-weight="700" font-size="${f1(fs)}" letter-spacing="${f1(fs * F.ls)}" fill="${fg}" text-anchor="middle"><textPath href="#${id}" xlink:href="#${id}" startOffset="50%">${esc(s)}</textPath></text>` : "";

  const outline = shapePath(p.shape, 0);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">` +
    `<defs><radialGradient id="bgg" cx="0.5" cy="0.45" r="0.7"><stop offset="0" stop-color="${glow}"/><stop offset="1" stop-color="${bg}"/></radialGradient>` +
    `<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="12"/></filter>` +
    `<path id="arcT" d="M${f1(-rT)},0 A${f1(rT)},${f1(rT)} 0 0 1 ${f1(rT)},0"/><path id="arcB" d="M${f1(-rB)},0 A${f1(rB)},${f1(rB)} 0 0 0 ${f1(rB)},0"/></defs>` +
    `<rect width="${S}" height="${S}" fill="url(#bgg)"/>` +
    `<g transform="translate(300 ${f1(300 + T[1])}) scale(${T[0]})">` +
    `<path d="${outline}" transform="translate(0 10)" fill="${shadow}" opacity="0.55" filter="url(#sh)"/>` +
    `<path d="${outline}" fill="${badge}" stroke="${ac}" stroke-width="6" stroke-linejoin="round"/>` +
    `<path d="${circ(186)}" fill="${disc}"/>` +
    lines + txt("arcT", topRaw, fsT) + txt("arcB", botRaw, fsB) +
    side + stars + iconG + yearG +
    `</g></svg>`;
}
