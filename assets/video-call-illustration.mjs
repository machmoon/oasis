// Remote-work scene: a laptop on a desk showing a seeded video-call grid of faces in lived-in home backdrops.
export const meta = {
  title: "Morning Standup",
  kind: "illustration",
  description: "A cosy remote-work desk scene with a laptop video call, for hero art, onboarding screens and blog headers about hybrid teams.",
  tags: ["remote work", "video call", "laptop", "meeting", "faces", "home office", "zoom", "team"],
  price: 8,
  author: "oasis-factory",
  size: [800, 600],
};

export const params = {
  knobs: {
    wall: { type: "color", role: "background", label: "Wall", default: "#EFE6DA" },
    desk: { type: "color", role: "surface", label: "Desk", default: "#C89B6D" },
    ink: { type: "color", role: "ink", label: "Line work", default: "#2B2622" },
    primary: { type: "color", role: "primary", label: "Accent", default: "#4F6BED" },
    room: { type: "choice", label: "Room style", default: "home", options: ["home", "library", "loft", "minimal"] },
    expression: { type: "choice", label: "Expression", default: "mixed", options: ["mixed", "smile", "laugh", "neutral", "surprised"] },
    people: { type: "range", label: "Participants", default: 6, min: 1, max: 12, step: 1 },
    ui: { type: "range", label: "Screen UI detail", default: 2, min: 0, max: 3, step: 1 },
    seed: { type: "range", label: "Seed", default: 7, min: 1, max: 100, step: 1 },
    speaking: { type: "toggle", label: "Highlight speaker", default: true },
  },
  presets: {
    Blush: { wall: "#F6E4E6", desk: "#D7B49E", ink: "#3B2430", primary: "#C2457A" },
    Midnight: { wall: "#1B1F2A", desk: "#3A3F4D", ink: "#E8E6E1", primary: "#8C7CFF" },
    Sage: { wall: "#E3EBE1", desk: "#9C8467", ink: "#23302A", primary: "#2F8F6B" },
    Terracotta: { wall: "#F4E3D3", desk: "#B8704A", ink: "#3A2219", primary: "#E0603A" },
  },
};

