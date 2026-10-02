// Conversion funnel whose silhouette encodes the data: width ∝ volume, smooth or stepped, with anchored drop-off callouts.
export const meta = {
  title: "Conversion Funnel",
  kind: "ui",
  description: "A data-true conversion funnel with stage volumes, percentages and anchored drop-off callouts, for dashboards, decks and growth reports.",
  tags: ["funnel", "chart", "conversion", "dashboard", "data viz", "analytics", "growth", "report"],
  price: 7,
  author: "oasis-factory",
  size: [960, 640],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#F6F4EF" },
    ink: { type: "color", role: "ink", label: "Text", default: "#17181C" },
    primary: { type: "color", role: "primary", label: "Funnel", default: "#3B4CCA" },
    secondary: { type: "color", role: "secondary", label: "Drop-off accent", default: "#D9534F" },
    taper: { type: "choice", label: "Taper", default: "smooth", options: ["smooth", "stepped"] },
    orientation: { type: "choice", label: "Orientation", default: "vertical", options: ["vertical", "horizontal"] },
    labels: { type: "choice", label: "Labels", default: "outside", options: ["outside", "inside", "split"] },
    stages: { type: "range", label: "Stages", default: 5, min: 3, max: 7, step: 1 },
    values: { type: "text", label: "Values (comma-separated)", default: "48200, 21650, 9870, 4120, 1630, 720, 310" },
    dropoffs: { type: "toggle", label: "Drop-off callouts", default: true },
  },
  presets: {
    Ember: { background: "#FFF7F0", ink: "#2A1610", primary: "#C2410C", secondary: "#7C3AED" },
    Midnight: { background: "#0E1117", ink: "#EEF1F6", primary: "#8B7CFF", secondary: "#4DE1C1" },
    Moss: { background: "#EEF1E8", ink: "#1D2A1F", primary: "#2F5D3A", secondary: "#B7791F" },
    Graphite: { background: "#FFFFFF", ink: "#0B0B0C", primary: "#1F2023", secondary: "#E5484D" },
  },
};

