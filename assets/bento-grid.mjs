// Bento grid landing section: 5-8 rounded tiles of varied spans with seeded mini-illustrations and matched copy.
export const meta = {
  title: "Bento Feature Grid",
  kind: "mockup",
  description: "A landing-page bento grid of rounded feature tiles with abstract charts, rings and dots, ready for hero sections, decks and pitch pages.",
  tags: ["bento", "grid", "landing page", "features", "dashboard", "cards", "saas"],
  price: 8,
  author: "oasis-factory",
  size: [1200, 800],
};

export const params = {
  knobs: {
    background: { type: "color", label: "Background", default: "#0C0D12" },
    tile: { type: "color", label: "Tile", default: "#17181F" },
    accent: { type: "color", label: "Accent", default: "#7C6CFF" },
    accent2: { type: "color", label: "Accent 2", default: "#3DD6C4" },
    finish: { type: "choice", label: "Tile finish", default: "tinted", options: ["flat", "tinted", "outline"] },
    tiles: { type: "range", label: "Tile count", default: 7, min: 5, max: 8, step: 1 },
    gap: { type: "range", label: "Gap", default: 16, min: 4, max: 40, step: 1 },
    radius: { type: "range", label: "Corner radius", default: 24, min: 0, max: 48, step: 1 },
    seed: { type: "range", label: "Seed", default: 7, min: 1, max: 200, step: 1 },
    headline: { type: "text", label: "Headline", default: "Built for how teams actually work" },
  },
  presets: {
    Midnight: { background: "#0C0D12", tile: "#17181F", accent: "#7C6CFF", accent2: "#3DD6C4" },
    Paper: { background: "#F2EEE8", tile: "#FFFFFF", accent: "#FF5A36", accent2: "#FFB199" },
    Mint: { background: "#E6EFE9", tile: "#FAFDFB", accent: "#1E7A55", accent2: "#8FD3B0" },
    Cobalt: { background: "#EDF0F7", tile: "#FFFFFF", accent: "#2B50FF", accent2: "#9FB4FF" },
  },
};

const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "Menlo, Consolas, monospace";
const LAYOUTS = {
  5: [[0, 0, 2, 2], [2, 0, 2, 1], [2, 1, 1, 1], [3, 1, 1, 2], [0, 2, 3, 1]],
  6: [[0, 0, 2, 2], [2, 0, 1, 1], [3, 0, 1, 1], [2, 1, 2, 1], [0, 2, 1, 1], [1, 2, 3, 1]],
  7: [[0, 0, 1, 2], [1, 0, 2, 1], [3, 0, 1, 1], [1, 1, 1, 1], [2, 1, 2, 2], [0, 2, 1, 1], [1, 2, 1, 1]],
  8: [[0, 0, 2, 1], [2, 0, 1, 1], [3, 0, 1, 2], [0, 1, 1, 2], [1, 1, 1, 1], [2, 1, 1, 1], [1, 2, 2, 1], [3, 2, 1, 1]],
};
const COPY = {
  rings: [["Goals", "Progress at a glance"], ["Focus time", "Deep work, protected"], ["Capacity", "Balanced across the team"]],
  bars: [["Insights", "Know what moves the needle"], ["Velocity", "Ship more every sprint"], ["Usage", "Spot trends before peaks"]],
  dots: [["Activity", "Every contribution counted"], ["Heatmaps", "See where time really goes"], ["Coverage", "Nothing slips through"]],
  line: [["Growth", "Compounding, week on week"], ["Forecasts", "Plan with real numbers"], ["Realtime sync", "Every edit, everywhere"]],
  toggles: [["Automations", "Busywork, quietly handled"], ["Smart alerts", "Only what matters"], ["Privacy first", "Encrypted end to end"]],
  avatars: [["Team spaces", "Shared context, zero noise"], ["Multiplayer", "Work side by side, live"], ["Guest access", "Invite clients in seconds"]],
};
const STATS = [["99.9%", "Uptime", "Twelve months, no drama"], ["3.2×", "Faster reviews", "Feedback in minutes"], ["<40ms", "Global edge", "Fast in every timezone"],
  ["12k+", "Teams onboard", "Trusted seed to scale"], ["4.9", "Loved by teams", "Rated on every store"], ["24/7", "Support", "Humans, around the clock"]];
