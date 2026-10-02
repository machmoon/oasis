// Onboarding scenes: three welcome-flow characters (waving, setting up a profile, celebrating) on seeded blobs.
export const meta = {
  title: "Warm Welcome Trio",
  kind: "illustration",
  description: "Three onboarding illustrations, a wave hello, profile setup and a celebration, for welcome flows, empty states and signup screens.",
  tags: ["onboarding", "welcome", "character", "people", "empty state", "celebration", "profile", "illustration"],
  price: 10,
  author: "oasis-factory",
  size: [1200, 480],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#F6EFE6" },
    outfit: { type: "color", role: "primary", label: "Outfit main", default: "#E2603F" },
    outfit2: { type: "color", role: "secondary", label: "Outfit second", default: "#2D4A6B" },
    ink: { type: "color", role: "ink", label: "Ink", default: "#1F1B24" },
    scene: { type: "choice", label: "Scene", default: "trio", options: ["trio", "wave", "profile", "celebrate"] },
    skin1: { type: "choice", label: "Waver skin", default: "medium", options: ["light", "medium-light", "medium", "medium-dark", "dark"] },
    skin2: { type: "choice", label: "Profile skin", default: "dark", options: ["light", "medium-light", "medium", "medium-dark", "dark"] },
    skin3: { type: "choice", label: "Celebrant skin", default: "light", options: ["light", "medium-light", "medium", "medium-dark", "dark"] },
    style: { type: "choice", label: "Style", default: "outlined", options: ["outlined", "flat"] },
    lineWeight: { type: "range", label: "Line weight", default: 3, min: 1, max: 8, step: 0.5 },
    blobSeed: { type: "range", label: "Blob shape", default: 9, min: 1, max: 100, step: 1 },
  },
  presets: {
    Sunset: { background: "#FFF0E6", outfit: "#D9415B", outfit2: "#3B3355", ink: "#2A1E2C" },
    Mint: { background: "#E7F3EE", outfit: "#2F8F6F", outfit2: "#F2B33D", ink: "#12302A" },
    Lilac: { background: "#EFEAFB", outfit: "#6D4AE0", outfit2: "#F27D9B", ink: "#221A3A" },
    Midnight: { background: "#14131C", outfit: "#F2A541", outfit2: "#5BC0BE", ink: "#F4F1EA" },
  },
};

