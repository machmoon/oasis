// Spot illustration: a friendly, abstract rounded character in four poses, with seeded backdrop and sparkles.
export const meta = {
  title: "Friendly Spot Folk",
  kind: "illustration",
  description: "A soft, rounded character who waves, reads, celebrates or ponders, for empty states, onboarding and blog headers.",
  tags: ["character", "spot illustration", "empty state", "onboarding", "person", "friendly", "flat"],
  price: 5,
  author: "oasis-factory",
  size: [600, 600],
};

export const params = {
  knobs: {
    skin: { type: "color", label: "Skin", default: "#F1C6A6" },
    shirt: { type: "color", label: "Shirt", default: "#E2603F" },
    accent: { type: "color", label: "Backdrop", default: "#CFE3D4" },
    background: { type: "color", label: "Background", default: "#F7F2EA" },
    ink: { type: "color", label: "Ink & hair", default: "#2B2735" },
    action: { type: "choice", label: "Action", default: "waving", options: ["waving", "reading", "celebrating", "thinking"] },
    hair: { type: "choice", label: "Hair", default: "short", options: ["short", "bun", "curly", "none"] },
    build: { type: "range", label: "Build", default: 190, min: 150, max: 240, step: 5 },
    seed: { type: "range", label: "Seed", default: 7, min: 1, max: 200, step: 1 },
    accessory: { type: "toggle", label: "Glasses", default: true },
  },
  presets: {
    Sunday: { skin: "#F1C6A6", shirt: "#E2603F", accent: "#CFE3D4", background: "#F7F2EA", ink: "#2B2735" },
    Meadow: { skin: "#8D5A3F", shirt: "#2F7D6D", accent: "#F4D8A8", background: "#FFF9EF", ink: "#1F2A2A" },
    Dusk: { skin: "#E8B48F", shirt: "#F2B640", accent: "#3A3F78", background: "#1E2142", ink: "#12142B" },
    Bubblegum: { skin: "#FFD9C2", shirt: "#6C5CE7", accent: "#FFC6D9", background: "#FFF4F7", ink: "#2D2240" },
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

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function mix(a, b, t) {
  const pa = hex(a), pb = hex(b);
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
const lum = (h) => { const c = hex(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
const f = (n) => +n.toFixed(1);

function blobPath(cx, cy, size, n, randomness, r) {
  const angle = (Math.PI * 2) / n;
  const rs = 1 / (1 + randomness / 10);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const off = (rs + r() * (1 - rs)) / 2;
    pts.push([cx + Math.sin(i * angle) * off * size, cy + Math.cos(i * angle) * off * size]);
  }
  const k = ((4 / 3) * Math.tan(angle / 4)) / Math.sin(angle / 2) / 2;
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) * k)},${f(p1[1] + (p2[1] - p0[1]) * k)} ${f(p2[0] - (p3[0] - p1[0]) * k)},${f(p2[1] - (p3[1] - p1[1]) * k)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + "Z";
}

const star = (x, y, s) => `M${f(x)},${f(y - s)} Q${f(x)},${f(y)} ${f(x + s)},${f(y)} Q${f(x)},${f(y)} ${f(x)},${f(y + s)} Q${f(x)},${f(y)} ${f(x - s)},${f(y)} Q${f(x)},${f(y)} ${f(x)},${f(y - s)}Z`;

export default function render(p) {
  const S = 600, cx = 300, bw = p.build, R = bw / 2, bt = 300, bb = 500;
  const hr = 64, hx = cx, hy = bt - hr + 16;
  const sy = bt + R * 0.41, sL = [cx - R * 0.7, sy], sR = [cx + R * 0.7, sy];
  const ink = p.ink, armC = mix(p.shirt, ink, 0.2), paper = mix(p.background, "#FFFFFF", 0.75);
  const dark = lum(p.background) < 0.4;
  const soft = dark ? mix(p.accent, "#FFFFFF", 0.5) : mix(p.accent, ink, 0.45);
  const line = dark ? mix(p.accent, "#FFFFFF", 0.6) : ink;
  const r = rng(p.seed * 7919 + 3);
  const act = p.action;

  let arms = [], hands = [], extra = "", book = "";
  const P = (a) => `${f(a[0])},${f(a[1])}`;
  const downL = () => { const h = [cx - R - 10, sy + 115]; arms.push(`M${P(sL)} Q${f(cx - R - 28)},${f(sy + 45)} ${P(h)}`); hands.push(h); };
  if (act === "waving") {
    downL();
    const h = [cx + R + 62, sy - 100];
    arms.push(`M${P(sR)} Q${f(cx + R + 70)},${f(sy - 5)} ${P(h)}`); hands.push(h);
    for (let i = 0; i < 2; i++) {
      const o = 30 + i * 16;
      extra += `<path d="M${f(h[0] + o - 6)},${f(h[1] - o)} Q${f(h[0] + o + 12)},${f(h[1] - 8)} ${f(h[0] + o)},${f(h[1] + 16)}" fill="none" stroke="${line}" stroke-width="5" stroke-linecap="round" opacity="${0.6 - i * 0.22}"/>`;
    }
  } else if (act === "celebrating") {
    const hl = [cx - R - 55, sy - 115], hr2 = [cx + R + 55, sy - 115];
    arms.push(`M${P(sL)} Q${f(cx - R - 20)},${f(sy - 10)} ${P(hl)}`, `M${P(sR)} Q${f(cx + R + 20)},${f(sy - 10)} ${P(hr2)}`);
    hands.push(hl, hr2);
    const cols = [p.shirt, dark ? soft : ink, mix(p.accent, ink, 0.3), mix(p.skin, p.shirt, 0.5)];
    for (let i = 0; i < 22; i++) {
      const x = 80 + r() * 440, y = 40 + r() * 240, rot = f(r() * 180), c = cols[Math.floor(r() * 4)], k = r();
      if (Math.hypot(x - hx, y - hy) < hr + 45 || hands.some((q) => Math.hypot(q[0] - x, q[1] - y) < 30)) continue;
      extra += k < 0.6
        ? `<rect x="${f(x - 7)}" y="${f(y - 3)}" width="14" height="6" rx="2" fill="${c}" transform="rotate(${rot} ${f(x)} ${f(y)})"/>`
        : `<circle cx="${f(x)}" cy="${f(y)}" r="4.5" fill="${c}"/>`;
    }
  } else if (act === "reading") {
    const by = bt + R, hl = [cx - 80, by + 12], hr2 = [cx + 80, by + 12];
    arms.push(`M${P(sL)} Q${f(cx - R - 18)},${f(sy + 55)} ${P(hl)}`, `M${P(sR)} Q${f(cx + R + 18)},${f(sy + 55)} ${P(hr2)}`);
    hands.push(hl, hr2);
    book = `<path d="M${cx},${f(by - 38)} L${cx - 86},${f(by - 50)} L${cx - 86},${f(by + 50)} L${cx},${f(by + 62)} L${cx + 86},${f(by + 50)} L${cx + 86},${f(by - 50)}Z" fill="${ink}"/>`;
    for (const s of [-1, 1]) {
      book += `<path d="M${cx},${f(by - 44)} L${cx + s * 78},${f(by - 54)} L${cx + s * 78},${f(by + 42)} L${cx},${f(by + 52)}Z" fill="${paper}"/>`;
      for (let i = 0; i < 4; i++) {
        const y = by - 30 + i * 17, w = i === 3 ? 30 : 52;
        book += `<path d="M${cx + s * 14},${f(y - 1)} L${cx + s * (14 + w)},${f(y - 1 - w * 0.12)}" stroke="${ink}" stroke-width="3.5" stroke-linecap="round" opacity="0.22"/>`;
      }
    }
  } else {
    downL();
    const elbow = [cx + R + 5, sy + 95], h = [hx + hr * 0.32, hy + hr * 0.92];
    arms.push(`M${P(sR)} Q${f(cx + R + 30)},${f(sy + 40)} ${P(elbow)} L${P(h)}`); hands.push(h);
    const bx = 140, by = 112;
    extra += `<circle cx="${f(hx - hr - 28)}" cy="${f(hy - hr + 8)}" r="7" fill="${paper}"/><circle cx="${f(hx - hr - 56)}" cy="${f(hy - hr - 24)}" r="12" fill="${paper}"/>`;
    extra += `<g fill="${paper}"><circle cx="${bx - 32}" cy="${by + 4}" r="27"/><circle cx="${bx}" cy="${by - 12}" r="34"/><circle cx="${bx + 32}" cy="${by + 4}" r="27"/><rect x="${bx - 58}" y="${by}" width="116" height="31" rx="15.5"/></g>`;
    for (let i = -1; i <= 1; i++) extra += `<circle cx="${bx + i * 20}" cy="${by + 8}" r="5.5" fill="${ink}" opacity="${0.5 + (i + 1) * 0.2}"/>`;
  }

  const avoid = hands.map((h) => [h[0], h[1], 78]).concat([[hx, hy, hr + 46]]);
  if (act === "thinking") avoid.push([140, 112, 100], [200, 175, 45]);
  const placed = [], want = act === "celebrating" ? 3 : 5;
  for (let tries = 0; placed.length < want && tries < 90; tries++) {
    const a = r() * Math.PI * 2, rad = 200 + r() * 70, x = cx + Math.cos(a) * rad, y = 310 + Math.sin(a) * rad * 0.85;
    if (x < 44 || x > 556 || y < 44 || y > 460) continue;
    if (x > cx - R - 44 && x < cx + R + 44 && y > bt - 24) continue;
    if (avoid.some((q) => Math.hypot(q[0] - x, q[1] - y) < q[2])) continue;
    if (placed.some((q) => Math.hypot(q[0] - x, q[1] - y) < 80)) continue;
    placed.push([x, y]);
  }
  let decor = "";
  placed.forEach(([x, y], i) => {
    const k = r();
    decor += i % 3 === 2
      ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(4 + k * 3)}" fill="${soft}"/>`
      : `<path d="${star(x, y, (i === 0 ? 16 : 10) + k * 6)}" fill="${i % 2 ? soft : p.shirt}"/>`;
  });

  const body = `M${cx - R},${bb - 22} L${cx - R},${bt + R} A${R} ${R} 0 0 1 ${cx + R},${bt + R} L${cx + R},${bb - 22} Q${cx + R},${bb} ${cx + R - 22},${bb} L${cx - R + 22},${bb} Q${cx - R},${bb} ${cx - R},${bb - 22}Z`;

  let hairBack = "", hairCap = "";
  if (p.hair === "curly") {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.1 + (i / 6) * 0.8);
      hairBack += `<circle cx="${f(hx + Math.cos(a) * hr * 0.92)}" cy="${f(hy + Math.sin(a) * hr * 0.92)}" r="${f(hr * 0.3)}" fill="${ink}"/>`;
    }
    hairCap = `<ellipse cx="${hx}" cy="${f(hy - hr * 0.95)}" rx="${f(hr * 1.1)}" ry="${f(hr * 0.6)}" fill="${ink}"/>`;
  } else if (p.hair !== "none") {
    hairCap = `<ellipse cx="${f(hx + hr * 0.25)}" cy="${f(hy - hr * 0.9)}" rx="${f(hr * 1.05)}" ry="${f(hr * 0.62)}" fill="${ink}"/><ellipse cx="${f(hx - hr * 0.62)}" cy="${f(hy - hr * 0.55)}" rx="${f(hr * 0.45)}" ry="${f(hr * 0.36)}" fill="${ink}"/>`;
    if (p.hair === "bun") hairBack = `<circle cx="${hx}" cy="${f(hy - hr * 1.08)}" r="${f(hr * 0.36)}" fill="${ink}"/>`;
  }

  const off = { waving: [0, 0], reading: [0, 4], celebrating: [0, 0], thinking: [-4, -4] }[act];
  const ey = hy - hr * 0.02, my = hy + hr * 0.34;
  let face = "";
  for (const s of [-1, 1]) {
    const ex = hx + s * hr * 0.3;
    face += `<circle cx="${f(hx + s * hr * 0.54)}" cy="${f(hy + hr * 0.24)}" r="${f(hr * 0.13)}" fill="${mix(p.skin, "#E0533D", 0.45)}" opacity="0.55"/>`;
    face += act === "celebrating"
      ? `<path d="M${f(ex - 7)},${f(ey + 3)} Q${f(ex)},${f(ey - 7)} ${f(ex + 7)},${f(ey + 3)}" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`
      : `<ellipse cx="${f(ex + off[0])}" cy="${f(ey + off[1])}" rx="5.5" ry="7" fill="${ink}"/>`;
  }
  if (act === "celebrating") face += `<path d="M${hx - 14},${f(my - 2)} Q${hx},${f(my + 26)} ${hx + 14},${f(my - 2)}Z" fill="${ink}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
  else if (act === "thinking") face += `<path d="M${hx - 8},${f(my + 4)} Q${hx + 2},${f(my + 3)} ${hx + 10},${f(my - 1)}" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`;
  else { const w = act === "reading" ? 9 : 12; face += `<path d="M${hx - w},${f(my)} Q${hx},${f(my + w * 0.85)} ${hx + w},${f(my)}" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`; }

  let glasses = "";
  if (p.accessory) {
    const gr = f(hr * 0.22), gx = hr * 0.3;
    glasses = `<g fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"><circle cx="${f(hx - gx)}" cy="${f(ey)}" r="${gr}" fill="#FFFFFF" fill-opacity="0.22"/><circle cx="${f(hx + gx)}" cy="${f(ey)}" r="${gr}" fill="#FFFFFF" fill-opacity="0.22"/><path d="M${f(hx - gx + hr * 0.22)},${f(ey)} Q${hx},${f(ey - 6)} ${f(hx + gx - hr * 0.22)},${f(ey)}"/><path d="M${f(hx - gx - hr * 0.22)},${f(ey - 2)} L${f(hx - hr * 0.95)},${f(ey - 6)}"/><path d="M${f(hx + gx + hr * 0.22)},${f(ey - 2)} L${f(hx + hr * 0.95)},${f(ey - 6)}"/></g>`;
  }

  const blob = blobPath(cx, 330, 500, 7, 5, rng(p.seed * 7919));
  const out = [
    `<rect width="${S}" height="${S}" fill="${p.background}"/>`,
    `<path d="${blob}" fill="${p.accent}"/>`, decor,
    `<ellipse cx="${cx}" cy="${bb + 8}" rx="${f(bw * 0.68)}" ry="13" fill="${ink}" opacity="0.13"/>`,
    `<ellipse cx="${f(cx - bw * 0.22)}" cy="${bb + 2}" rx="24" ry="11" fill="${ink}"/><ellipse cx="${f(cx + bw * 0.22)}" cy="${bb + 2}" rx="24" ry="11" fill="${ink}"/>`,
    `<path d="${body}" fill="${p.shirt}"/>`,
    `<g clip-path="url(#bd)"><ellipse cx="${f(cx + R * 1.05)}" cy="${f((bt + bb) / 2 + 24)}" rx="${f(R * 0.62)}" ry="${f((bb - bt) * 0.78)}" fill="${ink}" opacity="0.09"/><ellipse cx="${hx}" cy="${f(hy + hr - 4)}" rx="${f(hr * 0.78)}" ry="16" fill="${ink}" opacity="0.12"/></g>`,
    arms.map((d) => `<path d="${d}" fill="none" stroke="${armC}" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>`).join(""),
    book, hairBack,
    `<circle cx="${hx - hr + 2}" cy="${f(hy + 6)}" r="12" fill="${p.skin}"/><circle cx="${hx + hr - 2}" cy="${f(hy + 6)}" r="12" fill="${p.skin}"/>`,
    `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="${p.skin}"/>`,
    `<g clip-path="url(#hd)">${hairCap}</g>`, face, glasses,
    hands.map((h) => `<circle cx="${f(h[0])}" cy="${f(h[1])}" r="16.5" fill="${p.skin}"/>`).join(""),
    extra,
  ].join("");
  const defs = `<defs><clipPath id="bd"><path d="${body}"/></clipPath><clipPath id="hd"><circle cx="${hx}" cy="${hy}" r="${hr}"/></clipPath></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">${defs}${out}</svg>`;
}
