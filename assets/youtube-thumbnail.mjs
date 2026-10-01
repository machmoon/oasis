// Bold video thumbnail: stacked headline with a highlighted word, subject disc, sweeping arrow and sticker badge.
export const meta = {
  title: "Clickworthy Thumbnail",
  kind: "background",
  description: "A loud 1280×720 video thumbnail layout with a stacked headline, highlighted word, subject disc, arrow and sticker badge, ready for your cutout.",
  tags: ["youtube", "thumbnail", "social", "video", "headline", "creator", "bold", "sticker"],
  price: 4,
  author: "oasis-factory",
  size: [1280, 720],
};

export const params = {
  knobs: {
    bgFrom: { type: "color", label: "Background from", default: "#1B0B46" },
    bgTo: { type: "color", label: "Background to", default: "#7A1CFF" },
    highlight: { type: "color", label: "Highlight", default: "#FFE14D" },
    accent: { type: "color", label: "Subject disc", default: "#FF3D6E" },
    headline: { type: "text", label: "Headline (2-3 words)", default: "STOP DOING THIS" },
    badge: { type: "text", label: "Badge (empty hides)", default: "NEW!" },
    layout: { type: "choice", label: "Layout", default: "text left", options: ["text left", "text right"] },
    highlightStyle: { type: "choice", label: "Highlight style", default: "box", options: ["box", "color", "underline"] },
    highlightWord: { type: "range", label: "Highlighted word", default: 3, min: 1, max: 3, step: 1 },
    tilt: { type: "range", label: "Headline tilt", default: -3, min: -8, max: 8, step: 1 },
    seed: { type: "range", label: "Shape seed", default: 7, min: 1, max: 100, step: 1 },
    subject: { type: "toggle", label: "Subject placeholder", default: true },
  },
  presets: {
    Hype: { bgFrom: "#1B0B46", bgTo: "#7A1CFF", highlight: "#FFE14D", accent: "#FF3D6E" },
    Tech: { bgFrom: "#04121F", bgTo: "#0B6E8F", highlight: "#3CFFB4", accent: "#00A3FF" },
    Sunset: { bgFrom: "#B5124F", bgTo: "#FF7A3D", highlight: "#FFE66D", accent: "#2B1B5E" },
    Mono: { bgFrom: "#111111", bgTo: "#2E2E2E", highlight: "#FF2E2E", accent: "#F2F2F2" },
  },
};

const DARK = "#0D0A16";
const FONT = "Impact, Haettenschweiler, 'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif";

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f = (n) => n.toFixed(1);

function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  let o = "#";
  for (const sh of [16, 8, 0]) {
    const ca = (pa >> sh) & 255, cb = (pb >> sh) & 255;
    o += Math.round(ca + (cb - ca) * t).toString(16).padStart(2, "0");
  }
  return o;
}

function splitLines(text) {
  const words = String(text).trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (!words.length) return ["HEADLINE"];
  if (words.length <= 3) return words;
  const target = words.join(" ").length / 3;
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (cur && cur.length + w.length + 1 > target * 1.15 && lines.length < 2) { lines.push(cur); cur = w; }
    else cur = cur ? cur + " " + w : w;
  }
  lines.push(cur);
  return lines;
}

function shape(type, x, y, s, rot, col) {
  const t = `transform="translate(${f(x)},${f(y)}) rotate(${f(rot)})"`;
  const st = `fill="none" stroke="${col}" stroke-width="${f(Math.max(7, s * 0.24))}" stroke-linecap="round" stroke-linejoin="round"`;
  if (type === 0) {
    const pts = [-90, 30, 150].map((d) => `${f(Math.cos(d * Math.PI / 180) * s)},${f(Math.sin(d * Math.PI / 180) * s)}`).join(" ");
    return `<polygon ${t} points="${pts}" ${st}/>`;
  }
  if (type === 1) {
    let pts = "";
    for (let i = 0; i < 5; i++) pts += `${f(-s + i * s * 0.5)},${f(i % 2 ? s * 0.32 : -s * 0.32)} `;
    return `<polyline ${t} points="${pts.trim()}" ${st}/>`;
  }
  if (type === 2) return `<path ${t} d="M${f(-s * 0.8)},0H${f(s * 0.8)}M0,${f(-s * 0.8)}V${f(s * 0.8)}" ${st}/>`;
  if (type === 3) return `<circle ${t} r="${f(s * 0.75)}" ${st}/>`;
  if (type === 4) return `<circle ${t} r="${f(s * 0.45)}" fill="${col}"/>`;
  return `<rect ${t} x="${f(-s)}" y="${f(-s * 0.3)}" width="${f(s * 2)}" height="${f(s * 0.6)}" rx="${f(s * 0.3)}" fill="${col}"/>`;
}

