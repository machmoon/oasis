// Messaging conversation mockup: a phone chat screen with balanced, grouped bubbles, tails, contact card, read receipt and typing indicator.
export const meta = {
  title: "Conversation Thread",
  kind: "ui",
  description: "A polished messaging screen with 4-6 alternating chat bubbles, for app mockups, landing pages and pitch decks.",
  tags: ["chat", "messaging", "bubbles", "mockup", "mobile", "conversation", "app ui", "imessage"],
  price: 4,
  author: "oasis-factory",
  size: [420, 800],
};

export const params = {
  knobs: {
    sent: { type: "color", label: "Sent bubble", default: "#2F6BFF" },
    received: { type: "color", label: "Received bubble", default: "#E9EBEF" },
    background: { type: "color", label: "Background", default: "#FFFFFF" },
    message: { type: "text", label: "First message", default: "Are we still on for Friday?" },
    firstFrom: { type: "choice", label: "First message from", default: "them", options: ["them", "me"] },
    count: { type: "range", label: "Messages", default: 5, min: 4, max: 6, step: 1 },
    radius: { type: "range", label: "Bubble radius", default: 18, min: 4, max: 24, step: 1 },
    textSize: { type: "range", label: "Text size", default: 15, min: 13, max: 18, step: 1 },
    tail: { type: "toggle", label: "Bubble tails", default: true },
    typing: { type: "toggle", label: "Typing indicator", default: true },
  },
  presets: {
    Classic: { sent: "#2F6BFF", received: "#E9EBEF", background: "#FFFFFF" },
    Midnight: { sent: "#7C5CFF", received: "#25262F", background: "#121318" },
    Mint: { sent: "#1F8A65", received: "#E3EEE8", background: "#F7FAF8" },
    Sunset: { sent: "#FF6A3D", received: "#F3E8E0", background: "#FFFBF7" },
  },
};

