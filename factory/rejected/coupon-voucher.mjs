// Discount coupon with a perforated tear-off stub, die-cut notches, a big offer line, a scannable code box and expiry.
export const meta = {
  title: "Tear-Off Coupon",
  kind: "ui",
  description: "A perforated discount voucher with real die-cut notches, a tear-off code stub with a Code 39 barcode, and percent, amount, BOGO or free-shipping offers. For promo emails, social posts and checkout banners.",
  tags: ["coupon", "voucher", "discount", "promo", "sale", "ticket", "perforated", "ecommerce"],
  price: 0,
  author: "oasis-factory",
  size: [800, 440],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#EFE9DF" },
    surface: { type: "color", role: "surface", label: "Coupon", default: "#FFFDF8" },
    primary: { type: "color", role: "primary", label: "Accent & stub", default: "#E2552B" },
    ink: { type: "color", role: "ink", label: "Ink", default: "#1F1B16" },
    offer: { type: "choice", label: "Offer type", default: "percent", options: ["percent", "amount", "bogo", "free shipping"] },
    side: { type: "choice", label: "Perforation side", default: "left", options: ["left", "right", "bottom"] },
    notch: { type: "choice", label: "Notch cutout", default: "round", options: ["round", "square", "vee", "none"] },
    channel: { type: "choice", label: "Redeem", default: "everywhere", options: ["everywhere", "online", "in store", "app"] },
    discount: { type: "range", label: "Discount value", default: 25, min: 5, max: 90, step: 5 },
    minSpend: { type: "range", label: "Minimum spend", default: 50, min: 0, max: 200, step: 5 },
    radius: { type: "range", label: "Corner radius", default: 18, min: 0, max: 32, step: 1 },
    notchSize: { type: "range", label: "Notch size", default: 18, min: 10, max: 28, step: 1 },
    barcode: { type: "toggle", label: "Barcode", default: true },
    headline: { type: "text", label: "Headline", default: "Seasonal Sale" },
    code: { type: "text", label: "Code", default: "SAVE25" },
    expiry: { type: "text", label: "Expiry", default: "31 Dec 2025" },
  },
  presets: {
    Midnight: { background: "#0F1115", surface: "#1B1F27", primary: "#F5C451", ink: "#F2EEE6", offer: "amount", side: "right", notch: "square", channel: "in store", discount: 20, radius: 28, headline: "Welcome Gift", code: "HELLO20", expiry: "15 Mar 2026" },
    Mint: { background: "#DDEDE6", surface: "#FFFFFF", primary: "#1E7A5A", ink: "#10261F", offer: "free shipping", side: "bottom", notch: "vee", channel: "online", minSpend: 35, headline: "Members Perk", code: "SHIPFREE", expiry: "30 Jun 2026" },
    Blush: { background: "#F6E3E3", surface: "#FFF8F6", primary: "#B8325A", ink: "#2A1219", offer: "bogo", side: "left", notch: "none", channel: "app", radius: 6, minSpend: 0, barcode: false, headline: "Brunch Club", code: "BOGO-BRUNCH", expiry: "Weekends in May" },
    Cobalt: { background: "#E8ECF7", surface: "#FFFFFF", primary: "#2945D6", ink: "#121A33", offer: "percent", side: "right", notch: "round", channel: "online", discount: 40, notchSize: 26, headline: "Flash Sale", code: "FLASH40", expiry: "Ends Sunday" },
  },
};

