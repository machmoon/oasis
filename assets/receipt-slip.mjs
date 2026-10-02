// Thermal receipt slip: torn zigzag edges, seeded monospace line items, totals, a PAID stamp and barcode or QR.
export const meta = {
  title: "Receipt Slip",
  kind: "mockup",
  description: "A thermal-paper receipt with torn zigzag edges, seeded line items and an optional barcode or QR code, for checkout screens, order confirmations and retail campaigns.",
  tags: ["receipt", "thermal", "mockup", "checkout", "barcode", "qr code", "retail", "ecommerce"],
  price: 0,
  author: "oasis-factory",
  size: [600, 800],
};

export const params = {
  knobs: {
    paper: { type: "color", role: "surface", label: "Paper tint", default: "#FAF8F3" },
    ink: { type: "color", role: "ink", label: "Print ink", default: "#24221F" },
    accent: { type: "color", role: "primary", label: "Stamp", default: "#E0452B" },
    background: { type: "color", role: "background", label: "Background", default: "#E4DED3" },
    code: { type: "choice", label: "Code", default: "barcode", options: ["barcode", "qr", "none"] },
    items: { type: "range", label: "Item count", default: 5, min: 1, max: 14, step: 1 },
    tear: { type: "range", label: "Tear depth", default: 8, min: 0, max: 18, step: 1 },
    seed: { type: "range", label: "Seed", default: 7, min: 1, max: 200, step: 1 },
    store: { type: "text", label: "Store name", default: "Oasis Market" },
    footer: { type: "text", label: "Footer message", default: "Thank you, please come again" },
  },
  presets: {
    Kraft: { paper: "#EFE3CC", ink: "#3A2E22", accent: "#B5482B", background: "#8C7B66" },
    Mint: { paper: "#EAF4EE", ink: "#17332A", accent: "#2F8F6B", background: "#2C4A3F" },
    Midnight: { paper: "#1E1F26", ink: "#EDEAE2", accent: "#FFB547", background: "#0D0E12" },
    Blush: { paper: "#FFF1EE", ink: "#3B1D25", accent: "#E2537A", background: "#F4C9C0" },
  },
};

const ITEMS = ["OAT MILK LATTE", "SOURDOUGH LOAF", "HEIRLOOM TOMATO", "BUTTER CROISSANT", "SPARKLING WATER", "DARK CHOC 70%", "AVOCADO", "GREEK YOGURT", "COLD BREW", "WILDFLOWER HONEY", "FIG & WALNUT", "OLIVE OIL 500ML", "LEMONS (3)", "FRESH BASIL", "MATCHA TIN", "ALMOND BUTTER", "CAMEMBERT", "PEACH TART", "SEA SALT CHIPS", "GINGER KOMBUCHA"];

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
const money = (c) => (c / 100).toFixed(2);
const two = (v) => String(v).padStart(2, "0");

function wrap(s, max) {
  const words = String(s).toUpperCase().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = (cur + " " + w).trim();
    if (next.length > max && cur) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 5).map((l) => l.slice(0, max));
}

function slipPath(W, H, T, r) {
  let n = Math.max(8, Math.round(W / 13));
  n += n % 2;
  const tw = W / n;
  let d = `M0,${T}`;
  for (let i = 1; i <= n; i++) d += ` L${(i * tw).toFixed(1)},${(i % 2 ? T * r() * 0.3 : T).toFixed(1)}`;
  d += ` L${W},${H - T}`;
  for (let i = n - 1; i >= 0; i--) d += ` L${(i * tw).toFixed(1)},${(i % 2 ? H - T * r() * 0.3 : H - T).toFixed(1)}`;
  return d + "Z";
}

function qrPath(x0, y0, m, r) {
  const N = 21;
  const finder = (i, j, fx, fy) => {
    const a = i - fx, b = j - fy;
    if (a < -1 || b < -1 || a > 7 || b > 7) return null;
    if (a === -1 || b === -1 || a === 7 || b === 7) return false;
    const ring = a === 0 || b === 0 || a === 6 || b === 6;
    const core = a >= 2 && a <= 4 && b >= 2 && b <= 4;
    return ring || core;
  };
  let d = "";
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let on = finder(i, j, 0, 0);
    if (on === null) on = finder(i, j, 14, 0);
    if (on === null) on = finder(i, j, 0, 14);
    if (on === null) on = j === 6 ? i % 2 === 0 : i === 6 ? j % 2 === 0 : r() < 0.47;
    if (on) d += `M${(x0 + i * m).toFixed(2)} ${(y0 + j * m).toFixed(2)}h${m}v${m}h-${m}z`;
  }
  return d;
}

