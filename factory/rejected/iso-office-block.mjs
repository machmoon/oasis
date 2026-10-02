// Glass Quarter: an isometric office block diorama with stepped glass towers, a fountain plaza with planters, a coffee kiosk and rooftop solar.
export const meta = {
  title: "Glass Quarter",
  kind: "illustration",
  description: "A toy-like isometric office block: three stepped glass towers around a fountain plaza with planters, a coffee kiosk, café tables, commuters, a tree-lined verge and rooftop solar. Use it for SaaS heroes, careers pages and workplace decks.",
  tags: ["isometric", "office", "skyscraper", "diorama", "city", "business", "hero", "3d"],
  price: 10,
  author: "oasis-factory",
  credit: "Isometric projection and lighting after jdan/isomer (MIT)",
  size: [1600, 1100],
};

export const params = {
  knobs: {
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#E6ECF2" },
    glass: { type: "color", role: "primary", label: "Glass tint", default: "#4E8FB8" },
    stripe: { type: "color", role: "secondary", label: "Accent stripe", default: "#F2643D" },
    kiosk: { type: "color", role: "highlight", label: "Kiosk & umbrellas", default: "#F2B33D" },
    time: { type: "choice", label: "Time", default: "day", options: ["day", "dusk", "night"] },
    facade: { type: "choice", label: "Facade", default: "grid", options: ["grid", "ribbon", "fins"] },
    towers: { type: "range", label: "Towers", default: 3, min: 2, max: 3, step: 1 },
    height: { type: "range", label: "Tower height", default: 10, min: 6, max: 16, step: 1 },
    plaza: { type: "range", label: "Plaza life", default: 3, min: 1, max: 5, step: 1 },
    seed: { type: "range", label: "Arrangement", default: 7, min: 1, max: 99, step: 1 },
  },
  presets: {
    Harbour: { backdrop: "#E4F0EE", glass: "#2F8F8A", stripe: "#FF7A59", kiosk: "#FFC857" },
    Copper: { backdrop: "#F4ECE4", glass: "#6B7F8E", stripe: "#C8642E", kiosk: "#2F6B4F" },
    Blush: { backdrop: "#FBEFF1", glass: "#8C6BB0", stripe: "#FF5C8A", kiosk: "#FFB347" },
    Midnight: { backdrop: "#12161F", glass: "#5B7CFA", stripe: "#B4FF39", kiosk: "#00D1FF" },
  },
};

