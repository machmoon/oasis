// Donut chart card: gap-true annular segments, OKLCH-blended palette, centre total and a reflowing legend.
export const meta = {
  title: "Ring Breakdown",
  kind: "ui",
  description: "A polished donut chart card with segment labels, centre total and legend for dashboards, reports and pitch decks.",
  tags: ["donut", "chart", "data viz", "dashboard", "pie", "legend", "report", "infographic"],
  price: 0,
  author: "oasis-factory",
  size: [800, 520],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#F3F0EA" },
    ink: { type: "color", role: "ink", label: "Text", default: "#1D1C1A" },
    primary: { type: "color", role: "primary", label: "Palette start", default: "#3346C8" },
    secondary: { type: "color", role: "secondary", label: "Palette end", default: "#52B6A8" },
    legend: { type: "choice", label: "Legend position", default: "right", options: ["right", "left", "bottom", "none"] },
    labels: { type: "choice", label: "Segment labels", default: "percent", options: ["percent", "value", "none"] },
    thickness: { type: "range", label: "Ring thickness (%)", default: 30, min: 10, max: 60, step: 1 },
    gap: { type: "range", label: "Segment gap", default: 4, min: 0, max: 14, step: 1 },
    data: { type: "text", label: "Segments (name value, …)", default: "Design 420, Engineering 310, Marketing 240, Sales 160, Support 90" },
    caption: { type: "text", label: "Centre text", default: "Total spend ($k)" },
  },
  presets: {
    Harbor: { background: "#EAF0F2", ink: "#13262F", primary: "#0F6E7A", secondary: "#9BD3C2" },
    Ember: { background: "#FFF6EE", ink: "#2B1610", primary: "#C2381F", secondary: "#F5C04A" },
    Midnight: { background: "#0E1018", ink: "#EEF0F6", primary: "#FF7A59", secondary: "#FFD27A" },
    Orchard: { background: "#F4F2E6", ink: "#22251A", primary: "#4F7D2C", secondary: "#E0B13A" },
  },
};

const F = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const rgbHex = (c) => "#" + c.map((v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, "0")).join("");
const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const gam = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const lum = (h) => { const [r, g, b] = hexRgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map((v, i) => v + (y[i] - v) * t)); };

function toOk(hex) {
  const [r, g, b] = hexRgb(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

function fromOk(L, C, h) {
  for (let k = 0; k < 16; k++) {
    const a = C * Math.cos(h), b = C * Math.sin(h);
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
    const rgb = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
    if (rgb.every((v) => v >= -0.001 && v <= 1.001) || k === 15) return rgbHex(rgb.map(gam));
    C *= 0.88;
  }
}

function palette(n, p, light) {
  const A = toOk(p.primary), B = toOk(p.secondary);
  if (A[1] < 0.02) A[2] = B[2];
  if (B[1] < 0.02) B[2] = A[2];
  let dh = B[2] - A[2];
  while (dh > Math.PI) dh -= 2 * Math.PI;
  while (dh < -Math.PI) dh += 2 * Math.PI;
  dh = clamp(dh, -1.9, 1.9);
  const same = Math.abs(A[0] - B[0]) < 0.06 && (Math.abs(dh) < 0.35 || Math.max(A[1], B[1]) < 0.03);
  const lo = light ? 0.38 : 0.52, hi = light ? 0.8 : 0.88;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    let L = same ? A[0] + (t - 0.5) * 0.32 : A[0] + (B[0] - A[0]) * t;
    if (n > 3) L += i % 2 ? 0.035 : -0.035;
    out.push(fromOk(clamp(L, lo, hi), A[1] + (B[1] - A[1]) * t, A[2] + dh * t));
  }
  return out;
}

function parse(str) {
  const segs = [];
  String(str || "").split(",").forEach((raw) => {
    const m = raw.trim().match(/^(.*?)[\s:=]*([\d]+(?:\.\d+)?)\s*%?$/);
    if (!m || segs.length >= 8) return;
    const v = parseFloat(m[2]);
    if (v > 0) segs.push({ name: m[1].trim() || `Segment ${segs.length + 1}`, v });
  });
  return segs.length ? segs : parse(params.knobs.data.default);
}

const fmt = (v) => {
  const r = Math.round(v * 10) / 10, [i, d] = String(r).split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (d ? "." + d : "");
};
const trunc = (s, n) => (s.length > n ? s.slice(0, Math.max(1, n - 1)).trim() + "…" : s);
const pt = (cx, cy, r, a) => [(cx + Math.cos(a) * r).toFixed(2), (cy + Math.sin(a) * r).toFixed(2)];

function wrap(str, n) {
  const words = String(str || "").trim().split(/\s+/).filter(Boolean), lines = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= n) cur += " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > 2) lines.splice(1, lines.length - 1, lines.slice(1).join(" "));
  return lines.map((l) => trunc(l, n));
}

