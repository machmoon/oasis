// Pricing comparison table: 2-4 plan columns, feature check rows, a highlighted plan and a billing switch.
export const meta = {
  title: "Plan Compare Table",
  kind: "ui",
  description: "A polished SaaS pricing comparison table with feature checkmark rows, a featured plan and a monthly/annual switch, ready for landing pages and pitch decks.",
  tags: ["pricing", "table", "saas", "plans", "landing page", "comparison", "ui", "checkmarks"],
  price: 8,
  author: "oasis-factory",
  size: [1200, 900],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#F4F2EE" },
    surface: { type: "color", role: "surface", label: "Card", default: "#FFFFFF" },
    ink: { type: "color", role: "ink", label: "Text", default: "#16161A" },
    accent: { type: "color", role: "primary", label: "Accent", default: "#4F46E5" },
    tiers: { type: "range", label: "Tier count", default: 3, min: 2, max: 4, step: 1 },
    featured: { type: "range", label: "Featured tier", default: 2, min: 1, max: 4, step: 1 },
    features: { type: "range", label: "Feature rows", default: 6, min: 3, max: 10, step: 1 },
    radius: { type: "range", label: "Corner radius", default: 16, min: 0, max: 28, step: 1 },
    annual: { type: "toggle", label: "Annual billing", default: true },
    headline: { type: "text", label: "Headline", default: "Simple pricing that scales with you" },
  },
  presets: {
    Midnight: { background: "#0D0F14", surface: "#161A22", ink: "#EEF0F5", accent: "#7CFFB2" },
    Clay: { background: "#F3E9E0", surface: "#FFFBF7", ink: "#2B1D16", accent: "#D9572B" },
    Lagoon: { background: "#E6F1F4", surface: "#FFFFFF", ink: "#0B2733", accent: "#0C8CA8" },
    Plum: { background: "#1E1220", surface: "#2A1A2D", ink: "#F7EAF3", accent: "#FF7AB6" },
  },
};

const TIERS = [
  { name: "Starter", desc: "For solo makers", price: 9, cta: "Start free trial" },
  { name: "Pro", desc: "For growing teams", price: 29, cta: "Get Pro" },
  { name: "Team", desc: "For scaling companies", price: 79, cta: "Get Team" },
  { name: "Enterprise", desc: "Advanced security", price: 199, cta: "Contact sales" },
];

const FEATURES = [
  ["Projects", ["3", "Unlimited", "Unlimited", "Unlimited"]],
  ["Storage", ["10 GB", "100 GB", "1 TB", "Custom"]],
  ["Team members", ["1", "5", "25", "Unlimited"]],
  ["Custom domains", [false, true, true, true]],
  ["API access", [false, true, true, true]],
  ["Priority support", [false, false, true, true]],
  ["Advanced analytics", [false, true, true, true]],
  ["SSO & SAML", [false, false, true, true]],
  ["Audit log", [false, false, false, true]],
  ["Dedicated manager", [false, false, false, true]],
];

const FONT = "-apple-system, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

function rgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
function lum(h) {
  const c = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function fmt(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function t(x, y, s, size, fill, extra = "") {
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size}" fill="${fill}" ${extra}>${s}</text>`;
}

export default function render(p) {
  const W = 1200, H = 900;
  const n = Math.max(2, Math.min(4, Math.round(p.tiers)));
  const f = Math.min(Math.round(p.featured), n) - 1;
  const rows = Math.max(3, Math.min(10, Math.round(p.features)));
  const r = p.radius;
  const { background: bg, surface: sf, ink, accent } = p;
  const onAccent = contrast(accent, "#111318") > contrast(accent, "#FFFFFF") ? "#111318" : "#FFFFFF";
  const muted = mix(ink, sf, 0.42);
  const mutedBg = mix(ink, bg, 0.42);
  const line = mix(ink, sf, 0.9);
  const panel = mix(sf, accent, 0.07);

  const cardX = 48, cardW = 1104;
  const labelW = n === 4 ? 272 : n === 3 ? 300 : 340;
  const colW = (cardW - labelW) / n;
  const rowH = Math.min(52, 340 / rows);
  const headH = 206;
  const cardH = headH + rows * rowH + 28;
  const totalH = 190 + cardH;
  const oy = Math.max(36, (H - totalH) / 2 + 6);
  const top = oy + 190;
  const cx = W / 2;

  const head = String(p.headline || "");
  const hs = Math.max(22, Math.min(40, 1060 / Math.max(1, head.length * 0.54)));

  let o = "";
  o += `<circle cx="${cx - 50}" cy="${oy + 7.5}" r="4" fill="${accent}"/>`;
  o += t(cx + 6, oy + 12, "PRICING", 13, mutedBg, `text-anchor="middle" font-weight="700" letter-spacing="2.4"`);
  o += t(cx, oy + 62, esc(head), hs.toFixed(1), ink, `text-anchor="middle" font-weight="700" letter-spacing="${(-hs * 0.022).toFixed(2)}"`);
  o += t(cx, oy + 98, "Start free for 14 days. No credit card required.", 17, mutedBg, `text-anchor="middle"`);

  const sy = oy + 126;
  const on = p.annual;
  o += t(cx - 40, sy + 20, "Monthly", 15, on ? mutedBg : ink, `text-anchor="end" font-weight="${on ? 500 : 700}"`);
  o += `<rect x="${cx - 27}" y="${sy}" width="54" height="30" rx="15" fill="${on ? accent : mix(bg, ink, 0.18)}"/>`;
  o += `<circle cx="${on ? cx + 12 : cx - 12}" cy="${sy + 15}" r="11" fill="${on ? onAccent : sf}"/>`;
  o += t(cx + 40, sy + 20, "Annual", 15, on ? ink : mutedBg, `font-weight="${on ? 700 : 500}"`);
  o += `<rect x="${cx + 104}" y="${sy + 3}" width="82" height="24" rx="12" fill="${mix(bg, accent, on ? 0.2 : 0.1)}"/>`;
  o += t(cx + 145, sy + 19.5, "Save 20%", 12, ink, `text-anchor="middle" font-weight="700"`);

  o += `<rect x="${cardX}" y="${top}" width="${cardW}" height="${cardH}" rx="${r}" fill="${sf}" stroke="${line}" filter="url(#cs)"/>`;

  for (let k = 0; k < rows; k += 2) {
    const y0 = top + headH + 12 + k * rowH;
    o += `<rect x="${cardX + 16}" y="${y0.toFixed(1)}" width="${cardW - 32}" height="${rowH.toFixed(1)}" rx="${Math.min(r, 8)}" fill="${mix(sf, ink, 0.025)}"/>`;
  }

  const fx = cardX + labelW + f * colW;
  const pi = 6, pw = colW - pi * 2;
  o += `<rect x="${(fx + pi).toFixed(1)}" y="${top - 18}" width="${pw.toFixed(1)}" height="${cardH + 36}" rx="${r > 0 ? r + 4 : 0}" fill="${panel}" stroke="${accent}" stroke-width="2" filter="url(#fs)"/>`;
  const bw = 128;
  o += `<rect x="${(fx + colW / 2 - bw / 2).toFixed(1)}" y="${top - 31}" width="${bw}" height="26" rx="${r > 0 ? 13 : 0}" fill="${accent}"/>`;
  o += t(fx + colW / 2, top - 13.5, "MOST POPULAR", 11.5, onAccent, `text-anchor="middle" font-weight="700" letter-spacing="1.2"`);

  o += t(cardX + 32, top + 48, "Compare plans", 20, ink, `font-weight="700" letter-spacing="-0.3"`);
  o += t(cardX + 32, top + 74, "Prices in USD,", 14, muted);
  o += t(cardX + 32, top + 94, "cancel anytime.", 14, muted);

  for (let i = 0; i < n; i++) {
    const T = TIERS[i], x = cardX + labelW + i * colW, px = x + 24, feat = i === f;
    const price = on ? Math.round(T.price * 0.8) : T.price;
    const ps = "$" + price;
    o += t(px, top + 46, T.name, 18, ink, `font-weight="700"`);
    o += t(px, top + 68, T.desc, 13, muted);
    o += t(px, top + 124, ps, 44, ink, `font-weight="700" letter-spacing="-1.4"`);
    o += t(px + ps.length * 24.5 + 6, top + 124, "/mo", 15, muted);
    o += t(px, top + 148, on ? `$${fmt(price * 12)} billed yearly` : "Billed monthly", 12.5, muted);
    const br = Math.min(r, 20) * 0.6;
    const bwid = colW - 48;
    o += feat
      ? `<rect x="${px}" y="${top + 162}" width="${bwid.toFixed(1)}" height="40" rx="${br}" fill="${accent}"/>`
      : `<rect x="${px + 0.75}" y="${top + 162.75}" width="${(bwid - 1.5).toFixed(1)}" height="38.5" rx="${br}" fill="none" stroke="${mix(ink, sf, 0.72)}" stroke-width="1.5"/>`;
    o += t(px + bwid / 2, top + 187, T.cta, 14, feat ? onAccent : ink, `text-anchor="middle" font-weight="600"`);
  }

  for (let k = 0; k < rows; k++) {
    const y0 = top + headH + 12 + k * rowH, cy = y0 + rowH / 2;
    const segs = [[cardX + 24, fx], [fx + colW, cardX + cardW - 24]];
    segs.forEach(([a, b]) => { if (b - a > 1) o += `<line x1="${a.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${b.toFixed(1)}" y2="${y0.toFixed(1)}" stroke="${line}"/>`; });
    o += `<line x1="${(fx + 18).toFixed(1)}" y1="${y0.toFixed(1)}" x2="${(fx + colW - 18).toFixed(1)}" y2="${y0.toFixed(1)}" stroke="${mix(panel, accent, 0.22)}"/>`;
    const [label, vals] = FEATURES[k];
    o += t(cardX + 32, cy + 5, esc(label), 15, ink, `font-weight="500"`);
    for (let i = 0; i < n; i++) {
      const px = cardX + labelW + i * colW + 24, v = vals[i], feat = i === f;
      if (v === true) {
        o += `<circle cx="${px + 10}" cy="${cy.toFixed(1)}" r="10" fill="${feat ? accent : mix(sf, ink, 0.11)}"/>`;
        o += `<path d="M${px + 5.5},${(cy + 0.2).toFixed(1)} l3,3 l6,-6.4" fill="none" stroke="${feat ? onAccent : ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
      } else if (v === false) {
        o += `<line x1="${px + 5}" y1="${cy.toFixed(1)}" x2="${px + 15}" y2="${cy.toFixed(1)}" stroke="${mix(ink, sf, 0.62)}" stroke-width="2" stroke-linecap="round"/>`;
      } else {
        o += t(px, cy + 5, esc(v), 14, ink, `font-weight="${feat ? 700 : 500}"`);
      }
    }
  }

  const defs = `<defs><filter id="cs" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="${ink}" flood-opacity="0.06"/></filter><filter id="fs" x="-30%" y="-10%" width="160%" height="130%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="${accent}" flood-opacity="0.24"/></filter></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}<rect width="${W}" height="${H}" fill="${bg}"/><g font-family="${FONT}">${o}</g></svg>`;
}