function hexRgb(h) { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); }
function rgbHex(r, g, b) { return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join(""); }
function toHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function fromHsl(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function lighten(hex, amt) { const [h, s, l] = toHsl(hexRgb(hex)); return rgbHex(...fromHsl(h, s, clamp(l + amt, 0, 1))); }
function harm(hex, s0, s1, l0, l1) { const [h, s, l] = toHsl(hexRgb(hex)); return rgbHex(...fromHsl(h, s < 0.05 ? s : clamp(s, s0, s1), clamp(l, l0, l1))); }
function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(...A.map((v, i) => v + (B[i] - v) * t)); }
function lum(hex) { const [r, g, b] = hexRgb(hex); return (r * 299 + g * 587 + b * 114) / 1000; }
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export default function render(p) {
  const W = 1600, H = 1100, J = (v) => v.toFixed(1);
  const rT = rng(p.seed * 9973 + 17), rP = rng(p.seed * 7919 + 3), rH = rng(p.seed * 613 + 29), rS = rng(p.seed * 131 + 7), rV = rng(p.seed * 271 + 11);
  const hash = (a, b, c, d) => { let h = Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791) ^ Math.imul(d, 1640531513) ^ Math.imul(p.seed, 1013904223); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const night = p.time === "night", dusk = p.time === "dusk", dark = lum(p.backdrop) < 110;
  // glass: brand hue pulled toward steel, saturation and lightness clamped into a believable glazing range
  const gm = toHsl(hexRgb(mix(p.glass, "#5E7E98", 0.4))), warmHue = gm[0] > 0.09 && gm[0] < 0.43;
  const g0 = rgbHex(...fromHsl(gm[0], gm[1] < 0.05 ? gm[1] : clamp(gm[1], 0.1, warmHue ? 0.2 : 0.36), clamp(gm[2], dark ? 0.34 : 0.38, dark ? 0.46 : 0.5)));
  const stripe = harm(p.stripe, 0.3, 0.68, 0.46, 0.6), kc = harm(p.kiosk, 0.3, 0.65, 0.48, 0.62);
  const frame = dark ? mix(g0, "#C4CCD6", 0.72) : mix(g0, "#F3F5F8", 0.84), stone = mix(frame, "#9AA2AD", 0.45);
  const paving = dark ? mix(p.backdrop, "#A7AFBC", 0.5) : mix("#DADFE5", p.backdrop, 0.12), walk = mix(paving, g0, 0.18);
  const verge = dark ? "#55805A" : "#9CC287", slabC = dark ? mix(p.backdrop, "#5C6678", 0.45) : mix(p.backdrop, "#97A0AD", 0.6);
  const litP = night ? 0.5 : dusk ? 0.2 : 0, lvl = clamp(Math.round(p.plaza), 1, 5), n = Math.round(p.towers);
  const L = 11.6, D = 11.2, slabH = 0.55, FH = 0.42, HF = clamp(Math.round(p.height), 6, 16), M = 0.9 + (HF - 6) * 0.12;

  const flank = rT() < 0.5;
  const f1 = Math.max(3, Math.min(Math.round(HF * 0.68), HF - 3)), f2 = Math.max(2, Math.min(Math.round(HF * 0.42), f1 - 2));
  const defs = [[7.2, 7.2, 3.3, 3.2, "y", HF], [7.8, 0.6, 2.8, 2.9, "x", flank ? f1 : f2], [0.6, 7.6, 2.6, 2.7, "y", flank ? f2 : f1]];
  const T = defs.slice(0, n).map(([x, y, w, d, ent, fl], i) => ({ x, y, w, d, ent, fl, g: lighten(g0, (i - 1) * 0.03) }));
  for (const t of T) { t.zw = 0.82 + t.fl * FH; t.zt = t.zw + 0.3; }

  const pr = (x, y, z) => [(x - y) * 0.866, -(x + y) * 0.5 - z];
  const bp = [], e0 = -M - 0.4, eL = L + M + 0.4, eD = D + M + 0.4;
  for (const [x, y] of [[e0, e0], [eL, e0], [e0, eD], [eL, eD]]) bp.push(pr(x, y, -slabH), pr(x, y, 2));
  for (const t of T) for (const [x, y] of [[t.x, t.y], [t.x + t.w, t.y], [t.x, t.y + t.d], [t.x + t.w, t.y + t.d]]) bp.push(pr(x, y, t.zt + 1.1));
  const xs = bp.map((q) => q[0]), ys = bp.map((q) => q[1]);
  const X0 = Math.min(...xs), X1 = Math.max(...xs), Y0 = Math.min(...ys), Y1 = Math.max(...ys);
  const S = Math.min((W - 180) / (X1 - X0), (H - 170) / (Y1 - Y0));
  const ox = W / 2 - (S * (X0 + X1)) / 2, oy = H / 2 - (S * (Y0 + Y1)) / 2 - 6;
  const P = (x, y, z) => { const [a, b] = pr(x, y, z); return [ox + a * S, oy + b * S]; };
  const pts = (a) => a.map((q) => P(...q).map((v) => v.toFixed(1)).join(",")).join(" ");
  const tint = (h) => (h[0] === "!" ? h.slice(1) : night ? mix(lighten(h, -0.1), "#141A36", 0.5) : dusk ? mix(h, "#7A4A5C", 0.14) : h);
  const poly = (a, f, x = "") => `<polygon points="${pts(a)}" fill="${tint(f)}"${x}/>`;
  const LV = (() => { const v = [2, -1, 3], m = Math.hypot(...v); return v.map((c) => c / m); })();
  const shade = (hex, nn) => (hex[0] === "!" ? hex : lighten(hex, 0.2 * (nn[0] * LV[0] + nn[1] * LV[1] + nn[2] * LV[2])));
  const fy = (xa, xb, yy, za, zb, f, x) => poly([[xa, yy, za], [xb, yy, za], [xb, yy, zb], [xa, yy, zb]], f, x);
  const fx = (ya, yb, xx, za, zb, f, x) => poly([[xx, ya, za], [xx, yb, za], [xx, yb, zb], [xx, ya, zb]], f, x);
  const flat = (x0, y0, x1, y1, z, f, x) => poly([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], f, x);
  function box(x, y, z, dx, dy, dz, c, edge = true) {
    const st = edge ? ` stroke="${tint(lighten(c, -0.16))}" stroke-width="0.6" stroke-linejoin="round"` : "";
    return fx(y, y + dy, x, z, z + dz, shade(c, [-1, 0, 0]), st) + fy(x, x + dx, y, z, z + dz, shade(c, [0, -1, 0]), st) + flat(x, y, x + dx, y + dy, z + dz, shade(c, [0, 0, 1]), st);
  }
  const items = [], add = (k, s) => items.push([k, s]);
  const greens = ["#5E9E62", "#4F8A55", "#77B36F"];
  const blobs = (rr, x, y, z0, z1, k) => {
    const b = [];
    for (let i = 0; i < k; i++) b.push([x + rr() * 0.42, y + rr() * 0.42, z0 + rr() * (z1 - z0), 0.26 + rr() * 0.14]);
    b.sort((a, c) => c[0] + c[1] - (a[0] + a[1]) || a[2] - c[2]);
    return b.map(([bx, by, bz, bs]) => box(bx, by, bz, bs, bs, bs, greens[Math.floor(rr() * 3)])).join("");
  };
  const tree = (rr, x, y) => box(x + 0.34, y + 0.34, 0.12, 0.12, 0.12, 0.78, "#7A5A43") + blobs(rr, x, y, 0.85, 1.45, 8);

  // ---------- towers ----------
  function tower(t, ti) {
    const { x, y, w, d, fl, zw, zt, g } = t, z0 = 0.12, zp = 0.82, st = p.facade;
    let s = box(x, y, z0, w, d, zt - z0, frame);
    const gx = st === "grid" ? 0.08 : st === "ribbon" ? 0 : 0.05, gz = st === "grid" ? 0.1 : st === "ribbon" ? 0.2 : 0.02;
    const off = Math.floor(rT() * 9), lob = night ? "!#FFCF7A" : mix(g, "#1C2430", 0.45);
    s += fy(x + 0.3, x + w - 0.12, y - 0.003, z0 + 0.06, zp - 0.14, shade(lob, [0, -1, 0])) + fx(y + 0.3, y + d - 0.12, x - 0.003, z0 + 0.06, zp - 0.14, shade(lob, [-1, 0, 0]));
    for (const side of ["y", "x"]) {
      const si = side === "y" ? 0 : 1, len = side === "y" ? w : d, a0 = (side === "y" ? x : y) + 0.3, usable = len - 0.42;
      const cols = Math.max(2, Math.round(usable / 0.56)), cw = usable / cols, nrm = side === "y" ? [0, -1, 0] : [-1, 0, 0];
      const F = (a, b, za, zb, f) => (side === "y" ? fy(a, b, y - 0.004, za, zb, f) : fx(a, b, x - 0.004, za, zb, f));
      let lit = "";
      for (let f = 0; f < fl; f++) {
        const sh = Math.floor(hash(ti, si, f, 5) * 2);
        for (let c = 0; c < cols; c++) {
          const a = a0 + c * cw + gx / 2, b = a + cw - gx, za = zp + f * FH + gz / 2, zb = za + FH - gz;
          const on = litP && hash(ti * 2 + si, f, Math.floor((c + sh) / 2), 11) < litP * (1 - (0.3 * f) / fl) && hash(ti * 2 + si, f, c, 13) > 0.2;
          if (on) lit += F(a, b, za, zb, "!" + mix("#FFD58A", "#FFF1CC", hash(ti, si * 31 + f, c, 17) * 0.7));
          else { const streak = (((f - c * 2 + off) % 9) + 9) % 9 < 2 ? 0.06 : 0; s += F(a, b, za, zb, shade(lighten(g, (0.1 * f) / fl - 0.04 + streak), nrm)); }
        }
      }
      if (lit) s += night ? `<g filter="url(#glow)" opacity="0.5">${lit}</g>${lit}` : lit;
      if (st === "fins") for (let c = cols; c >= 0; c--) {
        const b = a0 + c * cw, fc = lighten(frame, 0.03);
        s += side === "y" ? box(b - 0.035, y - 0.3, zp - 0.04, 0.07, 0.3, zw - zp + 0.08, fc) : box(x - 0.3, b - 0.035, zp - 0.04, 0.3, 0.07, zw - zp + 0.08, fc);
      }
      const sc = shade(stripe, nrm), s0 = side === "y" ? x : y, s1 = side === "y" ? x + w : y + d;
      s += F(s0, s0 + 0.16, zp - 0.04, zt, sc) + F(s0, s1, zw + 0.09, zw + 0.2, sc) + F(s0, s1, zp - 0.08, zp - 0.02, sc);
    }
    const cx = x + w / 2, cy = y + d / 2, ctop = shade(stripe, [0, 0, 1]);
    if (t.ent === "y") s += fy(cx - 0.3, cx + 0.3, y - 0.006, z0, z0 + 0.55, "#2A303A") + fy(cx - 0.55, cx + 0.55, y - 0.45, 0.68, 0.73, shade(stripe, [0, -1, 0])) + flat(cx - 0.55, y - 0.45, cx + 0.55, y, 0.73, ctop);
    else s += fx(cy - 0.3, cy + 0.3, x - 0.006, z0, z0 + 0.55, "#2A303A") + fx(cy - 0.55, cy + 0.55, x - 0.45, 0.68, 0.73, shade(stripe, [-1, 0, 0])) + flat(x - 0.45, cy - 0.55, x, cy + 0.55, 0.73, ctop);
    const top = zt + 0.002, px = x + w - 1.05, py = y + d - 1.05;
    s += flat(x + 0.12, y + 0.12, x + w - 0.12, y + d - 0.12, top, lighten(frame, -0.12)) + box(px, py, zt, 0.8, 0.8, 0.4, lighten(frame, -0.04));
    if (ti === 0) {
      s += box(px + 0.37, py + 0.37, zt + 0.4, 0.06, 0.06, 0.65, "#8A919C", false);
      const [bx, by] = P(px + 0.4, py + 0.4, zt + 1.08);
      s += `<circle cx="${J(bx)}" cy="${J(by)}" r="${J(Math.max(2, S * 0.05))}" fill="#FF5A4E"${night ? ' filter="url(#glow)"' : ""}/>`;
    }
    for (let yy = y + d - 0.65; yy >= y + 0.2; yy -= 0.62) for (let xx = x + w - 0.68; xx >= x + 0.24; xx -= 0.5) {
      if (xx + 0.44 > px - 0.08 && yy + 0.44 > py - 0.08) continue;
      s += poly([[xx, yy, zt + 0.06], [xx + 0.44, yy, zt + 0.06], [xx + 0.44, yy + 0.44, zt + 0.26], [xx, yy + 0.44, zt + 0.26]], shade("#2E4170", [0, -0.6, 0.8]), ` stroke="${tint("#8FA3C8")}" stroke-width="0.5"`);
      s += `<polyline points="${pts([[xx + 0.22, yy, zt + 0.06], [xx + 0.22, yy + 0.44, zt + 0.26]])}" stroke="${tint("#6F84AE")}" stroke-width="0.5" fill="none"/>`;
    }
    return s;
  }
  T.forEach((t, i) => add(t.x + t.w / 2 + t.y + t.d / 2, tower(t, i)));

  // ---------- plaza: fixed layout and occupancy, independent of tower height ----------
  const occ = [], hit = (a, g) => occ.some((o) => a[0] < o[2] + g && a[2] > o[0] - g && a[1] < o[3] + g && a[3] > o[1] - g);
  const hidden = (x, y) => T.some((t) => x + y > t.x + t.y && x - y > t.x - t.y - t.d - 0.5 && x - y < t.x + t.w - t.y + 0.5);
  const conn = [];
  for (const t of T) {
    occ.push([t.x - 0.25, t.y - 0.25, t.x + t.w + 0.25, t.y + t.d + 0.25]);
    const cx = t.x + t.w / 2, cy = t.y + t.d / 2;
    conn.push(t.ent === "y" ? [cx - 0.6, 6, cx + 0.6, t.y] : [6, cy - 0.6, t.x, cy + 0.6]);
  }
  occ.push([4, 0, 6, D], [0, 4, L, 6], ...conn);
  const lawn = n < 3 ? [0.4, 7.2, 3.8, 10.8] : null;
  if (lawn) occ.push(lawn);

  let fs = box(4.35, 4.35, 0.12, 1.3, 1.3, 0.22, stone) + flat(4.47, 4.47, 5.53, 5.53, 0.34, mix(g0, "#CFEAF5", 0.55)) + box(4.9, 4.9, 0.34, 0.2, 0.2, 0.12, stone);
  const [jx, jy0] = P(5, 5, 0.46), [, jy1] = P(5, 5, 1.1);
  fs += `<path d="M${J(jx)},${J(jy0)} L${J(jx)},${J(jy1)} q${J(-S * 0.3)},${J(-S * 0.05)} ${J(-S * 0.42)},${J(S * 0.5)} M${J(jx)},${J(jy1)} q${J(S * 0.3)},${J(-S * 0.05)} ${J(S * 0.42)},${J(S * 0.5)}" stroke="${tint("#FFFFFF")}" stroke-width="${J(Math.max(1.5, S * 0.045))}" stroke-linecap="round" fill="none" opacity="0.85"/>`;
  add(10, fs);

  // coffee kiosk: cream body, brand skirt, striped awning, roof slab and a big cup sign
  const kx = 1.2, ky = 2.25, kw = 2.3, kd = 1.35, kz = 1.15, cream = dark ? "#E8E2D8" : "#F3EEE6";
  occ.push([1.0, 1.4, 3.7, 3.8]);
  let ks = box(kx, ky, 0.12, kw, kd, kz - 0.12, cream);
  ks += fy(kx, kx + kw, ky - 0.003, 0.12, 0.44, shade(kc, [0, -1, 0])) + fx(ky, ky + kd, kx - 0.003, 0.12, 0.44, shade(kc, [-1, 0, 0]));
  ks += fy(kx + 0.25, kx + kw - 0.25, ky - 0.005, 0.56, 0.98, night ? "!#FFCF7A" : "#2B3240") + box(kx + 1.35, ky + 0.02, 0.58, 0.4, 0.12, 0.26, "#C9CDD3", false);
  ks += box(kx + 0.15, ky - 0.26, 0.5, kw - 0.3, 0.26, 0.06, "#F7F7F5") + fx(ky + 0.22, ky + kd - 0.22, kx - 0.005, 0.56, 0.98, "#2F3540");
  for (let k = 0; k < 3; k++) ks += fx(ky + 0.34, ky + kd - 0.5 + (k === 1 ? 0.14 : 0), kx - 0.007, 0.86 - k * 0.1, 0.9 - k * 0.1, "#E9EBEE");
  for (let i = 0; i < 8; i++) { const xa = kx + 0.08 + (i * (kw - 0.16)) / 8, xb = xa + (kw - 0.16) / 8; ks += poly([[xa, ky, 1.08], [xb, ky, 1.08], [xb, ky - 0.5, 0.9], [xa, ky - 0.5, 0.9]], shade(i % 2 ? "#F7F7F5" : kc, [0, -0.7, 0.7])); }
  ks += fy(kx + 0.08, kx + kw - 0.08, ky - 0.5, 0.82, 0.9, shade(kc, [0, -1, 0])) + box(kx - 0.08, ky - 0.08, kz, kw + 0.16, kd + 0.16, 0.1, kc);
  const [cx0, cy0] = P(kx + kw / 2, ky + kd / 2, kz + 0.1), u = S * 0.6, ol = ` stroke="${tint(lighten(kc, -0.32))}" stroke-width="${J(Math.max(1, S * 0.028))}" stroke-linejoin="round"`;
  const cupW = (t) => 0.36 + 0.14 * t, cyT = (t) => cy0 - 0.1 * u - 1.3 * u * t, band = (a, b, f) => `<path d="M${J(cx0 - cupW(a) * u)},${J(cyT(a))} L${J(cx0 + cupW(a) * u)},${J(cyT(a))} L${J(cx0 + cupW(b) * u)},${J(cyT(b))} L${J(cx0 - cupW(b) * u)},${J(cyT(b))}Z" fill="${tint(f)}"${ol}/>`;
  ks += `<ellipse cx="${J(cx0)}" cy="${J(cy0)}" rx="${J(0.5 * u)}" ry="${J(0.16 * u)}" fill="#000" opacity="0.15"/>` + band(0, 1, "#FFFFFF") + band(0.3, 0.68, lighten(kc, -0.1));
  ks += `<rect x="${J(cx0 - 0.58 * u)}" y="${J(cyT(1) - 0.22 * u)}" width="${J(1.16 * u)}" height="${J(0.24 * u)}" rx="${J(0.08 * u)}" fill="${tint("#3B302B")}"/><rect x="${J(cx0 - 0.4 * u)}" y="${J(cyT(1) - 0.34 * u)}" width="${J(0.8 * u)}" height="${J(0.14 * u)}" rx="${J(0.06 * u)}" fill="${tint("#3B302B")}"/>`;
  for (const dx of [-0.2, 0.18]) ks += `<path d="M${J(cx0 + dx * u)},${J(cyT(1) - 0.45 * u)} q${J(0.18 * u)},${J(-0.2 * u)} 0,${J(-0.4 * u)} q${J(-0.18 * u)},${J(-0.2 * u)} 0,${J(-0.4 * u)}" stroke="${dark || night ? "#FFFFFF" : mix(p.backdrop, "#5A6170", 0.55)}" stroke-width="${J(Math.max(1.4, S * 0.04))}" fill="none" stroke-linecap="round" opacity="0.6"/>`;
  add(kx + kw / 2 + ky + kd / 2, ks);

  for (const [tx, ty] of [[0.75, 0.75], [3.3, 0.75]].slice(0, lvl > 1 ? 2 : 1)) {
    occ.push([tx - 0.55, ty - 0.55, tx + 0.55, ty + 0.55]);
    const h = 0.5, zb = 1.05, c = [[tx - h, ty - h, zb], [tx + h, ty - h, zb], [tx + h, ty + h, zb], [tx - h, ty + h, zb]], A = [tx, ty, 1.32];
    let s = box(tx - 0.45, ty - 0.08, 0.12, 0.14, 0.16, 0.24, "#9AA0A8") + box(tx - 0.03, ty - 0.03, 0.12, 0.06, 0.06, 0.38, "#7E858F") + box(tx - 0.25, ty - 0.25, 0.5, 0.5, 0.5, 0.05, "#E9EBEE");
    s += box(tx + 0.3, ty - 0.08, 0.12, 0.14, 0.16, 0.24, "#9AA0A8") + box(tx - 0.02, ty - 0.02, 0.55, 0.04, 0.04, 0.6, "#C9CDD3", false);
    s += poly([c[2], c[3], A], shade("#F7F7F5", [0, 0.6, 0.8])) + poly([c[1], c[2], A], shade(kc, [0.6, 0, 0.8])) + poly([c[3], c[0], A], shade("#F7F7F5", [-0.6, 0, 0.8])) + poly([c[0], c[1], A], shade(kc, [0, -0.6, 0.8]));
    add(tx + ty, s);
  }

  for (const [lx, ly] of [[3.7, 0.3], [6.15, 0.3], [0.3, 3.7], [0.3, 6.15], [3.7, 6.15], [6.15, 6.15], [3.7, 3.7], [11.1, 3.7], [3.7, 10.7]]) {
    const rc = [lx - 0.1, ly - 0.1, lx + 0.2, ly + 0.2];
    if (hit(rc, 0.02) || hidden(lx, ly)) continue;
    occ.push(rc);
    let s = box(lx - 0.04, ly - 0.04, 0.12, 0.16, 0.16, 0.08, "#4A505B") + box(lx, ly, 0.2, 0.08, 0.08, 1.0, "#5D6470");
    s += box(lx - 0.05, ly - 0.05, 1.2, 0.18, 0.18, 0.2, night || dusk ? "!#FFD58A" : "#F6EED8") + box(lx - 0.07, ly - 0.07, 1.4, 0.22, 0.22, 0.05, "#4A505B");
    if (night || dusk) { const [gx, gy] = P(lx + 0.04, ly + 0.04, 1.3); s += `<circle cx="${J(gx)}" cy="${J(gy)}" r="${J(S * 0.7)}" fill="url(#lamp)" opacity="${night ? 1 : 0.45}"/>`; }
    add(lx + ly + 0.08, s);
  }

  if (lawn) for (const [ax, ay] of [[0.9, 7.6], [2.6, 7.8], [1.4, 9.3], [2.9, 9.6]]) { const x = ax + (rP() - 0.5) * 0.3, y = ay + (rP() - 0.5) * 0.3; add(x + y + 0.8, tree(rP, x, y)); }

  // tree-lined verge: the plate grows with the towers so tall blocks never crowd the plaza
  const vf = -M / 2 - 0.4, vbx = L + M / 2 - 0.4, vby = D + M / 2 - 0.4, vt = [[vf, vf]];
  for (let a = 0.3; a < L - 0.5; a += 1.8) if (a + 0.8 < 3.8 || a > 6.2) vt.push([a, vf], [a, vby]);
  for (let a = 0.3; a < D - 0.5; a += 1.8) if (a + 0.8 < 3.8 || a > 6.2) vt.push([vf, a], [vbx, a]);
  for (const [x, y] of vt) if (!hidden(x + 0.4, y + 0.4)) add(x + y + 0.8, tree(rV, x, y));

  // planters on paving tiles: walkway edges first, never adjacent, count from Plaza life
  const tiles = [];
  for (let i = 0; i < L - 0.9; i++) for (let j = 0; j < D - 0.9; j++) {
    if (hit([i + 0.1, j + 0.1, i + 0.9, j + 0.9], 0.05) || hidden(i + 0.5, j + 0.5)) continue;
    tiles.push([i, j, (i === 3 || i === 6 || j === 3 || j === 6 ? 0 : 1) + hash(i, j, 3, 1) * 0.9]);
  }
  tiles.sort((a, b) => a[2] - b[2]);
  const chosen = [], want = [3, 6, 9, 13, 17][lvl - 1];
  for (const [i, j] of tiles) {
    if (chosen.length >= want) break;
    if (chosen.some(([a, b]) => Math.abs(a - i) <= 1 && Math.abs(b - j) <= 1)) continue;
    chosen.push([i, j]);
    const x = i + 0.1, y = j + 0.1, ty = hash(i, j, 9, 2);
    occ.push([x, y, x + 0.8, y + 0.8]);
    let s = box(x, y, 0.12, 0.8, 0.8, 0.3, stone) + flat(x + 0.07, y + 0.07, x + 0.73, y + 0.73, 0.423, "#6B5444");
    if (ty < 0.5) s += box(x + 0.34, y + 0.34, 0.42, 0.12, 0.12, 0.55, "#7A5A43") + blobs(rP, x + 0.03, y + 0.03, 0.9, 1.4, 7);
    else if (ty < 0.78) s += blobs(rP, x + 0.05, y + 0.05, 0.42, 0.6, 4);
    else { s += blobs(rP, x + 0.06, y + 0.06, 0.42, 0.48, 3); for (let k = 0; k < 6; k++) s += box(x + 0.12 + rP() * 0.5, y + 0.12 + rP() * 0.5, 0.8 + rP() * 0.1, 0.09, 0.09, 0.09, [kc, stripe, "#FFFFFF"][k % 3], false); }
    add(x + y + 0.8, s);
  }

  // commuters and customers, toy-scaled so they read at hero size
  const skins = ["#F1C7A5", "#D9A47E", "#B07A55", "#8A5A3C", "#5E3B28"], hairs = ["#2B2420", "#5A3A22", "#1E1B1A", "#9A7B55", "#C9C2B8"];
  const shirts = [stripe, kc, "#F4F5F7", "#3D4654", mix(g0, "#FFFFFF", 0.4), lighten(stripe, 0.12)];
  const person = (x, y, k) => box(x, y, 0.12, 0.18, 0.13, 0.3, "#363B46") + box(x - 0.03, y - 0.03, 0.42, 0.24, 0.19, 0.3, shirts[k % 6]) + box(x + 0.025, y, 0.72, 0.13, 0.13, 0.14, skins[(k * 3 + p.seed) % 5]) + box(x + 0.02, y - 0.005, 0.86, 0.14, 0.14, 0.045, hairs[(k * 2 + p.seed) % 5]);
  const ppl = [[1.75, 1.4], [2.55, 1.5]].slice(0, lvl > 1 ? 2 : 1);
  ppl.forEach(([x, y], k) => add(x + y + 0.15, person(x, y, k + 3)));
  const walkers = lvl * 2 + ppl.length;
  for (let tries = 0; tries < 300 && ppl.length < walkers; tries++) {
    const bandX = rH() < 0.5, x = bandX ? 0.3 + rH() * (L - 0.6) : 4.25 + rH() * 1.4, y = bandX ? 4.25 + rH() * 1.4 : 0.3 + rH() * (D - 0.6);
    if ((x > 4.1 && x < 5.9 && y > 4.1 && y < 5.9) || hidden(x, y) || occ.slice(0, T.length).some((o) => x > o[0] && x < o[2] && y > o[1] && y < o[3])) continue;
    if (ppl.some(([a, b]) => Math.hypot(a - x, b - y) < 0.9)) continue;
    ppl.push([x, y]);
    add(x + y + 0.15, person(x, y, ppl.length));
  }

  // ---------- base slab, verge, paving and walkways ----------
  let base = box(e0, e0, -slabH, L + 2 * M + 0.8, D + 2 * M + 0.8, slabH, slabC) + box(-M, -M, 0, L + 2 * M, D + 2 * M, 0.12, verge, false);
  base += flat(0, 0, L, D, 0.121, paving, ` stroke="${tint(lighten(paving, -0.12))}" stroke-width="1.2"`);
  const gl = tint(lighten(paving, -0.06)), ws = ` stroke="${tint(lighten(walk, -0.1))}" stroke-width="1"`;
  for (let i = 1; i < L; i++) base += `<polyline points="${pts([[i, 0, 0.122], [i, D, 0.122]])}" stroke="${gl}" stroke-width="0.7" fill="none"/>`;
  for (let j = 1; j < D; j++) base += `<polyline points="${pts([[0, j, 0.122], [L, j, 0.122]])}" stroke="${gl}" stroke-width="0.7" fill="none"/>`;
  base += flat(4, -M, 6, D + M, 0.123, walk, ws) + flat(-M, 4, L + M, 6, 0.124, walk, ws);
  for (const c of conn) base += flat(c[0], c[1], c[2], c[3], 0.124, walk, ws);
  if (lawn) base += flat(lawn[0], lawn[1], lawn[2], lawn[3], 0.125, verge, ` stroke="${tint(lighten(verge, -0.1))}" stroke-width="1.2"`);

  items.sort((a, b) => b[0] - a[0]);
  const sky = night ? mix(p.backdrop, "#0E1426", 0.65) : dusk ? mix(p.backdrop, "#EFB59C", 0.38) : p.backdrop;
  const skyTop = night ? lighten(sky, 0.07) : dusk ? mix(sky, "#FFD9B8", 0.4) : lighten(sky, 0.04);
  let stars = "";
  if (night) for (let i = 0; i < 60; i++) stars += `<circle cx="${(rS() * W).toFixed(0)}" cy="${(rS() * H * 0.45).toFixed(0)}" r="${(0.7 + rS() * 1.1).toFixed(1)}" fill="#FFFFFF" opacity="${(0.25 + rS() * 0.5).toFixed(2)}"/>`;
  const [cxs, cys] = P(L / 2, D / 2, -slabH), span = L + 2 * M;
  const shCol = dark || night ? "#000000" : mix(sky, "#2A3140", 0.5), shOp = dark || night ? 0.4 : 0.28;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
<radialGradient id="bg" cx="50%" cy="38%" r="65%"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${sky}"/></radialGradient>
<radialGradient id="lamp"><stop offset="0" stop-color="#FFD58A" stop-opacity="0.8"/><stop offset="1" stop-color="#FFD58A" stop-opacity="0"/></radialGradient>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.8"/></filter>
<filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="${J(S * 0.45)}"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>${stars}
<ellipse cx="${J(cxs)}" cy="${J(cys + S * span * 0.36)}" rx="${J(S * span * 0.8)}" ry="${J(S * span * 0.2)}" fill="${shCol}" opacity="${shOp}" filter="url(#soft)"/>
${base}${items.map((i) => i[1]).join("")}
</svg>`;
}