const HEROES = [["Built for flow", "One calm workspace for plans, docs and delivery"], ["Ship together", "From first sketch to launch day, in one place"], ["Less tooling", "Replace five apps with one that just works"]];
const INIT = "AJMKRSLT";

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = (v) => +v.toFixed(1);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const lum = (h) => { const [r, g, b] = hex(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const inkOn = (h) => (lum(h) > 0.58 ? "#15161B" : "#F5F5F7");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const circ = (cx, cy, R, extra) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" ${extra}/>`;
const mono = (x, y, s, c, extra = "") => `<text x="${f(x)}" y="${f(y)}" font-family="${MONO}" font-size="12" fill="${c}" ${extra}>${s}</text>`;

const ILL = {
  rings(x, y, w, h, c, r) {
    const s = Math.min(w, h), cx = x + s / 2, cy = y + h / 2, sw = Math.max(4, s * 0.08), cols = [c.a, c.b, mix(c.a, c.b, 0.5)];
    let o = "";
    for (let k = 0; k < 3; k++) {
      const R = s / 2 - sw / 2 - k * sw * 1.55; if (R < sw) break;
      const L = 2 * Math.PI * R, v = 0.3 + r() * 0.62;
      o += circ(cx, cy, R, `fill="none" stroke="${c.track}" stroke-width="${f(sw)}"`);
      o += circ(cx, cy, R, `fill="none" stroke="${cols[k]}" stroke-width="${f(sw)}" stroke-linecap="round" stroke-dasharray="${f(L * v)} ${f(L)}" transform="rotate(-90 ${f(cx)} ${f(cy)})"`);
      if (w > s * 2.2) {
        const ly = y + h / 2 + (k - 1) * Math.min(20, h / 3.2);
        o += circ(x + s + 22, ly, 4, `fill="${cols[k]}"`) + mono(x + s + 34, ly + 4, Math.round(v * 100) + "%", c.ink, `opacity="0.6"`);
      }
    }
    return o;
  },
  bars(x, y, w, h, c, r) {
    const n = clamp(Math.round(w / 24), 5, 16), step = w / n, bw = step * 0.56, hi = Math.floor(r() * n), vals = [];
    let v = 0.5;
    for (let i = 0; i < n; i++) { v = clamp(v + (r() - 0.45) * 0.45, 0.15, 1); vals.push(v); }
    const top = Math.max(...vals);
    return vals.map((q, i) => {
      const bh = Math.max(4, (q / top) * h), bx = x + i * step + (step - bw) / 2;
      return `<rect x="${f(bx)}" y="${f(y + h - bh)}" width="${f(bw)}" height="${f(bh)}" rx="${f(Math.min(bw / 2, 5))}" fill="${i === hi ? c.a : c.b}" opacity="${i === hi ? 1 : 0.42}"/>`;
    }).join("");
  },
  dots(x, y, w, h, c, r) {
    const sp = clamp(h / 4, 11, 18), cols = Math.min(40, Math.floor(w / sp)), rows = Math.min(16, Math.floor(h / sp));
    const oy = y + (h - rows * sp) / 2 + sp / 2, hx = r() * cols, hy = r() * rows;
    let o = "";
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const v = 1 - Math.hypot(i - hx, (j - hy) * 1.4) / (Math.max(cols, rows) * 0.55) + r() * 0.35;
      o += circ(x + sp / 2 + i * sp, oy + j * sp, sp * 0.27, `fill="${v > 0.95 ? c.a : v > 0.72 ? c.b : c.track}"`);
    }
    return o;
  },
  line(x, y, w, h, c, r, id) {
    const n = 8, vs = []; let v = 0.4;
    for (let i = 0; i < n; i++) { v += (r() - 0.38) * 0.32; vs.push(v); }
    const lo = Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1;
    const pts = vs.map((q, i) => [x + (w * i) / (n - 1), y + h * (0.9 - ((q - lo) / span) * 0.8)]);
    let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
    }
    let o = `<defs><linearGradient id="lg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.a}" stop-opacity="0.35"/><stop offset="1" stop-color="${c.a}" stop-opacity="0"/></linearGradient></defs>`;
    for (let k = 0; k < 3; k++) o += `<line x1="${f(x)}" x2="${f(x + w)}" y1="${f(y + (h * k) / 2)}" y2="${f(y + (h * k) / 2)}" stroke="${c.track}" stroke-dasharray="3 5"/>`;
    const e = pts[n - 1];
    return o + `<path d="${d} L${f(x + w)},${f(y + h)} L${f(x)},${f(y + h)}Z" fill="url(#lg${id})"/><path d="${d}" fill="none" stroke="${c.a}" stroke-width="2.5" stroke-linecap="round"/>` + circ(e[0], e[1], 5, `fill="${c.a}" stroke="${c.bg}" stroke-width="3"`);
  },
  stat(x, y, w, h, c, r) {
    const raw = c.stat, fs = Math.min(h * 0.95, w / (raw.length * 0.6), 96), tw = raw.length * 0.58 * fs, by = y + h / 2 + fs * 0.36;
    let o = `<text x="${f(x - fs * 0.04)}" y="${f(by)}" font-family="${SANS}" font-size="${f(fs)}" font-weight="700" letter-spacing="${f(-fs * 0.04)}" fill="${c.a}">${esc(raw)}</text>`;
    if (w - tw > 96) o += mono(x + w, by, `+${8 + Math.floor(r() * 30)}% QoQ`, c.ink, `text-anchor="end" opacity="0.55"`);
    return o;
  },
  toggles(x, y, w, h, c, r) {
    const k = clamp(Math.floor(h / 34), 2, 5), rh = Math.min(h / k, 44), y0 = y + (h - rh * k) / 2, th = Math.min(22, rh * 0.62), tw = th * 1.8;
    let o = "";
    for (let i = 0; i < k; i++) {
      const cy = y0 + rh * (i + 0.5), on = i === 0 || r() < 0.5, lw = (w - tw - 16) * (0.4 + r() * 0.45), tx = x + w - tw;
      o += `<rect x="${f(x)}" y="${f(cy - 4)}" width="${f(lw)}" height="8" rx="4" fill="${c.track}"/>`;
      o += `<rect x="${f(tx)}" y="${f(cy - th / 2)}" width="${f(tw)}" height="${f(th)}" rx="${f(th / 2)}" fill="${on ? c.a : c.track}"/>`;
      o += circ(on ? x + w - th / 2 : tx + th / 2, cy, th / 2 - 3, `fill="${on ? inkOn(c.a) : mix(c.track, c.ink, 0.45)}"`);
    }
    return o;
  },
  avatars(x, y, w, h, c, r) {
    const d = Math.min(h * 0.78, 46), n = clamp(Math.floor((w - d) / (d * 0.68)) - 1, 3, 7), cy = y + h / 2;
    const pal = [c.a, c.b, mix(c.a, c.b, 0.5), mix(c.a, c.ink, 0.35)], o0 = Math.floor(r() * INIT.length);
    let o = "";
    for (let i = 0; i <= n; i++) {
      const cx = x + d / 2 + i * d * 0.68, last = i === n, col = last ? c.track : pal[i % 4];
      o += circ(cx, cy, d / 2, `fill="${col}" stroke="${c.bg}" stroke-width="3"`);
      o += `<text x="${f(cx)}" y="${f(cy + d * 0.12)}" text-anchor="middle" font-family="${SANS}" font-size="${f(d * (last ? 0.3 : 0.36))}" font-weight="600" fill="${last ? c.ink : inkOn(col)}">${last ? "+" + (8 + Math.floor(r() * 40)) : INIT[(i + o0) % INIT.length]}</text>`;
    }
    const end = x + d + n * d * 0.68;
    if (x + w - end > 130) o += circ(x + w - 92, cy, 4, `fill="${c.b}"`) + mono(x + w, cy + 4, `${6 + Math.floor(r() * 20)} online`, c.ink, `text-anchor="end" opacity="0.6"`);
    return o;
  },
};

