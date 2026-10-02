// Event ticket / boarding pass with perforated stub, seeded barcode and optional holographic foil.
export const meta = {
  title: "Admit One Ticket",
  kind: "ui",
  description: "A stylish event ticket with tear-off stub, seeded barcode and holographic foil for event promos, invites and app passes.",
  tags: ["ticket", "boarding pass", "event", "concert", "barcode", "invite", "holographic", "mockup"],
  price: 4,
  author: "oasis-factory",
  size: [960, 420],
};

export const params = {
  knobs: {
    accent: { type: "color", role: "primary", label: "Accent", default: "#E2553B" },
    paper: { type: "color", role: "surface", label: "Paper", default: "#F7F0E3" },
    ink: { type: "color", role: "ink", label: "Ink", default: "#1F1B16" },
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#25262E" },
    eventName: { type: "text", label: "Event name", default: "Midnight Arcadia" },
    date: { type: "text", label: "Date", default: "Sat 14 Jun 2025" },
    seat: { type: "text", label: "Seat", default: "Row F · Seat 12" },
    style: { type: "choice", label: "Style", default: "editorial", options: ["editorial", "modern", "mono"] },
    seed: { type: "range", label: "Barcode seed", default: 27, min: 1, max: 500, step: 1 },
    holographic: { type: "toggle", label: "Holographic foil", default: true },
  },
  presets: {
    Matinee: { accent: "#E2553B", paper: "#F7F0E3", ink: "#1F1B16", backdrop: "#25262E" },
    Midnight: { accent: "#C9A45C", paper: "#151821", ink: "#F2EBDD", backdrop: "#07080C" },
    Riviera: { accent: "#2E6FD8", paper: "#FFFFFF", ink: "#0F1E3A", backdrop: "#D5E0EE" },
    Sorbet: { accent: "#FF4F86", paper: "#FFF4E8", ink: "#2A1630", backdrop: "#FFD3C2" },
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

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Helvetica Neue, Helvetica, Arial, sans-serif";
const MONO = "Menlo, Consolas, monospace";
const HOLO = ["#FF7AD9", "#5FD3FF", "#FFE66B", "#9C85FF", "#5CF2C0"];

function fit(str, max, avail, f, min) {
  const n = Math.max(1, str.length);
  return Math.max(min, Math.min(max, avail / (n * f)));
}

function txt(x, y, str, o) {
  const a = [`x="${x}"`, `y="${y}"`, `font-family="${o.fam}"`, `font-size="${o.size.toFixed(1)}"`, `fill="${o.fill}"`];
  if (o.weight) a.push(`font-weight="${o.weight}"`);
  if (o.italic) a.push(`font-style="italic"`);
  if (o.ls) a.push(`letter-spacing="${o.ls}"`);
  if (o.anchor) a.push(`text-anchor="${o.anchor}"`);
  if (o.op) a.push(`opacity="${o.op}"`);
  if (o.tl) a.push(`textLength="${o.tl}" lengthAdjust="spacingAndGlyphs"`);
  return `<text ${a.join(" ")}>${esc(str)}</text>`;
}

function ticketPath(x, y, w, h, px, n, r) {
  return `M${x + r},${y} H${px - n} A${n},${n} 0 0 0 ${px + n},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${px + n} A${n},${n} 0 0 0 ${px - n},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
}

function barcode(x, y, w, h, r, color) {
  const m = [1, 1, 1];
  let total = 3;
  while (total < 88) {
    const v = r();
    const k = v < 0.45 ? 1 : v < 0.75 ? 2 : v < 0.92 ? 3 : 4;
    m.push(k); total += k;
  }
  if (m.length % 2 === 1) { m.push(1); total += 1; }
  m.push(1, 1, 1); total += 3;
  const u = w / total;
  let cx = x, out = "";
  for (let i = 0; i < m.length; i++) {
    const guard = i < 3 || i >= m.length - 3;
    if (i % 2 === 0) out += `<rect x="${cx.toFixed(2)}" y="${y}" width="${(m[i] * u).toFixed(2)}" height="${guard ? h + 5 : h}"/>`;
    cx += m[i] * u;
  }
  return `<g fill="${color}">${out}</g>`;
}

function holoGrad(id, extra) {
  return `<linearGradient id="${id}" ${extra}>${HOLO.map((c, i) => `<stop offset="${(i / 4).toFixed(2)}" stop-color="${c}"/>`).join("")}</linearGradient>`;
}

export default function render(p) {
  const W = 960, H = 420, X = 40, Y = 50, TW = 880, TH = 320, P = 700, N = 16, R = 18;
  const r = rng(p.seed * 9973 + 17);
  const serial = String(100000 + Math.floor(r() * 899999));
  const gate = "ABCDEFGH"[Math.floor(r() * 8)] + (1 + Math.floor(r() * 24));
  let digits = "";
  for (let i = 0; i < 12; i++) digits += Math.floor(r() * 10);
  const st = p.style, holo = p.holographic;
  const ink = p.ink, acc = p.accent;

  const headFam = st === "editorial" ? SERIF : st === "modern" ? SANS : MONO;
  const labFam = st === "mono" ? MONO : SANS;
  const cx = st === "modern" ? 148 : 88;
  const right = P - 36;
  const avail = right - cx;
  const ev = String(p.eventName || "").slice(0, 42);
  const head = st === "editorial" ? ev : ev.toUpperCase();
  const hf = st === "editorial" ? 0.48 : st === "modern" ? 0.64 : 0.62;
  const hMax = st === "editorial" ? 66 : st === "modern" ? 56 : 48;
  const hs = fit(head, hMax, avail, hf, 22);
  const hTL = head.length * hf * hs > avail ? avail : 0;
  const lab = (x, y, s, fill, op, anchor) => txt(x, y, s, { fam: labFam, size: 10.5, weight: 700, ls: 2.2, fill, op, anchor });
  const vf = st === "mono" ? 0.62 : 0.56;
  const val = (x, y, s, colW, max) => txt(x, y, s, { fam: st === "editorial" ? SERIF : labFam, size: fit(String(s), max, colW, vf, 10), weight: st === "editorial" ? 400 : 600, fill: ink });

  const d = ticketPath(X, Y, TW, TH, P, N, R);
  const defs = `<defs>
<clipPath id="t"><path d="${d}"/></clipPath>
<filter id="sh" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity="0.32"/></filter>
<filter id="gr"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${p.seed}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.15 0 0 0 -0.05"/></filter>
${holoGrad("hg", `x1="0" y1="0" x2="1" y2="1"`)}
<linearGradient id="hs" gradientUnits="userSpaceOnUse" x1="${X}" y1="${Y}" x2="${X + TW}" y2="${Y + TH + 220}"><stop offset="0.2" stop-color="${HOLO[0]}" stop-opacity="0"/><stop offset="0.38" stop-color="${HOLO[1]}" stop-opacity="0.6"/><stop offset="0.5" stop-color="${HOLO[2]}" stop-opacity="0.8"/><stop offset="0.62" stop-color="${HOLO[3]}" stop-opacity="0.6"/><stop offset="0.8" stop-color="${HOLO[4]}" stop-opacity="0"/></linearGradient>
<pattern id="sp" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="2" height="6" fill="#FFFFFF" opacity="0.35"/></pattern>
</defs>`;

  let body = "";
  const foil = holo ? "url(#hg)" : acc;
  if (st === "modern") {
    body += `<rect x="${X}" y="${Y}" width="72" height="${TH}" fill="${foil}"/>`;
    body += `<text transform="translate(81,${Y + TH / 2}) rotate(-90)" text-anchor="middle" font-family="${SANS}" font-size="14" font-weight="700" letter-spacing="6" fill="${holo ? "#1F1B16" : p.paper}">ADMIT ONE</text>`;
    body += `<circle cx="${cx + 4}" cy="102" r="4" fill="${acc}"/>`;
    body += lab(cx + 16, 106, "LIVE EVENT", ink, 0.7);
  } else {
    body += `<rect x="${X}" y="${Y}" width="10" height="${TH}" fill="${foil}"/>`;
    body += lab(cx, 106, st === "mono" ? "BOARDING PASS" : "LIVE IN CONCERT", acc);
  }

  if (holo) {
    body += `<g transform="translate(${right - 76},76)"><rect width="76" height="44" rx="6" fill="url(#hg)"/><rect width="76" height="44" rx="6" fill="url(#sp)"/>`;
    body += `<rect x="0.5" y="0.5" width="75" height="43" rx="5.5" fill="none" stroke="#000" stroke-opacity="0.12"/>`;
    body += `<circle cx="22" cy="22" r="12" fill="none" stroke="#FFFFFF" stroke-width="1.6" opacity="0.9"/><circle cx="22" cy="22" r="5.5" fill="none" stroke="#FFFFFF" stroke-width="1.6" opacity="0.9"/>`;
    body += `<text x="57" y="25.5" text-anchor="middle" font-family="${MONO}" font-size="8.5" font-weight="700" letter-spacing="1" fill="#1F1B16" opacity="0.7">AUTH</text></g>`;
  }

  body += txt(cx, 192, head, { fam: headFam, size: hs, weight: st === "editorial" ? 400 : st === "modern" ? 800 : 700, italic: st === "editorial", ls: st === "modern" ? -1 : 0, fill: ink, tl: hTL });

  if (st === "editorial") {
    body += `<path d="M${cx},222 H${right} M${cx},226.5 H${right}" stroke="${ink}" stroke-width="0.75" opacity="0.8"/>`;
  } else if (st === "modern") {
    body += `<path d="M${cx},224 H${right}" stroke="${acc}" stroke-width="2"/>`;
  } else {
    body += `<path d="M${cx},224 H${right}" stroke="${ink}" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>`;
  }

  const c1 = cx, c2 = cx + Math.round(avail * 0.44), c3 = cx + Math.round(avail * 0.78);
  body += lab(c1, 258, "DATE", ink, 0.55) + lab(c2, 258, "SEAT", ink, 0.55) + lab(c3, 258, "GATE", ink, 0.55);
  body += val(c1, 286, p.date, c2 - c1 - 18, 20) + val(c2, 286, p.seat, c3 - c2 - 18, 20) + val(c3, 286, gate, right - c3, 20);
  body += txt(cx, 340, "Non-transferable · No re-entry", { fam: labFam, size: 10.5, fill: ink, op: 0.6, ls: 0.4 });
  body += txt(right, 340, "No. " + serial, { fam: MONO, size: 10.5, fill: ink, op: 0.6, anchor: "end", ls: 1 });

  const sx = 728, sw = 164;
  body += `<rect x="${P}" y="${Y}" width="${X + TW - P}" height="${TH}" fill="${acc}" opacity="0.06"/>`;
  body += lab(sx, 106, "ADMIT ONE", acc);
  body += lab(sx, 146, "SEAT", ink, 0.55) + val(sx, 170, p.seat, sw, 18);
  body += lab(sx, 198, "DATE", ink, 0.55) + val(sx, 222, p.date, sw, 18);
  body += barcode(sx, 240, sw, 58, r, ink);
  const step = sw / digits.length;
  let dg = "";
  for (let i = 0; i < digits.length; i++) dg += `<text x="${(sx + step * (i + 0.5)).toFixed(1)}" y="324">${digits[i]}</text>`;
  body += `<g font-family="${MONO}" font-size="10.5" fill="${ink}" text-anchor="middle" opacity="0.85">${dg}</g>`;

  const sheen = holo ? `<rect x="${X}" y="${Y}" width="${TW}" height="${TH}" fill="url(#hs)" opacity="0.2"/>` : "";
  const grain = `<rect x="${X}" y="${Y}" width="${TW}" height="${TH}" filter="url(#gr)"/>`;
  const perf = `<line x1="${P}" y1="${Y + N + 10}" x2="${P}" y2="${Y + TH - N - 10}" stroke="${p.backdrop}" stroke-width="5" stroke-linecap="round" stroke-dasharray="0.1 10"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}<rect width="${W}" height="${H}" fill="${p.backdrop}"/><path d="${d}" fill="${p.paper}" filter="url(#sh)"/><g clip-path="url(#t)">${body}${sheen}${grain}</g>${perf}</svg>`;
}
