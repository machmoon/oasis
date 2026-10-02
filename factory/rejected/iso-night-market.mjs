// Lantern Alley: an isometric night-market diorama of canopied stalls, paper lanterns, produce crates and a steaming noodle cart.
export const meta = {
  title: "Lantern Alley",
  kind: "illustration",
  description: "A toy-like isometric night-market alley with striped stall canopies, paper lanterns, produce crates, street tables and a steaming noodle cart. Frame it as a skyline hero, a plain spot illustration or a simplified card for empty states.",
  tags: ["isometric", "night market", "lanterns", "street food", "diorama", "3d", "festival", "empty state"],
  price: 9,
  author: "oasis-factory",
  credit: "Isometric projection and lighting after jdan/isomer (MIT)",
  size: [1600, 1100],
};

export const params = {
  knobs: {
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#1A1D2E" },
    canopyA: { type: "color", role: "primary", label: "Canopy A", default: "#D9443A" },
    canopyB: { type: "color", role: "secondary", label: "Canopy B", default: "#2F8F83" },
    lantern: { type: "color", role: "highlight", label: "Lanterns", default: "#FF8A3D" },
    cart: { type: "color", role: "muted", label: "Noodle cart", default: "#7A2E2A" },
    time: { type: "choice", label: "Time", default: "night", options: ["night", "dusk", "day"] },
    framing: { type: "choice", label: "Framing", default: "skyline", options: ["skyline", "plain", "card"] },
    stalls: { type: "range", label: "Stalls", default: 4, min: 2, max: 6, step: 1 },
    seed: { type: "range", label: "Arrangement", default: 8, min: 1, max: 99, step: 1 },
    showCart: { type: "toggle", label: "Noodle cart", default: true },
  },
  presets: {
    Shilin: { backdrop: "#20152A", canopyA: "#F2B33D", canopyB: "#C2365A", lantern: "#FF5A4E", cart: "#1F5E5A" },
    Hanoi: { backdrop: "#E8E2D6", canopyA: "#2E6FB7", canopyB: "#E0A030", lantern: "#F25C3B", cart: "#2B3A55" },
    Neon: { backdrop: "#0E1418", canopyA: "#FF4FA0", canopyB: "#38D6C9", lantern: "#FFB347", cart: "#5B2C83" },
    Jiufen: { backdrop: "#2A2622", canopyA: "#8C2F2B", canopyB: "#C9A46A", lantern: "#E84A2E", cart: "#3A3F3A" },
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
function lighten(hex, amt) { const [h, s, l] = toHsl(hexRgb(hex)); return rgbHex(...fromHsl(h, s, Math.max(0, Math.min(1, l + amt)))); }
function harm(hex, s0, s1, l0, l1) { let [h, s, l] = toHsl(hexRgb(hex)); if (s > 0.06) s = Math.max(s0, Math.min(s1, s)); return rgbHex(...fromHsl(h, s, Math.max(l0, Math.min(l1, l)))); }
function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(...A.map((v, i) => v + (B[i] - v) * t)); }
function lum(hex) { const [r, g, b] = hexRgb(hex); return (r * 299 + g * 587 + b * 114) / 1000; }
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export default function render(p) {
  const W = 1600, H = 1100;
  const r = rng(p.seed * 7919 + 3), rs = rng(p.seed * 131 + 17);
  const night = p.time === "night", dusk = p.time === "dusk", lit = night || dusk;
  const card = p.framing === "card", rich = !card;
  const gl = night ? 0.85 : dusk ? 0.6 : 0.1;
  const cA0 = harm(p.canopyA, 0.42, 0.8, 0.42, 0.6), cB0 = harm(p.canopyB, 0.42, 0.8, 0.42, 0.6);
  const lan = harm(p.lantern, 0.6, 1, 0.48, 0.62), cartC = harm(p.cart, 0, 0.6, 0.24, 0.42);
  const lightC = mix(lan, "#FFB45E", 0.55);
  const N = Math.round(p.stalls), SW = 2.4, rowEnd = 0.6 + N * SW;
  const L = rowEnd + (p.showCart ? 3.4 : 0.4), D = 5.2, WH = 3.4;
  const zTop = WH + 0.3, zBot = -0.5, span = L + D + 0.8;
  const spanX = span * 0.866, spanY = span * 0.5 + zTop - zBot;
  const S = Math.min((W - (card ? 340 : 220)) / spanX, (H - (card ? 300 : 200)) / spanY);
  const ox = W / 2 - ((L - D) * 0.866 * S) / 2;
  const oy = (H + spanY * S) / 2 - 10 + zBot * S - 0.3 * S;
  const LIGHT = (() => { const v = [2, -1, 3], n = Math.hypot(...v); return v.map((c) => c / n); })();
  const P = (x, y, z) => [ox + (x - y) * 0.866 * S, oy - (x + y) * 0.5 * S - z * S];
  const f1 = (v) => v.toFixed(1);
  const pts = (arr) => arr.map((q) => P(...q).map(f1).join(",")).join(" ");
  const shade = (hex, n) => lighten(hex, 0.2 * (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]));
  const amb = (hex, w) => w === "raw" ? hex : night ? (w ? mix(mix(hex, "#2A2142", 0.16), "#FFC27A", 0.18) : mix(lighten(hex, -0.08), "#141A36", 0.42)) : dusk ? mix(hex, w ? "#E08A5A" : "#6E4A62", w ? 0.12 : 0.2) : hex;
  const Q = (arr, col, extra = "") => `<polygon points="${pts(arr)}" fill="${col}" ${extra}/>`;
  const line = (a, b, col, w = 1, extra = "") => `<polyline points="${pts([a, b])}" stroke="${col}" stroke-width="${w}" fill="none" ${extra}/>`;
  function box(x, y, z, dx, dy, dz, c, w = false, edge = true) {
    const st = edge ? `stroke="${amb(lighten(c, -0.2), w)}" stroke-width="0.6" stroke-linejoin="round"` : "";
    return Q([[x, y, z], [x, y + dy, z], [x, y + dy, z + dz], [x, y, z + dz]], amb(shade(c, [-1, 0, 0]), w), st)
      + Q([[x, y, z], [x + dx, y, z], [x + dx, y, z + dz], [x, y, z + dz]], amb(shade(c, [0, -1, 0]), w), st)
      + Q([[x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz]], amb(shade(c, [0, 0, 1]), w), st);
  }
  function cyl(x, y, z0, z1, R, c, top, w) {
    const [ax, ay] = P(x, y, z0), [bx, by] = P(x, y, z1), a = 1.2247 * R * S, b = 0.7071 * R * S;
    return `<path d="M${f1(ax - a)},${f1(ay)} A${f1(a)},${f1(b)} 0 0 0 ${f1(ax + a)},${f1(ay)} L${f1(bx + a)},${f1(by)} L${f1(bx - a)},${f1(by)} Z" fill="${amb(shade(c, [0, -0.7, 0.2]), w)}"/><ellipse cx="${f1(bx)}" cy="${f1(by)}" rx="${f1(a)}" ry="${f1(b)}" fill="${amb(top, w)}"/>`;
  }
  const wheel = (x, y, z, R, c) => Q(Array.from({ length: 18 }, (_, k) => [x + R * Math.cos((k * Math.PI) / 9), y, z + R * Math.sin((k * Math.PI) / 9)]), amb(c));
  const pool = (x, y, R, op) => { const [cx, cy] = P(x, y, 0.005); return `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(1.2247 * R * S)}" ry="${f1(0.7071 * R * S)}" fill="url(#pool)" opacity="${Math.min(1, op).toFixed(2)}"/>`; };
  const foot = (x0, y0, x1, y1) => Q([[x0, y0, 0.003], [x1, y0, 0.003], [x1, y1, 0.003], [x0, y1, 0.003]], "#000");

  const darkB = lum(p.backdrop) < 120;
  const sky = night ? (darkB ? mix(p.backdrop, "#0E1430", 0.35) : mix(p.backdrop, "#0D1640", 0.85))
    : dusk ? (darkB ? mix(p.backdrop, "#B8606A", 0.32) : mix(p.backdrop, "#D88A78", 0.45))
    : darkB ? mix("#DCE5EC", p.backdrop, 0.1) : p.backdrop;
  const darkSky = lum(sky) < 110;
  const slab = darkSky ? mix(lighten(sky, 0.16), "#5A6CB0", 0.3) : mix(sky, "#3A3350", 0.6);
  const stone = mix(darkSky ? "#A0968A" : "#B4A894", sky, 0.12), wood = "#A87449", crate = "#D8AA6E", cream = "#F5EEDF", brick = mix("#B5735A", sky, 0.22);
  const PRODUCE = ["#F28C28", "#E0473D", "#8DBF45", "#F2CF3A", "#F6A07A", "#4FA84A", "#B05FC0"];
  const BULB = lit ? "#FFE6A8" : amb("#EDE6D6");
  const cordC = darkSky ? "#A89A8C" : "#3A302B";
  const rib = lit ? mix(lan, "#5A1E0A", 0.4) : lighten(lan, -0.25);
  const halos = [], over = [], items = [];
  const add = (x, y, s) => items.push([x + y, s]);
  let shadows = "", pools = "";

  const lanternSvg = (cx, cy, s, tall, cordTop) => {
    const rx = s * 0.78, ry = s * (tall ? 1.25 : 0.95);
    return `<line x1="${f1(cx)}" y1="${f1(cordTop)}" x2="${f1(cx)}" y2="${f1(cy - ry)}" stroke="${cordC}" stroke-width="1.2"/>`
      + `<line x1="${f1(cx)}" y1="${f1(cy + ry)}" x2="${f1(cx)}" y2="${f1(cy + ry + s * 0.55)}" stroke="${rib}" stroke-width="2.4" stroke-linecap="round"/>`
      + `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="url(#lg)"/>`
      + `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx * 0.5)}" ry="${f1(ry)}" fill="none" stroke="${rib}" stroke-width="1" opacity="0.6"/>`
      + [-1, 1].map((sg) => `<rect x="${f1(cx - rx * 0.45)}" y="${f1(cy + sg * ry - s * 0.12)}" width="${f1(rx * 0.9)}" height="${f1(s * 0.24)}" rx="2" fill="#2B2220"/>`).join("");
  };
  const hang = (x, y, z, ls, tall, drop) => {
    const [ax, ay] = P(x, y, z), cy = ay + drop * S + ls * ((tall ? 1.25 : 0.95) + 0.16);
    over.push([x + y - 0.01, lanternSvg(ax, cy, ls, tall, ay)]);
    halos.push([ax, cy, ls * 4.2, 1]);
  };
  const at = (A, B, sag, u) => [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[2] + (B[2] - A[2]) * u - sag * 4 * u * (1 - u)];
  const cord = (A, B, sag) => `<polyline points="${pts(Array.from({ length: 13 }, (_, t) => at(A, B, sag, t / 12)))}" stroke="${cordC}" stroke-width="1.2" fill="none"/>`;
  const fruit = (cx, cy, cc, rr = 0.1) => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(rr * S)}" fill="${amb(cc, true)}" stroke="${amb(lighten(cc, -0.22), true)}" stroke-width="0.8"/><circle cx="${f1(cx - 0.03 * S)}" cy="${f1(cy - 0.035 * S)}" r="${f1(0.03 * S)}" fill="#FFFFFF" opacity="0.45"/>`;

  let base = box(-0.4, -0.4, -0.5, L + 0.8, D + 0.8, 0.5, slab, "raw");
  base += Q([[0, 0, 0.002], [L, 0, 0.002], [L, D, 0.002], [0, D, 0.002]], amb(stone));
  const joint = amb(lighten(stone, -0.08));
  if (rich) {
    for (let i = 0.8; i < L; i += 0.8) base += line([i, 0, 0.003], [i, D - 0.45, 0.003], joint, 0.8);
    for (let j = 0.8; j < D - 0.45; j += 0.8) base += line([0, j, 0.003], [L, j, 0.003], joint, 0.8);
  }
  base += Q([[0, 2.42, 0.004], [L, 2.42, 0.004], [L, 2.54, 0.004], [0, 2.54, 0.004]], amb(lighten(stone, -0.18)));
  base += box(0, D - 0.45, 0.002, L, 0.45, WH, brick);
  const wy = D - 0.452;
  if (rich) for (let z = 0.25; z < WH; z += 0.25) base += line([0, wy, z], [L, wy, z], amb(lighten(brick, -0.1)), 0.7, 'opacity="0.7"');
  for (let xx = 0.5; xx < L - 0.9; xx += 1.5 + r() * 0.6) {
    const on = lit && r() > 0.3;
    base += Q([[xx - 0.06, wy, 2.62], [xx + 0.66, wy, 2.62], [xx + 0.66, wy, 3.2], [xx - 0.06, wy, 3.2]], amb(lighten(brick, -0.2)));
    base += Q([[xx, wy - 0.001, 2.68], [xx + 0.6, wy - 0.001, 2.68], [xx + 0.6, wy - 0.001, 3.14], [xx, wy - 0.001, 3.14]], on ? "#FFD58A" : amb(shade("#55606F", [0, -1, 0])));
  }
  base += box(-0.05, D - 0.5, WH, L + 0.1, 0.55, 0.1, lighten(brick, -0.12));

  for (let i = 0; i < N; i++) {
    const x = 0.8 + i * SW, y = 3.1, w = SW - 0.35, d = 1.3, yf = y - 0.35, yb = y + d + 0.05;
    const ch = 1.9 + r() * 0.2, cb = ch + 0.42, cA = i % 2 ? cB0 : cA0, cB = i % 2 ? cA0 : cB0;
    const striped = r() > 0.35, sc = PRODUCE[Math.floor(r() * PRODUCE.length)];
    let s = "";
    for (const px of [x, x + w - 0.07]) s += box(px, yb - 0.08, 0.01, 0.07, 0.07, cb, wood, true);
    const sx = x + w / 2 - 0.42, gy = yb - 0.062;
    s += box(sx, yb - 0.06, cb - 0.02, 0.84, 0.05, 0.46, "#3A2B24", true);
    s += Q([[sx + 0.07, gy, cb + 0.05], [sx + 0.77, gy, cb + 0.05], [sx + 0.77, gy, cb + 0.38], [sx + 0.07, gy, cb + 0.38]], lit ? mix(cream, lightC, 0.3) : cream);
    const [ix, iy] = P(sx + 0.42, gy, cb + 0.2);
    s += `<circle cx="${f1(ix)}" cy="${f1(iy)}" r="${f1(0.11 * S)}" fill="${sc}"/><ellipse cx="${f1(ix + 0.08 * S)}" cy="${f1(iy - 0.12 * S)}" rx="${f1(0.08 * S)}" ry="${f1(0.035 * S)}" fill="#4F9A4A" transform="rotate(-35 ${f1(ix + 0.08 * S)} ${f1(iy - 0.12 * S)})"/>`;
    s += box(x + 0.1, y + 0.15, 0.01, w - 0.2, d - 0.5, 0.78, wood, true);
    const sk = y + 0.147;
    s += Q([[x + 0.14, sk, 0.06], [x + w - 0.14, sk, 0.06], [x + w - 0.14, sk, 0.72], [x + 0.14, sk, 0.72]], amb(shade(cB, [0, -1, 0]), true));
    if (rich) for (let k = x + 0.38; k < x + w - 0.2; k += 0.26) s += line([k, sk - 0.001, 0.08], [k, sk - 0.001, 0.7], amb(lighten(cB, -0.14), true), 0.8);
    const nC = Math.max(2, Math.floor((w - 0.3) / 0.55)), cwd = (w - 0.4) / nC;
    for (let k = nC - 1; k >= 0; k--) {
      const cx = x + 0.2 + k * cwd, cc = k === 0 ? sc : PRODUCE[Math.floor(r() * PRODUCE.length)];
      s += box(cx, y + 0.22, 0.79, cwd - 0.06, 0.52, 0.18, crate, true);
      for (let m = 5; m >= 0; m--) s += fruit(...P(cx + 0.1 + ((m % 3) * (cwd - 0.26)) / 2, y + 0.33 + Math.floor(m / 3) * 0.28, 1.04), cc, 0.105);
    }
    for (const px of [x, x + w - 0.07]) s += box(px, yf, 0.01, 0.07, 0.07, ch, wood, true);
    const x0 = x - 0.12, x1 = x + w + 0.12, ns = Math.max(6, Math.round((x1 - x0) / 0.3));
    const xs = (k) => x0 + (k * (x1 - x0)) / ns;
    for (let k = 0; k < ns; k++) {
      const col = striped ? (k % 2 ? cream : cA) : k % 2 ? lighten(cA, -0.05) : cA;
      s += Q([[xs(k), yf, ch], [xs(k + 1), yf, ch], [xs(k + 1), yb, cb], [xs(k), yb, cb]], amb(shade(col, [0, -0.45, 0.9]), true));
    }
    s += Q([[x0, yf, ch], [x0, yb, cb], [x0, yb, cb - 0.05], [x0, yf, ch - 0.05]], amb(shade(cA, [-1, 0, 0]), true));
    for (let k = 0; k < ns; k++) {
      const col = striped ? (k % 2 ? cream : cA) : k % 2 ? cream : cB, xa = xs(k), xb = xs(k + 1), arc = [];
      for (let t = 0; t <= 6; t++) arc.push([xa + ((xb - xa) * (1 - Math.cos((Math.PI * t) / 6))) / 2, yf - 0.002, ch - 0.17 * Math.sin((Math.PI * t) / 6)]);
      s += Q(arc, amb(shade(col, [0, -1, 0]), true));
    }
    for (const px of [x, x + w - 0.07]) s += box(px, yf, ch - 0.02, 0.07, 0.07, 0.64, wood, true);
    const bx = x + w / 2, [bcx, bcy] = P(bx, yf, ch - 0.46);
    s += line([bx, yf, ch - 0.17], [bx, yf, ch - 0.4], cordC, 1) + `<circle cx="${f1(bcx)}" cy="${f1(bcy)}" r="${f1(0.07 * S)}" fill="${BULB}"/>`;
    halos.push([bcx, bcy, 0.6 * S, 0.6]);
    const [wcx, wcy] = P(x + w / 2, y + 0.45, 1.0);
    halos.push([wcx, wcy, 1.3 * S, 0.8]);
    hang(x + w + 0.12, yf, ch - 0.17, 0.21 * S, i % 2 === 0, 0.04);
    shadows += foot(x - 0.25, yf + 0.1, x + w, yb);
    pools += pool(x + w / 2, yf - 0.55, 1.6, gl * 1.2);
    add(x + w / 2, y + d / 2, s);
  }

  const gaps = Array.from({ length: N + 1 }, (_, k) => 0.625 + k * SW), gy0 = wy - 0.42, gz = WH - 0.15;
  gaps.forEach((gx, k) => {
    over.push([gx + wy, box(gx - 0.03, gy0, gz, 0.06, 0.42, 0.06, "#3A2B24", true)]);
    if (k < N) over.push([gx + gy0 + 0.005, cord([gx, gy0, gz], [gaps[k + 1], gy0, gz], 0.22)]);
    hang(gx, gy0, gz, 0.24 * S, k % 2 === 1, 0.03);
  });

  const crates = (sx, sy, hN, cc) => {
    let s = "";
    for (let j = 0; j < hN; j++) s += box(sx + j * 0.04, sy, 0.01 + j * 0.32, 0.7, 0.52, 0.31, crate, true) + line([sx + j * 0.04, sy - 0.002, 0.17 + j * 0.32], [sx + j * 0.04 + 0.7, sy - 0.002, 0.17 + j * 0.32], amb(lighten(crate, -0.22), true), 1.2);
    for (let m = 5; m >= 0; m--) s += fruit(...P(sx + (hN - 1) * 0.04 + 0.14 + (m % 3) * 0.21, sy + 0.14 + Math.floor(m / 3) * 0.24, hN * 0.32 + 0.06), cc, 0.11);
    shadows += foot(sx - 0.15, sy, sx + 0.7, sy + 0.55);
    add(sx + 0.35, sy + 0.26, s);
  };
  const stoolC = mix(cA0, "#B9B2A8", 0.3), cloth = mix(cream, cB0, 0.14);
  const stool = (sx, sy) => { add(sx, sy, cyl(sx, sy, 0.01, 0.4, 0.16, stoolC, lighten(stoolC, 0.1), true)); shadows += foot(sx - 0.26, sy - 0.12, sx + 0.12, sy + 0.18); };
  for (let k = 0; k < N; k++) {
    const cx = gaps[k] + SW / 2 + (r() - 0.5) * 0.3;
    if ((k + p.seed) % 3 !== 0) {
      const tx = cx - 0.5, ty = 0.95;
      let s = "";
      for (const [lx, ly] of [[tx + 0.88, ty + 0.56], [tx + 0.06, ty + 0.56], [tx + 0.88, ty + 0.04], [tx + 0.06, ty + 0.04]]) s += box(lx, ly, 0.01, 0.06, 0.06, 0.62, "#8A8F98", true);
      s += box(tx, ty, 0.62, 1.0, 0.66, 0.06, cloth, true);
      for (const [bx, by] of [[tx + 0.72, ty + 0.4], [tx + 0.3, ty + 0.28]]) s += cyl(bx, by, 0.68, 0.82, 0.13, cream, "#E8B860", true);
      add(cx, ty + 0.33, s);
      shadows += foot(tx - 0.3, ty, tx + 1.0, ty + 0.66);
      stool(cx - 0.1, ty + 1.0);
      stool(cx - 0.3, ty - 0.32);
      if (r() > 0.4) stool(cx + 0.35, ty - 0.3);
    } else {
      crates(cx - 0.75, 0.5, r() > 0.45 ? 2 : 1, PRODUCE[Math.floor(r() * PRODUCE.length)]);
      crates(cx + 0.15, 1.35, 1, PRODUCE[Math.floor(r() * PRODUCE.length)]);
      add(cx + 0.7, 0.75, cyl(cx + 0.7, 0.75, 0.01, 0.32, 0.22, "#B88A55", amb("#F28C28", true), true));
      shadows += foot(cx + 0.4, 0.55, cx + 0.92, 0.97);
    }
  }

  if (p.showCart) {
    const cx0 = rowEnd + 0.6, cy0 = 1.0, cw = 1.9, cd = 1.0, top = 1.13, rf = 2.3;
    let s = "";
    for (const px of [cx0 + cw - 0.1, cx0 + 0.03]) s += box(px, cy0 + cd - 0.1, top, 0.07, 0.07, rf - top, wood, true);
    s += box(cx0, cy0, 0.32, cw, cd, 0.75, cartC, true);
    s += Q([[cx0, cy0 - 0.003, 0.88], [cx0 + cw, cy0 - 0.003, 0.88], [cx0 + cw, cy0 - 0.003, 0.98], [cx0, cy0 - 0.003, 0.98]], amb(cA0, true));
    for (const wx of [cx0 + 0.45, cx0 + cw - 0.45]) s += wheel(wx, cy0 - 0.01, 0.3, 0.3, "#2E2826") + wheel(wx, cy0 - 0.015, 0.3, 0.1, "#B0A698");
    for (const hy of [cy0 + 0.75, cy0 + 0.2]) s += box(cx0 - 0.62, hy, 0.62, 0.62, 0.06, 0.06, wood, true);
    s += box(cx0 - 0.06, cy0 - 0.06, 1.07, cw + 0.12, cd + 0.12, 0.06, wood, true);
    s += cyl(cx0 + 0.5, cy0 + 0.5, top, top + 0.38, 0.3, "#B9C0C8", "#E3B060", true);
    for (let k = 0; k < 3; k++) s += cyl(cx0 + 1.35, cy0 + 0.45, top + k * 0.09, top + k * 0.09 + 0.08, 0.17, cream, lighten(cream, 0.03), true);
    const [px, py] = P(cx0 + 0.5, cy0 + 0.5, top + 0.38);
    for (let k = 0; k < 3; k++) s += `<path d="M${f1(px + (k - 1) * 0.16 * S)},${f1(py - 2)} c${f1(-0.12 * S)},${f1(-0.2 * S)} ${f1(0.12 * S)},${f1(-0.35 * S)} 0,${f1(-0.55 * S)} s${f1(-0.1 * S)},${f1(-0.3 * S)} ${f1(0.05 * S)},${f1(-0.45 * S)}" stroke="${lit ? "#FFF3E0" : "#FFFFFF"}" stroke-width="${f1(0.06 * S)}" stroke-linecap="round" fill="none" opacity="${darkSky ? 0.55 : 0.8}" filter="url(#blur)"/>`;
    for (const qx of [cx0 + 0.03, cx0 + cw - 0.1]) s += box(qx, cy0 + 0.03, top, 0.07, 0.07, rf - top, wood, true);
    s += box(cx0 - 0.18, cy0 - 0.18, rf, cw + 0.36, cd + 0.36, 0.1, cA0, true);
    s += box(cx0 - 0.05, cy0 + cd / 2 - 0.05, rf + 0.1, cw + 0.1, 0.1, 0.06, lighten(cA0, -0.12), true);
    const nx0 = cx0 - 0.1, nw = (cw + 0.2) / 4, ny = cy0 - 0.183;
    for (let k = 0; k < 4; k++) s += Q([[nx0 + k * nw + 0.02, ny, rf], [nx0 + (k + 1) * nw - 0.02, ny, rf], [nx0 + (k + 1) * nw - 0.02, ny, rf - 0.4], [nx0 + k * nw + 0.02, ny, rf - 0.4]], amb(shade(cB0, [0, -1, 0]), true));
    const [ex, ey] = P(nx0 + 2 * nw, ny, rf - 0.18), br = 0.12 * S, bc = amb(cream, true);
    s += `<path d="M${f1(ex - br)},${f1(ey)} A${f1(br)},${f1(br)} 0 0 0 ${f1(ex + br)},${f1(ey)} Z" fill="${bc}"/><path d="M${f1(ex - 0.02 * S)},${f1(ey - 0.02 * S)} L${f1(ex + 0.15 * S)},${f1(ey - 0.19 * S)} M${f1(ex + 0.04 * S)},${f1(ey - 0.01 * S)} L${f1(ex + 0.2 * S)},${f1(ey - 0.15 * S)}" stroke="${bc}" stroke-width="${f1(0.03 * S)}" stroke-linecap="round"/>`;
    hang(cx0 - 0.1, cy0 - 0.18, rf, 0.24 * S, false, 0.2);
    for (const [sx, sy] of [[cx0 + cw + 0.4, cy0 + 0.25], [cx0 + cw + 0.5, cy0 + 1.0]]) add(sx, sy, cyl(sx, sy, 0.01, 0.42, 0.17, stoolC, lighten(stoolC, 0.1), true));
    shadows += foot(cx0 - 0.3, cy0 - 0.1, cx0 + cw, cy0 + cd + 0.2);
    pools += pool(cx0 + cw / 2, cy0 - 0.4, 1.5, gl);
    add(cx0 + cw / 2, cy0 + cd / 2, s);
  }

  items.sort((a, b) => b[0] - a[0]);
  over.sort((a, b) => b[0] - a[0]);
  const lg = lit
    ? `<radialGradient id="lg" cx="45%" cy="42%" r="62%"><stop offset="0" stop-color="${mix(lan, "#FFF6DC", 0.72)}"/><stop offset="0.55" stop-color="${lighten(lan, 0.04)}"/><stop offset="1" stop-color="${lighten(lan, -0.14)}"/></radialGradient>`
    : `<radialGradient id="lg" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="${lighten(lan, 0.14)}"/><stop offset="1" stop-color="${lighten(lan, -0.16)}"/></radialGradient>`;
  const skyTop = night ? lighten(sky, -0.03) : dusk ? mix(sky, "#2E2550", 0.35) : lighten(sky, 0.04);
  const skyBot = night ? mix(sky, "#3A2E5A", 0.4) : dusk ? mix(sky, "#F2A27A", 0.4) : mix(sky, "#FFF4E0", 0.3);
  let stars = "";
  if (night && darkSky) for (let k = 0; k < 70; k++) stars += `<circle cx="${f1(rs() * W)}" cy="${f1(rs() * H * 0.55)}" r="${f1(0.6 + rs() * 1.1)}" fill="#FFF8E8" opacity="${(0.25 + rs() * 0.5).toFixed(2)}"/>`;
  const orbC = night ? "#F3EBD3" : dusk ? "#FFB27A" : "#FFD877";
  const [mx, my, mr] = night ? [220, 180, 30] : dusk ? [240, 300, 44] : [220, 180, 38];
  const orb = `<circle cx="${mx}" cy="${my}" r="${mr * 4}" fill="url(#mg)"/><circle cx="${mx}" cy="${my}" r="${mr}" fill="${orbC}" opacity="0.95"/>`;
  let sil = "";
  if (p.framing === "skyline") {
    const farC = darkSky ? mix(sky, skyBot, 0.55) : mix(sky, "#6B7488", 0.14), nearC = darkSky ? mix(sky, "#03040A", 0.3) : mix(sky, "#6B7488", 0.27);
    for (const [c, t0, t1, win] of [[farC, 0.4, 0.56, false], [nearC, 0.52, 0.7, true]]) {
      let sx = -10;
      while (sx < W) {
        const bw = 60 + rs() * 100, tp = H * (t0 + rs() * (t1 - t0));
        sil += `<rect x="${f1(sx)}" y="${f1(tp)}" width="${f1(bw + 1)}" height="${f1(H - tp)}" fill="${c}"/>`;
        if (rs() > 0.6) sil += `<rect x="${f1(sx + bw * 0.25)}" y="${f1(tp - 22)}" width="${f1(bw * 0.35)}" height="24" fill="${c}"/>`;
        if (win && lit) for (let yy = tp + 16; yy < H * 0.9; yy += 24) for (let wx = sx + 12; wx < sx + bw - 14; wx += 18) if (rs() > 0.83) sil += `<rect x="${f1(wx)}" y="${f1(yy)}" width="7" height="10" fill="${lightC}" opacity="0.45"/>`;
        sx += bw;
      }
    }
  }
  const panel = `x="56" y="56" width="${W - 112}" height="${H - 112}" rx="40"`;
  const scene = `${stars}${orb}${sil}`;
  const back = card
    ? `<rect width="${W}" height="${H}" fill="${lit ? mix(sky, "#000000", 0.3) : mix(sky, "#FFFFFF", 0.5)}"/><rect ${panel} fill="url(#bg)" filter="url(#card)"/><g clip-path="url(#cp)">${scene}</g>`
    : `<rect width="${W}" height="${H}" fill="url(#bg)"/>${scene}`;
  const plinth = [[-0.4, -0.4, -0.5], [L + 0.4, -0.4, -0.5], [L + 0.4, D + 0.4, -0.5], [-0.4, D + 0.4, -0.5]];
  const haloSvg = halos.map(([x, y, rad, w]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rad)}" fill="url(#halo)" opacity="${Math.min(1, gl * w).toFixed(2)}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>`
    + `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBot}"/></linearGradient>`
    + `<clipPath id="cp"><rect ${panel}/></clipPath>`
    + `<radialGradient id="mg"><stop offset="0.2" stop-color="${orbC}" stop-opacity="${night ? 0.16 : 0.4}"/><stop offset="1" stop-color="${orbC}" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="pool"><stop offset="0" stop-color="${lightC}" stop-opacity="0.7"/><stop offset="0.35" stop-color="${lightC}" stop-opacity="0.4"/><stop offset="1" stop-color="${lightC}" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="halo"><stop offset="0" stop-color="${lightC}" stop-opacity="0.6"/><stop offset="0.4" stop-color="${lightC}" stop-opacity="0.2"/><stop offset="1" stop-color="${lightC}" stop-opacity="0"/></radialGradient>${lg}`
    + `<filter id="card" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000000" flood-opacity="0.28"/></filter>`
    + `<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${f1(S * 0.09)}"/></filter><filter id="drop" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="20"/></filter><filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter></defs>`
    + back
    + `<g transform="translate(0,26)" opacity="${darkSky ? 0.45 : 0.18}" filter="url(#drop)">${Q(plinth, "#000")}</g>`
    + `${base}<g filter="url(#soft)" opacity="0.28">${shadows}</g>${pools}${items.map((i) => i[1]).join("")}${haloSvg}${over.map((o) => o[1]).join("")}</svg>`;
}
