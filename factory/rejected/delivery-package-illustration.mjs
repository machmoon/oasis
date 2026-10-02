// Out for Delivery: a flat shipping scene with a van or scooter, a parcel stack and a destination pin on a dotted route over a skyline or street map.
export const meta = {
  title: "Out for Delivery",
  kind: "illustration",
  description: "A flat shipping scene with a van or scooter, a parcel stack and a route pin over a skyline or street map, for checkout, tracking and order-status screens.",
  tags: ["delivery", "shipping", "parcel", "van", "scooter", "ecommerce", "tracking", "logistics"],
  price: 6,
  author: "oasis-factory",
  size: [800, 600],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#F3EEE4" },
    ink: { type: "color", role: "ink", label: "Ink", default: "#1D2330" },
    primary: { type: "color", role: "primary", label: "Vehicle", default: "#E4572E" },
    secondary: { type: "color", role: "secondary", label: "Route & pin", default: "#2B59C3" },
    vehicle: { type: "choice", label: "Vehicle", default: "van", options: ["van", "scooter"] },
    backdrop: { type: "choice", label: "Backdrop", default: "city", options: ["city", "map"] },
    boxes: { type: "range", label: "Box count", default: 4, min: 1, max: 6, step: 1 },
    arc: { type: "range", label: "Route arc", default: 45, min: 0, max: 100, step: 5 },
    density: { type: "range", label: "Backdrop density", default: 5, min: 1, max: 10, step: 1 },
    motion: { type: "toggle", label: "Motion lines", default: true },
  },
  presets: {
    Courier: { background: "#EAF1F8", ink: "#14253D", primary: "#1F6FEB", secondary: "#E0662B", vehicle: "scooter", backdrop: "map" },
    "Night Shift": { background: "#121620", ink: "#E8ECF4", primary: "#F5C542", secondary: "#FF5D73", vehicle: "van", backdrop: "city" },
    "Mint Post": { background: "#EAF5EE", ink: "#183A2C", primary: "#2E9D6A", secondary: "#E5484D", vehicle: "scooter", backdrop: "city" },
    Plum: { background: "#1E1430", ink: "#F1E9FF", primary: "#9B6BFF", secondary: "#3DD6C4", vehicle: "van", backdrop: "map" },
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
const toHex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (h) => { const c = hx(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const onFill = (c) => (cr(c, "#FFFFFF") >= cr(c, "#16181D") ? "#FFFFFF" : "#16181D");
const f = (n) => +n.toFixed(1);

const TIRE = "#20232A", HUB = "#C9CED6", HUB2 = "#8A919C", TRIM = "#2B2F36", LAMP = "#FFE7A3";

function wheel(cx, cy, r, rim) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${TIRE}"${rim ? ` stroke="${rim}" stroke-width="2"` : ""}/>` +
    `<circle cx="${cx}" cy="${cy}" r="${f(r * 0.42)}" fill="${HUB}"/><circle cx="${cx}" cy="${cy}" r="${f(r * 0.15)}" fill="${HUB2}"/>`;
}

function box(x, yb, w, h, lab) {
  const d = 9, dy = 7.2, y = yb - h, m = x + w / 2;
  let s = `<path d="M${f(x)},${f(y)} L${f(x + d)},${f(y - dy)} L${f(x + w + d)},${f(y - dy)} L${f(x + w)},${f(y)} Z" fill="#E7B57C"/>`;
  s += `<path d="M${f(x + w)},${f(y)} L${f(x + w + d)},${f(y - dy)} L${f(x + w + d)},${f(yb - dy)} L${f(x + w)},${f(yb)} Z" fill="#AE773F"/>`;
  s += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="#D39A5C"/>`;
  s += `<path d="M${f(m - 5)},${f(y)} L${f(m - 5 + d)},${f(y - dy)} L${f(m + 5 + d)},${f(y - dy)} L${f(m + 5)},${f(y)} Z" fill="#F0D2A2"/>`;
  s += `<rect x="${f(m - 5)}" y="${f(y)}" width="10" height="${f(h * 0.4)}" fill="#EBC793"/>`;
  if (lab) {
    const lx = x + w - 24, ly = yb - 18;
    s += `<rect x="${f(lx)}" y="${f(ly)}" width="17" height="12" rx="1.5" fill="#F7F1E6"/>` +
      `<rect x="${f(lx + 3)}" y="${f(ly + 3)}" width="11" height="2" fill="#6B5238"/><rect x="${f(lx + 3)}" y="${f(ly + 7)}" width="7" height="2" fill="#6B5238"/>`;
  }
  return s;
}

function city(r, bg, ink, d, dark) {
  let s = "";
  const sx = f(500 + r() * 90), sy = f(150 + r() * 25);
  if (dark) {
    for (let i = 0; i < 22; i++) s += `<circle cx="${f(20 + r() * 760)}" cy="${f(24 + r() * 150)}" r="${f(0.9 + r() * 1.3)}" fill="${mix(bg, ink, 0.3 + r() * 0.35)}"/>`;
    const moon = mix(bg, "#FFF3D1", 0.88);
    s += `<circle cx="${sx}" cy="${sy}" r="92" fill="${mix(bg, "#FFF3D1", 0.06)}"/><circle cx="${sx}" cy="${sy}" r="70" fill="${mix(bg, "#FFF3D1", 0.1)}"/>`;
    s += `<circle cx="${sx}" cy="${sy}" r="46" fill="${moon}"/><circle cx="${f(sx - 14)}" cy="${f(sy - 10)}" r="9" fill="${mix(moon, bg, 0.12)}"/><circle cx="${f(sx + 16)}" cy="${f(sy + 12)}" r="6" fill="${mix(moon, bg, 0.12)}"/><circle cx="${f(sx + 6)}" cy="${f(sy - 22)}" r="4" fill="${mix(moon, bg, 0.1)}"/>`;
  } else {
    const sun = mix("#FFC65C", bg, 0.4);
    s += `<circle cx="${sx}" cy="${sy}" r="84" fill="${mix(bg, sun, 0.35)}"/><circle cx="${sx}" cy="${sy}" r="56" fill="${sun}"/>`;
  }
  const far = mix(bg, ink, 0.07), near = mix(bg, ink, 0.12), win = dark ? mix(bg, "#FFD98A", 0.3) : mix(bg, ink, 0.035);
  let x = -20;
  while (x < 820) {
    const w = 74 - d * 3 + r() * 40, h = 70 + d * 15 + r() * 90;
    s += `<rect x="${f(x)}" y="${f(480 - h)}" width="${f(w)}" height="${f(h)}" fill="${far}"/>`;
    if (r() < 0.3) s += `<rect x="${f(x + w / 2 - 1.5)}" y="${f(480 - h - 22)}" width="3" height="22" fill="${far}"/>`;
    x += w + 4 + r() * 10;
  }
  x = -10;
  const lit = (dark ? 0.22 : 0.42) + d * 0.045;
  while (x < 820) {
    const w = 84 - d * 3 + r() * 44, h = 50 + d * 9 + r() * 70, y = 480 - h;
    s += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h + 4)}" rx="3" fill="${near}"/>`;
    const cols = Math.floor((w - 16) / 14), rows = Math.floor((h - 24) / 18);
    const ox = x + (w - (cols * 14 - 8)) / 2;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++)
      if (r() < lit) s += `<rect x="${f(ox + i * 14)}" y="${f(y + 14 + j * 18)}" width="6" height="9" rx="1" fill="${win}"/>`;
    x += w + 8 + r() * 16;
  }
  return s;
}