function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function hex(c) { return "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join(""); }
function mix(a, b, t) { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); }
function lum(h) {
  const c = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
const f = (n) => n.toFixed(1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const C39 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. *";
const P39 = ["000110100", "100100001", "001100001", "101100000", "000110001", "100110000", "001110000", "000100101", "100100100", "001100100",
  "100001001", "001001001", "101001000", "000011001", "100011000", "001011000", "000001101", "100001100", "001001100", "000011100",
  "100000011", "001000011", "101000010", "000010011", "100010010", "001010010", "000000111", "100000110", "001000110", "000010110",
  "110000001", "011000001", "111000000", "010010001", "110010000", "011010000", "010000101", "110000100", "011000100", "010010100"];

function barcode(code, x, y, w, h, color) {
  const s = "*" + code.split("").map((c) => (C39.indexOf(c) >= 0 && c !== "*" ? c : "-")).join("") + "*";
  const units = s.length * 16 - 1, u = Math.min(2.2, w / units);
  let cx = x + (w - units * u) / 2, d = "";
  for (const ch of s) {
    const pat = P39[C39.indexOf(ch)];
    for (let i = 0; i < 9; i++) {
      const ww = (pat[i] === "1" ? 3 : 1) * u;
      if (i % 2 === 0) d += `M${f(cx)} ${f(y)}h${ww.toFixed(2)}v${h}h-${ww.toFixed(2)}z`;
      cx += ww;
    }
    cx += u;
  }
  return `<path d="${d}" fill="${color}"/>`;
}

function notchShape(style, x, y, dx, dy, r, attr) {
  if (style === "none") return "";
  if (style === "round") return `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" ${attr}/>`;
  const px = -dy, py = dx;
  const pt = (a, b) => `${f(x + px * a + dx * b)},${f(y + py * a + dy * b)}`;
  if (style === "square") return `<polygon points="${pt(-r * 0.85, -r)} ${pt(r * 0.85, -r)} ${pt(r * 0.85, r * 0.85)} ${pt(-r * 0.85, r * 0.85)}" ${attr}/>`;
  return `<polygon points="${pt(-r * 1.05, -2)} ${pt(r * 1.05, -2)} ${pt(0, r * 1.1)}" ${attr}/>`;
}

function emW(s) {
  let w = 0;
  for (const c of s) w += /[0-9$]/.test(c) ? 0.556 : c === "+" ? 0.584 : c === "%" ? 0.889 : c === " " || c === "I" ? 0.28 : 0.69;
  return w;
}

export default function render(p) {
  const W = 800, H = 440, R = p.radius, NR = p.notchSize;
  const bg = p.background, surf = p.surface, prim = p.primary;
  const ink = contrast(p.ink, surf) >= 3 ? p.ink : (lum(surf) > 0.4 ? "#141414" : "#F5F5F5");
  const muted = mix(ink, surf, 0.45);
  const accent = contrast(prim, surf) >= 2.4 ? prim : ink;
  const stubInk = contrast(ink, prim) >= contrast(surf, prim) ? ink : surf;
  const sInk = contrast(stubInk, prim) >= 3 ? stubInk : (lum(prim) > 0.4 ? "#141414" : "#FFFFFF");
  const darkBg = lum(bg) < 0.3;
  const dotC = darkBg ? mix(bg, "#FFFFFF", 0.07) : mix(bg, "#000000", 0.06);
  const shC = mix(bg, "#000000", 0.75), shO = darkBg ? 0.6 : 0.2;
  const needEdge = contrast(surf, bg) < 1.35, edgeC = mix(surf, ink, 0.25);
  const paper = lum(surf) > 0.7 ? surf : "#FBFAF6";
  const bars = contrast(ink, paper) >= 7 ? ink : "#16140F";
  const code = String(p.code || "").toUpperCase().slice(0, 14);

  const vert = p.side !== "bottom";
  let cx, cy, cw, ch, stub, main, perf;
  if (vert) {
    cx = 60; cy = 60; cw = 680; ch = 320;
    const sw = 210, left = p.side === "left", px = left ? cx + sw : cx + cw - sw;
    stub = { x: left ? cx : px, y: cy, w: sw, h: ch };
    main = { x: left ? px : cx, y: cy, w: cw - sw, h: ch };
    perf = { a: [px, cy], b: [px, cy + ch], d1: [0, 1], d2: [0, -1] };
  } else {
    cx = 110; cy = 32; cw = 580; ch = 376;
    const sh = 118, py = cy + ch - sh;
    stub = { x: cx, y: py, w: cw, h: sh };
    main = { x: cx, y: cy, w: cw, h: ch - sh };
    perf = { a: [cx, py], b: [cx + cw, py], d1: [1, 0], d2: [-1, 0] };
  }

  let holes = "";
  const len = Math.hypot(perf.b[0] - perf.a[0], perf.b[1] - perf.a[1]);
  const inset = p.notch === "none" ? 14 : NR + 12;
  const span = len - inset * 2, n = Math.max(2, Math.round(span / 14));
  const ux = (perf.b[0] - perf.a[0]) / len, uy = (perf.b[1] - perf.a[1]) / len;
  for (let i = 0; i <= n; i++) {
    const t = inset + (span * i) / n;
    holes += `<circle cx="${f(perf.a[0] + ux * t)}" cy="${f(perf.a[1] + uy * t)}" r="3.2" fill="#000"/>`;
  }
  const notchPair = (attr) => notchShape(p.notch, perf.a[0], perf.a[1], perf.d1[0], perf.d1[1], NR, attr) +
    notchShape(p.notch, perf.b[0], perf.b[1], perf.d2[0], perf.d2[1], NR, attr);

  const defs = `<defs>
<pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="11" cy="11" r="1.3" fill="${dotC}"/></pattern>
<filter id="sh" x="-10%" y="-15%" width="120%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="${shC}" flood-opacity="${shO}"/></filter>
<clipPath id="cl"><rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="${R}"/></clipPath>
<mask id="mk" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${notchPair('fill="#000"')}${holes}</mask>
</defs>`;

  const sans = "Helvetica Neue, Helvetica, Arial, sans-serif";
  const mono = "Menlo, Consolas, monospace";
  const pad = 40, mx = main.x + pad, mr = main.x + main.w - pad, my = main.y, avail = mr - mx;
  const fsMax = Math.min(156, main.h * 0.5);
  const hy = my + (vert ? 60 : 52), ny = hy + (vert ? 24 : 20) + fsMax * 0.74, ey = my + main.h - 26;
  const ry = Math.min(ny + 22, ey - 50);

  const amt = String(p.discount);
  let big = amt, pre = "", top = "", topS = 0.48, bot = "OFF", botS = 0.25;
  if (p.offer === "percent") top = "%";
  else if (p.offer === "amount") pre = "$";
  else if (p.offer === "bogo") { big = "1+1"; top = "BUY ONE"; topS = 0.17; bot = "GET ONE FREE"; botS = 0.13; }
  else { big = "FREE"; bot = "SHIPPING"; botS = 0.2; }
  const bigEm = emW(big) - 0.026 * (big.length - 1);
  const preEm = pre ? 0.556 * 0.48 + 0.03 : 0;
  const rightEm = Math.max(emW(top) * topS, (emW(bot) + 0.05 * bot.length) * botS);
  const fs = Math.min(fsMax, avail / (preEm + bigEm + 0.07 + rightEm));
  const x0 = mx - fs * 0.04, bx0 = x0 + preEm * fs, ox = bx0 + bigEm * fs + fs * 0.07;
  const topY = ny - 0.72 * fs + topS * 0.72 * fs;
  let hero = pre ? `<text x="${f(x0)}" y="${f(ny - fs * 0.375)}" font-family="${sans}" font-size="${f(fs * 0.48)}" font-weight="800" fill="${accent}">${pre}</text>` : "";
  hero += `<text x="${f(bx0)}" y="${f(ny)}" font-family="${sans}" font-size="${f(fs)}" font-weight="800" letter-spacing="${f(-fs * 0.026)}" fill="${accent}">${big}</text>`;
  if (top) hero += `<text x="${f(ox)}" y="${f(topY)}" font-family="${sans}" font-size="${f(fs * topS)}" font-weight="800" letter-spacing="${topS < 0.3 ? f(fs * topS * 0.05) : 0}" fill="${accent}">${top}</text>`;
  hero += `<text x="${f(ox + 2)}" y="${f(ny)}" font-family="${sans}" font-size="${f(fs * botS)}" font-weight="800" letter-spacing="${f(fs * botS * 0.05)}" fill="${ink}">${bot}</text>`;

  const chLabel = { everywhere: "IN STORE & ONLINE", online: "ONLINE ONLY", "in store": "IN STORE ONLY", app: "IN APP ONLY" }[p.channel] || "";
  const chW = chLabel.length * (0.69 * 10.5 + 1.5);
  const head = String(p.headline || "").toUpperCase().slice(0, 30);
  const hs = clamp((avail - chW - 24) / (0.88 * Math.max(1, head.length)), 9, 15);
  const exp = String(p.expiry || "").slice(0, 24);
  const es = clamp((avail - 170) / (0.6 * Math.max(1, exp.length)), 11, 17);
  const minTxt = p.minSpend > 0 ? "MIN. SPEND $" + p.minSpend : "NO MINIMUM SPEND";
  const mainSvg = `<text x="${mx}" y="${hy}" font-family="${sans}" font-size="${f(hs)}" font-weight="700" letter-spacing="${f(hs * 0.2)}" fill="${ink}">${esc(head)}</text>
<text x="${mr}" y="${hy}" text-anchor="end" font-family="${sans}" font-size="10.5" font-weight="700" letter-spacing="1.5" fill="${muted}">${esc(chLabel)}</text>
${hero}
<line x1="${mx}" y1="${f(ry)}" x2="${mr}" y2="${f(ry)}" stroke="${muted}" stroke-opacity="0.5" stroke-width="1"/>
<text x="${mx}" y="${f(ey - 22)}" font-family="${sans}" font-size="10.5" font-weight="700" letter-spacing="2" fill="${muted}">VALID UNTIL</text>
<text x="${mx}" y="${f(ey)}" font-family="${sans}" font-size="${f(es)}" font-weight="700" fill="${ink}">${esc(exp)}</text>
<text x="${mr}" y="${f(ey - 22)}" text-anchor="end" font-family="${sans}" font-size="10.5" font-weight="700" letter-spacing="1.5" fill="${muted}">${minTxt}</text>
<text x="${mr}" y="${f(ey)}" text-anchor="end" font-family="${sans}" font-size="12" fill="${muted}">One use per order · Terms apply</text>`;

  const fitCode = (boxW) => clamp((boxW - 28) / Math.max(1, code.length * 0.62 + code.length * 2 / 26), 10, 26);
  const boxFill = mix(prim, sInk, 0.1), brx = Math.min(10, R * 0.5 + 2);
  const label = (x, y, w, h, bh, ty) => {
    const hr = clamp(((w - 20) / (code.length + 2) - 1.5) / 0.6, 7, 11);
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${f(Math.min(8, R * 0.4 + 2))}" fill="${paper}"/>
${barcode(code, x + 12, y + 12, w - 24, bh, bars)}
<text x="${x + w / 2}" y="${y + ty}" text-anchor="middle" font-family="${mono}" font-size="${f(hr)}" letter-spacing="1.5" fill="${bars}">*${esc(code)}*</text>`;
  };
  let stubSvg;
  if (vert) {
    const sx = stub.x, sc = sx + stub.w / 2, bw = stub.w - 48, cs = fitCode(bw);
    const t0 = p.barcode ? cy + 52 : cy + ch / 2 - 36;
    stubSvg = `<text x="${sc}" y="${t0}" text-anchor="middle" font-family="${sans}" font-size="12" font-weight="700" letter-spacing="3" fill="${sInk}" fill-opacity="0.8">USE CODE</text>
<rect x="${sx + 24}" y="${t0 + 16}" width="${bw}" height="64" rx="${f(brx)}" fill="${boxFill}" stroke="${sInk}" stroke-opacity="0.7" stroke-width="1.5" stroke-dasharray="6 5"/>
<text x="${sc}" y="${f(t0 + 48 + cs * 0.36)}" text-anchor="middle" font-family="${mono}" font-size="${f(cs)}" font-weight="700" letter-spacing="2" fill="${sInk}">${esc(code)}</text>
${p.barcode ? label(sx + 24, cy + 152, bw, 120, 66, 104) : ""}`;
  } else {
    const sx = stub.x + pad, sy = stub.y, bw = p.barcode ? 290 : stub.w - pad * 2, cs = fitCode(bw);
    stubSvg = `<text x="${sx}" y="${sy + 38}" font-family="${sans}" font-size="12" font-weight="700" letter-spacing="3" fill="${sInk}" fill-opacity="0.8">USE CODE</text>
<rect x="${sx}" y="${sy + 50}" width="${bw}" height="50" rx="${f(brx)}" fill="${boxFill}" stroke="${sInk}" stroke-opacity="0.7" stroke-width="1.5" stroke-dasharray="6 5"/>
<text x="${sx + bw / 2}" y="${f(sy + 75 + cs * 0.36)}" text-anchor="middle" font-family="${mono}" font-size="${f(cs)}" font-weight="700" letter-spacing="2" fill="${sInk}">${esc(code)}</text>
${p.barcode ? label(stub.x + stub.w - pad - 170, sy + 20, 170, 78, 42, 68) : ""}`;
  }

  const edge = needEdge ? `<rect x="${cx + 0.75}" y="${cy + 0.75}" width="${cw - 1.5}" height="${ch - 1.5}" rx="${R}" fill="none" stroke="${edgeC}" stroke-width="1.5"/>` : "";
  const rim = needEdge ? `<g clip-path="url(#cl)">${notchPair(`fill="none" stroke="${edgeC}" stroke-width="1.5"`)}</g>` : "";
  const coupon = `<g mask="url(#mk)"><g filter="url(#sh)">
<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="${R}" fill="${surf}"/>
<g clip-path="url(#cl)"><rect x="${stub.x}" y="${stub.y}" width="${stub.w}" height="${stub.h}" fill="${prim}"/></g></g>
${edge}</g>${rim}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}
<rect width="${W}" height="${H}" fill="${bg}"/><rect width="${W}" height="${H}" fill="url(#dots)"/>
${coupon}${mainSvg}${stubSvg}</svg>`;
}
