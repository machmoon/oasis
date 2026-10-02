// Mobile onboarding carousel: a centred phone on the active step, neighbouring steps peeking, brand-tunable everything.
export const meta = {
  title: "Onboarding Carousel",
  kind: "ui",
  description: "A polished multi-step mobile onboarding flow with illustration, copy, pagination and CTA, for app pitches, case studies and prototypes.",
  tags: ["onboarding", "mobile", "app", "carousel", "walkthrough", "ui", "pagination", "mockup"],
  price: 9,
  author: "oasis-factory",
  size: [1200, 900],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Backdrop", default: "#ECE8E1" },
    surface: { type: "color", role: "surface", label: "Screen", default: "#FFFFFF" },
    ink: { type: "color", role: "ink", label: "Text", default: "#16161D" },
    primary: { type: "color", role: "primary", label: "Accent", default: "#5B4CF0" },
    secondary: { type: "color", role: "secondary", label: "Illustration tint", default: "#FFB86B" },
    dotStyle: { type: "choice", label: "Pagination", default: "pills", options: ["dots", "pills", "bars", "numbers"] },
    steps: { type: "range", label: "Step count", default: 3, min: 2, max: 5, step: 1 },
    active: { type: "range", label: "Active step", default: 2, min: 1, max: 5, step: 1 },
    radius: { type: "range", label: "Corner radius", default: 20, min: 0, max: 32, step: 1 },
    skip: { type: "toggle", label: "Skip link", default: true },
  },
  presets: {
    Iris: { background: "#ECE8E1", surface: "#FFFFFF", ink: "#16161D", primary: "#5B4CF0", secondary: "#FFB86B" },
    Matcha: { background: "#E3EADF", surface: "#FBFCF8", ink: "#1D2A22", primary: "#2F7A55", secondary: "#B9D98C" },
    Midnight: { background: "#0B0C12", surface: "#171923", ink: "#F2F2F7", primary: "#7C6CFF", secondary: "#3DD6C6" },
    Coral: { background: "#FBE6DD", surface: "#FFFBF8", ink: "#2A1A17", primary: "#F2542D", secondary: "#FFC857" },
  },
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const COPY = [
  { h: ["Find your", "rhythm"], b: ["Discover routines that fit the way", "you actually live and work."] },
  { h: ["Plan without", "the noise"], b: ["Line up your week in seconds and", "let the small details sort out."] },
  { h: ["Bring your", "people along"], b: ["Share plans, swap notes and keep", "everyone in step, wherever they are."] },
  { h: ["Watch your", "progress grow"], b: ["Gentle check-ins show how far", "you\u2019ve come, one day at a time."] },
  { h: ["You\u2019re all", "set to begin"], b: ["Your space is ready. Take a breath,", "then let\u2019s make today count."] },
];