const SKIN = {
  light: ["#F5D3BC", "#7A4A2A", "#3A2418"],
  "medium-light": ["#E7B48F", "#3B2A20", "#2E1C12"],
  medium: ["#C68A5E", "#2E1F18", "#22130B"],
  "medium-dark": ["#99633E", "#1F1510", "#170D07"],
  dark: ["#66422C", "#16100D", "#120905"],
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
const toHex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (h) => {
  const [r, g, b] = hx(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

function palette(p) {
  const bg = p.background, dark = lum(bg) < 0.2;
  let blob = bg;
  for (let t = 0.12; t <= 0.61; t += 0.04) { blob = mix(bg, p.outfit, t); if (cr(blob, bg) >= 1.25) break; }
  if (cr(blob, bg) < 1.25) for (let t = 0.06; t <= 0.6; t += 0.04) { blob = mix(bg, dark ? "#FFFFFF" : "#000000", t); if (cr(blob, bg) >= 1.25) break; }
  const light = lum(p.ink) > 0.6 ? p.ink : "#FFFFFF";
  const surface = dark ? mix(bg, light, 0.93) : mix(bg, "#FFFFFF", 0.82);
  const textInk = cr(p.ink, surface) >= 4.5 ? p.ink : (cr("#1C1A22", surface) > cr("#FFFFFF", surface) ? "#1C1A22" : "#FFFFFF");
  const line = lum(p.ink) < 0.2 ? p.ink : mix(p.ink, "#17151D", 0.85);
  const score = (c) => Math.min(cr(c, bg), cr(c, blob));
  const deco = score(p.ink) >= 3 ? p.ink : [line, "#FFFFFF", "#17151D"].sort((a, b) => score(b) - score(a))[0];
  const halo = dark || cr("#1A1210", bg) < 3.2 || cr("#1A1210", blob) < 3.2 ? surface : null;
  return {
    lw: p.lineWeight, outlined: p.style === "outlined", limbAdj: 0, line, deco, blob, surface, textInk, halo, dark,
    shade: dark ? mix(blob, "#000000", 0.35) : mix(blob, line, 0.18),
    cardShadow: dark ? mix(bg, "#000000", 0.5) : mix(blob, line, 0.22),
    muted: mix(surface, textInk, 0.3), muted2: mix(surface, textInk, 0.14),
    confetti: [p.outfit, p.outfit2, mix(p.outfit, deco, 0.35)],
  };
}

function dress(P, key, top, pants, stripe) {
  const [skin, hair, feat] = SKIN[key] || SKIN.medium;
  return {
    skin, hair, feat, stripe, top, pants,
    blush: mix(skin, "#E0645A", 0.35), skinShade: mix(skin, "#3A1A10", 0.2), edge: mix(skin, "#2A140C", 0.35),
    topShade: mix(top, "#000000", 0.14), sleeve: P.outlined ? top : mix(top, "#000000", 0.08),
    shoe: mix(pants, "#1A1820", 0.65), tongue: mix(skin, "#C2413B", 0.6),
  };
}

const st = (Q) => (Q.outlined ? ` stroke="${Q.line}" stroke-width="${Q.lw}" stroke-linejoin="round"` : "");
const S = (Q, d, f, a = st(Q)) => `<path d="${d}" fill="${f}"${a}/>`;
const Ci = (Q, x, y, r, f, a = st(Q)) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${a}/>`;
const Rr = (Q, x, y, w, h, rx, f, a = st(Q)) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"${a}/>`;
const limb = (Q, d, c, w) =>
  (Q.outlined ? `<path d="${d}" fill="none" stroke="${Q.line}" stroke-width="${w + Q.lw * 2 + Q.limbAdj}" stroke-linecap="round" stroke-linejoin="round"/>` : "") +
  `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

function blobPath(cx, cy, R, n, r) {
  const angle = (Math.PI * 2) / n, offs = [];
  for (let i = 0; i < n; i++) offs.push(1 - 0.3 * r());
  const mx = Math.max(...offs);
  const pts = offs.map((o, i) => [cx + Math.sin(i * angle) * R * (o / mx), cy + Math.cos(i * angle) * R * (o / mx) * 0.96]);
  const k = ((4 / 3) * Math.tan(angle / 4)) / Math.sin(angle / 2) / 2;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += ` C${(p1[0] + (p2[0] - p0[0]) * k).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) * k).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) * k).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) * k).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

function hairBack(Q, C, cx, kind) {
  if (kind === "bun") return Ci(Q, cx + 4, 84, 18, C.hair) + S(Q, `M${cx - 38} 118Q${cx - 46} 170 ${cx - 30} 188H${cx + 30}Q${cx + 46} 170 ${cx + 38} 118Z`, C.hair);
  if (kind === "curly") return [-190, -160, -130, -100, -70, -40, -10].map((a) => {
    const t = (a * Math.PI) / 180;
    return Ci(Q, (cx + Math.cos(t) * 36).toFixed(1), (124 + Math.sin(t) * 36).toFixed(1), 15, C.hair);
  }).join("");
  return "";
}

function hairFront(Q, C, cx, kind) {
  if (kind === "bun") return S(Q, `M${cx - 37} 132C${cx - 42} 90 ${cx + 30} 78 ${cx + 38} 124C${cx + 24} 104 ${cx - 4} 100 ${cx - 20} 112C${cx - 28} 118 ${cx - 33} 124 ${cx - 37} 132Z`, C.hair);
  if (kind === "curly") return [[-22, 103], [-7, 96], [9, 97], [24, 104]].map(([x, y]) => Ci(Q, cx + x, y, 13, C.hair)).join("");
  return S(Q, `M${cx - 37} 128C${cx - 40} 92 ${cx - 16} 84 ${cx + 2} 86C${cx + 26} 84 ${cx + 42} 100 ${cx + 37} 128C${cx + 30} 110 ${cx + 12} 104 ${cx - 4} 108C${cx - 20} 104 ${cx - 32} 112 ${cx - 37} 128Z`, C.hair);
}

