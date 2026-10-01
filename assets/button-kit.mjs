// Button component spec sheet: primary, secondary and ghost buttons across default, hover and disabled states, with redlines and contrast checks.
export const meta = {
  title: "Button Spec Sheet",
  kind: "ui",
  description: "A three-variant button set (primary, secondary, ghost) shown across default, hover and disabled states as a component spec sheet with redlines, swatches and live contrast checks, for design systems and UI kit handoffs.",
  tags: ["button", "ui kit", "design system", "component", "spec", "cta", "redline", "states"],
  price: 4,
  author: "oasis-factory",
  size: [960, 560],
};

export const params = {
  knobs: {
    brand: { type: "color", label: "Brand", default: "#4F46E5" },
    ink: { type: "color", label: "Ink", default: "#16161D" },
    canvas: { type: "color", label: "Canvas", default: "#F3F2EE" },
    label: { type: "text", label: "Button label", default: "Get started" },
    icon: { type: "choice", label: "Leading icon", default: "Arrow", options: ["None", "Arrow", "Plus", "Sparkle"] },
    size: { type: "choice", label: "Size", default: "Medium", options: ["Small", "Medium", "Large"] },
    radius: { type: "range", label: "Corner radius", default: 10, min: 0, max: 32, step: 1 },
    shadow: { type: "toggle", label: "Shadow", default: true },
    specs: { type: "toggle", label: "Show redlines", default: true },
  },
  presets: {
    Indigo: { brand: "#4F46E5", ink: "#16161D", canvas: "#F3F2EE" },
    Tangerine: { brand: "#E8572A", ink: "#1E1A17", canvas: "#F7F1EA" },
    Forest: { brand: "#1F7A5A", ink: "#13201B", canvas: "#EDF1EC" },
    Midnight: { brand: "#8B7CFF", ink: "#ECECF4", canvas: "#0E0F14" },
  },
};

const SANS = "-apple-system, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "Menlo, Consolas, monospace";
const RED = "#F2555A";
const SIZES = {
  Small: { h: 36, fs: 13.5, px: 16, ic: 16, gap: 7 },
  Medium: { h: 44, fs: 15, px: 20, ic: 18, gap: 8 },
  Large: { h: 56, fs: 17, px: 26, ic: 20, gap: 10 },
};
const ICONS = {
  Arrow: { d: "M5 12h14M13 6l6 6-6 6", fill: false },
  Plus: { d: "M12 5v14M5 12h14", fill: false },
  Sparkle: { d: "M11 3.5C11.6 8.6 14.4 11.4 19.5 12 14.4 12.6 11.6 15.4 11 20.5 10.4 15.4 7.6 12.6 2.5 12 7.6 11.4 10.4 8.6 11 3.5ZM19 2.5C19.25 4.1 19.9 4.75 21.5 5 19.9 5.25 19.25 5.9 19 7.5 18.75 5.9 18.1 5.25 16.5 5 18.1 4.75 18.75 4.1 19 2.5Z", fill: true },
};

