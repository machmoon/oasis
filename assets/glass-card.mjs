// Glassmorphism membership card, gently tilted over seeded glowing orbs, with frosted glass, chip and brand mark.
export const meta = {
  title: "Frosted Member Card",
  kind: "ui",
  description: "A frosted-glass credit or membership card floating over glowing orbs, for fintech landing pages, app onboarding and loyalty mockups.",
  tags: ["glassmorphism", "credit card", "membership", "fintech", "frosted glass", "ui", "blur", "card"],
  price: 5,
  author: "oasis-factory",
  size: [800, 600],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#0E0B1F" },
    orbA: { type: "color", role: "primary", label: "Orb one", default: "#FF5FA2" },
    orbB: { type: "color", role: "secondary", label: "Orb two", default: "#5B7CFF" },
    ink: { type: "color", role: "ink", label: "Card ink", default: "#FFFFFF" },
    brand: { type: "choice", label: "Brand mark", default: "rings", options: ["rings", "orbit", "spark", "wordmark"] },
    glass: { type: "range", label: "Glass opacity", default: 35, min: 0, max: 100, step: 1 },
    seed: { type: "range", label: "Orb seed", default: 7, min: 1, max: 200, step: 1 },
    chip: { type: "toggle", label: "Chip", default: true },
    holder: { type: "text", label: "Card holder", default: "Maya Lindqvist" },
    last4: { type: "text", label: "Last four digits", default: "4821" },
  },
  presets: {
    Aurora: { background: "#0E0B1F", orbA: "#FF5FA2", orbB: "#5B7CFF", ink: "#FFFFFF" },
    Ember: { background: "#140A06", orbA: "#FF4D2E", orbB: "#FFB020", ink: "#FFFFFF" },
    Peach: { background: "#FFF1E6", orbA: "#FF8A5B", orbB: "#FFC94D", ink: "#3A2418" },
    Mint: { background: "#E6F4EF", orbA: "#2EC4B6", orbB: "#9B8CFF", ink: "#10292B" },
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

function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a, b, t) {
  const x = hex(a), y = hex(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

function lum(c) {
  const [r, g, b] = hex(c);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const f = (n) => n.toFixed(1);

function brandMark(kind, x, y, ink) {
  if (kind === "rings") {
    return `<circle cx="${x + 13}" cy="${y}" r="13" fill="${ink}" fill-opacity="0.9"/><circle cx="${x + 31}" cy="${y}" r="13" fill="${ink}" fill-opacity="0.45"/>`;
  }
  if (kind === "orbit") {
    return `<circle cx="${x + 16}" cy="${y}" r="8" fill="${ink}"/><ellipse cx="${x + 16}" cy="${y}" rx="18" ry="6.5" fill="none" stroke="${ink}" stroke-width="1.6" stroke-opacity="0.8" transform="rotate(-24 ${x + 16} ${y})"/>`;
  }
  if (kind === "spark") {
    const c = x + 14, s = 14, k = 2.6;
    return `<path d="M${c},${y - s} Q${c + k},${y - k} ${c + s},${y} Q${c + k},${y + k} ${c},${y + s} Q${c - k},${y + k} ${c - s},${y} Q${c - k},${y - k} ${c},${y - s}Z" fill="${ink}"/><circle cx="${c + 22}" cy="${y - 9}" r="2.6" fill="${ink}" fill-opacity="0.6"/>`;
  }
  return `<text x="${x}" y="${y + 8}" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-weight="700" font-size="25" letter-spacing="-0.5" fill="${ink}">oasis</text>`;
}

function contactless(cx, cy, ink) {
  let d = "";
  const a = (50 * Math.PI) / 180;
  for (let i = 0; i < 3; i++) {
    const r = 5 + i * 5;
    d += `M${f(cx + r * Math.cos(-a))},${f(cy + r * Math.sin(-a))} A${r},${r} 0 0 1 ${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))} `;
  }
  return `<path d="${d}" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round" stroke-opacity="0.75"/>`;
}

function chipSvg(x, y) {
  const s = `stroke="#7A5C2E" stroke-opacity="0.55" stroke-width="1"`;
  return `<rect x="${x}" y="${y}" width="46" height="36" rx="7" fill="url(#chipG)"/>` +
    `<path d="M${x},${y + 12}h14M${x + 32},${y + 12}h14M${x},${y + 24}h14M${x + 32},${y + 24}h14M${x + 23},${y}v10M${x + 23},${y + 26}v10" ${s} fill="none"/>` +
    `<rect x="${x + 14}" y="${y + 10}" width="18" height="16" rx="4" fill="none" ${s}/>` +
    `<rect x="${x + 0.5}" y="${y + 0.5}" width="45" height="35" rx="6.5" fill="none" stroke="#FFFFFF" stroke-opacity="0.35"/>`;
}

export default function render(p) {
  const W = 800, H = 600;
  const cw = 440, ch = 278, cx = 180, cy = 161, cr = 22;
  const TILT = -4, rot = `rotate(${TILT} 400 300)`, unrot = `rotate(${-TILT} 400 300)`;
  const r = rng(p.seed * 7919 + 13);
  const ink = p.ink;
  const t = Math.max(0, Math.min(100, p.glass)) / 100;
  const milk = 0.04 + t * 0.32;
  const frostBlur = 26 + t * 30;
  const orbC = mix(p.orbA, p.orbB, 0.5);
  const orbD = mix(p.orbB, "#FFFFFF", 0.3);

  const side = r() < 0.5;
  const orbs = [
    { x: 190 + (r() - 0.5) * 130, y: 175 + (r() - 0.5) * 110, rad: 125 + r() * 50, c: p.orbA },
    { x: 610 + (r() - 0.5) * 130, y: 425 + (r() - 0.5) * 110, rad: 135 + r() * 50, c: p.orbB },
    { x: side ? 590 + r() * 90 : 120 + r() * 90, y: side ? 110 + r() * 70 : 430 + r() * 80, rad: 70 + r() * 40, c: orbC },
  ];
  let best = null, bestScore = -Infinity;
  for (let i = 0; i < 12; i++) {
    const x = 70 + r() * 660, y = 60 + r() * 480, rad = 24 + r() * 22;
    let s = Math.min(...orbs.map((o) => Math.hypot(x - o.x, y - o.y) - o.rad - rad));
    s = Math.min(s, Math.hypot(x - 400, y - 300) - 170);
    if (s > bestScore) { bestScore = s; best = { x, y, rad, c: orbD }; }
  }
  orbs.push(best);

  let grads = "", orbShapes = "";
  orbs.forEach((o, i) => {
    grads += `<radialGradient id="o${i}" cx="0.36" cy="0.32" r="0.72"><stop offset="0" stop-color="${mix(o.c, "#FFFFFF", 0.4)}"/><stop offset="0.55" stop-color="${o.c}"/><stop offset="1" stop-color="${mix(o.c, p.background, 0.3)}"/></radialGradient>`;
    orbShapes += `<circle cx="${f(o.x)}" cy="${f(o.y)}" r="${f(o.rad)}" fill="url(#o${i})"/>`;
  });

  const light = lum(ink) > 0.5;
  const fr = `filterUnits="userSpaceOnUse" x="-200" y="-200" width="1200" height="1000"`;
  const defs = `<defs>${grads}
<radialGradient id="bgG" cx="0.5" cy="0.45" r="0.75"><stop offset="0" stop-color="${mix(p.background, "#FFFFFF", 0.06)}"/><stop offset="1" stop-color="${mix(p.background, "#000000", 0.12)}"/></radialGradient>
<filter id="soft" ${fr}><feGaussianBlur stdDeviation="9"/></filter>
<filter id="halo" ${fr}><feGaussianBlur stdDeviation="55"/></filter>
<filter id="frost" ${fr}><feGaussianBlur stdDeviation="${f(frostBlur)}"/></filter>
<filter id="shadow" ${fr}><feGaussianBlur stdDeviation="22"/></filter>
<filter id="lift" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="${light ? "#000000" : "#FFFFFF"}" flood-opacity="${light ? 0.28 : 0.4}"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
<clipPath id="cardClip"><rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="${cr}"/></clipPath>
<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.3"/><stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0.05"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
<linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.8"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.12"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.45"/></linearGradient>
<linearGradient id="chipG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3E3B3"/><stop offset="0.5" stop-color="#D4B474"/><stop offset="1" stop-color="#A9864C"/></linearGradient>
</defs>`;

  const world = `<rect width="${W}" height="${H}" fill="url(#bgG)"/>`;
  const bg = `${world}<g filter="url(#halo)" opacity="0.55">${orbShapes}</g><g filter="url(#soft)">${orbShapes}</g>`;
  const shadow = `<rect x="${cx + 24}" y="${cy + 40}" width="${cw - 48}" height="${ch - 20}" rx="${cr}" fill="${mix(p.background, "#000000", 0.7)}" opacity="0.4" filter="url(#shadow)"/>`;

  const frosted = `<g clip-path="url(#cardClip)"><g transform="${unrot}">${world}<g filter="url(#frost)">${orbShapes}</g></g>` +
    `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="#FFFFFF" opacity="${milk.toFixed(3)}"/>` +
    `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="url(#sheen)"/>` +
    `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" filter="url(#grain)" opacity="0.07"/></g>` +
    `<rect x="${cx + 0.75}" y="${cy + 0.75}" width="${cw - 1.5}" height="${ch - 1.5}" rx="${cr - 0.75}" fill="none" stroke="url(#edge)" stroke-width="1.5"/>`;

  const L = cx + 32, R = cx + cw - 32;
  const sans = "Helvetica Neue, Helvetica, Arial, sans-serif";
  const mono = "SF Mono, Menlo, Consolas, monospace";

  let content = brandMark(p.brand, L, cy + 45, ink);
  content += `<text x="${R}" y="${cy + 49}" text-anchor="end" font-family="${sans}" font-size="10" font-weight="600" letter-spacing="3" fill="${ink}" fill-opacity="0.75">MEMBER</text>`;

  const rowY = cy + 102;
  if (p.chip) content += chipSvg(L, rowY - 18) + contactless(L + 70, rowY, ink);
  else content += contactless(L + 6, rowY, ink);

  const numY = cy + 163;
  for (let g = 0; g < 3; g++) {
    for (let d = 0; d < 4; d++) {
      content += `<circle cx="${L + 3 + g * 54 + d * 10}" cy="${numY - 7}" r="3.1" fill="${ink}" fill-opacity="0.85"/>`;
    }
  }
  const last = esc(String(p.last4 || "").slice(0, 4));
  content += `<text x="${L + 162}" y="${numY}" font-family="${mono}" font-size="22" letter-spacing="2.5" fill="${ink}">${last}</text>`;

  const labY = cy + ch - 58, valY = cy + ch - 35;
  const name = esc(String(p.holder || "").slice(0, 22).toUpperCase());
  const label = (x, anchor, s) => `<text x="${x}" y="${labY}" text-anchor="${anchor}" font-family="${sans}" font-size="9" font-weight="600" letter-spacing="1.8" fill="${ink}" fill-opacity="0.65">${s}</text>`;
  content += label(L, "start", "CARD HOLDER") + label(R, "end", "VALID THRU");
  content += `<text x="${L}" y="${valY}" font-family="${sans}" font-size="15" font-weight="500" letter-spacing="1.6" fill="${ink}">${name}</text>`;
  content += `<text x="${R}" y="${valY}" text-anchor="end" font-family="${mono}" font-size="15" letter-spacing="1" fill="${ink}">08/29</text>`;

  const card = `<g transform="${rot}">${shadow}${frosted}<g filter="url(#lift)">${content}</g></g>`;
  const grainAll = `<rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.035"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}${bg}${card}${grainAll}</svg>`;
}
