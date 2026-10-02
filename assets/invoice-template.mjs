// Clean invoice template: logo slot, client block, auto-fitting line-item table, tax and total rows, paid/unpaid stamp.
export const meta = {
  title: "Ledger Invoice",
  kind: "ui",
  description: "A clean A4 or US Letter invoice with logo slot, client block, auto-fitting line items, tax and total rows, and a paid or unpaid stamp, ready to brand for client billing.",
  tags: ["invoice", "template", "billing", "a4", "letter", "freelance", "document", "stationery"],
  price: 6,
  author: "oasis-factory",
  size: [595, 842],
};

export const params = {
  knobs: {
    accent: { type: "color", role: "primary", label: "Accent", default: "#3B5BDB" },
    ink: { type: "color", role: "ink", label: "Ink", default: "#1B1D22" },
    paper: { type: "color", role: "background", label: "Paper", default: "#FBFAF7" },
    surface: { type: "color", role: "surface", label: "Table header", default: "#EFEDE7" },
    fonts: { type: "choice", label: "Font pairing", default: "Editorial", options: ["Modern", "Editorial", "Classic", "Technical"] },
    currency: { type: "choice", label: "Currency format", default: "$1,234.56", options: ["$1,234.56", "1.234,56 €", "£1,234.56", "¥123,457", "CHF 1'234.56"] },
    page: { type: "choice", label: "Page size", default: "A4", options: ["A4", "Letter"] },
    rows: { type: "range", label: "Line items", default: 6, min: 1, max: 14, step: 1 },
    tax: { type: "range", label: "Tax rate %", default: 8, min: 0, max: 25, step: 0.5 },
    paid: { type: "toggle", label: "Paid stamp", default: true },
  },
  presets: {
    Studio: { accent: "#E4572E", ink: "#22201C", paper: "#FFFDF8", surface: "#F4EBDF" },
    Forest: { accent: "#2F6B4F", ink: "#14231B", paper: "#F6F8F3", surface: "#E3ECE2" },
    Midnight: { accent: "#8AB4FF", ink: "#E8EAF0", paper: "#14161C", surface: "#232833" },
    Mono: { accent: "#111111", ink: "#111111", paper: "#FFFFFF", surface: "#EDEDED" },
  },
};

