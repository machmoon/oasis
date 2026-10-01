// Swiss event poster: modular column grid, seeded circle/bar geometry, giant flush headline.
export const meta = {
  title: "Raster Event Poster",
  kind: "poster",
  description: "An International Typographic Style event poster with a modular grid, seeded geometric composition and a giant flush-left headline, built for exhibitions, talks and gigs.",
  tags: ["poster", "swiss", "international style", "grid", "typography", "event", "modernist", "geometric"],
  price: 7,
  author: "oasis-factory",
  size: [595, 842],
};

export const params = {
  knobs: {
    background: { type: "color", label: "Paper", default: "#F1EEE7" },
    ink: { type: "color", label: "Ink", default: "#141414" },
    accent: { type: "color", label: "Accent", default: "#E3321F" },
    headline: { type: "text", label: "Headline", default: "Raster" },
    subline: { type: "text", label: "Subline", default: "International Exhibition of Typography & Grid Systems" },
    date: { type: "text", label: "Date", default: "14.09 — 02.11.2025" },
    composition: { type: "choice", label: "Composition", default: "mixed", options: ["circles", "bars", "arcs", "mixed"] },
    columns: { type: "range", label: "Grid columns", default: 6, min: 4, max: 12, step: 1 },
    seed: { type: "range", label: "Seed", default: 7, min: 1, max: 500, step: 1 },
    grid: { type: "toggle", label: "Show grid", default: false },
  },
  presets: {
    Basel: { background: "#F1EEE7", ink: "#141414", accent: "#E3321F" },
    Zurich: { background: "#FFFFFF", ink: "#1A1A1A", accent: "#1F4FD8" },
    Kunsthalle: { background: "#141414", ink: "#F1EEE7", accent: "#FFB400" },
    Lausanne: { background: "#E4ECE6", ink: "#0F3B2E", accent: "#FF6A3D" },
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

const LOW = [556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500];
const UP = [722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611];
function cw(c) {
  const k = c.charCodeAt(0);
  if (k >= 97 && k <= 122) return LOW[k - 97] / 1000;
  if (k >= 65 && k <= 90) return UP[k - 65] / 1000;
  if (k >= 48 && k <= 57) return 0.556;
  if (" .,:;'!|".indexOf(c) >= 0) return 0.278;
  if (c === "-" || c === "–") return 0.333;
  if (c === "—") return 1;
  if (c === "&") return 0.722;
  return 0.6;
}
function em(s, ls) { let w = 0; for (const c of s) w += cw(c); return w + ls * Math.max(0, s.length - 1); }
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f = (v) => (+v).toFixed(1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default function render(p) {
  const W = 595, H = 842, M = 36, G = 12, n = Math.round(p.columns);
  const availW = W - 2 * M;
  const colW = (availW - (n - 1) * G) / n, step = colW + G;
  const cx = (i) => M + i * step, span = (k) => k * colW + (k - 1) * G;
  const r = rng(p.seed * 7919 + 101);
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = (a) => a[Math.floor(r() * a.length)];
  const font = "Helvetica Neue, Helvetica, Arial, sans-serif";
  const ink = p.ink, acc = p.accent, bg = p.background;

  const c0 = Math.max(1, Math.ceil(n / 2));
  const dateStr = String(p.date).trim();
  let fsD = 15;
  const dW = span(c0) - G, dE = em(dateStr, 0);
  if (dE * fsD > dW) fsD = Math.max(8, dW / dE);
  const subW = span(n - c0), fsS = 10;
  const words = String(p.subline).trim().split(/\s+/).filter(Boolean);
  const wrap = (mw) => {
    const out = []; let line = "";
    for (const w of words) {
      const cand = line ? line + " " + w : w;
      if (line && em(cand, 0) * fsS > mw) { out.push(line); line = w; } else line = cand;
    }
    if (line) out.push(line);
    return out;
  };
  let sub = wrap(subW);
  if (sub.length > 1) {
    const L = sub.length;
    let t = Math.min(subW, (em(words.join(" "), 0) * fsS) / L);
    while (wrap(t).length > L && t < subW) t += 3;
    sub = wrap(Math.min(t, subW));
  }
  if (sub.length > 5) sub.length = 5;
  const lhS = 13, base0 = M + 22;
  const Z0raw = base0 + (Math.max(1, sub.length) - 1) * lhS + 26;
  const Z0 = M + Math.ceil((Z0raw - M) / step) * step;

  let info = `<rect x="${M}" y="${M}" width="${availW}" height="2" fill="${ink}"/><rect x="${M}" y="${M - 2}" width="${f(colW)}" height="6" fill="${acc}"/>`;
  info += `<text x="${M}" y="${base0}" font-family="${font}" font-weight="700" font-size="${f(fsD)}" letter-spacing="-0.2" fill="${ink}">${esc(dateStr)}</text>`;
  if (sub.length) info += `<text font-family="${font}" font-size="${fsS}" fill="${ink}">${sub.map((s, i) => `<tspan x="${f(cx(c0))}" y="${base0 + i * lhS}">${esc(s)}</tspan>`).join("")}</text>`;

  let hw = String(p.headline).trim().split(/\s+/).filter(Boolean);
  if (hw.length > 3) hw = [hw[0], hw[1], hw.slice(2).join(" ")];
  let Z1 = H - M, head = "";
  if (hw.length) {
    const LS = -0.03, L = hw.length;
    const ems = hw.map((s) => em(s, LS)), maxE = Math.max(...ems);
    const fsW = availW / Math.max(0.3, maxE - 0.1);
    const cap = ((H - 2 * M) * 0.4) / (0.72 + (L - 1) * 0.9);
    const fs = Math.min(fsW, cap, 320);
    const lh = fs * 0.9;
    const desc = /[gjpqy,Q]/.test(hw[L - 1]) ? fs * 0.21 : 0;
    const last = H - M - desc, first = last - (L - 1) * lh;
    Z1 = first - 0.72 * fs - Math.max(G * 2, fs * 0.14);
    const x = M - fs * 0.05;
    head = `<g font-family="${font}" font-weight="700" font-size="${f(fs)}" letter-spacing="${f(LS * fs)}" fill="${ink}">` +
      hw.map((s, i) => {
        const fit = fs === fsW && ems[i] === maxE && s.length > 1 ? ` textLength="${f(availW + fs * 0.1)}" lengthAdjust="spacing"` : "";
        return `<text x="${f(x)}" y="${f(first + i * lh)}"${fit}>${esc(s)}</text>`;
      }).join("") + `</g>`;
  }
  Z1 = Math.max(Z1, Z0 + step);
  const zh = Z1 - Z0;
  const rowsN = Math.max(1, Math.floor((zh + G) / step));
  const rowY = (j) => Z0 + j * step;
  const circ = (x, y, rad, fill) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${fill}"/>`;
  const rect = (x, y, w, h, fill) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"/>`;

  const bigCircle = () => {
    const kMax = Math.max(2, Math.min(n, rowsN));
    const k = ri(Math.max(2, Math.ceil(kMax * 0.6)), kMax), d = span(k);
    const c = ri(0, n - k), j = ri(0, Math.max(0, rowsN - k));
    return { k, d, c, X: cx(c) + d / 2, Y: rowY(j) + d / 2 };
  };
  const satellite = (b, rad) => {
    rad = Math.min(rad, zh / 2, availW / 2);
    const a0 = ri(0, 7); let best = null;
    for (let t = 0; t < 8; t++) {
      const a = ((a0 + t) % 8) * Math.PI / 4;
      const x = b.X + Math.cos(a) * b.d / 2, y = b.Y + Math.sin(a) * b.d / 2;
      const X = clamp(x, M + rad, W - M - rad), Y = clamp(y, Z0 + rad, Z1 - rad);
      const dd = Math.hypot(X - x, Y - y);
      if (!best || dd < best[2]) best = [X, Y, dd];
      if (dd < 0.5) break;
    }
    return [best[0], best[1], rad];
  };

  let comp = "";
  const mode = p.composition;
  if (mode === "circles") {
    const b = bigCircle(), flip = r() < 0.25;
    comp += circ(b.X, b.Y, b.d / 2, flip ? acc : ink);
    const s = satellite(b, span(Math.max(1, Math.round(b.k * 0.4))) / 2);
    comp += circ(s[0], s[1], s[2], flip ? ink : acc);
    const k3 = Math.max(1, Math.round(b.k * 0.25)), d3 = span(k3), sw = d3 * 0.14;
    const c3 = ri(0, n - k3), j3 = ri(0, Math.max(0, rowsN - k3));
    comp += `<circle cx="${f(cx(c3) + d3 / 2)}" cy="${f(rowY(j3) + d3 / 2)}" r="${f(d3 / 2 - sw / 2)}" fill="none" stroke="${ink}" stroke-width="${f(sw)}"/>`;
    const dots = ri(2, n), dy = rowY(rowsN - 1) + colW / 2;
    for (let i = 0; i < dots; i++) comp += circ(cx(i) + colW / 2, dy, colW * 0.15, ink);
  } else if (mode === "bars") {
    const th = [step * 0.22, step * 0.5, colW, step + colW], gaps = [G * 0.6, G, step * 0.6];
    const bars = []; let y = Z0;
    while (y < Z1 - step * 0.2 && bars.length < 14) {
      const t = Math.min(pick(th), Z1 - y), k = ri(Math.max(1, Math.ceil(n * 0.25)), n), c = ri(0, n - k);
      bars.push([cx(c), y, span(k), t]); y += t + pick(gaps);
    }
    const ai = ri(0, bars.length - 1);
    const vx = cx(ri(1, n - 1)) - G / 2, vw = Math.max(2, colW * 0.08);
    comp += rect(vx - vw / 2, Z0, vw, zh, ink);
    bars.forEach((b, i) => { comp += rect(b[0], b[1], b[2], b[3], i === ai ? acc : ink); });
  } else if (mode === "arcs") {
    const m = n >= 8 ? 2 : 1, s = span(m), cc = Math.floor(n / m);
    const rr = Math.max(1, Math.floor((zh + G) / (s + G)));
    const accIdx = ri(0, cc * rr - 1);
    for (let j = 0; j < rr; j++) for (let i = 0; i < cc; i++) {
      const idx = j * cc + i, x = cx(i * m), y = Z0 + j * (s + G);
      let t = r(); const o = ri(0, 3);
      const fill = idx === accIdx ? acc : (r() < 0.12 ? acc : ink);
      if (idx === accIdx && t < 0.28) t = 0.4;
      const rot = ` transform="rotate(${o * 90} ${f(x + s / 2)} ${f(y + s / 2)})"`;
      if (t < 0.28) continue;
      else if (t < 0.56) comp += `<path d="M${f(x)},${f(y)}H${f(x + s)}A${f(s)},${f(s)} 0 0 1 ${f(x)},${f(y + s)}Z" fill="${fill}"${rot}/>`;
      else if (t < 0.82) comp += `<path d="M${f(x)},${f(y + s)}A${f(s / 2)},${f(s / 2)} 0 0 1 ${f(x + s)},${f(y + s)}Z" fill="${fill}"${rot}/>`;
      else comp += circ(x + s / 2, y + s / 2, s / 2, fill);
    }
  } else {
    const b = bigCircle();
    comp += circ(b.X, b.Y, b.d / 2, ink);
    const q = ri(3, 6), up = r() < 0.4;
    for (let i = 0; i < q; i++) {
      const t = Math.max(1.5, ((i + 1) / q) * (b.d / (2 * q)) * 0.6);
      const yy = up ? b.Y - (i / q) * b.d / 2 - t : b.Y + (i / q) * b.d / 2;
      comp += rect(M, yy, availW, t, bg);
    }
    const ext = r() < 0.5 ? -1 : 1;
    const rc0 = clamp(ext < 0 ? b.c - 1 : b.c, 0, n - 1), rc1 = clamp(b.c + b.k + (ext > 0 ? 1 : 0), 1, n);
    const rw = cx(rc1 - 1) + colW - cx(rc0), gap = Math.max(6, G * 0.6);
    const below = b.Y + b.d / 2 + gap, above = b.Y - b.d / 2 - gap - 3;
    if (below + 3 <= Z1) comp += rect(cx(rc0), below, rw, 3, ink);
    else if (above >= Z0) comp += rect(cx(rc0), above, rw, 3, ink);
    const s = satellite(b, span(Math.max(1, Math.round(b.k * 0.35))) / 2);
    comp += circ(s[0], s[1], s[2], acc);
  }

  let overlay = "";
  if (p.grid) {
    overlay = `<g fill="${acc}" fill-opacity="0.08">${Array.from({ length: n }, (_, i) => rect(cx(i), M, colW, H - 2 * M, acc)).join("")}</g><g stroke="${acc}" stroke-opacity="0.45" stroke-width="0.5" fill="none">`;
    for (let y = M; y <= H - M + 0.1; y += step) overlay += `<line x1="${M}" y1="${f(y)}" x2="${W - M}" y2="${f(y)}"/>`;
    overlay += `<rect x="${M}" y="${M}" width="${availW}" height="${H - 2 * M}" stroke-opacity="0.8"/></g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><clipPath id="zone"><rect x="${M}" y="${f(Z0)}" width="${availW}" height="${f(zh)}"/></clipPath></defs><rect width="${W}" height="${H}" fill="${bg}"/><g clip-path="url(#zone)">${comp}</g>${info}${head}${overlay}</svg>`;
}
