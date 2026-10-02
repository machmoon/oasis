// Sign-in screen: split-art or centered-card layout with email and password fields, social auth, error and remember-me states.
export const meta = {
  title: "Quiet Sign-In",
  kind: "ui",
  description: "A polished desktop sign-in screen with social auth, field states and a generative dune landscape, for product mockups, pitch decks and auth flow specs.",
  tags: ["login", "sign in", "auth", "form", "ui kit", "web app", "onboarding", "landing"],
  price: 0,
  author: "oasis-factory",
  size: [1200, 800],
};

export const params = {
  knobs: {
    brand: { type: "color", role: "primary", label: "Brand", default: "#5746E8" },
    accent: { type: "color", role: "secondary", label: "Art accent", default: "#FF9E7A" },
    layout: { type: "choice", label: "Layout", default: "split", options: ["split", "card"] },
    theme: { type: "choice", label: "Theme", default: "light", options: ["light", "dark"] },
    social: { type: "choice", label: "Social buttons", default: "row", options: ["row", "stacked", "none"] },
    radius: { type: "range", label: "Corner radius", default: 10, min: 0, max: 20, step: 1 },
    seed: { type: "range", label: "Art seed", default: 7, min: 1, max: 100, step: 1 },
    error: { type: "toggle", label: "Error state", default: false },
    remember: { type: "toggle", label: "Remember me checked", default: true },
    title: { type: "text", label: "Headline", default: "Welcome back" },
  },
  presets: {
    Forest: { brand: "#1F7A55", accent: "#E9C46A" },
    Ember: { brand: "#D9482B", accent: "#FFC857" },
    Lagoon: { brand: "#0B84C6", accent: "#7CE0C3" },
    Citrus: { brand: "#F2C230", accent: "#FF6B3D" },
  },
};

