// Print-ready business card: front and back at 3.5×2 in, with bleed, crop marks, safe area, layouts and QR.
export const meta = {
  title: "Studio Business Card",
  kind: "mockup",
  description: "A print-ready 3.5×2 in business card, front and back, with name, title, labelled contact rows, a monogram logo slot, optional QR code, and bleed, crop and safe-area guides for print handoff.",
  tags: ["business card", "stationery", "identity", "print", "branding", "contact", "qr code", "bleed"],
  price: 0,
  author: "oasis-factory",
  size: [1200, 1600],
};

export const params = {
  knobs: {
    card: { type: "color", role: "background", label: "Card stock", default: "#F6F3EE" },
    ink: { type: "color", role: "ink", label: "Ink", default: "#1A1C20" },
    accent: { type: "color", role: "primary", label: "Accent", default: "#C2410C" },
    layout: { type: "choice", label: "Layout", default: "classic", options: ["classic", "centered", "split"] },
    fonts: { type: "choice", label: "Font pairing", default: "modern", options: ["modern", "editorial", "mono"] },
    pattern: { type: "choice", label: "Back pattern", default: "dots", options: ["none", "dots", "lines", "grid", "topo"] },
    name: { type: "text", label: "Name", default: "Maya Okafor" },
    title: { type: "text", label: "Title", default: "Creative Director" },
    company: { type: "text", label: "Company", default: "Northwind Studio" },
    corners: { type: "range", label: "Corner radius", default: 0, min: 0, max: 48, step: 2 },
    scale: { type: "range", label: "Pattern scale", default: 1, min: 0.5, max: 2.5, step: 0.1 },
    qr: { type: "toggle", label: "QR code on back", default: true },
    marks: { type: "toggle", label: "Bleed & crop marks", default: true },
  },
  presets: {
    Cobalt: { card: "#FFFFFF", ink: "#0F172A", accent: "#2563EB", layout: "centered", fonts: "modern", pattern: "grid", qr: true, marks: false, corners: 24 },
    Forest: { card: "#EEF2EA", ink: "#16261D", accent: "#2F6B4F", layout: "split", fonts: "editorial", pattern: "topo", qr: false },
    Midnight: { card: "#121419", ink: "#F2EFE8", accent: "#E8B44A", layout: "classic", fonts: "mono", pattern: "lines", qr: true },
    Blush: { card: "#FFF5F3", ink: "#3A1020", accent: "#E2557A", layout: "centered", fonts: "editorial", pattern: "none", qr: false, marks: false, corners: 40 },
  },
};

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (h) => { const c = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const best = (bg, cands) => cands.reduce((a, c) => (contrast(bg, c) > contrast(bg, a) ? c : a), cands[0]);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SANS = "Helvetica Neue, Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "Menlo, Consolas, monospace";
const FONTS = {
  modern: { head: SANS, hw: 700, hls: -1.2, fh: 0.56, body: SANS, fb: 0.54, tFam: SANS, tStyle: "normal", tUp: false, tls: 0.2 },
  editorial: { head: SERIF, hw: 400, hls: -0.6, fh: 0.5, body: SANS, fb: 0.54, tFam: SERIF, tStyle: "italic", tUp: false, tls: 0.2 },
  mono: { head: SANS, hw: 700, hls: -0.8, fh: 0.56, body: MONO, fb: 0.61, tFam: MONO, tStyle: "normal", tUp: true, tls: 1.5 },
};

const fit = (s, size, maxW, f) => +Math.min(size, maxW / (Math.max(1, String(s).length) * f)).toFixed(1);

function t(x, y, s, size, o) {
  return `<text x="${x}" y="${y}" font-family="${o.fam}" font-size="${size}" font-weight="${o.w || 400}" fill="${o.fill}" text-anchor="${o.a || "start"}" letter-spacing="${o.ls || 0}" font-style="${o.st || "normal"}">${esc(s)}</text>`;
}

function mark(x, y, s, fill, ink, ini, fam, w) {
  const fs = s * (ini.length > 1 ? 0.4 : 0.5);
  return `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${(s * 0.24).toFixed(1)}" fill="${fill}"/>` +
    t(x + s / 2, (y + s / 2 + fs * 0.36).toFixed(1), ini, fs.toFixed(1), { fam, w, fill: ink, a: "middle", ls: 0.5 });
}

function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  if (r <= 0) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

function patternLayer(kind, x, y, w, h, c, s, id) {
  if (kind === "none") return "";
  if (kind === "topo") {
    let o = "";
    const cx = x + w * 0.9, cy = y + h * 0.9;
    for (let r = 30 * s; r < Math.hypot(w, h) * 1.05; r += 30 * s) o += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(1)}" fill="none" stroke="${c}" stroke-width="${(1.4 * Math.sqrt(s)).toFixed(2)}"/>`;
    return `<g opacity="0.2">${o}</g>`;
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})" opacity="0.2"/>`;
}

