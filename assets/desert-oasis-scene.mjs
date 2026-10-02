// Desert oasis: seeded layered dunes with knife-edge shadows, a reflecting pool and leaning palms in a flat editorial style.
export const meta = {
  title: "Still Water Oasis",
  kind: "illustration",
  description: "A calm flat-style desert oasis with dunes, palms and a reflecting pool, for editorial spots, travel heroes and calm landing pages.",
  tags: ["desert", "oasis", "landscape", "palm tree", "dunes", "editorial", "travel", "flat illustration"],
  price: 8,
  author: "oasis-factory",
  size: [1200, 800],
};

export const params = {
  knobs: {
    sky: { type: "color", role: "background", label: "Sky", default: "#F2A55E" },
    sun: { type: "color", role: "highlight", label: "Sun / moon", default: "#FFE7B0" },
    sand: { type: "color", role: "surface", label: "Sand", default: "#EDB27A" },
    shade: { type: "color", role: "muted", label: "Shadow", default: "#7E3F3A" },
    water: { type: "color", role: "primary", label: "Water", default: "#2F7F8A" },
    palm: { type: "color", role: "ink", label: "Palms", default: "#3D4A32" },
    orb: { type: "choice", label: "Sky body", default: "glow", options: ["glow", "striped", "crescent"] },
    palms: { type: "range", label: "Palm trees", default: 3, min: 2, max: 4, step: 1 },
    dunes: { type: "range", label: "Dune layers", default: 4, min: 1, max: 6, step: 1 },
    seed: { type: "range", label: "Seed", default: 42, min: 1, max: 300, step: 1 },
  },
  presets: {
    "Golden Hour": { sky: "#F2A55E", sun: "#FFE7B0", sand: "#EDB27A", shade: "#7E3F3A", water: "#2F7F8A", palm: "#3D4A32" },
    Noon: { sky: "#9BD3EC", sun: "#FFF7DF", sand: "#F3D9A8", shade: "#B07A4F", water: "#1E9DB0", palm: "#2E6A4A" },
    Night: { sky: "#101B3D", sun: "#F3E6C0", sand: "#4A4E78", shade: "#151832", water: "#22386E", palm: "#0D1228" },
    Mirage: { sky: "#F7D9DF", sun: "#FFF9F0", sand: "#F2C7AE", shade: "#8E5C7A", water: "#6CC3C1", palm: "#3F6E62" },
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

const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const f = (n) => n.toFixed(1);
const pt = (q) => `${f(q[0])},${f(q[1])}`;

function dune(r, W, H, base, amp, humps) {
  const n = humps * 2, ws = [];
  for (let i = 0; i < n; i++) ws.push(0.7 + 0.6 * r());
  const sum = ws.reduce((a, b) => a + b, 0);
  const pts = [];
  let x = -80;
  for (let i = 0; i <= n; i++) {
    const peak = i % 2 === 1;
    pts.push([x, peak ? base - amp * (0.55 + 0.45 * r()) : base + r() * amp * 0.12, peak]);
    if (i < n) x += (ws[i] / sum) * (W + 160);
  }
  let d = `M${pt(pts[0])}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], h = (x1 - x0) / 2;
    d += ` C${f(x0 + h)},${f(y0)} ${f(x1 - h)},${f(y1)} ${pt([x1, y1])}`;
  }
  return { d: d + ` L${W + 80},${H} L-80,${H}Z`, pts };
}

function shadows(pts, side) {
  let s = "";
  for (let i = 1; i < pts.length - 1; i++) {
    if (!pts[i][2]) continue;
    const A = pts[i], B = pts[i + side], dx = B[0] - A[0];
    s += `M${pt(A)} C${f(A[0] + dx / 2)},${f(A[1])} ${f(B[0] - dx / 2)},${f(B[1])} ${pt(B)} C${f(B[0] - dx * 0.55)},${f(B[1])} ${f(A[0] + dx * 0.08)},${f(A[1] + (B[1] - A[1]) * 0.55)} ${pt(A)}Z`;
  }
  return s;
}

function frondPath(x, y, ang, L) {
  const a = (ang * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
  const P0 = [x, y], C = [x + dx * L * 0.55, y + dy * L * 0.55 - L * 0.2];
  const P2 = [x + dx * L, y + dy * L + L * (0.16 + 0.26 * Math.abs(dx))];
  const B = (t) => { const u = 1 - t; return [u * u * P0[0] + 2 * u * t * C[0] + t * t * P2[0], u * u * P0[1] + 2 * u * t * C[1] + t * t * P2[1]]; };
  const T = (t) => {
    const tx = 2 * (1 - t) * (C[0] - P0[0]) + 2 * t * (P2[0] - C[0]), ty = 2 * (1 - t) * (C[1] - P0[1]) + 2 * t * (P2[1] - C[1]);
    const l = Math.hypot(tx, ty) || 1; return [tx / l, ty / l];
  };
  const N = 14, Wd = L * 0.14, up = [], dn = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, odd = i % 2 === 1, tt = odd ? Math.min(1, t + 0.05) : t;
    const P = B(tt), Tq = T(tt);
    const w = Wd * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, 0.75))), 0.8) * (odd ? 1 : 0.4);
    up.push([P[0] - Tq[1] * w, P[1] + Tq[0] * w]);
    dn.push([P[0] + Tq[1] * w, P[1] - Tq[0] * w]);
  }
  return "M" + up.map(pt).join("L") + "L" + dn.reverse().map(pt).join("L") + "Z";
}

function palm(r, h, lean, c) {
  const C = [lean * 0.8, -h * 0.5], E = [lean, -h];
  const at = (t) => { const u = 1 - t; return [2 * u * t * C[0] + t * t * E[0], 2 * u * t * C[1] + t * t * E[1]]; };
  const tan = (t) => {
    const x = 2 * (1 - t) * C[0] + 2 * t * (E[0] - C[0]), y = 2 * (1 - t) * C[1] + 2 * t * (E[1] - C[1]);
    const l = Math.hypot(x, y); return [x / l, y / l];
  };
  const wAt = (t) => h * (0.034 - 0.014 * t + 0.022 * Math.pow(1 - t, 6));
  const Ls = [], Rs = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, P = at(t), T = tan(t), w = wAt(t);
    Ls.push([P[0] - T[1] * w, P[1] + T[0] * w]);
    Rs.push([P[0] + T[1] * w, P[1] - T[0] * w]);
  }
  let s = `<path d="M${Ls.map(pt).join("L")}L${Rs.reverse().map(pt).join("L")}Z" fill="${c.trunk}"/>`;
  if (c.ring) {
    let d = "";
    for (let t = 0.12; t < 0.92; t += 0.075) {
      const P = at(t), T = tan(t), w = wAt(t) * 0.85;
      d += `M${pt([P[0] - T[1] * w, P[1] + T[0] * w])}L${pt([P[0] - T[0] * w * 0.5, P[1] - T[1] * w * 0.5])}L${pt([P[0] + T[1] * w, P[1] - T[0] * w])}`;
    }
    s += `<path d="${d}" fill="none" stroke="${c.ring}" stroke-width="${f(Math.max(1.4, h * 0.008))}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const len = () => h * 0.38 * (0.9 + 0.2 * r());
  const jit = () => (r() - 0.5) * 14;
  [-138, -98, -58].forEach((a) => { s += `<path d="${frondPath(E[0], E[1], a + jit(), len() * 0.9)}" fill="${c.back}"/>`; });
  [-182, -152, -120, -84, -48, -12, 148, 32].forEach((a) => { s += `<path d="${frondPath(E[0], E[1], a + jit(), len())}" fill="${c.frond}"/>`; });
  s += `<circle cx="${f(E[0])}" cy="${f(E[1])}" r="${f(h * 0.028)}" fill="${c.frond}"/>`;
  [[-0.03, 0.035], [0.028, 0.03], [0.002, 0.058]].forEach(([u, v]) => { s += `<circle cx="${f(E[0] + u * h)}" cy="${f(E[1] + v * h)}" r="${f(h * 0.022)}" fill="${c.nut}"/>`; });
  return s;
}

function tuft(r, x, y, sz, col) {
  const n = 4 + Math.floor(r() * 3);
  let d = "";
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1) - 0.5, a = -Math.PI / 2 + k * 1.5 + (r() - 0.5) * 0.2, L = sz * (0.7 + 0.4 * r()) * (1 - Math.abs(k) * 0.6);
    d += `M${f(x)},${f(y)} Q${f(x + Math.cos(a) * L * 0.3)},${f(y + Math.sin(a) * L * 0.75)} ${f(x + Math.cos(a) * L)},${f(y + Math.sin(a) * L)}`;
  }
  return `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.6" stroke-linecap="round"/>`;
}

