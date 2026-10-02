// Success celebration: a tonal checkmark badge lifted by a jumping character, radial burst rays and seeded confetti in animation-ready layers.
export const meta = {
  title: "Confetti Success",
  kind: "illustration",
  description: "A celebratory success-state illustration with a checkmark badge, a radial confetti burst and an optional cheering character, grouped into named layers ready for animation.",
  tags: ["success", "celebration", "confetti", "checkmark", "empty state", "onboarding", "badge", "illustration"],
  price: 0,
  author: "oasis-factory",
  size: [600, 480],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#F4F7F2" },
    accent: { type: "color", role: "primary", label: "Accent", default: "#1FA971" },
    secondary: { type: "color", role: "secondary", label: "Confetti & shirt", default: "#FFB547" },
    ink: { type: "color", role: "ink", label: "Outline", default: "#1E2A26" },
    badge: { type: "choice", label: "Badge shape", default: "seal", options: ["circle", "seal", "shield", "hexagon", "squircle"] },
    layering: { type: "choice", label: "Layering", default: "depth", options: ["flat", "depth"] },
    density: { type: "range", label: "Confetti density", default: 50, min: 10, max: 100, step: 1 },
    spread: { type: "range", label: "Burst spread", default: 55, min: 15, max: 100, step: 1 },
    size: { type: "range", label: "Badge size", default: 100, min: 70, max: 130, step: 5 },
    character: { type: "toggle", label: "Character", default: true },
  },
  presets: {
    Grape: { background: "#F6F1FF", accent: "#7C4DFF", secondary: "#FF6FA8", ink: "#251A3D" },
    Night: { background: "#12131A", accent: "#3DDC97", secondary: "#FFD166", ink: "#EDEEF5" },
    Sunrise: { background: "#FFF4EC", accent: "#FF6B3D", secondary: "#3D7BFF", ink: "#2A1A12" },
    Citrus: { background: "#FFFBEA", accent: "#F2B705", secondary: "#2E86DE", ink: "#2B2614" },
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
const toHex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (h) => { const c = hx(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const away = (bg) => (cr(bg, "#000000") >= cr(bg, "#FFFFFF") ? "#000000" : "#FFFFFF");
function ensure(c, bg, min) {
  const to = away(bg); let o = c;
  for (let t = 0.06; cr(o, bg) < min && t <= 1.001; t += 0.06) o = mix(c, to, t);
  return o;
}
const f = (n) => +n.toFixed(2);
const TAU = Math.PI * 2;

const SHIELD = "M0,-1 C0.35,-0.82 0.65,-0.78 0.88,-0.8 L0.88,0 C0.88,0.5 0.5,0.82 0,1.02 C-0.5,0.82 -0.88,0.5 -0.88,0 L-0.88,-0.8 C-0.65,-0.78 -0.35,-0.82 0,-1Z";

function shape(kind, s, fill, extra = "") {
  if (kind === "circle") return `<circle r="${s}" fill="${fill}" ${extra}/>`;
  if (kind === "squircle") return `<rect x="${f(-0.9 * s)}" y="${f(-0.9 * s)}" width="${f(1.8 * s)}" height="${f(1.8 * s)}" rx="${f(0.38 * s)}" fill="${fill}" ${extra}/>`;
  if (kind === "shield") return `<path transform="scale(${s})" d="${SHIELD}" fill="${fill}" ${extra}/>`;
  if (kind === "hexagon") {
    const pts = [0, 1, 2, 3, 4, 5].map((i) => `${f(Math.cos(i * TAU / 6) * 0.95 * s)},${f(Math.sin(i * TAU / 6) * 0.95 * s)}`);
    return `<polygon points="${pts.join(" ")}" fill="${fill}" stroke="${fill}" stroke-width="${f(0.1 * s)}" stroke-linejoin="round" ${extra}/>`;
  }
  const n = 18; let d = "";
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU - Math.PI / 2, a1 = ((i + 1) / n) * TAU - Math.PI / 2, am = (a0 + a1) / 2;
    if (!i) d += `M${f(Math.cos(a0) * 0.9 * s)},${f(Math.sin(a0) * 0.9 * s)}`;
    d += ` Q${f(Math.cos(am) * 1.1 * s)},${f(Math.sin(am) * 1.1 * s)} ${f(Math.cos(a1) * 0.9 * s)},${f(Math.sin(a1) * 0.9 * s)}`;
  }
  return `<path d="${d}Z" fill="${fill}" ${extra}/>`;
}

function piece(type, s, c) {
  if (type === 0) return `<rect x="${f(-s * 0.3)}" y="${f(-s)}" width="${f(s * 0.6)}" height="${f(s * 2)}" rx="${f(s * 0.15)}" fill="${c}"/>`;
  if (type === 1) return `<circle r="${f(s * 0.5)}" fill="${c}"/>`;
  if (type === 2) return `<path d="M0,${f(-s * 0.85)} L${f(s * 0.8)},${f(s * 0.6)} L${f(-s * 0.8)},${f(s * 0.6)}Z" fill="${c}" stroke="${c}" stroke-width="${f(s * 0.2)}" stroke-linejoin="round"/>`;
  return `<path d="M0,${f(-s * 1.1)} q${f(s * 0.8)},${f(s * 0.55)} 0,${f(s * 1.1)} t0,${f(s * 1.1)}" fill="none" stroke="${c}" stroke-width="${f(s * 0.42)}" stroke-linecap="round"/>`;
}

const sparkle = (s, c) => `<path d="M0,${-s} Q0,0 ${s},0 Q0,0 0,${s} Q0,0 ${-s},0 Q0,0 0,${-s}Z" fill="${c}" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/>`;

function figure(X, Y, k, ol, shirt, pants, shoe) {
  const skin = "#F2C29B", hair = "#2B2230", face = "#2B2230", shade = mix(shirt, "#000000", 0.18);
  const L = (d, c, w) => `<path d="${d}" fill="none" stroke="${ol}" stroke-width="${w + 6}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const o = `stroke="${ol}" stroke-width="3" stroke-linejoin="round"`;
  const foot = (x, y, a) => `<g transform="translate(${x} ${y}) rotate(${a})"><rect x="-15" y="-9" width="29" height="14" rx="7" fill="${shoe}" ${o}/><path d="M-10,1.5 H9" stroke="${mix(shoe, "#FFFFFF", 0.6)}" stroke-width="2.5" stroke-linecap="round"/></g>`;
  const hand = (x, a) => `<ellipse cx="${x}" cy="-206" rx="8.5" ry="10.5" transform="rotate(${a} ${x} -206)" fill="${skin}" ${o}/>`;
  return `<g id="character" transform="translate(${f(X)} ${f(Y)}) scale(${f(k)})">` +
    `<g id="legs">${L("M-12,-86 L-22,-50 L-15,-14", pants, 18)}${L("M12,-86 L27,-52 L33,-20", pants, 18)}${foot(-19, -6, -6)}${foot(38, -12, 14)}</g>` +
    `<g id="arm-left">${L("M-24,-140 L-48,-172 L-55,-198", shirt, 14)}${hand(-56, -18)}</g>` +
    `<g id="arm-right">${L("M24,-140 L48,-172 L55,-198", shirt, 14)}${hand(56, 18)}</g>` +
    `<g id="torso"><path d="M-30,-146 C-36,-120 -32,-98 -28,-80 L28,-80 C32,-98 36,-120 30,-146 C15,-154 -15,-154 -30,-146Z" fill="${shirt}" ${o}/>` +
    `<path d="M-28.5,-89 C-10,-85 10,-85 28.5,-89" fill="none" stroke="${shade}" stroke-width="5"/>` +
    `<rect x="-7" y="-162" width="14" height="14" fill="${skin}" ${o}/>` +
    `<path d="M-11,-151 Q0,-140 11,-151" fill="none" stroke="${ol}" stroke-width="2.5" stroke-linecap="round"/></g>` +
    `<g id="head"><circle cx="-24" cy="-176" r="6" fill="${skin}" ${o}/><circle cx="24" cy="-176" r="6" fill="${skin}" ${o}/>` +
    `<circle cx="0" cy="-178" r="24" fill="${skin}" ${o}/>` +
    `<path d="M-25,-180 C-27,-202 -12,-209 2,-208 C17,-207 27,-197 25,-178 C21,-188 13,-193 3,-193 C-7,-193 -16,-189 -25,-180Z" fill="${hair}" ${o}/>` +
    `<path d="M-1,-207 C1,-217 12,-218 15,-212 C10,-213 6,-211 5,-206Z" fill="${hair}" ${o}/>` +
    `<path d="M-13,-187 q4.5,-4 9,0 M4,-187 q4.5,-4 9,0" fill="none" stroke="${face}" stroke-width="2.4" stroke-linecap="round"/>` +
    `<ellipse cx="-8.5" cy="-179" rx="3.2" ry="4.2" fill="${face}"/><ellipse cx="8.5" cy="-179" rx="3.2" ry="4.2" fill="${face}"/>` +
    `<circle cx="-7.6" cy="-180.8" r="1.2" fill="#FFFFFF"/><circle cx="9.4" cy="-180.8" r="1.2" fill="#FFFFFF"/>` +
    `<path d="M-8,-170 Q0,-168.5 8,-170 Q7,-160 0,-159 Q-7,-160 -8,-170Z" fill="${face}"/>` +
    `<path d="M-4,-162 Q0,-166 4,-162 Q0,-159.6 -4,-162Z" fill="#F07C7C"/>` +
    `<circle cx="-15" cy="-169" r="4" fill="#F28B82" opacity="0.55"/><circle cx="15" cy="-169" r="4" fill="#F28B82" opacity="0.55"/></g></g>`;
}

export default function render(p) {
  const W = 600, H = 480, bg = p.background, acc = p.accent, ink = p.ink;
  const depth = p.layering === "depth", ch = !!p.character, dark = lum(bg) < 0.2;
  const s = p.size / 100, cx = 300;
  let R, cy, k = 1, feetY = 0;
  if (ch) {
    R = 84 * s;
    k = Math.max(0.75, Math.min(1.05, (H - 84 - 2 * R) / 226));
    const T = 2 * R + 14 + 226 * k;
    cy = (H - T) / 2 + R;
    feetY = cy + R * 1.02 + 14 + 216 * k;
  } else { R = 108 * s; cy = 222; }

  let halo = bg;
  for (let t = 0.06; cr(halo, bg) < 1.12 && t <= 0.6; t += 0.04) halo = mix(bg, acc, t);
  if (cr(halo, bg) < 1.12) halo = ensure(bg, bg, 1.12);
  const shadowC = dark ? mix(bg, "#000000", 0.55) : mix(bg, lum(ink) < 0.2 ? ink : "#000000", 0.12);
  const fg = cr(acc, "#FFFFFF") >= 2.8 ? "#FFFFFF" : "#16161C";
  const rim = mix(acc, "#000000", 0.2);
  const lowC = cr(acc, bg) < 1.6;
  const tone = dark ? "#FFFFFF" : "#000000";
  const cols = [acc, p.secondary, mix(acc, dark ? "#000000" : "#FFFFFF", 0.4), mix(p.secondary, tone, 0.2)].map((c) => ensure(c, bg, 1.6));
  const spark = ensure(mix(p.secondary, "#FFFFFF", 0.2), bg, 1.8);
  const rayC = ensure(mix(acc, bg, 0.3), bg, 1.6);
  const charOl = dark ? ensure(mix(bg, "#FFFFFF", 0.5), bg, 4) : (lum(ink) < 0.2 ? ink : "#1B1F2A");
  const pants = ensure("#34405C", bg, 2.6), shoe = ensure("#23283A", bg, 2.2);

  const placed = [];
  const sp = [[cx + R * 1.15, cy - R * 0.75, 12], [cx - R * 1.25, cy - R * 0.35, 8], [cx - R * 1.2, cy + R * 0.75, 9]];
  sp.forEach(([x, y, z]) => placed.push([x, y, z + 5]));

  const r1 = R * 1.2, r2 = R * (1.3 + p.spread * 0.0022);
  let rays = "";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + 0.13, c = Math.cos(a), sn = Math.sin(a);
    if (ch && sn > 0.45) continue;
    const ex = cx + c * (r2 + 10), ey = cy + sn * (r2 + 10);
    rays += `<path d="M${f(cx + c * r1)},${f(cy + sn * r1)} L${f(cx + c * r2)},${f(cy + sn * r2)}" stroke="${rayC}" stroke-width="4" stroke-linecap="round"/><circle cx="${f(ex)}" cy="${f(ey)}" r="2.6" fill="${rayC}"/>`;
    [[r1, 6], [(r1 + r2) / 2, 6], [r2, 6]].forEach(([d, z]) => placed.push([cx + c * d, cy + sn * d, z]));
    placed.push([ex, ey, 5]);
  }

  const r = rng(p.density * 131 + 7919);
  const n = p.density, maxD = 110 + p.spread * 3.4;
  const md0 = Math.max(12, Math.sqrt((Math.PI * maxD * maxD * 0.9) / n) * 0.38);
  const sk = 1 - 0.22 * (n - 10) / 90;
  const bx0 = cx - 80 * k, bx1 = cx + 80 * k, by0 = feetY - 226 * k, by1 = feetY + 22 * k;
  const back = [], front = [];
  for (let tries = 0; tries < n * 60 && back.length + front.length < n; tries++) {
    const th = r() * TAU, u = r(), dd = R * 1.28 + Math.pow(u, 1.15) * maxD;
    const z = (4.5 + r() * 6) * sk * (1.15 - 0.4 * u), type = Math.floor(r() * 4.6) % 4, ci = Math.floor(r() * cols.length);
    const rot = (th * 180) / Math.PI + 90 + (r() - 0.5) * 50, isBack = depth && r() < 0.35;
    const x = cx + Math.cos(th) * dd, y = cy + Math.sin(th) * dd * 0.9;
    if (x < 20 || x > W - 20 || y < 20 || y > H - 20) continue;
    if (Math.hypot(x - cx, y - cy) < R * 1.26 + z) continue;
    if (ch && x > bx0 - z - 12 && x < bx1 + z + 12 && y > by0 - z - 12 && y < by1) continue;
    const md = md0 * (0.75 + 0.6 * u);
    if (placed.some(([px, py, ps]) => Math.hypot(x - px, y - py) < Math.max(md, ps + z))) continue;
    placed.push([x, y, z]);
    (isBack ? back : front).push(`<g class="piece" transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})${isBack ? " scale(0.7)" : ""}">${piece(type, z, cols[ci])}</g>`);
  }

  const defs = `<defs><linearGradient id="badgeFill" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${mix(acc, "#FFFFFF", 0.22)}"/><stop offset="0.55" stop-color="${acc}"/><stop offset="1" stop-color="${mix(acc, "#000000", 0.12)}"/></linearGradient>` +
    `<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4"/></filter>` +
    `<filter id="blurShadow" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="3.5"/></filter>` +
    `<filter id="lift" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0.06" stdDeviation="0.06" flood-color="${mix(acc, "#000000", 0.6)}" flood-opacity="0.35"/></filter>` +
    `<radialGradient id="haloFill"><stop offset="0" stop-color="${halo}"/><stop offset="0.62" stop-color="${halo}"/><stop offset="1" stop-color="${halo}" stop-opacity="0"/></radialGradient></defs>`;

  const haloL = `<g id="halo"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * (depth ? 1.55 + p.spread * 0.004 : 1.18 + p.spread * 0.002))}" fill="${depth ? "url(#haloFill)" : halo}"/></g>`;

  const ext = p.badge === "shield" ? 1.02 : p.badge === "squircle" ? 0.9 : 1;
  const shadows = `<g id="shadows">` +
    (depth && !ch ? `<ellipse id="badge-shadow" cx="${f(cx)}" cy="${f(cy + R * (ext + 0.15))}" rx="${f(R * 0.5)}" ry="${f(R * 0.06)}" fill="${shadowC}" filter="url(#blurShadow)"/>` : "") +
    (ch ? `<ellipse id="character-shadow" cx="${f(cx + 6 * k)}" cy="${f(feetY + 12 * k)}" rx="${f(46 * k)}" ry="${f(6 * k)}" fill="${shadowC}"/>` : "") + `</g>`;

  const chk = p.badge === "shield" ? 0.04 : 0;
  const ckd = `M-0.36,${f(chk)} L-0.1,${f(0.26 + chk)} L0.38,${f(-0.24 + chk)}`;
  const faceFill = depth ? "url(#badgeFill)" : acc;
  const badgeL = `<g id="badge" transform="translate(${f(cx)} ${f(cy)}) scale(${f(R)})"${depth ? ` filter="url(#lift)"` : ""}>` +
    `<g id="badge-rim">${shape(p.badge, 1, rim, lowC ? `stroke="${ink}" stroke-width="0.03"` : "")}</g>` +
    `<g id="badge-face">${p.badge === "seal" ? `<circle r="0.76" fill="${faceFill}"/>` : shape(p.badge, 0.84, faceFill)}` +
    (p.badge === "circle" ? `<circle r="0.7" fill="none" stroke="${fg}" stroke-opacity="0.35" stroke-width="0.025" stroke-dasharray="0.05 0.06" stroke-linecap="round"/>` : "") +
    (depth ? `<ellipse cx="-0.24" cy="-0.44" rx="0.28" ry="0.1" transform="rotate(-28 -0.24 -0.44)" fill="#FFFFFF" opacity="0.28"/>` +
      `<path d="${ckd}" transform="translate(0 0.035)" fill="none" stroke="${mix(acc, "#000000", 0.35)}" stroke-opacity="0.35" stroke-width="0.14" stroke-linecap="round" stroke-linejoin="round"/>` : "") + `</g>` +
    `<path id="check" d="${ckd}" fill="none" stroke="${fg}" stroke-width="0.14" stroke-linecap="round" stroke-linejoin="round"/></g>`;

  const sparks = `<g id="sparkles">${sp.map(([x, y, z]) => `<g class="sparkle" transform="translate(${f(x)} ${f(y)})">${sparkle(z, spark)}</g>`).join("")}</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}` +
    `<rect id="background" width="${W}" height="${H}" fill="${bg}"/>${haloL}` +
    `<g id="confetti-back" filter="url(#soft)" opacity="0.8">${back.join("")}</g>` +
    `<g id="burst">${rays}</g>${shadows}${badgeL}` +
    `${ch ? figure(cx, feetY, k, charOl, p.secondary, pants, shoe) : ""}` +
    `<g id="confetti-front">${front.join("")}</g>${sparks}</svg>`;
}
