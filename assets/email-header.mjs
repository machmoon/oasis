// Newsletter email header: logo lockup, issue pill, dateline and a hero band carrying the issue headline beside a flat sunset graphic.
export const meta = {
  title: "Dispatch Masthead",
  kind: "brand",
  description: "A 600px-wide newsletter header with logo, issue pill, date and a hero band for the issue headline, drawn in flat vector shapes with no blur so it flattens crisply to a 2x PNG for email.",
  tags: ["newsletter", "email", "header", "masthead", "editorial", "banner", "brand"],
  price: 4,
  author: "oasis-factory",
  size: [600, 320],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#F6F2EA" },
    ink: { type: "color", role: "ink", label: "Text colour", default: "#1D1B18" },
    primary: { type: "color", role: "primary", label: "Accent", default: "#D9572B" },
    band: { type: "choice", label: "Hero band", default: "gradient", options: ["gradient", "stripes", "dots", "waves", "grid"] },
    divider: { type: "choice", label: "Divider", default: "accent", options: ["accent", "line", "double", "dotted", "wave"] },
    height: { type: "range", label: "Height", default: 320, min: 260, max: 400, step: 10 },
    issue: { type: "range", label: "Issue number", default: 42, min: 1, max: 999, step: 1 },
    brand: { type: "text", label: "Brand name", default: "Field Notes" },
    title: { type: "text", label: "Issue headline", default: "The Quiet Season" },
    date: { type: "text", label: "Date", default: "March 14, 2025" },
  },
  presets: {
    Midnight: { background: "#12141C", ink: "#F2EFE8", primary: "#7B8CFF", band: "dots", divider: "wave" },
    Meadow: { background: "#EEF3EA", ink: "#1E2B22", primary: "#3E8A5C", band: "waves", divider: "double" },
    Periwinkle: { background: "#FBFAFF", ink: "#23214A", primary: "#9AA5F0", band: "grid", divider: "dotted" },
    Ember: { background: "#1C1512", ink: "#F7E9DC", primary: "#F2A33A", band: "stripes", divider: "line" },
  },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function lum(h) {
  return rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
}
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const pick = (bg) => (ratio("#FFFFFF", bg) >= ratio("#141414", bg) ? "#FFFFFF" : "#141414");
const bestOn = (cols) => {
  const m = (c) => Math.min(...cols.map((b) => ratio(c, b)));
  return m("#FFFFFF") >= m("#141414") ? "#FFFFFF" : "#141414";
};
const ensure = (fg, bg, min) => (ratio(fg, bg) >= min ? fg : pick(bg));

