// SaaS pricing card: plan, price, billing period, feature checklist, CTA and an optional "Most popular" corner ribbon.
export const meta = {
  title: "Pricing Plan Card",
  kind: "ui",
  description: "A polished SaaS pricing card with feature checklist, CTA and ribbon, for landing pages, pitch decks and UI mockups.",
  tags: ["pricing", "pricing card", "saas", "ui", "plan", "subscription", "landing page", "component"],
  price: 5,
  author: "oasis-factory",
  size: [480, 640],
};

export const params = {
  knobs: {
    accent: { type: "color", label: "Accent", default: "#5B5CF0" },
    backdrop: { type: "color", label: "Backdrop", default: "#ECEEF6" },
    theme: { type: "choice", label: "Theme", default: "light", options: ["light", "dark"] },
    period: { type: "choice", label: "Billing period", default: "month", options: ["month", "year", "user / month"] },
    button: { type: "choice", label: "Button style", default: "solid", options: ["solid", "gradient", "outline"] },
    plan: { type: "text", label: "Plan name", default: "Pro" },
    price: { type: "text", label: "Price", default: "$29" },
    features: { type: "range", label: "Feature rows", default: 5, min: 3, max: 6, step: 1 },
    radius: { type: "range", label: "Corner radius", default: 20, min: 0, max: 40, step: 2 },
    popular: { type: "toggle", label: "Most popular ribbon", default: true },
  },
  presets: {
    Indigo: { accent: "#5B5CF0", backdrop: "#ECEEF6" },
    Emerald: { accent: "#10A37F", backdrop: "#EAF3EF" },
    Coral: { accent: "#FF5A4E", backdrop: "#FBF0EC" },
    Midnight: { accent: "#8B7CFF", backdrop: "#0A0B12" },
  },
};