export default function render(p) {
  const CW = 600, CH = 800, W = 340, T = p.tear, P = 28, cx = W / 2, cw = W - P * 2;
  const r = rng(p.seed * 9973 + 17);
  const ink = p.ink;
  const t = (x, y, s, o = "") => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}"${o}>${s}</text>`;
  const rule = (y) => `<line x1="${P}" y1="${y}" x2="${W - P}" y2="${y}" stroke="${ink}" stroke-width="1.2" stroke-dasharray="3 4"/>`;

  const mm = 1 + Math.floor(r() * 12), dd = 1 + Math.floor(r() * 28), hh = 7 + Math.floor(r() * 13), mi = Math.floor(r() * 60);
  const date = `${two(mm)}/${two(dd)}/25`;
  const txn = String(1000 + Math.floor(r() * 9000));
  const last4 = String(1000 + Math.floor(r() * 9000));
  const auth = String(100000 + Math.floor(r() * 900000));
  const pool = ITEMS.slice();
  for (let i = pool.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [pool[i], pool[k]] = [pool[k], pool[i]]; }

  let y = T + 40, g = "";
  const store = String(p.store || "").toUpperCase().slice(0, 22) || "STORE";
  const fs = Math.min(22, (cw / store.length - 2) / 0.6);
  g += t(cx + 1, y, esc(store), ` font-size="${fs.toFixed(1)}" font-weight="700" text-anchor="middle" letter-spacing="2"`);
  y += 20; g += t(cx, y, "1204 PALM AVE · OASIS, CA", ` font-size="11" text-anchor="middle" opacity=".8"`);
  y += 26; g += t(P, y, `${date}  ${two(hh)}:${two(mi)}`, ` font-size="11"`) + t(W - P, y, "REG 02", ` font-size="11" text-anchor="end"`);
  y += 17; g += t(P, y, `TXN #${txn}`, ` font-size="11"`) + t(W - P, y, "CASHIER: MAE", ` font-size="11" text-anchor="end"`);
  y += 15; g += rule(y);

  let sub = 0;
  y += 10;
  for (let i = 0; i < p.items; i++) {
    const qty = r() < 0.25 ? 2 : 1;
    const price = Math.round((150 + Math.floor(r() * 1250)) / 5) * 5;
    const line = qty * price;
    sub += line;
    y += 22;
    g += t(P, y, String(qty), ` font-size="13"`) + t(P + 22, y, esc(pool[i % pool.length].slice(0, 20)), ` font-size="13"`) + t(W - P, y, money(line), ` font-size="13" text-anchor="end"`);
  }
  const tax = Math.round(sub * 0.0825), total = sub + tax;
  y += 16; g += rule(y);
  y += 24; g += t(P, y, "SUBTOTAL", ` font-size="12"`) + t(W - P, y, money(sub), ` font-size="12" text-anchor="end"`);
  y += 19; g += t(P, y, "TAX 8.25%", ` font-size="12"`) + t(W - P, y, money(tax), ` font-size="12" text-anchor="end"`);
  y += 13; g += `<path d="M${P} ${y}H${W - P}M${P} ${y + 3}H${W - P}" stroke="${ink}" stroke-width="1"/>`;
  y += 29; g += t(P, y, "TOTAL", ` font-size="19" font-weight="700" letter-spacing="1"`) + t(W - P, y, `$${money(total)}`, ` font-size="19" font-weight="700" text-anchor="end"`);

  y += 32;
  const stampY = y + 13;
  g += t(P, y, `CARD   VISA ••${last4}`, ` font-size="11"`);
  y += 17; g += t(P, y, `AUTH   ${auth}`, ` font-size="11"`);
  y += 17; g += t(P, y, `ITEMS  ${p.items}`, ` font-size="11"`);
  g += `<g transform="translate(${W - P - 42} ${stampY}) rotate(-14)" fill="none" stroke="${p.accent}" opacity=".9"><circle r="34" stroke-width="2.4"/><circle r="29" stroke-width="1" stroke-dasharray="2 2.5"/><text y="4" text-anchor="middle" font-size="17" font-weight="700" fill="${p.accent}" stroke="none" letter-spacing="2">PAID</text><text y="17" text-anchor="middle" font-size="7" fill="${p.accent}" stroke="none" letter-spacing="1">${date}</text></g>`;
  y += 26; g += rule(y);

  if (p.code === "barcode") {
    y += 18;
    const u = 1.7, bw = cw - 40, bars = [];
    let bx = 0;
    for (const w of [2, 1, 1]) { bars.push([bx, w * u]); bx += (w + 1) * u; }
    while (bx < bw - 10 * u) {
      const w = 1 + Math.floor(r() * 3);
      bars.push([bx, w * u]);
      bx += (w + 1 + Math.floor(r() * 3)) * u;
    }
    for (const w of [1, 1, 2]) { bars.push([bx, w * u]); bx += (w + 1) * u; }
    const x0 = cx - (bx - u) / 2;
    g += `<path d="${bars.map(([x, w]) => `M${(x0 + x).toFixed(2)} ${y}h${w.toFixed(2)}v54h-${w.toFixed(2)}z`).join("")}" fill="${ink}"/>`;
    let digits = "";
    for (let i = 0; i < 12; i++) digits += Math.floor(r() * 10);
    y += 54 + 15;
    g += t(cx, y, `${digits[0]} ${digits.slice(1, 6)} ${digits.slice(6, 11)} ${digits[11]}`, ` font-size="11" text-anchor="middle" letter-spacing="2.5"`);
    y += 4;
  } else if (p.code === "qr") {
    y += 18;
    const m = 4.4, s = 21 * m;
    g += `<path d="${qrPath(cx - s / 2, y, m, r)}" fill="${ink}"/>`;
    y += s + 16;
    g += t(cx, y, "SCAN FOR E-RECEIPT", ` font-size="10" text-anchor="middle" letter-spacing="1.5"`);
    y += 4;
  }

  const lines = wrap(p.footer, 30);
  y += 12;
  for (const l of lines) { y += 18; g += t(cx, y, esc(l), ` font-size="12" text-anchor="middle" letter-spacing=".5"`); }
  y += 20; g += t(cx, y, "* * * * *", ` font-size="11" text-anchor="middle" opacity=".8"`);
  const H = y + 26 + T;

  const d = slipPath(W, H, T, rng(p.seed * 31 + 5));
  const s = Math.min(1, (CH - 70) / H);
  const tx = (CW - W * s) / 2, ty = (CH - H * s) / 2;
  const defs = `<defs><clipPath id="c"><path d="${d}"/></clipPath>` +
    `<filter id="sh" x="-20%" y="-10%" width="140%" height="125%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity=".22"/></filter>` +
    `<filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${p.seed}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .6 -.18"/></filter>` +
    `<linearGradient id="curl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".06"/><stop offset=".18" stop-color="#000" stop-opacity="0"/><stop offset=".85" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".07"/></linearGradient>` +
    `<linearGradient id="side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".08"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".05"/></linearGradient></defs>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CW} ${CH}" width="${CW}" height="${CH}">${defs}` +
    `<rect width="${CW}" height="${CH}" fill="${p.background}"/>` +
    `<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) rotate(-2 ${(W * s / 2).toFixed(1)} ${(H * s / 2).toFixed(1)}) scale(${s.toFixed(4)})">` +
    `<path d="${d}" fill="${p.paper}" filter="url(#sh)"/>` +
    `<g clip-path="url(#c)"><rect width="${W}" height="${H}" fill="url(#curl)"/><rect width="${W}" height="${H}" fill="url(#side)"/><rect width="${W}" height="${H}" filter="url(#n)" opacity=".25"/></g>` +
    `<g fill="${ink}" font-family="Menlo, Consolas, 'Courier New', monospace">${g}</g></g></svg>`;
}