function patternDef(kind, c, s, id) {
  const n = (v) => (v * s).toFixed(2);
  if (kind === "dots") return `<pattern id="${id}" width="${n(28)}" height="${n(28)}" patternUnits="userSpaceOnUse"><circle cx="${n(14)}" cy="${n(14)}" r="${n(2.5)}" fill="${c}"/></pattern>`;
  if (kind === "lines") return `<pattern id="${id}" width="${n(18)}" height="${n(18)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${n(2.4)}" height="${n(18)}" fill="${c}"/></pattern>`;
  if (kind === "grid") return `<pattern id="${id}" width="${n(36)}" height="${n(36)}" patternUnits="userSpaceOnUse"><path d="M${n(36)} 0H0V${n(36)}" fill="none" stroke="${c}" stroke-width="${(1.4 * Math.sqrt(s)).toFixed(2)}"/></pattern>`;
  return "";
}

function qrCode(x, y, s, seedStr, dark) {
  let h = 2166136261;
  for (const ch of seedStr) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const r = rng(h), n = 25, pad = s * 0.085, m = (s - pad * 2) / n, ox = x + pad, oy = y + pad;
  const inF = (i, j) => (i < 8 && j < 8) || (i < 8 && j >= n - 8) || (i >= n - 8 && j < 8);
  let d = "";
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (inF(i, j) || r() > 0.47) continue;
    d += `M${(ox + j * m).toFixed(2)} ${(oy + i * m).toFixed(2)}h${m.toFixed(2)}v${m.toFixed(2)}h-${m.toFixed(2)}z`;
  }
  let f = "";
  for (const [fi, fj] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
    const fx = ox + fj * m, fy = oy + fi * m;
    f += `<rect x="${fx.toFixed(2)}" y="${fy.toFixed(2)}" width="${(7 * m).toFixed(2)}" height="${(7 * m).toFixed(2)}" rx="${(m * 1.4).toFixed(2)}" fill="${dark}"/>`;
    f += `<rect x="${(fx + m).toFixed(2)}" y="${(fy + m).toFixed(2)}" width="${(5 * m).toFixed(2)}" height="${(5 * m).toFixed(2)}" rx="${m.toFixed(2)}" fill="#FFFFFF"/>`;
    f += `<rect x="${(fx + 2 * m).toFixed(2)}" y="${(fy + 2 * m).toFixed(2)}" width="${(3 * m).toFixed(2)}" height="${(3 * m).toFixed(2)}" rx="${(m * 0.7).toFixed(2)}" fill="${dark}"/>`;
  }
  return `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${(s * 0.06).toFixed(1)}" fill="#FFFFFF"/><path d="${d}" fill="${dark}"/>${f}`;
}