const THEMES = {
  light: { bg: "#F4F3EF", surface: "#FFFFFF", ink: "#17171C", muted: "#62626D", line: "#E4E2DC", field: "#FFFFFF", fieldLine: "#D3D1CB", err: "#C8292F", errBg: "#FDEDEC", errLine: "#F3C4C2", tint: 0.1 },
  dark: { bg: "#0D0E12", surface: "#16171C", ink: "#F3F3F6", muted: "#B3B3BF", line: "#363742", field: "#1E1F26", fieldLine: "#474855", err: "#FF7A7D", errBg: "#2E1719", errLine: "#5E2A2E", tint: 0.42 },
};
const F = "-apple-system, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
function lum(hex) { const c = rgb(hex).map(lin); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function toLab(hex) {
  const [r, g, b] = rgb(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function fromLab([L, a, b]) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3), m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3), s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  const c = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return "#" + c.map((v) => {
    v = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  }).join("");
}
function mix(a, b, t, dL = 0) { const x = toLab(a), y = toLab(b); return fromLab([x[0] + (y[0] - x[0]) * t + dL, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); }
function isWarmRed(hex) {
  const [r, g, b] = rgb(hex).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 0.2) return false;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return h < 32 || h > 335;
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const t = (x, y, size, fill, str, wt = 400, anchor = "start", ls = 0) =>
  `<text x="${x}" y="${y}" font-family="${F}" font-size="${size}" font-weight="${wt}" fill="${fill}" text-anchor="${anchor}"${ls ? ` letter-spacing="${ls}"` : ""}>${str}</text>`;

function logo(x, y, s, C, r) {
  return `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${Math.min(r, s * 0.3)}" fill="${C.brand}"/>` +
    `<circle cx="${x + s * 0.5}" cy="${y + s * 0.4}" r="${s * 0.14}" fill="${C.onBrand}"/>` +
    `<path d="M${x + s * 0.22} ${y + s * 0.7}q${s * 0.14} -${s * 0.1} ${s * 0.28} 0t${s * 0.28} 0" fill="none" stroke="${C.onBrand}" stroke-width="${s * 0.08}" stroke-linecap="round"/>`;
}

function socialIcon(k, cx, cy, ink) {
  if (k === "google") return `<path d="M${cx + 5.6} ${cy - 4.2}A7 7 0 1 0 ${cx + 7} ${cy}H${cx + 0.5}" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`;
  if (k === "apple") return `<path d="M${cx} ${cy - 3}C${cx - 2} ${cy - 5} ${cx - 7} ${cy - 4} ${cx - 7} ${cy + 1}C${cx - 7} ${cy + 5} ${cx - 4} ${cy + 8} ${cx - 2} ${cy + 8}C${cx - 1} ${cy + 8} ${cx - 0.5} ${cy + 7.4} ${cx} ${cy + 7.4}C${cx + 0.5} ${cy + 7.4} ${cx + 1} ${cy + 8} ${cx + 2} ${cy + 8}C${cx + 4} ${cy + 8} ${cx + 7} ${cy + 5} ${cx + 7} ${cy + 1}C${cx + 7} ${cy - 4} ${cx + 2} ${cy - 5} ${cx} ${cy - 3}Z M${cx} ${cy - 4}C${cx} ${cy - 7} ${cx + 2} ${cy - 8.5} ${cx + 4} ${cy - 8.5}C${cx + 4} ${cy - 6} ${cx + 2} ${cy - 4.5} ${cx} ${cy - 4}Z" fill="${ink}"/>`;
  return `<g fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round"><circle cx="${cx - 3}" cy="${cy}" r="3.6"/><path d="M${cx + 0.6} ${cy}H${cx + 7.5}M${cx + 5.5} ${cy}v3.2M${cx + 7.5} ${cy}v2.4"/></g>`;
}

function field(x, y, w, h, r, C, bad) {
  return `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${Math.min(r, h / 2)}" fill="${C.field}" stroke="${bad ? C.err : C.fieldLine}" stroke-width="${bad ? 1.5 : 1}"/>`;
}

function form(p, C, w, showLogo) {
  const r = p.radius, fh = 46;
  let y = 0, s = "";
  const btn = (x, yy, ww, hh) => `<rect x="${x + 0.5}" y="${yy + 0.5}" width="${ww - 1}" height="${hh - 1}" rx="${Math.min(r, hh / 2)}" fill="${C.field}" stroke="${C.fieldLine}"/>`;
  if (showLogo) { s += logo(0, 0, 36, C, r) + t(48, 25, 18, C.ink, "Oasis", 700, "start", -0.3); y += 64; }
  s += t(0, y + 28, 30, C.ink, esc(p.title), 700, "start", -0.6); y += 42;
  s += t(0, y + 16, 15, C.muted, "Sign in to continue to your workspace."); y += 44;
  if (p.error) {
    s += `<rect x="0.5" y="${y + 0.5}" width="${w - 1}" height="63" rx="${Math.min(r, 14)}" fill="${C.errBg}" stroke="${C.errLine}"/>` +
      `<circle cx="26" cy="${y + 32}" r="10" fill="${C.err}"/><rect x="25" y="${y + 26}" width="2" height="8" rx="1" fill="${C.errBg}"/><circle cx="26" cy="${y + 37.5}" r="1.3" fill="${C.errBg}"/>` +
      t(48, y + 28, 14, C.ink, "Incorrect email or password", 600) + t(48, y + 47, 13, C.muted, "Check your details and try again.");
    y += 88;
  }
  if (p.social !== "none") {
    if (p.social === "row") {
      const bw = (w - 20) / 3;
      [["google", "Google"], ["apple", "Apple"], ["key", "SSO"]].forEach(([k, l], i) => {
        const bx = i * (bw + 10), gw = 24 + l.length * 7.6, st = bx + bw / 2 - gw / 2;
        s += btn(bx, y, bw, 44) + socialIcon(k, st + 8, y + 22, C.ink) + t(st + 24, y + 27, 14, C.ink, l, 500);
      });
      y += 44;
    } else {
      [["google", "Google"], ["apple", "Apple"]].forEach(([k, l], i) => {
        const by = y + i * 54;
        s += btn(0, by, w, 44) + socialIcon(k, 26, by + 22, C.ink) + t(w / 2, by + 27, 14, C.ink, `Continue with ${l}`, 500, "middle");
      });
      y += 98;
    }
    y += 22;
    s += `<path d="M0 ${y + 7}H${w / 2 - 22}M${w / 2 + 22} ${y + 7}H${w}" stroke="${C.line}" stroke-width="1"/>` + t(w / 2, y + 11, 13, C.muted, "or", 500, "middle");
    y += 36;
  }
  s += t(0, y + 14, 13, C.ink, "Email", 600); y += 24;
  s += field(0, y, w, fh, r, C, p.error) + t(15, y + 28, 15, C.ink, "maya@studio.co");
  y += fh + 18;
  s += t(0, y + 14, 13, C.ink, "Password", 600) + t(w, y + 14, 13, C.link, "Forgot password?", 600, "end"); y += 24;
  s += field(0, y, w, fh, r, C, p.error);
  for (let i = 0; i < 10; i++) s += `<circle cx="${19 + i * 12}" cy="${y + fh / 2}" r="3.5" fill="${C.ink}"/>`;
  const ex = w - 24, ey = y + fh / 2;
  s += `<path d="M${ex - 8} ${ey}C${ex - 5} ${ey - 5.5} ${ex + 5} ${ey - 5.5} ${ex + 8} ${ey}C${ex + 5} ${ey + 5.5} ${ex - 5} ${ey + 5.5} ${ex - 8} ${ey}Z" fill="none" stroke="${C.muted}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="${ex}" cy="${ey}" r="2.2" fill="${C.muted}"/>`;
  y += fh + 20;
  const cr = Math.min(r, 5);
  s += p.remember
    ? `<rect x="0" y="${y}" width="18" height="18" rx="${cr}" fill="${C.brand}"/><path d="M4.5 ${y + 9.5}l3 3 6-6.5" fill="none" stroke="${C.onBrand}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<rect x="0.75" y="${y + 0.75}" width="16.5" height="16.5" rx="${cr}" fill="${C.field}" stroke="${C.fieldLine}" stroke-width="1.5"/>`;
  s += t(28, y + 14, 14, C.ink, "Remember me for 30 days"); y += 42;
  s += `<rect x="0" y="${y}" width="${w}" height="48" rx="${Math.min(r, 24)}" fill="${C.brand}"/>` + t(w / 2, y + 30, 15, C.onBrand, "Sign in", 600, "middle", 0.1);
  y += 72;
  s += `<text x="${w / 2}" y="${y + 14}" font-family="${F}" font-size="14" text-anchor="middle"><tspan fill="${C.muted}">New here? </tspan><tspan fill="${C.link}" font-weight="600">Create an account</tspan></text>`;
  return { s, h: y + 18 };
}

function art(p, x, y, w, h, side) {
  const R = rng(p.seed * 9973 + 17), M = Math.min(w, h);
  const skyTop = mix(p.brand, p.brand, 0, -0.08), skyMid = mix(p.brand, p.accent, 0.5, 0.04), skyLow = mix(p.accent, "#FFFFFF", 0.35);
  let s = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="0.45" stop-color="${skyMid}"/><stop offset="0.75" stop-color="${skyLow}"/></linearGradient>`;
  s = `<defs>${s}</defs><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sky)"/>`;
  const sx = side ? x + w * (R() < 0.5 ? 0.13 + R() * 0.08 : 0.79 + R() * 0.08) : x + w * (0.32 + R() * 0.36);
  const sy = y + h * (0.27 + R() * 0.12), sr = M * (0.085 + R() * 0.035);
  const sun = mix(p.accent, "#FFFFFF", 0.55);
  s += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(sr * 2.4).toFixed(1)}" fill="${sun}" opacity="0.45" filter="url(#bl)"/>`;
  for (let i = 1; i <= 6; i++) s += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(sr * (1 + i * 0.62)).toFixed(1)}" fill="none" stroke="#FFFFFF" stroke-opacity="${(0.34 - i * 0.045).toFixed(2)}" stroke-width="1.2"/>`;
  s += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${sr.toFixed(1)}" fill="${sun}"/>`;
  const n = 5, far = mix(p.accent, p.brand, 0.2, 0.06), near = mix(p.brand, p.brand, 0, -0.12);
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), y0 = y + h * (0.5 + k * 0.32), A = h * (0.045 - k * 0.012);
    const f1 = 1.2 + R() * 1.8, f2 = 2.8 + R() * 3, p1 = R() * 6.28, p2 = R() * 6.28;
    let d = "";
    for (let j = 0; j <= 48; j++) {
      const u = j / 48, yy = y0 + A * (Math.sin(f1 * u * 6.28 + p1) * 0.7 + Math.sin(f2 * u * 6.28 + p2) * 0.3);
      d += `${j ? "L" : "M"}${(x + u * w).toFixed(1)} ${yy.toFixed(1)}`;
    }
    s += `<path d="${d}L${x + w} ${y + h}L${x} ${y + h}Z" fill="${mix(far, near, k)}"/><path d="${d}" fill="none" stroke="#FFFFFF" stroke-opacity="${(0.28 - k * 0.04).toFixed(2)}" stroke-width="1.4"/>`;
  }
  return s + `<rect x="${x}" y="${y}" width="${w}" height="${h}" filter="url(#gr)" opacity="0.55"/>`;
}