function face(C, cx, kind, lw) {
  const y = 128, f = C.feat, sw = Math.min(4, Math.max(2.6, lw * 0.9));
  let s = `<circle cx="${cx - 22}" cy="${y + 14}" r="7.5" fill="${C.blush}" opacity="0.7"/><circle cx="${cx + 22}" cy="${y + 14}" r="7.5" fill="${C.blush}" opacity="0.7"/>`;
  if (kind === "joy") {
    s += `<path d="M${cx - 20} ${y + 1}Q${cx - 13} ${y - 8} ${cx - 6} ${y + 1}M${cx + 6} ${y + 1}Q${cx + 13} ${y - 8} ${cx + 20} ${y + 1}" fill="none" stroke="${f}" stroke-width="${sw}" stroke-linecap="round"/>`;
    s += `<path d="M${cx - 14} ${y + 11}H${cx + 14}Q${cx + 13} ${y + 29} ${cx} ${y + 29}Q${cx - 13} ${y + 29} ${cx - 14} ${y + 11}Z" fill="${f}"/>`;
    s += `<ellipse cx="${cx}" cy="${y + 24.5}" rx="6.5" ry="3.6" fill="${C.tongue}"/>`;
    return s + `<path d="M${cx - 12} ${y + 11}H${cx + 12}L${cx + 10.8} ${y + 16}H${cx - 10.8}Z" fill="#FFFFFF"/>`;
  }
  const dx = kind === "focus" ? 3 : 0, w = kind === "focus" ? 8 : 10;
  for (const ex of [-13, 13]) s += `<ellipse cx="${cx + ex + dx}" cy="${y}" rx="4.4" ry="5.6" fill="${f}"/><circle cx="${cx + ex + dx + 1.6}" cy="${y - 1.9}" r="1.8" fill="#FFFFFF"/>`;
  s += `<path d="M${cx - w + dx} ${y + 13}H${cx + w + dx}Q${cx + w - 1 + dx} ${y + 24} ${cx + dx} ${y + 24}Q${cx - w + 1 + dx} ${y + 24} ${cx - w + dx} ${y + 13}Z" fill="${f}"/>`;
  return s + `<path d="M${cx - w + 1.5 + dx} ${y + 13}H${cx + w - 1.5 + dx}L${cx + w - 2.6 + dx} ${y + 16.5}H${cx - w + 2.6 + dx}Z" fill="#FFFFFF"/>`;
}

