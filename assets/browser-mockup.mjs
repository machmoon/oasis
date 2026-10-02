// Desktop browser mockup: macOS-style chrome (light/dark, tabs, URL bar) framing a tunable landing-page wireframe.
export const meta = {
  title: "Launch Window",
  kind: "mockup",
  description: "A desktop browser window with a generated landing-page wireframe, for pitch decks, case studies and early concept presentations.",
  tags: ["mockup", "browser", "wireframe", "landing page", "website", "desktop", "presentation", "ui"],
  price: 6,
  author: "oasis-factory",
  size: [1600, 1080],
};

export const params = {
  knobs: {
    accent: { type: "color", role: "primary", label: "Accent", default: "#5B5BF7" },
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#E8E6F0" },
    chrome: { type: "choice", label: "Chrome", default: "light", options: ["light", "dark"] },
    layout: { type: "choice", label: "Hero layout", default: "image right", options: ["image right", "image left"] },
    fidelity: { type: "choice", label: "Fidelity", default: "hi-fi", options: ["hi-fi", "lo-fi"] },
    url: { type: "text", label: "URL", default: "oasis.design/launch" },
    headline: { type: "text", label: "Headline", default: "Ship beautiful products, faster." },
    roundness: { type: "range", label: "Roundness", default: 12, min: 0, max: 24, step: 1 },
    inset: { type: "range", label: "Frame margin", default: 88, min: 32, max: 160, step: 4 },
    tabs: { type: "toggle", label: "Tab bar", default: true },
  },
  presets: {
    Indigo: { accent: "#5B5BF7", backdrop: "#E8E6F0" },
    Tangerine: { accent: "#FF6A3D", backdrop: "#F4ECE4" },
    Mint: { accent: "#12A579", backdrop: "#E2EEE8" },
    Midnight: { accent: "#8B7CFF", backdrop: "#15151D" },
  },
};

