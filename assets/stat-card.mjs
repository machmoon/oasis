// Analytics stat card: label, headline metric, delta pill and a seeded sparkline or bar mini-chart.
export const meta = {
  title: "Pulse Stat Card",
  kind: "ui",
  description: "A polished dashboard KPI card with headline metric, trend delta and seeded mini chart for product mockups and admin UI.",
  tags: ["dashboard", "analytics", "stat card", "kpi", "sparkline", "chart", "ui kit", "saas"],
  price: 3,
  author: "oasis-factory",
  size: [640, 400],
};

export const params = {
  knobs: {
    accent: { type: "color", role: "primary", label: "Accent", default: "#5B5BF6" },
    canvas: { type: "color", role: "background", label: "Canvas", default: "#EEF0F5" },
    label: { type: "text", label: "Label", default: "Monthly revenue" },
    value: { type: "text", label: "Value", default: "$48,290" },
    theme: { type: "choice", label: "Theme", default: "light", options: ["light", "dark"] },
    direction: { type: "choice", label: "Delta direction", default: "up", options: ["up", "down"] },
    chart: { type: "choice", label: "Mini chart", default: "sparkline", options: ["sparkline", "bars"] },
    delta: { type: "range", label: "Delta %", default: 12.4, min: 0, max: 99.9, step: 0.1 },
    seed: { type: "range", label: "Data seed", default: 7, min: 1, max: 100, step: 1 },
    radius: { type: "range", label: "Corner radius", default: 22, min: 0, max: 36, step: 1 },
  },
  presets: {
    Indigo: { accent: "#5B5BF6", canvas: "#EEF0F5" },
    Mint: { accent: "#0EA5A0", canvas: "#E6F1EE" },
    Ember: { accent: "#F97316", canvas: "#F5EEE7" },
    Midnight: { accent: "#38BDF8", canvas: "#0A0C12" },
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

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f = (n) => n.toFixed(1);
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "\u2026" : s);

function series(n, seed, up, strength, lo, hi) {
  const r = rng(seed * 9973 + 17);
  const raw = [];
  let v = 0;
  for (let i = 0; i < n; i++) {
    v += (r() - 0.5) * 0.9;
    raw.push(v + (up ? 1 : -1) * strength * 3.2 * (i / (n - 1)));
  }
  const sm = raw.map((x, i) => (raw[Math.max(0, i - 1)] + x * 2 + raw[Math.min(n - 1, i + 1)]) / 4);
  const mn = Math.min(...sm), mx = Math.max(...sm), span = mx - mn || 1;
  return sm.map((x) => lo + ((x - mn) / span) * (hi - lo));
}

function smooth(pts) {
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

export default function render(p) {
  const W = 640, H = 400, cx = 60, cy = 40, cw = 520, ch = 320, pad = 32;
  const dark = p.theme === "dark";
  const T = dark
    ? { card: "#12141C", border: "#22263A", text: "#F4F5F8", sub: "#B4B9C8", muted: "#7C8296", grid: "#262B3F", up: "#4ADE80", down: "#F87171", shadow: "#000000", so: 0.45, tint: 0.18, bar: 0.3 }
    : { card: "#FFFFFF", border: "#E6E9EF", text: "#0F172A", sub: "#475569", muted: "#94A3B8", grid: "#E6EAF0", up: "#15803D", down: "#DC2626", shadow: "#0F172A", so: 0.09, tint: 0.12, bar: 0.2 };
  const up = p.direction === "up";
  const dc = up ? T.up : T.down;
  const font = "-apple-system, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  const rad = Math.max(0, Math.min(36, p.radius));
  const strength = Math.max(0.2, Math.min(1, p.delta / 25));

  const defs = `<defs>
<filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="${T.shadow}" flood-opacity="${T.so}"/></filter>
<linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.accent}" stop-opacity="${dark ? 0.36 : 0.24}"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></linearGradient>
</defs>`;

  const card = `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="${rad}" fill="${T.card}" filter="url(#sh)"/>
<rect x="${cx + 0.5}" y="${cy + 0.5}" width="${cw - 1}" height="${ch - 1}" rx="${Math.max(0, rad - 0.5)}" fill="none" stroke="${T.border}"/>`;

  const tx = cx + pad, ty = cy + pad, tr = Math.min(11, rad * 0.45 + 3);
  const glyph = up
    ? `M10 24 L16 18 L20 22 L26 14 M21.5 14 H26 V18.5`
    : `M10 13 L16 19 L20 15 L26 23 M21.5 23 H26 V18.5`;
  const header = `<rect x="${tx}" y="${ty}" width="36" height="36" rx="${f(tr)}" fill="${p.accent}" fill-opacity="${T.tint}"/>
<path d="${glyph}" transform="translate(${tx} ${ty})" fill="none" stroke="${p.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<text x="${tx + 50}" y="${ty + 23}" font-family="${font}" font-size="15" font-weight="500" fill="${T.sub}">${esc(clip(String(p.label), 32))}</text>
<text x="${cx + cw - pad - 16}" y="${ty + 22.5}" text-anchor="end" font-family="${font}" font-size="13" fill="${T.muted}">Last 30 days</text>
<path d="M${cx + cw - pad - 10} ${ty + 15.5} l3.5 3.5 l3.5 -3.5" fill="none" stroke="${T.muted}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;

  const val = clip(String(p.value), 22);
  const fs = Math.min(54, (cw - pad * 2) / Math.max(1, val.length * 0.62));
  const number = `<text x="${tx - 2}" y="${cy + 130}" font-family="${font}" font-size="${f(fs)}" font-weight="700" letter-spacing="${f(-fs * 0.035)}" fill="${T.text}">${esc(val)}</text>`;

  const dtxt = `${up ? "+" : "\u2212"}${Number(p.delta).toFixed(1)}%`;
  const pw = 10 + 12 + 6 + dtxt.length * 7.6 + 10, py = cy + 148;
  const arrow = up ? `M6 10.5 V1.5 M2 5.5 L6 1.5 L10 5.5` : `M6 1.5 V10.5 M2 6.5 L6 10.5 L10 6.5`;
  const pill = `<rect x="${tx}" y="${py}" width="${f(pw)}" height="26" rx="13" fill="${dc}" fill-opacity="${dark ? 0.16 : 0.1}"/>
<path d="${arrow}" transform="translate(${tx + 10} ${py + 7})" fill="none" stroke="${dc}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
<text x="${tx + 28}" y="${py + 17.5}" font-family="${font}" font-size="13" font-weight="600" fill="${dc}">${dtxt}</text>
<text x="${f(tx + pw + 10)}" y="${py + 17.5}" font-family="${font}" font-size="13" fill="${T.muted}">vs last month</text>`;

  const L = cx + pad, R = cx + cw - pad, top = cy + 198, bot = cy + ch - 52, chH = bot - top;
  let grid = "";
  for (let i = 0; i < 3; i++) {
    const y = top + (chH * i) / 2;
    grid += `<line x1="${L}" y1="${f(y)}" x2="${R}" y2="${f(y)}" stroke="${T.grid}" stroke-width="1"${i < 2 ? ` stroke-dasharray="3 5"` : ""}/>`;
  }
  const ticks = [["Jun 1", L, "start"], ["Jun 15", (L + R) / 2, "middle"], ["Jun 30", R, "end"]]
    .map(([t, x, a]) => `<text x="${f(x)}" y="${bot + 22}" text-anchor="${a}" font-family="${font}" font-size="11.5" fill="${T.muted}">${t}</text>`).join("");

  let chart = "";
  if (p.chart === "bars") {
    const n = 16, data = series(n, p.seed, up, strength, 0.26, 0.94);
    const slot = (R - L) / n, bw = slot * 0.56, br = Math.min(bw / 2, 2 + rad * 0.15);
    data.forEach((v, i) => {
      const x = L + i * slot + (slot - bw) / 2, h = v * chH, y = bot - h, last = i === n - 1;
      chart += `<path d="M${f(x)},${bot} V${f(y + br)} A${f(br)},${f(br)} 0 0 1 ${f(x + br)},${f(y)} H${f(x + bw - br)} A${f(br)},${f(br)} 0 0 1 ${f(x + bw)},${f(y + br)} V${bot} Z" fill="${p.accent}"${last ? "" : ` fill-opacity="${f(T.bar + v * 0.25)}"`}/>`;
      if (last) chart += `<circle cx="${f(x + bw / 2)}" cy="${f(y - 9)}" r="3" fill="${p.accent}"/>`;
    });
  } else {
    const n = 24, data = series(n, p.seed, up, strength, 0.08, 0.92);
    const pts = data.map((v, i) => [L + ((R - L) * i) / (n - 1), bot - v * chH]);
    const line = smooth(pts);
    const end = pts[n - 1];
    chart = `<path d="${line} L${R},${bot} L${L},${bot} Z" fill="url(#area)"/>
<line x1="${f(end[0])}" y1="${f(end[1])}" x2="${f(end[0])}" y2="${bot}" stroke="${p.accent}" stroke-opacity="0.4" stroke-dasharray="2 3"/>
<path d="${line}" fill="none" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="${f(end[0])}" cy="${f(end[1])}" r="10" fill="${p.accent}" fill-opacity="0.16"/>
<circle cx="${f(end[0])}" cy="${f(end[1])}" r="4.5" fill="${p.accent}" stroke="${T.card}" stroke-width="2"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}
<rect width="${W}" height="${H}" fill="${p.canvas}"/>
${card}${header}${number}${pill}${grid}${chart}${ticks}</svg>`;
}
