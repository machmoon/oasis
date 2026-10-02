// Month calendar widget: parsed month title, seeded event dots, range selection, today ring and footer actions.
export const meta = {
  title: "Quiet Month Calendar",
  kind: "ui",
  description: "A polished month calendar card with a date range, today marker and seeded event dots, for dashboards, booking flows and app mockups.",
  tags: ["calendar", "date picker", "ui", "widget", "range", "schedule", "dashboard", "booking"],
  price: 4,
  author: "oasis-factory",
  size: [480, 550],
};

export const params = {
  knobs: {
    accent: { type: "color", role: "primary", label: "Accent", default: "#5B5BD6" },
    eventColor: { type: "color", role: "highlight", label: "Event dots", default: "#F2994A" },
    month: { type: "text", label: "Month title", default: "September 2025" },
    theme: { type: "choice", label: "Theme", default: "light", options: ["light", "dark"] },
    weekStart: { type: "choice", label: "Week starts on", default: "Monday", options: ["Monday", "Sunday"] },
    rangeStart: { type: "range", label: "Range start day", default: 16, min: 1, max: 31, step: 1 },
    rangeLength: { type: "range", label: "Range length (days)", default: 7, min: 1, max: 21, step: 1 },
    today: { type: "range", label: "Today", default: 9, min: 1, max: 31, step: 1 },
    radius: { type: "range", label: "Corner radius", default: 22, min: 0, max: 28, step: 1 },
    seed: { type: "range", label: "Events seed", default: 7, min: 1, max: 200, step: 1 },
  },
  presets: {
    Indigo: { accent: "#5B5BD6", eventColor: "#F2994A" },
    Coral: { accent: "#E8574A", eventColor: "#2BA59B" },
    Forest: { accent: "#2F7A5B", eventColor: "#D9A441" },
    Graphite: { accent: "#2A2D34", eventColor: "#8C93A1" },
  },
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const FONT = "-apple-system, 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif";

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function dow(y, m, d) {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  if (m < 3) y -= 1;
  return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m - 1] + d) % 7;
}

function daysIn(y, mi) {
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mi];
}

function onColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const l = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return l > 165 ? "#111318" : "#FFFFFF";
}

function bandPath(x1, y1, x2, y2, rl, rr) {
  const f = (v) => v.toFixed(1);
  return `M${f(x1 + rl)},${f(y1)} H${f(x2 - rr)} A${f(rr)},${f(rr)} 0 0 1 ${f(x2)},${f(y1 + rr)} V${f(y2 - rr)} A${f(rr)},${f(rr)} 0 0 1 ${f(x2 - rr)},${f(y2)} H${f(x1 + rl)} A${f(rl)},${f(rl)} 0 0 1 ${f(x1)},${f(y2 - rl)} V${f(y1 + rl)} A${f(rl)},${f(rl)} 0 0 1 ${f(x1 + rl)},${f(y1)} Z`;
}

