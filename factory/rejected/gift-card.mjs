// Credit-card gift card: OKLCH brand gradient or engraved pattern, contrast-derived foil ribbon and bow, adjustable sheen, front, back or fanned pair.
export const meta = {
  title: "Ribbon Gift Card",
  kind: "mockup",
  description: "A credit-card-ratio gift card with a denomination, a named recipient and a satin foil ribbon. Show it front, back or as a fanned pair for shop promos, emails and checkout UI.",
  tags: ["gift card", "voucher", "card", "mockup", "ecommerce", "foil", "promo", "retail"],
  price: 5,
  author: "oasis-factory",
  size: [800, 560],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Backdrop", default: "#ECE6DC" },
    card: { type: "color", role: "primary", label: "Card", default: "#1E3A34" },
    card2: { type: "color", role: "secondary", label: "Card accent", default: "#4C8A6E" },
    ink: { type: "color", role: "ink", label: "Text", default: "#FBF6EC" },
    foil: { type: "color", role: "highlight", label: "Foil", default: "#D9B46A" },
    view: { type: "choice", label: "View", default: "pair", options: ["pair", "front", "back"] },
    fill: { type: "choice", label: "Fill", default: "guilloche", options: ["gradient", "guilloche", "rings", "stripes", "confetti"] },
    amount: { type: "range", label: "Denomination", default: 50, min: 10, max: 500, step: 5 },
    radius: { type: "range", label: "Corner radius", default: 22, min: 0, max: 44, step: 1 },
    shine: { type: "range", label: "Foil shine", default: 55, min: 0, max: 100, step: 5 },
    ribbon: { type: "range", label: "Ribbon position", default: 76, min: 56, max: 80, step: 1 },
    recipient: { type: "text", label: "Recipient", default: "Maya Chen" },
  },
  presets: {
    Blush: { background: "#F7EDE8", card: "#E3A49C", card2: "#F6D5C6", ink: "#3B1F1E", foil: "#B8864B" },
    Noir: { background: "#121214", card: "#1B1B21", card2: "#463F66", ink: "#F2EEE6", foil: "#C9CED6" },
    Citrus: { background: "#FFF6E0", card: "#FF7A2F", card2: "#FFC93C", ink: "#2B1606", foil: "#8A4B1C" },
    Lagoon: { background: "#E2F0EF", card: "#0F5C6E", card2: "#35B6A9", ink: "#F4FBF9", foil: "#E9D9A6" },
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

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const hex = (a) => "#" + a.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const toLin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const toS = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055);
const lum = (c) => { const [r, g, b] = rgb(c).map(toLin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const hd = (a, b) => Math.abs(((b - a + 540) % 360) - 180);
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function oklch(c) {
  const [r, g, b] = rgb(c).map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
}
function labRgb(L, A, B) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960771 * l - 0.7034186147 * m + 1.707614701 * s];
}
function fromLch(L, C, h) {
  L = clamp(L, 0, 1);
  const hr = h * Math.PI / 180;
  for (let i = 0; i < 16; i++) {
    const v = labRgb(L, C * Math.cos(hr), C * Math.sin(hr));
    if (v.every((x) => x >= -0.001 && x <= 1.001)) return hex(v.map(toS));
    C *= 0.85;
  }
  return hex(labRgb(L, 0, 0).map(toS));
}
function mixOk(a, b, t) {
  let [L1, C1, h1] = oklch(a), [L2, C2, h2] = oklch(b);
  if (C1 < 0.02) h1 = h2;
  if (C2 < 0.02) h2 = h1;
  const dh = ((h2 - h1 + 540) % 360) - 180;
  return fromLch(L1 + (L2 - L1) * t, C1 + (C2 - C1) * t + Math.sin(Math.PI * t) * 0.2 * Math.min(C1, C2), h1 + dh * t);
}
function inkFor(ink, samples, min = 4.5) {
  let best = ink, bc = 0;
  for (let t = 0; t <= 1.001; t += 0.1) for (const tg of ["#FFFFFF", "#000000"]) {
    const c = mix(ink, tg, t), m = Math.min(...samples.map((s) => contrast(c, s)));
    if (m >= min) return c;
    if (m > bc) { bc = m; best = c; }
  }
  return best;
}

const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "Menlo, Consolas, monospace";
const CW = 640, CH = 404;
const SH = [[0, 0], [0.25, 0], [0.42, 1], [0.47, 0.2], [0.58, 0.7], [0.74, 0], [1, 0]];

