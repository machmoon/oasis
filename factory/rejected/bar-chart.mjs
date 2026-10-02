// Bar chart: vertical or horizontal, single/grouped/stacked series, unit-aware axis, header summary and a geometry-anchored tooltip.
export const meta = {
  title: "Clear Bars",
  kind: "ui",
  description: "A clean, brand-tunable bar chart with unit-aware axis, gridlines, header KPI and a tooltip with totals and period-over-period change, for dashboards, decks and product mockups.",
  tags: ["chart", "bar chart", "data viz", "dashboard", "analytics", "tooltip", "kpi", "graph"],
  price: 0,
  author: "oasis-factory",
  size: [800, 560],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#F6F5F1" },
    ink: { type: "color", role: "ink", label: "Ink", default: "#1B1D22" },
    primary: { type: "color", role: "primary", label: "Series A (Online)", default: "#3B5BDB" },
    secondary: { type: "color", role: "secondary", label: "Series B (Retail)", default: "#A5B4FC" },
    orientation: { type: "choice", label: "Orientation", default: "vertical", options: ["vertical", "horizontal"] },
    mode: { type: "choice", label: "Mode", default: "grouped", options: ["single", "grouped", "stacked"] },
    title: { type: "text", label: "Title (unit)", default: "Revenue ($k)" },
    data: { type: "text", label: "Data (label a/b, …)", default: "Jan 42/28, Feb 58/31, Mar 35/30, Apr 71/40, May 64/36, Jun 88/47" },
    radius: { type: "range", label: "Corner radius", default: 6, min: 0, max: 12, step: 1 },
    focus: { type: "range", label: "Callout bar", default: 4, min: 1, max: 12, step: 1 },
    gridlines: { type: "toggle", label: "Gridlines", default: true },
  },
  presets: {
    Sage: { background: "#F2F4EF", ink: "#1F2A22", primary: "#2F6B4F", secondary: "#A8D5BA" },
    Ember: { background: "#FFF7F0", ink: "#2B1A12", primary: "#E8590C", secondary: "#FFC9A3" },
    Midnight: { background: "#0F1117", ink: "#E8EAF0", primary: "#7C9CFF", secondary: "#3A4A80" },
    Mono: { background: "#FFFFFF", ink: "#111111", primary: "#111111", secondary: "#BDBDBD" },
  },
};

