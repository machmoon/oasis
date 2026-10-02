// Social profile cover: platform-sized banner with safe-zone-aware type and seeded, grid-composed decoration.
export const meta = {
  title: "Profile Cover Banner",
  kind: "background",
  description: "Profile cover banner for LinkedIn, X, YouTube and Facebook. Type is placed inside each platform's safe zone and framed by seeded decoration composed on a grid.",
  tags: ["social", "banner", "cover", "header", "linkedin", "youtube", "profile", "branding"],
  price: 0,
  author: "oasis-factory",
  size: [1584, 396],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#F4EFE6" },
    ink: { type: "color", role: "ink", label: "Text", default: "#1B1A22" },
    primary: { type: "color", role: "primary", label: "Accent", default: "#E2553C" },
    ratio: { type: "choice", label: "Platform", default: "linkedin", options: ["linkedin", "x-twitter", "youtube", "facebook"] },
    style: { type: "choice", label: "Background style", default: "shapes", options: ["shapes", "gradient", "grid", "waves"] },
    align: { type: "choice", label: "Text alignment", default: "left", options: ["left", "center", "right"] },
    headline: { type: "text", label: "Headline", default: "Designing calm software" },
    tagline: { type: "text", label: "Tagline", default: "Product designer · Lisbon · hello@studio.co" },
    scale: { type: "range", label: "Shape scale", default: 1, min: 0.6, max: 1.4, step: 0.05 },
    seed: { type: "range", label: "Seed", default: 7, min: 1, max: 999, step: 1 },
    guides: { type: "toggle", label: "Safe-zone guides", default: false },
  },
  presets: {
    Midnight: { background: "#12131A", ink: "#F2EFE8", primary: "#8C7CFF", ratio: "x-twitter", style: "grid", align: "center" },
    Sage: { background: "#E3EBDD", ink: "#1F3326", primary: "#3F7D5A", ratio: "youtube", style: "waves", align: "center" },
    Periwinkle: { background: "#DCEBFA", ink: "#14223A", primary: "#5B7FE8", ratio: "facebook", style: "gradient", align: "right" },
    Ember: { background: "#2A1410", ink: "#FFE9DC", primary: "#FF8A3D", ratio: "linkedin", style: "shapes", align: "right", guides: true },
  },
};

