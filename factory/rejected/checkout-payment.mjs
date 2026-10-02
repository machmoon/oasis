// Checkout screen: card form with live card preview, network badges, reconciled order summary and pay button.
export const meta = {
  title: "Quiet Checkout",
  kind: "ui",
  description: "A polished desktop checkout with card form, order summary and pay button, for product mockups, case studies and payment flow prototypes.",
  tags: ["checkout", "payment", "credit card", "ecommerce", "form", "order summary", "dashboard", "mockup"],
  price: 8,
  author: "oasis-factory",
  size: [1200, 820],
};

export const params = {
  knobs: {
    accent: { type: "color", role: "primary", label: "Accent", default: "#5B5BF0" },
    cardTone: { type: "color", role: "secondary", label: "Card glow & chip", default: "#E7A6FF" },
    theme: { type: "choice", label: "Theme", default: "light", options: ["light", "dark"] },
    network: { type: "choice", label: "Card network", default: "visa", options: ["visa", "mastercard", "amex"] },
    chipStyle: { type: "choice", label: "Network chip style", default: "brand", options: ["brand", "mono", "outline"] },
    currency: { type: "choice", label: "Currency", default: "$", options: ["$", "€", "£", "¥", "₹", "CHF"] },
    radius: { type: "range", label: "Field corner radius", default: 10, min: 0, max: 24, step: 1 },
    items: { type: "range", label: "Line items", default: 3, min: 1, max: 6, step: 1 },
    express: { type: "toggle", label: "Express pay buttons", default: true },
  },
  presets: {
    Ember: { accent: "#F2643D", cardTone: "#FFD27A" },
    Forest: { accent: "#1F8A5B", cardTone: "#B8F0C8" },
    Ocean: { accent: "#0A84FF", cardTone: "#7FF0FF" },
    Blush: { accent: "#D93D73", cardTone: "#FFC2D4" },
  },
};

const SANS = "-apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "Menlo, Consolas, monospace";
const THEMES = {
  light: { bg: "#FFFFFF", panel: "#F4F5F7", field: "#FFFFFF", ink: "#15171C", label: "#353A43", muted: "#5E6573", line: "#DFE2E8" },
  dark: { bg: "#0D0F13", panel: "#171A21", field: "#12151B", ink: "#F2F3F5", label: "#D3D7DE", muted: "#A9B0BC", line: "#2E323C" },
};
const CUR = { "$": [1, 2, "USD"], "€": [0.92, 2, "EUR"], "£": [0.79, 2, "GBP"], "¥": [150, 0, "JPY"], "₹": [83, 0, "INR"], "CHF": [0.88, 2, "CHF"] };
const ITEMS = [
  ["Linen Overshirt", "Sand · M", 68, 1], ["Ceramic Mug", "Glaze · 350 ml", 24, 2], ["Field Notebook", "Dot grid · A5", 16, 3],
  ["Canvas Tote", "Natural", 32, 1], ["Merino Beanie", "Charcoal", 28, 1], ["Brass Desk Lamp", "Warm white", 89, 1],
];
const NUM = { visa: "4242  4242  4242  4242", mastercard: "5555  5555  5555  4444", amex: "3782  822463  10005" };
const LAST = { visa: "4242", mastercard: "4444", amex: "0005" };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (h) => { const c = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const on = (h) => (cr(h, "#FFFFFF") >= cr(h, "#111318") ? "#FFFFFF" : "#111318");
const fit = (c, bg, min) => { const tg = lum(bg) > 0.35 ? "#000000" : "#FFFFFF"; for (let k = 0; k <= 10; k++) { const m = mix(c, tg, k * 0.08); if (cr(m, bg) >= min) return m; } return mix(c, tg, 0.85); };
const T = (x, y, s, fill, txt, extra = "") => `<text x="${x}" y="${y}" font-size="${s}" fill="${fill}" font-family="${SANS}" ${extra}>${esc(txt)}</text>`;

function mark(net, style, x, y, w, h, ink, rr) {
  const cx = x + w / 2, cy = y + h / 2, brand = style === "brand";
  const bgs = { visa: "#1A1F71", mastercard: "#1B1B1F", amex: "#2E77BC" };
  let s = brand ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rr}" fill="${bgs[net]}"/>`
    : style === "mono" ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rr}" fill="${ink}" fill-opacity="0.13"/>`
    : `<rect x="${x + 0.6}" y="${y + 0.6}" width="${w - 1.2}" height="${h - 1.2}" rx="${rr}" fill="none" stroke="${ink}" stroke-width="1.2" stroke-opacity="0.7"/>`;
  const fg = brand ? "#FFFFFF" : ink;
  if (net === "visa") s += T(cx, cy + h * 0.17, (h * 0.47).toFixed(1), fg, "VISA", `text-anchor="middle" font-weight="800" font-style="italic" letter-spacing="0.3"`);
  else if (net === "amex") s += T(cx, cy + h * 0.15, (h * 0.43).toFixed(1), fg, "AMEX", `text-anchor="middle" font-weight="800" letter-spacing="0.2"`);
  else {
    const r = h * 0.28, d = r * 0.58;
    s += brand
      ? `<circle cx="${cx - d}" cy="${cy}" r="${r}" fill="#EB001B"/><circle cx="${cx + d}" cy="${cy}" r="${r}" fill="#F79E1B" fill-opacity="0.92"/>`
      : `<circle cx="${cx - d}" cy="${cy}" r="${r}" fill="${ink}"/><circle cx="${cx + d}" cy="${cy}" r="${r}" fill="${ink}" fill-opacity="0.5"/>`;
  }
  return s;
}

