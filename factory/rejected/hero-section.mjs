// Landing page hero: badge, headline, dual CTAs, social proof and a product window or abstract visual, with brand-safe tonal colour.
export const meta = {
  title: "Launch Hero",
  kind: "ui",
  description: "A landing-page hero with badge, headline, dual CTAs, social proof and a product or abstract visual in three layouts, for SaaS sites and pitch mockups.",
  tags: ["hero", "landing page", "website", "saas", "header", "cta", "marketing", "ui"],
  price: 10,
  author: "oasis-factory",
  size: [1280, 840],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#F7F5F0" },
    ink: { type: "color", role: "ink", label: "Text", default: "#16151A" },
    accent: { type: "color", role: "primary", label: "Accent", default: "#5B4BFF" },
    accent2: { type: "color", role: "secondary", label: "Accent 2", default: "#FF8A5B" },
    layout: { type: "choice", label: "Layout", default: "split", options: ["left", "center", "split"] },
    backdrop: { type: "choice", label: "Background style", default: "glow", options: ["plain", "grid", "dots", "glow"] },
    visual: { type: "choice", label: "Visual", default: "product", options: ["product", "abstract"] },
    headline: { type: "choice", label: "Headline length", default: "medium", options: ["short", "medium", "long"] },
    radius: { type: "range", label: "Corner radius", default: 12, min: 0, max: 32, step: 2 },
    intensity: { type: "range", label: "Backdrop strength", default: 50, min: 0, max: 100, step: 5 },
    badge: { type: "toggle", label: "Badge pill", default: true },
  },
  presets: {
    Ocean: { background: "#EEF4FA", ink: "#0B1B2E", accent: "#1F6FEB", accent2: "#38BDF8" },
    Midnight: { background: "#0C0D12", ink: "#F2F2F5", accent: "#8B7CFF", accent2: "#3FE0C5" },
    Citrus: { background: "#FFFBEF", ink: "#1E1B12", accent: "#E8501C", accent2: "#FFC233" },
    Forest: { background: "#EAF1EC", ink: "#0F2A1F", accent: "#1F8A5B", accent2: "#B9E36B" },
  },
};