const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
const NAMES = ["Online", "Retail"];
const UP = ["#2B8A3E", "#69DB7C"], DOWN = ["#C92A2A", "#FF8787"];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (h) => { const c = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
const pick = (pair, on) => (contrast(pair[0], on) >= contrast(pair[1], on) ? pair[0] : pair[1]);
function ensure(fg, bg, t, minC) {
  let c = mix(bg, fg, t);
  while (contrast(c, bg) < minC && t < 1) { t = Math.min(1, t + 0.04); c = mix(bg, fg, t); }
  return c;
}
const tw = (s, fs, bold) => String(s).length * fs * (bold ? 0.6 : 0.55);

function parse(s) {
  const out = [];
  String(s).split(",").forEach((item) => {
    const toks = item.trim().split(/\s+/).filter(Boolean);
    const lab = [], nums = [];
    toks.forEach((t) => { if (/^[\d.\/]+$/.test(t)) t.split("/").forEach((v) => { const n = parseFloat(v); if (!isNaN(n)) nums.push(Math.max(0, n)); }); else lab.push(t); });
    if (!lab.length && !nums.length) return;
    let label = lab.join(" ") || String(out.length + 1);
    if (label.length > 10) label = label.slice(0, 9) + "…";
    out.push({ label, a: nums[0] || 0, b: nums[1] || 0 });
  });
  return out.length ? out.slice(0, 12) : [{ label: "A", a: 3, b: 2 }, { label: "B", a: 5, b: 3 }, { label: "C", a: 4, b: 4 }];
}
function niceStep(max, target) {
  const raw = max / target, pw = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / pw;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pw;
}
function fmt(v) {
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (v >= 1e4) return (v / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
  return String(Math.round(v * 10) / 10);
}
function pct(cur, prev) {
  if (prev <= 0) return { t: cur > 0 ? "new" : "0%", s: cur > 0 ? 1 : 0 };
  const v = ((cur - prev) / prev) * 100, a = Math.abs(v);
  return { t: (v > 0 ? "+" : v < 0 ? "−" : "") + (a < 10 ? a.toFixed(1) : Math.round(a)) + "%", s: Math.sign(Math.round(v * 10)) };
}
function rr(x, y, w, h, r, side) {
  if (w <= 0.2 || h <= 0.2) return "";
  r = Math.max(0, Math.min(r, side === "top" ? h : w));
  const f = (n) => n.toFixed(1);
  if (r < 0.5) return `M${f(x)},${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
  if (side === "top") return `M${f(x)},${f(y + h)}V${f(y + r)}A${f(r)},${f(r)} 0 0 1 ${f(x + r)},${f(y)}H${f(x + w - r)}A${f(r)},${f(r)} 0 0 1 ${f(x + w)},${f(y + r)}V${f(y + h)}Z`;
  return `M${f(x)},${f(y)}H${f(x + w - r)}A${f(r)},${f(r)} 0 0 1 ${f(x + w)},${f(y + r)}V${f(y + h - r)}A${f(r)},${f(r)} 0 0 1 ${f(x + w - r)},${f(y + h)}H${f(x)}Z`;
}

export default function render(p) {
  const W = 800, H = 560, L = 40, HB = 116, bg = p.background, ink = p.ink;
  const vert = p.orientation !== "horizontal", two = p.mode !== "single", stacked = p.mode === "stacked";
  const muted = ensure(ink, bg, 0.58, 4.5), grid = ensure(ink, bg, 0.1, 1.22), axis = ensure(ink, bg, 0.35, 2.2);
  const surface = ensure(ink, bg, 0.045, 1.09), tipMuted = ensure(bg, ink, 0.68, 4.5), tipRule = ensure(bg, ink, 0.18, 1.4);

  const rawT = String(p.title || "").trim(), um = rawT.match(/\(([^)]*)\)\s*$/);
  const unit = um ? um[1].trim() : "", name = (rawT.replace(/\s*\([^)]*\)\s*$/, "") || "Value").slice(0, 32);
  const pre = (unit.match(/^[$€£¥₹]+/) || [""])[0], suf = unit.slice(pre.length);
  const fu = (v) => pre + fmt(v) + suf;

  const d = parse(p.data), n = d.length, fi = Math.min(n, Math.max(1, Math.round(p.focus))) - 1;
  const tot = (x) => x.a + (two ? x.b : 0);
  const maxV = Math.max(...d.map((x) => (stacked ? x.a + x.b : two ? Math.max(x.a, x.b) : x.a))) || 1;
  const step = niceStep(maxV, 5), top = Math.ceil(maxV / step - 1e-9) * step || step, ticks = Math.round(top / step);

  let x0, x1, y0, y1;
  if (vert) { x0 = L + tw(fu(top), 12) + 14; x1 = W - 36; y0 = 150; y1 = H - 96; }
  else { const lw = Math.max(40, Math.min(150, Math.max(...d.map((x) => tw(x.label, 13, true))))); x0 = L + lw + 14; x1 = W - 56; y0 = 140; y1 = H - 104; }
  const cS = vert ? x0 : y0, cL = vert ? x1 - x0 : y1 - y0, vL = vert ? y1 - y0 : x1 - x0;
  const band = cL / n, gT = band * (two && !stacked ? 0.7 : 0.58), px = (v) => (v / top) * vL;
  const outline = (c) => (contrast(c, bg) < 1.25 ? ` stroke="${mix(c, ink, 0.3)}" stroke-width="1"` : "");
  const rad = (t) => Math.min(p.radius, t * 0.3);

  const seg = (c, t, d0, d1, fill, round) => {
    const r = round ? rad(t) : 0;
    const path = vert ? rr(c, y1 - d1, t, d1 - d0, r, "top") : rr(x0 + d0, c, d1 - d0, t, r, "right");
    return path ? `<path d="${path}" fill="${fill}"${outline(fill)}/>` : "";
  };

  let gridSvg = "", labels = "", bars = "", focusBand = "";
  for (let k = 0; k <= ticks; k++) {
    const dist = px(k * step), v = fu(k * step);
    if (vert) {
      const y = (y1 - dist).toFixed(1);
      if (k > 0 && p.gridlines) gridSvg += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${grid}" stroke-width="1"/>`;
      labels += `<text x="${x0 - 14}" y="${(y1 - dist + 4).toFixed(1)}" text-anchor="end" font-size="12" fill="${muted}">${esc(v)}</text>`;
    } else {
      const x = (x0 + dist).toFixed(1);
      if (k > 0 && p.gridlines) gridSvg += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="${grid}" stroke-width="1"/>`;
      labels += `<text x="${x}" y="${y1 + 26}" text-anchor="middle" font-size="12" fill="${muted}">${esc(v)}</text>`;
    }
  }
  const axisLine = vert ? `<line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="${axis}" stroke-width="1.5"/>` : `<line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" stroke="${axis}" stroke-width="1.5"/>`;

  let aC = 0, aD = 0, aT = gT;
  d.forEach((x, i) => {
    const bS = cS + i * band, c0 = bS + (band - gT) / 2, focused = i === fi;
    let hitC, hitD, hitT = gT;
    if (!two) { bars += seg(c0, gT, 0, px(x.a), p.primary, true); hitC = c0 + gT / 2; hitD = px(x.a); }
    else if (stacked) {
      const da = px(x.a), db = px(x.a + x.b), gap = x.a > 0 && x.b > 0 ? 1.5 : 0;
      bars += seg(c0, gT, 0, da - gap, p.primary, x.b <= 0);
      bars += seg(c0, gT, da + gap, db, p.secondary, true);
      hitC = c0 + gT / 2; hitD = db;
    } else {
      const gap = Math.min(6, gT * 0.08), bt = (gT - gap) / 2;
      bars += seg(c0, bt, 0, px(x.a), p.primary, true) + seg(c0 + bt + gap, bt, 0, px(x.b), p.secondary, true);
      const useB = x.b > x.a;
      hitC = useB ? c0 + bt + gap + bt / 2 : c0 + bt / 2; hitD = px(useB ? x.b : x.a); hitT = bt;
    }
    if (focused) {
      const inset = band * 0.06;
      focusBand = vert ? `<rect x="${(bS + inset).toFixed(1)}" y="${y0 - 10}" width="${(band - inset * 2).toFixed(1)}" height="${y1 - y0 + 10}" rx="8" fill="${surface}"/>`
        : `<rect x="${x0}" y="${(bS + inset).toFixed(1)}" width="${x1 - x0 + 16}" height="${(band - inset * 2).toFixed(1)}" rx="8" fill="${surface}"/>`;
      aC = hitC; aD = hitD; aT = hitT;
    }
    const mid = bS + band / 2, lw = focused ? "700" : "400", lc = focused ? ink : muted;
    if (vert) labels += `<text x="${mid.toFixed(1)}" y="${y1 + 26}" text-anchor="middle" font-size="13" font-weight="${lw}" fill="${lc}">${esc(x.label)}</text>`;
    else labels += `<text x="${x0 - 14}" y="${(mid + 4.5).toFixed(1)}" text-anchor="end" font-size="13" font-weight="${lw}" fill="${lc}">${esc(x.label)}</text>`;
  });
  const ax = vert ? aC : x0 + aD, ay = vert ? y1 - aD : aC;

  const f = d[fi], prev = fi > 0 ? d[fi - 1] : null;
  const rows = two
    ? [{ c: p.primary, n: NAMES[0], t: fu(f.a) }, { c: p.secondary, n: NAMES[1], t: fu(f.b) }, { c: null, n: "Total", t: fu(f.a + f.b) }]
    : [{ c: p.primary, n: name, t: fu(f.a) }];
  if (prev) { const dl = pct(tot(f), tot(prev)); rows.push({ c: null, n: `vs ${prev.label}`, t: dl.t, col: dl.s > 0 ? pick(UP, ink) : dl.s < 0 ? pick(DOWN, ink) : tipMuted }); }
  else rows.push({ c: null, n: "First period", t: "—", col: tipMuted });
  const tW = Math.max(150, tw(f.label, 14, true) + 32, ...rows.map((r) => tw(r.n, 12) + tw(r.t, 13, true) + 60));
  const tH = 44 + rows.length * 20;
  let tx, ty, ptr;
  if (vert && ay - 14 - tH >= HB) {
    tx = Math.max(12, Math.min(W - 12 - tW, ax - tW / 2)); ty = ay - 14 - tH;
    const pxp = Math.max(tx + 14, Math.min(tx + tW - 14, ax));
    ptr = `M${(pxp - 7).toFixed(1)},${ty + tH - 0.5}L${pxp.toFixed(1)},${ty + tH + 7}L${(pxp + 7).toFixed(1)},${ty + tH - 0.5}Z`;
  } else {
    const off = vert ? aT / 2 + 12 : 14, right = ax + off + tW <= W - 12;
    tx = right ? ax + off : ax - off - tW;
    ty = Math.max(HB, Math.min(H - 60 - tH, vert ? ay - 16 : ay - tH / 2));
    const py = Math.round(Math.max(ty + 14, Math.min(ty + tH - 14, ay)));
    ptr = right ? `M${(tx + 0.5).toFixed(1)},${py - 7}L${(tx - 7).toFixed(1)},${py}L${(tx + 0.5).toFixed(1)},${py + 7}Z`
      : `M${(tx + tW - 0.5).toFixed(1)},${py - 7}L${(tx + tW + 7).toFixed(1)},${py}L${(tx + tW - 0.5).toFixed(1)},${py + 7}Z`;
  }
  let tip = `<g filter="url(#sh)"><rect x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" width="${tW.toFixed(1)}" height="${tH}" rx="10" fill="${ink}"/><path d="${ptr}" fill="${ink}"/></g>`;
  tip += `<text x="${(tx + 16).toFixed(1)}" y="${(ty + 24).toFixed(1)}" font-size="14" font-weight="700" fill="${bg}">${esc(f.label)}</text>`;
  tip += `<line x1="${(tx + 16).toFixed(1)}" y1="${(ty + 34).toFixed(1)}" x2="${(tx + tW - 16).toFixed(1)}" y2="${(ty + 34).toFixed(1)}" stroke="${tipRule}" stroke-width="1"/>`;
  rows.forEach((r, j) => {
    const by = ty + 54 + j * 20, sw = r.c ? `<rect x="${(tx + 16).toFixed(1)}" y="${(by - 9).toFixed(1)}" width="9" height="9" rx="2.5" fill="${r.c}"${contrast(r.c, ink) < 1.6 ? ` stroke="${tipMuted}" stroke-width="1"` : ""}/>` : "";
    tip += `${sw}<text x="${(tx + (r.c ? 32 : 16)).toFixed(1)}" y="${by.toFixed(1)}" font-size="12" fill="${tipMuted}">${esc(r.n)}</text>`;
    tip += `<text x="${(tx + tW - 16).toFixed(1)}" y="${by.toFixed(1)}" text-anchor="end" font-size="13" font-weight="700" fill="${r.col || bg}">${esc(r.t)}</text>`;
  });
  const dot = `<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="4.5" fill="${bg}" stroke="${ink}" stroke-width="2"/>`;

  const total = d.reduce((s, x) => s + tot(x), 0);
  const peak = d.reduce((m, x) => (tot(x) > tot(m) ? x : m), d[0]);
  const big = fu(total), bigW = tw(big, 34, true) * 0.9;
  let header = `<text x="${L}" y="54" font-size="15" font-weight="700" fill="${ink}">${esc(name)}</text>`;
  header += `<text x="${L}" y="96" font-size="34" font-weight="700" letter-spacing="-0.5" fill="${ink}">${esc(big)}</text>`;
  let cx = L + bigW + 14;
  if (n > 1) {
    const dl = pct(tot(d[n - 1]), tot(d[n - 2])), col = dl.s > 0 ? pick(UP, bg) : dl.s < 0 ? pick(DOWN, bg) : muted;
    const txt = `${dl.t} ${d[n - 1].label} vs ${d[n - 2].label}`, cw = tw(txt, 12, true) + 20;
    header += `<rect x="${cx.toFixed(1)}" y="74" width="${cw.toFixed(1)}" height="24" rx="12" fill="${mix(bg, col, 0.13)}"/><text x="${(cx + 10).toFixed(1)}" y="90.5" font-size="12" font-weight="700" fill="${col}">${esc(txt)}</text>`;
    cx += cw + 12;
  }
  header += `<text x="${cx.toFixed(1)}" y="90.5" font-size="13" fill="${muted}">${two ? `${NAMES[0]} + ${NAMES[1]} combined` : "Total"} · peak ${esc(peak.label)}</text>`;

  const ly = H - 34, item = (x, c, t) => `<rect x="${x}" y="${ly - 10}" width="12" height="12" rx="3" fill="${c}"${outline(c)}/><text x="${x + 20}" y="${ly}" font-size="13" fill="${muted}">${esc(t)}</text>`;
  const legend = two ? item(x0, p.primary, NAMES[0]) + item(x0 + 96, p.secondary, NAMES[1]) : item(x0, p.primary, name);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><filter id="sh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.18"/></filter></defs><rect width="${W}" height="${H}" fill="${bg}"/><g font-family="${FONT}">${header}${focusBand}${gridSvg}${bars}${axisLine}${labels}${legend}${dot}${tip}</g></svg>`;
}
