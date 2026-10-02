// Cozy desk corner: laptop, lamp, plant, mug and window, relit hour by hour in a front or isometric view.
export const meta = {
  title: "Cozy Desk Corner",
  kind: "illustration",
  description: "A warm home-office desk with laptop, lamp, plant, mug and window, relit from dawn to midnight, for hero images, blog headers and remote-work themes.",
  tags: ["workspace", "desk", "home office", "isometric", "cozy", "laptop", "plant", "interior"],
  price: 9,
  author: "oasis-factory",
  size: [800, 600],
};

export const params = {
  knobs: {
    wall: { type: "color", role: "background", label: "Wall", default: "#E8DFD0" },
    desk: { type: "color", role: "surface", label: "Desk", default: "#B9875C" },
    accent: { type: "color", role: "primary", label: "Accent", default: "#D9693A" },
    ink: { type: "color", role: "ink", label: "Ink", default: "#2B2724" },
    perspective: { type: "choice", label: "Perspective", default: "front", options: ["front", "isometric"] },
    art: { type: "choice", label: "Wall art", default: "arch", options: ["arch", "mountains", "trio", "none"] },
    hour: { type: "range", label: "Time of day", default: 9, min: 6, max: 23, step: 0.5 },
    leafy: { type: "range", label: "Plant size", default: 1, min: 0.75, max: 1.25, step: 0.05 },
    lamp: { type: "toggle", label: "Desk lamp", default: true },
    plant: { type: "toggle", label: "Plant", default: true },
    mug: { type: "toggle", label: "Mug", default: true },
  },
  presets: {
    "Golden Hour": { wall: "#E8DFD0", desk: "#B9875C", accent: "#D9693A", ink: "#2B2724", hour: 18, perspective: "isometric", art: "mountains" },
    Sage: { wall: "#DCE4D7", desk: "#F4F0E8", accent: "#3F7A5E", ink: "#22302A", hour: 12.5, perspective: "front", art: "trio", mug: false },
    Midnight: { wall: "#1F2433", desk: "#7A5236", accent: "#F0B24A", ink: "#ECE6D8", hour: 22, perspective: "isometric", art: "arch" },
    Blush: { wall: "#F4DCD5", desk: "#FFFFFF", accent: "#5466E8", ink: "#2C2442", hour: 6.5, perspective: "front", art: "none", lamp: false },
  },
};

