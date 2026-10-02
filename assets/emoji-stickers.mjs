// Die-cut sticker sheet: six chunky kawaii stickers with white kiss-cut borders, paper edge and soft drop shadows.
export const meta = {
  title: "Sticker Pack",
  kind: "illustration",
  description: "Six cute die-cut stickers (heart, star, lightning, smiley, flower, cloud) with thick white borders and shadows, for social posts, merch mockups and playful brand moments.",
  tags: ["stickers", "kawaii", "cute", "die-cut", "emoji", "heart", "playful", "sticker sheet"],
  price: 3,
  author: "oasis-factory",
  size: [900, 600],
};

export const params = {
  knobs: {
    primary: { type: "color", role: "primary", label: "Primary", default: "#FF6B9A" },
    secondary: { type: "color", role: "secondary", label: "Secondary", default: "#FFC83D" },
    accent: { type: "color", role: "highlight", label: "Accent", default: "#6C8CFF" },
    background: { type: "color", role: "background", label: "Background", default: "#FBE9DD" },
    finish: { type: "choice", label: "Finish", default: "glossy", options: ["glossy", "flat", "holo"] },
    layout: { type: "choice", label: "Layout", default: "sheet", options: ["sheet", "loose"] },
    outline: { type: "range", label: "Outline width", default: 11, min: 4, max: 20, step: 1 },
    jitter: { type: "range", label: "Rotation jitter", default: 10, min: 0, max: 25, step: 1 },
    seed: { type: "range", label: "Seed", default: 7, min: 1, max: 200, step: 1 },
    faces: { type: "toggle", label: "Kawaii faces", default: true },
  },
  presets: {
    Bubblegum: { primary: "#FF6B9A", secondary: "#FFC83D", accent: "#6C8CFF", background: "#FBE9DD" },
    Citrus: { primary: "#FF7A3D", secondary: "#FFE14D", accent: "#2EC4A6", background: "#FFF6E5" },
    Mint: { primary: "#F28CA0", secondary: "#F6D06F", accent: "#4BB39B", background: "#E6F4EE" },
    Night: { primary: "#FF5FA2", secondary: "#FFD447", accent: "#7B6CFF", background: "#1B1630" },
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

const fx = (n) => Math.round(n * 100) / 100;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const A = hex(a), B = hex(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
const lum = (h) => { const [r, g, b] = hex(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const INK = "#3B2440";
const SOFT = 10;

function starPath() {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 40 : 86;
    d += (i ? "L" : "M") + fx(Math.cos(a) * rr) + "," + fx(Math.sin(a) * rr + 8);
  }
  return d + "Z";
}

function shapes(c) {
  const petals = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 2;
    petals.push([`<circle cx="${fx(Math.cos(a) * 50)}" cy="${fx(Math.sin(a) * 50)}" r="34"/>`, c.petal]);
  }
  return {
    heart: {
      items: [[`<path d="M0,68 C-30,44 -85,14 -85,-26 C-85,-56 -60,-76 -35,-76 C-18,-76 -6,-67 0,-53 C6,-67 18,-76 35,-76 C60,-76 85,-56 85,-26 C85,14 30,44 0,68Z"/>`, c.p]],
      face: [0, -10, 1.18], col: c.p, shine: "M-62,-30 Q-60,-54 -38,-58", dot: [-66, -10],
    },
    star: {
      items: [[`<path d="${starPath()}"/>`, c.star]],
      face: [0, 10, 0.84], col: c.star, shine: "M-6,-58 L-13,-42", dot: [-50, -16],
    },
    lightning: {
      items: [[`<path d="M0,-95 L43,-95 L13,-25 L47,-25 L-33,95 L-10,10 L-47,10Z"/>`, c.a]],
      face: [-3, -4, 0.8], col: c.a, shine: "M8,-82 L-4,-58", dot: [-10, -42],
    },
    smiley: {
      items: [[`<circle r="77"/>`, c.s]],
      face: null, col: c.s, shine: "M-54,-32 Q-43,-54 -19,-62", dot: [-62, -8],
    },
    flower: {
      items: [...petals, [`<circle r="30"/>`, c.s]],
      face: [0, 0, 0.64], col: c.s, shine: "M-18,-64 Q-12,-76 2,-77", dot: [-58, -40],
    },
    cloud: {
      items: [
        [`<circle cx="-38" cy="12" r="36"/>`, c.cloud], [`<circle cx="8" cy="-14" r="46"/>`, c.cloud],
        [`<circle cx="50" cy="16" r="32"/>`, c.cloud], [`<rect x="-74" y="10" width="156" height="48" rx="24"/>`, c.cloud],
      ],
      face: [6, 14, 1.02], col: c.cloud, shine: "M-22,-30 Q-12,-50 8,-52", dot: [-52, -4],
    },
  };
}

function face(x, y, s, col) {
  const bl = mix(col, "#FF3D6E", 0.5);
  let o = "";
  for (const k of [-1, 1]) {
    o += `<ellipse cx="${fx(x + k * 14 * s)}" cy="${fx(y)}" rx="${fx(5.5 * s)}" ry="${fx(7 * s)}" fill="${INK}"/>`;
    o += `<circle cx="${fx(x + k * 14 * s - 1.6 * s)}" cy="${fx(y - 2.6 * s)}" r="${fx(1.9 * s)}" fill="#FFFFFF"/>`;
    o += `<ellipse cx="${fx(x + k * 25 * s)}" cy="${fx(y + 8 * s)}" rx="${fx(7 * s)}" ry="${fx(4.5 * s)}" fill="${bl}" opacity="0.6"/>`;
  }
  o += `<path d="M${fx(x - 7 * s)},${fx(y + 9 * s)} Q${fx(x)},${fx(y + 16 * s)} ${fx(x + 7 * s)},${fx(y + 9 * s)}" fill="none" stroke="${INK}" stroke-width="${fx(4 * s)}" stroke-linecap="round"/>`;
  return o;
}

function smileyFace(blush, col) {
  let o = "";
  for (const k of [-1, 1]) {
    o += `<ellipse cx="${k * 23}" cy="-18" rx="8" ry="12.5" fill="${INK}"/><circle cx="${k * 23 - 2.5}" cy="-23" r="3" fill="#FFFFFF"/>`;
    if (blush) o += `<ellipse cx="${k * 45}" cy="15" rx="10.5" ry="6.5" fill="${mix(col, "#FF3D6E", 0.5)}" opacity="0.6"/>`;
  }
  return o + `<path d="M-38,10 Q0,56 38,10" fill="none" stroke="${INK}" stroke-width="8.5" stroke-linecap="round"/>`;
}

export default function render(p) {
  const W = 900, H = 600;
  const r = rng(p.seed * 9973 + 17);
  const w = p.outline, holo = p.finish === "holo", sheet = p.layout === "sheet";
  const c = {
    p: p.primary, s: p.secondary, a: p.accent,
    star: mix(p.secondary, p.primary, 0.2),
    petal: mix(p.primary, "#FFFFFF", 0.3), cloud: mix(p.accent, "#FFFFFF", 0.55),
  };
  const light = lum(p.background) > 0.45;
  const shadowCol = light ? mix(p.background, "#000000", 0.6) : "#000000";
  const shadowOp = light ? 0.3 : 0.55;
  const backing = light ? mix(p.background, "#FFFFFF", 0.65) : mix(p.background, "#FFFFFF", 0.08);
  const edge = mix(mix("#FFFFFF", p.background, 0.45), "#000000", 0.1);
  const outlineFill = holo ? "url(#holo)" : "#FFFFFF";
  const SH = shapes(c);

  const defs = `<defs>
<radialGradient id="bgG" cx="0.5" cy="0.42" r="0.75"><stop offset="0" stop-color="${mix(p.background, "#FFFFFF", light ? 0.35 : 0.1)}"/><stop offset="1" stop-color="${p.background}"/></radialGradient>
<linearGradient id="holo" gradientUnits="userSpaceOnUse" x1="-100" y1="-100" x2="100" y2="100"><stop offset="0" stop-color="#FFD6F0"/><stop offset="0.3" stop-color="#D6EEFF"/><stop offset="0.55" stop-color="#E2FFD9"/><stop offset="0.8" stop-color="#FFF2C4"/><stop offset="1" stop-color="#EBD6FF"/></linearGradient>
<filter id="sh" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="6" flood-color="${shadowCol}" flood-opacity="${shadowOp}"/></filter>
<filter id="card" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="${shadowCol}" flood-opacity="${fx(shadowOp * 0.55)}"/></filter>
</defs>`;

  let out = `<rect width="${W}" height="${H}" fill="url(#bgG)"/>`;

  if (sheet) {
    const labelCol = lum(backing) > 0.5 ? INK : "#FFFFFF";
    out += `<rect x="60" y="36" width="780" height="528" rx="26" fill="${backing}" filter="url(#card)"/>`;
    out += `<g font-family="Menlo, Consolas, monospace" font-size="12" font-weight="700" letter-spacing="3" fill="${labelCol}" opacity="0.5">`;
    out += `<text x="94" y="74">STICKER PACK</text><text x="806" y="74" text-anchor="end">NO. ${String(p.seed).padStart(3, "0")}</text></g>`;
    out += `<line x1="94" y1="88" x2="806" y2="88" stroke="${labelCol}" stroke-opacity="0.12" stroke-width="1.5" stroke-dasharray="2 6" stroke-linecap="round"/>`;
  } else {
    const cr = rng(p.seed * 31 + 5), cols = [c.p, c.s, c.a];
    for (let i = 0; i < 28; i++) {
      const x = fx(cr() * W), y = fx(cr() * H), k = Math.floor(cr() * 3), z = 4 + cr() * 4, col = cols[i % 3];
      if (k === 0) out += `<circle cx="${x}" cy="${y}" r="${fx(z * 0.8)}" fill="${col}" opacity="0.85"/>`;
      else if (k === 1) out += `<circle cx="${x}" cy="${y}" r="${fx(z)}" fill="none" stroke="${col}" stroke-width="3" opacity="0.85"/>`;
      else out += `<path d="M${fx(x - z)},${y}H${fx(x + z)}M${x},${fx(y - z)}V${fx(y + z)}" stroke="${col}" stroke-width="3.5" stroke-linecap="round" opacity="0.85"/>`;
    }
  }

  const keys = ["heart", "star", "lightning", "smiley", "flower", "cloud"];
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }

  const xs = sheet ? [190, 450, 710] : [175, 450, 725];
  const ys = sheet ? [216, 442] : [175, 425];
  const fit = 1 - (w - 11) * 0.009 - p.jitter * 0.0016;
  const base = (sheet ? 0.9 : 1.0) * fit;

  keys.forEach((key, i) => {
    const d = SH[key];
    const x = xs[i % 3] + (r() * 2 - 1) * p.jitter * 0.5;
    const y = ys[Math.floor(i / 3)] + (r() * 2 - 1) * p.jitter * 0.5;
    const rot = (r() * 2 - 1) * p.jitter;
    const sc = base * (0.96 + r() * 0.08);
    const geo = d.items.map((it) => it[0]).join("");
    const top = d.items.map(([el, col]) => el.replace("/>", ` fill="${col}" stroke="${col}"/>`)).join("");
    const tf = (dy) => `translate(${fx(x)},${fx(y + dy)}) rotate(${fx(rot)}) scale(${fx(sc)})`;
    const bw = SOFT + 2 * w;

    let deco = "";
    if (p.finish !== "flat") {
      deco += `<path d="${d.shine}" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" opacity="0.6"/>`;
      deco += `<circle cx="${d.dot[0]}" cy="${d.dot[1]}" r="4.5" fill="#FFFFFF" opacity="0.6"/>`;
    }
    if (key === "smiley") deco += smileyFace(p.faces, d.col);
    else if (p.faces && d.face) deco += face(d.face[0], d.face[1], d.face[2], d.col);

    out += `<g filter="url(#sh)">`;
    out += `<g transform="${tf(3.5)}" fill="${edge}" stroke="${edge}" stroke-width="${bw}" stroke-linejoin="round">${geo}</g>`;
    out += `<g transform="${tf(0)}" fill="${outlineFill}" stroke="${outlineFill}" stroke-width="${bw}" stroke-linejoin="round">${geo}</g></g>`;
    out += `<g transform="${tf(0)}" stroke-width="${SOFT}" stroke-linejoin="round">${top}${deco}</g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}${out}</svg>`;
}