function body(P, C0, cx, o, halo) {
  const Q = halo ? { ...P, outlined: true, line: P.halo, lw: (P.outlined ? P.lw : 0) + 10, limbAdj: -10 } : P;
  const C = halo ? Object.fromEntries(Object.keys(C0).map((k) => [k, P.halo])) : C0;
  const sk = Q.outlined ? st(Q) : ` stroke="${C.edge}" stroke-width="1.5"`;
  let s = hairBack(Q, C, cx, o.hair);
  s += S(Q, `M${cx - 38} 288H${cx + 38}L${cx + 34} 400H${cx + 5}L${cx} 322L${cx - 5} 400H${cx - 34}Z`, C.pants);
  s += Rr(Q, cx - 40, 394, 36, 16, 8, C.shoe) + Rr(Q, cx + 4, 394, 36, 16, 8, C.shoe);
  s += Rr(Q, cx - 9, 150, 18, 40, 6, C.skin, sk);
  const torso = `M${cx - 44} 200Q${cx - 44} 182 ${cx - 26} 182H${cx + 26}Q${cx + 44} 182 ${cx + 44} 200L${cx + 38} 292H${cx - 38}Z`;
  if (halo) s += S(Q, torso, C.top);
  else {
    if (!Q.outlined) s += `<rect x="${cx - 9}" y="164" width="18" height="18" fill="${C.skinShade}"/>`;
    s += `<path d="${torso}" fill="${C.top}"/>`;
    if (C.stripe) s += `<clipPath id="tc${cx}"><path d="${torso}"/></clipPath><g clip-path="url(#tc${cx})" fill="${C.stripe}">${[212, 240, 268].map((y) => `<rect x="${cx - 46}" y="${y}" width="92" height="11"/>`).join("")}</g>`;
    if (!Q.outlined) s += `<path d="M${cx + 18} 182H${cx + 26}Q${cx + 44} 182 ${cx + 44} 200L${cx + 38} 292H${cx + 24}Q${cx + 32} 236 ${cx + 18} 182Z" fill="${C.topShade}" opacity="${C.stripe ? 0.5 : 1}"/>`;
    else s += `<path d="${torso}" fill="none"${st(Q)}/>`;
  }
  const ct = 182 - (Q.outlined ? Q.lw / 2 : 0);
  s += `<path d="M${cx - 13} ${ct}L${cx} 199L${cx + 13} ${ct}Z" fill="${C.skin}"/>`;
  if (Q.outlined) s += `<path d="M${cx - 13} 182L${cx} 199L${cx + 13} 182" fill="none" stroke="${Q.line}" stroke-width="${Q.lw}" stroke-linejoin="round" stroke-linecap="round"/>`;
  s += Ci(Q, cx - 35, 134, 8, C.skin, sk) + Ci(Q, cx + 35, 134, 8, C.skin, sk) + Ci(Q, cx, 128, 36, C.skin, sk);
  s += hairFront(Q, C, cx, o.hair) + (halo ? "" : face(C, cx, o.face, P.lw));
  for (const arm of [o.L, o.R]) {
    s += limb(Q, `M${arm.map(([x, y]) => `${cx + x} ${y}`).join("L")}`, C.sleeve, 19);
    s += Ci(Q, cx + arm[2][0], arm[2][1], 11, C.skin, sk);
  }
  return `<g transform="translate(0 ${-(o.lift || 0)})">${s}</g>`;
}

function figure(P, C, cx, o) {
  const lift = o.lift || 0;
  return `<ellipse cx="${cx}" cy="412" rx="${64 - lift * 1.5}" ry="${(9 - lift * 0.15).toFixed(1)}" fill="${P.shade}"/>` +
    (P.halo ? body(P, C, cx, o, true) : "") + body(P, C, cx, o, false);
}

function panelShadow(P, inner) {
  return P.outlined && !P.dark
    ? `<g transform="translate(6 6)" fill="${P.line}">${inner}</g>`
    : `<g transform="translate(0 8)" fill="${P.cardShadow}">${inner}</g>`;
}

function wave(P, C) {
  const cx = 212;
  const bd = "M70 58H118A30 30 0 0 1 148 88A30 30 0 0 1 128 116L154 134L106 118H70A30 30 0 0 1 70 58Z";
  let s = panelShadow(P, `<path d="${bd}"/>`) + S(P, bd, P.surface);
  s += `<text x="98" y="98" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="28" font-weight="700" fill="${P.textInk}">Hi!</text>`;
  s += figure(P, C, cx, { hair: "short", face: "smile", L: [[-36, 200], [-50, 250], [-46, 292]], R: [[36, 200], [74, 170], [84, 114]] });
  return s + `<path d="M${cx + 106} 98Q${cx + 116} 114 ${cx + 106} 130M${cx + 120} 88Q${cx + 136} 114 ${cx + 120} 140" fill="none" stroke="${P.deco}" stroke-width="${P.lw}" stroke-linecap="round"/>`;
}

