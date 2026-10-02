// Line chart: seeded monthly series with tension-controlled curves, primary area fill, points and a collision-aware hover tooltip.
export const meta = {
  title: "Pulse Line Chart",
  kind: "ui",
  description: "A dashboard line chart with smooth or straight series, a gradient area fill, data points and a hover tooltip, for product mockups and reports.",
  tags: ["chart", "line chart", "dashboard", "analytics", "data viz", "area chart", "ui", "graph"],
  price: 6,
  author: "oasis-factory",
  size: [800, 500],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#FBFAF7" },
    ink: { type: "color", role: "ink", label: "Ink", default: "#16181D" },
    primary: { type: "color", role: "primary", label: "Series 1", default: "#4F46E5" },
    secondary: { type: "color", role: "secondary", label: "Series 2", default: "#14B8A6" },
    area: { type: "choice", label: "Area fill", default: "gradient", options: ["gradient", "solid", "none"] },
    points: { type: "choice", label: "Points & hover", default: "all", options: ["all", "hover", "none"] },
    series: { type: "range", label: "Series", default: 2, min: 1, max: 5, step: 1 },
    seed: { type: "range", label: "Data", default: 7, min: 1, max: 100, step: 1 },
    tension: { type: "range", label: "Curve tension (1 = straight)", default: 0.4, min: 0, max: 1, step: 0.05 },
    labels: { type: "toggle", label: "Axis labels", default: true },
  },
  presets: {
    Ember: { background: "#FFF7F0", ink: "#2A1A12", primary: "#E4572E", secondary: "#F2A541" },
    Midnight: { background: "#0E1117", ink: "#E6E8EE", primary: "#7C9CFF", secondary: "#4FD1C5" },
    Forest: { background: "#F1F4EE", ink: "#1D2A20", primary: "#2F7D4F", secondary: "#C9A227" },
    Mono: { background: "#111111", ink: "#F5F5F5", primary: "#FFFFFF", secondary: "#FF4D6D" },
  },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const NAMES = ["Direct", "Organic", "Referral", "Social", "Benchmark"];