const lock = (x, y, c) => `<rect x="${x}" y="${y + 5}" width="11" height="8.5" rx="2" fill="${c}"/><path d="M${x + 2.6} ${y + 5.2}v-1.8a2.9 2.9 0 0 1 5.8 0v1.8" fill="none" stroke="${c}" stroke-width="1.6"/>`;

export default function render(p) {
  const W = 1200, H = 820, t = THEMES[p.theme] || THEMES.light;
  const acc = p.accent, tone = p.cardTone, onAcc = on(acc), r = Math.max(0, Math.min(24, p.radius));
  const accFg = fit(acc, t.field, 3);
  const panel = mix(t.panel, acc, 0.03);
  const [rate, dec, code] = CUR[p.currency] || CUR["$"];
  const conv = (usd) => Math.round(usd * rate * Math.pow(10, dec)) / Math.pow(10, dec);
  const fmt = (v) => { const [i, f] = v.toFixed(dec).split("."); const sym = p.currency.length > 1 ? p.currency + " " : p.currency; return sym + i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (f ? "." + f : ""); };
  const n = Math.max(1, Math.min(6, Math.round(p.items)));
  const list = ITEMS.slice(0, n).map((it) => ({ name: it[0], variant: it[1], unit: conv(it[2]), qty: it[3], usd: it[2] * it[3] }));
  list.forEach((it) => { it.line = Math.round(it.unit * it.qty * Math.pow(10, dec)) / Math.pow(10, dec); });
  const sub = list.reduce((a, it) => a + it.line, 0);
  const tax = conv(list.reduce((a, it) => a + it.usd, 0) * 0.08);
  const total = sub + tax;
  const qty = list.reduce((a, it) => a + it.qty, 0);
  const chipR = Math.min(6, r * 0.3 + 2);

  const b = p.express ? 0 : 45;
  let L = "";
  L += `<rect x="80" y="${b + 52}" width="24" height="24" rx="${Math.min(12, r * 0.5 + 3)}" fill="${acc}"/><circle cx="92" cy="${b + 64}" r="4.5" fill="none" stroke="${onAcc}" stroke-width="2"/>`;
  L += T(114, b + 69, 15, t.ink, "Oasis Supply", `font-weight="600" letter-spacing="-0.1"`);
  L += T(80, b + 128, 30, t.ink, "Payment", `font-weight="700" letter-spacing="-0.6"`);
  L += T(80, b + 155, 14.5, t.muted, "Complete your order securely.");

  const cx0 = 440, cy0 = b + 48, cw = 160, ch = 100, crx = 4 + r * 0.5;
  const cA = mix(acc, "#06070A", 0.62), cB = mix(acc, "#06070A", 0.42);
  const cardInk = Math.min(cr("#FFFFFF", cA), cr("#FFFFFF", cB)) >= Math.min(cr("#111318", cA), cr("#111318", cB)) ? "#FFFFFF" : "#111318";
  L += `<defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${cA}"/><stop offset="1" stop-color="${cB}"/></linearGradient><radialGradient id="tg"><stop offset="0" stop-color="${tone}" stop-opacity="0.6"/><stop offset="1" stop-color="${tone}" stop-opacity="0"/></radialGradient><clipPath id="cc"><rect x="${cx0}" y="${cy0}" width="${cw}" height="${ch}" rx="${crx}"/></clipPath></defs>`;
  L += `<rect x="${cx0 + 6}" y="${cy0 + 10}" width="${cw - 12}" height="${ch}" rx="${crx}" fill="${cA}" opacity="0.3" filter="url(#sh)"/>`;
  L += `<g clip-path="url(#cc)"><rect x="${cx0}" y="${cy0}" width="${cw}" height="${ch}" fill="url(#cg)"/><circle cx="${cx0 + cw - 10}" cy="${cy0 + 6}" r="96" fill="url(#tg)"/><circle cx="${cx0 + 168}" cy="${cy0 + 26}" r="44" fill="${cardInk}" opacity="0.06"/></g>`;
  L += `<rect x="${cx0 + 0.5}" y="${cy0 + 0.5}" width="${cw - 1}" height="${ch - 1}" rx="${crx}" fill="none" stroke="#FFFFFF" stroke-opacity="0.1"/>`;
  L += `<rect x="${cx0 + 14}" y="${cy0 + 18}" width="22" height="16" rx="3.5" fill="${mix(tone, "#FFFFFF", 0.35)}"/><path d="M${cx0 + 14} ${cy0 + 26}h22M${cx0 + 25} ${cy0 + 18}v16" stroke="${cA}" stroke-opacity="0.35" stroke-width="1"/>`;
  L += `<text x="${cx0 + 14}" y="${cy0 + 62}" font-size="11.5" fill="${cardInk}" font-family="${MONO}" letter-spacing="1.2">•••• ${LAST[p.network]}</text>`;
  L += T(cx0 + 14, cy0 + 86, 9, cardInk, "ALEX MORGAN", `font-weight="600" letter-spacing="0.9"`);
  L += mark(p.network, p.chipStyle, cx0 + cw - 48, cy0 + ch - 34, 34, 22, cardInk, chipR);

  if (p.express) {
    const ey = b + 186;
    L += `<rect x="80" y="${ey}" width="254" height="48" rx="${r}" fill="${t.ink}"/>`;
    L += `<rect x="159" y="${ey + 17}" width="15" height="14" rx="3.5" fill="none" stroke="${t.bg}" stroke-width="1.8"/><path d="M159 ${ey + 22}h15" stroke="${t.bg}" stroke-width="1.8"/>`;
    L += T(182, ey + 29.5, 15, t.bg, "Wallet Pay", `font-weight="600"`);
    L += `<rect x="346.5" y="${ey + 0.5}" width="253" height="47" rx="${r}" fill="${t.field}" stroke="${t.line}"/>`;
    L += `<circle cx="435" cy="${ey + 24}" r="7.5" fill="${acc}"/><path d="M431.8 ${ey + 24}l2.2 2.2 4-4.2" fill="none" stroke="${onAcc}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    L += T(448, ey + 29.5, 15, t.ink, "Pay later", `font-weight="600"`);
    L += `<path d="M80 ${b + 262}H270M410 ${b + 262}H600" stroke="${t.line}"/>`;
    L += T(340, b + 266.5, 13.5, t.muted, "or pay with card", `text-anchor="middle" font-weight="500"`);
  }

  const y0 = b + (p.express ? 292 : 200);
  const label = (y, s) => T(80, y, 13.5, t.label, s, `font-weight="600"`);
  const field = (y, v) => `<rect x="80.5" y="${y + 0.5}" width="519" height="47" rx="${r}" fill="${t.field}" stroke="${t.line}"/>` + T(96 + r * 0.25, y + 30, 15, t.ink, v);
  L += label(y0 + 12, "Email") + field(y0 + 22, "alex@studio.co");
  L += label(y0 + 96, "Card information");
  ["visa", "mastercard", "amex"].forEach((net, i) => {
    const bx = 486 + i * 40, by = y0 + 78;
    if (net === p.network) L += `<rect x="${bx - 2.5}" y="${by - 2.5}" width="39" height="25" rx="${chipR + 2}" fill="none" stroke="${accFg}" stroke-width="1.5"/>`;
    L += mark(net, p.chipStyle, bx, by, 34, 20, t.ink, chipR);
  });
  const g = y0 + 106, ip = 96 + r * 0.25;
  L += `<rect x="77" y="${g - 3}" width="526" height="102" rx="${r + 3}" fill="none" stroke="${acc}" stroke-opacity="0.22" stroke-width="4"/>`;
  L += `<rect x="80.5" y="${g + 0.5}" width="519" height="95" rx="${r}" fill="${t.field}" stroke="${accFg}" stroke-width="1.5"/>`;
  L += `<path d="M81 ${g + 48}H599M340 ${g + 48}V${g + 95}" stroke="${t.line}"/>`;
  L += `<text x="${ip}" y="${g + 30}" font-size="14.5" fill="${t.ink}" font-family="${MONO}" letter-spacing="0.4">${NUM[p.network]}</text>`;
  L += mark(p.network, p.chipStyle, 552 - r * 0.25, g + 13, 34, 22, t.ink, chipR);
  L += T(ip, g + 78, 15, t.ink, "12 / 28") + T(356, g + 78, 15, t.ink, "•••", `letter-spacing="2"`);
  L += `<rect x="${560 - r * 0.25}" y="${g + 64}" width="24" height="16" rx="3" fill="none" stroke="${t.muted}" stroke-width="1.4"/><path d="M${560 - r * 0.25} ${g + 69}h24" stroke="${t.muted}" stroke-width="2.4"/>`;
  L += label(y0 + 228, "Name on card") + field(y0 + 238, "Alex Morgan");
  L += label(y0 + 312, "Country or region") + field(y0 + 322, "United States");
  L += `<path d="M${574 - r * 0.25} ${y0 + 343}l5 5 5-5" fill="none" stroke="${t.muted}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;

  const py = y0 + 398, payLabel = `Pay ${fmt(total)}`, tw = payLabel.length * 8.9, st = 340 - (tw + 19) / 2;
  L += `<rect x="90" y="${py + 6}" width="500" height="54" rx="${r}" fill="${acc}" opacity="0.28" filter="url(#sh)"/>`;
  L += `<rect x="80" y="${py}" width="520" height="54" rx="${r}" fill="${acc}"/>`;
  L += lock(st, py + 18, onAcc) + T(st + 19, py + 32.5, 16, onAcc, payLabel, `font-weight="600" letter-spacing="0.1"`);
  const foot = "Payments are processed securely with 256-bit encryption", fw = foot.length * 3.2;
  L += lock(348 - fw - 18, y0 + 472, t.muted) + T(348, y0 + 484, 13, t.muted, foot, `text-anchor="middle"`);

  let R = `<rect x="680" y="0" width="520" height="${H}" fill="${panel}"/><path d="M680.5 0V${H}" stroke="${t.line}"/>`;
  R += T(728, 76, 13.5, t.muted, "Order summary", `font-weight="600" letter-spacing="0.3"`);
  R += T(1152, 76, 13.5, t.muted, `${qty} item${qty > 1 ? "s" : ""}`, `text-anchor="end"`);
  R += T(728, 124, 38, t.ink, fmt(total), `font-weight="700" letter-spacing="-1"`);
  R += `<rect x="1090.5" y="99.5" width="61" height="27" rx="${Math.min(13.5, r)}" fill="${t.field}" stroke="${t.line}"/>` + T(1104, 117.5, 12.5, t.ink, code, `font-weight="700" letter-spacing="0.4"`);
  R += `<path d="M1134 110.5l3.5 3.5 3.5-3.5" fill="none" stroke="${t.muted}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  R += T(728, 150, 13.5, t.muted, "Due today · Free standard shipping");
  const L0 = 180, rowH = Math.min(84, 376 / n), s = Math.min(56, rowH - 18);
  list.forEach((it, i) => {
    const top = L0 + i * rowH, cy = top + rowH / 2, tx = 728, ty = cy - s / 2, m = tx + s / 2;
    const tile = mix(t.field, acc, 0.14), c = fit(acc, tile, 2.6);
    R += `<rect x="${tx + 0.5}" y="${ty + 0.5}" width="${s - 1}" height="${s - 1}" rx="${Math.min(r, s / 2)}" fill="${tile}" stroke="${t.line}"/>`;
    const k = i % 4;
    if (k === 0) R += `<path d="M${m - s * 0.22} ${cy - s * 0.12}l${s * 0.12} -${s * 0.1}h${s * 0.2}l${s * 0.12} ${s * 0.1}v${s * 0.3}h-${s * 0.44}z" fill="${c}"/>`;
    else if (k === 1) R += `<rect x="${m - s * 0.16}" y="${cy - s * 0.18}" width="${s * 0.28}" height="${s * 0.34}" rx="${s * 0.05}" fill="${c}"/><path d="M${m + s * 0.12} ${cy - s * 0.08}a${s * 0.08} ${s * 0.08} 0 0 1 0 ${s * 0.16}" fill="none" stroke="${c}" stroke-width="${(s * 0.05).toFixed(1)}"/>`;
    else if (k === 2) R += `<rect x="${m - s * 0.15}" y="${cy - s * 0.21}" width="${s * 0.3}" height="${s * 0.42}" rx="${s * 0.03}" fill="${c}"/><path d="M${m - s * 0.08} ${cy - s * 0.21}v${s * 0.42}" stroke="${tile}" stroke-width="1.5"/>`;
    else R += `<path d="M${m - s * 0.2} ${cy - s * 0.04}h${s * 0.4}l-${s * 0.04} ${s * 0.26}h-${s * 0.32}z" fill="${c}"/><path d="M${m - s * 0.1} ${cy - s * 0.04}a${s * 0.1} ${s * 0.12} 0 0 1 ${s * 0.2} 0" fill="none" stroke="${c}" stroke-width="${(s * 0.05).toFixed(1)}"/>`;
    R += T(tx + s + 16, cy - 3, 14.5, t.ink, it.name, `font-weight="600"`);
    R += T(tx + s + 16, cy + 16, 13, t.muted, `${it.variant}  ·  ${it.qty} × ${fmt(it.unit)}`);
    R += T(1152, cy + 5, 14.5, t.ink, fmt(it.line), `text-anchor="end" font-weight="600"`);
    if (i < n - 1) R += `<path d="M728 ${top + rowH}H1152" stroke="${t.line}" stroke-dasharray="2 4"/>`;
  });
  const E = L0 + n * rowH;
  R += `<rect x="728.5" y="${E + 20.5}" width="423" height="39" rx="${Math.min(19.5, r)}" fill="${t.field}" stroke="${t.line}" stroke-dasharray="4 3"/>`;
  R += `<path d="M744 ${E + 34}v5.5l7.5 7.5 6.5-6.5-7.5-7.5z" fill="none" stroke="${accFg}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="748" cy="${E + 38}" r="1.4" fill="${accFg}"/>`;
  R += T(768, E + 45, 14, t.ink, "Add promotion code", `font-weight="500"`) + T(1138, E + 45, 13.5, accFg, "Apply", `text-anchor="end" font-weight="600"`);
  const row = (y, a, v) => T(728, y, 14, t.muted, a) + T(1152, y, 14, t.ink, v, `text-anchor="end"`);
  R += row(E + 94, `Subtotal (${qty} item${qty > 1 ? "s" : ""})`, fmt(sub)) + row(E + 122, "Shipping", "Free") + row(E + 150, "Estimated tax (8%)", fmt(tax));
  R += `<path d="M728 ${E + 170}H1152" stroke="${t.line}"/>`;
  R += T(728, E + 205, 16, t.ink, "Total due", `font-weight="600"`) + T(1152, E + 206, 24, t.ink, fmt(total), `text-anchor="end" font-weight="700" letter-spacing="-0.4"`);
  R += T(940, H - 26, 13, t.muted, "Powered by Oasis   ·   Terms   ·   Privacy", `text-anchor="middle"`);

  const defs = `<defs><filter id="sh" x="-20%" y="-30%" width="140%" height="180%"><feGaussianBlur stdDeviation="9"/></filter></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}<rect width="${W}" height="${H}" fill="${t.bg}"/>${L}${R}</svg>`;
}
