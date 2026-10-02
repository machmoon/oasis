// Team Huddle: diverse colleagues collaborating around a board and desk, in a flat vector style.
export const meta = {
  title: "Team Huddle",
  kind: "illustration",
  description: "A flat scene of diverse colleagues presenting, meeting or running a sticky-note workshop together, for landing pages, about sections and onboarding.",
  tags: ["team", "people", "collaboration", "office", "meeting", "diversity", "workshop", "illustration"],
  price: 12,
  author: "oasis-factory",
  size: [800, 600],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#F3EEE7" },
    primary: { type: "color", role: "primary", label: "Outfit main", default: "#4A5FD9" },
    secondary: { type: "color", role: "secondary", label: "Outfit accent", default: "#F2A65A" },
    setting: { type: "choice", label: "Setting", default: "office", options: ["office", "abstract"] },
    poses: { type: "choice", label: "Pose set", default: "presenter", options: ["meeting", "workshop", "presenter"] },
    skin: { type: "choice", label: "Skin tones", default: "diverse", options: ["diverse", "light", "medium", "deep"] },
    outfits: { type: "choice", label: "Outfit palette", default: "brand", options: ["brand", "tonal", "neutral"] },
    people: { type: "range", label: "People", default: 4, min: 2, max: 6, step: 1 },
    seed: { type: "range", label: "Variation", default: 7, min: 1, max: 100, step: 1 },
    details: { type: "toggle", label: "Props & plants", default: true },
  },
  presets: {
    Sage: { background: "#EDF1EA", primary: "#2F6B4F", secondary: "#E3B04B", poses: "workshop", setting: "office", people: 5 },
    Coral: { background: "#FFF3EC", primary: "#E4572E", secondary: "#2B3A67", poses: "meeting", setting: "abstract", people: 6 },
    Midnight: { background: "#141722", primary: "#7C8CFF", secondary: "#FF8FA3", poses: "presenter", setting: "abstract", people: 3 },
    Graphite: { background: "#232220", primary: "#B4FF39", secondary: "#5FB6A5", poses: "meeting", setting: "office", outfits: "neutral", people: 5 },
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
const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = c => "#" + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = h => { const c = hx(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const sep = (c, bg, min, dir) => { let o = c; for (let i = 1; i <= 12 && cr(o, bg) < min; i++) o = mix(c, dir, i * 0.07); return o; };
const tame = (h, sMax, lMin, lMax) => {
  const [r, g, b] = hx(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let hh = 0, s = 0;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); hh = mx === r ? ((g - b) / d) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh = ((hh % 6) + 6) % 6; }
  s = Math.min(s, sMax); const L = Math.max(lMin, Math.min(lMax, l));
  const c = (1 - Math.abs(2 * L - 1)) * s, x = c * (1 - Math.abs((hh % 2) - 1)), m = L - c / 2;
  return toHex([[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(hh) % 6].map(v => (v + m) * 255));
};
const f1 = v => Math.round(v * 10) / 10;
const pt = a => f1(a[0]) + "," + f1(a[1]);

const SKIN = { light: ["#F6D5BD", "#EDC09E", "#F1CBA9"], medium: ["#D8A070", "#C58A5C", "#B5784B"], deep: ["#8E5A3A", "#6F4329", "#55331F"] };
const DIVERSE = ["#F1CBA9", "#8E5A3A", "#D8A070", "#55331F", "#EDC09E", "#B5784B", "#6F4329", "#F6D5BD", "#C58A5C"];
const HAIR = ["#1E1814", "#2F221A", "#4A3122", "#6E4524", "#A96D3D", "#CFA97A", "#A3A09C"];
const STYLES = ["short", "long", "curly", "bun", "buzz", "scarf", "bob"];
const LEAF = ["#3F6F4E", "#5B9068", "#7DAF80"];
const BOTS = ["#2C3242", "#3E4350", "#4D5A70", "#5A4A3C", "#26282E", "#6B6258"];
const SCARF = "M-27,-230 Q-27,-267 0,-267 Q27,-267 27,-230 Q27,-204 38,-188 Q0,-174 -38,-188 Q-27,-204 -27,-230 Z";

function arm(S, E, H, sleeve, skin, short) {
  const L = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const ln = (pts, c, w) => `<polyline points="${pts.map(pt).join(" ")}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const o = short ? ln([L(S, E, 0.55), E, H], skin, 11) + ln([S, L(S, E, 0.55)], sleeve, 16) : ln([S, E, L(E, H, 0.78)], sleeve, 15);
  return o + `<circle cx="${f1(H[0])}" cy="${f1(H[1])}" r="7.5" fill="${skin}"/>`;
}

function hairBack(st, c) {
  if (st === "long") return `<path d="M-24,-234 Q-26,-264 0,-264 Q26,-264 24,-234 L29,-176 Q0,-168 -29,-176 Z" fill="${c}"/>`;
  if (st === "bob") return `<path d="M-25,-236 Q-25,-264 0,-264 Q25,-264 25,-236 L27,-204 Q0,-196 -27,-204 Z" fill="${c}"/>`;
  if (st === "bun") return `<circle cx="0" cy="-260" r="11" fill="${c}"/>`;
  if (st === "curly") { let o = ""; for (let a = 160; a <= 380; a += 22) { const r = a * Math.PI / 180; o += `<circle cx="${f1(Math.cos(r) * 21)}" cy="${f1(-232 + Math.sin(r) * 21)}" r="11" fill="${c}"/>`; } return o; }
  return "";
}

function hairFront(st, c) {
  const cap = "M-21,-226 Q-22,-256 0,-256 Q22,-256 21,-226 Q12,-244 0,-244 Q-12,-244 -21,-226Z";
  if (st === "short") return `<path d="M-21,-224 Q-24,-258 0,-257 Q24,-257 21,-226 Q17,-242 4,-244 Q-12,-246 -21,-224Z" fill="${c}"/>`;
  if (st === "buzz") return `<path d="M-20,-230 Q-19,-254 0,-254 Q19,-254 20,-230 Q12,-247 0,-247 Q-12,-247 -20,-230Z" fill="${c}"/>`;
  if (st === "long" || st === "bob") return `<path d="M-22,-222 Q-24,-258 2,-258 Q24,-257 22,-224 Q14,-246 -6,-240 Q-16,-236 -22,-222Z" fill="${c}"/>`;
  if (st === "curly") return `<path d="${cap}" fill="${c}"/>` + [-15, -5, 5, 15].map(x => `<circle cx="${x}" cy="${-248 + Math.abs(x) * 0.25}" r="7" fill="${c}"/>`).join("");
  return `<path d="${cap}" fill="${c}"/>`;
}

function figure(o, T) {
  const sk = o.skin, skD = mix(sk, "#000000", 0.15), sl = mix(o.top, "#000000", 0.14), sc = o.style === "scarf";
  let g = o.seated ? `<rect x="-42" y="-180" width="84" height="70" rx="14" fill="${T.chair}"/>` : `<ellipse cx="0" cy="0" rx="48" ry="8" fill="${T.shadow}"/>`;
  if (o.rim) g += `<g stroke="${o.rim}" stroke-width="5" stroke-linejoin="round">${hairBack(o.style, o.hair)}${sc ? `<path d="${SCARF}" fill="${o.scarf}"/>` : `<ellipse cx="0" cy="-228" rx="20" ry="24" fill="${sk}"/>${hairFront(o.style, o.hair)}`}</g>`;
  g += hairBack(o.style, o.hair);
  if (!o.seated) {
    if (o.skirt) g += `<rect x="-17" y="-80" width="12" height="76" rx="5" fill="${o.legs}"/><rect x="5" y="-80" width="12" height="76" rx="5" fill="${o.legs}"/><path d="M-31,-124 H31 L38,-66 Q0,-58 -38,-66 Z" fill="${o.bottom}"/>`;
    else g += `<path d="M-30,-126 H30 L28,-8 H5 L0,-84 L-5,-8 H-28 Z" fill="${o.bottom}"/>`;
    g += `<ellipse cx="-17" cy="-5" rx="15" ry="6.5" fill="${T.shoe}"/><ellipse cx="17" cy="-5" rx="15" ry="6.5" fill="${T.shoe}"/>`;
  }
  g += `<rect x="-8" y="-212" width="16" height="22" fill="${skD}"/>`;
  g += `<path d="M-34,-180 Q-34,-197 -18,-198 H18 Q34,-197 34,-180 L30,-118 Q30,-110 22,-110 H-22 Q-30,-110 -30,-118 Z" fill="${o.top}"/>`;
  g += o.jacket ? `<path d="M-10,-198 L10,-198 L7,-110 H-7 Z" fill="${o.inner}"/><path d="M-10,-198 L-3,-160 M10,-198 L3,-160" stroke="${sl}" stroke-width="3" fill="none" stroke-linecap="round"/>` : `<path d="M-10,-198 Q0,-186 10,-198 Z" fill="${skD}"/>`;
  if (sc) g += `<path d="${SCARF}" fill="${o.scarf}"/><ellipse cx="0" cy="-227" rx="15" ry="19" fill="${sk}"/>`;
  else g += `<circle cx="-20" cy="-226" r="5" fill="${skD}"/><circle cx="20" cy="-226" r="5" fill="${skD}"/><ellipse cx="0" cy="-228" rx="20" ry="24" fill="${sk}"/>` + hairFront(o.style, o.hair);
  const SL = [-30, -185], SR = [30, -185];
  const A = {
    rest: x => [[x * 39, -150], [x * 38, -114]], hip: x => [[x * 50, -156], [x * 31, -126]],
    table: x => [[x * 42, -152], [x * 18, -145]], hold: x => [[x * 40, -148], [x * 20, -158]],
    raise: x => [[x * 46, -150], [x * 52, -190]],
  };
  const base = o.seated ? "table" : "rest";
  let L = A[base](-1), R = A[base](1), tool = "";
  if (o.pose === "hold") { L = A.hold(-1); R = A.hold(1); }
  else if (o.pose === "raise") R = A.raise(1);
  else if (o.pose === "point") {
    const side = o.target[0] >= 0 ? 1 : -1, S = side > 0 ? SR : SL;
    const dx = o.target[0] - S[0], dy = o.target[1] - S[1], len = Math.hypot(dx, dy) || 1, u = [dx / len, dy / len];
    const reach = Math.max(40, Math.min(len - 22, 112)), Hd = [S[0] + u[0] * reach, S[1] + u[1] * reach];
    let pp = [-u[1], u[0]]; if (pp[1] < 0) pp = [-pp[0], -pp[1]];
    const Ed = [(S[0] + Hd[0]) / 2 + pp[0] * 9, (S[1] + Hd[1]) / 2 + pp[1] * 9];
    if (side > 0) { R = [Ed, Hd]; L = A.hip(-1); } else { L = [Ed, Hd]; R = A.hip(1); }
    tool = `<line x1="${f1(Hd[0])}" y1="${f1(Hd[1])}" x2="${f1(Hd[0] + u[0] * 20)}" y2="${f1(Hd[1] + u[1] * 20)}" stroke="${T.marker}" stroke-width="5" stroke-linecap="round"/>`;
  }
  g += tool + arm(SL, L[0], L[1], sl, sk, o.short) + arm(SR, R[0], R[1], sl, sk, o.short);
  if (o.pose === "hold") {
    const dev = cr("#2B2D34", o.top) > cr("#ECECF1", o.top) ? "#2B2D34" : "#ECECF1";
    g += `<rect x="-23" y="-176" width="46" height="31" rx="4" fill="${dev}"/><rect x="-19" y="-172" width="38" height="23" rx="2" fill="${T.screen}"/>`;
    g += `<circle cx="-20" cy="-158" r="7.5" fill="${sk}"/><circle cx="20" cy="-158" r="7.5" fill="${sk}"/>`;
  }
  return g;
}

function board(T, x, y, w, h, mode, kind, details, rb) {
  let o = "";
  if (mode === "easel") o += `<path d="M${x + w * 0.24},${y + h - 4} L${x + w * 0.16},500 M${x + w * 0.76},${y + h - 4} L${x + w * 0.84},500" stroke="${T.frame}" stroke-width="9" stroke-linecap="round"/>`;
  if (mode === "float") o += `<rect x="${x + 8}" y="${y + 16}" width="${w - 16}" height="${h}" rx="14" fill="${T.shadow}" filter="url(#soft)"/>`;
  const rr = mode === "float" ? 14 : 8;
  o += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rr}" fill="${T.frame}"/><rect x="${x + 7}" y="${y + 7}" width="${w - 14}" height="${h - 14}" rx="${rr - 4}" fill="${T.board}"/>`;
  if (mode === "wall") o += `<rect x="${x + w * 0.32}" y="${y + h - 1}" width="${w * 0.36}" height="7" rx="3" fill="${T.frame}"/>`;
  const L = x + 28;
  o += `<rect x="${L}" y="${y + 26}" width="${f1(w * 0.26)}" height="10" rx="5" fill="${T.boardInk}"/><rect x="${L}" y="${y + 44}" width="${f1(w * 0.16)}" height="7" rx="3.5" fill="${T.boardMuted}"/>`;
  if (kind === "notes") {
    const cols = 5, rows = 3, gy = y + 60, cw = (w - 56) / cols, rh = (h - 80) / rows, sz = Math.min(cw, rh) * 0.8;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const last = c === cols - 1 && r === rows - 1, cx = L + (c + 0.5) * cw, cy = gy + (r + 0.5) * rh, skip = rb(), dot = rb(), rot = last ? -7 : f1((rb() - 0.5) * 7);
      if (!last && skip < 0.16) continue;
      const col = last ? T.hot : T.notes[(c * 2 + r) % 3], ln = mix(col, "#000000", 0.32), nx = f1(cx - sz / 2), ny = f1(cy - sz / 2);
      o += `<g transform="rotate(${rot} ${f1(cx)} ${f1(cy)})">${last ? `<rect x="${nx + 3}" y="${ny + 6}" width="${f1(sz)}" height="${f1(sz)}" rx="2" fill="${T.shadow}" opacity="0.6"/>` : ""}<rect x="${nx}" y="${ny}" width="${f1(sz)}" height="${f1(sz)}" rx="2" fill="${col}"/><rect x="${f1(nx + 7)}" y="${f1(ny + 11)}" width="${f1(sz - 14)}" height="3.5" rx="1.75" fill="${ln}"/><rect x="${f1(nx + 7)}" y="${f1(ny + 19)}" width="${f1((sz - 14) * 0.6)}" height="3.5" rx="1.75" fill="${ln}"/>${details && dot < 0.45 ? `<circle cx="${f1(nx + sz - 9)}" cy="${f1(ny + sz - 9)}" r="4" fill="${T.b1}"/>` : ""}</g>`;
    }
    return { svg: o, t: [L + (cols - 0.5) * cw, gy + (rows - 0.5) * rh] };
  }
  const baseY = y + h - 32, cw = w * 0.44, top = y + 70, slot = cw / 5, bw = slot * 0.56, tops = [];
  for (let i = 0; i < 5; i++) {
    const bh = Math.max(0.24, Math.min(0.96, 0.3 + i * 0.15 + (rb() - 0.5) * 0.14)) * (baseY - top), bx = L + i * slot;
    tops.push([bx + bw / 2, baseY - bh - 10]);
    o += `<rect x="${f1(bx)}" y="${f1(baseY - bh)}" width="${f1(bw)}" height="${f1(bh)}" rx="3" fill="${i % 2 ? T.b2 : T.b1}"/>`;
  }
  o += `<line x1="${L - 6}" y1="${baseY}" x2="${f1(L + cw)}" y2="${baseY}" stroke="${T.boardInk}" stroke-width="2" stroke-linecap="round"/>`;
  o += `<polyline points="${tops.map(pt).join(" ")}" fill="none" stroke="${T.boardInk}" stroke-width="2.5" stroke-linejoin="round"/>` + tops.map(q => `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="3.5" fill="${T.board}" stroke="${T.boardInk}" stroke-width="2"/>`).join("");
  const R0 = x + w * 0.58, Rw = x + w - 26 - R0, C = 2 * Math.PI * 17, fr = 0.45 + rb() * 0.35, dc = f1(R0 + 22);
  o += `<circle cx="${dc}" cy="${y + 46}" r="17" fill="none" stroke="${T.boardMuted}" stroke-width="8"/><circle cx="${dc}" cy="${y + 46}" r="17" fill="none" stroke="${T.b2}" stroke-width="8" stroke-dasharray="${f1(C * fr)} ${f1(C)}" transform="rotate(-90 ${dc} ${y + 46})"/>`;
  o += `<rect x="${f1(R0 + 50)}" y="${y + 36}" width="${f1(Rw - 50)}" height="7" rx="3.5" fill="${T.boardMuted}"/><rect x="${f1(R0 + 50)}" y="${y + 50}" width="${f1((Rw - 50) * 0.6)}" height="7" rx="3.5" fill="${T.boardMuted}"/>`;
  const y0 = y + 88;
  if (details) {
    const sz = Math.min(34, (Rw - 12) / 3);
    for (let j = 0; j < 3; j++) {
      const nx = R0 + j * (sz + 6), ny = y0 + (j % 2) * 8, c = T.notes[j], ln = mix(c, "#000000", 0.3);
      o += `<g transform="rotate(${[-4, 3, -2][j]} ${f1(nx + sz / 2)} ${f1(ny + sz / 2)})"><rect x="${f1(nx)}" y="${f1(ny)}" width="${f1(sz)}" height="${f1(sz)}" rx="2" fill="${c}"/><rect x="${f1(nx + 6)}" y="${f1(ny + 9)}" width="${f1(sz - 12)}" height="3" rx="1.5" fill="${ln}"/><rect x="${f1(nx + 6)}" y="${f1(ny + 16)}" width="${f1((sz - 12) * 0.6)}" height="3" rx="1.5" fill="${ln}"/></g>`;
    }
  } else [1, 0.8, 0.92, 0.55].forEach((k, j) => { o += `<rect x="${f1(R0)}" y="${y0 + j * 16}" width="${f1(Rw * k)}" height="7" rx="3.5" fill="${T.boardMuted}"/>`; });
  return { svg: o, t: tops[0] };
}

function plant(x, y, sc, pot) {
  const leaves = [[-70, 26], [-52, 34], [-28, 44], [-6, 50], [18, 46], [42, 38], [64, 28]];
  const o = leaves.map(([a, l], i) => `<ellipse cx="0" cy="${-l / 2}" rx="${f1(l * 0.2)}" ry="${l / 2}" fill="${LEAF[i % 3]}" transform="rotate(${a})"/>`).join("");
  return `<g transform="translate(${x} ${y}) scale(${sc})"><g transform="translate(0 -40)">${o}</g><path d="M-19,-42 H19 L15,0 H-15 Z" fill="${pot}"/><rect x="-21" y="-46" width="42" height="8" rx="3" fill="${mix(pot, "#000000", 0.12)}"/></g>`;
}

export default function render(p) {
  const W = 800, H = 600, n = p.people, bg = p.background, WH = "#FFFFFF", K = "#000000";
  const P = tame(p.primary, 0.6, 0.3, 0.6), S = tame(p.secondary, 0.62, 0.34, 0.64);
  const dark = cr(bg, WH) > cr(bg, K), away = dark ? WH : K;
  const T = { ink: dark ? mix(bg, WH, 0.88) : mix(bg, K, 0.84) };
  T.floor = mix(bg, away, dark ? 0.07 : 0.06);
  T.shadow = mix(T.floor, K, dark ? 0.5 : 0.13);
  T.board = dark ? mix(bg, WH, 0.1) : mix(bg, WH, 0.82);
  T.frame = dark ? mix(bg, WH, 0.26) : mix(bg, T.ink, 0.3);
  T.boardInk = mix(T.board, T.ink, 0.75); T.boardMuted = mix(T.board, T.ink, 0.2);
  T.table = dark ? mix(bg, WH, 0.22) : mix(bg, K, 0.16);
  T.tableFront = dark ? mix(bg, WH, 0.13) : mix(T.table, K, 0.14);
  T.chair = mix(bg, T.ink, dark ? 0.35 : 0.55);
  T.shoe = dark ? mix(bg, WH, 0.75) : "#2A2624";
  T.screen = mix(P, WH, 0.5); T.marker = sep(mix(P, K, 0.2), bg, 2, away);
  T.b1 = sep(tame(p.primary, 0.72, 0.32, 0.62), T.board, 2, away); T.b2 = sep(tame(p.secondary, 0.72, 0.34, 0.64), T.board, 2, away);
  T.notes = [mix(S, WH, 0.45), mix(P, WH, 0.6), mix(S, WH, 0.68)]; T.hot = mix(S, WH, 0.12);
  T.pot = sep(mix(S, bg, 0.15), bg, 1.5, away); T.lamp = sep(mix(P, T.ink, 0.45), bg, 2, away);
  T.mug = sep(mix(S, bg, 0.1), T.table, 1.4, away); T.lid = mix(bg, T.ink, 0.6);
  const pal = {
    brand: [P, S, mix(P, WH, 0.38), mix(S, K, 0.22), mix(P, K, 0.3), mix(S, WH, 0.35)],
    tonal: [P, mix(P, WH, 0.32), mix(P, K, 0.32), mix(P, WH, 0.58), mix(P, K, 0.5), mix(P, WH, 0.16)],
    neutral: ["#E8E2D8", P, "#6F6A64", "#C9BBA6", "#33353C", "#9DA3A8"],
  }[p.outfits];
  const bots = p.outfits === "tonal" ? [mix(P, "#15171D", 0.62), mix(P, "#15171D", 0.78)] : BOTS;
  const r = rng(p.seed * 7919 + 13), rb = rng(p.seed * 31 + 5);
  const skinList = p.skin === "diverse" ? DIVERSE : SKIN[p.skin];
  const sOff = Math.floor(r() * 9), hOff = Math.floor(r() * 7), cOff = Math.floor(r() * 6);
  const specs = [], occ = [];
  for (let i = 0; i < 6; i++) {
    const skin = skinList[(sOff + i) % skinList.length], style = STYLES[(hOff + i * 3) % 7];
    const hr = r(), jk = r(), ss = r(), sk = r(), roll = r();
    const top = sep(pal[(cOff + i) % 6], bg, 1.45, away), bottom = sep(bots[(i + cOff) % bots.length], bg, 1.4, away);
    const jacket = jk < 0.35, hair = HAIR[lum(skin) < 0.2 ? Math.floor(hr * 3) : Math.floor(hr * 7)];
    specs.push({ skin, style, top, bottom, jacket, roll, hair, legs: mix(bottom, K, 0.3), short: !jacket && ss < 0.45,
      skirt: ["long", "bun", "bob"].includes(style) && sk < 0.6, inner: cr(top, "#F5F2ED") > 1.5 ? "#F5F2ED" : "#2C2E35",
      scarf: sep(pal[(cOff + i + 3) % 6], bg, 1.45, away), rim: cr(hair, bg) < 2.2 || cr(skin, bg) < 1.5 ? mix(bg, away, dark ? 0.3 : 0.2) : "" });
  }
  const fig = (sp, x, y, s, seated, pose, target) => {
    const o = { ...sp, seated, pose };
    if (target) o.target = [(target[0] - x) / s, (target[1] - y) / s];
    occ.push([x - 55 * s, x + 55 * s]);
    return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${figure(o, T)}</g>`;
  };
  const aim = (t, side, s, fyMax) => { const dx = 72 - 30 * s; return [t[0] - side * 72, Math.min(fyMax, t[1] + 185 * s + Math.sqrt(Math.max(0, 124 * 124 * s * s - dx * dx)))]; };
  const backs = (xs, b, start) => (b === 1 ? [Math.floor((xs.length - 2) / 2)] : b === 2 ? [0, xs.length - 2] : []).map((gi, j) => ({ sp: specs[start + j], x: (xs[gi] + xs[gi + 1]) / 2, pose: j ? "hold" : ["rest", "hold"][Math.floor(specs[start + j].roll * 2)] }));
  const desk = (list, xs, back, standY) => {
    const x0 = xs[0] - 72, x1 = xs[xs.length - 1] + 72;
    occ.push([x0, x1]);
    let o = `<ellipse cx="${f1((x0 + x1) / 2)}" cy="502" rx="${f1((x1 - x0) / 2 + 24)}" ry="10" fill="${T.shadow}"/>`;
    back.forEach(b => { o += fig(b.sp, b.x, standY, 0.86, false, b.pose); });
    list.forEach((sp, i) => { o += fig(sp, xs[i], 535, 1, true, p.details && i % 2 === 0 ? "table" : ["table", "raise", "hold", "table"][Math.floor(sp.roll * 4)]); });
    o += `<rect x="${f1(x0 + 10)}" y="404" width="${f1(x1 - x0 - 20)}" height="98" rx="6" fill="${T.tableFront}"/><rect x="${f1(x0 + 24)}" y="426" width="${f1(x1 - x0 - 48)}" height="3" rx="1.5" fill="${mix(T.tableFront, T.table, 0.6)}"/><rect x="${f1(x0)}" y="396" width="${f1(x1 - x0)}" height="16" rx="8" fill="${T.table}"/>`;
    if (p.details) xs.forEach((x, i) => {
      if (i % 2 === 0) o += `<path d="M${f1(x - 34)},403 L${f1(x - 30)},359 H${f1(x + 30)} L${f1(x + 34)},403 Z" fill="${T.lid}"/><circle cx="${f1(x)}" cy="381" r="4" fill="${mix(T.lid, bg, 0.5)}"/>`;
      else o += `<path d="M${f1(x - 22)},405 L${f1(x + 18)},401 L${f1(x + 26)},407 L${f1(x - 14)},410 Z" fill="${T.board}"/>`;
      if (i < xs.length - 1 && i % 2 === 1) { const mx = (x + xs[i + 1]) / 2; o += `<path d="M${f1(mx + 6)},391 h4 a4,4 0 0 1 0,8 h-4" fill="none" stroke="${T.mug}" stroke-width="2.5"/><rect x="${f1(mx - 7)}" y="387" width="14" height="17" rx="3" fill="${T.mug}"/>`; }
    });
    return o;
  };
  let back = `<rect width="${W}" height="${H}" fill="${bg}"/>`, mode;
  if (p.setting === "office") {
    mode = p.poses === "workshop" ? "easel" : "wall";
    back += `<rect y="460" width="${W}" height="140" fill="${T.floor}"/><rect y="455" width="${W}" height="6" fill="${mix(bg, away, 0.12)}"/>`;
    back += [110, 690].map(x => (dark ? `<circle cx="${x}" cy="124" r="135" fill="url(#glow)"/><ellipse cx="${x}" cy="474" rx="135" ry="17" fill="url(#glow)"/>` : `<path d="M${x - 26},116 L${x - 115},455 H${x + 115} L${x + 26},116 Z" fill="url(#cone)"/>`) + `<line x1="${x}" y1="0" x2="${x}" y2="86" stroke="${T.lamp}" stroke-width="2"/><path d="M${x - 30},116 Q${x - 30},86 ${x},86 Q${x + 30},86 ${x + 30},116 Z" fill="${T.lamp}"/><ellipse cx="${x}" cy="116" rx="11" ry="4" fill="#FFE7A8"/>`).join("");
  } else {
    mode = "float";
    back += `<ellipse cx="400" cy="300" rx="340" ry="240" fill="${mix(bg, P, 0.08)}"/><circle cx="650" cy="170" r="110" fill="${mix(bg, S, 0.14)}"/><circle cx="150" cy="420" r="80" fill="${mix(bg, P, 0.14)}"/>`;
    back += `<circle cx="735" cy="60" r="18" fill="none" stroke="${mix(bg, P, 0.5)}" stroke-width="5"/><path d="M60,70 h20 M70,60 v20" stroke="${mix(bg, S, 0.7)}" stroke-width="5" stroke-linecap="round"/>`;
    for (let j = 0; j < 4; j++) for (let k = 0; k < 3; k++) back += `<circle cx="${676 + j * 22}" cy="${110 + k * 22}" r="3" fill="${mix(bg, T.ink, 0.2)}"/>`;
    back += `<ellipse cx="400" cy="522" rx="360" ry="36" fill="${mix(bg, T.ink, 0.07)}"/>`;
  }
  let scene = "";
  if (p.poses === "meeting") {
    const B = board(T, 230, 58, 340, 200, mode, "chart", p.details, rb), k = Math.min(n, 4), xs = [...Array(k)].map((_, i) => 400 + (i - (k - 1) / 2) * 118);
    scene += B.svg + desk(specs.slice(0, k), xs, backs(xs, n - k, k), 493);
  } else if (p.poses === "workshop") {
    const B = board(T, 150, 70, 500, 240, mode, "notes", p.details, rb), pp = aim(B.t, -1, 0.92, 512), m = n - 1, xL = 196, xR = B.t[0] - 84;
    const xs = m === 1 ? [(xL + xR) / 2] : [...Array(m)].map((_, i) => xL + i * (xR - xL) / (m - 1));
    scene += B.svg;
    xs.forEach((x, i) => { if (i % 2 === 0) scene += fig(specs[i], x, 508, 0.88, false, ["rest", "hold", "raise"][Math.floor(specs[i].roll * 3)]); });
    scene += fig(specs[m], pp[0], pp[1], 0.92, false, "point", B.t);
    xs.forEach((x, i) => { if (i % 2 === 1) scene += fig(specs[i], x, 556, 1, false, ["hold", "rest", "raise"][Math.floor(specs[i].roll * 3)]); });
  } else {
    const B = board(T, 210, 62, 360, 200, mode, "chart", p.details, rb), k = Math.min(n - 1, 3), cx = 500 - (3 - k) * 18;
    const xs = [...Array(k)].map((_, i) => cx + (i - (k - 1) / 2) * 120), pp = aim(B.t, 1, 0.96, 512);
    scene += B.svg + desk(specs.slice(0, k), xs, backs(xs, n - 1 - k, k), 497);
    scene += fig(specs[n - 1], pp[0], pp[1], 0.96, false, "point", B.t);
  }
  const free = (a, b) => occ.every(([u, v]) => b < u - 12 || a > v + 12);
  const front = p.details ? (free(0, 90) ? plant(42, 572, 0.85, T.pot) : "") + (free(710, 800) ? plant(758, 572, 0.85, T.pot) : "") : "";
  const defs = `<linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE7A8" stop-opacity="0.42"/><stop offset="1" stop-color="#FFE7A8" stop-opacity="0"/></linearGradient><radialGradient id="glow"><stop offset="0" stop-color="#FFE2A0" stop-opacity="0.24"/><stop offset="0.5" stop-color="#FFE2A0" stop-opacity="0.08"/><stop offset="1" stop-color="#FFE2A0" stop-opacity="0"/></radialGradient><filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs>${back}${scene}${front}</svg>`;
}