function streetMap(r, bg, ink, sec, d) {
  const bs = 104 - d * 7, gap = 11, park = mix(bg, "#4FAE78", 0.2), t1 = mix(bg, ink, 0.055), t2 = mix(bg, ink, 0.1);
  let s = "";
  let y = -8;
  while (y < 480) {
    const rh = bs * (0.7 + r() * 0.6);
    let x = -8 - r() * bs * 0.5;
    while (x < 810) {
      const cw = bs * (0.7 + r() * 0.9), k = r();
      s += `<rect x="${f(x)}" y="${f(y)}" width="${f(cw)}" height="${f(rh)}" rx="5" fill="${k < 0.1 ? park : k < 0.55 ? t1 : t2}"/>`;
      x += cw + gap;
    }
    y += rh + gap;
  }
  const y0 = 120 + r() * 160, y1 = 60 + r() * 300, y2 = 60 + r() * 300, y3 = 120 + r() * 160;
  s += `<path d="M-20,${f(y0)} C260,${f(y1)} 520,${f(y2)} 820,${f(y3)}" fill="none" stroke="${mix(bg, sec, 0.2)}" stroke-width="24" stroke-linecap="round"/>`;
  s += `<defs><linearGradient id="fd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}" stop-opacity="0"/><stop offset="1" stop-color="${bg}" stop-opacity="0.92"/></linearGradient></defs>`;
  return s + `<rect x="0" y="290" width="800" height="192" fill="url(#fd)"/>`;
}