const SCR = "#1B1E25", PANEL = "#242831", BTN = "#2F343F", RED = "#E5484D", TXT = "#EEF0F4", MUT = "#A3A9B6";
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
const SKIN = ["#F6D3BE", "#EBB896", "#D49A6A", "#A86B45", "#7A4A2E", "#5A3622"];
const HAIR = ["#1F1612", "#3B2416", "#6B4226", "#B5793E", "#D9B26B", "#BDB7B0"];
const WALLS = ["#E6E0D6", "#D3DDE2", "#E0D5C4", "#DAD6E5", "#3A4150", "#4B403A", "#33443F", "#453F58"];
const BOOKS = ["#C46B4E", "#E2B85C", "#5B7FA6", "#7C9B74", "#EDE6DA", "#9A6A8E"];
const LEAF = ["#3F7D52", "#5E9E6A"];
const EXS = ["smile", "laugh", "neutral", "surprised"];
const NAMES = ["Maya", "Theo", "Priya", "Jonas", "Aiko", "Sam", "Lena", "Omar", "Zoe", "Kai", "Nia", "Elio"];
const f = (v) => (+v).toFixed(1);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuf = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (h) => { const c = hx(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const onFill = (c) => (contrast(c, "#FFFFFF") >= contrast(c, "#16181D") ? "#FFFFFF" : "#16181D");
function ensure(c, bg, min) { const t = onFill(bg); let o = c; for (let i = 0; i < 12 && contrast(o, bg) < min; i++) o = mix(o, t, 0.18); return o; }
function step(c, min) { const t = onFill(c) === "#FFFFFF" ? "#FFFFFF" : "#000000"; for (let k = 0.04; k <= 1; k += 0.04) { const m = mix(c, t, k); if (contrast(c, m) >= min) return m; } return t; }

function grid(n, W, H, g) {
  let best = null;
  for (let c = 1; c <= n; c++) {
    const rows = Math.ceil(n / c), w = (W - g * (c + 1)) / c, h = (H - g * (rows + 1)) / rows;
    const tw = Math.min(w, (h * 4) / 3);
    if (!best || tw > best.tw + 0.5) best = { c, rows, tw, th: tw * 0.75 };
  }
  return best;
}

function plant(x, y, sc) {
  const A = [-62, -38, -14, 8, 30, 54, 74], L = [54, 72, 84, 78, 80, 66, 50];
  return A.map((a, i) => { const l = L[i] * sc, w = l * 0.22; return `<path d="M0 0Q${f(w)} ${f(-l / 2)} 0 ${f(-l)}Q${f(-w)} ${f(-l / 2)} 0 0Z" fill="${LEAF[i % 2]}" transform="translate(${x} ${y}) rotate(${a})"/>`; }).join("");
}

function icon(k, c) {
  if (k === 0) return `<rect x="-2.5" y="-6" width="5" height="8.5" rx="2.5" fill="${c}"/><path d="M-5 0a5 5 0 0 0 10 0M0 5v2.5" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>`;
  if (k === 1) return `<rect x="-6.5" y="-4" width="9" height="8" rx="1.8" fill="${c}"/><path d="M3 -1.2 6.5 -3.5V3.5L3 1.2Z" fill="${c}"/>`;
  if (k === 2) return `<path d="M0 -5.5V2.5M-3.5 -2 0 -5.5 3.5 -2M-5.5 1.5V5H5.5V1.5" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (k === 3) return `<circle cx="-2" cy="-2.5" r="2.4" fill="${c}"/><circle cx="3.5" cy="-1.8" r="1.9" fill="${c}" opacity=".7"/><path d="M-6.5 5a4.5 4 0 0 1 9 0ZM1 5a3.5 3.2 0 0 1 6.5 0Z" fill="${c}"/>`;
  return `<path d="M-6.5 1.5Q0 -4.5 6.5 1.5" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`;
}

function prop(t, x0, x1, y, th, line, wd, k) {
  const rw = x1 - x0, u = Math.min(rw, th * 0.34), cx = (x0 + x1) / 2;
  if (t === 0) {
    const w = u, hh = u * 1.22, fx = cx - w / 2, fy = y + th * 0.34 - hh / 2, b = u * 0.1, ix = fx + b, iy = fy + b, iw = w - 2 * b, ih = hh - 2 * b;
    return `<rect x="${f(fx)}" y="${f(fy)}" width="${f(w)}" height="${f(hh)}" rx="${f(u * 0.04)}" fill="${line}"/><rect x="${f(ix)}" y="${f(iy)}" width="${f(iw)}" height="${f(ih)}" fill="#EEE7DA"/><circle cx="${f(ix + iw * 0.7)}" cy="${f(iy + ih * 0.3)}" r="${f(iw * 0.14)}" fill="#E2B85C"/><path d="M${f(ix)} ${f(iy + ih)}L${f(ix + iw * 0.38)} ${f(iy + ih * 0.48)}L${f(ix + iw * 0.6)} ${f(iy + ih * 0.72)}L${f(ix + iw * 0.78)} ${f(iy + ih * 0.58)}L${f(ix + iw)} ${f(iy + ih * 0.8)}V${f(iy + ih)}Z" fill="${BOOKS[(k + 2) % 6]}"/>`;
  }
  if (t === 1) {
    const w = u, hh = u * 1.3, fx = cx - w / 2, fy = y + th * 0.1, sw = Math.max(1, u * 0.08);
    return `<rect x="${f(fx)}" y="${f(fy)}" width="${f(w)}" height="${f(hh)}" fill="${wd ? "#4B5F8C" : "#CFE2EC"}" stroke="${line}" stroke-width="${f(sw)}"/><path d="M${f(cx)} ${f(fy)}V${f(fy + hh)}M${f(fx)} ${f(fy + hh * 0.48)}H${f(fx + w)}" stroke="${line}" stroke-width="${f(sw * 0.8)}"/>`;
  }
  if (t === 2) {
    const py = y + th * 0.58, bw = u * 0.16, H = [0.62, 0.8, 0.55, 0.72, 0.66];
    let o = "", bx = x0 + rw * 0.12;
    for (let j = 0; j < 5 && bx + bw <= x1 - rw * 0.08; j++) { const bh = u * H[j]; o += `<rect x="${f(bx)}" y="${f(py - bh)}" width="${f(bw)}" height="${f(bh)}" rx="${f(bw * 0.15)}" fill="${BOOKS[(k + j) % 6]}"/>`; bx += bw + u * 0.03; }
    return o + `<rect x="${f(x0)}" y="${f(py)}" width="${f(rw)}" height="${f(Math.max(1.5, u * 0.07))}" fill="${line}"/>`;
  }
  if (t === 3) {
    const pb = y + th * 0.64, pw = u * 0.46, ph = u * 0.38, pt = pb - ph, len = u * 0.52;
    let o = "";
    [-50, -25, 0, 25, 50].forEach((a, j) => { o += `<ellipse cx="0" cy="${f(-len / 2)}" rx="${f(len * 0.2)}" ry="${f(len / 2)}" fill="${LEAF[j % 2]}" transform="translate(${f(cx)} ${f(pt)}) rotate(${a})"/>`; });
    return o + `<path d="M${f(cx - pw / 2)} ${f(pt)}H${f(cx + pw / 2)}L${f(cx + pw * 0.38)} ${f(pb)}H${f(cx - pw * 0.38)}Z" fill="#C9774F"/>`;
  }
  const ty = y + th * 0.12, sh = u * 0.42;
  return `${wd ? `<ellipse cx="${f(cx)}" cy="${f(ty + sh + u * 0.12)}" rx="${f(u * 0.5)}" ry="${f(u * 0.3)}" fill="#FFE6A8" opacity=".22"/>` : ""}<path d="M${f(cx)} ${f(ty + sh)}V${f(y + th)}" stroke="${line}" stroke-width="${f(Math.max(1, u * 0.05))}"/><path d="M${f(cx - u * 0.18)} ${f(ty)}H${f(cx + u * 0.18)}L${f(cx + u * 0.32)} ${f(ty + sh)}H${f(cx - u * 0.32)}Z" fill="#F1E2C0"/>`;
}

function person(cx, by, s, tr, ex) {
  const { skin, hair, style, shirt, glasses } = tr;
  const h = s * 0.205, hy = by - s * 0.48, fc = mix(skin, "#120B09", 0.8), neck = mix(skin, "#000000", 0.14);
  const sw = f(Math.max(1, h * 0.11)), hc = style === 4 ? mix(hair, skin, 0.4) : hair;
  let o = "";
  if (style === 1) o += `<rect x="${f(cx - h * 1.14)}" y="${f(hy - h * 0.9)}" width="${f(h * 2.28)}" height="${f(h * 2.5)}" rx="${f(h)}" fill="${hair}"/>`;
  if (style === 2) o += `<circle cx="${f(cx)}" cy="${f(hy - h * 1.1)}" r="${f(h * 0.44)}" fill="${hair}"/>`;
  o += `<rect x="${f(cx - h * 0.36)}" y="${f(hy + h * 0.5)}" width="${f(h * 0.72)}" height="${f(s * 0.2)}" fill="${neck}"/>`;
  const W = s * 0.4, top = by - s * 0.235;
  o += `<path d="M${f(cx - W)} ${f(by + 1)}C${f(cx - W)} ${f(top + s * 0.02)} ${f(cx - W * 0.5)} ${f(top)} ${f(cx)} ${f(top)}C${f(cx + W * 0.5)} ${f(top)} ${f(cx + W)} ${f(top + s * 0.02)} ${f(cx + W)} ${f(by + 1)}Z" fill="${shirt}"/>`;
  o += `<path d="M${f(cx - h * 0.42)} ${f(top)}Q${f(cx)} ${f(top + h * 0.55)} ${f(cx + h * 0.42)} ${f(top)}Z" fill="${neck}"/>`;
  o += `<circle cx="${f(cx - h * 0.98)}" cy="${f(hy + h * 0.1)}" r="${f(h * 0.2)}" fill="${skin}"/><circle cx="${f(cx + h * 0.98)}" cy="${f(hy + h * 0.1)}" r="${f(h * 0.2)}" fill="${skin}"/><circle cx="${f(cx)}" cy="${f(hy)}" r="${f(h)}" fill="${skin}"/>`;
  const R = h * 1.04, cy0 = hy + h * 0.05;
  o += `<path d="M${f(cx - R)} ${f(cy0)}A${f(R)} ${f(R)} 0 0 1 ${f(cx + R)} ${f(cy0)}Q${f(cx + h * 0.3)} ${f(hy - h * 0.62)} ${f(cx - h * 0.5)} ${f(hy - h * 0.42)}Q${f(cx - h * 0.85)} ${f(hy - h * 0.3)} ${f(cx - R)} ${f(cy0)}Z" fill="${hc}"/>`;
  if (style === 3) for (let k = 0; k < 8; k++) { const a = Math.PI * (1 + k / 7); o += `<circle cx="${f(cx + Math.cos(a) * h * 0.98)}" cy="${f(cy0 + Math.sin(a) * h * 0.98)}" r="${f(h * 0.3)}" fill="${hair}"/>`; }
  const ey = hy + h * 0.14, ex2 = h * 0.38, er = h * 0.1, my = hy + h * 0.55;
  const st = `fill="none" stroke="${fc}" stroke-width="${sw}" stroke-linecap="round"`;
  const b0 = ey - h * (ex === "surprised" ? 0.5 : ex === "laugh" ? 0.36 : 0.3);
  let brow = "", eyes = "";
  for (const d of [-1, 1]) {
    const x = cx + d * ex2;
    brow += ex === "neutral" ? `M${f(x - h * 0.14)} ${f(b0)}H${f(x + h * 0.14)}` : `M${f(x - h * 0.15)} ${f(b0 + h * 0.04)}Q${f(x)} ${f(b0 - h * 0.08)} ${f(x + h * 0.15)} ${f(b0 + h * 0.04)}`;
    if (ex === "laugh") eyes += `<path d="M${f(x - h * 0.13)} ${f(ey + h * 0.04)}Q${f(x)} ${f(ey - h * 0.13)} ${f(x + h * 0.13)} ${f(ey + h * 0.04)}" ${st}/>`;
    else if (ex === "surprised") eyes += `<circle cx="${f(x)}" cy="${f(ey)}" r="${f(er * 1.9)}" fill="#FFFFFF"/><circle cx="${f(x)}" cy="${f(ey)}" r="${f(er * 1.05)}" fill="${fc}"/>`;
    else eyes += `<circle cx="${f(x)}" cy="${f(ey)}" r="${f(er)}" fill="${fc}"/>`;
  }
  o += `<path d="${brow}" ${st}/>${eyes}`;
  if (ex === "smile" || ex === "laugh") o += `<circle cx="${f(cx - h * 0.6)}" cy="${f(ey + h * 0.3)}" r="${f(h * 0.15)}" fill="#E86A6A" opacity=".3"/><circle cx="${f(cx + h * 0.6)}" cy="${f(ey + h * 0.3)}" r="${f(h * 0.15)}" fill="#E86A6A" opacity=".3"/>`;
  if (ex === "smile") o += `<path d="M${f(cx - h * 0.3)} ${f(my)}Q${f(cx)} ${f(my + h * 0.34)} ${f(cx + h * 0.3)} ${f(my)}" ${st}/>`;
  else if (ex === "laugh") o += `<path d="M${f(cx - h * 0.36)} ${f(my - h * 0.04)}Q${f(cx)} ${f(my + h * 0.66)} ${f(cx + h * 0.36)} ${f(my - h * 0.04)}Z" fill="${fc}"/><path d="M${f(cx - h * 0.3)} ${f(my)}Q${f(cx)} ${f(my + h * 0.11)} ${f(cx + h * 0.3)} ${f(my)}Z" fill="#FFFFFF"/>`;
  else if (ex === "neutral") o += `<path d="M${f(cx - h * 0.2)} ${f(my + h * 0.08)}H${f(cx + h * 0.2)}" ${st}/>`;
  else o += `<ellipse cx="${f(cx)}" cy="${f(my + h * 0.12)}" rx="${f(h * 0.14)}" ry="${f(h * 0.2)}" fill="${fc}"/>`;
  if (glasses) o += `<circle cx="${f(cx - ex2)}" cy="${f(ey)}" r="${f(h * 0.25)}" ${st}/><circle cx="${f(cx + ex2)}" cy="${f(ey)}" r="${f(h * 0.25)}" ${st}/><path d="M${f(cx - ex2 + h * 0.25)} ${f(ey)}H${f(cx + ex2 - h * 0.25)}" ${st}/>`;
  return o;
}

export default function render(p) {
  const dark = lum(p.wall) < 0.2, ink = ensure(p.ink, p.wall, 3);
  const t1 = step(p.wall, 1.18), t2 = step(p.wall, 1.5), sky = dark ? "#26345E" : "#BFDDF0";
  const shadow = mix(p.desk, "#000000", 0.5), edge = mix(p.desk, "#000000", 0.2);
  const shell = contrast(p.wall, "#3A3D44") > contrast(p.wall, "#C9CDD3") ? "#3A3D44" : "#C9CDD3", shellD = mix(shell, "#000000", 0.22);
  const acc = ensure(p.primary, SCR, 3), accOn = onFill(acc), LR = rng(p.seed * 31 + 5);
  let room = "";
  if (p.room === "home") {
    room += `<rect x="-8" y="60" width="112" height="220" rx="4" fill="${t1}" stroke="${ink}" stroke-width="2"/><rect x="2" y="70" width="92" height="200" fill="${sky}"/>`;
    room += dark ? `<circle cx="72" cy="102" r="11" fill="#F3E9C6"/>` : `<ellipse cx="36" cy="104" rx="20" ry="7" fill="#FFFFFF" opacity=".9"/><ellipse cx="74" cy="140" rx="15" ry="5" fill="#FFFFFF" opacity=".8"/>`;
    room += `<path d="M2 236Q34 216 60 230T94 226V270H2Z" fill="${dark ? "#1C2747" : "#9CCBE6"}"/><path d="M48 70V270M2 168H94" stroke="${t1}" stroke-width="6"/><rect x="-10" y="278" width="124" height="8" rx="2" fill="${t2}"/>`;
    const pb = step(p.wall, 1.3);
    room += `<rect x="700" y="86" width="84" height="110" rx="2" fill="${ink}"/><rect x="707" y="93" width="70" height="96" fill="${pb}"/><circle cx="752" cy="124" r="13" fill="${p.primary}"/><path d="M707 189V162Q726 144 742 160T777 154V189Z" fill="${mix(p.primary, pb, 0.55)}"/>`;
  } else if (p.room === "library") {
    const BK = [p.primary, mix(p.primary, "#FFFFFF", 0.4), mix(p.primary, "#000000", 0.4), ink, "#C9A27A", "#E7DCC8", t2];
    const shelf = (x0, x1, y) => { let x = x0, s = ""; while (x < x1 - 8) { const w = 8 + Math.floor(LR() * 7), hh = 46 + LR() * 34; s += `<rect x="${f(x)}" y="${f(y - hh)}" width="${w}" height="${f(hh)}" rx="1.5" fill="${BK[Math.floor(LR() * BK.length)]}"/>`; x += w + 1.5; } return s + `<rect x="${x0 - 6}" y="${y}" width="${x1 - x0 + 12}" height="7" rx="1.5" fill="${t2}"/>`; };
    for (const y of [130, 240, 350]) room += shelf(-4, 102, y) + shelf(700, 806, y);
  } else if (p.room === "loft") {
    room += `<rect width="800" height="420" fill="url(#brk)"/><rect x="-6" y="40" width="112" height="236" rx="3" fill="${ink}"/>`;
    for (let i = 0; i < 12; i++) room += `<rect x="${-2 + (i % 3) * 36}" y="${44 + Math.floor(i / 3) * 58}" width="32" height="54" fill="${sky}"/>`;
    room += `<path d="M732 0V112M772 0V112" stroke="${ink}" stroke-width="1.2"/><g transform="rotate(180 752 128)">${plant(752, 128, 0.62)}</g><path d="M730 108H774L768 134H736Z" fill="${mix(p.primary, "#000000", 0.15)}"/>`;
  } else {
    room += `<path d="M696 420V200A50 50 0 0 1 796 200V420Z" fill="${t1}"/><circle cx="746" cy="214" r="20" fill="${p.primary}"/>`;
    room += `<circle cx="60" cy="150" r="36" fill="${t1}" stroke="${ink}" stroke-width="3"/><path d="M60 150V126M60 150L76 160" stroke="${ink}" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="150" r="3" fill="${ink}"/>`;
    for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; room += `<circle cx="${f(60 + Math.cos(a) * 29)}" cy="${f(150 + Math.sin(a) * 29)}" r="1.4" fill="${ink}"/>`; }
  }
  const glow = dark ? `<rect x="140" y="80" width="520" height="360" rx="30" fill="${mix(acc, "#FFFFFF", 0.3)}" opacity=".2" filter="url(#bl)"/>` : `<rect x="140" y="96" width="520" height="350" rx="30" fill="${mix(p.wall, "#000000", 0.45)}" opacity=".12" filter="url(#bl)"/>`;
  const mug = mix(p.primary, "#FFFFFF", 0.62);
  const desk = `<rect y="420" width="800" height="140" fill="${p.desk}"/><rect y="420" width="800" height="2" fill="#FFFFFF" opacity=".25"/><rect y="560" width="800" height="40" fill="${edge}"/>` +
    `<ellipse cx="400" cy="476" rx="340" ry="8" fill="${shadow}" opacity=".45"/><ellipse cx="58" cy="549" rx="27" ry="4" fill="${shadow}" opacity=".4"/><ellipse cx="740" cy="541" rx="28" ry="4" fill="${shadow}" opacity=".4"/>`;
  const props = plant(58, 506, 0.95) + `<path d="M35 502H81L76.5 543Q75.5 548 70.5 548H45.5Q40.5 548 39.5 543Z" fill="${mix(p.primary, "#000000", 0.12)}"/>` +
    `<path d="M760 510q15 0 15 11t-15 11" fill="none" stroke="${mug}" stroke-width="6"/><rect x="720" y="500" width="40" height="40" rx="7" fill="${mug}"/><ellipse cx="740" cy="502" rx="17" ry="3" fill="${mix(mug, "#3A2418", 0.7)}"/>` +
    `<path d="M733 490q-6 -8 0 -16t0 -16M747 490q-6 -8 0 -16t0 -16" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" opacity=".35"/>`;
  const laptop = `<rect x="120" y="56" width="560" height="388" rx="18" fill="${shell}"/><rect x="123" y="59" width="554" height="382" rx="15" fill="#111317"/><circle cx="400" cy="65.5" r="2.4" fill="#2E323A"/>` +
    `<path d="M70 444H730L750 466Q750 474 740 474H60Q50 474 50 466Z" fill="${shell}"/><rect x="50" y="469" width="700" height="5" rx="2.5" fill="${shellD}"/><rect x="70" y="444" width="660" height="1.5" fill="#FFFFFF" opacity=".35"/><rect x="355" y="444" width="90" height="5" rx="2.5" fill="${shellD}"/>`;
  const lvl = p.ui, n = p.people, R = rng(p.seed * 7919), GAP = 8;
  const top = 72 + (lvl >= 2 ? 28 : 0), chatW = lvl >= 3 ? 132 : 0;
  const A = { x: 134, y: top, w: 532 - chatW, h: 424 - top - (lvl >= 1 ? 44 : 0) };
  const g = grid(n, A.w, A.h, GAP), gh = g.rows * g.th + (g.rows - 1) * GAP, y0 = A.y + (A.h - gh) / 2;
  const spk = Math.floor(R() * n), names = shuf(NAMES.slice(), R), ord = shuf(EXS.slice(), R), types = shuf([0, 1, 2, 3, 4], R);
  const shirts = shuf([mix(p.primary, "#FFFFFF", 0.35), mix(p.primary, "#2A2A2A", 0.35), "#E6E1D8", "#4A505C", "#C79E74", "#6F8C78"], R);
  const sk = shuf([0, 1, 2, 3, 4, 5], R), hr = shuf([0, 1, 2, 3, 4, 5], R), go = Math.floor(R() * 3), wl = [];
  let clips = "", tiles = "";
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / g.c), col = i % g.c, inRow = row === g.rows - 1 ? n - g.c * (g.rows - 1) : g.c;
    const tw = g.tw, th = g.th, x = A.x + (A.w - (inRow * tw + (inRow - 1) * GAP)) / 2 + col * (tw + GAP), y = y0 + row * (th + GAP);
    const pr = rng(p.seed * 977 + i * 131), muted = R() < 0.35 && i !== spk;
    const tr = { skin: SKIN[sk[i % 6]], hair: HAIR[hr[(i + Math.floor(i / 6)) % 6]], style: Math.floor(pr() * 5), shirt: shirts[(i + Math.floor(i / 6) * 2) % 6], glasses: (i + go) % 3 === 0 };
    let wall = WALLS[0], best = -99;
    WALLS.forEach((w) => { const s = Math.min(contrast(w, tr.skin), contrast(w, tr.hair)) + pr() * 0.8 - (wl[i - 1] === w ? 2 : 0) - (wl[i - g.c] === w ? 1 : 0); if (s > best) { best = s; wall = w; } });
    wl[i] = wall;
    const wd = lum(wall) < 0.2, line = wd ? mix(wall, "#FFFFFF", 0.32) : mix(wall, "#000000", 0.38);
    const ex = p.expression === "mixed" ? (p.speaking && i === spk ? "laugh" : ord[i % 4]) : p.expression;
    const badge = (p.speaking && i === spk) || (lvl >= 3 && muted), side = badge || pr() < 0.5 ? -1 : 1, cx = x + tw / 2, hd = th * 0.205 * 1.5;
    const px0 = side < 0 ? x + tw * 0.06 : cx + hd, px1 = side < 0 ? cx - hd : x + tw * 0.94;
    clips += `<clipPath id="t${i}"><rect x="${f(x)}" y="${f(y)}" width="${f(tw)}" height="${f(th)}" rx="6"/></clipPath>`;
    tiles += `<g clip-path="url(#t${i})"><rect x="${f(x)}" y="${f(y)}" width="${f(tw)}" height="${f(th)}" fill="${wall}"/>${prop(types[i % 5], px0, px1, y, th, line, wd, i)}${person(cx, y + th, th, tr, ex)}<rect x="${f(x)}" y="${f(y)}" width="${f(tw)}" height="${f(th)}" fill="url(#tv)"/></g>`;
    const ic = Math.max(7, Math.min(11, th * 0.09)), bx = f(x + tw - ic - 6), by = f(y + ic + 6);
    if (p.speaking && i === spk) {
      tiles += `<rect x="${f(x + 1.5)}" y="${f(y + 1.5)}" width="${f(tw - 3)}" height="${f(th - 3)}" rx="5" fill="none" stroke="${acc}" stroke-width="3"/>`;
      tiles += `<g transform="translate(${bx} ${by})"><circle r="${f(ic)}" fill="${acc}"/><path d="M${f(-ic * 0.4)} ${f(-ic * 0.15)}v${f(ic * 0.3)}M0 ${f(-ic * 0.45)}v${f(ic * 0.9)}M${f(ic * 0.4)} ${f(-ic * 0.25)}v${f(ic * 0.5)}" stroke="${accOn}" stroke-width="${f(ic * 0.2)}" stroke-linecap="round"/></g>`;
    }
    if (lvl >= 3 && muted) tiles += `<g transform="translate(${bx} ${by})"><circle r="${f(ic)}" fill="${RED}"/><g transform="scale(${f(ic / 11)})">${icon(0, "#FFFFFF")}<path d="M-6 6L6 -6" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"/></g></g>`;
    if (lvl >= 1) {
      const fs = Math.max(11, Math.min(15, th * 0.13)), nm = names[i];
      tiles += `<rect x="${f(x + 6)}" y="${f(y + th - fs - 14)}" width="${f(nm.length * fs * 0.6 + 14)}" height="${f(fs + 8)}" rx="4" fill="#000000" opacity=".55"/><text x="${f(x + 13)}" y="${f(y + th - 10 - fs * 0.12)}" font-family="${FONT}" font-size="${f(fs)}" font-weight="600" fill="#FFFFFF">${nm}</text>`;
    }
  }
  let ui = "";
  if (lvl >= 1) ui += [0, 1, 2, 3, 4].map((k) => `<g transform="translate(${400 + (k - 2) * 38} 402) scale(1.15)">${k === 4 ? `<rect x="-16" y="-11" width="32" height="22" rx="11" fill="${RED}"/>` : `<circle r="12" fill="${k === 2 ? acc : BTN}"/>`}${icon(k, k === 2 ? accOn : k === 4 ? "#FFFFFF" : TXT)}</g>`).join("");
  if (lvl >= 2) {
    ui += `<rect x="134" y="72" width="532" height="28" fill="${PANEL}"/><circle cx="149" cy="86" r="4" fill="#3FB37F"/><text x="160" y="90.5" font-family="${FONT}" font-size="12.5" font-weight="600" fill="${TXT}">Morning standup</text>`;
    ui += `<rect x="612" y="78" width="46" height="16" rx="8" fill="${RED}" fill-opacity=".18"/><circle cx="622" cy="86" r="3.5" fill="${RED}"/><text x="629" y="90" font-family="${FONT}" font-size="10" font-weight="700" fill="${RED}">REC</text><text x="602" y="90.5" text-anchor="end" font-family="${FONT}" font-size="11" fill="${MUT}">${n} ${n === 1 ? "person" : "people"} · 24:18</text>`;
  }
  if (lvl >= 3) {
    ui += `<rect x="534" y="100" width="132" height="280" fill="${PANEL}"/><text x="546" y="120" font-family="${FONT}" font-size="12" font-weight="600" fill="${TXT}">Chat</text>`;
    let by = 132;
    [[92, 30], [72, 22], [96, 30], [60, 22]].forEach(([bw, bh], k) => {
      const right = k % 2 === 1, bx = right ? 656 - bw : 560, fill = right ? mix(acc, PANEL, 0.35) : BTN, tc = right ? onFill(fill) : TXT;
      if (!right) ui += `<circle cx="549" cy="${by + 8}" r="6" fill="${SKIN[(k * 2 + go) % 6]}"/>`;
      ui += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="8" fill="${fill}"/><rect x="${bx + 8}" y="${by + 8}" width="${bw - 16}" height="4" rx="2" fill="${tc}" opacity=".75"/>${bh > 26 ? `<rect x="${bx + 8}" y="${by + 18}" width="${f((bw - 16) * 0.6)}" height="4" rx="2" fill="${tc}" opacity=".5"/>` : ""}`;
      by += bh + 10;
    });
    ui += `<rect x="544" y="346" width="112" height="24" rx="12" fill="${BTN}"/><rect x="556" y="356" width="48" height="4" rx="2" fill="${MUT}" opacity=".6"/><circle cx="644" cy="358" r="7" fill="${acc}"/><path d="M641 358h5M644 355l3 3-3 3" stroke="${accOn}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const defs = `<defs><linearGradient id="wl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(p.wall, t1, 0.6)}"/><stop offset="1" stop-color="${p.wall}"/></linearGradient>` +
    `<linearGradient id="gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".07"/><stop offset=".5" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="tv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".12"/><stop offset=".55" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".12"/></linearGradient>` +
    `<filter id="bl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="26"/></filter>` +
    `<pattern id="brk" width="56" height="28" patternUnits="userSpaceOnUse"><path d="M0 1H56M0 15H56M1 1V15M29 15V28" stroke="${step(p.wall, 1.3)}" stroke-width="2" fill="none"/></pattern>` +
    `<clipPath id="scr"><rect x="134" y="72" width="532" height="352" rx="4"/></clipPath>${clips}</defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">${defs}<rect width="800" height="420" fill="url(#wl)"/>${room}${glow}${desk}${laptop}<g clip-path="url(#scr)"><rect x="134" y="72" width="532" height="352" fill="${SCR}"/>${tiles}${ui}<rect x="134" y="72" width="532" height="352" fill="url(#gl)"/></g>${props}</svg>`;
}