const FONT = "-apple-system, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const gam = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
function toHex(c) {
  return "#" + c.map((v) => { const n = Math.round(clamp01(v) * 255); return (n < 16 ? "0" : "") + n.toString(16); }).join("").toUpperCase();
}
function lab(h) {
  const [r, g, b] = hx(h).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function unlab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return toHex([4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map((v) => gam(clamp01(v))));
}
function lum(h) { const [r, g, b] = hx(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function mix(a, b, t) { const A = lab(a), B = lab(b); return unlab(A.map((v, i) => v + (B[i] - v) * t)); }
function ensure(h, bg, min) {
  let c = lab(h), out = h;
  const dir = lum(bg) > 0.18 ? -1 : 1;
  for (let i = 0; i < 40 && contrast(out, bg) < min; i++) { c = [c[0] + dir * 0.025, c[1] * 0.97, c[2] * 0.97]; out = unlab(c); }
  return out;
}
const f = (v) => v.toFixed(1);
const commas = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function curve(pts, t) {
  const k = (1 - t) * 0.3, s = [pts[0]];
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    let a = p1, b = p2;
    if (k > 0.001) {
      const lo = Math.min(p1[1], p2[1]), hi = Math.max(p1[1], p2[1]), cl = (y) => Math.max(lo, Math.min(hi, y));
      a = [p1[0] + (p2[0] - p0[0]) * k, cl(p1[1] + (p2[1] - p0[1]) * k)];
      b = [p2[0] - (p3[0] - p1[0]) * k, cl(p2[1] - (p3[1] - p1[1]) * k)];
      d += ` C${f(a[0])},${f(a[1])} ${f(b[0])},${f(b[1])} ${f(p2[0])},${f(p2[1])}`;
    } else d += ` L${f(p2[0])},${f(p2[1])}`;
    for (let j = 1; j <= 24; j++) {
      const u = j / 24, v = 1 - u, w0 = v * v * v, w1 = 3 * v * v * u, w2 = 3 * v * u * u, w3 = u * u * u;
      s.push([w0 * p1[0] + w1 * a[0] + w2 * b[0] + w3 * p2[0], w0 * p1[1] + w1 * a[1] + w2 * b[1] + w3 * p2[1]]);
    }
  }
  return { d, s };
}

export default function render(p) {
  const W = 800, H = 500, bg = p.background, dark = lum(bg) < 0.18;
  const ink = ensure(p.ink, bg, 7), muted = ensure(mix(ink, bg, dark ? 0.32 : 0.42), bg, dark ? 6.5 : 4.8);
  const grid = mix(ink, bg, dark ? 0.82 : 0.88), base = mix(ink, bg, dark ? 0.6 : 0.68);
  const n = Math.max(1, Math.min(5, Math.round(p.series)));
  const c1 = ensure(p.primary, bg, 3);
  let c2 = ensure(p.secondary, bg, 3);
  const A = lab(c1), B = lab(c2);
  if (Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) < 0.12) c2 = ensure(unlab([B[0] + (B[0] > 0.6 ? -0.2 : 0.2), B[1], B[2]]), bg, 3);
  const tone = (c) => {
    const q = lab(c), d = dark ? (q[0] < 0.78 ? 0.16 : -0.16) : (q[0] > 0.36 ? -0.16 : 0.14);
    return ensure(unlab([Math.max(0.05, Math.min(0.97, q[0] + d)), q[1] * 0.85, q[2] * 0.85]), bg, 3);
  };
  const cols = [c1, c2, tone(c1), tone(c2), muted];
  const dash = ["", "", "0.5 6", "0.5 6", "6 6"], sw = [2.75, 2.75, 2.5, 2.5, 2];

  const BASE = [64, 46, 32, 22], data = [];
  for (let s = 0; s < 5; s++) {
    const r = rng(p.seed * 7919 + s * 613);
    let v = s < 4 ? BASE[s] + r() * 10 : 0;
    const drift = 0.9 + r() * 0.6, a = [];
    for (let k = 0; k < 12; k++) {
      if (s === 4) v = 38 + k * 1.9 + (r() - 0.5) * 4;
      else { v += (r() - 0.42) * 11 * drift; v = Math.max(8, Math.min(96, v)); }
      a.push(Math.round(v * 10) * 10);
    }
    data.push(a);
  }
  const shown = data.slice(0, n);
  const max = Math.max(...shown.map((a) => Math.max(...a)));
  const raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  let top = Math.ceil((max * 1.08) / step) * step;

  const L = p.labels ? 76 : 36, R = W - 36, T = 140, Bt = p.labels ? H - 58 : H - 36;
  const X = (k) => L + ((R - L) * k) / 11;
  const a0 = data[0], hi = a0.indexOf(Math.max(...a0)), hxp = X(hi);
  const tw = 164, th = 46 + n * 22;
  let geo = null, tip = null;
  for (let tries = 0; tries < 10; tries++) {
    const tp = top, Y = (v) => Bt - ((Bt - T) * v) / tp;
    const pts = shown.map((a) => a.map((v, k) => [X(k), Y(v)]));
    const cv = pts.map((ps) => curve(ps, p.tension));
    geo = { Y, pts, cv };
    if (p.points === "none") break;
    const boxes = [];
    pts.forEach((ps) => ps.forEach(([x, y], k) => {
      if (p.points === "all" || k === hi) { const r = (k === hi ? 6 : 4) + 8; boxes.push([x - r, y - r, x + r, y + r]); }
    }));
    const samp = [].concat(...cv.map((c) => c.s)), anchorY = pts[0][hi][1];
    [hxp + 18, hxp - 18 - tw].forEach((tx, side) => {
      if (tx < 12 || tx + tw > W - 12) return;
      for (let ty = 112; ty + th <= Bt - 8; ty += 4) {
        const x0 = tx - 10, x1 = tx + tw + 10, y0 = ty - 10, y1 = ty + th + 10;
        if (samp.some(([x, y]) => x > x0 && x < x1 && y > y0 && y < y1)) continue;
        if (boxes.some((b) => b[2] > tx && b[0] < tx + tw && b[3] > ty && b[1] < ty + th)) continue;
        const score = Math.abs(ty + th - (anchorY - 20)) + side * 40;
        if (!tip || score < tip.score) tip = { tx, ty, score };
      }
    });
    if (tip) break;
    top += step;
  }
  if (p.points !== "none" && !tip) tip = { tx: hxp + 18 + tw > W - 12 ? hxp - 18 - tw : hxp + 18, ty: 112 };
  const { Y, pts, cv } = geo;

  const defs = `<filter id="sh" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000" flood-opacity="${dark ? 0.5 : 0.16}"/></filter><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}" stop-opacity="${dark ? 0.32 : 0.24}"/><stop offset="0.7" stop-color="${c1}" stop-opacity="0.05"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></linearGradient>`;

  let out = "";
  for (let v = 0; v <= top + 1e-6; v += step) {
    const y = f(Y(v));
    out += v === 0
      ? `<line x1="${L}" y1="${y}" x2="${R}" y2="${y}" stroke="${base}" stroke-width="1.5"/>`
      : `<line x1="${L}" y1="${y}" x2="${R}" y2="${y}" stroke="${grid}" stroke-width="1" stroke-dasharray="2 6" stroke-linecap="round"/>`;
    if (p.labels) out += `<text x="${L - 14}" y="${f(Y(v) + 4)}" text-anchor="end" font-size="12" fill="${muted}">${v === 0 ? "0" : v >= 1000 ? v / 1000 + "k" : v}</text>`;
  }
  if (p.labels) MONTHS.forEach((m, k) => { out += `<text x="${f(X(k))}" y="${Bt + 28}" text-anchor="middle" font-size="12" fill="${muted}">${m}</text>`; });

  if (p.area !== "none") {
    const d = cv[0].d + ` L${f(X(11))},${Bt} L${f(X(0))},${Bt} Z`;
    out += p.area === "gradient" ? `<path d="${d}" fill="url(#ag)"/>` : `<path d="${d}" fill="${c1}" fill-opacity="${dark ? 0.18 : 0.13}"/>`;
  }
  for (let i = n - 1; i >= 0; i--) {
    out += `<path d="${cv[i].d}" fill="none" stroke="${cols[i]}" stroke-width="${sw[i]}"${dash[i] ? ` stroke-dasharray="${dash[i]}"` : ""} stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  if (p.points !== "none") {
    out += `<line x1="${f(hxp)}" y1="${T - 6}" x2="${f(hxp)}" y2="${Bt}" stroke="${base}" stroke-width="1.25" stroke-dasharray="3 4"/>`;
    for (let i = n - 1; i >= 0; i--) {
      if (p.points === "all") pts[i].forEach(([x, y], k) => { if (k !== hi) out += `<circle cx="${f(x)}" cy="${f(y)}" r="${i > 1 ? 3 : 3.5}" fill="${bg}" stroke="${cols[i]}" stroke-width="2"/>`; });
      out += `<circle cx="${f(pts[i][hi][0])}" cy="${f(pts[i][hi][1])}" r="6" fill="${bg}" stroke="${cols[i]}" stroke-width="3"/>`;
    }
    const { tx, ty } = tip, sub = ensure(mix(bg, ink, 0.35), ink, 4.5);
    out += `<g filter="url(#sh)"><rect x="${f(tx)}" y="${ty}" width="${tw}" height="${th}" rx="10" fill="${ink}"/></g>`;
    out += `<text x="${f(tx + 14)}" y="${ty + 24}" font-size="12" font-weight="600" fill="${sub}" letter-spacing="0.3">${FULL[hi]}</text>`;
    for (let i = 0; i < n; i++) {
      const y = ty + 48 + i * 22;
      out += `<circle cx="${f(tx + 18)}" cy="${y - 4}" r="4.5" fill="${cols[i]}" stroke="${bg}" stroke-width="1.5"/>`;
      out += `<text x="${f(tx + 32)}" y="${y}" font-size="13" fill="${bg}">${NAMES[i]}</text>`;
      out += `<text x="${f(tx + tw - 14)}" y="${y}" text-anchor="end" font-size="13" font-weight="700" fill="${bg}">${commas(data[i][hi])}</text>`;
    }
  }

  const last = a0[11], delta = ((last - a0[0]) / a0[0]) * 100, up = delta >= 0;
  const semBase = up ? (dark ? "#4ADE80" : "#15803D") : (dark ? "#F87171" : "#B91C1C");
  const pillBg = mix(bg, semBase, dark ? 0.18 : 0.12), sem = ensure(semBase, pillBg, 4.8);
  const big = commas(last), pillT = `${up ? "+" : "−"}${Math.abs(delta).toFixed(1)}% YTD`;
  const px = 36 + big.length * 19 + 14, pw = pillT.length * 7.2 + 20;
  let head = `<text x="36" y="54" font-size="13" font-weight="500" fill="${muted}" letter-spacing="0.2">Direct traffic · Dec</text>`;
  head += `<text x="36" y="98" font-size="34" font-weight="700" fill="${ink}" letter-spacing="-0.8">${big}</text>`;
  head += `<rect x="${f(px)}" y="76" width="${f(pw)}" height="26" rx="13" fill="${pillBg}"/><text x="${f(px + pw / 2)}" y="93.5" text-anchor="middle" font-size="12" font-weight="700" fill="${sem}">${pillT}</text>`;

  const items = NAMES.slice(0, n).map((nm, i) => ({ nm, i, w: nm.length * 7.2 + 26 }));
  const maxW = W - 36 - 330, gap = 22, rows = [];
  let cur = [], cw = 0;
  items.forEach((it) => {
    const add = it.w + (cur.length ? gap : 0);
    if (cur.length && cw + add > maxW) { rows.push({ cur, cw }); cur = []; cw = 0; }
    cw += it.w + (cur.length ? gap : 0); cur.push(it);
  });
  if (cur.length) rows.push({ cur, cw });
  rows.forEach((row, r) => {
    let x = W - 36 - row.cw;
    const y = 58 + r * 24;
    row.cur.forEach((it) => {
      head += `<line x1="${f(x)}" y1="${y - 4.5}" x2="${f(x + 16)}" y2="${y - 4.5}" stroke="${cols[it.i]}" stroke-width="3" stroke-linecap="round"${dash[it.i] ? ` stroke-dasharray="${it.i === 4 ? "4 4" : "0.5 5"}"` : ""}/>`;
      head += `<text x="${f(x + 26)}" y="${y}" font-size="13" fill="${ink}">${it.nm}</text>`;
      x += it.w + gap;
    });
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="${bg}"/><g font-family="${FONT}">${head}${out}</g></svg>`;
}
