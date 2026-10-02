// Synthwave sunset poster: striped sun, seeded mountain ranges, glowing perspective grid floor and a chrome headline.
export const meta = {
  title: "Retro Sunset",
  kind: "poster",
  description: "An 80s synthwave poster with a striped sun, neon perspective grid, mountain silhouettes and a chrome headline, for album art, event flyers and retro hero images.",
  tags: ["synthwave", "retrowave", "80s", "outrun", "sunset", "neon", "grid", "chrome"],
  price: 6,
  author: "oasis-factory",
  size: [720, 960],
};

export const params = {
  knobs: {
    sky: { type: "color", role: "background", label: "Night sky", default: "#1B0B3A" },
    sunTop: { type: "color", role: "highlight", label: "Sun top", default: "#FFD23F" },
    sunBottom: { type: "color", role: "primary", label: "Sun bottom", default: "#FF2D95" },
    grid: { type: "color", role: "secondary", label: "Grid neon", default: "#FF4FD8" },
    headline: { type: "text", label: "Headline", default: "Midnight" },
    tagline: { type: "text", label: "Tagline", default: "Outrun the city lights" },
    titleStyle: { type: "choice", label: "Headline style", default: "chrome", options: ["chrome", "neon", "sunset"] },
    stripes: { type: "range", label: "Sun stripes", default: 7, min: 0, max: 14, step: 1 },
    density: { type: "range", label: "Grid density", default: 12, min: 6, max: 24, step: 1 },
    seed: { type: "range", label: "Mountains seed", default: 23, min: 1, max: 200, step: 1 },
  },
  presets: {
    Outrun: { sky: "#1B0B3A", sunTop: "#FFD23F", sunBottom: "#FF2D95", grid: "#FF4FD8" },
    Miami: { sky: "#0B2340", sunTop: "#FFE38A", sunBottom: "#FF5E8A", grid: "#3BE8FF" },
    Vapor: { sky: "#24124F", sunTop: "#FFF4C2", sunBottom: "#8C7BFF", grid: "#7DF9E0" },
    "Blood Moon": { sky: "#14030B", sunTop: "#FFAA3B", sunBottom: "#E0102F", grid: "#FF5A36" },
  },
};

