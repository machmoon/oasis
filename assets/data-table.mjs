// Dashboard data table: sortable headers, status pills, avatar cells, row selection with a bulk-action bar, and pagination.
export const meta = {
  title: "Ledger Table",
  kind: "ui",
  description: "A polished dashboard data table with sortable headers, status pills, avatars, row selection and pagination for product mockups and admin UI kits.",
  tags: ["table", "dashboard", "data grid", "admin", "saas", "pagination", "status", "ui kit"],
  price: 9,
  author: "oasis-factory",
  size: [960, 616],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Page", default: "#F4F2EE" },
    ink: { type: "color", role: "ink", label: "Text", default: "#1A1D24" },
    primary: { type: "color", role: "primary", label: "Accent", default: "#4F46E5" },
    statusMap: { type: "choice", label: "Status colours", default: "semantic", options: ["semantic", "brand", "mono"] },
    density: { type: "choice", label: "Density", default: "regular", options: ["compact", "regular", "comfy"] },
    rows: { type: "range", label: "Rows", default: 6, min: 3, max: 12, step: 1 },
    columns: { type: "range", label: "Columns", default: 5, min: 3, max: 6, step: 1 },
    selected: { type: "range", label: "Selected rows", default: 2, min: 0, max: 12, step: 1 },
    seed: { type: "range", label: "Data seed", default: 7, min: 1, max: 99, step: 1 },
    zebra: { type: "toggle", label: "Zebra stripes", default: true },
  },
  presets: {
    Studio: { background: "#F7F7F5", ink: "#111111", primary: "#111111" },
    Midnight: { background: "#0F1115", ink: "#E8EAF0", primary: "#7C9CFF" },
    Mint: { background: "#E6F2EC", ink: "#12312A", primary: "#0F9D74" },
    Ember: { background: "#FBF1E8", ink: "#2A1A14", primary: "#E0542E" },
  },
};