export default function render(p) {
  const W = 480, H = 550;
  const dark = p.theme === "dark";
  const T = dark
    ? { canvas: "#0D0E12", card: "#17191F", text: "#F2F3F6", muted: "#6E7480", line: "#272A32", band: 0.24, shadow: "#000000", so: 0.55 }
    : { canvas: "#ECEEF3", card: "#FFFFFF", text: "#15171C", muted: "#8E939D", line: "#EBEDF1", band: 0.13, shadow: "#1B2140", so: 0.10 };
  const acc = p.accent, onAcc = onColor(acc);

  const txt = String(p.month == null ? "" : p.month).trim();
  const low = txt.toLowerCase();
  let mi = 8, yr = 2025;
  for (let i = 0; i < 12; i++) if (low.indexOf(MONTHS[i].slice(0, 3).toLowerCase()) >= 0) { mi = i; break; }
  const ym = txt.match(/(\d{4})/);
  if (ym) yr = Math.max(1600, +ym[1]);
  const label = txt || `${MONTHS[mi]} ${yr}`;
  const split = label.match(/^(.*?)\s+(\d{2,4})$/);
  const name = split ? split[1] : label, year = split ? split[2] : "";

  const dim = daysIn(yr, mi);
  const prevDim = daysIn(mi === 0 ? yr - 1 : yr, (mi + 11) % 12);
  const ws = p.weekStart === "Sunday" ? 0 : 1;
  const lead = (dow(yr, mi + 1, 1) - ws + 7) % 7;
  const s = Math.min(p.rangeStart, dim);
  const e = Math.min(s + p.rangeLength - 1, dim);
  const today = Math.min(p.today, dim);

  const cardX = 32, cardY = 32, cardW = W - 64, cardH = H - 64;
  const R = Math.max(0, p.radius);
  const cellR = Math.min(R * 0.68, 19);
  const pad = 28, gx = cardX + pad, gw = cardW - pad * 2, cw = gw / 7;
  const rowY0 = 162, rh = 47, mk = 38;
  const cx = (c) => gx + cw * c + cw / 2;
  const cy = (r) => rowY0 + rh * r;

  const r = rng(p.seed * 9973 + mi * 131 + yr);
  const events = [0];
  for (let d = 1; d <= dim; d++) {
    const a = r(), b = r();
    events.push(a < 0.32 ? 1 + Math.floor(b * 3) : 0);
  }
  const dotCols = [p.eventColor, acc, T.muted];

  let out = "";
  out += `<rect width="${W}" height="${H}" fill="${T.canvas}"/>`;
  out += `<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="${R}" fill="${T.card}" stroke="${T.line}" stroke-width="1" filter="url(#sh)"/>`;

  const est = name.length * 11 + (year ? year.length * 10.5 + 6 : 0);
  const fs = (20 * Math.min(1, (gw - 96) / Math.max(1, est))).toFixed(1);
  out += `<text x="${gx}" y="85" font-family="${FONT}" font-size="${fs}" font-weight="650" letter-spacing="-0.3" fill="${T.text}">${esc(name)}${year ? `<tspan dx="${(fs * 0.3).toFixed(1)}" fill="${T.muted}" font-weight="400">${esc(year)}</tspan>` : ""}</text>`;
  const bR = Math.min(cellR, 16);
  [[gx + gw - 56, -1], [gx + gw - 16, 1]].forEach(([bx, dir]) => {
    out += `<rect x="${bx - 16}" y="62" width="32" height="32" rx="${bR.toFixed(1)}" fill="none" stroke="${T.line}" stroke-width="1.2"/>`;
    out += `<path d="M${bx - 2.5 * dir},72 L${bx + 2.5 * dir},78 L${bx - 2.5 * dir},84" fill="none" stroke="${T.text}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`;
  });

  const WD = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  for (let c = 0; c < 7; c++) {
    out += `<text x="${cx(c).toFixed(1)}" y="130" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="600" letter-spacing="0.6" fill="${T.muted}">${WD[(c + ws) % 7].toUpperCase()}</text>`;
  }

  const cells = [];
  for (let i = 0; i < 42; i++) {
    let d, inM = true;
    if (i < lead) { d = prevDim - lead + i + 1; inM = false; }
    else { d = i - lead + 1; if (d > dim) { d -= dim; inM = false; } }
    cells.push({ d, inM, c: i % 7, row: Math.floor(i / 7) });
  }

  if (e > s) {
    for (let row = 0; row < 6; row++) {
      const sel = cells.filter((k) => k.row === row && k.inM && k.d >= s && k.d <= e);
      if (!sel.length) continue;
      const a = sel[0], b = sel[sel.length - 1];
      const lc = a.d !== s, rc = b.d !== e;
      const left = lc ? cx(a.c) - mk / 2 : cx(a.c);
      const right = rc ? cx(b.c) + mk / 2 : cx(b.c);
      const w = right - left;
      if (w < 1) continue;
      const rmax = Math.min(mk / 2, lc && rc ? w / 2 : w);
      const rl = lc ? Math.min(cellR, rmax) : 0, rr = rc ? Math.min(cellR, rmax) : 0;
      out += `<path d="${bandPath(left, cy(row) - mk / 2, right, cy(row) + mk / 2, rl, rr)}" fill="${acc}" fill-opacity="${T.band}"/>`;
    }
  }

  let rangeEvents = 0;
  for (const k of cells) {
    const x = cx(k.c), y = cy(k.row);
    if (!k.inM) {
      out += `<text x="${x.toFixed(1)}" y="${y + 4}" text-anchor="middle" font-family="${FONT}" font-size="14" fill="${T.muted}" fill-opacity="0.5">${k.d}</text>`;
      continue;
    }
    const isEnd = k.d === s || k.d === e;
    const isToday = k.d === today;
    if (k.d >= s && k.d <= e) rangeEvents += events[k.d];
    if (isEnd) {
      out += `<rect x="${(x - mk / 2).toFixed(1)}" y="${y - mk / 2}" width="${mk}" height="${mk}" rx="${cellR.toFixed(1)}" fill="${acc}"/>`;
      if (isToday) out += `<rect x="${(x - mk / 2 - 3.5).toFixed(1)}" y="${y - mk / 2 - 3.5}" width="${mk + 7}" height="${mk + 7}" rx="${(cellR + 3.5 * (cellR / 19)).toFixed(1)}" fill="none" stroke="${acc}" stroke-opacity="0.45" stroke-width="1.5"/>`;
    } else if (isToday) {
      out += `<rect x="${(x - mk / 2 + 0.75).toFixed(1)}" y="${y - mk / 2 + 0.75}" width="${mk - 1.5}" height="${mk - 1.5}" rx="${Math.max(0, cellR - 0.75).toFixed(1)}" fill="none" stroke="${acc}" stroke-width="1.5"/>`;
    }
    const fill = isEnd ? onAcc : isToday ? acc : T.text;
    const weight = isEnd || isToday ? 650 : 450;
    out += `<text x="${x.toFixed(1)}" y="${y + 4}" text-anchor="middle" font-family="${FONT}" font-size="14" font-weight="${weight}" fill="${fill}">${k.d}</text>`;
    const n = events[k.d];
    for (let j = 0; j < n; j++) {
      const dx = x + (j - (n - 1) / 2) * 5.5;
      out += `<circle cx="${dx.toFixed(1)}" cy="${y + 12}" r="1.9" fill="${isEnd ? onAcc : dotCols[j]}" fill-opacity="${isEnd ? 0.85 : 1}"/>`;
    }
  }

  const divY = cy(5) + rh / 2 + 22;
  out += `<line x1="${gx}" y1="${divY}" x2="${gx + gw}" y2="${divY}" stroke="${T.line}" stroke-width="1"/>`;
  const fy = (divY + cardY + cardH) / 2;
  const mon = MONTHS[mi].slice(0, 3);
  const days = e - s + 1;
  const rangeLabel = days === 1 ? `${mon} ${s}` : `${s} \u2013 ${e} ${mon}`;
  const sub = `${days} ${days === 1 ? "day" : "days"} \u00B7 ${rangeEvents} ${rangeEvents === 1 ? "event" : "events"}`;
  out += `<text x="${gx}" y="${fy - 3}" font-family="${FONT}" font-size="15" font-weight="650" fill="${T.text}">${esc(rangeLabel)}</text>`;
  out += `<text x="${gx}" y="${fy + 15}" font-family="${FONT}" font-size="12" fill="${T.muted}">${sub}</text>`;
  const bw = 92, bh = 38, bx = gx + gw - bw;
  out += `<rect x="${bx}" y="${fy - bh / 2}" width="${bw}" height="${bh}" rx="${Math.min(cellR, bh / 2).toFixed(1)}" fill="${acc}"/>`;
  out += `<text x="${bx + bw / 2}" y="${fy + 5}" text-anchor="middle" font-family="${FONT}" font-size="14" font-weight="600" fill="${onAcc}">Apply</text>`;
  out += `<text x="${bx - 18}" y="${fy + 5}" text-anchor="end" font-family="${FONT}" font-size="14" font-weight="500" fill="${T.muted}">Clear</text>`;

  const defs = `<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="${T.shadow}" flood-opacity="${T.so}"/></filter></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}${out}</svg>`;
}