function pattern(p, pc, rx) {
  let defs = "", body = "";
  if (p.fill === "guilloche") {
    for (let f = 0; f < 2; f++) for (let j = 0; j < 16; j++) {
      let d = "";
      for (let x = -10; x <= 650; x += 10) d += (x < 0 ? "M" : "L") + x + "," + (j * 28 - 18 + 15 * Math.sin(x * 0.022 + j * 0.55 + f * Math.PI) + 5 * Math.sin(x * 0.061)).toFixed(1);
      body += `<path d="${d}" fill="none" stroke="${pc}" stroke-width="0.9" opacity="0.4"/>`;
    }
  } else if (p.fill === "rings") {
    for (let r = 40; r < 760; r += 30) body += `<circle cx="${rx}" cy="132" r="${r}" fill="none" stroke="${pc}" stroke-width="${(1.2 + r / 140).toFixed(1)}" opacity="0.4"/>`;
  } else if (p.fill === "stripes") {
    defs = `<pattern id="ps" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><rect width="10" height="28" fill="${pc}" opacity="0.32"/></pattern>`;
    body = `<rect width="${CW}" height="${CH}" fill="url(#ps)"/>`;
  } else if (p.fill === "confetti") {
    const r = rng(4021);
    for (let i = 0; i < 140; i++) {
      const x = r() * CW, y = r() * CH, s = 5 + r() * 9, a = Math.round(r() * 180), k = r(), c = r() < 0.7 ? pc : "url(#foil)";
      if ((Math.abs(x - rx) < 104 && y < 236) || Math.abs(x - rx) < 26 || (x < rx - 26 && y > 150 && y < 314) || (x < rx - 26 && y > 324) || (x < 230 && y < 98) || (x > rx && y > 330)) continue;
      const shape = k < 0.34 ? `<circle r="${(s / 2).toFixed(1)}"/>` : k < 0.68 ? `<rect x="${-s / 2}" y="${-s / 5}" width="${s}" height="${(s / 2.5).toFixed(1)}" rx="1.5"/>` : `<path d="M0,${-s / 1.6} L${s / 1.8},${s / 2.4} L${-s / 1.8},${s / 2.4}Z"/>`;
      body += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a})" fill="${c}" opacity="0.85">${shape}</g>`;
    }
  }
  return { defs, body };
}

function bow(cx, cy, fd, s) {
  const st = `stroke="${fd}" stroke-width="0.8" stroke-linejoin="round"`;
  const half = `<path d="M-5,6 L-33,62 L-21,57 L-15,72 L4,10Z" fill="url(#foil)" ${st}/><path d="M0,0 C-34,-44 -80,-36 -64,-4 C-54,15 -22,9 0,0Z" fill="url(#foil)" ${st}/><path d="M-7,-3 C-26,-27 -54,-24 -52,-9 C-40,-7 -22,-5 -7,-3Z" fill="url(#foilIn)"/><path d="M-10,-12 C-28,-36 -62,-34 -64,-12" fill="none" stroke="#FFF" stroke-width="1.6" stroke-linecap="round" opacity="${(0.12 + 0.4 * s).toFixed(2)}"/>`;
  return `<g filter="url(#lift)" transform="translate(${cx} ${cy}) scale(1.15)">${half}<g transform="scale(-1 1)">${half}</g><rect x="-11" y="-12" width="22" height="25" rx="7" fill="url(#foil)" ${st}/><rect x="-6" y="-8" width="4" height="16" rx="2" fill="#FFF" opacity="${(0.12 + 0.4 * s).toFixed(2)}"/></g>`;
}

function front(p, k) {
  const { rx, ink, fd, s } = k, amt = String(p.amount);
  const fs = Math.min(amt.length > 2 ? 112 : 120, (rx - 46 - 72) / (0.6 * amt.length));
  const raw = String(p.recipient).slice(0, 24), x2 = rx - 40, nfs = Math.min(22, (x2 - 92) / (0.5 * Math.max(raw.length, 1)));
  let o = `<g filter="url(#lift)"><rect x="${rx - 15}" y="-4" width="30" height="${CH + 8}" fill="url(#band)"/></g>`;
  o += `<path d="M${rx - 15},0 V${CH} M${rx + 15},0 V${CH}" stroke="${fd}" stroke-width="1"/>`;
  o += bow(rx, 132, fd, s);
  o += `<path d="M48,51 L52.5,61.5 L63,66 L52.5,70.5 L48,81 L43.5,70.5 L33,66 L43.5,61.5Z" fill="url(#foil)" stroke="${fd}" stroke-width="0.8"/>`;
  o += `<text x="74" y="71" font-family="${SANS}" font-size="15" font-weight="700" letter-spacing="4" fill="${ink.top}">OASIS</text>`;
  o += `<text x="40" y="${(296 - fs * 0.86).toFixed(0)}" font-family="${SANS}" font-size="12" font-weight="700" letter-spacing="3.2" fill="${ink.mid}">GIFT CARD</text>`;
  o += `<text x="40" y="${(296 - fs * 0.43).toFixed(0)}" font-family="${SERIF}" font-size="${(fs * 0.42).toFixed(0)}" fill="${ink.mid}">$</text>`;
  o += `<text x="72" y="296" font-family="${SERIF}" font-size="${fs.toFixed(0)}" letter-spacing="-2" fill="${ink.mid}">${amt}</text>`;
  o += `<text x="40" y="364" font-family="${SANS}" font-size="12" font-weight="700" letter-spacing="3" fill="${ink.bot}">TO</text>`;
  o += `<text x="82" y="357" font-family="${SERIF}" font-style="italic" font-size="${nfs.toFixed(1)}" fill="${ink.bot}">${esc(raw)}</text>`;
  o += `<line x1="72" y1="365" x2="${x2}" y2="365" stroke="${ink.bot}" stroke-width="1.2" opacity="0.6"/>`;
  o += `<text x="${CW - 32}" y="364" text-anchor="end" font-family="${MONO}" font-size="13" font-weight="700" letter-spacing="0.5" fill="${ink.ser}">Nº 0482</text>`;
  return o;
}