const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = a => "#" + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const tone = (c, t) => (t >= 0 ? mix(c, "#FFFFFF", t) : mix(c, "#000000", -t));
const lum = c => { const [r, g, b] = hx(c).map(v => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function step(c, ref, min) {
  const d = lum(ref) > 0.2 ? -1 : 1;
  let out = c;
  for (let i = 1; i <= 20 && cr(out, ref) < min; i++) out = tone(c, d * i * 0.05);
  return out;
}
const f = n => +n.toFixed(2);
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

const KEYS = [
  [6, "#6E8FC9", "#FFC29A", "#FFE7C2", [0.92, 0.86, 0.86], "#C98AA0", 0.14, "#FFC79A", 0.3, 0.55],
  [9, "#8EC3E6", "#FFE0BE", "#FFF3D1", [1, 0.97, 0.92], "#FFCF9E", 0.07, "#FFE2B0", 0.4, 0.3],
  [13, "#4F9DE2", "#C3E6F8", "#FFFFFF", [1, 1, 1], "#FFFFFF", 0, "#FFFFFF", 0.32, 0.15],
  [17, "#6A8CD0", "#FFC98A", "#FFE3A6", [1, 0.92, 0.84], "#FFB070", 0.08, "#FFC07A", 0.4, 0.35],
  [19, "#3E3A80", "#FF8E5E", "#FFC872", [0.94, 0.78, 0.74], "#6A3C72", 0.16, "#FF9C63", 0.3, 0.75],
  [21, "#0B1433", "#26355F", "#F4F0DC", [0.4, 0.45, 0.62], "#10162E", 0.3, "#A9B8FF", 0, 1],
  [23, "#070C22", "#1A2547", "#F4F0DC", [0.34, 0.39, 0.56], "#0B1028", 0.34, "#A9B8FF", 0, 1],
];
const BLD = [[12, 7], [16.5, 12], [21.5, 6], [25, 15], [30.5, 9], [35, 13], [40, 6.5], [44, 10]];
const STARS = [[15, 11], [21, 17], [33, 10], [44, 21], [26, 13], [17, 22], [46, 12]];
const LEAVES = [[-50, 14, 3.2, 0], [48, 15, 3.2, 0], [-30, 21, 3.8, 1], [28, 20, 3.8, 1], [-12, 25, 4.4, 2], [14, 23, 4.2, 3], [2, 17, 3.6, 2]];
const GREENS = ["#2D5E45", "#3A7A55", "#4C9464", "#5FA772"];

export default function render(p) {
  const W = 800, H = 600, T = 36, D = 50, HW = 88, h = cl(p.hour, 6, 23);
  let ki = 0; while (ki < KEYS.length - 2 && h > KEYS[ki + 1][0]) ki++;
  const k0 = KEYS[ki], k1 = KEYS[ki + 1], u = cl((h - k0[0]) / (k1[0] - k0[0])), lr = (a, b) => a + (b - a) * u;
  const lt = { top: mix(k0[1], k1[1], u), bot: mix(k0[2], k1[2], u), sunc: mix(k0[3], k1[3], u), m: k0[4].map((v, j) => lr(v, k1[4][j])), t: mix(k0[5], k1[5], u), a: lr(k0[6], k1[6]), beamC: mix(k0[7], k1[7], u), beamOp: lr(k0[8], k1[8]), lamp: lr(k0[9], k1[9]) };
  const dk = cl((h - 17) / 4), night = h >= 19.5, nA = cl((h - 19.5) / 1.5), sunT = cl((h - 6) / 13);
  const iso = p.perspective === "isometric";
  const L = c => { const [r, g, b] = hx(c); return mix(toHex([r * lt.m[0], g * lt.m[1], b * lt.m[2]]), lt.t, lt.a); };
  const wall = p.wall, ink = p.ink, darkWall = lum(wall) < 0.2, desk = step(p.desk, wall, 1.35), acc = step(p.accent, wall, 1.4);
  const frameC = step(tone(wall, 0.7), wall, 1.12);
  const floorC = darkWall ? tone(mix(wall, desk, 0.3), -0.35) : step(tone(mix(wall, desk, 0.4), -0.14), wall, 1.25);
  const hw = step(lum(ink) < 0.2 ? ink : "#26231F", wall, 1.8);
  const shell = step("#D3D6DC", desk, 1.25), paper = mix("#FBF8F2", acc, 0.06), potC = step(mix("#F1ECE3", wall, 0.2), desk, 1.3);
  const bgC = step(tone(wall, darkWall ? 0.08 : -0.06), wall, 1.12);
  const face = tone(desk, -0.05), hDark = tone(desk, -0.5), hLight = tone(desk, 0.55), hc = cr(hDark, face) >= cr(hLight, face) ? hDark : hLight;
  const C = 0.866, K = 0.42, E = iso ? [1.2247, 0.7071] : [1, K];
  const P = (x, y, z) => (iso ? [(x + y) * C, (x - y) * 0.5 - z] : [x, -z - y * K]);
  const pt = q => P(q[0], q[1], q[2]).map(f).join(",");
  const poly = (pts, fill, ex = "") => `<path d="M${pts.map(pt).join("L")}Z" fill="${fill}"${ex}/>`;
  const rect = (x0, y0, x1, y1, z, fill, ex) => poly([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], fill, ex);
  let defs = "", gid = 0;
  const box = (x0, y0, z0, x1, y1, z1, c) =>
    poly([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], L(tone(c, -0.1))) +
    (iso ? poly([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], L(tone(c, -0.22))) : "") +
    rect(x0, y0, x1, y1, z1, L(c));
  const ell = (x, y, z, r, fill, ex = "") => { const c = P(x, y, z); return `<ellipse cx="${f(c[0])}" cy="${f(c[1])}" rx="${f(r * E[0])}" ry="${f(r * E[1])}" fill="${fill}"${ex}/>`; };
  const cyl = (x, y, z0, z1, rb, rt, c) => {
    const id = "c" + gid++, b = P(x, y, z0), t = P(x, y, z1);
    defs += `<linearGradient id="${id}"><stop offset="0" stop-color="${L(tone(c, -0.06))}"/><stop offset="0.35" stop-color="${L(tone(c, 0.1))}"/><stop offset="1" stop-color="${L(tone(c, -0.3))}"/></linearGradient>`;
    return `<path d="M${f(t[0] - rt * E[0])},${f(t[1])}L${f(b[0] - rb * E[0])},${f(b[1])}A${f(rb * E[0])} ${f(rb * E[1])} 0 0 0 ${f(b[0] + rb * E[0])},${f(b[1])}L${f(t[0] + rt * E[0])},${f(t[1])}Z" fill="url(#${id})"/>` + ell(x, y, z1, rt, L(tone(c, 0.06)));
  };

  let out = "";
  if (iso) {
    const s = P(60, 27, -5);
    out += `<ellipse cx="${f(s[0])}" cy="${f(s[1] + 8)}" rx="92" ry="24" fill="#000" opacity=".22" filter="url(#blur)"/>`;
    out += box(-4, 0, -5, 120, 54, 0, floorC)
      + poly([[0, D, 0], [120, D, 0], [120, D, HW], [0, D, HW]], L(wall))
      + poly([[120, D, -5], [120, 54, -5], [120, 54, HW], [120, D, HW]], L(tone(wall, -0.2)))
      + rect(-4, D, 120, 54, HW, L(tone(wall, 0.35)))
      + poly([[0, 0, 0], [0, D, 0], [0, D, HW], [0, 0, HW]], L(tone(wall, -0.07)))
      + rect(-4, 0, 0, 54, HW, L(tone(wall, 0.35)))
      + poly([[-4, 0, -5], [0, 0, -5], [0, 0, HW], [-4, 0, HW]], L(tone(wall, -0.2)))
      + box(0, 0, 0, 1.2, D - 1.2, 3.5, frameC);
  } else {
    out += rect(-200, -80, 320, D, 0, L(floorC)) + poly([[-200, D, 0], [320, D, 0], [320, D, 300], [-200, D, 300]], L(wall));
  }
  out += box(iso ? 0 : -200, D - 1.2, 0, iso ? 120 : 320, D, 3.5, frameC);

  const rugB = L(mix(floorC, acc, 0.55)), rugC = L(mix(floorC, acc, 0.3)), rugS = L(mix(paper, acc, 0.2));
  out += rect(22.4, 3.2, 98.6, 43.6, 0, "#000", ' opacity=".28" filter="url(#soft)"') + rect(22, 4, 98, 44, 0.05, rugB) + rect(24.5, 6.5, 95.5, 41.5, 0.05, rugC);
  [14.2, 23.4, 32.6].forEach(y => { out += rect(24.5, y, 95.5, y + 1.2, 0.05, rugS, ' opacity=".7"'); });
  let fr0 = "";
  for (let y = 6; y <= 42; y += 3) for (const [a, b] of [[22, 20.4], [98, 99.6]]) { const s = P(a, y, 0.05), e = P(b, y, 0.05); fr0 += `<line x1="${f(s[0])}" y1="${f(s[1])}" x2="${f(e[0])}" y2="${f(e[1])}"/>`; }
  out += `<g stroke="${rugS}" stroke-width=".35" stroke-linecap="round">${fr0}</g>`;
  out += rect(13, 19, 107, 49, 0.06, "#000", ' opacity=".14" filter="url(#soft2)"') + rect(83.2, 19.2, 106.8, 48.8, 0.06, "#000", ' opacity=".3" filter="url(#soft)"')
    + ell(15.5, 20.5, 0.06, 2.6, "#000", ' opacity=".3"') + ell(15.5, 46.5, 0.06, 2.6, "#000", ' opacity=".3"');
  out += poly([[14, D, 3.5], [106, D, 3.5], [106, D, 33], [14, D, 33]], "#000", ' opacity=".07"');

  const sx = f(16 + sunT * 28), sy = f(40 - Math.sin(Math.PI * sunT) * 27), sr = 3.2;
  let win = `<rect x="12" y="8" width="36" height="36" fill="url(#sky)"/>`;
  if (night) {
    win += `<g opacity="${f(nA)}"><circle cx="39" cy="15" r="7" fill="${lt.sunc}" opacity=".1"/><path d="M39,12.4A2.6 2.6 0 0 0 39,17.6A1.43 2.6 0 0 1 39,12.4Z" fill="${lt.sunc}"/>`;
    STARS.forEach(([x, y]) => { win += `<circle cx="${x}" cy="${y}" r=".35" fill="#FFFFFF" opacity=".8"/>`; });
    win += "</g>";
  } else {
    win += `<circle cx="${sx}" cy="${sy}" r="${f(sr * 2.6)}" fill="${lt.sunc}" opacity=".22"/><circle cx="${sx}" cy="${sy}" r="${sr}" fill="${lt.sunc}"/><g fill="${mix("#FFFFFF", lt.sunc, 0.45)}" opacity="${f(0.85 * (1 - dk))}"><rect x="15" y="16" width="11" height="3" rx="1.5"/><circle cx="19.5" cy="16.2" r="2.4"/><circle cx="22.6" cy="16.8" r="1.7"/><rect x="33" y="23" width="8" height="2.4" rx="1.2"/><circle cx="36.4" cy="23.2" r="1.8"/></g>`;
  }
  const bc = mix(lt.bot, "#1B2340", 0.38 + 0.34 * dk);
  BLD.forEach(([x, bh], i) => {
    win += `<rect x="${x}" y="${44 - bh}" width="4.4" height="${bh}" fill="${bc}"/>`;
    if (dk > 0.4) for (let r = 0; 44 - bh + 1.6 + r * 2.2 < 43; r++) for (let c = 0; c < 2; c++) if ((i * 3 + r * 5 + c * 2) % 3 === 0) win += `<rect x="${f(x + 0.9 + c * 1.7)}" y="${f(44 - bh + 1.6 + r * 2.2)}" width=".8" height=".9" fill="#FFD27A" opacity="${f(cl((dk - 0.4) * 2))}"/>`;
  });
  const spillOp = f((1 - dk) * (darkWall ? 0.55 : 0.22));
  const spill = `<g clip-path="url(#wallc)"><ellipse cx="30" cy="30" rx="46" ry="40" fill="url(#spill)" opacity="${spillOp}"/></g>`;
  const winS = `${spill}<rect x="10" y="6" width="40" height="40" fill="${L(frameC)}"/><g clip-path="url(#glass)">${win}<path d="M18,44L31,8H36L23,44Z" fill="#FFFFFF" opacity=".1"/></g><rect x="12" y="8" width="36" height="36" fill="none" stroke="#000" stroke-opacity=".15" stroke-width=".5"/><rect x="29.3" y="8" width="1.4" height="36" fill="${L(frameC)}"/><rect x="12" y="25.3" width="36" height="1.4" fill="${L(frameC)}"/>`;

  const A1 = L(acc), A2 = L(tone(acc, 0.45)), A3 = L(tone(acc, -0.35)), pap = L(paper), frC = L(hw);
  const frm = (x, y, w, hh, inner) => `<rect x="${x + 0.7}" y="${y + 0.9}" width="${w}" height="${hh}" fill="#000" opacity=".14"/><rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="${frC}"/><rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${hh - 2}" fill="${pap}"/>${inner}`;
  let artS = "";
  if (p.art === "arch") artS = frm(62, 8, 26, 24, `<path d="M69,29V17.5A6 6 0 0 1 81,17.5V29Z" fill="${A2}"/><circle cx="79.5" cy="15.5" r="3.2" fill="${A1}"/><rect x="63" y="27" width="24" height="4" fill="${A3}"/>`);
  else if (p.art === "mountains") artS = frm(60, 9, 30, 22, `<circle cx="80" cy="15.5" r="3" fill="${A2}"/><path d="M61,30L70.5,17L76,24L80.5,19.5L89,30Z" fill="${A3}"/><path d="M61,30L66.5,24.5L73,30Z" fill="${A1}"/>`);
  else if (p.art === "trio") artS = frm(59, 14, 8, 12, `<circle cx="63" cy="20" r="2.2" fill="${A1}"/>`) + frm(69, 10, 10, 20, `<rect x="71" y="13" width="6" height="3" fill="${A1}"/><rect x="71" y="18.5" width="6" height="3" fill="${A2}"/><rect x="71" y="24" width="6" height="3" fill="${A3}"/>`) + frm(81, 14, 8, 12, `<path d="M82,25L85,17L88,25Z" fill="${A3}"/>`);

  const o = P(0, D, HW), ux = P(1, D, HW), vz = P(0, D, HW - 1);
  out += `<g transform="matrix(${[ux[0] - o[0], ux[1] - o[1], vz[0] - o[0], vz[1] - o[1], o[0], o[1]].map(f).join(" ")})">${winS}<g transform="translate(-7 0)">${artS}</g></g>`;
  out += box(8, D - 3.4, 40.4, 52, D, 42.2, frameC);
  out += box(14, 45, 0, 17, 48, 33, desk) + box(84, 20, 0, 106, 48, 33, desk);
  [[22.5, 32], [12, 21.5], [1.5, 11]].forEach(([a, b]) => {
    const m = (a + b) / 2;
    out += poly([[85.2, 19.9, a], [104.8, 19.9, a], [104.8, 19.9, b], [85.2, 19.9, b]], L(face)) + poly([[92, 19.8, m - 0.55], [98, 19.8, m - 0.55], [98, 19.8, m + 0.55], [92, 19.8, m + 0.55]], L(hc));
  });
  out += box(14, 19, 0, 17, 22, 33, desk) + box(12, 18, 33, 108, 50, 36, desk)
    + poly([[12, 17.95, 35.55], [108, 17.95, 35.55], [108, 17.95, 36], [12, 17.95, 36]], L(tone(desk, 0.3)));

  let sh = rect(45.4, 25, 73, 42.6, T, "#000");
  if (p.lamp) sh += ell(24.6, 41.4, T, 6, "#000");
  if (p.plant) sh += ell(100.6, 39.4, T, 7, "#000");
  if (p.mug) sh += ell(86.6, 25.4, T, 4.4, "#000");
  out += `<g opacity=".16">${sh}</g>`;

  const dx = 0.9 - sunT * 0.7, dz = 0.45 + Math.sin(Math.PI * sunT) * 1.1, cast = (a, v) => { const t = (HW - v - T) / dz; return [a + dx * t, D - t, T]; };
  let pat = "";
  for (const [u0, u1] of [[12, 29.3], [30.7, 48]]) for (const [v0, v1] of [[8, 25.3], [26.7, 44]]) pat += poly([cast(u0, v0), cast(u1, v0), cast(u1, v1), cast(u0, v1)], lt.beamC);
  out += `<g clip-path="url(#top)">${lt.beamOp > 0.01 ? `<g opacity="${f(lt.beamOp)}" filter="url(#soft)">${pat}</g>` : ""}${p.lamp ? ell(36, 32, T, 10 + 8 * lt.lamp, "url(#pool)", ` opacity="${f(lt.lamp)}"`) : ""}</g>`;

  const nb = tone(acc, -0.4), pa = P(28, 22.5, T + 1.3), pb = P(36, 29.5, T + 1.3);
  out += box(25, 20, T, 40, 31, T + 0.9, nb) + poly([[25.4, 19.95, T + 0.2], [39.6, 19.95, T + 0.2], [39.6, 19.95, T + 0.6], [25.4, 19.95, T + 0.6]], L(paper))
    + rect(37, 20, 37.8, 31, T + 0.92, L(tone(nb, -0.35)))
    + `<line x1="${f(pa[0])}" y1="${f(pa[1])}" x2="${f(pb[0])}" y2="${f(pb[1])}" stroke="${L(ink)}" stroke-width=".7" stroke-linecap="round"/>`;

  const objs = [], lj = P(31, 40, T + 25), hwL = L(hw);
  if (p.lamp) {
    const lb = P(24, 42, T + 1.4), le = P(20, 44, T + 17);
    objs.push([24, 42, cyl(24, 42, T, T + 1.4, 5, 4.4, hw)
      + `<path d="M${f(lb[0])},${f(lb[1])}L${f(le[0])},${f(le[1])}L${f(lj[0])},${f(lj[1])}" fill="none" stroke="${hwL}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${f(le[0])}" cy="${f(le[1])}" r=".95" fill="${hwL}"/>`
      + `<g transform="translate(${f(lj[0])} ${f(lj[1])}) rotate(-18)"><path d="M-1.8,0L1.8,0L5,6.4Q0,7.8 -5,6.4Z" fill="url(#shade)"/><ellipse cy="6.9" rx="4.2" ry="1.1" fill="${mix("#B8A68A", "#FFF6DA", lt.lamp)}"/><circle r="1.5" fill="${hwL}"/></g>`]);
  }
  const A = [46, 42, T + 1.2], B = [72, 42, T + 1.2], Cc = [72, 45.5, T + 18], Dd = [46, 45.5, T + 18];
  const q = (a, v) => [0, 1, 2].map(i => Dd[i] + a * (Cc[i] - Dd[i]) + v * (A[i] - Dd[i]));
  const sq = (u0, u1, v0, v1, c) => poly([q(u0, v0), q(u1, v0), q(u1, v1), q(u0, v1)], c);
  const dm = dk > 0.55, S = dm ? ["#23262D", "#1A1C21", "#3A3E47", mix(acc, "#23262D", 0.55), "#30343C"] : ["#F6F3ED", "#E6E0D6", "#DAD3C7", tone(acc, 0.72), "#E9E3D9"];
  let lap = box(46, 26, T, 72, 42, T + 1.2, shell), kz = T + 1.25;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) { const x = 48.6 + c * 1.76, y = 33.6 + r * 1.75; lap += rect(x, y, x + 1.4, y + 1.35, kz, L(tone(shell, -0.3))); }
  lap += rect(54, 27.3, 64, 32, kz, L(tone(shell, -0.07)));
  lap += poly([A, B, Cc, Dd], L("#1C1E23")) + sq(0.04, 0.96, 0.06, 0.92, S[0]) + sq(0.04, 0.25, 0.06, 0.92, S[1])
    + [0.14, 0.24, 0.34].map(v => sq(0.08, 0.2, v, v + 0.05, S[2])).join("")
    + sq(0.31, 0.6, 0.14, 0.22, acc) + sq(0.31, 0.9, 0.3, 0.34, S[2]) + sq(0.31, 0.75, 0.39, 0.43, S[2])
    + sq(0.31, 0.59, 0.52, 0.86, S[3]) + sq(0.63, 0.92, 0.52, 0.86, S[4]);
  objs.push([59, 34, lap]);
  if (p.plant) {
    const b = P(100, 40, T + 9.6), bs = `${f(b[0])},${f(b[1])}`, ks = cl(p.leafy, 0.75, 1.25), kw = 0.6 + 0.4 * ks;
    let pl = cyl(100, 40, T, T + 10, 4.6, 6.2, potC) + ell(100, 40, T + 10, 5.3, L("#3A2A20"));
    LEAVES.forEach(([a, len0, w0, g]) => {
      const len = len0 * ks, w = w0 * kw, r = (a * Math.PI) / 180, s = Math.sin(r), c = Math.cos(r);
      const tx = b[0] + s * len * 1.1, ty = b[1] - c * len + Math.abs(s) * len * 0.12, mx = (b[0] + tx) / 2, my = (b[1] + ty) / 2;
      pl += `<path d="M${bs}Q${f(mx + c * w)},${f(my + s * w)} ${f(tx)},${f(ty)}Z" fill="${L(GREENS[g])}"/><path d="M${bs}Q${f(mx - c * w)},${f(my - s * w)} ${f(tx)},${f(ty)}Z" fill="${L(tone(GREENS[g], -0.18))}"/>`;
    });
    objs.push([100, 40, pl]);
  }
  if (p.mug) {
    const mugC = tone(acc, 0.45), mt = P(86, 26, T + 7), mh = P(86, 26, T + 3.8), xr = mh[0] + 3.35 * E[0];
    objs.push([86, 26, `<path d="M${f(xr - 0.3)},${f(mh[1] - 2)}C${f(xr + 3)},${f(mh[1] - 2.4)} ${f(xr + 3)},${f(mh[1] + 2.4)} ${f(xr - 0.3)},${f(mh[1] + 1.9)}" fill="none" stroke="${L(tone(mugC, -0.15))}" stroke-width="1.1"/>`
      + cyl(86, 26, T, T + 7, 3.3, 3.5, mugC) + ell(86, 26, T + 6.6, 2.9, L("#4A2C1C"))
      + `<g fill="none" stroke="${L(ink)}" stroke-opacity=".3" stroke-width=".6" stroke-linecap="round"><path d="M${f(mt[0] - 1)},${f(mt[1] - 1.6)}c-1.2,-1.6 1.2,-2.6 0,-4.4c-1,-1.4 .8,-2.4 0,-3.6"/><path d="M${f(mt[0] + 1.2)},${f(mt[1] - 2.2)}c-1,-1.4 1,-2.2 0,-3.6"/></g>`]);
  }
  objs.sort((a, b) => (iso ? a[0] - a[1] - (b[0] - b[1]) : b[1] - a[1])).forEach(o2 => { out += o2[2]; });
  if (dk > 0.3) out += ell(59, 34, T + 6, 20, "url(#sg)", ` opacity="${f(dk)}"`);
  if (p.lamp) out += `<circle cx="${f(lj[0] + 2)}" cy="${f(lj[1] + 6.2)}" r="${f(24 + 22 * lt.lamp)}" fill="url(#rg)" opacity="${f(lt.lamp * 0.5)}"/>`;

  let bb = [-16, -112, 136, 4];
  if (iso) {
    const cs = [[-4, 0, -5], [120, 0, -5], [120, 54, -5], [120, 54, HW], [-4, 54, HW], [-4, 0, HW]].map(v => P(v[0], v[1], v[2]));
    bb = [Math.min(...cs.map(v => v[0])), Math.min(...cs.map(v => v[1])), Math.max(...cs.map(v => v[0])), Math.max(...cs.map(v => v[1]))];
  }
  const bw = bb[2] - bb[0], bh = bb[3] - bb[1], sc = Math.min(W / bw, H / bh) * (iso ? 0.86 : 1);
  const tx = W / 2 - (bb[0] + bw / 2) * sc, ty = H / 2 - (bb[1] + bh / 2) * sc;
  defs += `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lt.top}"/><stop offset="1" stop-color="${lt.bot}"/></linearGradient>`
    + `<clipPath id="glass"><rect x="12" y="8" width="36" height="36"/></clipPath><clipPath id="wallc"><rect x="${iso ? 0 : -200}" y="0" width="${iso ? 120 : 520}" height="${HW - 3.5}"/></clipPath><clipPath id="top">${rect(12, 18, 108, 50, T, "#000")}</clipPath>`
    + `<linearGradient id="shade"><stop offset="0" stop-color="${L(tone(acc, 0.15))}"/><stop offset="1" stop-color="${L(tone(acc, -0.28))}"/></linearGradient>`
    + `<radialGradient id="spill"><stop offset="0" stop-color="${lt.beamC}" stop-opacity=".9"/><stop offset="1" stop-color="${lt.beamC}" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="pool"><stop offset="0" stop-color="#FFD98F" stop-opacity=".75"/><stop offset="1" stop-color="#FFD98F" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="rg"><stop offset="0" stop-color="#FFC56E" stop-opacity=".6"/><stop offset="1" stop-color="#FFC56E" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="sg"><stop offset="0" stop-color="#DCE6FF" stop-opacity=".35"/><stop offset="1" stop-color="#DCE6FF" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="vig" cx=".5" cy=".46" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${f(0.16 + 0.14 * dk)}"/></radialGradient>`
    + `<filter id="blur" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>`
    + `<filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".45"/></filter>`
    + `<filter id="soft2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4"/></filter>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="${L(bgC)}"/><g transform="translate(${f(tx)} ${f(ty)}) scale(${f(sc)})">${out}</g><rect width="${W}" height="${H}" fill="url(#vig)"/></svg>`;
}