export default function render(p) {
  const W = 1200, H = 800, HZ = 480;
  const r = rng(p.seed * 9973 + 17), tr = rng(p.seed * 7 + 3);
  const sunRight = r() > 0.35;
  const sx = W * (sunRight ? 0.68 + r() * 0.14 : 0.18 + r() * 0.14), sy = 196, sr = 62;
  const cx = W * (0.42 + r() * 0.16), cy = 660, rx = 258, ry = 52;
  const haze = mix(p.sand, p.sky, 0.55), deep = mix(p.sand, p.shade, 0.22);

  let defs = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="${HZ}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${p.sky}"/><stop offset="0.65" stop-color="${mix(p.sky, p.sun, 0.16)}"/><stop offset="1" stop-color="${mix(p.sky, p.sun, 0.42)}"/></linearGradient>`;
  defs += `<linearGradient id="wa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(p.water, p.shade, 0.3)}"/><stop offset="1" stop-color="${mix(p.water, p.sky, 0.25)}"/></linearGradient>`;
  defs += `<clipPath id="pool"><ellipse cx="${f(cx)}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>`;

  let sky = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  if (p.orb === "crescent") {
    const st = rng(p.seed * 13 + 5);
    for (let i = 0; i < 80; i++) {
      const x = st() * W, y = st() * (HZ - 110), rr = 0.7 + st() * 1.4, o = 0.35 + st() * 0.55;
      if (Math.hypot(x - sx, y - sy) > sr * 1.7) sky += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${p.sun}" opacity="${o.toFixed(2)}"/>`;
    }
    defs += `<mask id="orb" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="${f(sx + sr * 0.42)}" cy="${f(sy - sr * 0.28)}" r="${f(sr * 0.88)}" fill="#000"/></mask>`;
    sky += `<circle cx="${f(sx)}" cy="${sy}" r="${f(sr * 1.9)}" fill="${p.sun}" opacity="0.07"/><circle cx="${f(sx)}" cy="${sy}" r="${sr}" fill="${p.sun}" mask="url(#orb)"/>`;
  } else if (p.orb === "striped") {
    let bars = "";
    for (let k = 0; k < 5; k++) bars += `<rect x="${f(sx - sr - 4)}" y="${f(sy + sr * 0.1 + k * sr * 0.2)}" width="${sr * 2 + 8}" height="${f(sr * (0.035 + k * 0.03))}" fill="#000"/>`;
    defs += `<mask id="orb" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${bars}</mask>`;
    sky += `<circle cx="${f(sx)}" cy="${sy}" r="${f(sr * 1.7)}" fill="${p.sun}" opacity="0.12"/><circle cx="${f(sx)}" cy="${sy}" r="${sr}" fill="${p.sun}" mask="url(#orb)"/>`;
  } else {
    sky += `<circle cx="${f(sx)}" cy="${sy}" r="${f(sr * 2.4)}" fill="${p.sun}" opacity="0.1"/><circle cx="${f(sx)}" cy="${sy}" r="${f(sr * 1.6)}" fill="${p.sun}" opacity="0.16"/><circle cx="${f(sx)}" cy="${sy}" r="${sr}" fill="${p.sun}"/>`;
  }

  let land = "";
  const n = p.dunes, side = sunRight ? -1 : 1;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1), u = i / n;
    const col = mix(haze, deep, t);
    const dn = dune(r, W, H, 478 + u * 100, 95 - 45 * u, 2 + Math.floor(r() * 2));
    land += `<path d="${dn.d}" fill="${col}"/><path d="${shadows(dn.pts, side)}" fill="${mix(col, p.shade, 0.2 + 0.25 * t)}"/>`;
  }
  land += `<path d="${dune(r, W, H, 592, 14, 3).d}" fill="${p.sand}"/>`;

  const slots = [[215, 330, 44], [338, 262, -52], [164, 206, -34], [24, 188, 58]];
  const pl = slots.slice(0, p.palms).map(([deg, h, lean], i) => {
    const th = ((deg + (r() - 0.5) * 10) * Math.PI) / 180;
    return { x: cx + (rx + 20) * Math.cos(th), y: cy + (ry + 10) * Math.sin(th), h: h * (0.9 + 0.2 * r()), lean: lean + (r() - 0.5) * 24, s: p.seed * 131 + i * 17 };
  }).sort((a, b) => a.y - b.y);
  const trunk = mix(p.shade, p.palm, 0.35);
  const cols = { trunk, ring: mix(trunk, p.sand, 0.3), frond: p.palm, back: mix(p.palm, p.shade, 0.35), nut: mix(p.shade, p.palm, 0.3) };
  const rc = mix(p.water, p.palm, 0.5);
  const mono = { trunk: rc, ring: null, frond: rc, back: rc, nut: rc };

  pl.forEach((o) => { land += `<ellipse cx="${f(o.x + side * o.h * 0.13)}" cy="${f(o.y + 3)}" rx="${f(o.h * 0.17)}" ry="6" fill="${p.shade}" opacity="0.2"/>`; });
  land += `<ellipse cx="${f(cx)}" cy="${cy}" rx="${rx + 16}" ry="${ry + 9}" fill="${mix(p.sand, p.shade, 0.28)}"/>`;
  land += `<ellipse cx="${f(cx)}" cy="${cy}" rx="${rx + 6}" ry="${ry + 4}" fill="${mix(p.sand, p.shade, 0.42)}"/>`;
  land += `<ellipse cx="${f(cx)}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#wa)"/>`;

  let pool = pl.map((o) => `<g transform="translate(${f(o.x)},${f(Math.max(o.y, cy - ry))}) scale(1,-0.58)" opacity="0.9">${palm(rng(o.s), o.h, o.lean, mono)}</g>`).join("");
  const sxr = Math.max(cx - rx * 0.55, Math.min(cx + rx * 0.55, sx));
  let glint = "", rip = "";
  for (let k = 0; k < 5; k++) { const w = sr * (1.1 - k * 0.18); glint += `M${f(sxr - w / 2)},${f(cy - ry * 0.55 + k * ry * 0.27)}h${f(w)}`; }
  for (let k = 0; k < 8; k++) {
    const yy = cy - ry * 0.7 + k * ry * 0.2, half = rx * Math.sqrt(Math.max(0, 1 - ((yy - cy) / ry) ** 2));
    const len = half * (0.25 + 0.4 * tr()), x0 = cx - half + tr() * (2 * half - len);
    rip += `M${f(x0)},${f(yy)}h${f(len)}`;
  }
  pool += `<path d="${glint}" stroke="${p.sun}" stroke-width="5" stroke-linecap="round" opacity="0.7"/>`;
  pool += `<path d="${rip}" stroke="${mix(p.water, p.sky, 0.55)}" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>`;
  land += `<g clip-path="url(#pool)">${pool}</g>`;

  const tc = mix(p.palm, p.sand, 0.15);
  let back = "", front = "";
  for (let i = 0; i < 7; i++) {
    const th = tr() * Math.PI * 2, sz = 16 + tr() * 12;
    const t = tuft(tr, cx + (rx + 14) * Math.cos(th), cy + (ry + 8) * Math.sin(th), sz, tc);
    if (Math.sin(th) < 0) back += t; else front += t;
  }
  const palms = pl.map((o) => `<g transform="translate(${f(o.x)},${f(o.y)})">${palm(rng(o.s), o.h, o.lean, cols)}</g>`).join("");

  const flip = tr() < 0.5 ? "" : ` transform="translate(${W},0) scale(-1,1)"`;
  const lip = `<g${flip}><path d="M0,${H} L0,712 C140,690 300,708 470,${H}Z" fill="${mix(p.sand, p.shade, 0.18)}"/><path d="M0,${H} L0,748 C130,735 250,752 360,${H}Z" fill="${mix(p.sand, p.shade, 0.32)}"/>${tuft(tr, 120, 704, 26, tc)}${tuft(tr, 236, 712, 20, tc)}</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs>${sky}${land}${back}${palms}${front}${lip}</svg>`;
}