function back(p, k) {
  const { ink, foil, card } = k, pr = Math.min(p.radius * 0.4, 10), dark = "#16130F";
  const ft = inkFor(mix(foil, "#000000", 0.6), [foil, k.fl]);
  const raw = String(p.recipient).slice(0, 24), nfs = Math.min(15, 150 / (0.5 * Math.max(raw.length, 1)));
  let o = `<rect x="0" y="34" width="${CW}" height="62" fill="${mix(card, "#000000", 0.72)}"/>`;
  o += `<rect x="40" y="124" width="360" height="66" rx="${pr}" fill="#FFFFFF" opacity="0.95"/>`;
  o += `<text x="54" y="145" font-family="${SANS}" font-size="10" font-weight="700" letter-spacing="2.4" fill="${dark}">TO</text><text x="54" y="172" font-family="${SERIF}" font-style="italic" font-size="${nfs.toFixed(1)}" fill="${dark}">${esc(raw)}</text><line x1="54" y1="178" x2="210" y2="178" stroke="${dark}" opacity="0.35"/>`;
  o += `<text x="230" y="145" font-family="${SANS}" font-size="10" font-weight="700" letter-spacing="2.4" fill="${dark}">FROM</text><text x="230" y="172" font-family="${SERIF}" font-style="italic" font-size="15" fill="${dark}">Oasis Studio</text><line x1="230" y1="178" x2="386" y2="178" stroke="${dark}" opacity="0.35"/>`;
  o += `<rect x="40" y="214" width="300" height="108" rx="${pr}" fill="#FFFFFF"/>`;
  const r = rng(9137);
  let x = 58;
  while (x < 318) { const w = 1 + Math.floor(r() * 3.4); o += `<rect x="${x}" y="228" width="${w}" height="60" fill="${dark}"/>`; x += w + 1 + Math.floor(r() * 3); }
  o += `<text x="190" y="309" text-anchor="middle" font-family="${MONO}" font-size="12" letter-spacing="2" fill="${dark}">6021 4930 0482 7715</text>`;
  o += `<g filter="url(#lift)"><circle cx="530" cy="232" r="66" fill="url(#foil)" stroke="${k.fd}" stroke-width="1"/></g><circle cx="530" cy="232" r="55" fill="none" stroke="${ft}" stroke-width="1" stroke-dasharray="2 4"/>`;
  o += `<text x="530" y="207" text-anchor="middle" font-family="${SANS}" font-size="10" font-weight="700" letter-spacing="3" fill="${ft}">VALUE</text>`;
  o += `<text x="530" y="${p.amount >= 100 ? 252 : 254}" text-anchor="middle" font-family="${SERIF}" font-size="${p.amount >= 100 ? 34 : 40}" fill="${ft}">$${p.amount}</text>`;
  o += `<text x="40" y="368" font-family="${SANS}" font-size="12" fill="${ink.foot}">Redeemable online and in store. No cash value.</text>`;
  o += `<text x="${CW - 32}" y="368" text-anchor="end" font-family="${MONO}" font-size="13" font-weight="700" fill="${ink.ser}">PIN 4821</text>`;
  return o;
}