const NAMES = ["Visits", "Sign-ups", "Activated", "Trial", "Paid", "Retained", "Advocates"];
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const hexRgb = (h) => { const n = parseInt(String(h).replace("#", "").slice(0, 6), 16) || 0; return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const gam = (c) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; };
function toLab(h) {
  const [r, g, b] = hexRgb(h).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function fromLab([L, A, B]) {
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return "#" + rgb.map((c) => Math.round(gam(c) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}
const lum = (h) => { const [r, g, b] = hexRgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mixLab = (a, b, t) => { const A = toLab(a), B = toLab(b); return fromLab(A.map((v, i) => v + (B[i] - v) * t)); };
function separate(c, bg, min) {
  let lab = toLab(c), out = c;
  const dir = toLab(bg)[0] > 0.6 ? -1 : 1;
  for (let i = 0; i < 20 && contrast(out, bg) < min; i++) { lab = [lab[0] + dir * 0.035, lab[1], lab[2]]; out = fromLab(lab); }
  return out;
}
const best = (bg, list) => list.reduce((a, c) => (contrast(c, bg) > contrast(a, bg) ? c : a));
function muted(ink, bg) {
  for (let t = 0.45; t > 0; t -= 0.05) { const c = mixLab(ink, bg, t); if (contrast(c, bg) >= 4.5) return c; }
  return ink;
}
function ramp(primary, bg, n) {
  const top = separate(primary, bg, 1.6), A = toLab(top), B = toLab(bg);
  const C = Math.hypot(A[1], A[2]), h = Math.atan2(A[2], A[1]);
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1), L = A[0] + (B[0] - A[0]) * 0.56 * t, c = C * (1 - 0.45 * t);
    return i === 0 ? top : separate(fromLab([L, c * Math.cos(h), c * Math.sin(h)]), bg, 1.35);
  });
}
function mono(xs, ys) {
  const k = xs.length, d = [], m = [];
  for (let i = 0; i < k - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
  m[0] = d[0]; m[k - 1] = d[k - 2];
  for (let i = 1; i < k - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < k - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (f) => {
    let j = 0;
    while (j < k - 2 && f > xs[j + 1]) j++;
    const h = xs[j + 1] - xs[j], t = Math.max(0, Math.min(1, (f - xs[j]) / h)), t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[j] + (t3 - 2 * t2 + t) * h * m[j] + (-2 * t3 + 3 * t2) * ys[j + 1] + (t3 - t2) * h * m[j + 1];
  };
}

function parseValues(s, n) {
  const out = [];
  String(s || "").split(/[;|\s]+/).forEach((tok) => {
    const parts = /^\$?\d{1,3}(,\d{3})+$/.test(tok) ? [tok.replace(/[$,]/g, "")] : tok.split(",");
    parts.forEach((pt) => {
      const m = /^\$?([\d.]+)([kKmM]?)$/.exec(pt.trim());
      if (!m) return;
      let v = parseFloat(m[1]);
      if (!isFinite(v) || v <= 0) return;
      if (/k/i.test(m[2])) v *= 1e3;
      if (/m/i.test(m[2])) v *= 1e6;
      out.push(v);
    });
  });
  if (!out.length) out.push(48200);
  while (out.length < n) out.push(out[out.length - 1] * 0.44);
  const v = out.slice(0, n).map((x) => Math.max(1, Math.round(x)));
  for (let i = 1; i < n; i++) v[i] = Math.max(1, Math.min(v[i], v[i - 1]));
  return v;
}
const fmt = (v) => (v >= 1e6 ? (v / 1e6).toFixed(v >= 1e8 ? 0 : 1).replace(/\.0$/, "") + "M" : String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ","));
const pct = (x) => (x >= 99.95 ? "100%" : (x < 1 ? x.toFixed(2) : x.toFixed(1)) + "%");
const tw = (s, size, bold) => s.length * size * (bold ? 0.6 : 0.54);
const f1x = (z) => z.toFixed(1);
const T = (x, y, str, size, fill, o = {}) =>
  `<text x="${f1x(x)}" y="${f1x(y)}" font-size="${size}" fill="${fill}"${o.w ? ` font-weight="${o.w}"` : ""}${o.a ? ` text-anchor="${o.a}"` : ""}${o.ls ? ` letter-spacing="${o.ls}"` : ""}>${str}</text>`;
const Ln = (x1, y1, x2, y2, c, dash) => `<line x1="${f1x(x1)}" y1="${f1x(y1)}" x2="${f1x(x2)}" y2="${f1x(y2)}" stroke="${c}" stroke-width="1"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;

export default function render(p) {
  const W = 960, H = 640, M = 56;
  const n = Math.max(3, Math.min(7, Math.round(p.stages)));
  const v = parseValues(p.values, n);
  const bg = p.background;
  let ink = p.ink;
  if (contrast(ink, bg) < 4.5) ink = best(bg, [ink, "#FFFFFF", "#14161A"]);
  const mute = muted(ink, bg), line = mixLab(bg, ink, 0.3), guide = mixLab(bg, ink, 0.2);
  const fills = ramp(p.primary, bg, n);
  const onFill = (f) => best(f, ["#FFFFFF", "#111318"]);
  const pillFill = separate(mixLab(bg, p.secondary, 0.18), bg, 1.12);
  let pillInk = separate(p.secondary, pillFill, 4.5);
  if (contrast(pillInk, pillFill) < 4.5) pillInk = best(pillFill, [pillInk, ink]);
  const vert = p.orientation !== "horizontal", stepped = p.taper === "stepped", mode = p.labels, drop = !!p.dropoffs;
  const gap = stepped ? 16 : 3;
  const kpiCol = contrast(fills[0], bg) >= 3 ? fills[0] : ink;

  let head = T(M, 82, "Conversion funnel", 26, ink, { w: 700, ls: -0.4 });
  head += T(M, 106, `${NAMES[0]} → ${NAMES[n - 1]} · ${n} stages · ${fmt(v[0])} entered · width shows volume`, 13, mute);
  head += T(W - M, 64, "OVERALL CONVERSION", 11, mute, { a: "end", w: 600, ls: 1.2 });
  head += T(W - M, 104, pct((v[n - 1] / v[0]) * 100), 36, kpiCol, { a: "end", w: 700, ls: -0.8 });
  head += `<rect x="${M}" y="128" width="${W - 2 * M}" height="1" fill="${line}"/>`;

  let cx = 0, cy = 0, lx = 0, maxW, start, span, fT = 0, fB = 0, pillY = 0, nameY = 0;
  if (vert) {
    start = 156; span = 596 - start;
    const right = W - M - (drop ? 154 : 0), fL = M + (mode === "split" ? 108 : 0), labW = mode === "inside" ? 0 : 178;
    maxW = Math.min(mode === "inside" ? 640 : 600, right - labW - fL);
    cx = mode === "inside" && !drop ? W / 2 : fL + maxW / 2; lx = fL + maxW + 28;
  } else {
    start = M; span = W - 2 * M;
    let y = 150;
    if (drop) { pillY = 162; y = 206; }
    if (mode === "split") { nameY = y + 14; y += 32; }
    fT = y; fB = 600 - (mode === "outside" ? 56 : mode === "split" ? 32 : 28);
    maxW = fB - fT; cy = (fT + fB) / 2;
  }
  const rowH = (span + gap) / n;
  const P = (c, f) => (vert ? [cx + c, f] : [f, cy + c]);
  const ps = (c, f) => P(c, f).map(f1x).join(",");
  const hw = v.map((x) => Math.max(3, (maxW * x) / v[0] / 2));
  const xs = [], ys = [];
  for (let i = 0; i < n; i++) { xs.push(start + i * rowH); ys.push(hw[i]); }
  xs.push(start + span); ys.push(hw[n - 1]);
  const half = mono(xs, ys);

  let conn = "", bands = "", labels = "", under = "";
  for (let i = 0; i < n; i++) {
    const a = hw[i], nb = i < n - 1 ? hw[i + 1] : a;
    const f0 = start + i * rowH, f1 = f0 + rowH - gap, len = f1 - f0, fc = (f0 + f1) / 2;
    let thick, mid;
    if (stepped) {
      const r = Math.min(8, len / 4, a / 2);
      bands += vert
        ? `<rect x="${f1x(cx - a)}" y="${f1x(f0)}" width="${f1x(2 * a)}" height="${f1x(len)}" rx="${f1x(r)}" fill="${fills[i]}"/>`
        : `<rect x="${f1x(f0)}" y="${f1x(cy - a)}" width="${f1x(len)}" height="${f1x(2 * a)}" rx="${f1x(r)}" fill="${fills[i]}"/>`;
      if (i < n - 1) conn += `<path d="M${ps(-a * 0.96, f1 - 2)} L${ps(a * 0.96, f1 - 2)} L${ps(nb * 0.96, f1 + gap + 2)} L${ps(-nb * 0.96, f1 + gap + 2)}Z" fill="${separate(mixLab(bg, fills[i], 0.24), bg, 1.12)}"/>`;
      thick = 2 * a; mid = a;
    } else {
      const S = 28, R = [], L = [];
      for (let s = 0; s <= S; s++) { const f = f0 + (len * s) / S, h = half(f); R.push(ps(h, f)); L.unshift(ps(-h, f)); }
      bands += `<path d="M${R.join(" L")} L${L.join(" L")}Z" fill="${fills[i]}"/>`;
      thick = 2 * half(f1); mid = half(fc);
    }

    const name = NAMES[i], val = fmt(v[i]), pc = pct((v[i] / v[0]) * 100), metric = `${val} · ${pc}`;
    const need = Math.max(tw(name, 14, true), tw(metric, 12));
    if (mode === "inside") {
      const fits = vert ? need <= thick - 20 && len >= 36 : need <= len - 14 && thick >= 40;
      if (fits) {
        const col = onFill(fills[i]), [x, y] = P(0, fc);
        labels += T(x, y - 3, name, 14, col, { a: "middle", w: 700 }) + T(x, y + 13, metric, 12, col, { a: "middle" });
      } else if (vert) {
        const x = cx + a + 14;
        labels += T(x, fc - 3, name, 14, ink, { w: 700 }) + T(x, fc + 13, metric, 12, mute);
      } else {
        const y = cy + a + 18;
        labels += T(fc, y, name, 13, ink, { a: "middle", w: 700 }) + T(fc, y + 15, metric, 11, mute, { a: "middle" });
      }
    } else if (vert) {
      const sub = mode === "split" ? `${pc} of entries` : `${name} · ${pc}`, big = mode === "split" ? 18 : 20;
      labels += T(lx, fc - 1, val, big, ink, { w: 700, ls: -0.3 }) + T(lx, fc + 17, sub, 12, mute);
      if (lx - 10 - (cx + mid + 8) > 16) under += Ln(cx + mid + 8, fc - 7, lx - 10, fc - 7, guide, "1 3");
      if (mode === "split") {
        labels += T(M, fc + 4, name, 14, ink, { w: 700 });
        const gx = M + tw(name, 14, true) + 10;
        if (cx - mid - 8 - gx > 16) under += Ln(gx, fc, cx - mid - 8, fc, guide, "1 3");
      }
    } else {
      if (mode === "split") {
        labels += T(fc, nameY, name, 13, ink, { a: "middle", w: 700 });
        labels += `<text x="${f1x(fc)}" y="${f1x(fB + 24)}" font-size="12" fill="${mute}" text-anchor="middle"><tspan font-weight="700" fill="${ink}">${val}</tspan> · ${pc}</text>`;
        if (cy - mid - 6 - (nameY + 8) > 10) under += Ln(fc, nameY + 8, fc, cy - mid - 6, guide, "1 3");
        if (fB + 10 - (cy + mid + 6) > 10) under += Ln(fc, cy + mid + 6, fc, fB + 10, guide, "1 3");
      } else {
        labels += T(fc, fB + 28, val, 18, ink, { a: "middle", w: 700, ls: -0.3 }) + T(fc, fB + 46, `${name} · ${pc}`, 12, mute, { a: "middle" });
        if (fB + 10 - (cy + mid + 6) > 10) under += Ln(fc, cy + mid + 6, fc, fB + 10, guide, "1 3");
      }
    }

    if (drop && i < n - 1) {
      const fb = f1 + gap / 2, edge = stepped ? ((a + nb) / 2) * 0.96 : half(fb);
      const dp = `−${((1 - v[i + 1] / v[i]) * 100).toFixed(1)}%`, lost = `${fmt(v[i] - v[i + 1])} lost`, pw = tw(dp, 13, true) + 18;
      if (vert) {
        const px = W - M - pw, x0 = cx + edge + 5;
        under += `<circle cx="${f1x(x0)}" cy="${f1x(fb)}" r="2.5" fill="${pillInk}"/>` + Ln(x0 + 4, fb, px - 6, fb, line);
        under += `<rect x="${f1x(px)}" y="${f1x(fb - 11)}" width="${f1x(pw)}" height="22" rx="11" fill="${pillFill}"/>`;
        under += T(px + pw / 2, fb + 4.5, dp, 13, pillInk, { a: "middle", w: 700 }) + T(W - M, fb + 27, lost, 11, mute, { a: "end" });
      } else {
        const y0 = cy - edge - 5;
        under += `<circle cx="${f1x(fb)}" cy="${f1x(y0)}" r="2.5" fill="${pillInk}"/>` + Ln(fb, pillY + 34, fb, y0 - 4, line);
        under += `<rect x="${f1x(fb - pw / 2)}" y="${pillY - 11}" width="${f1x(pw)}" height="22" rx="11" fill="${pillFill}"/>`;
        under += T(fb, pillY + 4.5, dp, 13, pillInk, { a: "middle", w: 700 }) + T(fb, pillY + 27, lost, 11, mute, { a: "middle" });
      }
    }
  }

  const shadowCol = mixLab(fills[0], "#000000", 0.45);
  const defs = `<defs><filter id="sh" x="-10%" y="-10%" width="120%" height="135%"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="${shadowCol}" flood-opacity="0.16"/></filter></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}<rect width="${W}" height="${H}" fill="${bg}"/><g font-family="${FONT}">${head}${under}<g filter="url(#sh)">${conn}${bands}</g>${labels}</g></svg>`;
}