function toHsl(h) {
  const [r, g, b] = rgb(h).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hh * 60, s, l];
}
function fromHsl(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return hex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

function dividerSvg(style, y, col, soft, accent) {
  const x0 = 24, x1 = 576, w = x1 - x0;
  if (style === "accent") return `<rect x="${x0}" y="${y}" width="${w}" height="1" fill="${col}"/><rect x="${x0}" y="${y - 1}" width="56" height="3" rx="1.5" fill="${accent}"/>`;
  if (style === "line") return `<rect x="${x0}" y="${y - 0.5}" width="${w}" height="2" fill="${soft}"/>`;
  if (style === "double") return `<rect x="${x0}" y="${y - 3}" width="${w}" height="2.5" fill="${soft}"/><rect x="${x0}" y="${y + 2}" width="${w}" height="1" fill="${soft}"/>`;
  if (style === "dotted") {
    let d = "";
    for (let x = x0 + 2; x <= x1 - 1; x += 9) d += `<circle cx="${x.toFixed(1)}" cy="${y + 0.5}" r="2"/>`;
    return `<g fill="${soft}">${d}</g>`;
  }
  let d = `M${x0} ${y}`;
  for (let x = x0; x < x1; x += 16) d += ` q4 -5 8 0 t8 0`;
  return `<path d="${d}" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>`;
}

function patternDef(kind, col) {
  const a = `id="pt" patternUnits="userSpaceOnUse"`;
  if (kind === "stripes") return `<pattern ${a} width="14" height="14" patternTransform="rotate(45)"><rect width="4" height="14" fill="${col}"/></pattern>`;
  if (kind === "dots") return `<pattern ${a} width="16" height="16"><circle cx="8" cy="8" r="2.4" fill="${col}"/></pattern>`;
  if (kind === "waves") return `<pattern ${a} width="40" height="14"><path d="M0 7 Q10 1 20 7 T40 7" fill="none" stroke="${col}" stroke-width="2"/></pattern>`;
  return `<pattern ${a} width="22" height="22"><path d="M22 0H0V22" fill="none" stroke="${col}" stroke-width="1.4"/></pattern>`;
}

function fitTitle(t, maxW, fsMax, fsTwo) {
  const cw = 0.52, words = t.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { lines: [""], fs: fsMax };
  if (t.length * cw * fsMax <= maxW || words.length === 1) {
    return { lines: [words.join(" ")], fs: Math.max(14, Math.min(fsMax, maxW / (t.length * cw))) };
  }
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" "), b = words.slice(i).join(" "), m = Math.max(a.length, b.length);
    if (!best || m < best.m) best = { a, b, m };
  }
  return { lines: [best.a, best.b], fs: Math.max(14, Math.min(fsTwo, maxW / (best.m * cw))) };
}