function sector(cx, cy, ro, ri, a0, a1, gap) {
  const ho = gap / 2 / ro, hi = gap / 2 / ri;
  const o0 = a0 + ho, o1 = a1 - ho;
  let i0 = a0 + hi, i1 = a1 - hi;
  if (o1 - o0 < 0.002) return "";
  if (i1 <= i0) i0 = i1 = (a0 + a1) / 2;
  const P = (r, a) => pt(cx, cy, r, a).join(",");
  return `M${P(ro, o0)} A${ro.toFixed(2)},${ro.toFixed(2)} 0 ${o1 - o0 > Math.PI ? 1 : 0} 1 ${P(ro, o1)} L${P(ri, i1)} A${ri.toFixed(2)},${ri.toFixed(2)} 0 ${i1 - i0 > Math.PI ? 1 : 0} 0 ${P(ri, i0)} Z`;
}

export default function render(p) {
  const W = 800, H = 520, segs = parse(p.data), n = segs.length;
  const total = segs.reduce((s, x) => s + x.v, 0);
  const raw = segs.map((s) => (s.v / total) * 100), pcts = raw.map(Math.floor);
  raw.map((r, i) => [r - pcts[i], i]).sort((a, b) => b[0] - a[0])
    .slice(0, 100 - pcts.reduce((a, b) => a + b, 0)).forEach(([, i]) => pcts[i]++);

  const bg = p.background, light = lum(bg) > 0.179;
  let canvas = bg, surface;
  if (light) {
    surface = mix(bg, "#FFFFFF", 0.65);
    if (lum(surface) - lum(bg) < 0.05) canvas = mix(bg, "#000000", 0.06);
  } else {
    let t = 0.05;
    do { surface = mix(bg, "#FFFFFF", t); t += 0.01; } while (lum(surface) - lum(bg) < 0.012 && t < 0.2);
  }
  const ink = contrast(p.ink, surface) >= 4.5 ? p.ink : light ? "#16161A" : "#F4F4F6";
  const muted = mix(ink, surface, 0.4), line = mix(surface, ink, light ? 0.09 : 0.12);
  const cols = palette(n, p, light);

  const cX = 24, cY = 24, cW = 752, cH = 472, pos = p.legend, showL = p.labels !== "none";
  let cx, cy, R, legend = "";
  if (pos === "right" || pos === "left") {
    const rw = 440;
    cx = pos === "right" ? cX + rw / 2 : cX + cW - rw / 2;
    cy = cY + cH / 2;
    R = rw / 2 - (showL ? 60 : 24);
    const x0 = pos === "right" ? cX + rw + 16 : cX + 40, lw = cW - rw - 56;
    const rh = Math.min(44, (cH - 80) / n), y0 = cy - (rh * n) / 2;
    segs.forEach((s, i) => {
      const y = y0 + i * rh, m = y + rh / 2;
      if (i) legend += `<line x1="${x0}" y1="${y}" x2="${x0 + lw}" y2="${y}" stroke="${line}" stroke-width="1"/>`;
      legend += `<rect x="${x0}" y="${m - 6}" width="12" height="12" rx="3.5" fill="${cols[i]}"/>`
        + `<text x="${x0 + 24}" y="${m + 5}" font-size="14" fill="${ink}">${esc(trunc(s.name, 15))}</text>`
        + `<text x="${x0 + lw - 50}" y="${m + 5}" font-size="13" fill="${muted}" text-anchor="end">${fmt(s.v)}</text>`
        + `<text x="${x0 + lw}" y="${m + 5}" font-size="14" font-weight="600" fill="${ink}" text-anchor="end">${pcts[i]}%</text>`;
    });
  } else if (pos === "bottom") {
    const gc = n <= 4 ? n : Math.ceil(n / 2), rows = Math.ceil(n / gc), legH = rows * 34;
    const legTop = cY + cH - 28 - legH, cw = (cW - 96) / gc;
    cy = (cY + 16 + legTop - 12) / 2;
    cx = W / 2;
    R = (legTop - 12 - cY - 16) / 2 - (showL ? 34 : 12);
    legend += `<line x1="${cX + 48}" y1="${legTop - 8}" x2="${cX + cW - 48}" y2="${legTop - 8}" stroke="${line}" stroke-width="1"/>`;
    segs.forEach((s, i) => {
      const x = cX + 48 + (i % gc) * cw + 8, m = legTop + Math.floor(i / gc) * 34 + 20;
      legend += `<rect x="${x}" y="${m - 6}" width="12" height="12" rx="3.5" fill="${cols[i]}"/>`
        + `<text x="${x + 22}" y="${m + 5}" font-size="14" fill="${ink}">${esc(trunc(s.name, Math.floor((cw - 82) / 7.6)))}</text>`
        + `<text x="${x + cw - 24}" y="${m + 5}" font-size="13" font-weight="600" fill="${muted}" text-anchor="end">${pcts[i]}%</text>`;
    });
  } else {
    cx = W / 2; cy = H / 2; R = showL ? 186 : 204;
  }

  const ri = R - (R * p.thickness) / 100;
  let ring = "", labels = "", a0 = -Math.PI / 2;
  segs.forEach((s, i) => {
    const a1 = a0 + (2 * Math.PI * s.v) / total, mid = (a0 + a1) / 2;
    ring += n === 1
      ? `<circle cx="${cx}" cy="${cy}" r="${((R + ri) / 2).toFixed(2)}" fill="none" stroke="${cols[i]}" stroke-width="${(R - ri).toFixed(2)}"/>`
      : `<path d="${sector(cx, cy, R, ri, a0, a1, p.gap)}" fill="${cols[i]}"/>`;
    if (showL && s.v / total >= 0.03) {
      const c = Math.cos(mid), sn = Math.sin(mid);
      const [x1, y1] = pt(cx, cy, R + 6, mid), [x2, y2] = pt(cx, cy, R + 14, mid), [tx, ty] = pt(cx, cy, R + 21, mid);
      const anchor = c > 0.3 ? "start" : c < -0.3 ? "end" : "middle";
      const val = p.labels === "percent" ? `${pcts[i]}%` : fmt(s.v);
      const txt = pos === "none" ? `${esc(trunc(s.name, 16))}<tspan fill="${muted}" font-weight="400"> ${val}</tspan>` : val;
      labels += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${muted}" stroke-width="1.25" stroke-linecap="round"/>`
        + `<text x="${tx}" y="${(+ty + 4.5 + (Math.abs(c) <= 0.3 ? sn * 6 : 0)).toFixed(2)}" font-size="13" font-weight="600" fill="${ink}" text-anchor="${anchor}">${txt}</text>`;
    }
    a0 = a1;
  });

  const tStr = fmt(total);
  const capFs = clamp(ri * 0.13, 11, 15);
  const capLines = wrap(p.caption, Math.max(5, Math.floor((ri * 1.45) / (capFs * 0.54))));
  const capH = capLines.length ? 10 + capFs * 0.85 + (capLines.length - 1) * capFs * 1.2 : 0;
  const fs = Math.min(R * 0.3, (ri * 1.5) / (tStr.length * 0.6), (ri * 1.5 - capH) / 0.72);
  const blockH = fs * 0.72 + capH, base = cy - blockH / 2 + fs * 0.72;
  const centre = `<text x="${cx}" y="${base.toFixed(2)}" font-size="${fs.toFixed(1)}" font-weight="700" letter-spacing="-0.02em" fill="${ink}" text-anchor="middle">${tStr}</text>`
    + capLines.map((l, k) => `<text x="${cx}" y="${(base + 10 + capFs * 0.85 + k * capFs * 1.2).toFixed(2)}" font-size="${capFs.toFixed(1)}" fill="${muted}" text-anchor="middle">${esc(l)}</text>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`
    + `<defs><filter id="sh" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#000000" flood-opacity="${light ? 0.07 : 0.35}"/></filter></defs>`
    + `<rect width="${W}" height="${H}" fill="${canvas}"/>`
    + `<rect x="${cX}" y="${cY}" width="${cW}" height="${cH}" rx="20" fill="${surface}" filter="url(#sh)"/>`
    + `<rect x="${cX + 0.5}" y="${cY + 0.5}" width="${cW - 1}" height="${cH - 1}" rx="19.5" fill="none" stroke="${line}"/>`
    + `<g font-family="${F}">${ring}${labels}${centre}${legend}</g></svg>`;
}