export default function render(p) {
  const W = 1280, H = 720, R = p.layout === "text right";
  const fx = (x) => (R ? W - x : x);
  const rnd = rng(p.seed * 9973 + 17);
  const hl = p.highlight, ac = p.accent;
  const cx = fx(1010), cy = 360, r = 210;

  const defs = `<defs>
<linearGradient id="bg" x1="${R ? 1 : 0}" y1="0" x2="${R ? 0 : 1}" y2="1"><stop offset="0" stop-color="${p.bgFrom}"/><stop offset="1" stop-color="${p.bgTo}"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.32"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
<radialGradient id="disc" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="${mix(ac, "#FFFFFF", 0.28)}"/><stop offset="0.55" stop-color="${ac}"/><stop offset="1" stop-color="${mix(ac, "#000000", 0.28)}"/></radialGradient>
<linearGradient id="sil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(ac, DARK, 0.3)}"/><stop offset="1" stop-color="${mix(ac, DARK, 0.55)}"/></linearGradient>
<radialGradient id="vig" cx="0.5" cy="0.5" r="0.78"><stop offset="0.55" stop-color="${DARK}" stop-opacity="0"/><stop offset="1" stop-color="${DARK}" stop-opacity="0.5"/></radialGradient>
<radialGradient id="htf" gradientUnits="userSpaceOnUse" cx="${fx(160)}" cy="620" r="560"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#000000"/></radialGradient>
<pattern id="ht" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="2.6" fill="#FFFFFF"/></pattern>
<mask id="htm"><rect width="${W}" height="${H}" fill="url(#htf)"/></mask>
<clipPath id="dc"><circle cx="${f(cx)}" cy="${cy}" r="${r - 4}"/></clipPath>
<filter id="hs" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="5" dy="7" stdDeviation="0.6" flood-color="${DARK}" flood-opacity="0.55"/></filter>
</defs>`;

  let rays = "";
  const nR = 22, r0 = rnd() * 16;
  for (let i = 0; i < nR; i++) {
    const a0 = (i * 360 / nR + r0) * Math.PI / 180, a1 = a0 + Math.PI / nR;
    rays += `M${f(cx)},${cy}L${f(cx + Math.cos(a0) * 1600)},${f(cy + Math.sin(a0) * 1600)}L${f(cx + Math.cos(a1) * 1600)},${f(cy + Math.sin(a1) * 1600)}Z`;
  }

  const bg = `<rect width="${W}" height="${H}" fill="url(#bg)"/><path d="${rays}" fill="#FFFFFF" opacity="0.055"/><circle cx="${f(cx)}" cy="${cy}" r="440" fill="url(#glow)"/><rect width="${W}" height="${H}" fill="url(#ht)" mask="url(#htm)" opacity="0.14"/>`;

  const placed = [];
  let shapes = "";
  const cols = ["#FFFFFF", hl, ac];
  for (let tries = 0; tries < 300 && placed.length < 9; tries++) {
    const x = 44 + rnd() * 1200, y = 38 + rnd() * 644, s = 20 + rnd() * 20;
    if (x < 740 && y > 76 && y < 676) continue;
    if (Math.hypot(x - 1010, y - 360) < r + 36 + s + 44) continue;
    if (Math.hypot(x - 1170, y - 168) < 150) continue;
    if (x > 630 && x < 850 && y > 370) continue;
    if (placed.some((q) => Math.hypot(q[0] - x, q[1] - y) < 120)) continue;
    placed.push([x, y]);
    shapes += shape(Math.floor(rnd() * 6), fx(x), y, s, rnd() * 360, cols[Math.floor(rnd() * 3)]);
  }

  let sil = "";
  if (p.subject) {
    const hx = cx + (R ? 8 : -8), hy = cy - r * 0.16, hr = r * 0.29;
    const sh = `M${f(hx - r * 0.82)},${f(cy + r * 1.1)}C${f(hx - r * 0.82)},${f(cy + r * 0.42)} ${f(hx - r * 0.42)},${f(cy + r * 0.24)} ${f(hx)},${f(cy + r * 0.24)}C${f(hx + r * 0.42)},${f(cy + r * 0.24)} ${f(hx + r * 0.82)},${f(cy + r * 0.42)} ${f(hx + r * 0.82)},${f(cy + r * 1.1)}Z`;
    sil = `<g clip-path="url(#dc)" opacity="0.62"><path d="${sh}" fill="url(#sil)"/><rect x="${f(hx - hr * 0.42)}" y="${f(hy + hr * 0.6)}" width="${f(hr * 0.84)}" height="${f(r * 0.3)}" fill="url(#sil)"/><circle cx="${f(hx)}" cy="${f(hy)}" r="${f(hr)}" fill="url(#sil)"/></g>`;
  }

  const disc = `<circle cx="${f(cx + 14)}" cy="${cy + 18}" r="${r}" fill="${DARK}" opacity="0.35"/>
<circle cx="${f(cx)}" cy="${cy}" r="${r + 36}" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" stroke-dasharray="0.1 26" opacity="0.85"/>
<circle cx="${f(cx)}" cy="${cy}" r="${r}" fill="url(#disc)"/>${sil}
<circle cx="${f(cx)}" cy="${cy}" r="${r}" fill="none" stroke="${DARK}" stroke-width="10"/>
<path d="M${f(cx - r * 0.72)},${f(cy - r * 0.12)}A${f(r * 0.74)},${f(r * 0.74)} 0 0 1 ${f(cx - r * 0.12)},${f(cy - r * 0.72)}" fill="none" stroke="#FFFFFF" stroke-width="14" stroke-linecap="round" opacity="0.35"/>`;

  const S = [fx(700), 640], C = [fx(688), 462], E = [fx(748), 438];
  let dx = E[0] - C[0], dy = E[1] - C[1];
  const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
  const px = -dy, py = dx;
  const head = [[E[0] + dx * 46, E[1] + dy * 46], [E[0] + px * 34 - dx * 4, E[1] + py * 34 - dy * 4], [E[0] - px * 34 - dx * 4, E[1] - py * 34 - dy * 4]].map((q) => `${f(q[0])},${f(q[1])}`).join(" ");
  const ad = `M${f(S[0])},${S[1]}Q${f(C[0])},${C[1]} ${f(E[0])},${E[1]}`;
  const arrow = `<g stroke-linecap="round" stroke-linejoin="round"><path d="${ad}" fill="none" stroke="${DARK}" stroke-width="40"/><polygon points="${head}" fill="${DARK}" stroke="${DARK}" stroke-width="16"/><path d="${ad}" fill="none" stroke="${hl}" stroke-width="22"/><polygon points="${head}" fill="${hl}"/></g>`;

  const lines = splitLines(p.headline);
  const n = lines.length, CW = 0.56, BW = 600, CAP = 0.8, GAP = 0.13;
  const maxH = [300, 240, 190][n - 1];
  let sizes = lines.map((l) => Math.min(maxH, BW / (Math.max(1, l.length) * CW)));
  let total = sizes.reduce((a, s, i) => a + s * CAP + (i ? s * GAP : 0), 0);
  if (total > 540) { const k = 540 / total; sizes = sizes.map((s) => s * k); total = 540; }
  const hi = Math.min(n, Math.max(1, Math.round(p.highlightWord))) - 1;
  const style = p.highlightStyle;
  let y = 360 - total / 2, txt = "";
  lines.forEach((l, i) => {
    const s = sizes[i], w = l.length * CW * s, cap = s * CAP;
    if (i) y += s * GAP;
    y += cap;
    const x = R ? 1208 - w : 72;
    const isH = i === hi, sw = s * 0.09;
    const T = (fill, extra) => `<text x="${f(x)}" y="${f(y)}" font-family="${FONT}" font-weight="900" font-size="${f(s)}" textLength="${f(w)}" lengthAdjust="spacingAndGlyphs" fill="${fill}" ${extra}>${esc(l)}</text>`;
    if (isH && style === "box") {
      const pad = s * 0.09, bx = x - pad * 1.4, by = y - cap - pad, bw = w + pad * 2.8, bh = cap + pad * 2;
      const rot = `rotate(-2 ${f(bx + bw / 2)} ${f(by + bh / 2)})`;
      txt += `<g transform="${rot}"><rect x="${f(bx + 8)}" y="${f(by + 10)}" width="${f(bw)}" height="${f(bh)}" rx="${f(s * 0.04)}" fill="${DARK}"/><rect x="${f(bx)}" y="${f(by)}" width="${f(bw)}" height="${f(bh)}" rx="${f(s * 0.04)}" fill="${hl}" stroke="${DARK}" stroke-width="6"/></g>`;
      txt += T(DARK, "");
    } else {
      if (isH && style === "underline") {
        const ud = `M${f(x - 6)},${f(y + s * 0.13)}Q${f(x + w / 2)},${f(y + s * 0.22)} ${f(x + w + 8)},${f(y + s * 0.09)}`;
        txt += `<path d="${ud}" fill="none" stroke="${DARK}" stroke-width="${f(s * 0.17)}" stroke-linecap="round"/><path d="${ud}" fill="none" stroke="${hl}" stroke-width="${f(s * 0.11)}" stroke-linecap="round"/>`;
      }
      const fill = isH && style === "color" ? hl : "#FFFFFF";
      const strokeAttr = `stroke="${DARK}" stroke-width="${f(sw)}" stroke-linejoin="round" paint-order="stroke"`;
      txt += T(DARK, `${strokeAttr} transform="translate(${f(s * 0.03)},${f(s * 0.05)})"`);
      txt += T(fill, strokeAttr);
    }
  });
  const tcx = R ? 1208 - BW / 2 : 72 + BW / 2;
  const headline = `<g transform="rotate(${p.tilt} ${tcx} 360)">${txt}</g>`;

  let badge = "";
  const bt = String(p.badge || "").trim().toUpperCase();
  if (bt) {
    const bx = fx(1170), by = 168, br = 92, rot = R ? -12 : 12;
    const pts = [];
    for (let i = 0; i < 36; i++) {
      const a = i * Math.PI / 18 - Math.PI / 2, rr = i % 2 ? br * 0.86 : br;
      pts.push(`${f(bx + Math.cos(a) * rr)},${f(by + Math.sin(a) * rr)}`);
    }
    const fs = Math.min(52, (br * 1.42) / (bt.length * 0.58));
    const tw = Math.min(bt.length * 0.58 * fs, br * 1.42);
    badge = `<g transform="rotate(${rot} ${f(bx)} ${by})" filter="url(#hs)"><polygon points="${pts.join(" ")}" fill="${hl}" stroke="${DARK}" stroke-width="7" stroke-linejoin="round"/><circle cx="${f(bx)}" cy="${by}" r="${f(br * 0.7)}" fill="none" stroke="${DARK}" stroke-width="3" stroke-dasharray="6 7" opacity="0.45"/><text x="${f(bx - tw / 2)}" y="${f(by + fs * 0.36)}" font-family="${FONT}" font-weight="900" font-size="${f(fs)}" textLength="${f(tw)}" lengthAdjust="spacingAndGlyphs" fill="${DARK}">${esc(bt)}</text></g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}${bg}<g filter="url(#hs)">${shapes}</g>${disc}${arrow}${headline}${badge}<rect width="${W}" height="${H}" fill="url(#vig)"/></svg>`;
}