export default function render(p) {
  const W = 1200, H = 800, r = rng(p.seed * 9973 + p.tiles * 131);
  const n = clamp(Math.round(p.tiles), 5, 8), L = LAYOUTS[n], mx = r() < 0.5, my = r() < 0.5;
  const g = p.gap, gx = 56, gy = 184, GW = W - 2 * gx, GH = H - gy - 56;
  const cw = (GW - 3 * g) / 4, ch = (GH - 2 * g) / 3;
  const base = p.finish === "outline" ? p.background : p.tile, ink = inkOn(base), bgInk = inkOn(p.background);
  const heroLbl = HEROES[Math.floor(r() * HEROES.length)];
  let hero = 0; L.forEach((t, i) => { if (t[2] * t[3] > L[hero][2] * L[hero][3]) hero = i; });
  const cand = L.map((_, i) => i).filter((i) => i !== hero), spot = cand[Math.floor(r() * cand.length)];
  const used = new Set(), titles = new Set();
  const pickCopy = (pool) => { const c = shuffle(pool.slice(), r).find((k) => !titles.has(k[1 === pool[0].length - 2 ? 1 : 0])) || pool[0]; titles.add(c[pool[0].length - 2]); return c; };
  let defs = "", body = "";
  L.forEach((t, i) => {
    let [c, ro, sw, sh] = t; if (mx) c = 4 - c - sw; if (my) ro = 3 - ro - sh;
    const x = gx + c * (cw + g), y = gy + ro * (ch + g), w = sw * cw + (sw - 1) * g, h = sh * ch + (sh - 1) * g;
    const rad = f(Math.min(p.radius, w / 2, h / 2)), isHero = i === hero, isSpot = i === spot;
    const fillC = isSpot ? p.accent : base, tInk = inkOn(fillC);
    const col = { a: isSpot ? tInk : p.accent, b: isSpot ? mix(p.accent, tInk, 0.45) : p.accent2, ink: tInk, track: mix(fillC, tInk, isSpot ? 0.22 : 0.1), bg: fillC };
    let fill = fillC, stroke = "";
    if (!isSpot && p.finish === "tinted") {
      defs += `<linearGradient id="t${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${base}"/><stop offset="1" stop-color="${mix(base, p.accent, 0.16)}"/></linearGradient>`;
      fill = `url(#t${i})`; stroke = ` stroke="${mix(base, ink, 0.08)}"`;
    }
    if (!isSpot && p.finish === "outline") stroke = ` stroke="${mix(base, ink, 0.18)}" stroke-width="1.5"`;
    const rect = `x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rad}"`;
    body += `<rect ${rect} fill="${fill}"${stroke}/>`;
    const P = Math.round(clamp(Math.min(w, h) * 0.15, 16, 28) + Math.max(0, p.radius - 28) * 0.3);
    const tfs = isHero ? Math.min(30, h * 0.17) : 17, cfs = isHero ? 15 : 13;
    const capY = y + h - P - 2, titleY = capY - cfs - (isHero ? 12 : 9);
    let title, cap;
    if (isHero) {
      [title, cap] = heroLbl;
      const R = Math.min(w, h) * 0.42, ox = x + w * (0.62 + r() * 0.12), oy = y + h * (0.3 + r() * 0.1), cr = Math.min(13, p.radius / 2);
      defs += `<clipPath id="hc"><rect ${rect}/></clipPath><filter id="hb" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${f(R * 0.45)}"/></filter>`;
      body += `<g clip-path="url(#hc)"><g filter="url(#hb)">${circ(ox, oy, R, `fill="${p.accent}"`)}${circ(ox + R * 0.6, oy - R * 0.4, R * 0.7, `fill="${p.accent2}"`)}${circ(ox - R * 0.4, oy + R * 0.5, R * 0.4, `fill="${mix(p.accent, p.accent2, 0.5)}" opacity="0.7"`)}</g>`;
      for (let k = 1; k <= 5; k++) body += circ(ox, oy, R * 0.32 * k, `fill="none" stroke="${ink}" stroke-opacity="0.08"`);
      body += `</g><rect x="${f(x + P)}" y="${f(y + P)}" width="102" height="26" rx="${f(cr)}" fill="${ink}" fill-opacity="0.08"/>${circ(x + P + 13, y + P + 13, 3.5, `fill="${p.accent}"`)}`
        + mono(x + P + 24, y + P + 17, "NEW · V2.0", ink, `font-size="11" opacity="0.8"`).replace(`font-size="12" `, "");
    } else {
      const ix = x + P, iy = y + P, iw = w - 2 * P, ih = titleY - tfs - 14 - iy, ar = iw / ih;
      const pool = ar > 2 ? ["bars", "line", "avatars", "toggles", "dots", "rings", "stat"] : ar < 1.15 ? ["rings", "dots", "bars", "toggles"] : ["rings", "stat", "dots", "bars", "line"];
      const pick = shuffle(pool, r).find((k) => !used.has(k)) || pool[0];
      used.add(pick);
      if (pick === "stat") { const s = pickCopy(STATS); col.stat = s[0]; title = s[1]; cap = s[2]; }
      else [title, cap] = pickCopy(COPY[pick]);
      if (ih > 16) body += ILL[pick](ix, iy, iw, ih, col, r, i);
    }
    body += `<text x="${f(x + P)}" y="${f(titleY)}" font-family="${SANS}" font-size="${f(tfs)}" font-weight="600" letter-spacing="${f(-tfs * 0.02)}" fill="${tInk}">${esc(title)}</text>`;
    body += `<text x="${f(x + P)}" y="${f(capY)}" font-family="${SANS}" font-size="${cfs}" fill="${tInk}" opacity="${isSpot ? 0.72 : 0.55}">${esc(cap)}</text>`;
  });
  const raw = p.headline || "", head = esc(raw), hfs = f(Math.min(42, 860 / (Math.max(10, raw.length) * 0.55)));
  const br = Math.min(20, p.radius);
  const header = mono(gx, 96, `FEATURES · 0${n}`, p.accent, `letter-spacing="2.4"`)
    + `<text x="${gx}" y="148" font-family="${SANS}" font-size="${hfs}" font-weight="600" letter-spacing="${f(-hfs * 0.025)}" fill="${bgInk}">${head}</text>`
    + `<rect x="${W - gx - 148}" y="118" width="148" height="40" rx="${br}" fill="${bgInk}"/><text x="${W - gx - 74}" y="143" text-anchor="middle" font-family="${SANS}" font-size="14" font-weight="600" fill="${p.background}">Explore all →</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="${p.background}"/>${header}${body}</svg>`;
}