function van(body, rim, glass, sh) {
  const shade = mix(body, "#000000", 0.18), deep = mix(body, "#000000", 0.45), hi = mix(body, "#FFFFFF", 0.3), logo = onFill(body);
  let s = `<ellipse cx="155" cy="482" rx="168" ry="8" fill="${sh}"/>`;
  s += `<path d="M200,330 L252,330 Q266,330 274,342 L298,384 Q310,392 310,408 L310,452 Q310,458 304,458 L200,458 Z" fill="${body}"/>`;
  s += `<rect x="0" y="300" width="215" height="158" rx="16" fill="${body}"/>`;
  s += `<rect x="10" y="307" width="195" height="6" rx="3" fill="${hi}" opacity="0.55"/>`;
  s += `<path d="M224,342 L258,342 Q264,342 268,349 L288,386 L224,386 Z" fill="${glass}"/>`;
  s += `<path d="M240,342 L250,342 L236,386 L226,386 Z" fill="#FFFFFF" opacity="0.35"/>`;
  s += `<path d="M215,334 L215,436" stroke="${shade}" stroke-width="2"/><rect x="226" y="398" width="16" height="5" rx="2.5" fill="${shade}"/>`;
  s += `<path d="M83,358 L105,346 L127,358 L127,384 L105,396 L83,384 Z M83,358 L105,370 L127,358 M105,370 L105,396" fill="none" stroke="${logo}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`;
  s += `<rect x="0" y="436" width="310" height="22" fill="${shade}"/>`;
  s += `<path d="M30,458 A32 32 0 0 1 94,458 Z M216,458 A32 32 0 0 1 280,458 Z" fill="${deep}"/>`;
  s += wheel(62, 456, 24, rim) + wheel(248, 456, 24, rim);
  s += `<rect x="301" y="396" width="9" height="13" rx="3" fill="${LAMP}"/><rect x="0" y="402" width="6" height="20" rx="2" fill="#E5484D"/>`;
  s += `<rect x="298" y="430" width="18" height="16" rx="4" fill="${TRIM}"/><rect x="-5" y="432" width="14" height="16" rx="4" fill="${TRIM}"/>`;
  return s;
}

function scooter(body, rim, sh) {
  const shade = mix(body, "#000000", 0.2), hi = mix(body, "#FFFFFF", 0.3);
  let s = `<ellipse cx="112" cy="482" rx="132" ry="7" fill="${sh}"/>`;
  s += `<path d="M196,428 L200,454" stroke="${TRIM}" stroke-width="7" stroke-linecap="round"/>`;
  s += wheel(45, 456, 24, rim) + wheel(200, 456, 24, rim);
  s += `<rect x="-10" y="372" width="56" height="6" rx="3" fill="${TRIM}"/>` + box(-6, 372, 46, 40, true);
  s += `<path d="M0,446 C-4,410 20,384 60,382 L122,382 C134,382 138,392 136,404 L130,446 Z" fill="${body}"/>`;
  s += `<path d="M24,404 C34,394 50,392 70,392" fill="none" stroke="${hi}" stroke-width="4" stroke-linecap="round" opacity="0.7"/>`;
  s += `<path d="M38,382 C40,370 58,366 80,366 L118,368 C127,369 128,382 120,382 Z" fill="${TRIM}"/>`;
  s += `<path d="M120,446 L180,446 L180,434 L128,434 Z" fill="${shade}"/>`;
  s += `<path d="M160,446 C176,420 180,380 186,334 L204,336 C204,380 200,420 196,446 Z" fill="${body}"/>`;
  s += `<path d="M172,444 Q200,418 228,444 L222,448 Q200,430 178,448 Z" fill="${body}"/>`;
  s += `<path d="M186,328 L180,306 M176,328 L222,320" stroke="${TRIM}" stroke-width="6" stroke-linecap="round"/><circle cx="180" cy="303" r="5" fill="${TRIM}"/>`;
  s += `<circle cx="207" cy="346" r="8" fill="${shade}"/><circle cx="207" cy="346" r="5.5" fill="${LAMP}"/>`;
  return s;
}