const hx = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const lum = (c) => { const [r, g, b] = hx(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
const f = (v) => +v.toFixed(1);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ill(k, cx, cy, c) {
  const { P, S, F, I, Fa, rr, onP } = c;
  const sh = ' filter="url(#sh)"';
  const halo = `<circle cx="${cx}" cy="${cy}" r="118" fill="${S}" opacity="0.3"/>`;
  const t = k % 5;
  if (t === 0) {
    const chip = (x, y, col) => `<rect x="${x}" y="${y}" width="96" height="36" rx="${Math.min(18, rr)}" fill="${F}"${sh}/><circle cx="${x + 18}" cy="${y + 18}" r="7" fill="${col}"/><rect x="${x + 32}" y="${y + 15}" width="48" height="6" rx="3" fill="${Fa}"/>`;
    return halo + `<circle cx="${cx}" cy="${cy}" r="80" fill="${F}"${sh}/><circle cx="${cx}" cy="${cy}" r="64" fill="none" stroke="${I}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="1 7" stroke-linecap="round"/>` +
      `<g transform="rotate(35 ${cx} ${cy})"><path d="M${cx} ${cy - 52}L${cx + 13} ${cy}L${cx - 13} ${cy}Z" fill="${P}"/><path d="M${cx} ${cy + 52}L${cx + 13} ${cy}L${cx - 13} ${cy}Z" fill="${S}"/></g>` +
      `<circle cx="${cx}" cy="${cy}" r="6" fill="${F}" stroke="${I}" stroke-width="2"/>` + chip(cx - 140, cy - 100, P) + chip(cx + 44, cy + 64, S);
  }
  if (t === 1) {
    const x = cx - 104, y = cy - 90, w = 208, h = 184, r = Math.min(rr, 22);
    let s = halo + `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rr}" fill="${F}"${sh}/>`;
    s += `<path d="M${x} ${y + 44}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + 44}Z" fill="${P}"/>`;
    s += `<rect x="${x + 20}" y="${y + 19}" width="64" height="7" rx="3.5" fill="${onP}" opacity="0.85"/>`;
    s += `<rect x="${x + 50}" y="${y - 10}" width="8" height="22" rx="4" fill="${I}"/><rect x="${x + w - 58}" y="${y - 10}" width="8" height="22" rx="4" fill="${I}"/>`;
    for (let i = 0; i < 15; i++) {
      const gx = cx - 85 + (i % 5) * 36, gy = y + 62 + Math.floor(i / 5) * 36;
      const fill = i === 9 ? P : [2, 5, 7, 11, 13].includes(i) ? S : Fa;
      s += `<rect x="${gx}" y="${gy}" width="26" height="26" rx="${Math.min(8, rr / 2)}" fill="${fill}"/>`;
      if (i === 9) s += `<path d="M${gx + 8} ${gy + 13.5}l3.5 3.5 7-7" fill="none" stroke="${onP}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    const bx = x + w - 4, by = y + h - 4;
    return s + `<circle cx="${bx}" cy="${by}" r="24" fill="${S}" stroke="${F}" stroke-width="5"/><path d="M${bx - 9} ${by}l6 6 12-12" fill="none" stroke="${I}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (t === 2) {
    const av = (ax, ay, col) => `<circle cx="${ax}" cy="${ay}" r="40" fill="${F}"${sh}/><circle cx="${ax}" cy="${ay - 9}" r="12" fill="${col}"/><path d="M${ax - 22} ${ay + 26}a22 18 0 0 1 44 0Z" fill="${col}"/>`;
    const br = Math.min(rr, 23);
    let s = halo + av(cx - 72, cy - 36, P) + av(cx + 72, cy + 52, mix(S, I, 0.15));
    s += `<rect x="${cx - 18}" y="${cy - 96}" width="128" height="46" rx="${br}" fill="${P}"/><rect x="${cx - 2}" y="${cy - 82}" width="80" height="6" rx="3" fill="${onP}" opacity="0.9"/><rect x="${cx - 2}" y="${cy - 70}" width="52" height="6" rx="3" fill="${onP}" opacity="0.55"/>`;
    s += `<rect x="${cx - 118}" y="${cy + 40}" width="114" height="46" rx="${br}" fill="${F}"${sh}/>`;
    [0.25, 0.45, 0.7].forEach((o, i) => { s += `<circle cx="${cx - 81 + i * 20}" cy="${cy + 63}" r="5" fill="${I}" opacity="${o}"/>`; });
    return s;
  }
  if (t === 3) {
    const base = cy + 64, hs = [40, 62, 52, 86, 112];
    let s = halo + `<rect x="${cx - 110}" y="${cy - 90}" width="220" height="180" rx="${rr}" fill="${F}"${sh}/><rect x="${cx - 92}" y="${base}" width="184" height="2" rx="1" fill="${Fa}"/>`;
    const pts = [];
    hs.forEach((h, i) => {
      const bx = cx - 87 + i * 38;
      s += `<rect x="${bx}" y="${base - h}" width="22" height="${h}" rx="${f(Math.min(6, rr / 2))}" fill="${i === 4 ? P : S}" opacity="${i === 4 ? 1 : f(0.5 + i * 0.12)}"/>`;
      pts.push([bx + 11, base - h - 16]);
    });
    s += `<polyline points="${pts.map((q) => q.join(",")).join(" ")}" fill="none" stroke="${I}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach((q) => { s += `<circle cx="${q[0]}" cy="${q[1]}" r="4" fill="${F}" stroke="${I}" stroke-width="2"/>`; });
    return s + `<rect x="${cx - 94}" y="${cy - 74}" width="66" height="26" rx="${Math.min(13, rr)}" fill="${mix(P, F, 0.86)}"/><text x="${cx - 61}" y="${cy - 56}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="700" fill="${P}">+24%</text>`;
  }
  const r = rng(7);
  let s = halo + `<circle cx="${cx}" cy="${cy}" r="96" fill="none" stroke="${F}" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>`;
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + r() * 0.25, d = 106 + r() * 30;
    const x = f(cx + Math.cos(a) * d), y = f(cy + Math.sin(a) * d), big = i % 4 === 0;
    s += big ? `<circle cx="${x}" cy="${y}" r="3.5" fill="${[P, I][i % 2]}" opacity="${i % 2 ? 0.4 : 1}"/>`
      : `<rect x="${x - 6}" y="${y - 2.5}" width="12" height="5" rx="2.5" fill="${[P, S, I][i % 3]}" opacity="${i % 3 === 2 ? 0.45 : 1}" transform="rotate(${f(r() * 180)} ${x} ${y})"/>`;
  }
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? 14 : 34;
    d += (i ? "L" : "M") + f(cx + Math.cos(a) * rad) + " " + f(cy + Math.sin(a) * rad);
  }
  return s + `<circle cx="${cx}" cy="${cy}" r="72" fill="${P}"${sh}/><path d="${d}Z" fill="${onP}" stroke="${onP}" stroke-width="4" stroke-linejoin="round"/>`;
}

function dots(style, n, a, c) {
  const { P, I, M, Fa } = c, L = 34, R = 346, y = 636;
  let s = "";
  if (style === "dots") {
    for (let i = 0; i < n; i++) s += `<circle cx="${L + 4 + i * 18}" cy="${y}" r="4" fill="${i === a ? P : Fa}"/>`;
  } else if (style === "pills") {
    let x = L;
    for (let i = 0; i < n; i++) { const w = i === a ? 26 : 8; s += `<rect x="${x}" y="${y - 4}" width="${w}" height="8" rx="4" fill="${i === a ? P : Fa}"/>`; x += w + 7; }
  } else if (style === "bars") {
    const g = 6, w = (R - L - g * (n - 1)) / n;
    for (let i = 0; i < n; i++) s += `<rect x="${f(L + i * (w + g))}" y="${y - 2}" width="${f(w)}" height="4" rx="2" fill="${i <= a ? P : Fa}"/>`;
  } else {
    const tx = L + 66, tw = R - tx;
    s += `<text x="${L}" y="${y + 5}" font-family="${FONT}" font-size="15" font-weight="700" fill="${I}">0${a + 1}<tspan fill="${M}" font-weight="500"> / 0${n}</tspan></text>`;
    s += `<rect x="${tx}" y="${y - 1.5}" width="${tw}" height="3" rx="1.5" fill="${Fa}"/><rect x="${tx}" y="${y - 1.5}" width="${f((tw * (a + 1)) / n)}" height="3" rx="1.5" fill="${P}"/>`;
  }
  return s;
}

function phone(k, n, p, c) {
  const { F, I, M, P, onP, bezel, bezelStroke, top } = c, L = 34, R = 346;
  const copy = COPY[k % 5], last = k === n - 1;
  let s = `<rect width="380" height="780" rx="58" fill="${bezel}"${bezelStroke} filter="url(#ph)"/><g clip-path="url(#scr)"><rect x="10" y="10" width="360" height="760" fill="${F}"/>`;
  s += `<text x="46" y="46" font-family="${FONT}" font-size="15" font-weight="600" fill="${I}">9:41</text><rect x="135" y="24" width="110" height="32" rx="16" fill="${bezel}"/>`;
  for (let i = 0; i < 4; i++) s += `<rect x="${284 + i * 5}" y="${46 - 4 - i * 2}" width="3" height="${4 + i * 2}" rx="1" fill="${I}"/>`;
  s += `<rect x="309.5" y="35.5" width="24" height="11" rx="3" fill="none" stroke="${I}" stroke-opacity="0.45"/><rect x="311.5" y="37.5" width="16" height="7" rx="1.5" fill="${I}"/><rect x="335" y="39" width="2" height="4" rx="1" fill="${I}" opacity="0.45"/>`;
  if (p.skip) s += last
    ? `<path d="M${L + 6} 79.5l-6 5.5 6 5.5" fill="none" stroke="${M}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="${L + 14}" y="90" font-family="${FONT}" font-size="15" font-weight="500" fill="${M}">Back</text>`
    : `<text x="${R}" y="90" text-anchor="end" font-family="${FONT}" font-size="15" font-weight="500" fill="${M}">Skip</text>`;
  s += `<rect x="${L}" y="${top}" width="312" height="${444 - top}" rx="${f(p.radius * 1.2)}" fill="${c.T}"/>`;
  s += `<g clip-path="url(#pan)">${ill(k, 190, top + (444 - top) / 2, c)}</g>`;
  s += `<text font-family="${FONT}" font-size="30" font-weight="700" letter-spacing="-0.6" fill="${I}"><tspan x="${L}" y="494">${copy.h[0]}</tspan><tspan x="${L}" y="530">${copy.h[1]}</tspan></text>`;
  s += `<text font-family="${FONT}" font-size="16" fill="${M}"><tspan x="${L}" y="570">${copy.b[0]}</tspan><tspan x="${L}" y="593">${copy.b[1]}</tspan></text>`;
  s += dots(p.dotStyle, n, k, c);
  s += `<rect x="${L}" y="668" width="312" height="56" rx="${Math.min(p.radius, 28)}" fill="${P}"/><text x="190" y="702" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="600" fill="${onP}">${last ? "Get started" : "Next"}</text>`;
  if (!last) s += `<path d="M${R - 30} 696h12M${R - 23} 690l6 6-6 6" fill="none" stroke="${onP}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  return s + `<rect x="130" y="752" width="120" height="5" rx="2.5" fill="${I}" opacity="0.85"/></g>`;
}

export default function render(p) {
  const W = 1200, H = 900;
  const n = Math.max(2, Math.min(5, Math.round(p.steps)));
  const a = Math.max(1, Math.min(n, Math.round(p.active))) - 1;
  const F = p.surface, I = p.ink, P = p.primary, S = p.secondary;
  const darkS = lum(F) < 0.5, darkB = lum(p.background) < 0.5;
  const c = {
    F, I, P, S, rr: f(p.radius * 0.8),
    M: mix(I, F, 0.42), Fa: mix(I, F, 0.84), T: mix(S, F, darkS ? 0.82 : 0.78),
    onP: lum(P) > 0.6 ? "#111111" : "#FFFFFF",
    bezel: darkS ? mix(F, "#000000", 0.55) : mix(I, "#000000", 0.5),
    bezelStroke: darkB || darkS ? ` stroke="${mix(p.background, "#FFFFFF", 0.16)}" stroke-width="1.5"` : "",
    top: p.skip ? 108 : 72,
  };
  const defs = `<defs><radialGradient id="glow"><stop offset="0" stop-color="${P}" stop-opacity="${darkB ? 0.3 : 0.2}"/><stop offset="1" stop-color="${P}" stop-opacity="0"/></radialGradient>` +
    `<filter id="sh" x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="${darkS ? 0.4 : 0.12}"/></filter>` +
    `<filter id="ph" x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="0" dy="28" stdDeviation="28" flood-color="#000000" flood-opacity="${darkB ? 0.55 : 0.18}"/></filter>` +
    `<clipPath id="scr"><rect x="10" y="10" width="360" height="760" rx="48"/></clipPath>` +
    `<clipPath id="pan"><rect x="34" y="${c.top}" width="312" height="${444 - c.top}" rx="${f(p.radius * 1.2)}"/></clipPath></defs>`;
  const nb = [-1, 1].filter((d) => a + d >= 0 && a + d < n);
  const ax = 600 - (nb.length === 1 ? nb[0] * 190 : 0);
  let body = `<rect width="${W}" height="${H}" fill="${p.background}"/><circle cx="${ax}" cy="450" r="460" fill="url(#glow)"/>`;
  for (const d of nb) {
    const s = 0.86, x0 = f(ax + d * 405 - 190 * s), y0 = f(450 - 390 * s);
    body += `<g transform="translate(${x0} ${y0}) scale(${s})">${phone(a + d, n, p, c)}<rect width="380" height="780" rx="58" fill="${p.background}" opacity="${darkB ? 0.55 : 0.45}"/></g>`;
  }
  body += `<g transform="translate(${ax - 190} 60)">${phone(a, n, p, c)}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}${body}</svg>`;
}