export default function render(p) {
  const W = 600, H = p.height, M = 24;
  const bg = p.background, P = p.primary;
  const ink = ensure(p.ink, bg, 4.5);
  const muted = ratio(mix(ink, bg, 0.38), bg) >= 4.5 ? mix(ink, bg, 0.38) : mix(ink, bg, 0.2);
  const rule = ratio(mix(ink, bg, 0.72), bg) >= 1.6 ? mix(ink, bg, 0.72) : mix(ink, bg, 0.55);
  const soft = mix(ink, bg, 0.5);
  const [h, s, l] = toHsl(P);
  const sat = clamp(s, 0.35, 0.8);
  const second = fromHsl(h + 30, sat, l > 0.55 ? l - 0.1 : Math.min(0.7, l + 0.14));
  const sun = fromHsl(h + 22, Math.min(sat, 0.75), clamp(l + 0.26, 0.72, 0.9));
  const deep = fromHsl(h - 10, Math.min(sat, 0.72), clamp(l - 0.22, 0.2, 0.5));
  const mid = mix(deep, P, 0.45);
  const logoText = pick(P);
  const num = String(Math.round(p.issue)).padStart(3, "0");

  const by = 112, bh = H - by - M, bx = M, bw = W - M * 2, inset = 24;
  const isGrad = p.band === "gradient";
  const bandText = isGrad ? bestOn([P, mix(P, second, 0.55)]) : bestOn([P]);

  const kfs = clamp(bh * 0.065, 10, 13);
  const kY = by + inset + kfs;
  const fsMax = clamp(bh * 0.22, 24, 46);
  const fsTwo = Math.min(fsMax, (bh - inset * 2 - kfs - 22) / 2.1);
  const t = fitTitle(p.title || "", bw * 0.52, fsMax, fsTwo);
  const lh = t.fs * 1.08;
  const lastBase = by + bh - inset - t.fs * 0.2;
  const titleSvg = t.lines.map((ln, i) =>
    `<text x="${bx + inset}" y="${(lastBase - lh * (t.lines.length - 1 - i)).toFixed(1)}" font-family="Georgia, 'Times New Roman', serif" font-size="${t.fs.toFixed(1)}" letter-spacing="-0.5" fill="${bandText}">${esc(ln)}</text>`).join("");

  const brandRaw = (p.brand || "").trim();
  const initial = esc(brandRaw.charAt(0).toUpperCase() || "\u00B7");
  const brandFs = Math.min(16, 300 / Math.max(1, brandRaw.length * 0.6));
  const pillLabel = `ISSUE \u2116 ${num}`;
  const pillW = pillLabel.length * 7.4 + 24;

  const sx = bx + bw * 0.8, sy = by + bh * 0.44, R = bh * 0.22;
  const B = by + bh, X = (f) => (bx + bw * f).toFixed(1), Y = (f) => (by + bh * f).toFixed(1);
  const back = `M${X(0.6)} ${B} C${X(0.66)} ${Y(0.6)} ${X(0.8)} ${Y(0.5)} ${X(0.9)} ${Y(0.64)} S${X(0.98)} ${Y(0.6)} ${bx + bw + 2} ${Y(0.58)} V${B} Z`;
  const front = `M${X(0.67)} ${B} C${X(0.76)} ${Y(0.8)} ${X(0.88)} ${Y(0.68)} ${bx + bw + 2} ${Y(0.74)} V${B} Z`;

  const defs = `<defs>
<linearGradient id="bg1" x1="0" y1="0" x2="1" y2="0.35"><stop offset="0" stop-color="${P}"/><stop offset="0.4" stop-color="${P}"/><stop offset="1" stop-color="${isGrad ? second : P}"/></linearGradient>
<linearGradient id="fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0.42" stop-color="#fff" stop-opacity="0"/><stop offset="0.78" stop-color="#fff" stop-opacity="1"/></linearGradient>
<mask id="fm"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="url(#fade)"/></mask>
<clipPath id="bc"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="14"/></clipPath>
${isGrad ? "" : patternDef(p.band, bandText)}
</defs>`;

  let band = `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="url(#bg1)"/>`;
  if (!isGrad) band += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="url(#pt)" opacity="0.2" mask="url(#fm)"/>`;
  band += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(R * 1.42).toFixed(1)}" fill="none" stroke="${sun}" stroke-width="1.5" opacity="0.6"/>`;
  band += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${R.toFixed(1)}" fill="${sun}"/>`;
  band += `<path d="${back}" fill="${mid}"/><path d="${front}" fill="${deep}"/>`;
  band += `<text x="${bx + inset}" y="${kY.toFixed(1)}" font-family="Menlo, Consolas, monospace" font-size="${kfs.toFixed(1)}" font-weight="bold" letter-spacing="${(kfs * 0.18).toFixed(2)}" fill="${bandText}">THIS WEEK</text>`;
  band += `<rect x="${bx + inset}" y="${(kY + kfs * 0.75).toFixed(1)}" width="${(kfs * 2.4).toFixed(1)}" height="2" fill="${bandText}"/>`;
  band += titleSvg;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}
<rect width="${W}" height="${H}" fill="${bg}"/>
<rect x="${M}" y="24" width="32" height="32" rx="9" fill="${P}"/>
<text x="${M + 16}" y="46" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="18" font-weight="bold" fill="${logoText}">${initial}</text>
<text x="${M + 44}" y="45.5" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="${brandFs.toFixed(1)}" font-weight="bold" letter-spacing="-0.2" fill="${ink}">${esc(brandRaw)}</text>
<rect x="${W - M - pillW}" y="28" width="${pillW}" height="24" rx="12" fill="none" stroke="${P}" stroke-width="1.5"/>
<text x="${W - M - pillW / 2}" y="44" text-anchor="middle" font-family="Menlo, Consolas, monospace" font-size="11" letter-spacing="1.2" fill="${ink}">${esc(pillLabel)}</text>
${dividerSvg(p.divider, 72, rule, soft, P)}
<text x="${M}" y="96" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="11.5" letter-spacing="1.6" fill="${muted}">${esc((p.date || "").toUpperCase())}</text>
<text x="${W - M}" y="96" text-anchor="end" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="11" letter-spacing="1.2" fill="${muted}">VIEW IN BROWSER \u2192</text>
<g clip-path="url(#bc)">${band}</g>
</svg>`;
}