const F = "-apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f = (n) => +n.toFixed(1);
const hx = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const lum = (h) => { const [r, g, b] = hx(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const txt = (x, y, size, fill, s, extra = "") => `<text x="${f(x)}" y="${f(y)}" font-family="${F}" font-size="${size}" fill="${fill}"${extra}>${s}</text>`;
const bar = (x, y, w, h, fill) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${h}" rx="${h / 2}" fill="${fill}"/>`;

function wrap(t, max) {
  const lines = []; let cur = "";
  for (const w of t.split(/\s+/).filter(Boolean)) {
    if (cur && (cur + " " + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? cur + " " + w : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

export default function render(p) {
  const W = 1600, H = 1080, A = p.accent, rd = p.roundness;
  const hi = p.fidelity === "hi-fi", dark = p.chrome === "dark", right = p.layout === "image right";
  const T = dark
    ? { strip: "#1B1C20", bar: "#27282D", field: "#36373D", fieldText: "#D2D3D9", icon: "#8E8F98", hair: "#34353B", page: "#111216", ink: "#F3F3F6", sub: "#9A9BA5", skel: "#1D1F25", skel2: "#2A2C34", skel3: "#3B3E48" }
    : { strip: "#E3E3E8", bar: "#F6F6F8", field: "#E7E7EC", fieldText: "#34343C", icon: "#8A8A94", hair: "#DADAE0", page: "#FFFFFF", ink: "#15151C", sub: "#6B6B76", skel: "#EFEFF3", skel2: "#E1E1E8", skel3: "#CACAD4" };
  if (hi) { T.skel = mix(T.skel, A, 0.05); T.skel2 = mix(T.skel2, A, 0.06); T.skel3 = mix(T.skel3, A, 0.08); }

  const m = p.inset, x = m, y = m, w = W - 2 * m, h = H - 2 * m, R = 3 + rd * 0.6;
  const stripH = p.tabs ? 44 : 0, barH = p.tabs ? 52 : 56, ch = stripH + barH;

  let raw = String(p.url || "").trim().replace(/^https?:\/\//i, "") || "example.com";
  if (raw.length > 52) raw = raw.slice(0, 51) + "…";
  const dom = raw.split("/")[0], rest = raw.slice(dom.length);
  let bw = dom.replace(/^www\./i, "").split(".")[0].replace(/[^A-Za-z0-9-]/g, "").slice(0, 14) || "brand";
  const brand = esc(bw.charAt(0).toUpperCase() + bw.slice(1));

  const st = `fill="none" stroke="${T.icon}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"`;
  let c = "";
  if (p.tabs) {
    c += `<rect x="${x}" y="${y}" width="${w}" height="${stripH}" fill="${T.strip}"/>`;
    const tx = x + 88, tw = Math.min(250, w * 0.2), ty = y + 8, tb = y + 44;
    c += `<path d="M${tx - 10} ${tb}Q${tx} ${tb} ${tx} ${tb - 10}V${ty + 9}Q${tx} ${ty} ${tx + 9} ${ty}H${f(tx + tw - 9)}Q${f(tx + tw)} ${ty} ${f(tx + tw)} ${ty + 9}V${tb - 10}Q${f(tx + tw)} ${tb} ${f(tx + tw + 10)} ${tb}Z" fill="${T.bar}"/>`;
    c += `<rect x="${tx + 14}" y="${ty + 11}" width="14" height="14" rx="4" fill="${A}"/>`;
    c += txt(tx + 36, ty + 22.5, 12.5, T.fieldText, `${brand} — Home`);
    const cx = tx + tw - 20, cy = ty + 18, px = tx + tw + 28;
    c += `<path d="M${f(cx - 4)} ${cy - 4}l8 8m0-8l-8 8" stroke="${T.icon}" stroke-width="1.4" stroke-linecap="round"/>`;
    c += `<path d="M${f(px - 6)} ${cy}h12M${f(px)} ${cy - 6}v12" ${st}/>`;
  }
  c += `<rect x="${x}" y="${y + stripH}" width="${w}" height="${barH}" fill="${T.bar}"/>`;
  const ly = p.tabs ? y + 22 : y + barH / 2;
  [["#FF5F57", "#E0443E"], ["#FEBC2E", "#DEA123"], ["#28C840", "#1AAB29"]].forEach(([fc, sc], i) => {
    c += `<circle cx="${x + 22 + i * 20}" cy="${ly}" r="6" fill="${fc}" stroke="${sc}" stroke-width=".6"/>`;
  });
  const cy = y + stripH + barH / 2, lx = p.tabs ? x + 18 : x + 96, rcx = lx + 66;
  c += `<path d="M${lx + 11} ${cy - 6}l-6 6 6 6" ${st}/><path d="M${lx + 33} ${cy - 6}l6 6-6 6" ${st} opacity=".4"/>`;
  c += `<path d="M${rcx + 6} ${cy}a6 6 0 1 1-1.76-4.24" ${st}/><path d="M${rcx + 5} ${cy - 8.5}v4.5h-4.5" ${st}/>`;
  const fw = Math.min(640, w * 0.44), fx = x + (w - fw) / 2, est = raw.length * 7.1, mid = x + w / 2 + 8, lk = mid - est / 2 - 18;
  c += `<rect x="${f(fx)}" y="${cy - 17}" width="${f(fw)}" height="34" rx="${f(Math.min(17, 4 + rd * 0.55))}" fill="${T.field}"/>`;
  c += `<rect x="${f(lk)}" y="${cy - 2.5}" width="9" height="7" rx="1.5" fill="${T.icon}"/><path d="M${f(lk + 2)} ${cy - 2.5}v-2a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="${T.icon}" stroke-width="1.4"/>`;
  c += `<text x="${f(mid)}" y="${cy + 4.7}" font-family="${F}" font-size="13.5" text-anchor="middle"><tspan fill="${T.fieldText}">${esc(dom)}</tspan><tspan fill="${T.icon}">${esc(rest)}</tspan></text>`;
  const sx = x + w - 72;
  c += `<path d="M${sx - 5} ${cy - 2}v8h10v-8M${sx} ${cy - 8}v9M${sx - 3.5} ${cy - 4.5}l3.5-3.5 3.5 3.5" ${st}/>`;
  [-6, 0, 6].forEach((d) => { c += `<circle cx="${x + w - 32 + d}" cy="${cy}" r="1.6" fill="${T.icon}"/>`; });
  c += `<rect x="${x}" y="${y + ch - 1}" width="${w}" height="1" fill="${T.hair}"/>`;

  const ph = h - ch, s = Math.min(w / 1408, ph / 828), WL = w / s, HL = ph / s, c0 = (WL - 1280) / 2;
  let L = "";
  L += `<rect x="${f(c0)}" y="25" width="26" height="26" rx="${f(Math.min(8, rd * 0.5))}" fill="${hi ? A : T.ink}"/><circle cx="${f(c0 + 13)}" cy="38" r="5" fill="${T.page}"/>`;
  L += txt(c0 + 38, 45, 19, T.ink, brand, ` font-weight="700" letter-spacing="-0.4"`);
  if (hi) {
    const links = ["Product", "Pricing", "Customers", "Docs"], ws = links.map((l) => l.length * 8.2);
    let lx2 = WL / 2 - (ws.reduce((a, b) => a + b, 0) + 36 * 3) / 2;
    links.forEach((l, i) => { L += txt(lx2, 43, 15, T.sub, l); lx2 += ws[i] + 36; });
    L += txt(c0 + 1144, 43, 15, T.sub, "Log in", ` text-anchor="end"`);
  } else {
    const ws = [56, 64, 72, 44];
    let lx2 = WL / 2 - (236 + 108) / 2;
    ws.forEach((bw2) => { L += bar(lx2, 33, bw2, 10, T.skel3); lx2 += bw2 + 36; });
    L += bar(c0 + 1092, 33, 52, 10, T.skel3);
  }
  L += `<rect x="${f(c0 + 1164)}" y="18" width="116" height="40" rx="${Math.min(20, rd)}" fill="${T.ink}"/>`;
  L += txt(c0 + 1222, 43, 14, T.page, "Sign up", ` font-weight="600" text-anchor="middle"`);
  L += `<rect x="0" y="76" width="${f(WL)}" height="1" fill="${T.skel}"/>`;

  const featTop = HL - 214, hl = String(p.headline || "").trim() || "Your headline here";
  let sz = 36, lines = [];
  for (const z of [62, 54, 48, 42, 36]) { sz = z; lines = wrap(hl, Math.floor(560 / (z * 0.53))); if (lines.length <= 3) break; }
  if (lines.length > 3) { lines = lines.slice(0, 3); lines[2] += "…"; }
  const lh = sz * 1.06, total = 30 + 26 + lines.length * lh + 22 + 60 + 36 + 52;
  const ty = Math.max(96, 76 + (featTop - 100 - total) / 2);
  const textX = right ? c0 : c0 + 720, imgX = right ? c0 + 680 : c0, imgY = 116, imgW = 600, imgH = featTop - 52 - 116;

  const label = "New · Version 2.0", pillW = 44 + label.length * 7.3;
  L += `<rect x="${f(textX)}" y="${f(ty)}" width="${f(pillW)}" height="30" rx="${Math.min(15, rd)}" fill="${hi ? mix(A, T.page, 0.88) : T.skel}"/>`;
  L += `<circle cx="${f(textX + 17)}" cy="${f(ty + 15)}" r="3.5" fill="${hi ? A : T.skel3}"/>`;
  L += txt(textX + 29, ty + 19.6, 13, hi ? A : T.sub, label, ` font-weight="600"`);
  lines.forEach((ln, i) => {
    L += txt(textX - sz * 0.04, ty + 56 + sz * 0.78 + i * lh, sz, T.ink, esc(ln), ` font-weight="700" letter-spacing="${f(-sz * 0.025)}"`);
  });
  const hb = ty + 56 + lines.length * lh;
  [520, 470, 330].forEach((bw2, k) => { L += bar(textX, hb + 22 + k * 24, bw2, 12, T.skel2); });
  const by = hb + 118, brx = Math.min(26, rd), onA = lum(A) > 0.62 ? "#111111" : "#FFFFFF";
  L += `<rect x="${f(textX)}" y="${f(by)}" width="172" height="52" rx="${brx}" fill="${A}"/>`;
  L += txt(textX + 86, by + 31.5, 16, onA, "Get started  →", ` font-weight="600" text-anchor="middle"`);
  L += `<rect x="${f(textX + 188.75)}" y="${f(by + 0.75)}" width="154.5" height="50.5" rx="${brx}" fill="none" stroke="${T.skel3}" stroke-width="1.5"/>`;
  L += txt(textX + 266, by + 31.5, 16, T.ink, "Learn more", ` font-weight="600" text-anchor="middle"`);

  const ir = rd, X = (t) => f(imgX + imgW * t), Y = (t) => f(imgY + imgH * t);
  if (hi) {
    const sr = imgH * 0.085, sunC = dark ? mix(A, "#FFFFFF", 0.72) : "#FFFFFF";
    L += `<g clip-path="url(#img)"><rect x="${f(imgX)}" y="${imgY}" width="${imgW}" height="${f(imgH)}" fill="url(#ig)"/>`;
    L += `<circle cx="${X(0.52)}" cy="${Y(0.26)}" r="${f(sr * 1.75)}" fill="${sunC}" opacity="${dark ? 0.1 : 0.3}"/>`;
    L += `<circle cx="${X(0.52)}" cy="${Y(0.26)}" r="${f(sr)}" fill="${sunC}" opacity=".95"/>`;
    L += `<polygon points="${X(0)},${Y(0.78)} ${X(0.3)},${Y(0.48)} ${X(0.52)},${Y(0.7)} ${X(0.72)},${Y(0.42)} ${X(1)},${Y(0.72)} ${X(1)},${Y(1)} ${X(0)},${Y(1)}" fill="${mix(A, T.page, 0.45)}"/>`;
    L += `<polygon points="${X(0)},${Y(0.92)} ${X(0.22)},${Y(0.66)} ${X(0.46)},${Y(0.9)} ${X(0.62)},${Y(0.74)} ${X(1)},${Y(0.98)} ${X(1)},${Y(1)} ${X(0)},${Y(1)}" fill="${A}"/></g>`;
    const cx2 = right ? imgX - 48 : imgX + imgW - 188, cy2 = imgY + imgH - 116;
    L += `<rect x="${f(cx2)}" y="${f(cy2)}" width="236" height="76" rx="${Math.min(14, rd)}" fill="${dark ? "#1A1B21" : T.page}" filter="url(#cs)"${dark ? ` stroke="${T.skel3}" stroke-width="1"` : ""}/>`;
    L += `<circle cx="${f(cx2 + 36)}" cy="${f(cy2 + 38)}" r="16" fill="${mix(A, T.page, 0.8)}"/><path d="M${f(cx2 + 29)} ${f(cy2 + 40)}l5 5 9-11" fill="none" stroke="${A}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    L += bar(cx2 + 64, cy2 + 26, 96, 10, T.skel3) + bar(cx2 + 64, cy2 + 44, 64, 8, T.skel2);
    L += txt(cx2 + 216, cy2 + 43, 15, A, "+24%", ` font-weight="700" text-anchor="end"`);
  } else {
    L += `<rect x="${f(imgX + 1)}" y="${imgY + 1}" width="${imgW - 2}" height="${f(imgH - 2)}" rx="${ir}" fill="${T.skel}" stroke="${T.skel3}" stroke-width="2" stroke-dasharray="8 8"/>`;
    L += `<path d="M${X(0)} ${Y(0)}L${X(1)} ${Y(1)}M${X(1)} ${Y(0)}L${X(0)} ${Y(1)}" stroke="${T.skel2}" stroke-width="1.5" clip-path="url(#img)"/>`;
    const mx = imgX + imgW / 2, my = imgY + imgH / 2;
    L += `<rect x="${f(mx - 40)}" y="${f(my - 30)}" width="80" height="60" rx="${Math.min(10, rd)}" fill="${T.page}"/>`;
    L += `<circle cx="${f(mx + 12)}" cy="${f(my - 10)}" r="6" fill="${T.skel3}"/><path d="M${f(mx - 24)} ${f(my + 18)}l16-20 10 12 6-6 16 14z" fill="${T.skel3}"/>`;
  }

  L += `<rect x="${f(c0)}" y="${f(featTop)}" width="1280" height="1" fill="${T.skel}"/>`;
  const titles = ["Lightning fast", "Built to scale", "Secure by default"], bodies = [[300, 240], [320, 210], [280, 250]];
  for (let i = 0; i < 3; i++) {
    const fx2 = c0 + i * 448, fy = featTop + 40, gx = fx2 + 22, gy = fy + 22, gc = hi ? A : T.skel3;
    L += `<rect x="${f(fx2)}" y="${f(fy)}" width="44" height="44" rx="${f(Math.min(12, rd * 0.5))}" fill="${hi ? mix(A, T.page, 0.86) : T.skel}"/>`;
    if (i === 0) L += `<circle cx="${f(gx)}" cy="${f(gy)}" r="8" fill="none" stroke="${gc}" stroke-width="3"/>`;
    else if (i === 1) L += `<polygon points="${f(gx + 2)},${f(gy - 11)} ${f(gx - 7)},${f(gy + 2)} ${f(gx)},${f(gy + 2)} ${f(gx - 2)},${f(gy + 11)} ${f(gx + 7)},${f(gy - 2)} ${f(gx)},${f(gy - 2)}" fill="${gc}"/>`;
    else L += `<rect x="${f(gx - 9)}" y="${f(gy - 9)}" width="12" height="12" rx="2.5" fill="${gc}" opacity=".45"/><rect x="${f(gx - 3)}" y="${f(gy - 3)}" width="12" height="12" rx="2.5" fill="${gc}"/>`;
    if (hi) L += txt(fx2, featTop + 116, 19, T.ink, titles[i], ` font-weight="700" letter-spacing="-0.3"`);
    else L += bar(fx2, featTop + 102, [150, 170, 140][i], 14, T.skel3);
    L += bar(fx2, featTop + 134, bodies[i][0], 10, T.skel2) + bar(fx2, featTop + 154, bodies[i][1], 10, T.skel2);
  }

  const dk = lum(p.backdrop) < 0.35;
  const defs = `<defs>
<radialGradient id="glow"><stop offset="0" stop-color="${A}" stop-opacity="${dk ? 0.3 : 0.22}"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient>
<linearGradient id="ig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(A, T.page, dark ? 0.84 : 0.8)}"/><stop offset="1" stop-color="${mix(A, T.page, 0.6)}"/></linearGradient>
<filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur stdDeviation="38"/></filter>
<filter id="sh2" x="-5%" y="-5%" width="110%" height="115%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="cs" x="-30%" y="-40%" width="160%" height="200%"><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#0A0A1A" flood-opacity="${dark ? 0.55 : 0.14}"/></filter>
<clipPath id="win"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${f(R)}"/></clipPath>
<clipPath id="img"><rect x="${f(imgX)}" y="${imgY}" width="${imgW}" height="${f(imgH)}" rx="${ir}"/></clipPath>
</defs>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}
<rect width="${W}" height="${H}" fill="${p.backdrop}"/>
<circle cx="260" cy="180" r="760" fill="url(#glow)"/><circle cx="1420" cy="1000" r="620" fill="url(#glow)" opacity=".6"/>
<rect x="${x + w * 0.04}" y="${y + 36}" width="${w * 0.92}" height="${h}" rx="${f(R)}" fill="#07070F" opacity="${dk ? 0.6 : 0.2}" filter="url(#sh)"/>
<rect x="${x}" y="${y + 4}" width="${w}" height="${h}" rx="${f(R)}" fill="#07070F" opacity="${dk ? 0.5 : 0.1}" filter="url(#sh2)"/>
<g clip-path="url(#win)"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${T.page}"/>${c}
<g transform="translate(${x} ${y + ch}) scale(${s.toFixed(4)})">${L}</g></g>
<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${f(R)}" fill="none" stroke="${dark ? "#FFFFFF" : "#000000"}" stroke-opacity="0.1"/>
</svg>`;
}