const FEATURES = [
  "Unlimited projects",
  "Advanced analytics",
  "Custom domains",
  "Team collaboration",
  "Priority support",
  "SSO &amp; audit logs",
];
const NOTES = {
  month: "Billed monthly · cancel anytime",
  year: "Billed yearly · 2 months free",
  "user / month": "Per seat · billed monthly",
};
const F = "-apple-system, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rgb(h) {
  const n = parseInt(String(h).slice(1, 7), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const x = rgb(a), y = rgb(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
function ink(h) {
  const [r, g, b] = rgb(h);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.64 ? "#0F1222" : "#FFFFFF";
}

export default function render(p) {
  const W = 480, H = 640;
  const dark = p.theme === "dark";
  const T = dark
    ? { card: "#151722", text: "#F3F4F9", muted: "#9196AA", line: "#272B3A", border: "#252838" }
    : { card: "#FFFFFF", text: "#11131F", muted: "#6A6F82", line: "#ECEDF2", border: "#E3E5EC" };
  const acc = p.accent;
  const accText = dark ? mix(acc, "#FFFFFF", 0.28) : acc;
  const n = clamp(Math.round(p.features), 3, 6);
  const cw = 360, pad = 32, cx = (W - cw) / 2;
  const bw = cw - pad * 2;
  const rowY0 = 226, gap = 38;
  const btnY = rowY0 + (n - 1) * gap + 44;
  const ch = btnY + 98;
  const cy = Math.round((H - ch) / 2);
  const R = clamp(p.radius, 0, 60);
  const br = Math.min(R * 0.6, 25);
  const cr = Math.min(10, R * 0.5);
  const pop = !!p.popular;

  const planRaw = String(p.plan || "").slice(0, 22);
  const priceRaw = String(p.price || "").slice(0, 10);
  const planFs = clamp((pop ? 236 : bw) / (Math.max(1, planRaw.length) * 0.6), 14, 20).toFixed(1);
  const periodW = (p.period.length + 2) * 15 * 0.5 + 10;
  const priceFs = clamp(((bw - periodW) / Math.max(1, priceRaw.length) + 2) / 0.6, 30, 52);
  const priceLs = (-2 * priceFs / 52).toFixed(2);

  const gradA = mix(acc, "#000000", 0.1), gradB = mix(acc, "#FFFFFF", 0.3);
  const defs = `<defs>
<radialGradient id="halo" cx="50%" cy="46%" r="62%"><stop offset="0" stop-color="${acc}" stop-opacity="${dark ? 0.22 : 0.16}"/><stop offset="1" stop-color="${acc}" stop-opacity="0"/></radialGradient>
<radialGradient id="gl" cx="0.5" cy="0" r="0.85"><stop offset="0" stop-color="${acc}" stop-opacity="${(dark ? 0.24 : 0.1) * (pop ? 1 : 0.55)}"/><stop offset="1" stop-color="${acc}" stop-opacity="0"/></radialGradient>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${gradA}"/><stop offset="1" stop-color="${gradB}"/></linearGradient>
<linearGradient id="rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(acc, "#FFFFFF", 0.08)}"/><stop offset="1" stop-color="${mix(acc, "#000000", 0.12)}"/></linearGradient>
<clipPath id="cc"><rect width="${cw}" height="${ch}" rx="${R}"/></clipPath>
<filter id="sh" x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="0" dy="22" stdDeviation="24" flood-color="${pop ? acc : "#0B0D18"}" flood-opacity="${dark ? (pop ? 0.34 : 0.5) : pop ? 0.22 : 0.12}"/></filter>
</defs>`;

  const bgLayer = `<rect width="${W}" height="${H}" fill="${p.backdrop}"/><rect width="${W}" height="${H}" fill="url(#halo)"/>`;

  let rows = "";
  for (let i = 0; i < n; i++) {
    const y = rowY0 + i * gap;
    rows += `<rect x="${pad}" y="${y - 10}" width="20" height="20" rx="${cr}" fill="${acc}" fill-opacity="${dark ? 0.22 : 0.12}"/>`;
    rows += `<path d="M${pad + 5.6} ${y + 0.4}l2.9 2.9 5.9-6.1" fill="none" stroke="${accText}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    rows += `<text x="${pad + 34}" y="${y + 5}" font-size="15" fill="${T.text}" fill-opacity="0.9">${FEATURES[i]}</text>`;
  }

  let btn, btnInk;
  if (p.button === "outline") {
    btn = `<rect x="${pad + 0.75}" y="${btnY + 0.75}" width="${bw - 1.5}" height="48.5" rx="${Math.max(0, br - 0.75)}" fill="${acc}" fill-opacity="${dark ? 0.1 : 0.05}" stroke="${accText}" stroke-width="1.5"/>`;
    btnInk = accText;
  } else if (p.button === "gradient") {
    btn = `<rect x="${pad}" y="${btnY}" width="${bw}" height="50" rx="${br}" fill="url(#bg)"/><rect x="${pad + 1}" y="${btnY + 1}" width="${bw - 2}" height="48" rx="${Math.max(0, br - 1)}" fill="none" stroke="#FFFFFF" stroke-opacity="0.18"/>`;
    btnInk = ink(mix(gradA, gradB, 0.5));
  } else {
    btn = `<rect x="${pad}" y="${btnY}" width="${bw}" height="50" rx="${br}" fill="${acc}"/>`;
    btnInk = ink(acc);
  }
  btn += `<text x="${cw / 2}" y="${btnY + 30}" text-anchor="middle" font-size="15" font-weight="600" fill="${btnInk}" letter-spacing="0.2">Get started<tspan dx="8">→</tspan></text>`;

  const d = Math.round(60 + R * 0.45);
  const ribbon = pop
    ? `<g clip-path="url(#cc)"><g transform="translate(${cw} 0) rotate(45)"><rect x="-140" y="${d - 13}" width="280" height="26" fill="url(#rb)"/><rect x="-140" y="${d - 13}" width="280" height="1" fill="#FFFFFF" fill-opacity="0.25"/><rect x="-140" y="${d + 12}" width="280" height="1" fill="#000000" fill-opacity="0.12"/><text x="0" y="${d + 3.6}" text-anchor="middle" font-size="10" font-weight="700" letter-spacing="1.4" fill="${ink(acc)}">MOST POPULAR</text></g></g>`
    : "";

  const plan = esc(planRaw);
  const price = esc(priceRaw);
  const period = esc(p.period);
  const note = esc(NOTES[p.period] || "");

  const card = `<g transform="translate(${cx} ${cy})">
<rect width="${cw}" height="${ch}" rx="${R}" fill="${T.card}" filter="url(#sh)"/>
<g clip-path="url(#cc)"><rect width="${cw}" height="260" fill="url(#gl)"/>${dark ? `<rect width="${cw}" height="1" fill="#FFFFFF" fill-opacity="0.08"/>` : ""}</g>
<text x="${pad}" y="52" font-size="${planFs}" font-weight="700" fill="${T.text}" letter-spacing="-0.2">${plan}</text>
<text x="${pad}" y="76" font-size="14" fill="${T.muted}">Everything a growing team needs</text>
<text x="${pad}" y="140" fill="${T.text}"><tspan font-size="${priceFs.toFixed(1)}" font-weight="700" letter-spacing="${priceLs}">${price}</tspan><tspan dx="8" font-size="15" font-weight="500" fill="${T.muted}">/ ${period}</tspan></text>
<text x="${pad}" y="168" font-size="13" fill="${T.muted}">${note}</text>
<rect x="${pad}" y="196" width="${bw}" height="1" fill="${T.line}"/>
${rows}
${btn}
<text x="${cw / 2}" y="${btnY + 78}" text-anchor="middle" font-size="12" fill="${T.muted}">No credit card required</text>
${ribbon}
<rect x="${pop ? 1 : 0.5}" y="${pop ? 1 : 0.5}" width="${cw - (pop ? 2 : 1)}" height="${ch - (pop ? 2 : 1)}" rx="${Math.max(0, R - (pop ? 1 : 0.5))}" fill="none" stroke="${pop ? acc : T.border}" stroke-width="${pop ? 2 : 1}"/>
</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}${bgLayer}<g font-family="${F}">${card}</g></svg>`;
}