const W = 720, H = 960, HZ = 596, CX = 360, FH = H - HZ;
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MAXW = 600;

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
const mix = (a, b, t) => {
  const A = hx(a), B = hx(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f = (n) => n.toFixed(1);

function ridge(r, N) {
  const a = new Array(N + 1).fill(0);
  a[0] = r(); a[N] = r();
  let step = N, amp = 0.75;
  while (step > 1) {
    const h = step / 2;
    for (let i = h; i < N; i += step) a[i] = (a[i - h] + a[i + h]) / 2 + (r() - 0.5) * amp;
    step = h; amp *= 0.56;
  }
  const mn = Math.min(...a), mx = Math.max(...a);
  return a.map((v) => (v - mn) / ((mx - mn) || 1));
}

function mountains(r, hmax, pow, low) {
  const N = 32, a = ridge(r, N);
  const pts = a.map((v, i) => {
    const u = Math.abs((i / N) * 2 - 1);
    const e = low + (1 - low) * Math.pow(u, pow);
    return [(i / N) * W, HZ - hmax * e * (0.3 + 0.7 * v)];
  });
  const line = pts.map((q, i) => `${i ? "L" : "M"}${f(q[0])},${f(q[1])}`).join(" ");
  return { fill: `M0,${HZ + 2} L${line.slice(1)} L${W},${HZ + 2}Z`, rim: line };
}

export default function render(p) {
  const { sky, sunTop, sunBottom: sun2, grid } = p;
  const r = rng(p.seed * 9301 + 49297);
  const deep = mix(sky, "#000000", 0.6);
  const floorDark = mix(sky, "#000000", 0.55);
  const R = 200, cy = HZ - R * 0.38;

  let stripes = "";
  const n = Math.round(p.stripes);
  if (n > 0) {
    const y0 = cy - R * 0.45, band = (HZ - y0) / n;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, h = band * (0.12 + 0.55 * t);
      stripes += `<rect x="${CX - R - 4}" y="${f(y0 + band * i + (band - h) / 2)}" width="${2 * R + 8}" height="${f(h)}" fill="#000"/>`;
    }
  }

  const sr = rng(p.seed * 31 + 7);
  let stars = "";
  for (let i = 0; i < 90; i++) {
    const x = sr() * W, y = sr() * HZ * 0.66, s = 0.5 + sr() * sr() * 1.6;
    const op = (0.2 + 0.8 * (1 - y / (HZ * 0.66))) * (0.5 + sr() * 0.5);
    stars += `<circle cx="${f(x)}" cy="${f(y)}" r="${s.toFixed(2)}" fill="#FFFFFF" opacity="${op.toFixed(2)}"/>`;
  }
  for (let i = 0; i < 4; i++) {
    const x = 40 + sr() * (W - 80), y = 20 + sr() * 110, s = 4 + sr() * 4;
    stars += `<path d="M${f(x)},${f(y - s)}L${f(x + s * 0.18)},${f(y - s * 0.18)}L${f(x + s)},${f(y)}L${f(x + s * 0.18)},${f(y + s * 0.18)}L${f(x)},${f(y + s)}L${f(x - s * 0.18)},${f(y + s * 0.18)}L${f(x - s)},${f(y)}L${f(x - s * 0.18)},${f(y - s * 0.18)}Z" fill="#FFFFFF" opacity=".75"/>`;
  }

  const back = mountains(r, 175, 1.25, 0.1);
  const front = mountains(r, 118, 1.8, 0.03);

  const d = Math.round(p.density), S = (W * 1.8) / d, dZ = S / 150;
  let gd = "";
  const K = d * 4;
  for (let k = -K; k <= K; k++) {
    const dx = k * S, t = Math.min(1, (W / 2) / (Math.abs(dx) || 1));
    gd += `M${CX},${HZ}L${f(CX + dx * t)},${f(HZ + FH * t)}`;
  }
  for (let z = 1 + dZ * 0.35; FH / z > 5 && (FH * dZ) / (z * z) > 3; z += dZ) {
    gd += `M0,${f(HZ + FH / z)}H${W}`;
  }

  const title = String(p.headline || "").toUpperCase();
  const len = title.length;
  const fs = Math.max(44, Math.min(150, MAXW / Math.max(1, len * 0.74)));
  const est = len * fs * 0.74, tw = Math.min(est, MAXW);
  const fit = est > MAXW ? ` textLength="${MAXW}" lengthAdjust="spacingAndGlyphs"` : "";
  const ty = 212, gx = CX - fs * 0.07;
  const T = (a) => `<text x="0" y="0" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="${f(fs)}" letter-spacing="${f(fs * 0.02)}"${fit} ${a}>${esc(title)}</text>`;
  let head = "";
  if (p.titleStyle === "neon") {
    head = T(`fill="none" stroke="${grid}" stroke-width="${f(fs * 0.07)}" filter="url(#glow)" opacity=".85"`) +
      T(`fill="none" stroke="${grid}" stroke-width="${f(fs * 0.035)}" stroke-linejoin="round"`) +
      T(`fill="none" stroke="${mix(grid, "#FFFFFF", 0.75)}" stroke-width="${f(fs * 0.012)}" stroke-linejoin="round"`);
  } else if (p.titleStyle === "sunset") {
    for (let i = 3; i >= 1; i--) head += T(`fill="none" stroke="${sun2}" stroke-width="2" opacity="${(1 - i * 0.22).toFixed(2)}" transform="translate(${f(i * fs * 0.035)},${f(i * fs * 0.035)})"`);
    head += T(`fill="none" stroke="${deep}" stroke-width="${f(fs * 0.07)}" stroke-linejoin="round"`) + T(`fill="url(#sunTxt)"`);
  } else {
    head = T(`fill="${deep}" transform="translate(${f(fs * 0.05)},${f(fs * 0.06)})"`) +
      T(`fill="none" stroke="${deep}" stroke-width="${f(fs * 0.1)}" stroke-linejoin="round"`) +
      T(`fill="none" stroke="${sun2}" stroke-width="${f(fs * 0.045)}" stroke-linejoin="round"`) +
      T(`fill="url(#chrome)"`) +
      T(`fill="none" stroke="#FFFFFF" stroke-opacity=".75" stroke-width="1.2"`);
  }
  let sparkle = "";
  if (p.titleStyle === "chrome" && len > 0) {
    const sx = Math.min(W - 28, gx + tw / 2 + fs * 0.08), sy = ty - fs * 0.72, s = fs * 0.2;
    sparkle = `<g transform="translate(${f(sx)},${f(sy)})" fill="#FFFFFF"><path d="M0,${f(-s)}Q0,0 ${f(s)},0Q0,0 0,${f(s)}Q0,0 ${f(-s)},0Q0,0 0,${f(-s)}Z"/><circle r="${f(s * 0.14)}"/></g>`;
  }

  const tag = String(p.tagline || "").toUpperCase();
  let tagSvg = "";
  if (tag) {
    const ty2 = ty + 56, est2 = tag.length * 19 * 0.6 + tag.length * 8, tw2 = Math.min(MAXW, est2);
    const fit2 = est2 > MAXW ? ` textLength="${MAXW}" lengthAdjust="spacingAndGlyphs"` : "";
    const rx = tw2 / 2 + 18;
    tagSvg = `<text x="${CX + 4}" y="${ty2}" text-anchor="middle" font-family="${FONT}" font-weight="600" font-size="19" letter-spacing="8" fill="${sunTop}"${fit2}>${esc(tag)}</text>` +
      (rx + 36 < W / 2 - 20 ? `<path d="M${f(CX - rx - 36)},${ty2 - 6}h36M${f(CX + rx)},${ty2 - 6}h36" stroke="${sun2}" stroke-width="2" stroke-linecap="round"/>` : "");
  }

  const defs = `<defs>
<linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(sky, "#000000", 0.35)}"/><stop offset=".55" stop-color="${sky}"/><stop offset="1" stop-color="${mix(sky, sun2, 0.55)}"/></linearGradient>
<linearGradient id="sunG" gradientUnits="userSpaceOnUse" x1="0" y1="${cy - R}" x2="0" y2="${HZ}"><stop offset="0" stop-color="${sunTop}"/><stop offset=".45" stop-color="${mix(sunTop, sun2, 0.5)}"/><stop offset="1" stop-color="${sun2}"/></linearGradient>
<linearGradient id="sunTxt" x1="0" y1="0" x2="0" y2="1"><stop offset=".1" stop-color="${sunTop}"/><stop offset="1" stop-color="${sun2}"/></linearGradient>
<linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7FCFF"/><stop offset=".44" stop-color="#9ED6F7"/><stop offset=".5" stop-color="${mix(sky, "#000000", 0.25)}"/><stop offset=".56" stop-color="${mix(sky, sun2, 0.35)}"/><stop offset=".82" stop-color="${mix(sun2, "#FFFFFF", 0.45)}"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient>
<linearGradient id="mtnB" gradientUnits="userSpaceOnUse" x1="0" y1="${HZ - 175}" x2="0" y2="${HZ}"><stop offset="0" stop-color="${mix(mix(sky, sun2, 0.45), "#000000", 0.2)}"/><stop offset="1" stop-color="${mix(sky, "#000000", 0.35)}"/></linearGradient>
<linearGradient id="mtnF" gradientUnits="userSpaceOnUse" x1="0" y1="${HZ - 118}" x2="0" y2="${HZ}"><stop offset="0" stop-color="${mix(mix(sky, sun2, 0.18), "#000000", 0.4)}"/><stop offset="1" stop-color="${mix(sky, "#000000", 0.72)}"/></linearGradient>
<linearGradient id="floorG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(sky, sun2, 0.35)}"/><stop offset=".22" stop-color="${floorDark}"/><stop offset="1" stop-color="${mix(floorDark, "#000000", 0.4)}"/></linearGradient>
<linearGradient id="fadeG" gradientUnits="userSpaceOnUse" x1="0" y1="${HZ}" x2="0" y2="${HZ + 170}"><stop offset="0" stop-color="#000"/><stop offset=".15" stop-color="#555"/><stop offset="1" stop-color="#FFF"/></linearGradient>
<mask id="fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect y="${HZ}" width="${W}" height="${FH}" fill="url(#fadeG)"/></mask>
<mask id="stripes" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#FFF"/>${stripes}</mask>
<clipPath id="above"><rect width="${W}" height="${HZ}"/></clipPath>
<clipPath id="below"><rect y="${HZ}" width="${W}" height="${FH}"/></clipPath>
<filter id="bigblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="34"/></filter>
<filter id="glow" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="3.5"/></filter>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${p.seed}" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.09 0"/></filter>
</defs>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}
<rect width="${W}" height="${HZ}" fill="url(#skyG)"/>
${stars}
<circle cx="${CX}" cy="${f(cy)}" r="${R * 1.3}" fill="${sun2}" opacity=".5" filter="url(#bigblur)"/>
<g clip-path="url(#above)"><circle cx="${CX}" cy="${f(cy)}" r="${R}" fill="url(#sunG)" mask="url(#stripes)"/></g>
<path d="${back.fill}" fill="url(#mtnB)"/>
<path d="${back.rim}" fill="none" stroke="${sun2}" stroke-width="1.5" stroke-linejoin="round" opacity=".55"/>
<path d="${front.fill}" fill="url(#mtnF)"/>
<path d="${front.rim}" fill="none" stroke="${mix(sun2, "#FFFFFF", 0.3)}" stroke-width="1.5" stroke-linejoin="round" opacity=".8"/>
<rect y="${HZ}" width="${W}" height="${FH}" fill="url(#floorG)"/>
<g clip-path="url(#below)"><ellipse cx="${CX}" cy="${HZ + 70}" rx="${R * 0.6}" ry="110" fill="${sunTop}" opacity=".16" filter="url(#bigblur)"/></g>
<ellipse cx="${CX}" cy="${HZ}" rx="${W * 0.62}" ry="34" fill="${sun2}" opacity=".55" filter="url(#bigblur)"/>
<g clip-path="url(#below)" mask="url(#fade)" fill="none" stroke="${grid}" stroke-linecap="round">
<path d="${gd}" stroke-width="6" opacity=".7" filter="url(#soft)"/>
<path d="${gd}" stroke-width="1.8"/>
<path d="${gd}" stroke="${mix(grid, "#FFFFFF", 0.6)}" stroke-width=".6" opacity=".7"/>
</g>
<rect y="${HZ - 1}" width="${W}" height="2" fill="${mix(sunTop, "#FFFFFF", 0.5)}"/>
<rect y="${HZ - 3}" width="${W}" height="6" fill="${sun2}" opacity=".5" filter="url(#soft)"/>
<g transform="translate(${f(gx)},${ty}) skewX(-12)">${head}</g>
${sparkle}
${tagSvg}
<rect width="${W}" height="${H}" filter="url(#grain)"/>
</svg>`;
}