export default function render(p) {
  const CW = 1200, CH = 1600, W = 1050, H = 600, B = 37.5, M = 72, R = +p.corners || 0, S = +p.scale || 1;
  const F = FONTS[p.fonts] || FONTS.modern;
  const card = p.card, ink = p.ink, accent = p.accent;
  const dark = lum(card) < 0.2;
  let mt = 0.4;
  while (mt > 0 && contrast(mix(ink, card, mt), card) < 4.6) mt -= 0.04;
  const muted = mix(ink, card, Math.max(0, mt));
  const accText = contrast(accent, card) >= 4.5 ? accent : ink;
  let onAcc = best(accent, [card, ink]);
  if (contrast(accent, onAcc) < 4.5) onAcc = best(accent, ["#FFFFFF", "#14161A"]);
  const backdrop = mix(card, ink, dark ? 0.08 : 0.1);
  const capCol = mix(backdrop, ink, 0.55);
  const edge = mix(card, ink, dark ? 0.14 : 0.07);
  const hair = mix(card, ink, 0.18);
  const plateOn = p.pattern !== "none";
  const plate = (x, y, w, h) => plateOn ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="${accent}" opacity="0.92"/>` : "";

  const name = p.name || "", title = p.title || "", company = p.company || "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  const ini = ((words[0] || "A")[0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
  const slug = company.toLowerCase().replace(/[^a-z0-9]/g, "") || "studio";
  const first = (words[0] || "hello").toLowerCase().replace(/[^a-z0-9]/g, "") || "hello";
  const rows = [["TEL", "+1 (415) 555-0142"], ["EMAIL", `${first}@${slug}.com`], ["WEB", `${slug}.com`]];
  const titleStr = F.tUp ? title.toUpperCase() : title;
  const tSize = (max, w) => fit(titleStr, F.tUp ? max - 4 : max, w, F.fb + (F.tUp ? 0.1 : 0));
  const tOpt = (fill, a) => ({ fam: F.tFam, fill, a, st: F.tStyle, ls: F.tls });
  const nOpt = (a) => ({ fam: F.head, w: F.hw, fill: ink, a, ls: F.hls });
  const bOpt = (fill, a, w, ls) => ({ fam: F.body, fill, a, w, ls });
  const lab = (x, y, s, a) => t(x, y, s, 24, bOpt(muted, a || "start", 600, 2));
  const full = `<rect x="${-B}" y="${-B}" width="${W + 2 * B}" height="${H + 2 * B}"`;

  let front = `${full} fill="${card}"/>`;
  if (p.layout === "centered") {
    front += mark(W / 2 - 36, M, 72, accent, onAcc, ini, F.head, F.hw);
    front += t(W / 2, 200, company.toUpperCase(), fit(company, 25, 700, F.fb * 1.3), bOpt(muted, "middle", 600, 4));
    front += t(W / 2, 296, name, fit(name, 66, W - 2 * M, F.fh), nOpt("middle"));
    front += t(W / 2, 344, titleStr, tSize(32, 800), tOpt(muted, "middle"));
    front += `<rect x="${W / 2 - 30}" y="378" width="60" height="4" rx="2" fill="${accent}"/>`;
    const l1 = rows[0][1] + "   ·   " + rows[1][1];
    front += t(W / 2, 456, l1, fit(l1, 28, W - 2 * M, F.fb), bOpt(ink, "middle", 400, 0.2));
    front += t(W / 2, 498, rows[2][1], fit(rows[2][1], 28, W - 2 * M, F.fb), bOpt(accText, "middle", 600, 0.4));
  } else if (p.layout === "split") {
    const PW = 380, x0 = 440;
    front += `<rect x="${-B}" y="${-B}" width="${PW + B}" height="${H + 2 * B}" fill="${accent}"/>` + patternLayer(p.pattern, -B, -B, PW + B, H + 2 * B, onAcc, S, "pf");
    front += plate(PW / 2 - 140, 170, 280, 236);
    front += mark(PW / 2 - 52, 202, 104, onAcc, accent, ini, F.head, F.hw);
    front += t(PW / 2, 366, company.toUpperCase(), fit(company, 25, 260, F.fb * 1.3), bOpt(onAcc, "middle", 700, 3));
    front += t(x0, 190, name, fit(name, 60, W - M - x0, F.fh), nOpt("start"));
    front += t(x0, 238, titleStr, tSize(30, W - M - x0), tOpt(muted, "start"));
    front += `<rect x="${x0}" y="280" width="${W - M - x0}" height="1.5" fill="${hair}"/>`;
    rows.forEach((r, i) => {
      const y = 352 + i * 50;
      front += lab(x0, y, r[0]);
      front += t(x0 + 118, y, r[1], fit(r[1], 28, W - M - x0 - 118, F.fb), bOpt(ink, "start", 400, 0.2));
    });
  } else {
    front += mark(M, M, 72, accent, onAcc, ini, F.head, F.hw);
    front += t(M + 94, 118, company, fit(company, 30, W - 2 * M - 94, F.fb), bOpt(ink, "start", 600, 0.2));
    front += t(M, 300, name, fit(name, 66, W - 2 * M, F.fh), nOpt("start"));
    front += t(M, 348, titleStr, tSize(32, W - 2 * M), tOpt(muted, "start"));
    front += `<rect x="${M}" y="406" width="${W - 2 * M}" height="1.5" fill="${hair}"/><rect x="${M}" y="404.5" width="72" height="4.5" fill="${accent}"/>`;
    let cs = 28, ws, gap;
    const est = () => { ws = rows.map((r) => Math.max(r[0].length * 0.72 * 24 + r[0].length * 2, r[1].length * F.fb * cs)); gap = (W - 2 * M - ws.reduce((a, b) => a + b, 0)) / 2; };
    est();
    while (gap < 40 && cs > 22) { cs -= 1; est(); }
    let cx = M;
    rows.forEach((r, i) => {
      front += lab(cx, 470, r[0]);
      front += t(cx, 510, r[1], cs, bOpt(ink, "start", 400, 0.2));
      cx += ws[i] + gap;
    });
  }

  let back = `${full} fill="${accent}"/>` + patternLayer(p.pattern, -B, -B, W + 2 * B, H + 2 * B, onAcc, S, "pb");
  const LBW = 300, QS = 210, GAP = 120, TOP = 204, BASE = 420;
  const startX = (W - (LBW + GAP + QS)) / 2;
  const lx = p.qr ? startX + LBW / 2 : W / 2;
  back += plate(lx - LBW / 2 - 30, 150, LBW + 60, 302);
  back += mark(lx - 55, TOP, 110, onAcc, accent, ini, F.head, F.hw);
  back += t(lx, 376, company, fit(company, 38, LBW, F.fh), { fam: F.head, w: F.hw, fill: onAcc, a: "middle", ls: F.hls / 2 });
  back += t(lx, BASE, rows[2][1], fit(rows[2][1], 27, LBW, F.fb), bOpt(onAcc, "middle", 400, 0.8));
  if (p.qr) {
    const qx = startX + LBW + GAP, qy = 172;
    back += plate(qx - 22, 150, QS + 44, 302);
    back += qrCode(qx, qy, QS, name + "|" + company, "#15171C");
    back += t(qx + QS / 2, BASE, "SCAN TO SAVE", 24, bOpt(onAcc, "middle", 700, 2.4));
  }

  const trim = rr(0, 0, W, H, R);
  const outer = rr(-B, -B, W + 2 * B, H + 2 * B, 0);
  const crops = () => {
    let d = "";
    for (const [x, sx] of [[0, -1], [W, 1]]) for (const [y, sy] of [[0, -1], [H, 1]]) {
      d += `M${x + sx * (B + 4)} ${y}h${sx * 22}M${x} ${y + sy * (B + 4)}v${sy * 22}`;
    }
    return `<path d="${d}" stroke="${capCol}" stroke-width="1.5" fill="none"/>`;
  };
  const cardG = (y, body, label, safeCol) => {
    let g = `<text x="75" y="${y - 82}" font-family="${SANS}" font-size="15" font-weight="700" letter-spacing="3" fill="${capCol}">${label}</text>` +
      `<text x="${75 + W}" y="${y - 82}" font-family="${SANS}" font-size="15" letter-spacing="1" fill="${capCol}" text-anchor="end">3.5 × 2 in${p.marks ? "  ·  0.125 in bleed  ·  safe area dashed" : ""}</text>` +
      `<g transform="translate(75 ${y})">`;
    if (!p.marks) {
      g += `<path d="${trim}" fill="${card}" filter="url(#sh)"/><g clip-path="url(#ct)">${body}</g><path d="${trim}" fill="none" stroke="${edge}" stroke-width="1.5"/>`;
    } else {
      const sr = Math.max(0, R - B * 0.6);
      g += `<g clip-path="url(#cbl)">${body}</g><path d="${outer}${trim}" fill-rule="evenodd" fill="${backdrop}" opacity="0.62"/>` +
        `<path d="${trim}" fill="none" stroke="${capCol}" stroke-width="1" opacity="0.6"/>` +
        `<path d="${rr(B, B, W - 2 * B, H - 2 * B, sr)}" fill="none" stroke="${safeCol}" stroke-width="1.5" stroke-dasharray="8 7" opacity="0.5"/>` + crops();
    }
    return g + `</g>`;
  };

  const defs = `<defs><filter id="sh" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="${mix(backdrop, "#000000", 0.7)}" flood-opacity="${dark ? 0.55 : 0.2}"/></filter>` +
    `<clipPath id="ct"><path d="${trim}"/></clipPath><clipPath id="cbl"><path d="${outer}"/></clipPath>` +
    `${patternDef(p.pattern, onAcc, S, "pf")}${patternDef(p.pattern, onAcc, S, "pb")}</defs>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CW} ${CH}" width="${CW}" height="${CH}">${defs}` +
    `<rect width="${CW}" height="${CH}" fill="${backdrop}"/>` +
    cardG(130, front, "FRONT", mix(card, ink, 0.45)) + cardG(900, back, "BACK", onAcc) + `</svg>`;
}
