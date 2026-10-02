// Kanban task card: cover art, tags, priority, checklist progress, assignees and due date, with brand-safe derived surfaces.
export const meta = {
  title: "Kanban Task Card",
  kind: "ui",
  description: "A polished kanban task card with tags, priority, checklist progress, assignee avatars and due date, for product mockups, board UIs and pitch decks.",
  tags: ["kanban", "task card", "project management", "board", "ui kit", "dashboard", "productivity", "card"],
  price: 5,
  author: "oasis-factory",
  size: [480, 600],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Board background", default: "#EEF0F4" },
    primary: { type: "color", role: "primary", label: "Accent", default: "#5B5BD6" },
    tagA: { type: "color", role: "secondary", label: "Tag colour 1", default: "#0EA5A4" },
    tagB: { type: "color", role: "highlight", label: "Tag colour 2", default: "#E1567C" },
    column: { type: "choice", label: "Column header", default: "In Progress", options: ["none", "To Do", "In Progress", "Review", "Done"] },
    priority: { type: "range", label: "Priority (0 none – 4 urgent)", default: 3, min: 0, max: 4, step: 1 },
    avatars: { type: "range", label: "Assignees", default: 3, min: 0, max: 6, step: 1 },
    checklist: { type: "range", label: "Checklist done (of 8)", default: 5, min: 0, max: 8, step: 1 },
    comments: { type: "range", label: "Comments", default: 4, min: 0, max: 24, step: 1 },
    cover: { type: "toggle", label: "Cover image", default: true },
  },
  presets: {
    Meadow: { background: "#EAF1E8", primary: "#2F7D5B", tagA: "#C77D1A", tagB: "#3A7BD5" },
    Sunset: { background: "#FBF0E8", primary: "#E2613A", tagA: "#8B5CF6", tagB: "#0F8B8D" },
    Midnight: { background: "#14161F", primary: "#8B7CF6", tagA: "#2BC4A9", tagB: "#F2994A" },
    Lagoon: { background: "#E3F1F4", primary: "#22C3E6", tagA: "#D9480F", tagB: "#7048E8" },
  },
};

const F = "Helvetica Neue, Helvetica, Arial, sans-serif";
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (a) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (h) => { const [r, g, b] = rgb(h).map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const ensure = (c, bg, ratio) => { const to = lum(bg) > 0.4 ? "#000000" : "#FFFFFF"; for (let t = 0; t <= 1.001; t += 0.04) { const m = mix(c, to, t); if (contrast(m, bg) >= ratio) return m; } return to; };
function toHsl(h) {
  const [r, g, b] = rgb(h).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hh / 6, s, l];
}
function fromHsl(h, s, l) {
  if (s === 0) return hex([l * 255, l * 255, l * 255]);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 0.5) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  return hex([f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => v * 255));
}
const fitLum = (h, s, target) => {
  let lo = 0, hi = 1;
  for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (lum(fromHsl(h, s, m)) < target) lo = m; else hi = m; }
  return fromHsl(h, s, (lo + hi) / 2);
};
const onFill = (c) => (contrast("#FFFFFF", c) >= contrast("#14161C", c) ? "#FFFFFF" : "#14161C");
const tw = (s, size) => s.length * size * 0.56;
const txt = (x, y, s, size, fill, weight = 400, anchor = "start") =>
  `<text x="${x}" y="${y}" font-family="${F}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${s}</text>`;

const PRIO_TOK = ["", "#64748B", "#C98A0B", "#E8621F", "#E5484D"];
const PRIO_LBL = ["", "Low", "Medium", "High", "Urgent"];
const PEOPLE = ["AK", "MJ", "SL", "RT", "DN", "PO"];
const COL_COUNT = { "To Do": 8, "In Progress": 3, Review: 2, Done: 14 };