const F = "Helvetica Neue, Helvetica, Arial, sans-serif";
const HEAD = {
  short: "Ship work that matters.",
  medium: "Plan, build and ship in one calm workspace",
  long: "The calmest way for modern product teams to plan, build, launch and learn together",
};
const SUB = "Lumen brings roadmaps, docs and releases into one fast, focused tool — so your team spends less time syncing and more time shipping.";
const NAV = [["Home", "M2.5 8 8 3.5 13.5 8v5.5h-11z"], ["Roadmap", "M3 4h7M3 8h10M3 12h5"], ["Docs", "M4 2h5.5L12.5 5v9H4zM6.5 8h3.5M6.5 11h3.5"], ["Releases", "M8 2l6 6-6 6-6-6z"], ["Insights", "M3 14V9M8 14V3M13 14V7"]];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = (v) => (Math.round(v * 10) / 10).toString();
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const gam = (v) => { v = Math.min(1, Math.max(0, v)); return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; };
const hex = (c) => "#" + c.map((v) => Math.round(gam(v) * 255).toString(16).padStart(2, "0")).join("");
function lum(h) { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function lab(h) {
  const [r, g, b] = rgb(h).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function unlab([L, a, b]) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return hex([4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]);
}
function mix(a, b, t) { const A = lab(a), B = lab(b); return unlab(A.map((v, i) => v + (B[i] - v) * t)); }
function step(base, toward, minC, ref) {
  for (let t = 0.02; t <= 1; t += 0.02) { const c = mix(base, toward, t); if (contrast(c, ref || base) >= minC) return c; }
  return toward;
}
const enforce = (col, bg, minC, toward) => (contrast(col, bg) >= minC ? col : step(col, toward, minC, bg));
const on = (col) => (contrast("#FFFFFF", col) >= contrast("#111114", col) ? "#FFFFFF" : "#111114");

function palette(p) {
  const bg = p.background, dark = lum(bg) < 0.2, far = dark ? "#FFFFFF" : "#000000";
  const ink = contrast(p.ink, bg) >= 4.5 ? p.ink : dark ? "#F4F4F6" : "#121216";
  let muted = ink;
  for (let t = 0.55; t >= 0; t -= 0.05) { const c = mix(ink, bg, t); if (contrast(c, bg) >= 4.8) { muted = c; break; } }
  const panel = step(bg, far, 1.08);
  const card = dark ? step(bg, "#FFFFFF", 1.22) : mix(bg, "#FFFFFF", 0.8);
  const line = step(bg, ink, 1.5);
  const acc = enforce(p.accent, bg, 2, ink), acc2 = enforce(p.accent2, card, 1.6, ink);
  return { bg, dark, ink, muted, panel, card, line, acc, acc2, onAcc: on(acc), on2: on(acc2),
    accHi: mix(acc, "#FFFFFF", 0.4), accLo: mix(acc, "#000000", 0.3), accFade: mix(acc, card, 0.45),
    accSoft: mix(panel, acc, 0.18), accText: enforce(acc, panel, 3.2, ink), stageA: mix(bg, acc, dark ? 0.16 : 0.12) };
}

function wrap(str, fs, maxW, k) {
  const out = []; let cur = "";
  for (const w of str.split(" ")) {
    const t = cur ? cur + " " + w : w;
    if (t.length * fs * k > maxW && cur) { out.push(cur); cur = w; } else cur = t;
  }
  out.push(cur); return out;
}
const tx = (x, y, s, size, wt, fill, anchor = "start", extra = "") =>
  `<text x="${f(x)}" y="${f(y)}" font-family="${F}" font-size="${size}" font-weight="${wt}" fill="${fill}" text-anchor="${anchor}"${extra}>${s}</text>`;

function product(c, x, y, w, h, r, cen) {
  const tb = 44, compact = w < 520, sw = compact ? 64 : 160, rr = Math.min(r, 24), ir = Math.min(r, 12);
  const box = `x="${x}" y="${y}" width="${w}" height="${h}" rx="${rr}"`, ux = cen ? x + w / 2 - 100 : x + 84;
  let s = `<clipPath id="win"><rect ${box}/></clipPath><rect ${box} fill="${c.card}" filter="url(#sh)"/><g clip-path="url(#win)">`;
  s += `<rect x="${x}" y="${y + tb}" width="${sw}" height="${h - tb}" fill="${c.panel}"/><path d="M${x} ${y + tb}H${x + w}M${x + sw} ${y + tb}V${y + h}" stroke="${c.line}"/>`;
  [0, 1, 2].forEach((i) => (s += `<circle cx="${x + 22 + i * 16}" cy="${y + 22}" r="5" fill="${c.line}"/>`));
  s += `<rect x="${ux}" y="${y + 12}" width="200" height="20" rx="${Math.min(r, 10)}" fill="${c.panel}"/>` + tx(ux + 100, y + 26.5, "lumen.so/overview", 12, 500, c.muted, "middle");
  let ny = y + tb + 18;
  if (!compact) {
    s += `<rect x="${x + 18}" y="${ny}" width="24" height="24" rx="${Math.min(r, 7)}" fill="${c.acc}"/>` + tx(x + 30, ny + 17, "L", 13, 700, c.onAcc, "middle") + tx(x + 50, ny + 17, "Lumen HQ", 14, 700, c.ink);
    ny += 44;
  }
  NAV.forEach(([label, d], i) => {
    const act = i === 1, iy = ny + i * 40, ix = compact ? x + sw / 2 - 8 : x + 22;
    if (act) s += `<rect x="${x + 10}" y="${iy}" width="${sw - 20}" height="34" rx="${ir}" fill="${c.accSoft}"/>`;
    s += `<path transform="translate(${f(ix)} ${iy + 9})" d="${d}" fill="none" stroke="${act ? c.accText : c.muted}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (!compact) s += tx(x + 48, iy + 22, label, 14, act ? 700 : 500, act ? c.ink : c.muted);
  });
  const mx = x + sw + 28, mw = w - sw - 56, kw = (mw - 24) / 3, ky = y + tb + 84, kh = 78;
  s += tx(mx, y + tb + 40, "Overview", 20, 700, c.ink) + tx(mx, y + tb + 61, "Last 30 days", 13, 400, c.muted);
  s += `<rect x="${f(mx + mw - 76)}" y="${y + tb + 22}" width="76" height="30" rx="${Math.min(r, 15)}" fill="${c.acc}"/>` + tx(mx + mw - 38, y + tb + 41.5, "Share", 13, 600, c.onAcc, "middle");
  [["Revenue", "$48.2k", "+12.4%"], ["Users", "8,940", "+6.1%"], ["Retention", "94.2%", "+2.3%"]].forEach((k, i) => {
    const kx = mx + i * (kw + 12);
    s += `<rect x="${f(kx)}" y="${ky}" width="${f(kw)}" height="${kh}" rx="${ir}" fill="${c.panel}"/>` + tx(kx + 14, ky + 26, k[0], 12, 500, c.muted) + tx(kx + 14, ky + 58, k[1], 24, 700, c.ink, "start", ` letter-spacing="-0.5"`);
    if (kw > 150) s += tx(kx + kw - 14, ky + 26, k[2], 12, 700, c.accText, "end");
  });
  const cy0 = ky + kh + 30, chh = Math.max(90, y + h - cy0 - 30), rnd = rng(7), n = 12, pts = [], cw = mw - 18;
  for (let i = 0; i < 3; i++) s += `<path d="M${f(mx)} ${f(cy0 + (chh * i) / 3)}H${f(mx + mw)}" stroke="${c.line}" stroke-dasharray="3 5"/>`;
  for (let i = 0; i < n; i++) pts.push([mx + (cw * i) / (n - 1), cy0 + chh * (1 - Math.min(0.9, Math.max(0.1, 0.26 + (0.55 * i) / (n - 1) + (rnd() - 0.5) * 0.26)))]);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < n; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], dx = (x1 - x0) / 2; d += `C${f(x0 + dx)} ${f(y0)} ${f(x1 - dx)} ${f(y1)} ${f(x1)} ${f(y1)}`; }
  const [lx, ly] = pts[n - 1];
  s += `<path d="${d}L${f(lx)} ${f(cy0 + chh)}L${f(mx)} ${f(cy0 + chh)}Z" fill="url(#ag)"/><path d="${d}" fill="none" stroke="url(#lg)" stroke-width="3" stroke-linecap="round"/>`;
  s += `<circle cx="${f(lx)}" cy="${f(ly)}" r="11" fill="${c.acc}" opacity="0.2"/><circle cx="${f(lx)}" cy="${f(ly)}" r="5" fill="${c.card}" stroke="${c.acc}" stroke-width="2.5"/>`;
  return s + `</g><rect ${box} fill="none" stroke="${c.line}"/>`;
}

function toast(c, x, y, r) {
  return `<rect x="${x}" y="${y}" width="240" height="64" rx="${Math.min(r, 18)}" fill="${c.card}" stroke="${c.line}" filter="url(#sh)"/><circle cx="${x + 32}" cy="${y + 32}" r="16" fill="${c.acc2}"/><path d="M${x + 25} ${y + 32}l5 5 9-10" fill="none" stroke="${c.on2}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` +
    tx(x + 60, y + 29, "Release 2.4 shipped", 14, 700, c.ink) + tx(x + 60, y + 48, "2 min ago · 14 changes", 12, 400, c.muted);
}

function chip(c, x, y, r) {
  const w = 248;
  return `<rect x="${x}" y="${y}" width="${w}" height="44" rx="${Math.min(r, 22)}" fill="${c.card}" stroke="${c.line}" filter="url(#sh)"/>` +
    `<path transform="translate(${x + 16} ${y + 14})" d="M8 1.5l1.6 4.9 4.9 1.6-4.9 1.6L8 14.5l-1.6-4.9L1.5 8l4.9-1.6z" fill="${c.accText}"/>` +
    tx(x + 42, y + 27, "Summarise this sprint", 13, 500, c.ink) +
    `<rect x="${x + w - 46}" y="${y + 11}" width="32" height="22" rx="${Math.min(r, 6)}" fill="${c.panel}"/>` + tx(x + w - 30, y + 26.5, "⌘K", 12, 600, c.muted, "middle");
}

function glass(c, gx, gy, gw, gh, r) {
  let o = `<rect x="${f(gx)}" y="${f(gy)}" width="${f(gw)}" height="${f(gh)}" rx="${Math.min(r, 20)}" fill="${c.card}" fill-opacity="0.94" stroke="${c.line}" filter="url(#sh)"/>`;
  o += `<circle cx="${f(gx + 30)}" cy="${f(gy + 32)}" r="12" fill="${c.acc}"/><rect x="${f(gx + 52)}" y="${f(gy + 24)}" width="${f(gw * 0.42)}" height="7" rx="3.5" fill="${c.ink}"/><rect x="${f(gx + 52)}" y="${f(gy + 37)}" width="${f(gw * 0.28)}" height="6" rx="3" fill="${c.line}"/>`;
  const sy = gy + gh - 22, sx = gx + 22, w = gw - 44;
  return o + `<path d="M${f(sx)} ${f(sy)}C${f(sx + w * 0.2)} ${f(sy - 14)} ${f(sx + w * 0.35)} ${f(sy + 6)} ${f(sx + w * 0.55)} ${f(sy - 8)}S${f(sx + w * 0.85)} ${f(sy - 22)} ${f(sx + w)} ${f(sy - 16)}" fill="none" stroke="url(#lg)" stroke-width="3" stroke-linecap="round"/>`;
}

function abstract(c, cx, cy, s, r) {
  const q = s * 0.3, qx = cx + s * 0.1, qy = cy - s * 0.46;
  let o = `<circle cx="${cx}" cy="${cy}" r="${f(s * 0.48)}" fill="none" stroke="${c.line}" stroke-width="1.5" stroke-dasharray="2 9" stroke-linecap="round"/>`;
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) o += `<circle cx="${f(cx - s * 0.5 + i * 14)}" cy="${f(cy + s * 0.2 + j * 14)}" r="2" fill="${c.line}"/>`;
  o += `<circle cx="${cx}" cy="${cy}" r="${f(s * 0.32)}" fill="url(#orb)"/><circle cx="${cx}" cy="${cy}" r="${f(s * 0.32)}" fill="url(#hl)"/>`;
  o += `<rect x="${f(qx)}" y="${f(qy)}" width="${f(q)}" height="${f(q)}" rx="${f(Math.min(r * 1.5, q / 2))}" fill="none" stroke="${c.ink}" stroke-width="2" transform="rotate(14 ${f(qx + q / 2)} ${f(qy + q / 2)})"/>`;
  o += `<circle cx="${f(cx - s * 0.36)}" cy="${f(cy - s * 0.28)}" r="${f(s * 0.05)}" fill="${c.acc2}"/>`;
  return o + glass(c, cx - s * 0.04, cy + s * 0.1, s * 0.46, s * 0.26, r);
}

function horizon(c, top, r, W, H) {
  const R = 560, cx = W / 2, cy = top + R, RR = R + 44;
  let o = `<circle cx="${cx}" cy="${cy}" r="${RR}" fill="none" stroke="${c.line}" stroke-width="1.5" stroke-dasharray="2 9" stroke-linecap="round"/>`;
  o += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#orb)"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#hl)"/><rect x="0" y="${f(top)}" width="${W}" height="${f(H - top)}" fill="url(#fd)"/>`;
  o += `<circle cx="${f(cx + RR * Math.cos(-2.5))}" cy="${f(cy + RR * Math.sin(-2.5))}" r="14" fill="${c.acc2}"/>`;
  const qx = cx + RR * Math.cos(-0.55), qy = cy + RR * Math.sin(-0.55);
  o += `<rect x="${f(qx - 34)}" y="${f(qy - 34)}" width="68" height="68" rx="${Math.min(r * 1.2, 34)}" fill="${c.bg}" stroke="${c.ink}" stroke-width="2" transform="rotate(14 ${f(qx)} ${f(qy)})"/>`;
  return o + glass(c, cx - 150, top + 44, 300, 92, r);
}

export default function render(p) {
  const W = 1280, H = 840, L = p.layout, c = palette(p), r = p.radius, k = p.intensity / 100, center = L === "center", split = L === "split";
  const x0 = center ? W / 2 : 96, tw = center ? 900 : split ? 500 : 540, anc = center ? "middle" : "start";
  let fs = center ? 66 : split ? 60 : 68, hl;
  for (;;) { hl = wrap(HEAD[p.headline], fs, tw, 0.54); if (hl.length <= (center ? 3 : 4) || fs <= 40) break; fs -= 2; }
  const sub = wrap(SUB, 19, center ? 680 : Math.min(tw, 480), 0.5), lh = fs * 1.04;
  const blockH = (p.badge ? 60 : 0) + hl.length * lh + 24 + sub.length * 30 + 36 + 52 + 28 + 38;
  let y = center ? 120 : Math.max(118, (H - blockH) / 2 + 30), out = "";
  if (split) out += `<rect x="680" y="112" width="552" height="664" rx="${f(Math.min(r * 1.5, 40))}" fill="url(#st)" stroke="${c.line}"/>`;
  const mask = `mask="url(#fm)"`, po = f(Math.min(1, 0.35 + 1.3 * k));
  if (p.backdrop === "grid") out += `<rect width="${W}" height="${H}" fill="url(#gp)" opacity="${po}" ${mask}/>`;
  if (p.backdrop === "dots") out += `<rect width="${W}" height="${H}" fill="url(#dp)" opacity="${po}" ${mask}/>`;
  if (p.backdrop === "glow") {
    const op = f(Math.min(0.6, (c.dark ? 0.32 : 0.2) * 2 * k));
    out += `<g filter="url(#bl)" opacity="${op}"><circle cx="${center ? 360 : 240}" cy="180" r="260" fill="${c.acc}"/><circle cx="${center ? 1000 : 1080}" cy="${center ? 260 : 680}" r="300" fill="${c.acc2}"/><circle cx="700" cy="520" r="200" fill="${c.accHi}"/></g>`;
  }
  const vb = center ? [180, Math.round(y + 360), 920, 560] : split ? [720, 200, 480, 520] : [688, 160, 560, 560];
  out += `<ellipse cx="${vb[0] + vb[2] / 2}" cy="${vb[1] + vb[3] * 0.55}" rx="${vb[2] * 0.5}" ry="${vb[3] * 0.38}" fill="${c.acc}" opacity="${f(0.55 * k)}" filter="url(#bl)"/>`;
  out += `<rect x="96" y="44" width="30" height="30" rx="${Math.min(r, 9)}" fill="${c.acc}"/><path d="M104 66l7-14 7 14" fill="none" stroke="${c.onAcc}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` + tx(136, 66, "Lumen", 21, 700, c.ink, "start", ` letter-spacing="-0.4"`);
  const links = ["Product", "Pricing", "Customers", "Changelog"], lw = links.map((s) => s.length * 15 * 0.52 + 28);
  let lx = split ? 712 : W / 2 - (lw.reduce((a, b) => a + b, 0) - 28) / 2;
  links.forEach((s, i) => { out += tx(lx, 64, s, 15, 500, c.muted); lx += lw[i]; });
  out += `<rect x="${W - 192}" y="41" width="96" height="36" rx="${Math.min(r, 18)}" fill="${c.card}" stroke="${c.line}"/>` + tx(W - 144, 64, "Sign in", 14, 600, c.ink, "middle");
  if (p.badge) {
    const t = "Lumen AI is here", bw = 5 + 46 + 12 + t.length * 14 * 0.52 + 36, bx = center ? x0 - bw / 2 : x0;
    out += `<rect x="${f(bx)}" y="${f(y)}" width="${f(bw)}" height="34" rx="${Math.min(r, 17)}" fill="${c.card}" stroke="${c.line}"/><rect x="${f(bx + 5)}" y="${f(y + 5)}" width="46" height="24" rx="${Math.min(r, 12)}" fill="${c.acc}"/>`;
    out += tx(bx + 28, y + 21.5, "New", 12, 700, c.onAcc, "middle") + tx(bx + 63, y + 22, t, 14, 500, c.ink) + tx(bx + bw - 14, y + 22, "→", 14, 500, c.muted, "end");
    y += 60;
  }
  out += `<text font-family="${F}" font-size="${fs}" font-weight="700" letter-spacing="${f(-fs * 0.03)}" fill="${c.ink}" text-anchor="${anc}">` +
    hl.map((s, i) => `<tspan x="${x0}" y="${f(y + fs * 0.8 + i * lh)}">${s}</tspan>`).join("") + `</text>`;
  y += hl.length * lh + 24;
  out += `<text font-family="${F}" font-size="19" fill="${c.muted}" text-anchor="${anc}">` + sub.map((s, i) => `<tspan x="${x0}" y="${f(y + 19 + i * 30)}">${s}</tspan>`).join("") + `</text>`;
  y += sub.length * 30 + 36;
  const b1 = "Start free trial", b2 = "Watch demo", w1 = b1.length * 16 * 0.55 + 56, w2 = b2.length * 16 * 0.55 + 78, bR = Math.min(r, 26);
  const bx = center ? x0 - (w1 + w2 + 12) / 2 : x0, b2x = bx + w1 + 12;
  out += `<rect x="${f(bx)}" y="${f(y)}" width="${f(w1)}" height="52" rx="${bR}" fill="${c.acc}"/>` + tx(bx + w1 / 2, y + 31.5, b1, 16, 600, c.onAcc, "middle");
  out += `<rect x="${f(b2x)}" y="${f(y)}" width="${f(w2)}" height="52" rx="${bR}" fill="${c.card}" stroke="${c.line}"/><circle cx="${f(b2x + 30)}" cy="${f(y + 26)}" r="10" fill="none" stroke="${c.ink}" stroke-width="1.6"/><path d="M${f(b2x + 27.5)} ${f(y + 21.5)}l6 4.5-6 4.5z" fill="${c.ink}"/>` + tx(b2x + 48, y + 31.5, b2, 16, 600, c.ink);
  y += 52 + 28;
  const pt = "Loved by 12,000+ product teams", pw = 138 + pt.length * 15 * 0.5, px = center ? x0 - pw / 2 : x0;
  [c.acc, c.acc2, c.accLo, c.line].forEach((col, i) => {
    out += `<circle cx="${f(px + 19 + i * 28)}" cy="${f(y + 19)}" r="19" fill="${col}" stroke="${c.bg}" stroke-width="3"/>` + tx(px + 19 + i * 28, y + 23.5, "AMKJ"[i], 13, 700, on(col), "middle");
  });
  out += tx(px + 138, y + 24, pt, 15, 500, c.muted);
  y += 38;
  if (p.visual === "product") {
    if (center) { const py = Math.round(y + 56); out += product(c, 180, py, 920, 560, r, true) + toast(c, 124, py - 26, r) + chip(c, 828, py - 22, r); }
    else { const [vx, vy, vw, vh] = vb; out += product(c, vx, vy, vw, vh, r, false) + toast(c, vx - 56, vy + vh - 30, r) + chip(c, vx + vw - 248 + (split ? 16 : -24), vy - 22, r); }
  } else if (center) out += horizon(c, Math.round(Math.max(y + 56, 520)), r, W, H);
  else out += split ? abstract(c, 956, 444, 440, r) : abstract(c, 968, 450, 520, r);
  const defs = `<defs><filter id="sh" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#000" flood-opacity="${c.dark ? 0.5 : 0.14}"/></filter>` +
    `<filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="90"/></filter>` +
    `<linearGradient id="st" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.stageA}"/><stop offset="1" stop-color="${c.panel}"/></linearGradient>` +
    `<linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.acc}" stop-opacity="0.3"/><stop offset="1" stop-color="${c.acc}" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="lg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.accFade}"/><stop offset="1" stop-color="${c.acc}"/></linearGradient>` +
    `<linearGradient id="orb" x1="0.15" y1="0.1" x2="0.85" y2="0.95"><stop offset="0" stop-color="${c.accHi}"/><stop offset="0.5" stop-color="${c.acc}"/><stop offset="1" stop-color="${c.accLo}"/></linearGradient>` +
    `<linearGradient id="fd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.bg}" stop-opacity="0"/><stop offset="1" stop-color="${c.bg}" stop-opacity="0.75"/></linearGradient>` +
    `<radialGradient id="hl" cx="0.34" cy="0.28" r="0.6"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.4"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>` +
    `<pattern id="gp" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="${c.line}"/></pattern>` +
    `<pattern id="dp" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="1.5" fill="${c.line}"/></pattern>` +
    `<radialGradient id="rg" cx="0.5" cy="0.35" r="${f(0.4 + 0.6 * k)}"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#000000"/></radialGradient>` +
    `<mask id="fm"><rect width="${W}" height="${H}" fill="url(#rg)"/></mask></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}<rect width="${W}" height="${H}" fill="${c.bg}"/>${out}</svg>`;
}