const RATIOS = {
  linkedin: { W: 1584, H: 396, safe: [0.31, 0.12, 0.65, 0.76], av: [0.17, 1.0, 0.105], crop: [] },
  "x-twitter": { W: 1500, H: 500, safe: [0.05, 0.12, 0.9, 0.6], av: [0.12, 1.0, 0.09], crop: [{ y: [0.12, 0.88], label: "MOBILE CROP" }] },
  youtube: { W: 2560, H: 1440, safe: [0.198, 0.353, 0.604, 0.294], av: null, crop: [{ x: [0.1377, 0.8623], label: "TABLET" }, { y: [0.353, 0.647], label: "DESKTOP" }] },
  facebook: { W: 820, H: 312, safe: [0.11, 0.1, 0.78, 0.64], av: [0.15, 1.05, 0.11], crop: [{ x: [0.11, 0.89], label: "MOBILE" }] },
};
const SANS = "Helvetica Neue, Helvetica, Arial, sans-serif";
const MONO = "Menlo, Consolas, monospace";
const KINDS = ["q", "q", "h", "d", "o", "l", "t", "s"];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = (n) => (+n).toFixed(1);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (h) => { const c = hx(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

function layoutHead(words, maxW, rh, H) {
  const k = 0.58, one = words.join(" ");
  let best = { lines: [one], fs: Math.min(rh / 1.95, maxW / (Math.max(1, one.length) * k)) };
  if (words.length > 1) {
    let bi = 1, bm = 1e9;
    for (let i = 1; i < words.length; i++) {
      const m = Math.max(words.slice(0, i).join(" ").length, words.slice(i).join(" ").length);
      if (m < bm) { bm = m; bi = i; }
    }
    const fs2 = Math.min(rh / 3.0, maxW / (bm * k));
    if (fs2 > best.fs * 1.15) best = { lines: [words.slice(0, bi).join(" "), words.slice(bi).join(" ")], fs: fs2 };
  }
  best.fs = Math.min(best.fs, H * 0.24);
  return best;
}

function tile(k, x, y, cw, ch, rot, fg, fill) {
  const G = {
    q: `<path d="M0,100V0A100,100 0 0 1 100,100Z"/>`,
    h: `<path d="M0,100A50,50 0 0 1 100,100Z"/>`,
    d: `<circle cx="50" cy="50" r="36"/>`,
    o: `<circle cx="50" cy="50" r="30" fill="none" stroke="${fg}" stroke-width="14"/>`,
    l: `<path d="M0,100A100,100 0 0 1 100,0A100,100 0 0 1 0,100Z"/>`,
    t: `<path d="M0,0L100,100H0Z"/>`,
    s: [22, 44, 66].map((v) => `<rect x="12" y="${v}" width="76" height="12" rx="6"/>`).join(""),
  };
  const bgr = fill ? `<rect width="100" height="100" fill="${fill}"/>` : "";
  return `<g transform="translate(${f(x + cw * 0.05)} ${f(y + ch * 0.05)}) scale(${(cw * 0.009).toFixed(4)} ${(ch * 0.009).toFixed(4)})"><g transform="rotate(${rot} 50 50)" fill="${fg}">${bgr}${G[k]}</g></g>`;
}

export default function render(p) {
  const R = RATIOS[p.ratio] || RATIOS.linkedin, W = R.W, H = R.H;
  const r = rng(p.seed * 7919 + 13), sc = p.scale;
  const bg = p.background;
  const txt = cr(p.ink, bg) >= 4.5 ? p.ink : (cr("#FFFFFF", bg) >= cr("#141414", bg) ? "#FFFFFF" : "#141414");
  let mut = mix(txt, bg, 0.22);
  if (cr(mut, bg) < 7) mut = mix(txt, bg, 0.1);
  if (cr(mut, bg) < 7) mut = txt;
  const prim = cr(p.primary, bg) < 1.6 ? mix(p.primary, txt, 0.45) : p.primary;
  const tint = mix(prim, bg, 0.5), deep = mix(prim, txt, 0.35), soft = mix(bg, prim, 0.14), inkA = mix(txt, bg, 0.1);
  const B = Math.min(H, W * 0.35), u = B * 0.055;

  const sx = R.safe[0] * W, sy = R.safe[1] * H, sw = R.safe[2] * W, sh = R.safe[3] * H;
  const ins = sh * 0.1, rx = sx + ins, ry = sy + ins, rw = sw - 2 * ins, rh = sh - 2 * ins;
  const al = p.align, side = al === "left" ? 1 : al === "right" ? -1 : 0;
  const maxW = rw * (al === "center" ? 0.92 : 0.74);
  const words = String(p.headline || "").trim().split(/\s+/).filter(Boolean);
  const hd = layoutHead(words.length ? words : [""], maxW, rh, H), fs = hd.fs, n = hd.lines.length;
  const tl = String(p.tagline || "").trim();
  const tfs = Math.min(fs * 0.42, rw * 0.9 / (Math.max(1, tl.length) * 0.52));
  const totalH = fs * (0.09 + 0.35 + 0.72 + (n - 1) * 1.04 + 0.42) + (tl ? tfs * 0.72 : 0);
  const top = ry + (rh - totalH) / 2;
  const bw = Math.max(Math.max(...hd.lines.map((l) => l.length)) * fs * 0.58, tl.length * tfs * 0.52, fs * 0.9);
  const ax = side === 1 ? rx : side === -1 ? rx + rw : rx + rw / 2;
  const anchor = side === 1 ? "start" : side === -1 ? "end" : "middle";
  const bx0 = side === 1 ? ax : side === -1 ? ax - bw : ax - bw / 2;
  const pad = Math.max(fs * 0.45, u * 1.2);
  const keep = { x0: bx0 - pad, y0: top - pad, x1: bx0 + bw + pad, y1: top + totalH + pad };
  const distBox = (x, y) => Math.hypot(Math.max(keep.x0 - x, 0, x - keep.x1), Math.max(keep.y0 - y, 0, y - keep.y1));
  const av = R.av ? { x: R.av[0] * W, y: R.av[1] * H, r: R.av[2] * W } : null;
  const regions = [];
  if (keep.x0 > B * 0.3) regions.push({ x0: 0, x1: keep.x0, side: -1 });
  if (W - keep.x1 > B * 0.3) regions.push({ x0: keep.x1, x1: W, side: 1 });
  const big = regions.slice().sort((a, b) => (b.x1 - b.x0) - (a.x1 - a.x0))[0];

  let defs = "", back = `<rect width="${W}" height="${H}" fill="${bg}"/>`, deco = "";

  if (p.style === "shapes") {
    const c0 = B * 0.25 * sc, cols = Math.max(4, Math.round(W / c0)), rows = Math.max(2, Math.round(H / c0));
    const cw = W / cols, ch = H / rows, g = Math.min(cw, ch) * 0.12;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = i * cw, y = j * ch, v = [r(), r(), r(), r(), r(), r()];
      if (x < keep.x1 + g && x + cw > keep.x0 - g && y < keep.y1 + g && y + ch > keep.y0 - g) continue;
      if (av && Math.hypot(clamp(av.x, x, x + cw) - av.x, clamp(av.y, y, y + ch) - av.y) < av.r + g) continue;
      const prob = 0.3 + 0.5 * smooth((distBox(x + cw / 2, y + ch / 2) - c0 * 0.3) / (c0 * 2.5));
      if (v[0] > prob) continue;
      const fill = v[3] < 0.4 ? (v[4] < 0.6 ? soft : tint) : null;
      const fgs = fill === tint ? [prim, deep, inkA] : [prim, prim, tint, deep, inkA];
      deco += tile(KINDS[Math.floor(v[1] * KINDS.length)], x, y, cw, ch, Math.floor(v[2] * 4) * 90, fgs[Math.floor(v[5] * fgs.length)], fill);
    }
  } else if (p.style === "gradient") {
    const end = mix(bg, prim, 0.32);
    defs += `<radialGradient id="bgG" gradientUnits="userSpaceOnUse" cx="${f((keep.x0 + keep.x1) / 2)}" cy="${f((keep.y0 + keep.y1) / 2)}" r="${f(Math.max(W, H) * 0.7)}"><stop offset="0" stop-color="${bg}"/><stop offset="0.3" stop-color="${bg}"/><stop offset="1" stop-color="${end}"/></radialGradient>`;
    back = `<rect width="${W}" height="${H}" fill="url(#bgG)"/>`;
    regions.forEach((g, i) => {
      const rw0 = g.x1 - g.x0, cx = (g.x0 + g.x1) / 2 + (r() - 0.5) * rw0 * 0.3, cy = H * (0.3 + r() * 0.4);
      const Rf = Math.min(H * 0.42 * sc, rw0 * 0.55 * sc, distBox(cx, cy) / 1.9);
      if (Rf < u * 2) return;
      const a = r() * 6.283, x2 = cx + Math.cos(a) * Rf * 0.8, y2 = cy + Math.sin(a) * Rf * 0.8, R2 = Math.min(Rf * 0.6, distBox(x2, y2) / 1.9);
      [[cx, cy, Rf, i ? deep : prim], [x2, y2, R2, tint]].forEach(([x, y, rr, c], k) => {
        if (rr < u) return;
        defs += `<filter id="b${i}${k}" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${f(rr * 0.45)}"/></filter>`;
        deco += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${c}" opacity="0.85" filter="url(#b${i}${k})"/>`;
      });
      if (g !== big) return;
      const Rr = Math.min(Rf * 1.05, cy - u, H - cy - u, cx - u, W - cx - u, distBox(cx, cy) - u);
      if (Rr < u * 2) return;
      const rc = mix(prim, txt, 0.25);
      [1, 0.72, 0.44].forEach((k) => { deco += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(Rr * k)}" fill="none" stroke="${rc}" stroke-opacity="0.6" stroke-width="${f(u * 0.12)}"/>`; });
      const b = r() * 6.283;
      deco += `<circle cx="${f(cx + Math.cos(b) * Rr)}" cy="${f(cy + Math.sin(b) * Rr)}" r="${f(u * 0.5)}" fill="${prim}"/><circle cx="${f(cx - Math.cos(b) * Rr * 0.72)}" cy="${f(cy - Math.sin(b) * Rr * 0.72)}" r="${f(u * 0.32)}" fill="${rc}"/>`;
    });
  } else if (p.style === "grid") {
    const g = u * 1.5;
    defs += `<pattern id="dg" width="${f(g)}" height="${f(g)}" patternUnits="userSpaceOnUse"><circle cx="${f(g / 2)}" cy="${f(g / 2)}" r="${f(u * 0.13)}" fill="${mix(txt, bg, 0.68)}"/></pattern>`;
    defs += `<filter id="mb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${f(pad * 0.7)}"/></filter>`;
    defs += `<mask id="gm" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><rect x="${f(keep.x0)}" y="${f(keep.y0)}" width="${f(keep.x1 - keep.x0)}" height="${f(keep.y1 - keep.y0)}" fill="#000" filter="url(#mb)"/></mask>`;
    deco += `<rect width="${W}" height="${H}" fill="url(#dg)" mask="url(#gm)"/>`;
    regions.forEach((rg) => {
      const x = rg.side === -1 ? 0 : W, y = av && rg.side === -1 ? 0 : (r() < 0.5 ? 0 : H);
      let Rm = Math.min(H * 0.85 * sc, distBox(x, y) - u);
      if (av) Rm = Math.min(Rm, Math.hypot(av.x - x, av.y - y) - av.r - u);
      if (Rm < u * 3) return;
      const cnt = 3 + Math.floor(r() * 3), cs = [prim, tint, deep];
      for (let k = 0; k < cnt; k++) deco += `<circle cx="${x}" cy="${y}" r="${f(Rm * (1 - k / cnt) - u * 0.25)}" fill="none" stroke="${cs[k % 3]}" stroke-width="${f(u * 0.5)}"/>`;
      deco += `<circle cx="${x}" cy="${y}" r="${f((Rm / cnt) * 0.6)}" fill="${prim}"/>`;
    });
  } else {
    const wTop = Math.min(H - u * 1.4, keep.y1 + u * 0.6), crest = H * clamp(1 - 0.55 * sc, 0.2, 0.75);
    const tAt = (x) => smooth(Math.max(keep.x0 - x, x - keep.x1, 0) / (W * 0.18));
    const base = (x) => wTop + (crest - wTop) * tAt(x);
    const per = W * (0.16 + r() * 0.14), ph = [r(), r(), r()].map((v) => v * 6.283), amp = u * 0.8 * sc;
    if (big) {
      const qx = (big.x0 + big.x1) / 2 + (r() - 0.5) * (big.x1 - big.x0) * 0.3, cy = H * (0.22 + r() * 0.12);
      const Rs = Math.min(H * 0.16 * sc, distBox(qx, cy) / 1.4 - u, (cy - u) / 1.35, (base(qx) - u * 2 - cy) / 1.35);
      if (Rs > u) deco += `<circle cx="${f(qx)}" cy="${f(cy)}" r="${f(Rs * 1.32)}" fill="none" stroke="${tint}" stroke-width="${f(u * 0.18)}"/><circle cx="${f(qx)}" cy="${f(cy)}" r="${f(Rs)}" fill="${prim}"/>`;
    }
    [tint, prim, deep].forEach((c, i) => {
      let d = `M0,${H}`;
      for (let s = 0; s <= 64; s++) {
        const x = (W * s) / 64, b = base(x), t = tAt(x);
        const y = b + (H - b) * i * 0.3 + amp * (1 - i * 0.25) * (0.35 + 0.65 * t) * Math.sin((x / per) * 6.283 + ph[i]);
        d += ` L${f(x)},${f(Math.min(H, y))}`;
      }
      deco += `<path d="${d} L${W},${H}Z" fill="${c}"/>`;
    });
  }

  const ruleX = side === 1 ? ax : side === -1 ? ax - fs * 0.9 : ax - fs * 0.45;
  let type = `<rect x="${f(ruleX)}" y="${f(top)}" width="${f(fs * 0.9)}" height="${f(fs * 0.09)}" rx="${f(fs * 0.045)}" fill="${prim}"/>`;
  const bl = top + fs * 0.44 + fs * 0.72;
  hd.lines.forEach((l, i) => {
    type += `<text x="${f(ax)}" y="${f(bl + i * fs * 1.04)}" font-family="${SANS}" font-size="${f(fs)}" font-weight="700" letter-spacing="${f(-fs * 0.02)}" text-anchor="${anchor}" fill="${txt}">${esc(l)}</text>`;
  });
  if (tl) type += `<text x="${f(ax)}" y="${f(bl + (n - 1) * fs * 1.04 + fs * 0.42 + tfs * 0.72)}" font-family="${SANS}" font-size="${f(tfs)}" font-weight="500" letter-spacing="${f(tfs * 0.005)}" text-anchor="${anchor}" fill="${mut}">${esc(tl)}</text>`;

  let guide = "";
  if (p.guides) {
    const gs = f(Math.max(1.5, u * 0.08)), fz = f(u * 0.5), da = `${f(u * 0.4)} ${f(u * 0.3)}`;
    const lab = (x, y, s, a) => `<text x="${f(x)}" y="${f(y)}" font-family="${MONO}" font-size="${fz}" letter-spacing="1" text-anchor="${a || "start"}" fill="${txt}" opacity="0.85">${s}</text>`;
    guide += `<g fill="none" stroke="${txt}" stroke-opacity="0.75" stroke-width="${gs}" stroke-dasharray="${da}"><rect x="${f(sx)}" y="${f(sy)}" width="${f(sw)}" height="${f(sh)}"/>`;
    R.crop.forEach((c) => {
      if (c.x) c.x.forEach((v) => { guide += `<line x1="${f(v * W)}" y1="0" x2="${f(v * W)}" y2="${H}"/>`; });
      if (c.y) c.y.forEach((v) => { guide += `<line x1="0" y1="${f(v * H)}" x2="${W}" y2="${f(v * H)}"/>`; });
    });
    if (av) guide += `<circle cx="${f(av.x)}" cy="${f(av.y)}" r="${f(av.r)}" fill="${txt}" fill-opacity="0.1"/>`;
    guide += `</g>` + lab(sx + u * 0.3, sy > u * 1.2 ? sy - u * 0.35 : sy + u * 0.8, "SAFE TEXT AREA");
    R.crop.forEach((c) => {
      if (c.x) guide += lab(c.x[0] * W + u * 0.3, H - u * 0.5, c.label);
      if (c.y) guide += lab(u * 0.5, c.y[0] * H - u * 0.35, c.label);
    });
    if (av) guide += lab(av.x, av.y - av.r - u * 0.4, "PROFILE PHOTO", "middle");
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs>${back}${deco}${type}${guide}</svg>`;
}
