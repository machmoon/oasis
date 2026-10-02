// Audio player card: tonal album art, track info, waveform or bar scrubber, and transport controls.
export const meta = {
  title: "Night Drive Player",
  kind: "ui",
  description: "A polished audio player card with generative album art, a waveform or bar scrubber and transport controls, for music app mockups and landing pages.",
  tags: ["music", "audio player", "media controls", "ui card", "waveform", "album art", "app"],
  price: 6,
  author: "oasis-factory",
  credit: "Shuffle, repeat and heart glyphs from Lucide (ISC)",
  size: [440, 660],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Page", default: "#EDE7DF" },
    ink: { type: "color", role: "ink", label: "Text", default: "#1D1B19" },
    accent: { type: "color", role: "primary", label: "Accent & art", default: "#E0603A" },
    size: { type: "choice", label: "Size", default: "full", options: ["full", "mini"] },
    scrubber: { type: "choice", label: "Scrubber", default: "waveform", options: ["waveform", "bar"] },
    art: { type: "choice", label: "Art gradient", default: "aura", options: ["aura", "rings", "horizon", "grid"] },
    progress: { type: "range", label: "Progress %", default: 38, min: 0, max: 100, step: 1 },
    playing: { type: "toggle", label: "Playing", default: true },
    title: { type: "text", label: "Track", default: "Golden Hour Drive" },
    artist: { type: "text", label: "Artist", default: "Lumen Coast" },
  },
  presets: {
    Midnight: { background: "#0E0F1A", ink: "#ECEAF6", accent: "#7C6CFF" },
    Moss: { background: "#E2E9DC", ink: "#1F2A1F", accent: "#3E7D4F" },
    Sorbet: { background: "#FFE6EA", ink: "#3A1020", accent: "#FF4F7B" },
    Neon: { background: "#111111", ink: "#F2F2F2", accent: "#C8FF3D" },
  },
};

