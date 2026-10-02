// Stylised vector map card: seeded street grid, smooth coastline and parks, a street-snapped walking route and a floating info panel.
export const meta = {
  title: "Wayfinder Map Card",
  kind: "ui",
  description: "A stylised city map card with streets, coastline, location pin, walking route and info panel. Use it for app mockups, store locators and event pages.",
  tags: ["map", "location", "pin", "route", "navigation", "card", "ui", "directions"],
  price: 8,
  author: "oasis-factory",
  size: [800, 600],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Land", default: "#F1EEE7" },
    ink: { type: "color", role: "ink", label: "Ink", default: "#1E2430" },
    primary: { type: "color", role: "primary", label: "Pin & route", default: "#E2483D" },
    theme: { type: "choice", label: "Theme", default: "light", options: ["light", "dark"] },
    pin: { type: "choice", label: "Pin style", default: "drop", options: ["drop", "pulse", "badge", "flag"] },
    overlay: { type: "choice", label: "Overlay", default: "place", options: ["place", "directions", "minimal"] },
    title: { type: "text", label: "Place name", default: "Blue Bottle Coffee" },
    density: { type: "range", label: "Street density", default: 3, min: 1, max: 6, step: 1 },
    seed: { type: "range", label: "Seed", default: 7, min: 1, max: 100, step: 1 },
    route: { type: "toggle", label: "Show route", default: true },
  },
  presets: {
    Paper: { background: "#F1EEE7", ink: "#1E2430", primary: "#E2483D", theme: "light", pin: "drop", overlay: "place", route: true },
    Sage: { background: "#E2EADC", ink: "#22352A", primary: "#D9822B", theme: "light", pin: "badge", overlay: "directions", route: true },
    Lagoon: { background: "#E3EDF3", ink: "#10304A", primary: "#7B4DFF", theme: "light", pin: "pulse", overlay: "minimal", route: false },
    Midnight: { background: "#141821", ink: "#EEF1F6", primary: "#FF4F86", theme: "dark", pin: "flag", overlay: "place", route: true },
  },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const toHex = (c) => "#" + c.map((v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const x = hx(a), y = hx(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (h) => { const [r, g, b] = hx(h).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function toHsl(h) {
  const [r, g, b] = hx(h), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let hu = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    hu = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hu /= 6;
  }
  return [hu, s, l];
}
function fromHsl(h, s, l) {
  l = clamp(l, 0, 1);
  const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return toHex([f(0), f(8), f(4)]);
}
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
const f = (n) => n.toFixed(1);
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
function fitText(s, maxW, size, min, wf) {
  while (size > min && s.length * size * wf > maxW) size -= 1;
  let t = s;
  while (t.length > 1 && t.length * size * wf > maxW) t = t.slice(0, -1);
  if (t !== s) t = t.slice(0, -1).trimEnd() + "…";
  return [esc(t), size, t.length * size * wf];
}
function dropPath(x, y, h) {
  const r = h / 3, c = y - 2 * r;
  return `M${f(x)},${f(y)} C${f(x - r * 0.33)},${f(y - r * 0.67)} ${f(x - r)},${f(y - r * 1.33)} ${f(x - r)},${f(c)} A${f(r)},${f(r)} 0 1 1 ${f(x + r)},${f(c)} C${f(x + r)},${f(y - r * 1.33)} ${f(x + r * 0.33)},${f(y - r * 0.67)} ${f(x)},${f(y)}Z`;
}
function star(x, y, R) {
  let pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? R * 0.45 : R; pts.push(`${f(x + Math.cos(a) * rr)},${f(y + Math.sin(a) * rr)}`); }
  return `<polygon points="${pts.join(" ")}"`;
}

export default function render(p) {
  const OW = 800, OH = 600, M = 28, W = OW - 2 * M, H = OH - 2 * M, cx = W / 2, cy = H / 2;
  const light = p.theme !== "dark";
  const [bh, bs, bl] = toHsl(p.background);
  const landL = light ? clamp(bl, 0.87, 0.93) : clamp(bl, 0.1, 0.15);
  const land = fromHsl(bh, Math.min(bs, light ? 0.32 : 0.26), landL);
  const landAlt = fromHsl(bh, Math.min(bs, 0.3), landL + (light ? -0.028 : 0.028));
  const road = light ? mix(land, "#FFFFFF", 0.85) : fromHsl(bh, Math.min(bs, 0.2), landL + 0.1);
  const water = mix(fromHsl(0.57, 0.48, light ? 0.79 : 0.25), land, 0.12);
  const park = mix(fromHsl(0.37, 0.32, light ? 0.82 : 0.21), land, 0.15);
  const surface = light ? mix(land, "#FFFFFF", 0.92) : fromHsl(bh, Math.min(bs, 0.18), landL + 0.07);
  const page = fromHsl(bh, Math.min(bs, 0.25), light ? landL - 0.05 : Math.max(0.05, landL - 0.06));
  const [ih, is] = toHsl(p.ink);
  const ink = contrast(p.ink, surface) >= 4.5 && contrast(p.ink, land) >= 4.5 ? p.ink : fromHsl(ih, Math.min(is, 0.4), light ? 0.13 : 0.94);
  let muted = mix(ink, surface, 0.3);
  if (contrast(muted, surface) < 5.5) muted = mix(ink, surface, 0.18);
  const border = mix(surface, ink, light ? 0.1 : 0.16);
  let [ph, ps, pl] = toHsl(p.primary), primary = p.primary;
  for (let i = 0; i < 16 && contrast(primary, land) < 3; i++) { pl += light ? -0.04 : 0.04; primary = fromHsl(ph, ps, pl); }
  const onPrimary = contrast(primary, "#FFFFFF") >= contrast(primary, "#14161A") ? "#FFFFFF" : "#14161A";
  let btn = primary, onBtn = "#FFFFFF";
  if (contrast(primary, "#FFFFFF") < 4.5) {
    if (!light && contrast(primary, "#14161A") >= 4.5) onBtn = "#14161A";
    else { let bL = pl; for (let i = 0; i < 24 && contrast(btn, "#FFFFFF") < 4.5; i++) { bL -= 0.025; btn = fromHsl(ph, ps, bL); } }
  }
  const tint = mix(primary, surface, 0.85);
  let okGreen = light ? "#1C7F48" : "#4CC38A";
  if (contrast(okGreen, surface) < 4.5) okGreen = light ? "#14603A" : "#7EDDB0";

  const r = rng(p.seed * 9973 + 17);
  const ang = (r() * 2 - 1) * 13, ca = Math.cos((ang * Math.PI) / 180), sa = Math.sin((ang * Math.PI) / 180);
  const sp = 170 / (1 + (p.density - 1) * 0.45), mpp = 110 / sp;
  const D = Math.hypot(W, H) / 2 + sp;
  const minorW = Math.max(4.5, 8 - p.density * 0.5), majorW = minorW * 2;
  const lines = () => { const out = []; let pos = -D - r() * sp, k = Math.floor(r() * 4); while (pos < D + sp) { out.push({ pos, w: k % 4 === 0 ? majorW : minorW }); k++; pos += sp * (0.78 + r() * 0.44); } return out; };
  const xs = lines(), ys = lines();
  const S = (u, v) => [cx + u * ca - v * sa, cy + u * sa + v * ca];

  let grid = `<rect x="${f(-D)}" y="${f(-D)}" width="${f(2 * D)}" height="${f(2 * D)}" fill="${road}"/>`;
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
    const x0 = xs[i].pos + xs[i].w / 2, x1 = xs[i + 1].pos - xs[i + 1].w / 2, y0 = ys[j].pos + ys[j].w / 2, y1 = ys[j + 1].pos - ys[j + 1].w / 2;
    const t = r(), fill = t < 0.07 ? park : t < 0.4 ? landAlt : land;
    grid += `<rect x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}" rx="${f(Math.min(6, (x1 - x0) / 4))}" fill="${fill}"/>`;
  }
  const da = ((r() < 0.5 ? 34 : -34) * Math.PI) / 180, dv = (r() - 0.5) * sp;
  grid += `<line x1="${f(-D * 1.5 * Math.cos(da))}" y1="${f(dv - D * 1.5 * Math.sin(da))}" x2="${f(D * 1.5 * Math.cos(da))}" y2="${f(dv + D * 1.5 * Math.sin(da))}" stroke="${road}" stroke-width="${f(majorW * 1.1)}"/>`;

  const wr = rng(p.seed * 31 + 5), wcx = W + 10, wcy = H * 1.06, R = 290 + wr() * 70;
  const ph1 = wr() * 6.28, ph2 = wr() * 6.28;
  const rad = (th) => R * (1 + 0.07 * Math.sin(3 * th + ph1) + 0.035 * Math.sin(5 * th + ph2));
  const inWater = (x, y, m) => Math.hypot(x - wcx, y - wcy) < rad(Math.atan2(y - wcy, x - wcx)) + m;
  const NC = 120, cpts = [];
  for (let k = 0; k < NC; k++) { const th = (k / NC) * Math.PI * 2, rr = rad(th); cpts.push([wcx + Math.cos(th) * rr, wcy + Math.sin(th) * rr]); }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(cpts[NC - 1], cpts[0]);
  let wd = `M${f(m0[0])},${f(m0[1])}`;
  for (let k = 0; k < NC; k++) { const c = cpts[k], e = mid(c, cpts[(k + 1) % NC]); wd += ` Q${f(c[0])},${f(c[1])} ${f(e[0])},${f(e[1])}`; }
  wd += "Z";

  const safeTop = H - 20 - 144;
  const pick = (tx, ty, ok) => { let best = null, bd = 1e9; for (let i = 0; i < xs.length; i++) for (let j = 0; j < ys.length; j++) { const [x, y] = S(xs[i].pos, ys[j].pos); if (!ok(x, y, i, j)) continue; const d = Math.hypot(x - tx, y - ty); if (d < bd) { bd = d; best = { i, j, x, y }; } } return best; };
  const pinAt = pick(W * 0.6, H * 0.36, (x, y) => x > 90 && x < W - 150 && y > 100 && y < safeTop - 60 && !inWater(x, y, 50)) || { i: 0, j: 0, x: W * 0.6, y: H * 0.36 };
  const st = pick(W * 0.15, H * 0.55, (x, y, i, j) => x > 40 && x < W - 60 && y > 90 && y < safeTop - 26 && !inWater(x, y, 30) && Math.abs(i - pinAt.i) >= 2 && j !== pinAt.j);
  let routePts = [], len = 0;
  if (st) {
    const bad = (x, y) => inWater(x, y, 14) || y > safeTop - 10 || x < 16 || x > W - 16 || y < 16;
    let chosen = null;
    for (const im of [Math.round((st.i + pinAt.i) / 2), pinAt.i, st.i]) {
      const g = [[st.i, st.j], [im, st.j], [im, pinAt.j], [pinAt.i, pinAt.j]].filter((q, k, a) => !k || q[0] !== a[k - 1][0] || q[1] !== a[k - 1][1]).map((q) => S(xs[q[0]].pos, ys[q[1]].pos));
      let ok = true;
      for (let k = 1; k < g.length && ok; k++) for (let t = 0; t <= 20; t++) if (bad(g[k - 1][0] + (g[k][0] - g[k - 1][0]) * t / 20, g[k - 1][1] + (g[k][1] - g[k - 1][1]) * t / 20)) { ok = false; break; }
      if (!chosen) chosen = g;
      if (ok) { chosen = g; break; }
    }
    routePts = chosen;
    for (let k = 1; k < routePts.length; k++) len += Math.hypot(routePts[k][0] - routePts[k - 1][0], routePts[k][1] - routePts[k - 1][1]);
  } else len = Math.hypot(pinAt.x - W * 0.15, pinAt.y - H * 0.55) * 1.3;
  const meters = len * mpp;
  const dist = meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
  const mins = Math.max(1, Math.round(meters / 80));

  const rw = clamp(minorW + 1, 5.5, 7);
  let routeSvg = "";
  if (p.route && routePts.length > 1) {
    let d = `M${f(routePts[0][0])},${f(routePts[0][1])}`;
    for (let k = 1; k < routePts.length - 1; k++) {
      const a = routePts[k - 1], b = routePts[k], c = routePts[k + 1];
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]), rr = Math.min(sp * 0.16, 18, l1 / 2, l2 / 2);
      d += ` L${f(b[0] + (a[0] - b[0]) * rr / l1)},${f(b[1] + (a[1] - b[1]) * rr / l1)} Q${f(b[0])},${f(b[1])} ${f(b[0] + (c[0] - b[0]) * rr / l2)},${f(b[1] + (c[1] - b[1]) * rr / l2)}`;
    }
    const e = routePts[routePts.length - 1];
    d += ` L${f(e[0])},${f(e[1])}`;
    const s0 = routePts[0];
    routeSvg = `<path d="${d}" fill="none" stroke="${road}" stroke-width="${f(rw + 5)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${primary}" stroke-width="${f(rw)}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${f(s0[0])}" cy="${f(s0[1])}" r="${f(rw + 2)}" fill="${surface}" stroke="${primary}" stroke-width="${f(rw * 0.65)}"/>`;
  }

  const { x: px, y: py } = pinAt;
  const shadow = p.pin === "pulse" ? "" : `<ellipse cx="${f(px)}" cy="${f(py + 1)}" rx="12" ry="4.5" fill="#000" opacity="${light ? 0.16 : 0.4}"/>`;
  const anchor = p.pin === "pulse" ? "" : `<circle cx="${f(px)}" cy="${f(py)}" r="${f(rw * 0.75 + 1)}" fill="${primary}" stroke="${surface}" stroke-width="2.5"/>`;
  let pin = "";
  if (p.pin === "drop") pin = `<path d="${dropPath(px, py - 3, 56)}" fill="${primary}" stroke="${surface}" stroke-width="3" stroke-linejoin="round"/><circle cx="${f(px)}" cy="${f(py - 40.3)}" r="7.5" fill="${surface}"/>`;
  else if (p.pin === "pulse") pin = `<circle cx="${f(px)}" cy="${f(py)}" r="38" fill="${primary}" opacity="0.12"/><circle cx="${f(px)}" cy="${f(py)}" r="24" fill="${primary}" opacity="0.22"/><circle cx="${f(px)}" cy="${f(py)}" r="12" fill="${primary}" stroke="${surface}" stroke-width="4"/>`;
  else if (p.pin === "badge") pin = `<path d="M${f(px - 8)},${f(py - 20)} L${f(px)},${f(py - 9)} L${f(px + 8)},${f(py - 20)}Z" fill="${primary}"/><rect x="${f(px - 23)}" y="${f(py - 64)}" width="46" height="46" rx="15" fill="${primary}" stroke="${surface}" stroke-width="3"/>${star(px, py - 41, 11)} fill="${onPrimary}"/>`;
  else pin = `<line x1="${f(px)}" y1="${f(py - 4)}" x2="${f(px)}" y2="${f(py - 58)}" stroke="${ink}" stroke-width="3" stroke-linecap="round"/><path d="M${f(px + 1.5)},${f(py - 58)} C${f(px + 14)},${f(py - 64)} ${f(px + 22)},${f(py - 52)} ${f(px + 38)},${f(py - 56)} L${f(px + 38)},${f(py - 34)} C${f(px + 22)},${f(py - 30)} ${f(px + 14)},${f(py - 42)} ${f(px + 1.5)},${f(py - 36)}Z" fill="${primary}"/>`;

  const nice = [50, 100, 200, 250, 500, 1000, 2000];
  let sm = 50; for (const n of nice) if (n / mpp <= 110) sm = n;
  const bar = sm / mpp, slabel = sm >= 1000 ? `${sm / 1000} km` : `${sm} m`, sw = bar + 38 + slabel.length * 7;
  const chrome = `<g filter="url(#ps)"><rect x="20" y="20" width="${f(sw)}" height="30" rx="15" fill="${surface}" stroke="${border}"/><rect x="${W - 56}" y="20" width="36" height="76" rx="18" fill="${surface}" stroke="${border}"/></g>`
    + `<path d="M32,31 V39 H${f(32 + bar)} V31" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="${f(42 + bar)}" y="39.5" font-family="${FONT}" font-size="12" font-weight="600" fill="${ink}">${slabel}</text>`
    + `<path d="M${W - 44},39 h12 M${W - 38},33 v12 M${W - 44},77 h12" stroke="${ink}" stroke-width="2" stroke-linecap="round"/><line x1="${W - 50}" y1="58" x2="${W - 26}" y2="58" stroke="${border}"/>`;

  const lx = W - 70, ly = H - 34;
  let wcol = mix(water, ink, 0.55);
  if (contrast(wcol, water) < 3) wcol = mix(water, ink, 0.8);
  const wlabel = inWater(lx, ly, -30) ? `<text x="${lx}" y="${ly}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="700" letter-spacing="2.6" fill="${wcol}">HARBOR</text>` : "";

  const title = String(p.title || "Untitled place");
  const PW = 396, X = 20;
  let panel = "";
  if (p.overlay === "place") {
    const PH = 144, Y = H - 20 - PH;
    const [t, ts] = fitText(title, PW - 108, 21, 15, 0.58);
    const stars = [0, 1, 2, 3, 4].map((k) => `${star(X + 124 + k * 15, Y + 63, 6.5)} fill="${primary}" opacity="${k < 4 ? 1 : 0.4}"/>`).join("");
    const ow = 8 * 13 * 0.57;
    panel = `<rect x="${X}" y="${Y}" width="${PW}" height="${PH}" rx="22" fill="${surface}" stroke="${border}" filter="url(#ps)"/>`
      + `<rect x="${X + 20}" y="${Y + 20}" width="52" height="52" rx="15" fill="${tint}"/><path d="${dropPath(X + 46, Y + 62, 30)}" fill="${primary}"/><circle cx="${X + 46}" cy="${f(Y + 42)}" r="4" fill="${tint}"/>`
      + `<text x="${X + 88}" y="${Y + 42}" font-family="${FONT}" font-size="${ts}" font-weight="700" fill="${ink}">${t}</text>`
      + `<text x="${X + 88}" y="${Y + 68}" font-family="${FONT}" font-size="14" font-weight="700" fill="${ink}">4.8</text>${stars}`
      + `<text x="${X + 196}" y="${Y + 68}" font-family="${FONT}" font-size="14" font-weight="500" fill="${muted}">· ${dist} · ${mins} min walk</text>`
      + `<rect x="${X + 20}" y="${Y + 88}" width="140" height="36" rx="18" fill="${btn}"/><text x="${X + 90}" y="${Y + 111}" text-anchor="middle" font-family="${FONT}" font-size="14" font-weight="700" fill="${onBtn}">Directions</text>`
      + `<rect x="${X + 170}" y="${Y + 88.5}" width="90" height="35" rx="17.5" fill="none" stroke="${mix(surface, ink, 0.22)}" stroke-width="1.5"/><text x="${X + 215}" y="${Y + 111}" text-anchor="middle" font-family="${FONT}" font-size="14" font-weight="600" fill="${ink}">Save</text>`
      + `<circle cx="${f(X + PW - 22 - ow - 10)}" cy="${Y + 106.5}" r="4.5" fill="${okGreen}"/><text x="${X + PW - 22}" y="${Y + 111}" text-anchor="end" font-family="${FONT}" font-size="13" font-weight="600" fill="${okGreen}">Open now</text>`;
  } else if (p.overlay === "directions") {
    const PH = 144, Y = H - 20 - PH;
    const [t, ts] = fitText("to " + title, PW - 110, 15, 12, 0.55);
    const ew = String(mins).length * 40 * 0.58;
    const gx = X + PW - 48, gy = Y + 72;
    panel = `<rect x="${X}" y="${Y}" width="${PW}" height="${PH}" rx="22" fill="${surface}" stroke="${border}" filter="url(#ps)"/>`
      + `<text x="${X + 22}" y="${Y + 34}" font-family="${FONT}" font-size="12" font-weight="700" letter-spacing="1.2" fill="${muted}">WALKING · FASTEST ROUTE</text>`
      + `<text x="${X + 20}" y="${Y + 82}" font-family="${FONT}" font-size="40" font-weight="700" letter-spacing="-1" fill="${ink}">${mins}</text>`
      + `<text x="${f(X + 26 + ew)}" y="${Y + 82}" font-family="${FONT}" font-size="18" font-weight="600" fill="${ink}">min</text>`
      + `<text x="${f(X + 64 + ew)}" y="${Y + 82}" font-family="${FONT}" font-size="16" font-weight="500" fill="${muted}">· ${dist}</text>`
      + `<text x="${X + 22}" y="${Y + 116}" font-family="${FONT}" font-size="${ts}" font-weight="500" fill="${ink}">${t}</text>`
      + `<circle cx="${gx}" cy="${gy}" r="27" fill="${btn}"/><path d="M${gx - 7},${gy + 9} V${gy - 1} a4,4 0 0 1 4,-4 H${gx + 8} M${gx + 3},${gy - 10} L${gx + 8},${gy - 5} L${gx + 3},${gy}" fill="none" stroke="${onBtn}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else {
    const PH = 64, Y = H - 20 - PH;
    const dw = dist.length * 15 * 0.56;
    const [t, , tw] = fitText(title, PW - 90 - dw, 17, 13, 0.58);
    const w = Math.min(PW, 48 + tw + 20 + dw + 22);
    panel = `<rect x="${X}" y="${Y}" width="${f(w)}" height="${PH}" rx="32" fill="${surface}" stroke="${border}" filter="url(#ps)"/>`
      + `<circle cx="${X + 30}" cy="${Y + 32}" r="8" fill="${primary}" stroke="${tint}" stroke-width="5"/>`
      + `<text x="${X + 48}" y="${Y + 38}" font-family="${FONT}" font-size="17" font-weight="700" fill="${ink}">${t}</text>`
      + `<text x="${f(X + w - 22)}" y="${Y + 38}" text-anchor="end" font-family="${FONT}" font-size="15" font-weight="600" fill="${muted}">${dist}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${OW} ${OH}" width="${OW}" height="${OH}"><defs><clipPath id="cc"><rect width="${W}" height="${H}" rx="28"/></clipPath>`
    + `<filter id="cs" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000" flood-opacity="${light ? 0.16 : 0.45}"/></filter>`
    + `<filter id="ps" x="-20%" y="-30%" width="140%" height="170%"><feDropShadow dx="0" dy="6" stdDeviation="9" flood-color="#000" flood-opacity="${light ? 0.12 : 0.4}"/></filter></defs>`
    + `<rect width="${OW}" height="${OH}" fill="${page}"/><g transform="translate(${M} ${M})"><rect width="${W}" height="${H}" rx="28" fill="${land}" filter="url(#cs)"/>`
    + `<g clip-path="url(#cc)"><g transform="translate(${cx} ${cy}) rotate(${ang.toFixed(2)})">${grid}</g>`
    + `<path d="${wd}" fill="${water}" stroke="${road}" stroke-width="3" stroke-opacity="0.7" stroke-linejoin="round"/>${wlabel}${shadow}${routeSvg}${anchor}${pin}${chrome}${panel}</g></g></svg>`;
}