export default function render(p) {
  const W = 800, H = 560, rad = p.radius, s = p.shine / 100, rx = Math.round(CW * p.ribbon / 100);
  const O1 = oklch(p.card), O2 = oklch(p.card2);
  const c2 = fromLch(clamp(O2[0], O1[0] - 0.2, O1[0] + 0.2), O2[1], O2[2]);
  const gradAt = (t) => mixOk(p.card, c2, t);
  const sheenA = (t) => { for (let i = 1; i < SH.length; i++) if (t <= SH[i][0]) { const [a0, b0] = SH[i - 1], [a1, b1] = SH[i]; return (b0 + (b1 - b0) * (t - a0) / (a1 - a0)) * 0.34 * s; } return 0; };
  const smp = (u, v) => { const t = (u + v) / 2; return mix(gradAt(t), "#FFFFFF", sheenA(t)); };
  const ur = rx / CW;
  const ink = {
    top: inkFor(p.ink, [smp(0.05, 0.17), smp(0.24, 0.17)]),
    mid: inkFor(p.ink, [smp(0.06, 0.45), smp(0.06, 0.74), smp(ur - 0.1, 0.5), smp(ur - 0.1, 0.74)]),
    bot: inkFor(p.ink, [smp(0.06, 0.9), smp(ur - 0.08, 0.9)]),
    ser: inkFor(p.ink, [smp(0.84, 0.9), smp(0.95, 0.91)]),
    foot: inkFor(p.ink, [smp(0.06, 0.91), smp(0.62, 0.91)]),
  };
  const [bL] = oklch(gradAt(ur / 2 + 0.15)), [fL0, fC0, fh] = oklch(p.foil);
  const fL = clamp(bL > 0.62 ? Math.min(fL0, bL - 0.22) : Math.max(fL0, bL + 0.24), 0.3, 0.93);
  const hues = [O1, O2].filter((o) => o[1] > 0.03).map((o) => o[2]);
  let fC = Math.min(fC0, 0.13);
  if (fC0 > 0.04 && !(fh > 55 && fh < 105) && hues.length && Math.min(...hues.map((h) => hd(fh, h))) > 70) fC = Math.min(fC, 0.045);
  const foil = fromLch(fL, fC, fh), fd = fromLch(fL - 0.2, fC * 0.9, fh), fl = fromLch(Math.min(0.98, fL + 0.16), fC * 0.6, fh), hl = mix(foil, fl, s);
  const [mL] = oklch(gradAt(0.5));
  const pc = fromLch(mL + (mL < 0.6 ? 0.13 : -0.13), Math.max(O2[1], 0.02), O2[2]);
  const pat = pattern(p, pc, rx);
  const fstops = (id, x2, y2) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${fd}"/><stop offset="0.3" stop-color="${foil}"/><stop offset="0.5" stop-color="${hl}"/><stop offset="0.7" stop-color="${foil}"/><stop offset="1" stop-color="${fd}"/></linearGradient>`;
  let gs = "";
  for (let i = 0; i <= 6; i++) gs += `<stop offset="${(i / 6).toFixed(3)}" stop-color="${gradAt(i / 6)}"/>`;
  let defs = `<clipPath id="cc"><rect width="${CW}" height="${CH}" rx="${rad}"/></clipPath><linearGradient id="gf" x1="0" y1="0" x2="1" y2="1">${gs}</linearGradient>`;
  defs += fstops("foil", 1, 1) + fstops("band", 1, 0);
  defs += `<linearGradient id="foilIn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${fd}"/><stop offset="1" stop-color="${mix(foil, fd, 0.5)}"/></linearGradient>`;
  defs += `<linearGradient id="sh" x1="0" y1="0" x2="1" y2="1">${SH.map(([o, a]) => `<stop offset="${o}" stop-color="#FFF" stop-opacity="${(a * 0.34 * s).toFixed(3)}"/>`).join("")}</linearGradient>`;
  defs += `<filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#000" flood-opacity="0.3"/></filter>`;
  defs += `<filter id="lift" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.28"/></filter>` + pat.defs;
  const k = { rx, ink, fd, s, foil, fl, card: p.card };
  const rim = `<rect x="0.75" y="0.75" width="${CW - 1.5}" height="${CH - 1.5}" rx="${Math.max(0, rad - 0.75)}" fill="none" stroke="#FFF" stroke-opacity="${(0.08 + 0.3 * s).toFixed(2)}" stroke-width="1.5"/>`;
  const card = (face, tf) => `<g transform="${tf}"><rect width="${CW}" height="${CH}" rx="${rad}" fill="${p.card}" filter="url(#shadow)"/><g clip-path="url(#cc)"><rect width="${CW}" height="${CH}" fill="url(#gf)"/>${pat.body}${face === "back" ? back(p, k) : front(p, k)}<rect width="${CW}" height="${CH}" fill="url(#sh)"/>${rim}</g></g>`;
  const body = p.view === "pair"
    ? card("back", "translate(44 58) rotate(-7 230 145) scale(0.72)") + card("front", "translate(296 222) scale(0.72)")
    : card(p.view, `translate(${(W - CW) / 2} ${(H - CH) / 2})`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="${p.background}"/>${body}</svg>`;
}