const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (c) => {
  const [r, g, b] = hex(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const grade = (c) => (c >= 7 ? "AAA" : c >= 4.5 ? "AA" : c >= 3 ? "AA Large" : "Fail");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function measure(s, fs) {
  let w = 0;
  for (const ch of s) {
    if (" il.,:;'!|Ijft()[]".includes(ch)) w += 0.29;
    else if ("mwMW@".includes(ch)) w += 0.86;
    else if (/[A-Z]/.test(ch)) w += 0.68;
    else if (/[0-9]/.test(ch)) w += 0.56;
    else w += 0.555;
  }
  return w * fs * 1.04;
}

function dim(x1, y1, x2, y2, label, lx, ly, anchor) {
  const t = x1 === x2 ? `M${x1 - 3},${y1}h6M${x2 - 3},${y2}h6` : `M${x1},${y1 - 3}v6M${x2},${y2 - 3}v6`;
  return `<path d="M${x1},${y1}L${x2},${y2}${t}" stroke="${RED}" stroke-width="1" fill="none"/>` +
    `<text x="${lx}" y="${ly}" font-family="${MONO}" font-size="10.5" fill="${RED}" text-anchor="${anchor}">${label}</text>`;
}

function crop(x, y, w, h) {
  let d = "";
  [[x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]].forEach(([cx, cy, sx, sy]) => {
    d += `M${cx + sx * 4},${cy}h${sx * 7}M${cx},${cy + sy * 4}v${sy * 7}`;
  });
  return `<path d="${d}" stroke="${RED}" stroke-width="1" fill="none"/>`;
}

export default function render(p) {
  const W = 960, H = 560;
  const S = SIZES[p.size] || SIZES.Medium;
  const dark = lum(p.canvas) < 0.18;
  const card = dark ? mix(p.canvas, "#FFFFFF", 0.045) : mix(p.canvas, "#FFFFFF", 0.65);
  const line = mix(p.ink, card, 0.88);
  const muted = mix(p.ink, p.canvas, 0.48);
  const onBrand = contrast("#FFFFFF", p.brand) >= contrast("#111114", p.brand) ? "#FFFFFF" : "#111114";
  const secFill = mix(p.brand, card, 0.86);
  const secText = mix(p.brand, p.ink, 0.4);
  const ghostText = mix(p.brand, p.ink, dark ? 0.1 : 0.18);
  const r = Math.min(p.radius, S.h / 2);

  const raw = (String(p.label || "Button").trim() || "Button").slice(0, 28);
  const label = esc(raw);
  const tw = measure(raw, S.fs);
  const icon = ICONS[p.icon];
  const padL = icon ? S.px - 2 : S.px;
  const bw = Math.round(padL + S.px + tw + (icon ? S.ic + S.gap : 0));
  const colW = Math.max(bw, 120), gap = 56, LC = 112, T = 30, RG = 22;
  const yb = T + 3 * S.h + 2 * RG + 30;
  const blockW = LC + 3 * colW + 2 * gap, blockH = yb + 21;
  const cardX = 64, cardY = 140, cardW = W - 128, cardH = 312;
  const sc = Math.min(1, (cardW - 96) / blockW, (cardH - 44) / blockH);
  const gx = W / 2 - (blockW * sc) / 2;
  const gy = cardY + (cardH - blockH * sc) / 2;

  const V = [
    { name: "Primary", fill: p.brand, hFill: mix(p.brand, dark ? "#FFFFFF" : "#000000", 0.12), text: onBrand, f: "sp", hl: true, note: `fill ${p.brand}` },
    { name: "Secondary", fill: secFill, hFill: mix(p.brand, card, 0.76), stroke: mix(p.brand, card, 0.68), hStroke: mix(p.brand, card, 0.55), text: secText, f: "ss", note: `fill ${secFill}` },
    { name: "Ghost", fill: null, hFill: mix(p.brand, card, 0.9), text: ghostText, note: `text ${ghostText}` },
  ];
  const iconX = (x) => x + padL;
  const textX = (x) => x + padL + (icon ? S.ic + S.gap : 0);

  const btn = (v, x, y, st) => {
    const fill = st === 1 ? v.hFill : v.fill;
    const stroke = st === 1 ? v.hStroke : v.stroke;
    const f = p.shadow && v.f && st !== 2 ? ` filter="url(#${v.f}${st === 1 && v.hl ? "h" : ""})"` : "";
    let o = "";
    if (fill) o += `<rect x="${x}" y="${y}" width="${bw}" height="${S.h}" rx="${r}" fill="${fill}"${f}/>`;
    if (stroke) o += `<rect x="${x + 0.5}" y="${y + 0.5}" width="${bw - 1}" height="${S.h - 1}" rx="${Math.max(0, r - 0.5)}" fill="none" stroke="${stroke}"/>`;
    if (v.hl) o += `<rect x="${x}" y="${y}" width="${bw}" height="${S.h}" rx="${r}" fill="url(#hl)"/>`;
    if (icon) {
      const s = S.ic / 24;
      o += `<g transform="translate(${iconX(x).toFixed(1)},${(y + (S.h - S.ic) / 2).toFixed(1)}) scale(${s.toFixed(3)})"><path d="${icon.d}" ${icon.fill ? `fill="${v.text}"` : `fill="none" stroke="${v.text}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"`}/></g>`;
    }
    o += `<text x="${textX(x).toFixed(1)}" y="${(y + S.h / 2 + S.fs * 0.36).toFixed(1)}" font-family="${SANS}" font-size="${S.fs}" font-weight="600" fill="${v.text}">${label}</text>`;
    return st === 2 ? `<g opacity="0.4">${o}</g>` : o;
  };

  let row = "";
  ["DEFAULT", "HOVER", "DISABLED"].forEach((st, si) => {
    const y = T + si * (S.h + RG);
    row += `<text x="0" y="${(y + S.h / 2 + 3.5).toFixed(1)}" font-family="${MONO}" font-size="10" letter-spacing="1.5" fill="${muted}">${st}</text>`;
    V.forEach((v, i) => {
      const x = LC + i * (colW + gap);
      row += btn(v, x, y, si);
      if (si === 1 && i === 0) {
        const cs = (S.h / 44).toFixed(3);
        row += `<path transform="translate(${x + bw - 18 * (S.h / 44)},${y + S.h * 0.5}) scale(${cs})" d="M0 0V15.5L4.2 11.6 6.9 17.6 9.6 16.4 7 10.6H12.6Z" fill="#FFFFFF" stroke="#111114" stroke-width="1.2" stroke-linejoin="round"/>`;
      }
      if (si !== 0 || !p.specs) return;
      if (i === 0) {
        row += `<rect x="${x}" y="${y}" width="${padL}" height="${S.h}" fill="${RED}" opacity="0.18" clip-path="url(#pc)"/>`;
        row += dim(x - 14, y, x - 14, y + S.h, String(S.h), x - 22, y + S.h / 2 + 4, "end");
        row += dim(x, y - 14, x + padL, y - 14, String(padL), x + padL / 2, y - 21, "middle");
      } else if (i === 1) {
        const cx = x + bw - r, cy = y + r, R = r + 6;
        row += `<path d="M${cx},${cy - R}A${R},${R} 0 0 1 ${cx + R},${cy}" fill="none" stroke="${RED}" stroke-width="1"/>`;
        row += `<circle cx="${cx}" cy="${cy - R}" r="1.6" fill="${RED}"/><circle cx="${cx + R}" cy="${cy}" r="1.6" fill="${RED}"/>`;
        row += `<text x="${cx + R + 5}" y="${cy - R + 4}" font-family="${MONO}" font-size="10.5" fill="${RED}">r${r}</text>`;
      } else {
        row += crop(x, y, bw, S.h);
        if (icon) {
          const a = iconX(x) + S.ic, b = textX(x);
          row += dim(a, y - 14, b, y - 14, String(S.gap), (a + b) / 2, y - 21, "middle");
        }
      }
    });
  });
  V.forEach((v, i) => {
    const x = LC + i * (colW + gap);
    row += `<text x="${x}" y="${yb}" font-family="${SANS}" font-size="13" font-weight="600" fill="${p.ink}">${v.name}</text>`;
    row += `<text x="${x}" y="${yb + 17}" font-family="${MONO}" font-size="10.5" fill="${muted}">${v.note}</text>`;
  });

  const cP = contrast(onBrand, p.brand), cS = contrast(secText, secFill);
  const gP = grade(cP), gS = grade(cS);
  const swatch = (x, c, role) =>
    `<circle cx="${x + 9}" cy="511" r="9" fill="${c}" stroke="${mix(p.ink, p.canvas, 0.78)}"/>` +
    `<text x="${x + 27}" y="507" font-family="${SANS}" font-size="12" font-weight="600" fill="${p.ink}">${role}</text>` +
    `<text x="${x + 27}" y="521" font-family="${MONO}" font-size="10.5" fill="${muted}">${c.toUpperCase()}</text>`;

  const defs = `<defs>
<linearGradient id="hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.18"/><stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
<filter id="sp" x="-30%" y="-60%" width="160%" height="240%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="${p.brand}" flood-opacity="${dark ? 0.4 : 0.28}"/></filter>
<filter id="sph" x="-30%" y="-70%" width="160%" height="260%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="${p.brand}" flood-opacity="${dark ? 0.5 : 0.36}"/></filter>
<filter id="ss" x="-30%" y="-60%" width="160%" height="240%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${dark ? "#000000" : p.ink}" flood-opacity="${dark ? 0.35 : 0.08}"/></filter>
<pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="0.9" fill="${line}"/></pattern>
<clipPath id="cc"><rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="20"/></clipPath>
<clipPath id="pc"><rect x="${LC}" y="${T}" width="${bw}" height="${S.h}" rx="${r}"/></clipPath>
</defs>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}
<rect width="${W}" height="${H}" fill="${p.canvas}"/>
<text x="64" y="76" font-family="${MONO}" font-size="11" letter-spacing="2" fill="${muted}">COMPONENTS / ACTIONS</text>
<text x="64" y="114" font-family="${SANS}" font-size="32" font-weight="700" letter-spacing="-0.6" fill="${p.ink}">Button</text>
<text x="${W - 64}" y="76" font-family="${MONO}" font-size="11" letter-spacing="2" fill="${muted}" text-anchor="end">V1.1 · ${p.size.toUpperCase()}</text>
<text x="${W - 64}" y="112" font-family="${SANS}" font-size="13" fill="${muted}" text-anchor="end">3 variants · 3 states · ${S.h}px · radius ${r} · label ${S.fs}/600</text>
<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="20" fill="${card}"/>
<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" fill="url(#dots)" opacity="0.7" clip-path="url(#cc)"/>
<rect x="${cardX + 0.5}" y="${cardY + 0.5}" width="${cardW - 1}" height="${cardH - 1}" rx="19.5" fill="none" stroke="${line}"/>
<g transform="translate(${gx.toFixed(1)},${gy.toFixed(1)}) scale(${sc.toFixed(3)})">${row}</g>
<path d="M64 480H${W - 64}" stroke="${line}"/>
${swatch(64, p.brand, "Brand")}${swatch(204, p.ink, "Ink")}${swatch(344, p.canvas, "Canvas")}
<text x="${W - 64}" y="507" font-family="${MONO}" font-size="10" letter-spacing="1.5" fill="${muted}" text-anchor="end">CONTRAST</text>
<text x="${W - 64}" y="521" font-family="${MONO}" font-size="11" fill="${muted}" text-anchor="end">Primary ${cP.toFixed(1)}:1 <tspan fill="${gP === "Fail" ? RED : p.ink}">${gP}</tspan>  ·  Secondary ${cS.toFixed(1)}:1 <tspan fill="${gS === "Fail" ? RED : p.ink}">${gS}</tspan></text>
</svg>`;
}