const SANS = "Helvetica Neue, Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "Menlo, Consolas, monospace";
const FONTS = {
  Modern: { h: SANS, b: SANS, n: SANS },
  Editorial: { h: SERIF, b: SANS, n: SANS },
  Classic: { h: SERIF, b: SERIF, n: SERIF },
  Technical: { h: SANS, b: SANS, n: MONO },
};
const CUR = {
  "$1,234.56": { sym: "$", pre: true, g: ",", d: ".", dp: 2, k: 1 },
  "1.234,56 €": { sym: "€", pre: false, g: ".", d: ",", dp: 2, k: 0.92 },
  "£1,234.56": { sym: "£", pre: true, g: ",", d: ".", dp: 2, k: 0.79 },
  "¥123,457": { sym: "¥", pre: true, g: ",", d: ".", dp: 0, k: 150 },
  "CHF 1'234.56": { sym: "CHF ", pre: true, g: "'", d: ".", dp: 2, k: 0.88 },
};
const ITEMS = [
  ["Brand strategy workshop", 1, 1800], ["Logo & identity system", 1, 3200], ["Typography licensing", 2, 240],
  ["Website design — homepage", 1, 2400], ["Website design — inner pages", 6, 380], ["Design system tokens", 1, 950],
  ["Illustration set", 12, 85], ["Copywriting (hours)", 14, 95], ["Social media templates", 8, 60],
  ["Motion logo sting", 1, 720], ["Print collateral", 3, 210], ["Photography art direction", 2, 450],
  ["Project management (hours)", 10, 70], ["Additional revision rounds", 4, 120],
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f1 = (v) => (Math.round(v * 10) / 10).toString();
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (h) => { const c = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function money(v, key) {
  const C = CUR[key] || CUR["$1,234.56"];
  const [i, f] = (v * C.k).toFixed(C.dp).split(".");
  const n = i.replace(/\B(?=(\d{3})+(?!\d))/g, C.g) + (f ? C.d + f : "");
  return C.pre ? C.sym + n : n + "\u00A0" + C.sym;
}

function T(x, y, s, o) {
  return `<text x="${f1(x)}" y="${f1(y)}" font-family="${o.f}" font-size="${o.s}" fill="${o.c}"${o.w ? ` font-weight="${o.w}"` : ""}${o.a ? ` text-anchor="${o.a}"` : ""}${o.ls ? ` letter-spacing="${o.ls}"` : ""}>${esc(s)}</text>`;
}

export default function render(p) {
  const [W, H] = p.page === "Letter" ? [612, 792] : [595, 842];
  const F = FONTS[p.fonts] || FONTS.Modern;
  const m = 48, cw = W - m * 2;
  const ink = p.ink, paper = p.paper, acc = p.accent;
  const muted = mix(ink, paper, 0.4), hair = mix(ink, paper, 0.86);
  const on = (bg) => (contrast(paper, bg) >= contrast(ink, bg) ? paper : ink);
  const accText = contrast(acc, paper) >= 2.4 ? acc : ink;
  const onAcc = on(acc), onSurf = on(p.surface);
  const cap = (x, y, s, a, c) => T(x, y, s.toUpperCase(), { f: F.b, s: 6.8, c: c || muted, w: 600, ls: 1.3, a });
  const hw = F.h === SERIF ? 400 : 700, hls = F.h === SERIF ? 0 : -0.6;
  const paid = !!p.paid;
  const rows = Math.max(1, Math.min(14, Math.round(p.rows)));
  const items = ITEMS.slice(0, rows);
  const sub = items.reduce((s, it) => s + it[1] * it[2], 0);
  const rate = Math.max(0, p.tax);
  const taxAmt = sub * rate / 100, total = sub + taxAmt;
  const rateLabel = (Math.round(rate * 10) / 10).toString();
  let o = "";

  o += `<rect width="${W}" height="${H}" fill="${paper}"/><rect width="${W}" height="5" fill="${acc}"/>`;
  o += `<rect x="${m}" y="${m}" width="40" height="40" rx="10" fill="${acc}"/>`;
  o += T(m + 20, m + 27, "N", { f: F.h, s: 20, c: onAcc, w: 700, a: "middle" });
  o += `<circle cx="${m + 31}" cy="${m + 10}" r="2.6" fill="${onAcc}" opacity="0.8"/>`;
  o += T(m + 54, m + 18, "Northwind Studio", { f: F.h, s: 13.5, c: ink, w: 700 });
  o += T(m + 54, m + 32, "48 Harbour Lane · Bristol BS1 4QA", { f: F.b, s: 8.2, c: muted });
  o += T(W - m, m + 26, "Invoice", { f: F.h, s: 30, c: ink, w: hw, a: "end", ls: hls });
  o += T(W - m, m + 42, "No. INV-2025-0142", { f: F.n, s: 8.6, c: muted, a: "end" });
  const pw = paid ? 46 : 56;
  o += paid
    ? `<rect x="${W - m - pw}" y="${m + 52}" width="${pw}" height="17" rx="8.5" fill="${acc}"/>`
    : `<rect x="${W - m - pw + 0.5}" y="${m + 52.5}" width="${pw - 1}" height="16" rx="8" fill="none" stroke="${muted}"/>`;
  o += T(W - m - pw / 2, m + 63.6, paid ? "PAID" : "UNPAID", { f: F.b, s: 7, c: paid ? onAcc : ink, w: 700, ls: 1.2, a: "middle" });
  o += `<rect x="${m}" y="${m + 92}" width="${cw}" height="1" fill="${hair}"/>`;

  const my = m + 120, c2 = m + cw * 0.42;
  o += cap(m, my, "Billed to");
  o += T(m, my + 16, "Aurora Coffee Co.", { f: F.b, s: 11, c: ink, w: 700 });
  ["Attn. Maya Lindqvist", "212 Mercer Street", "New York, NY 10012"].forEach((l, i) => { o += T(m, my + 31 + i * 13, l, { f: F.b, s: 8.8, c: muted }); });
  o += cap(c2, my, "Issued");
  o += T(c2, my + 16, "28 Feb 2025", { f: F.b, s: 10, c: ink });
  o += cap(c2, my + 38, "Due");
  o += T(c2, my + 54, "14 Mar 2025", { f: F.b, s: 10, c: ink });
  o += cap(W - m, my, paid ? "Amount paid" : "Amount due", "end");
  o += T(W - m, my + 28, money(total, p.currency), { f: F.n === MONO ? MONO : F.h, s: F.n === MONO ? 19 : 24, c: accText, w: 700, a: "end", ls: F.n === MONO ? 0 : -0.5 });
  o += T(W - m, my + 44, paid ? "Received 12 Mar 2025" : "Net 14 · due 14 Mar 2025", { f: F.b, s: 8.2, c: muted, a: "end" });

  const tY = my + 88, hh = 26;
  const cQ = W - m - 196, cR = W - m - 104, cA = W - m - 12;
  o += `<rect x="${m}" y="${tY}" width="${cw}" height="${hh}" rx="5" fill="${p.surface}"/>`;
  const hb = tY + 16.5;
  o += cap(m + 12, hb, "#", null, onSurf) + cap(m + 38, hb, "Description", null, onSurf);
  o += cap(cQ, hb, "Qty", "end", onSurf) + cap(cR, hb, "Rate", "end", onSurf) + cap(cA, hb, "Amount", "end", onSurf);
  const footH = 64, totH = 150, avail = H - m - footH - totH - (tY + hh);
  const rH = Math.min(36, avail / rows), fs = rH < 24 ? 8.8 : 9.6;
  items.forEach((it, i) => {
    const y = tY + hh + i * rH, b = y + rH / 2 + 3.3;
    o += T(m + 12, b, String(i + 1).padStart(2, "0"), { f: F.n, s: fs - 1, c: muted });
    o += T(m + 38, b, it[0], { f: F.b, s: fs, c: ink });
    o += T(cQ, b, String(it[1]), { f: F.n, s: fs, c: muted, a: "end" });
    o += T(cR, b, money(it[2], p.currency), { f: F.n, s: fs, c: muted, a: "end" });
    o += T(cA, b, money(it[1] * it[2], p.currency), { f: F.n, s: fs, c: ink, w: 600, a: "end" });
    o += `<rect x="${m}" y="${f1(y + rH - 0.5)}" width="${cw}" height="0.75" fill="${hair}"/>`;
  });

  const y0 = tY + hh + rows * rH + 18, tw = 236, x0 = W - m - tw;
  o += T(x0 + 12, y0 + 14, "Subtotal", { f: F.b, s: 9, c: muted });
  o += T(cA, y0 + 14, money(sub, p.currency), { f: F.n, s: 9.4, c: ink, a: "end" });
  o += T(x0 + 12, y0 + 33, `Tax (${rateLabel}%)`, { f: F.b, s: 9, c: muted });
  o += T(cA, y0 + 33, money(taxAmt, p.currency), { f: F.n, s: 9.4, c: ink, a: "end" });
  o += `<rect x="${x0}" y="${y0 + 50}" width="${tw}" height="40" rx="6" fill="${acc}"/>`;
  o += T(x0 + 14, y0 + 73.5, (paid ? "Total paid" : "Total due").toUpperCase(), { f: F.b, s: 7.6, c: onAcc, w: 700, ls: 1.4 });
  o += T(W - m - 14, y0 + 75, money(total, p.currency), { f: F.n, s: F.n === MONO ? 13 : 15.5, c: onAcc, w: 700, a: "end" });

  o += cap(m, y0 + 14, "Notes");
  o += T(m, y0 + 29, "Thank you for choosing Northwind.", { f: F.b, s: 8.8, c: muted });
  o += T(m, y0 + 42, "Questions? hello@northwind.studio", { f: F.b, s: 8.8, c: muted });

  const sc = paid ? accText : muted;
  const sw = paid ? 150 : 176, sh = 58;
  const scx = m + Math.min(112, (x0 - m) / 2), scy = y0 + 92;
  const r = rng(paid ? 4127 : 9311);
  let wear = "";
  for (let i = 0; i < 70; i++) {
    const x = (r() - 0.5) * (sw + 6), y = (r() - 0.5) * (sh + 6), rr = 0.4 + r() * r() * 2.2;
    wear += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${rr.toFixed(2)}" fill="${paper}" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`;
  }
  o += `<g transform="translate(${f1(scx)} ${f1(scy)}) rotate(-8)" opacity="0.88">`;
  o += `<rect x="${-sw / 2}" y="${-sh / 2}" width="${sw}" height="${sh}" rx="8" fill="none" stroke="${sc}" stroke-width="2.6"/>`;
  o += `<rect x="${-sw / 2 + 5}" y="${-sh / 2 + 5}" width="${sw - 10}" height="${sh - 10}" rx="5" fill="none" stroke="${sc}" stroke-width="0.9"/>`;
  o += T(0, 6, paid ? "PAID" : "UNPAID", { f: F.h === SERIF ? SERIF : SANS, s: 24, c: sc, w: 800, ls: paid ? 6 : 3, a: "middle" });
  o += T(0, 19, paid ? "12 · 03 · 2025" : "DUE 14 · 03 · 2025", { f: F.n, s: 6.4, c: sc, w: 600, ls: 1.6, a: "middle" });
  o += wear + `</g>`;

  const fy = H - m - 44;
  o += `<rect x="${m}" y="${fy}" width="${cw}" height="0.75" fill="${hair}"/>`;
  o += cap(m, fy + 18, "Payment") + T(m, fy + 32, "Bank transfer · Monzo Business", { f: F.b, s: 8.4, c: ink });
  o += cap(m + cw * 0.38, fy + 18, "Account") + T(m + cw * 0.38, fy + 32, "GB29 NWBK 6016 1331 9268 19", { f: F.n, s: 8.2, c: ink });
  o += cap(W - m, fy + 18, "Terms", "end") + T(W - m, fy + 32, "Net 14 · 2% monthly late fee", { f: F.b, s: 8.4, c: ink, a: "end" });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${o}</svg>`;
}