const F = "-apple-system, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const NAMES = ["Ava Thompson", "Liam Chen", "Sofia Rossi", "Noah Patel", "Maya Okafor", "Ethan Brooks", "Zoe Larsen", "Omar Haddad", "Lena Fischer", "Kai Nakamura", "Iris Moreau", "Jonah Reyes", "Priya Nair", "Felix Wagner", "Nora Lind", "Theo Alvarez"];
const DOMAINS = ["northwind.io", "acme.co", "lumen.app", "fable.studio", "orbit.dev", "kiln.co"];
const PLANS = [["Starter", 29], ["Pro", 99], ["Team", 249], ["Enterprise", 899]];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SEM = { Active: "#16A34A", Trial: "#2563EB", Paused: "#D97706", Churned: "#DC2626" };
const COLS = { customer: { l: "Customer", wt: 2.6 }, status: { l: "Status", wt: 1.3 }, plan: { l: "Plan", wt: 1.1 }, usage: { l: "Usage", wt: 1.5 }, joined: { l: "Joined", wt: 1.2 }, mrr: { l: "MRR", wt: 1.1, end: 1 } };
const PRI = ["customer", "status", "mrr", "plan", "joined", "usage"];
const DISP = ["customer", "status", "plan", "usage", "joined", "mrr"];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (h) => { const [r, g, b] = hx(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const con = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function ensure(fg, bg, min, toward) { let c = fg; for (let i = 0; i < 24 && con(c, bg) < min; i++) c = mix(c, toward, 0.15); return c; }
function hue(h) {
  const [r, g, b] = hx(h).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 0.04) return 222;
  const H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (H * 60 + 360) % 360;
}
function hsl(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}
const money = (n) => "$" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const T = (x, y, s, fill, txt, extra = "") => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${s}" fill="${fill}" ${extra}>${txt}</text>`;

export default function render(p) {
  const bg = p.background, dark = lum(bg) < 0.3, hi = dark ? "#ffffff" : "#000000";
  let card = dark ? mix(bg, "#ffffff", 0.06) : mix(bg, "#ffffff", 0.75);
  for (let i = 0; i < 40 && con(card, bg) < 1.08; i++) card = mix(card, dark ? "#ffffff" : "#000000", 0.02);
  const ink = con(p.ink, card) >= 4.5 ? p.ink : dark ? "#F4F4F5" : "#18181B";
  const muted = ensure(mix(ink, card, 0.45), card, 4.2, ink);
  const line = mix(card, ink, dark ? 0.12 : 0.09), strong = mix(card, ink, 0.3);
  const zebraC = mix(card, ink, dark ? 0.035 : 0.028), headC = mix(card, ink, dark ? 0.05 : 0.035);
  const prim = ensure(p.primary, card, 2.8, dark ? "#ffffff" : ink);
  const onPrim = con("#ffffff", prim) >= con("#111114", prim) ? "#ffffff" : "#111114";
  const selRow = mix(card, prim, dark ? 0.16 : 0.08), selBar = mix(card, prim, dark ? 0.2 : 0.11);
  const neutral = mix(card, ink, dark ? 0.1 : 0.06);

  function pillStyle(st) {
    if (p.statusMap === "semantic") {
      const b = dark ? mix(SEM[st], "#ffffff", 0.25) : SEM[st], f = mix(card, b, dark ? 0.2 : 0.12);
      return { f, t: ensure(mix(b, hi, 0.15), f, 4.5, hi), d: b, sh: "dot" };
    }
    if (p.statusMap === "brand") {
      if (st === "Active") return { f: prim, t: onPrim, d: onPrim, sh: "dot" };
      if (st === "Trial") { const f = mix(card, prim, dark ? 0.22 : 0.14); return { f, t: ensure(prim, f, 4.5, hi), d: prim, sh: "dot" }; }
      if (st === "Paused") return { f: neutral, t: ensure(muted, neutral, 4.5, ink), d: muted, sh: "ring" };
      return { f: card, s: strong, t: ensure(muted, card, 4.5, ink), d: muted, sh: "dash" };
    }
    return { f: neutral, t: ensure(ink, neutral, 4.5, hi), d: ink, sh: { Active: "dot", Trial: "half", Paused: "ring", Churned: "dash" }[st] };
  }
  function pill(x, cy, st) {
    const s = pillStyle(st), w = Math.round(st.length * 6.7 + 30), dx = x + 11;
    let dot;
    if (s.sh === "dot") dot = `<circle cx="${dx}" cy="${cy}" r="3" fill="${s.d}"/>`;
    else if (s.sh === "dash") dot = `<rect x="${dx - 3}" y="${cy - 0.9}" width="6" height="1.8" rx="0.9" fill="${s.d}"/>`;
    else dot = `<circle cx="${dx}" cy="${cy}" r="2.6" fill="none" stroke="${s.d}" stroke-width="1.3"/>` + (s.sh === "half" ? `<path d="M${dx} ${cy - 2.6}a2.6 2.6 0 0 1 0 5.2z" fill="${s.d}"/>` : "");
    return `<rect x="${x}" y="${cy - 11}" width="${w}" height="22" rx="11" fill="${s.f}"${s.s ? ` stroke="${s.s}"` : ""}/>${dot}${T(x + 20, cy + 4, 12, s.t, st, 'font-weight="600"')}`;
  }
  const cb = (x, y, s) => s
    ? `<rect x="${x}" y="${y}" width="16" height="16" rx="4.5" fill="${prim}"/>` + (s === 1
      ? `<path d="M${x + 4} ${y + 8.2}l2.7 2.6 5.1-5.4" fill="none" stroke="${onPrim}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<path d="M${x + 4.5} ${y + 8}h7" stroke="${onPrim}" stroke-width="1.8" stroke-linecap="round"/>`)
    : `<rect x="${x + 0.5}" y="${y + 0.5}" width="15" height="15" rx="4" fill="${card}" stroke="${strong}"/>`;

  const r = rng(p.seed * 9973 + 17);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const n = p.rows, sel = Math.min(p.selected, n), names = shuffle(NAMES.map((_, i) => i));
  const data = [];
  for (let i = 0; i < n; i++) {
    const nm = NAMES[names[i]], q = r(), pl = PLANS[Math.floor(r() * 4)];
    data.push({
      nm, ini: nm.split(" ").map((w) => w[0]).join(""), hk: names[i],
      em: nm.split(" ")[0].toLowerCase() + "@" + DOMAINS[Math.floor(r() * DOMAINS.length)],
      st: q < 0.5 ? "Active" : q < 0.7 ? "Trial" : q < 0.85 ? "Paused" : "Churned",
      plan: pl[0], amt: Math.round(pl[1] * (1 + r() * 3)),
      joined: `${MONTHS[Math.floor(r() * 12)]} ${1 + Math.floor(r() * 28)}, 202${3 + Math.floor(r() * 2)}`,
      use: 8 + Math.floor(r() * 90),
    });
  }
  data.sort((a, b) => b.amt - a.amt);
  const selSet = new Set(shuffle([...Array(n).keys()]).slice(0, sel));

  const W = 960, P = 40, cw = W - 2 * P, RH = { compact: 40, regular: 52, comfy: 64 }[p.density];
  const AV = { compact: 24, regular: 32, comfy: 36 }[p.density];
  const cardY = P + 64, tb = 60, hh = 40, ft = 60, cardH = tb + hh + n * RH + ft, H = cardY + cardH + P;
  const keys = DISP.filter((k) => PRI.slice(0, p.columns).includes(k));
  const tw = keys.reduce((s, k) => s + COLS[k].wt, 0), avail = cw - 64 - 24;
  let cx = P + 64;
  const cols = keys.map((k) => { const w = (COLS[k].wt / tw) * avail, c = { ...COLS[k], k, x: cx, w }; cx += w; return c; });

  let o = "";
  o += T(P, P + 24, 24, ink, "Customers", 'font-weight="700" letter-spacing="-0.4"');
  o += T(P, P + 46, 13, muted, "248 accounts · Synced 2 min ago");
  const w1 = 12 * 7.3 + 46, w2 = 6 * 7.3 + 46, bx1 = P + cw - w1, bx2 = bx1 - 10 - w2, by = P + 4;
  o += `<rect x="${bx2 + 0.5}" y="${by + 0.5}" width="${w2 - 1}" height="35" rx="9" fill="${card}" stroke="${line}"/><path d="M${bx2 + 22} ${by + 12}v10m-4-4 4 4 4-4M${bx2 + 16} ${by + 25}h12" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  o += T(bx2 + 34, by + 22.5, 13, ink, "Export", 'font-weight="600"');
  o += `<rect x="${bx1}" y="${by}" width="${w1}" height="36" rx="9" fill="${prim}"/><path d="M${bx1 + 22} ${by + 12}v12M${bx1 + 16} ${by + 18}h12" stroke="${onPrim}" stroke-width="1.8" stroke-linecap="round"/>`;
  o += T(bx1 + 34, by + 22.5, 13, onPrim, "Add customer", 'font-weight="600"');

  let c = `<rect x="${P}" y="${cardY}" width="${cw}" height="${cardH}" fill="${card}"/>`;
  if (sel > 0) {
    c += `<rect x="${P}" y="${cardY}" width="${cw}" height="${tb}" fill="${selBar}"/>${cb(P + 22, cardY + 22, sel === n ? 1 : 2)}`;
    const pt = ensure(prim, selBar, 4.5, hi), lbl = `${sel} selected`;
    c += T(P + 52, cardY + 34.5, 14, pt, lbl, 'font-weight="700"');
    let ax = P + 52 + lbl.length * 7.8 + 18;
    c += `<rect x="${ax}" y="${cardY + 20}" width="1" height="20" fill="${mix(selBar, ink, 0.2)}"/>`;
    ax += 18;
    for (const a of ["Export", "Assign owner", "Archive"]) { c += T(ax, cardY + 34.5, 13, ensure(ink, selBar, 4.5, hi), a, 'font-weight="500"'); ax += a.length * 7.2 + 22; }
    c += T(P + cw - 22, cardY + 34.5, 13, ensure(muted, selBar, 4.5, ink), "Clear selection", 'text-anchor="end" font-weight="500"');
  } else {
    const sx = P + 20, sy = cardY + 12, field = mix(card, ink, 0.03);
    c += `<rect x="${sx + 0.5}" y="${sy + 0.5}" width="259" height="35" rx="9" fill="${field}" stroke="${line}"/><circle cx="${sx + 19}" cy="${sy + 17}" r="5.5" fill="none" stroke="${muted}" stroke-width="1.6"/><path d="M${sx + 23} ${sy + 21}l4 4" stroke="${muted}" stroke-width="1.6" stroke-linecap="round"/>`;
    c += T(sx + 36, sy + 22.5, 13, ensure(muted, field, 4.2, ink), "Search customers…");
    const segs = ["All", "Active", "Trial", "Churned"], sw = segs.map((s) => s.length * 7 + 24), tot = sw.reduce((a, b) => a + b, 0) + 8;
    const track = mix(card, ink, 0.06), mt = ensure(muted, track, 4.5, ink);
    let gx = P + cw - 20 - tot;
    c += `<rect x="${gx}" y="${sy}" width="${tot}" height="36" rx="9" fill="${track}"/>`;
    gx += 4;
    segs.forEach((s, i) => {
      if (!i) c += `<rect x="${gx + 0.5}" y="${sy + 4.5}" width="${sw[i] - 1}" height="27" rx="6.5" fill="${card}" stroke="${line}"/>`;
      c += T(gx + sw[i] / 2, sy + 22.5, 13, i ? mt : ink, s, `text-anchor="middle" font-weight="${i ? 500 : 600}"`);
      gx += sw[i];
    });
  }
  const hy = cardY + tb;
  c += `<rect x="${P}" y="${hy}" width="${cw}" height="${hh}" fill="${headC}"/><rect x="${P}" y="${hy}" width="${cw}" height="1" fill="${line}"/><rect x="${P}" y="${hy + hh - 1}" width="${cw}" height="1" fill="${line}"/>`;
  c += cb(P + 22, hy + 12, sel === 0 ? 0 : sel === n ? 1 : 2);
  const hm = ensure(muted, headC, 4.2, ink);
  for (const col of cols) {
    const act = col.k === "mrr", lw = col.l.length * 8.3, hx0 = col.end ? col.x + col.w - lw : col.x, ty = hy + 24.5;
    c += T(col.end ? col.x + col.w : col.x, ty, 11, act ? ink : hm, col.l.toUpperCase(), `font-weight="${act ? 700 : 600}" letter-spacing="0.7"${col.end ? ' text-anchor="end"' : ""}`);
    const ax = col.end ? hx0 - 14 : hx0 + lw + 6, ay = hy + hh / 2;
    c += act
      ? `<path d="M${ax + 3} ${ay - 4.5}v8.5m-3-3 3 3 3-3" fill="none" stroke="${prim}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<path d="M${ax} ${ay - 1.5}l3-3 3 3M${ax} ${ay + 1.5}l3 3 3-3" fill="none" stroke="${strong}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const h0 = hue(prim);
  data.forEach((d, i) => {
    const y = hy + hh + i * RH, cy = y + RH / 2, isSel = selSet.has(i);
    const rowBg = isSel ? selRow : p.zebra && i % 2 ? zebraC : card;
    if (rowBg !== card) c += `<rect x="${P}" y="${y}" width="${cw}" height="${RH}" fill="${rowBg}"/>`;
    if (!p.zebra && i < n - 1) c += `<rect x="${P + 20}" y="${y + RH - 1}" width="${cw - 40}" height="1" fill="${line}"/>`;
    c += cb(P + 22, cy - 8, isSel ? 1 : 0);
    const mu = ensure(muted, rowBg, 4.2, ink);
    for (const col of cols) {
      if (col.k === "customer") {
        const hh2 = (h0 + d.hk * 47) % 360, ab = dark ? hsl(hh2, 32, 30) : hsl(hh2, 62, 90), af = dark ? hsl(hh2, 70, 84) : hsl(hh2, 48, 32);
        c += `<circle cx="${col.x + AV / 2}" cy="${cy}" r="${AV / 2}" fill="${ab}"/>` + T(col.x + AV / 2, cy + AV * 0.13, (AV * 0.36).toFixed(1), af, d.ini, 'text-anchor="middle" font-weight="700"');
        const tx = col.x + AV + 12;
        if (p.density === "compact") {
          const ex = tx + d.nm.length * 7.8 + 8;
          c += T(tx, cy + 4.5, 13.5, ink, d.nm, 'font-weight="600"');
          if (ex + d.em.length * 6.6 <= col.x + col.w - 12) c += T(ex, cy + 4.5, 12, mu, d.em);
        } else c += T(tx, cy - 3, 14, ink, d.nm, 'font-weight="600"') + T(tx, cy + 14, 12, mu, d.em);
      } else if (col.k === "status") c += pill(col.x, cy, d.st);
      else if (col.k === "plan") c += T(col.x, cy + 4.5, 13, ink, d.plan);
      else if (col.k === "joined") c += T(col.x, cy + 4.5, 13, mu, d.joined);
      else if (col.k === "mrr") c += T(col.x + col.w, cy + 4.5, 13.5, ink, money(d.amt), 'text-anchor="end" font-weight="600"');
      else {
        const bw = Math.max(40, Math.min(col.w - 56, 96));
        c += `<rect x="${col.x}" y="${cy - 3}" width="${bw}" height="6" rx="3" fill="${mix(rowBg, ink, 0.1)}"/><rect x="${col.x}" y="${cy - 3}" width="${((bw * d.use) / 100).toFixed(1)}" height="6" rx="3" fill="${prim}"/>`;
        c += T(col.x + bw + 10, cy + 4, 12, mu, d.use + "%");
      }
    }
  });
  const fy = hy + hh + n * RH, fc = fy + ft / 2;
  c += `<rect x="${P}" y="${fy}" width="${cw}" height="1" fill="${line}"/>`;
  c += T(P + 22, fc + 4.5, 13, muted, `Showing <tspan fill="${ink}" font-weight="600">1–${n}</tspan> of <tspan fill="${ink}" font-weight="600">248</tspan>`);
  const rx0 = P + 212;
  c += T(rx0, fc + 4.5, 13, muted, "Rows per page") + `<rect x="${rx0 + 100.5}" y="${fc - 13.5}" width="55" height="27" rx="7" fill="${card}" stroke="${line}"/>`;
  c += T(rx0 + 112, fc + 4.5, 13, ink, String(n), 'font-weight="600"') + `<path d="M${rx0 + 136} ${fc - 1.5}l3.5 3.5 3.5-3.5" fill="none" stroke="${muted}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  const items = ["prev", "1", "2", "3", "…", String(Math.ceil(248 / n)), "next"];
  let px = P + cw - 20 - items.length * 34 + 4;
  for (const it of items) {
    const bx = px, bcy = fc;
    if (it === "prev" || it === "next") {
      const dir = it === "prev" ? -1 : 1, mx = bx + 15;
      c += `<rect x="${bx + 0.5}" y="${bcy - 14.5}" width="29" height="29" rx="8" fill="${card}" stroke="${line}"/><path d="M${mx - dir * 2} ${bcy - 4.5}l${dir * 4.5} 4.5-${dir * 4.5} 4.5" fill="none" stroke="${it === "prev" ? strong : ink}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else {
      if (it === "1") c += `<rect x="${bx}" y="${bcy - 15}" width="30" height="30" rx="8" fill="${prim}"/>`;
      c += T(bx + 15, bcy + 4.5, 13, it === "1" ? onPrim : it === "…" ? muted : ink, it, `text-anchor="middle" font-weight="${it === "1" ? 700 : 500}"`);
    }
    px += 34;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><clipPath id="cc"><rect x="${P}" y="${cardY}" width="${cw}" height="${cardH}" rx="14"/></clipPath><filter id="sh" x="-5%" y="-5%" width="110%" height="125%"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="${dark ? 0.35 : 0.06}"/></filter></defs><rect width="${W}" height="${H}" fill="${bg}"/><g font-family="${F}"><rect x="${P}" y="${cardY}" width="${cw}" height="${cardH}" rx="14" fill="${card}" filter="url(#sh)"/>${o}<g clip-path="url(#cc)">${c}</g><rect x="${P + 0.5}" y="${cardY + 0.5}" width="${cw - 1}" height="${cardH - 1}" rx="13.5" fill="none" stroke="${line}"/></g></svg>`;
}