const W = 420, H = 800, M = 18;
const FONT = "-apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const f = (n) => +n.toFixed(1);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
function lum(c) {
  const [r, g, b] = hex(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function cw(ch) {
  if (ch === " ") return 0.28;
  if ("il.,'!|:;".includes(ch)) return 0.25;
  if ("fjtrI-()".includes(ch)) return 0.34;
  if ("mwMW".includes(ch)) return 0.82;
  if (ch === "—") return 0.95;
  if (/[A-Z]/.test(ch)) return 0.66;
  return 0.53;
}
function tw(s, fs) { let w = 0; for (const c of s) w += cw(c); return w * fs; }
function wrap(s, fs, max) {
  const words = [];
  for (const w of s.split(/\s+/).filter(Boolean)) {
    if (tw(w, fs) <= max) { words.push(w); continue; }
    let chunk = "";
    for (const c of w) { if (chunk && tw(chunk + c, fs) > max) { words.push(chunk); chunk = c; } else chunk += c; }
    if (chunk) words.push(chunk);
  }
  const lines = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (tw(t, fs) <= max || !cur) cur = t; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [" "];
}
function balanced(s, fs, max) {
  const base = wrap(s, fs, max);
  if (base.length < 2) return base;
  let lo = max * 0.45, hi = max;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (wrap(s, fs, mid).length <= base.length) hi = mid; else lo = mid;
  }
  return wrap(s, fs, hi);
}

function rrect(x, y, w, h, rad) {
  const m = Math.min(w, h) / 2;
  const [a, b, c, d] = rad.map((v) => f(Math.min(v, m)));
  return `M${f(x + a)},${f(y)}H${f(x + w - b)}A${b},${b} 0 0 1 ${f(x + w)},${f(y + b)}V${f(y + h - c)}A${c},${c} 0 0 1 ${f(x + w - c)},${f(y + h)}H${f(x + d)}A${d},${d} 0 0 1 ${f(x)},${f(y + h - d)}V${f(y + a)}A${a},${a} 0 0 1 ${f(x + a)},${f(y)}Z`;
}

function tail(me, x, y, w, h, s) {
  const B = y + h, E = me ? x + w : x, k = me ? 1 : -1;
  return `M${f(E)},${f(B - 16 * s)}C${f(E)},${f(B - 6 * s)} ${f(E + k * 3 * s)},${f(B - 1.2 * s)} ${f(E + k * 7 * s)},${f(B)}` +
    `C${f(E + k * s)},${f(B + 0.6 * s)} ${f(E - k * 3 * s)},${f(B - 0.4 * s)} ${f(E - k * 7 * s)},${f(B - 2.5 * s)}Z`;
}

export default function render(p) {
  const fs = p.textSize, s = fs / 15, lh = fs * 1.32, padX = fs * 0.85, padY = fs * 0.58, r = p.radius;
  const dark = lum(p.background) < 0.35;
  const ink = dark ? "#F2F3F5" : "#101318";
  const muted = mix(p.background, ink, 0.48), hair = mix(p.background, ink, 0.1), field = mix(p.background, ink, 0.045);
  const sentInk = lum(p.sent) > 0.55 ? "#101318" : "#FFFFFF";
  const recvInk = lum(p.received) > 0.4 ? "#101318" : "#F2F3F5";
  const first = p.firstFrom === "me" ? "me" : "them", other = first === "me" ? "them" : "me";
  const msg = String(p.message || "").slice(0, 160).trim() || "Hey!";
  const script = [msg, "Yes! 7:30 at the usual place?", "Perfect. I'll grab a table by the window.",
    "Bring the new sketches — I want to see them.", "Deal. Printing them now", "See you there!"];

  const items = [];
  const n = Math.max(4, Math.min(6, Math.round(p.count)));
  for (let i = 0; i < n; i++) {
    const lines = balanced(script[i], fs, W * 0.7 - 2 * padX);
    const w = Math.max(...lines.map((l) => tw(l, fs))) + 2 * padX;
    items.push({ side: i % 2 ? other : first, lines, w: Math.max(w, fs * 2.6), h: 2 * padY + lines.length * lh });
  }
  if (p.typing) items.push({ side: "them", typing: true, w: fs * 4.4, h: 2 * padY + lh });
  let lastMe = -1;
  items.forEach((it, i) => { if (it.side === "me" && !it.typing) lastMe = i; });

  const gap = (a, b) => (!b ? 0 : b.typing ? 10 * s : a.side === b.side ? 4 * s : 12 * s);
  let total = 34;
  items.forEach((it, i) => { total += it.h + gap(it, items[i + 1]) + (i === lastMe ? 18 * s : 0); });
  const composerTop = H - 76, headTop = 117, cardH = 176;
  let y = composerTop - 16 - total;
  const showCard = y - headTop > cardH + 24;
  const tint = mix(p.background, p.sent, dark ? 0.26 : 0.16);

  let body = "";
  if (showCard) {
    const t = y - cardH, cx = W / 2;
    body += `<circle cx="${cx}" cy="${f(t + 36)}" r="34" fill="url(#av)"/>` +
      `<text x="${cx}" y="${f(t + 44.5)}" text-anchor="middle" font-size="23" font-weight="700" fill="${p.sent}" letter-spacing="0.5">MC</text>` +
      `<text x="${cx}" y="${f(t + 97)}" text-anchor="middle" font-size="17" font-weight="600" fill="${ink}" letter-spacing="-0.2">Maya Chen</text>` +
      `<text x="${cx}" y="${f(t + 117)}" text-anchor="middle" font-size="12.5" fill="${muted}">Studio North · Lisbon</text>` +
      `<rect x="${cx - 52}" y="${f(t + 132)}" width="104" height="26" rx="13" fill="${field}" stroke="${hair}"/>` +
      `<text x="${cx}" y="${f(t + 149.2)}" text-anchor="middle" font-size="12" font-weight="600" fill="${p.sent}">View profile</text>`;
  }
  body += `<text x="${W / 2}" y="${f(y + 12)}" text-anchor="middle" font-size="11.5" fill="${muted}"><tspan font-weight="600">Today</tspan> 9:41</text>`;
  y += 34;
  items.forEach((it, i) => {
    const prev = items[i - 1], next = items[i + 1], me = it.side === "me";
    const joinTop = prev && prev.side === it.side && !it.typing;
    const joinBot = next && next.side === it.side && !next.typing;
    const hasTail = p.tail && !joinBot;
    const small = Math.min(r, 5 * s), tailR = Math.min(r, 8 * s);
    const bot = joinBot ? small : hasTail ? tailR : r, top = joinTop ? small : r;
    const x = me ? W - M - it.w : M;
    const fill = me ? p.sent : p.received, txt = me ? sentInk : recvInk;
    const rad = me ? [r, top, bot, r] : [top, r, r, bot];
    body += `<path d="${rrect(x, y, it.w, it.h, rad)}" fill="${fill}"/>`;
    if (hasTail) body += `<path d="${tail(me, x, y, it.w, it.h, s)}" fill="${fill}"/>`;
    if (it.typing) {
      [0.35, 0.55, 0.8].forEach((o, k) => {
        body += `<circle cx="${f(x + it.w / 2 + (k - 1) * fs * 0.66)}" cy="${f(y + it.h / 2)}" r="${f(fs * 0.24)}" fill="${txt}" opacity="${o}"/>`;
      });
    } else {
      const spans = it.lines.map((l, k) => `<tspan x="${f(x + padX)}" y="${f(y + padY + k * lh + lh / 2 + fs * 0.35)}">${esc(l)}</tspan>`).join("");
      body += `<text font-size="${fs}" fill="${txt}" letter-spacing="-0.1">${spans}</text>`;
    }
    y += it.h;
    if (i === lastMe) {
      const label = i === items.length - 1 ? "Delivered" : "Read 9:42";
      body += `<text x="${W - M}" y="${f(y + 13 * s)}" text-anchor="end" font-size="11" fill="${muted}">${label}</text>`;
      y += 18 * s;
    }
    y += gap(it, next);
  });

  const bars = [4, 6, 8, 10].map((h, i) => `<rect x="${W - 96 + i * 5}" y="${31 - h}" width="3" height="${h}" rx="1" fill="${ink}"/>`).join("");
  const status = `<text x="30" y="30" font-size="15" font-weight="600" fill="${ink}">9:41</text>${bars}` +
    `<rect x="${W - 54.5}" y="19.5" width="24" height="12" rx="3.5" fill="none" stroke="${ink}" stroke-opacity="0.4"/>` +
    `<rect x="${W - 52.5}" y="21.5" width="17" height="8" rx="2" fill="${ink}"/><rect x="${W - 29.5}" y="23.5" width="2" height="4" rx="1" fill="${ink}" opacity="0.4"/>`;

  const header = `<rect y="0" width="${W}" height="${headTop}" fill="${p.background}"/>${status}` +
    `<path d="M29,70 L20,80 L29,90" fill="none" stroke="${p.sent}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="62" cy="80" r="19" fill="${tint}"/>` +
    `<text x="62" y="85" text-anchor="middle" font-size="13.5" font-weight="700" fill="${p.sent}" letter-spacing="0.3">MC</text>` +
    `<circle cx="76" cy="94" r="5" fill="#34C759" stroke="${p.background}" stroke-width="2.5"/>` +
    `<text x="92" y="77" font-size="16" font-weight="600" fill="${ink}" letter-spacing="-0.2">Maya Chen</text>` +
    `<text x="92" y="96" font-size="12" fill="${muted}">Active now</text>` +
    `<rect x="${W - 54}" y="73" width="18" height="14" rx="3.5" fill="none" stroke="${p.sent}" stroke-width="2"/>` +
    `<path d="M${W - 35},78 L${W - 27},73.5 V86.5 L${W - 35},82 Z" fill="none" stroke="${p.sent}" stroke-width="2" stroke-linejoin="round"/>` +
    `<rect y="${headTop - 0.5}" width="${W}" height="1" fill="${hair}"/>`;

  const composer = `<rect y="${composerTop}" width="${W}" height="${H - composerTop}" fill="${p.background}"/>` +
    `<rect y="${composerTop}" width="${W}" height="1" fill="${hair}"/>` +
    `<circle cx="36" cy="${H - 38}" r="16" fill="${field}" stroke="${hair}"/>` +
    `<path d="M36,${H - 44} V${H - 32} M30,${H - 38} H42" stroke="${muted}" stroke-width="2" stroke-linecap="round"/>` +
    `<rect x="60" y="${H - 58}" width="${W - 126}" height="40" rx="20" fill="${field}" stroke="${hair}"/>` +
    `<text x="76" y="${H - 33}" font-size="15" fill="${muted}">Message</text>` +
    `<circle cx="${W - 38}" cy="${H - 38}" r="18" fill="${p.sent}"/>` +
    `<path d="M${W - 38},${H - 30} V${H - 46} M${W - 44},${H - 40} L${W - 38},${H - 46} L${W - 32},${H - 40}" fill="none" stroke="${sentInk}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<rect x="${W / 2 - 60}" y="${H - 8}" width="120" height="4" rx="2" fill="${ink}" opacity="0.85"/>`;

  const defs = `<defs><clipPath id="cv"><rect x="0" y="${headTop}" width="${W}" height="${composerTop - headTop}"/></clipPath>` +
    `<linearGradient id="av" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(p.background, p.sent, dark ? 0.2 : 0.1)}"/><stop offset="1" stop-color="${mix(p.background, p.sent, dark ? 0.38 : 0.26)}"/></linearGradient>` +
    `<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.background}"/><stop offset="1" stop-color="${p.background}" stop-opacity="0"/></linearGradient></defs>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">${defs}` +
    `<rect width="${W}" height="${H}" fill="${p.background}"/>` +
    `<g clip-path="url(#cv)">${body}<rect y="${headTop}" width="${W}" height="26" fill="url(#fade)"/></g>${header}${composer}</svg>`;
}