export default function render(p) {
  const W = 1200, H = 800;
  const C = Object.assign({}, THEMES[p.theme === "dark" ? "dark" : "light"]);
  C.brand = p.brand;
  C.onBrand = contrast("#FFFFFF", p.brand) >= contrast("#111114", p.brand) ? "#FFFFFF" : "#111114";
  C.link = contrast(p.brand, C.surface) >= 4.5 && !isWarmRed(p.brand) ? p.brand : C.ink;
  const r = p.radius;
  let defs = `<filter id="bl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="40"/></filter>` +
    `<filter id="gr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0.12 0 0 0 0"/></filter>` +
    `<filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="24" stdDeviation="30" flood-color="#000000" flood-opacity="0.28"/></filter>`;
  let body = "";
  if (p.layout === "card") {
    const fw = 352, f = form(p, C, fw, true), ch = f.h + 88, cw = fw + 88;
    const k = Math.min(1, (H - 48) / ch), cx = (W - cw) / 2, cy = (H - ch) / 2;
    body += art(p, 0, 0, W, H, true) + `<rect width="${W}" height="${H}" fill="${C.bg}" opacity="${C.tint}"/>`;
    body += `<g transform="translate(${W / 2} ${H / 2}) scale(${k.toFixed(4)}) translate(${-W / 2} ${-H / 2})">`;
    body += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="${r * 1.4}" fill="${C.surface}" filter="url(#sh)"/>`;
    body += `<g transform="translate(${cx + 44} ${cy + 44})">${f.s}</g></g>`;
  } else {
    const ax = 16, ay = 16, aw = 568, ah = 768, chipR = Math.min(r * 1.2, 22), chipW = 114, ty = 600, tw = aw - 56;
    defs += `<clipPath id="ac"><rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" rx="${r * 1.4}"/></clipPath>`;
    body += `<rect width="${W}" height="${H}" fill="${C.surface}"/>`;
    body += `<g clip-path="url(#ac)">${art(p, ax, ay, aw, ah, false)}<rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" fill="${C.bg}" opacity="${C.tint * 0.5}"/></g>`;
    body += `<rect x="44" y="44" width="${chipW}" height="48" rx="${chipR}" fill="${C.surface}" fill-opacity="0.95"/>` + logo(54, 54, 28, C, r) + t(92, 74, 17, C.ink, "Oasis", 700, "start", -0.3);
    body += `<rect x="44" y="${ty}" width="${tw}" height="156" rx="${chipR}" fill="${C.surface}" fill-opacity="0.95"/>`;
    body += `<text font-family="Georgia, 'Times New Roman', serif" font-size="19" fill="${C.ink}"><tspan x="70" y="${ty + 48}">“Signing in feels like opening the studio</tspan><tspan x="70" y="${ty + 74}">door. Everything is right where I left it.”</tspan></text>`;
    body += `<circle cx="87" cy="${ty + 120}" r="17" fill="${C.brand}"/>` + t(87, ty + 124.5, 12, C.onBrand, "MO", 700, "middle", 0.3) +
      t(114, ty + 116, 14, C.ink, "Maya Okafor", 600) + t(114, ty + 134, 13, C.muted, "Design Lead, Northwind");
    const fw = 360, f = form(p, C, fw, false), fx = 600 + (600 - fw) / 2, fy = Math.max(32, (H - 40 - f.h) / 2);
    body += `<g transform="translate(${fx} ${fy})">${f.s}</g>`;
    body += t(fx, 772, 12, C.muted, "© 2025 Oasis Inc.") + t(fx + fw, 772, 12, C.muted, "Privacy   ·   Terms", 400, "end");
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs>${body}</svg>`;
}