function profile(P, C) {
  const cx = 120, c = P;
  let s = panelShadow(P, `<rect x="190" y="120" width="150" height="210" rx="18"/>`) + Rr(P, 190, 120, 150, 210, 18, c.surface);
  s += `<circle cx="265" cy="170" r="26" fill="${mix(c.surface, C.top, 0.28)}"/><circle cx="265" cy="163" r="10" fill="${C.skin}"/>`;
  s += `<path d="M248 189Q251 176 265 176Q279 176 282 189A26 26 0 0 1 248 189Z" fill="${C.top}"/>`;
  s += `<rect x="225" y="210" width="80" height="10" rx="5" fill="${c.muted}"/><rect x="237" y="228" width="56" height="8" rx="4" fill="${c.muted2}"/>`;
  s += `<rect x="210" y="252" width="34" height="18" rx="9" fill="${c.confetti[0]}"/><circle cx="235" cy="261" r="6.5" fill="${c.surface}"/><rect x="254" y="257" width="66" height="8" rx="4" fill="${c.muted2}"/>`;
  s += `<rect x="210" y="280" width="34" height="18" rx="9" fill="${c.muted2}"/><circle cx="219" cy="289" r="6.5" fill="${c.surface}"/><rect x="254" y="285" width="52" height="8" rx="4" fill="${c.muted2}"/>`;
  s += `<rect x="210" y="310" width="110" height="6" rx="3" fill="${c.muted2}"/><rect x="210" y="310" width="74" height="6" rx="3" fill="${c.confetti[0]}"/>`;
  s += Ci(P, 336, 124, 15, "#2E9E6A") + `<path d="M329 124L334 129L343 119" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  return s + figure(P, C, cx, { hair: "bun", face: "focus", L: [[-36, 200], [-50, 250], [-46, 292]], R: [[36, 200], [70, 252], [108, 294]] });
}

function celebrate(P, C, p) {
  const cx = 200, r = rng(p.blobSeed * 131 + 17), pts = [];
  let s = "", tries = 0;
  while (pts.length < 18 && tries++ < 600) {
    const x = 30 + r() * 340, y = 30 + r() * 326;
    if (x > cx - 120 && x < cx + 120 && y > 46) continue;
    if (pts.some((q) => Math.hypot(q[0] - x, q[1] - y) < 30)) continue;
    pts.push([x, y]);
  }
  pts.forEach(([x, y], i) => {
    const col = P.confetti[i % 3], tf = `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${Math.round(r() * 180)})`;
    if (i % 3 === 0) s += `<rect x="-7" y="-3.5" width="14" height="7" rx="1.5" fill="${col}" transform="${tf}"/>`;
    else if (i % 3 === 1) s += `<circle r="5" fill="${col}" transform="${tf}"/>`;
    else s += `<path d="M-9 0q4.5 -7 9 0t9 0" fill="none" stroke="${col}" stroke-width="${Math.min(4, Math.max(2, P.lw * 0.9))}" stroke-linecap="round" transform="${tf}"/>`;
  });
  s += figure(P, C, cx, { hair: "curly", face: "joy", lift: 12, L: [[-36, 200], [-74, 160], [-82, 102]], R: [[36, 200], [74, 160], [82, 102]] });
  for (const sg of [-1, 1]) {
    const x0 = cx + sg * 82, hy = 90;
    s += `<path d="M${x0 + sg * 20} ${hy - 6}l${sg * 12} -6M${x0 + sg * 6} ${hy - 20}l${sg * 4} -12M${x0 + sg * 22} ${hy + 8}l${sg * 12} 2" fill="none" stroke="${P.deco}" stroke-width="${P.lw}" stroke-linecap="round"/>`;
  }
  return s;
}

export default function render(p) {
  const P = palette(p);
  const deep = (c) => mix(c, "#1A1820", 0.5);
  const Cs = {
    wave: dress(P, p.skin1, p.outfit, p.outfit2),
    profile: dress(P, p.skin2, p.outfit2, deep(p.outfit)),
    celebrate: dress(P, p.skin3, p.outfit, deep(p.outfit2), mix(p.outfit, "#FFFFFF", 0.62)),
  };
  const order = ["wave", "profile", "celebrate"], fns = { wave, profile, celebrate };
  const list = p.scene === "trio" ? order : [order.includes(p.scene) ? p.scene : "wave"];
  const W = 400 * list.length, H = 480;
  const out = list.map((name, i) => {
    const k = order.indexOf(name);
    const blob = `<path d="${blobPath(200, 254, 170, 7, rng(p.blobSeed * 7919 + k * 101))}" fill="${P.blob}"/>`;
    return `<g transform="translate(${i * 400} 0)">${blob}${fns[name](P, Cs[name], p)}</g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${p.background}"/>${out}</svg>`;
}
