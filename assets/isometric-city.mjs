// Pocket City Block: a seeded isometric city block with windows, rooftops, awnings, lamps and park trees on a floating tile.
export const meta = {
  title: "Pocket City Block",
  kind: "illustration",
  description: "A tiny seeded isometric city block with lit windows, rooftops, awnings and park trees, for hero spots, empty states and onboarding art.",
  tags: ["isometric", "city", "buildings", "urban", "architecture", "night", "hero", "diorama"],
  price: 10,
  author: "oasis-factory",
  size: [800, 800],
};

export const params = {
  knobs: {
    sky: { type: "color", label: "Sky", default: "#CFE6EE" },
    facade: { type: "color", label: "Facades", default: "#F1E6D4" },
    accent: { type: "color", label: "Roofs & awnings", default: "#E0674E" },
    foliage: { type: "color", label: "Foliage", default: "#5FA36F" },
    glow: { type: "color", label: "Window light", default: "#FFE7A8" },
    roofs: { type: "choice", label: "Roofs", default: "mixed", options: ["flat", "mixed", "gabled"] },
    grid: { type: "range", label: "Block size", default: 3, min: 2, max: 5, step: 1 },
    variance: { type: "range", label: "Height variance", default: 55, min: 0, max: 100, step: 5 },
    seed: { type: "range", label: "Seed", default: 7, min: 1, max: 200, step: 1 },
    lights: { type: "toggle", label: "Window lights", default: true },
  },
  presets: {
    Day: { sky: "#CFE6EE", facade: "#F1E6D4", accent: "#E0674E", foliage: "#5FA36F", glow: "#FFE7A8" },
    Dusk: { sky: "#E59C84", facade: "#B79BB0", accent: "#5D4B7D", foliage: "#4F7C66", glow: "#FFC46B" },
    Night: { sky: "#141B33", facade: "#3E4A6E", accent: "#8C4A63", foliage: "#2F5A4E", glow: "#FFD27A" },
    Mint: { sky: "#E8F1EA", facade: "#F4EFE6", accent: "#2F6B4F", foliage: "#86C39A", glow: "#FFE9A8" },
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

const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const A = hx(a), B = hx(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
const lum = (h) => { const c = hx(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SPOTS = [[[0.5, 0.5]], [[0.32, 0.36], [0.66, 0.64]], [[0.3, 0.3], [0.72, 0.38], [0.42, 0.72]]];

export default function render(p) {
  const S = 800, N = p.grid, m = 0.62, T = 0.36, L = N + 2 * m, K = 300 / L, cx = S / 2;
  const r = rng(p.seed * 9973 + N * 131), rw = rng(p.seed * 31 + 7), rs = rng(p.seed * 17 + 3);
  const skyL = lum(p.sky), dark = skyL < 0.4, v = p.variance / 100;
  const shd = mix("#1B1E33", p.sky, 0.25), gl = mix(p.sky, shd, 0.45);
  const frac = p.lights ? 0.08 + 0.68 * (1 - skyL) : 0;
  const walk = mix(mix(p.facade, "#FFFFFF", 0.35), p.sky, 0.15), road = mix(shd, p.facade, 0.3);
  const soil = mix(mix(p.facade, p.accent, 0.4), shd, 0.45);
  const tones = [p.facade, mix(p.facade, p.accent, 0.22), mix(p.facade, "#FFFFFF", 0.28), mix(p.facade, shd, 0.12)];
  const sh3 = (c) => [mix(c, "#FFFFFF", 0.22), c, mix(c, shd, 0.32)];

  const cells = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cells.push({ i, j });
  const parks = Math.max(1, Math.round(N * N * 0.18));
  for (let k = 0; k < parks; k++) {
    let c;
    do { c = cells[Math.floor(r() * cells.length)]; } while (c.park);
    c.park = true;
  }
  let topU = 0;
  for (const c of cells) {
    const i = c.i, j = c.j;
    if (c.park) {
      const nt = 1 + Math.floor(r() * 3);
      c.trees = SPOTS[nt - 1].map((s) => ({ x: i + s[0] + (r() - 0.5) * 0.08, y: j + s[1] + (r() - 0.5) * 0.08, s: 0.85 + r() * 0.3, cone: r() < 0.3 }));
      for (const t of c.trees) topU = Math.min(topU, (t.x + t.y + 2 * m) / 2 - 0.05 - 0.9 * t.s);
      c.trees.sort((a, b) => a.x + a.y - b.x - b.y);
    } else {
      const ins = 0.1 + r() * 0.06, h = clamp(1.2 * (1 + v * (r() * 2.2 - 0.7)), 0.5, 3.2);
      const sl = h > 2.2 ? 0.06 : 0, gr = r();
      const b = { x0: i + ins + sl, y0: j + ins + sl, x1: i + 1 - ins - sl, y1: j + 1 - ins - sl, h, tone: tones[Math.floor(r() * tones.length)], cols: 2 + Math.floor(r() * 2), rt: r() };
      b.gable = p.roofs === "gabled" || (p.roofs === "mixed" && h < 1.7 && gr < 0.6);
      b.rh = b.gable ? 0.36 * (b.y1 - b.y0) : 0;
      topU = Math.min(topU, (b.x0 + b.y0 + 2 * m) / 2 - h - (b.gable ? b.rh + 0.1 : h > 2.3 ? 0.58 : 0.48));
      c.b = b;
    }
  }
  cells.sort((a, b) => a.i + a.j - b.i - b.j || a.i - b.i);
  const oy = 410 - (K * (topU + L + T)) / 2;

  const pt = (x, y, z) => [cx + (x - y) * K, oy + ((x + y + 2 * m) * K) / 2 - z * K];
  const n = (val) => val.toFixed(1);
  const P = (ps, fill, ex = "") => `<polygon points="${ps.map((q) => { const s = pt(q[0], q[1], q[2]); return n(s[0]) + "," + n(s[1]); }).join(" ")}" fill="${fill}"${ex}/>`;
  const quad = (x0, y0, x1, y1, z, fill) => P([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], fill);
  const box = (x0, y0, x1, y1, z0, z1, c) =>
    P([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], c[2]) +
    P([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], c[1]) + quad(x0, y0, x1, y1, z1, c[0]);
  const line = (a, b, col, w) => `<line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}" stroke="${col}" stroke-width="${n(w)}" stroke-linecap="round"/>`;
  const circ = (c, rad, fill, ex = "") => `<circle cx="${n(c[0])}" cy="${n(c[1])}" r="${n(rad)}" fill="${fill}"${ex}/>`;

  const bld = (b) => {
    const { x0, y0, x1, y1, h } = b, [tp, lf, rf] = sh3(b.tone);
    const FL = (u, z) => [x0 + (x1 - x0) * u, y1, z], FR = (u, z) => [x1, y0 + (y1 - y0) * u, z];
    const face = (F, u0, u1, z0, z1, c) => P([F(u0, z0), F(u1, z0), F(u1, z1), F(u0, z1)], c);
    let s = face(FR, 0, 1, 0, h, rf) + face(FL, 0, 1, 0, h, lf);
    s += face(FR, 0, 1, h - 0.05, h, mix(rf, "#FFFFFF", 0.12)) + face(FL, 0, 1, h - 0.05, h, mix(lf, "#FFFFFF", 0.12));
    const fh = 0.24, base = 0.42, fl = Math.max(0, Math.floor((h - base - 0.1) / fh));
    for (const [F, fc] of [[FL, lf], [FR, rf]]) {
      const glass = mix(fc, gl, 0.6), slot = 0.76 / b.cols, w = slot * 0.56;
      for (let k = 0; k < fl; k++) for (let q = 0; q < b.cols; q++) {
        const ua = 0.12 + q * slot + (slot - w) / 2, za = base + k * fh + fh * 0.2;
        s += face(F, ua, ua + w, za, za + fh * 0.55, rw() < frac ? p.glow : glass);
      }
    }
    const shopLit = p.lights && rw() < 0.35 + frac;
    s += face(FL, 0.1, 0.9, 0.05, 0.26, shopLit ? mix(p.glow, lf, 0.15) : mix(lf, gl, 0.65));
    s += face(FR, 0.4, 0.6, 0, 0.27, mix(rf, shd, 0.45));
    const segs = 5, aw = (u, d, z) => [x0 + 0.05 + (x1 - x0 - 0.1) * u, y1 + d, z];
    for (let k = 0; k < segs; k++) {
      const u0 = k / segs, u1 = (k + 1) / segs, c = k % 2 ? mix(p.accent, "#FFFFFF", 0.6) : p.accent;
      s += P([aw(u0, 0, 0.35), aw(u1, 0, 0.35), aw(u1, 0.1, 0.28), aw(u0, 0.1, 0.28)], c);
      s += P([aw(u0, 0.1, 0.28), aw(u1, 0.1, 0.28), aw(u1, 0.1, 0.24), aw(u0, 0.1, 0.24)], mix(c, shd, 0.25));
    }
    if (b.gable) {
      const ym = (y0 + y1) / 2, z2 = h + b.rh, o = 0.04;
      s += P([[x0 - o, y0 - o, h - 0.02], [x1 + o, y0 - o, h - 0.02], [x1 + o, ym, z2], [x0 - o, ym, z2]], mix(p.accent, shd, 0.35));
      s += P([[x1, y0, h], [x1, y1, h], [x1, ym, z2]], mix(rf, "#FFFFFF", 0.06));
      s += P([[x0 - o, y1 + o, h - 0.02], [x1 + o, y1 + o, h - 0.02], [x1 + o, ym, z2], [x0 - o, ym, z2]], p.accent);
      s += circ(pt(x1, ym, h + b.rh * 0.38), K * 0.045, rw() < frac ? p.glow : mix(rf, gl, 0.6));
    } else {
      const e = 0.05, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      s += quad(x0, y0, x1, y1, h, tp) + quad(x0 + e, y0 + e, x1 - e, y1 - e, h, mix(tp, shd, 0.12));
      if (b.rt < 0.35) {
        const t0 = pt(mx - 0.06, my - 0.06, h), a = [t0[0], t0[1] - 0.1 * K], c2 = [t0[0], t0[1] - 0.34 * K];
        const rx = 0.12 * K, ry = rx * 0.5, leg = mix(rf, shd, 0.4), wood = mix(p.accent, p.facade, 0.35);
        s += line([t0[0] - rx * 0.6, t0[1]], [a[0] - rx * 0.6, a[1]], leg, K * 0.02) + line([t0[0] + rx * 0.6, t0[1]], [a[0] + rx * 0.6, a[1]], leg, K * 0.02);
        s += `<ellipse cx="${n(a[0])}" cy="${n(a[1])}" rx="${n(rx)}" ry="${n(ry)}" fill="${mix(wood, shd, 0.25)}"/>`;
        s += `<rect x="${n(a[0] - rx)}" y="${n(c2[1])}" width="${n(2 * rx)}" height="${n(a[1] - c2[1])}" fill="${wood}"/>`;
        s += `<rect x="${n(a[0])}" y="${n(c2[1])}" width="${n(rx)}" height="${n(a[1] - c2[1])}" fill="${mix(wood, shd, 0.2)}"/>`;
        s += `<ellipse cx="${n(c2[0])}" cy="${n(c2[1])}" rx="${n(rx)}" ry="${n(ry)}" fill="${mix(wood, "#FFFFFF", 0.25)}"/>`;
        s += `<polygon points="${n(c2[0] - rx * 1.08)},${n(c2[1])} ${n(c2[0] + rx * 1.08)},${n(c2[1])} ${n(c2[0])},${n(c2[1] - ry * 2)}" fill="${mix(p.accent, shd, 0.2)}"/>`;
      } else if (b.rt < 0.7) {
        const ac = sh3(mix(p.facade, "#FFFFFF", 0.5));
        s += box(x0 + 0.12, y0 + 0.12, x0 + 0.3, y0 + 0.28, h, h + 0.1, ac) + box(x0 + 0.36, y0 + 0.14, x0 + 0.48, y0 + 0.26, h, h + 0.08, ac);
        s += quad(x1 - 0.3, y1 - 0.3, x1 - 0.1, y1 - 0.1, h, p.lights && dark ? p.glow : mix(gl, "#FFFFFF", 0.2));
      } else {
        s += quad(x0 + 0.1, y0 + 0.1, x1 - 0.1, y1 - 0.1, h, mix(p.foliage, tp, 0.3));
        for (const [u, w2] of [[0.3, 0.3], [0.68, 0.4], [0.4, 0.7]]) {
          const c3 = pt(x0 + (x1 - x0) * u, y0 + (y1 - y0) * w2, h + 0.06);
          s += circ(c3, K * 0.07, p.foliage) + circ([c3[0] - K * 0.02, c3[1] - K * 0.02], K * 0.035, mix(p.foliage, "#FFFFFF", 0.3));
        }
      }
      if (h > 2.3) {
        const a0 = pt(mx + 0.14, my + 0.14, h), a1 = pt(mx + 0.14, my + 0.14, h + 0.5);
        s += line(a0, a1, mix(rf, shd, 0.4), K * 0.018) + circ(a1, K * 0.03, p.lights ? p.glow : p.accent);
      }
    }
    return s;
  };

  const skyTop = mix(p.sky, shd, dark ? 0.35 : 0.18), skyBot = mix(p.sky, p.glow, dark ? 0.1 : 0.22);
  const midY = oy + (L * K) / 2;
  let out = `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBot}"/></linearGradient>`;
  out += `<radialGradient id="hl" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${mix(p.sky, "#FFFFFF", dark ? 0.1 : 0.45)}" stop-opacity="0.9"/><stop offset="1" stop-color="${p.sky}" stop-opacity="0"/></radialGradient>`;
  out += `<mask id="mn" maskUnits="userSpaceOnUse" x="0" y="0" width="${S}" height="${S}"><circle cx="620" cy="160" r="30" fill="#FFFFFF"/><circle cx="634" cy="150" r="26" fill="#000000"/></mask>`;
  out += `<filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter><filter id="gw" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6"/></filter></defs>`;
  out += `<rect width="${S}" height="${S}" fill="url(#sk)"/>` + circ([400, midY], 390, "url(#hl)");
  if (dark) {
    for (let k = 0; k < 46; k++) out += circ([rs() * S, rs() * 400], 0.6 + rs() * 1.3, mix(p.glow, "#FFFFFF", 0.7), ` opacity="${n(0.3 + rs() * 0.6)}"`);
    out += circ([620, 160], 66, p.glow, ` opacity="0.08"`) + circ([620, 160], 30, mix(p.glow, "#FFFFFF", 0.6), ` mask="url(#mn)"`);
  } else {
    const sy = 150 + clamp((0.85 - skyL) * 400, 0, 120), cl = mix("#FFFFFF", p.sky, 0.14);
    out += circ([620, sy], 70, p.glow, ` opacity="0.3"`) + circ([620, sy], 36, mix(p.glow, "#FFFFFF", 0.35));
    for (const [lx, xs, ly, ys] of [[90, 160, 120, 70], [310, 150, 70, 50]]) {
      const x = lx + rs() * xs, y = ly + rs() * ys, w = 24 + rs() * 20;
      out += `<g opacity="0.8">` + circ([x, y], w * 0.6, cl) + circ([x + w * 0.7, y + w * 0.15], w * 0.45, cl) + circ([x - w * 0.7, y + w * 0.2], w * 0.4, cl);
      out += `<rect x="${n(x - w * 1.1)}" y="${n(y + w * 0.1)}" width="${n(w * 2.25)}" height="${n(w * 0.5)}" rx="${n(w * 0.25)}" fill="${cl}"/></g>`;
    }
  }

  const A = -m, B = N + m, bottom = oy + (L + T) * K;
  out += `<ellipse cx="400" cy="${n(bottom + 26)}" rx="${n(L * K * 0.62)}" ry="18" fill="${shd}" opacity="0.35" filter="url(#bl)"/>`;
  const side = (z0, z1, c) => P([[B, A, z0], [B, B, z0], [B, B, z1], [B, A, z1]], mix(c, shd, 0.35)) + P([[A, B, z0], [B, B, z0], [B, B, z1], [A, B, z1]], c);
  out += side(-0.08, -T, soil) + side(0, -0.08, mix(road, shd, 0.1));
  out += quad(A, A, B, B, 0, road);
  const w0 = -m * 0.42, w1 = N + m * 0.42;
  out += quad(w0, w0, w1, w1, 0, walk);
  const dash = mix(road, "#FFFFFF", 0.5), lm = m * 0.71;
  for (let t = w0 + 0.1; t < w1 - 0.25; t += 0.38) {
    for (const [a, b] of [[[t, -lm], [t + 0.17, -lm]], [[t, N + lm], [t + 0.17, N + lm]], [[-lm, t], [-lm, t + 0.17]], [[N + lm, t], [N + lm, t + 0.17]]]) {
      out += line(pt(a[0], a[1], 0), pt(b[0], b[1], 0), dash, K * 0.025);
    }
  }

  const trunk = mix(p.accent, shd, 0.5);
  for (const c of cells) {
    if (!c.park) { out += bld(c.b); continue; }
    const g0 = 0.06, i = c.i, j = c.j;
    out += box(i + g0, j + g0, i + 1 - g0, j + 1 - g0, 0, 0.05, sh3(mix(p.foliage, walk, 0.3)));
    for (const t of c.trees) {
      const b0 = pt(t.x, t.y, 0.05), ctr = pt(t.x, t.y, 0.05 + 0.5 * t.s), rad = 0.22 * t.s * K;
      out += `<ellipse cx="${n(b0[0] + rad * 0.3)}" cy="${n(b0[1])}" rx="${n(rad * 0.95)}" ry="${n(rad * 0.45)}" fill="${shd}" opacity="0.25"/>`;
      out += line(b0, pt(t.x, t.y, 0.05 + 0.32 * t.s), trunk, K * 0.035);
      if (t.cone) {
        const ax = ctr[0], ay = ctr[1] - rad * 1.4, by = ctr[1] + rad * 0.8, hw = rad * 0.95;
        out += `<polygon points="${n(ax)},${n(ay)} ${n(ax - hw)},${n(by)} ${n(ax)},${n(by + rad * 0.15)}" fill="${mix(p.foliage, "#FFFFFF", 0.15)}"/>`;
        out += `<polygon points="${n(ax)},${n(ay)} ${n(ax)},${n(by + rad * 0.15)} ${n(ax + hw)},${n(by)}" fill="${mix(p.foliage, shd, 0.3)}"/>`;
      } else {
        out += circ(ctr, rad, mix(p.foliage, shd, 0.3)) + circ([ctr[0] - rad * 0.12, ctr[1] - rad * 0.12], rad * 0.88, p.foliage);
        out += circ([ctr[0] - rad * 0.38, ctr[1] - rad * 0.38], rad * 0.3, mix(p.foliage, "#FFFFFF", 0.3), ` opacity="0.8"`);
      }
    }
  }

  for (const [lx, ly] of [[N + 0.17, N * 0.35], [N * 0.65, N + 0.17]]) {
    const b0 = pt(lx, ly, 0), t1 = pt(lx, ly, 0.78);
    if (p.lights) out += circ(t1, K * 0.2, p.glow, ` opacity="${dark ? 0.6 : 0.3}" filter="url(#gw)"`);
    out += `<ellipse cx="${n(b0[0])}" cy="${n(b0[1])}" rx="${n(K * 0.05)}" ry="${n(K * 0.025)}" fill="${shd}" opacity="0.4"/>`;
    out += line(b0, t1, mix(shd, p.facade, 0.25), K * 0.03) + circ(t1, K * 0.055, p.lights ? p.glow : mix(p.facade, shd, 0.3));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">${out}</svg>`;
}