export default function render(p) {
  const W = 480, H = 600, X = 40, CW = 400, R = 14, IX = X + 22, IR = X + CW - 22;
  const dark = lum(p.background) < 0.2;
  const [bh, bs] = toHsl(p.background);
  let canvas = dark
    ? (lum(p.background) <= 0.03 ? p.background : fromHsl(bh, Math.min(bs, 0.3), 0.09))
    : (lum(p.background) >= 0.5 ? p.background : fromHsl(bh, Math.min(bs, 0.35), 0.93));
  if (!dark) { let i = 0; while (lum(canvas) > 0.84 && i++ < 30) canvas = mix(canvas, "#000000", 0.02); }
  let card = dark ? mix(canvas, "#FFFFFF", 0.06) : mix(canvas, "#FFFFFF", 0.8);
  if (dark) { let t = 0.06; while (contrast(card, canvas) < 1.25 && t < 0.3) { t += 0.02; card = mix(canvas, "#FFFFFF", t); } }
  const ink = ensure(dark ? fromHsl(bh, Math.min(bs, 0.15), 0.93) : fromHsl(bh, Math.min(bs, 0.25), 0.13), card, 7);
  const muted = ensure(mix(ink, card, 0.45), card, 4.6);
  const line = mix(ink, card, dark ? 0.84 : 0.89);
  const track = mix(ink, card, dark ? 0.87 : 0.93);
  const accent = ensure(p.primary, card, 3);
  const inkC = ensure(ink, canvas, 7), mutedC = ensure(mix(ink, canvas, 0.45), canvas, 4.6), lineC = mix(ink, canvas, dark ? 0.78 : 0.8);
  const [ph, ps] = toHsl(p.primary);
  const cs = ps < 0.06 ? ps : Math.max(0.35, Math.min(0.72, ps));
  const tone = (t) => fitLum(ph, cs, t);

  const hasHeader = p.column !== "none" && COL_COUNT[p.column] !== undefined;
  const headerH = hasHeader ? 54 : 0, coverH = p.cover ? 132 : 0, bodyH = 250, addH = hasHeader ? 58 : 0;
  let y = Math.round((H - (headerH + coverH + bodyH + addH)) / 2);
  let out = "";

  if (hasHeader) {
    const hy = y + 22, name = p.column, cnt = String(COL_COUNT[name]);
    out += `<circle cx="${X + 6}" cy="${hy - 5}" r="4.5" fill="${ensure(p.primary, canvas, 3)}"/>`;
    out += txt(X + 20, hy, name, 15, inkC, 700);
    const px = X + 20 + tw(name, 15) + 12, pw = 14 + cnt.length * 7;
    out += `<rect x="${px}" y="${hy - 15}" width="${pw}" height="20" rx="10" fill="${mix(ink, canvas, dark ? 0.82 : 0.86)}"/>` + txt(px + pw / 2, hy - 1, cnt, 12, inkC, 600, "middle");
    out += `<g stroke="${mutedC}" stroke-width="1.8" stroke-linecap="round"><path d="M${X + CW - 46} ${hy - 5}h12M${X + CW - 40} ${hy - 11}v12"/></g>`;
    for (let i = 0; i < 3; i++) out += `<circle cx="${X + CW - 14 + i * 6}" cy="${hy - 5}" r="1.8" fill="${mutedC}"/>`;
    y += headerH;
  }

  const cy = y, cardH = coverH + bodyH;
  out += `<rect x="${X}" y="${cy}" width="${CW}" height="${cardH}" rx="${R}" fill="${card}" filter="url(#sh)"/>`;

  if (p.cover) {
    const T = dark
      ? { b0: 0.05, b1: 0.022, ci: 0.09, sf: 0.15, sm: 0.34, mf: 0.42, mm: 0.06, mb: 0.03 }
      : { b0: 0.8, b1: 0.6, ci: 0.46, sf: 0.92, sm: 0.45, mf: 0.11, mm: 0.55, mb: 0.95 };
    const clip = `M${X} ${cy + coverH} V${cy + R} A${R} ${R} 0 0 1 ${X + R} ${cy} H${X + CW - R} A${R} ${R} 0 0 1 ${X + CW} ${cy + R} V${cy + coverH} Z`;
    let art = `<rect x="${X}" y="${cy}" width="${CW}" height="${coverH}" fill="url(#cv)"/>`;
    art += `<circle cx="${X + CW - 62}" cy="${cy + 34}" r="58" fill="${tone(T.ci)}" opacity="0.6"/><circle cx="${X + 50}" cy="${cy + coverH + 6}" r="54" fill="${tone(T.ci)}" opacity="0.45"/>`;
    const phone = (px, py, rot, main) => {
      const f = tone(main ? T.mf : T.sf), ln = tone(main ? T.mm : T.sm);
      const bt = main ? tone(T.mb) : ln, bw = main ? 38 : 26;
      return `<g transform="rotate(${rot} ${px + 31} ${py + 60})"><rect x="${px}" y="${py}" width="62" height="124" rx="11" fill="${f}" filter="url(#ph)"/>` +
        `<rect x="${px + 22}" y="${py + 7}" width="18" height="4" rx="2" fill="${ln}"/>` +
        `<circle cx="${px + 31}" cy="${py + 36}" r="11" fill="${ln}"/>` +
        `<rect x="${px + 12}" y="${py + 56}" width="38" height="5" rx="2.5" fill="${ln}"/><rect x="${px + 17}" y="${py + 66}" width="28" height="4" rx="2" fill="${ln}" opacity="0.7"/>` +
        `<rect x="${px + 31 - bw / 2}" y="${py + 82}" width="${bw}" height="12" rx="6" fill="${bt}"/></g>`;
    };
    art += phone(X + 120, cy + 30, -8, false) + phone(X + 218, cy + 30, 8, false) + phone(X + 169, cy + 18, 0, true);
    out += `<defs><clipPath id="cc"><path d="${clip}"/></clipPath><linearGradient id="cv" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${tone(T.b0)}"/><stop offset="1" stop-color="${tone(T.b1)}"/></linearGradient></defs>`;
    out += `<g clip-path="url(#cc)">${art}</g><path d="M${X} ${cy + coverH}H${X + CW}" stroke="${line}"/>`;
  }
  out += `<rect x="${X + 0.5}" y="${cy + 0.5}" width="${CW - 1}" height="${cardH - 1}" rx="${R - 0.5}" fill="none" stroke="${line}"/>`;

  const by = cy + coverH + 20;
  let tx = IX;
  [["Design", p.tagA], ["Research", p.tagB]].forEach(([label, c]) => {
    const chip = mix(c, card, dark ? 0.76 : 0.84), w = Math.round(tw(label, 12) + 22);
    out += `<rect x="${tx}" y="${by}" width="${w}" height="24" rx="7" fill="${chip}"/>` + txt(tx + w / 2, by + 16, label, 12, ensure(c, chip, 4.6), 600, "middle");
    tx += w + 8;
  });

  const lvl = Math.max(0, Math.min(4, Math.round(p.priority)));
  if (lvl) {
    const tok = PRIO_TOK[lvl], chip = mix(tok, card, dark ? 0.78 : 0.87), fg = ensure(tok, chip, 4.6), lbl = PRIO_LBL[lvl];
    const w = Math.round(tw(lbl, 12) + 40), x0 = IR - w;
    out += `<rect x="${x0}" y="${by}" width="${w}" height="24" rx="12" fill="${chip}"/>`;
    if (lvl === 4) out += `<rect x="${x0 + 13}" y="${by + 6.5}" width="2.6" height="7" rx="1.3" fill="${fg}"/><circle cx="${x0 + 14.3}" cy="${by + 16.8}" r="1.5" fill="${fg}"/>`;
    else for (let i = 0; i < 3; i++) out += `<rect x="${x0 + 10 + i * 4.2}" y="${by + 17 - (4 + i * 3)}" width="2.6" height="${4 + i * 3}" rx="1.1" fill="${i < lvl ? fg : mix(fg, chip, 0.65)}"/>`;
    out += txt(x0 + 28, by + 16, lbl, 12, fg, 600);
  }

  out += txt(IX, by + 56, "Redesign onboarding flow", 19, ink, 700);
  out += txt(IX, by + 80, "Audit drop-off points across the signup funnel", 13.5, muted) + txt(IX, by + 98, "and ship the new welcome screens for mobile.", 13.5, muted);

  const done = Math.round(p.checklist), full = done === 8, ckc = full ? ensure("#2EA567", card, 3.2) : muted;
  out += `<g fill="none" stroke="${ckc}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="${IX}" y="${by + 117}" width="13" height="13" rx="3.5"/><path d="M${IX + 3.6} ${by + 123.6}l2.3 2.3 4-4.4"/></g>`;
  out += txt(IX + 20, by + 128, full ? "Checklist complete" : "Checklist", 12.5, muted, 600);
  out += txt(IR, by + 128, `${done}/8`, 12.5, full ? ckc : ink, 700, "end");
  out += `<rect x="${IX}" y="${by + 140}" width="${IR - IX}" height="6" rx="3" fill="${track}"/>`;
  if (done > 0) out += `<rect x="${IX}" y="${by + 140}" width="${Math.max(6, ((IR - IX) * done) / 8).toFixed(1)}" height="6" rx="3" fill="${full ? ckc : accent}"/>`;
  out += `<path d="M${IX} ${by + 166}H${IR}" stroke="${line}"/>`;

  const fy = by + 196, n = Math.round(p.avatars), AR = 15, AS = 24;
  if (n === 0) {
    out += `<circle cx="${IX + 14}" cy="${fy}" r="13" fill="none" stroke="${muted}" stroke-width="1.4" stroke-dasharray="3 3"/><path d="M${IX + 9} ${fy}h10M${IX + 14} ${fy - 5}v10" stroke="${muted}" stroke-width="1.6" stroke-linecap="round"/>`;
    out += txt(IX + 36, fy + 4.5, "Unassigned", 12.5, muted, 500);
  } else {
    const shown = n > 4 ? 3 : n, Ls = dark ? [0.5, 0.11, 0.72, 0.3] : [0.1, 0.45, 0.045, 0.28];
    for (let i = 0; i < shown; i++) {
      const c = tone(Ls[i]), ax = IX + AR + i * AS;
      out += `<circle cx="${ax}" cy="${fy}" r="${AR}" fill="${c}" stroke="${card}" stroke-width="2.5"/>` + txt(ax, fy + 3.8, PEOPLE[i], 10.5, onFill(c), 700, "middle");
    }
    if (n > 4) {
      const ax = IX + AR + 3 * AS;
      out += `<circle cx="${ax}" cy="${fy}" r="${AR}" fill="${track}" stroke="${card}" stroke-width="2.5"/>` + txt(ax, fy + 3.8, `+${n - 3}`, 10.5, ink, 700, "middle");
    }
  }

  const dw = 82, dx = IR - dw, dueBg = mix(ink, card, dark ? 0.86 : 0.93), dueFg = ensure(muted, dueBg, 4.6);
  out += `<rect x="${dx}" y="${fy - 13}" width="${dw}" height="26" rx="8" fill="${dueBg}"/>`;
  out += `<g fill="none" stroke="${dueFg}" stroke-width="1.5" stroke-linecap="round"><rect x="${dx + 11}" y="${fy - 5}" width="12" height="11" rx="2.5"/><path d="M${dx + 11} ${fy - 1}h12M${dx + 14.5} ${fy - 7.5}v3M${dx + 19.5} ${fy - 7.5}v3"/></g>`;
  out += txt(dx + 30, fy + 4.5, "Mar 14", 12.5, ink, 600);
  const nc = Math.round(p.comments);
  if (nc > 0) {
    const ns = String(nc), il = dx - 14 - tw(ns, 12.5) - 6 - 16, mx = il + 2.5;
    out += `<path d="M${mx} ${fy - 6}h11a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5h-6l-3.5 3v-3h-1.5a2.5 2.5 0 0 1-2.5-2.5v-6a2.5 2.5 0 0 1 2.5-2.5z" fill="none" stroke="${muted}" stroke-width="1.5" stroke-linejoin="round"/>`;
    out += txt(il + 22, fy + 4.5, ns, 12.5, muted, 600);
  }

  if (hasHeader) {
    const ay = cy + cardH + 14;
    out += `<rect x="${X + 0.75}" y="${ay + 0.75}" width="${CW - 1.5}" height="42.5" rx="12" fill="none" stroke="${lineC}" stroke-width="1.5" stroke-dasharray="5 5"/>`;
    out += `<path d="M${W / 2 - 40} ${ay + 22}h10M${W / 2 - 35} ${ay + 17}v10" stroke="${mutedC}" stroke-width="1.6" stroke-linecap="round"/>` + txt(W / 2 - 22, ay + 26.5, "Add card", 13.5, mutedC, 600);
  }

  const defs = `<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#0B1020" flood-opacity="${dark ? 0.5 : 0.06}"/><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#0B1020" flood-opacity="${dark ? 0.45 : 0.09}"/></filter>` +
    `<filter id="ph" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#0B1020" flood-opacity="${dark ? 0.35 : 0.14}"/></filter></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}<rect width="${W}" height="${H}" fill="${canvas}"/>${out}</svg>`;
}