const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (h) => { const [r, g, b] = hx(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const con = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
function toHsl(h) {
  const [r, g, b] = hx(h).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let hh = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh /= 6; }
  return [hh, s, l];
}
function fromHsl(h, s, l) {
  const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return toHex([f(0), f(8), f(4)].map((v) => v * 255));
}
function ensure(fg, bg, min) {
  let [h, s, l] = toHsl(fg), c = fg; const d = lum(bg) > 0.3 ? -0.03 : 0.03;
  for (let i = 0; i < 40 && con(c, bg) < min; i++) { l = clamp(l + d); c = fromHsl(h, s, l); }
  return c;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function fit(s, maxW, size, k) {
  let t = String(s);
  if (t.length * size * k <= maxW) return esc(t);
  while (t.length > 1 && (t.length + 1) * size * k > maxW) t = t.slice(0, -1);
  return esc(t.trimEnd()) + "…";
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const f1 = (v) => +v.toFixed(2);

const LU = {
  shuffle: '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.289 1.723l.509.755"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  heart: '<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/>',
};
const icon = (k, cx, cy, s, col) => `<g transform="translate(${f1(cx - s / 2)} ${f1(cy - s / 2)}) scale(${f1(s / 24)})" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${LU[k]}</g>`;

function skip(cx, cy, s, col, flip) {
  const g = `<path d="M${f1(cx + s * 0.42)} ${f1(cy - s * 0.4)}L${f1(cx - s * 0.2)} ${cy}L${f1(cx + s * 0.42)} ${f1(cy + s * 0.4)}Z" stroke="${col}" stroke-width="${f1(s * 0.12)}" stroke-linejoin="round"/><rect x="${f1(cx - s * 0.46)}" y="${f1(cy - s * 0.42)}" width="${f1(s * 0.16)}" height="${f1(s * 0.84)}" rx="${f1(s * 0.08)}"/>`;
  return `<g fill="${col}"${flip ? ` transform="translate(${2 * cx} 0) scale(-1 1)"` : ""}>${g}</g>`;
}

function artBody(style, ramp, R) {
  let d = "", b = "";
  if (style === "aura") {
    d += `<linearGradient id="aBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${ramp(0.12)}"/><stop offset="1" stop-color="${ramp(0.36)}"/></linearGradient>`;
    b += `<rect width="100" height="100" fill="url(#aBg)"/>`;
    const spots = [[18 + R() * 22, 16 + R() * 22, 0.92, 40], [58 + R() * 24, 56 + R() * 24, 0.7, 44], [20 + R() * 30, 70 + R() * 18, 0.5, 30]];
    spots.forEach(([x, y, t, r], i) => {
      d += `<radialGradient id="aG${i}"><stop offset="0" stop-color="${ramp(t)}" stop-opacity="0.95"/><stop offset="0.55" stop-color="${ramp(t)}" stop-opacity="0.35"/><stop offset="1" stop-color="${ramp(t)}" stop-opacity="0"/></radialGradient>`;
      b += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r + R() * 10)}" fill="url(#aG${i})"/>`;
    });
    const ox = spots[1][0], oy = spots[1][1];
    b += `<g fill="none" stroke="${ramp(0.97)}" stroke-width="0.3" stroke-opacity="0.22">`;
    for (let k = 0; k < 6; k++) b += `<circle cx="${f1(ox)}" cy="${f1(oy)}" r="${12 + k * 9}"/>`;
    b += `</g><circle cx="${f1(ox)}" cy="${f1(oy)}" r="2.2" fill="${ramp(0.97)}" fill-opacity="0.8"/>`;
  } else if (style === "rings") {
    const cx = 20 + R() * 60, cy = 62 + R() * 30;
    b += `<rect width="100" height="100" fill="${ramp(0.14)}"/>`;
    for (let k = 0; k < 10; k++) b += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${150 - k * 15}" fill="${ramp(0.16 + k * 0.075)}"/>`;
  } else if (style === "horizon") {
    d += `<linearGradient id="hSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ramp(0.86)}"/><stop offset="0.7" stop-color="${ramp(0.6)}"/></linearGradient>`;
    b += `<rect width="100" height="100" fill="url(#hSky)"/><circle cx="${f1(28 + R() * 44)}" cy="40" r="15" fill="${ramp(0.97)}"/>`;
    for (let j = 0; j < 3; j++) {
      const base = 60 + j * 13, ph = R() * 6, fr = 0.05 + R() * 0.05, am = 5 - j;
      let path = `M0 100`;
      for (let x = 0; x <= 100; x += 4) path += `L${x} ${f1(base + Math.sin(x * fr + ph) * am)}`;
      b += `<path d="${path}L100 100Z" fill="${ramp(0.48 - j * 0.14)}"/>`;
    }
  } else {
    const c = 100 / 3, lv = [0.2, 0.36, 0.52, 0.68, 0.84];
    for (let i = 0; i < 9; i++) {
      const x = (i % 3) * c, y = Math.floor(i / 3) * c, a = Math.floor(R() * 5);
      let o = Math.floor(R() * 5); if (o === a) o = (a + 2) % 5;
      const t = Math.floor(R() * 4), rot = Math.floor(R() * 4) * 90, hc = c / 2;
      b += `<g transform="translate(${f1(x)} ${f1(y)})"><rect width="${f1(c + 0.2)}" height="${f1(c + 0.2)}" fill="${ramp(lv[a])}"/><g transform="rotate(${rot} ${f1(hc)} ${f1(hc)})" fill="${ramp(lv[o])}">`;
      if (t === 0) b += `<path d="M0 0H${f1(c)}A${f1(c)} ${f1(c)} 0 0 1 0 ${f1(c)}Z"/>`;
      else if (t === 1) b += `<circle cx="${f1(hc)}" cy="${f1(hc)}" r="${f1(c * 0.36)}"/>`;
      else if (t === 2) b += `<path d="M0 ${f1(c)}A${f1(hc)} ${f1(hc)} 0 0 1 ${f1(c)} ${f1(c)}Z"/>`;
      else b += `<rect x="${f1(c * 0.2)}" y="${f1(c * 0.2)}" width="${f1(c * 0.6)}" height="${f1(c * 0.6)}" rx="${f1(c * 0.3)}" transform="rotate(45 ${f1(hc)} ${f1(hc)})"/>`;
      b += `</g></g>`;
    }
  }
  return [d, b];
}

export default function render(p) {
  const full = p.size === "full";
  const W = full ? 440 : 640, H = full ? 660 : 240;
  const bg = p.background, light = lum(bg) > 0.3;
  let card = mix(bg, "#FFFFFF", 0.6);
  if (!light) { let t = 0.06; card = mix(bg, "#FFFFFF", t); while (con(card, bg) < 1.18 && t < 0.4) { t += 0.02; card = mix(bg, "#FFFFFF", t); } }
  const ink = con(p.ink, card) >= 4.5 ? p.ink : light ? "#16151A" : "#F3F2F7";
  const muted = mix(card, ink, 0.62), track = mix(card, ink, 0.18), edge = mix(card, ink, 0.08);
  const acc = ensure(p.accent, card, 2.1);
  const onAcc = con("#FFFFFF", acc) >= 3 ? "#FFFFFF" : "#141414";
  const [ah, as] = toHsl(p.accent), s2 = as < 0.08 ? as : clamp(as, 0.35, 0.85);
  const ramp = (t) => fromHsl(ah, s2, 0.1 + clamp(t) * 0.82);
  let hs = 7; for (const ch of String(p.title) + String(p.artist)) hs = (hs * 31 + ch.charCodeAt(0)) >>> 0;
  const R = rng(hs);
  const prog = clamp(p.progress / 100), DUR = 222, el = Math.round(prog * DUR), rem = DUR - el;
  const SANS = "Helvetica Neue, Helvetica, Arial, sans-serif", MONO = "SF Mono, Menlo, Consolas, monospace";

  const L = full
    ? { cx: 24, cy: 24, cw: 392, ch: 612, crx: 32, ax: 48, ay: 48, aw: 344, arx: 22, tx: 48, ty: 432, tw: 300, ts: 24, ay2: 457, as: 15, sx0: 48, sx1: 392, sy: 494, amp: 16, timeY: 534, py: 584, pr: 30, prevX: 140, nextX: 300, isz: 22 }
    : { cx: 20, cy: 20, cw: 600, ch: 200, crx: 28, ax: 44, ay: 44, aw: 152, arx: 18, tx: 220, ty: 82, tw: 230, ts: 20, ay2: 106, as: 14, sx0: 220, sx1: 596, sy: 152, amp: 13, timeY: 188, py: 88, pr: 26, prevX: 484, nextX: 588, isz: 18 };
  const playX = (L.prevX + L.nextX) / 2;

  const [ad, ab] = artBody(p.art, ramp, R);
  let defs = `<filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="${light ? mix(bg, "#000000", 0.6) : "#000000"}" flood-opacity="${light ? 0.16 : 0.55}"/></filter>`;
  defs += `<filter id="gr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1.2 0 0 0 -0.55"/></filter>`;
  defs += `<clipPath id="ac"><rect x="${L.ax}" y="${L.ay}" width="${L.aw}" height="${L.aw}" rx="${L.arx}"/></clipPath>${ad}`;

  let o = `<rect width="${W}" height="${H}" fill="${bg}"/>`;
  o += `<rect x="${L.cx}" y="${L.cy}" width="${L.cw}" height="${L.ch}" rx="${L.crx}" fill="${card}" filter="url(#sh)"/>`;
  o += `<rect x="${L.cx + 0.5}" y="${L.cy + 0.5}" width="${L.cw - 1}" height="${L.ch - 1}" rx="${L.crx - 0.5}" fill="none" stroke="${edge}"/>`;
  o += `<g clip-path="url(#ac)"><g transform="translate(${L.ax} ${L.ay}) scale(${f1(L.aw / 100)})">${ab}</g><rect x="${L.ax}" y="${L.ay}" width="${L.aw}" height="${L.aw}" filter="url(#gr)" opacity="0.2"/></g>`;
  o += `<rect x="${L.ax + 0.5}" y="${L.ay + 0.5}" width="${L.aw - 1}" height="${L.aw - 1}" rx="${L.arx}" fill="none" stroke="#000000" stroke-opacity="0.08"/>`;

  o += `<text x="${L.tx}" y="${L.ty}" font-family="${SANS}" font-size="${L.ts}" font-weight="700" letter-spacing="-0.3" fill="${ink}">${fit(p.title, L.tw, L.ts, 0.58)}</text>`;
  o += `<text x="${L.tx}" y="${L.ay2}" font-family="${SANS}" font-size="${L.as}" fill="${muted}">${fit(p.artist, L.tw, L.as, 0.53)}</text>`;
  if (full) o += icon("heart", 381, 436, 22, muted);

  const px = L.sx0 + (L.sx1 - L.sx0) * prog;
  if (p.scrubber === "bar") {
    o += `<rect x="${L.sx0}" y="${L.sy - 2}" width="${L.sx1 - L.sx0}" height="4" rx="2" fill="${track}"/>`;
    if (prog > 0) o += `<rect x="${L.sx0}" y="${L.sy - 2}" width="${f1(px - L.sx0)}" height="4" rx="2" fill="${acc}"/>`;
    o += `<circle cx="${f1(px)}" cy="${L.sy}" r="8" fill="${acc}" stroke="${card}" stroke-width="3"/>`;
  } else {
    const N = Math.floor((L.sx1 - L.sx0) / 7), pitch = (L.sx1 - L.sx0) / N, bw = pitch * 0.54, ph = R() * 6;
    for (let i = 0; i < N; i++) {
      const cx = L.sx0 + pitch * (i + 0.5), env = Math.pow(Math.sin(Math.PI * (i + 0.5) / N), 0.3);
      const sec = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(i * 0.13 + ph)) * (0.65 + 0.35 * Math.sin(i * 0.037 + ph * 2));
      const v = 0.14 + 0.86 * env * sec * (0.55 + 0.45 * R());
      const h = Math.max(3, L.amp * 2 * v);
      o += `<rect x="${f1(cx - bw / 2)}" y="${f1(L.sy - h / 2)}" width="${f1(bw)}" height="${f1(h)}" rx="${f1(bw / 2)}" fill="${cx <= px ? acc : track}"/>`;
    }
    const hx0 = clamp(px, L.sx0 + 1, L.sx1 - 1);
    o += `<rect x="${f1(hx0 - 1)}" y="${L.sy - L.amp - 5}" width="2" height="${L.amp * 2 + 10}" rx="1" fill="${ink}"/>`;
  }
  o += `<text x="${L.sx0}" y="${L.timeY}" font-family="${MONO}" font-size="12" fill="${muted}">${fmt(el)}</text>`;
  o += `<text x="${L.sx1}" y="${L.timeY}" text-anchor="end" font-family="${MONO}" font-size="12" fill="${muted}">${rem > 0 ? "−" : ""}${fmt(rem)}</text>`;

  o += skip(L.prevX, L.py, L.isz, ink, false) + skip(L.nextX, L.py, L.isz, ink, true);
  o += `<circle cx="${playX}" cy="${L.py}" r="${L.pr}" fill="${acc}"/>`;
  const r = L.pr;
  if (p.playing) {
    const bw = r * 0.2, bh = r * 0.66;
    o += `<g fill="${onAcc}"><rect x="${f1(playX - bw * 1.5)}" y="${f1(L.py - bh / 2)}" width="${f1(bw)}" height="${f1(bh)}" rx="${f1(bw * 0.35)}"/><rect x="${f1(playX + bw * 0.5)}" y="${f1(L.py - bh / 2)}" width="${f1(bw)}" height="${f1(bh)}" rx="${f1(bw * 0.35)}"/></g>`;
  } else {
    const ox = playX + r * 0.06;
    o += `<path d="M${f1(ox - r * 0.26)} ${f1(L.py - r * 0.36)}L${f1(ox + r * 0.4)} ${L.py}L${f1(ox - r * 0.26)} ${f1(L.py + r * 0.36)}Z" fill="${onAcc}" stroke="${onAcc}" stroke-width="${f1(r * 0.1)}" stroke-linejoin="round"/>`;
  }
  if (full) o += icon("shuffle", 58, L.py, 20, muted) + icon("repeat", 382, L.py, 20, muted);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs>${o}</svg>`;
}