export default function render(p) {
  const W = 800, H = 600, bg = p.background, ink = p.ink;
  const dark = lum(bg) < 0.35;
  const r = rng(p.density * 7919 + 13);
  const guard = (c, min) => { let t = 0, o = c; while (cr(o, bg) < min && t < 1) { t += 0.05; o = mix(c, ink, t); } return o; };
  const body = guard(p.primary, 1.5), pin = guard(p.secondary, 3), route = guard(p.secondary, 3);
  const ground = mix(bg, ink, 0.1), sh = mix(ground, "#000000", dark ? 0.45 : 0.18);
  const rim = dark ? mix(bg, ink, 0.28) : "", glass = dark ? "#3A4B60" : "#CFE0EC";

  let s = `<rect width="${W}" height="${H}" fill="${bg}"/>`;
  s += p.backdrop === "city" ? city(r, bg, ink, p.density, dark) : streetMap(r, bg, ink, p.secondary, p.density);
  s += `<rect x="0" y="480" width="${W}" height="120" fill="${ground}"/><rect x="0" y="478" width="${W}" height="4" fill="${mix(bg, ink, 0.17)}"/>`;
  const dash = dark ? mix(ground, ink, 0.14) : mix(bg, "#FFFFFF", 0.45);
  for (let x = 20; x < W; x += 92) s += `<rect x="${x}" y="536" width="44" height="6" rx="3" fill="${dash}"/>`;

  const isVan = p.vehicle === "van";
  const x0 = isVan ? 120 : 190, vL = isVan ? x0 - 5 : x0 - 10, vR = isVan ? x0 + 316 : x0 + 230;
  if (p.motion) {
    const mc = mix(bg, ink, dark ? 0.4 : 0.32), ys = isVan ? [330, 366, 404, 442] : [334, 370, 408, 440], ls = [64, 100, 50, 84];
    ys.forEach((y, i) => {
      const end = vL - 18, len = Math.min(ls[i] * (isVan ? 0.85 : 1.1), end - 24);
      s += `<path d="M${f(end - len)},${y} L${end},${y}" stroke="${mc}" stroke-width="${i % 2 ? 4 : 6}" stroke-linecap="round"/>`;
    });
  }
  s += `<g transform="translate(${x0} 0)">${isVan ? van(body, rim, glass, sh) : scooter(body, rim, sh)}</g>`;

  const PX = 718, rows = [[1], [2], [2, 1], [3, 1], [3, 2], [3, 2, 1]][p.boxes - 1];
  const left = vR + 28, right = PX - 50, cx = (left + right) / 2 - 4;
  const br = rng(p.boxes * 131 + 7);
  let yb = 480, stack = "", bw = 0;
  rows.forEach((n, ri) => {
    const h = 44 + br() * 12 - ri * 4, ws = [];
    for (let i = 0; i < n; i++) ws.push(50 + br() * 10 - ri * 4);
    const rw = ws.reduce((a, b) => a + b, 0) + 6 * (n - 1);
    if (ri === 0) bw = rw;
    let x = cx - rw / 2 + ri * 4 + (ri ? (br() - 0.5) * 8 : 0);
    ws.forEach((w, i) => { stack += box(x, yb, w, h, ri === 0 ? i !== 1 : br() < 0.5); x += w + 6; });
    yb = yb - h - 3;
  });
  s += `<ellipse cx="${f(cx + 4)}" cy="482" rx="${f(bw / 2 + 12)}" ry="6" fill="${sh}"/>${stack}`;

  const PY = 398, PR = 30, SX = 60, SY = 240;
  const c1 = 236 - (40 + p.arc * 1.4), c2 = c1 + 30;
  s += `<path d="M${SX},${SY} C220,${f(c1)} ${PX},${f(c2)} ${PX},${PY - PR - 16}" fill="none" stroke="${route}" stroke-width="${dark ? 6 : 5}" stroke-linecap="round" stroke-dasharray="0.1 13"/>`;
  s += `<circle cx="${SX}" cy="${SY}" r="10" fill="${bg}" stroke="${route}" stroke-width="4"/><circle cx="${SX}" cy="${SY}" r="3.5" fill="${route}"/>`;
  if (dark) s += `<circle cx="${PX}" cy="${PY}" r="50" fill="${mix(bg, pin, 0.16)}"/>`;
  s += `<ellipse cx="${PX}" cy="482" rx="34" ry="8" fill="none" stroke="${pin}" stroke-width="2.5" opacity="0.5"/><ellipse cx="${PX}" cy="482" rx="14" ry="4" fill="${sh}"/>`;
  s += `<path d="M${PX},480 C${PX - 6},466 ${PX - PR},440 ${PX - PR},${PY} A${PR} ${PR} 0 1 1 ${PX + PR},${PY} C${PX + PR},440 ${PX + 6},466 ${PX},480 Z" fill="${pin}" stroke="${mix(pin, "#000000", 0.16)}" stroke-width="1.5"/>`;
  s += `<path d="M${PX - 21},384 A22 22 0 0 1 ${PX - 4},374" fill="none" stroke="${mix(pin, "#FFFFFF", 0.4)}" stroke-width="4" stroke-linecap="round"/>`;
  s += `<circle cx="${PX}" cy="${PY}" r="11" fill="${onFill(pin)}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${s}</svg>`;
}
