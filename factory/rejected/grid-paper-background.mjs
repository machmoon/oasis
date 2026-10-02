// Graph-paper and blueprint grid background with minor and major lines, dot or cross styles, centre axes and a radial fade mask.
export const meta = {
  title: "Grid Paper",
  kind: "background",
  description: "Graph or blueprint grid with major and minor lines and a soft radial fade, for hero sections, slides and technical mockups.",
  tags: ["grid", "graph paper", "blueprint", "background", "pattern", "technical", "engineering", "minimal"],
  price: 0,
  author: "oasis-factory",
  size: [1200, 800],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background tint", default: "#F4F1E8" },
    lines: { type: "color", role: "ink", label: "Minor lines", default: "#4A79A8" },
    major: { type: "color", role: "primary", label: "Major lines", default: "#2B5D8C" },
    style: { type: "choice", label: "Grid style", default: "lines", options: ["lines", "dots", "crosses"] },
    cell: { type: "range", label: "Cell size", default: 20, min: 8, max: 64, step: 2 },
    interval: { type: "range", label: "Major every", default: 5, min: 2, max: 10, step: 1 },
    opacity: { type: "range", label: "Line opacity", default: 0.45, min: 0.1, max: 1, step: 0.05 },
    weight: { type: "range", label: "Line weight", default: 1, min: 0.5, max: 2.5, step: 0.25 },
    fade: { type: "range", label: "Radial fade", default: 45, min: 0, max: 100, step: 5 },
    axes: { type: "toggle", label: "Centre axes", default: false },
  },
  presets: {
    Graph: { background: "#F4F1E8", lines: "#4A79A8", major: "#2B5D8C" },
    Blueprint: { background: "#123E6B", lines: "#9CC3EA", major: "#E8F2FC" },
    Engineer: { background: "#EAF1E4", lines: "#6E9A6A", major: "#2F5E3A" },
    Midnight: { background: "#0E0F14", lines: "#3A4258", major: "#7B8CFF" },
  },
};

function hex(h) {
  const n = parseInt(String(h).replace("#", "").slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex(c) {
  return "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function lum(c) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}
function contrast(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function mix(a, b, t) { return [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t); }
function ensure(fg, bg, min) {
  let c = hex(fg);
  const b = hex(bg);
  const target = lum(b) > 0.4 ? [0, 0, 0] : [255, 255, 255];
  for (let i = 0; i < 14 && contrast(c, b) < min; i++) c = mix(c, target, 0.18);
  return toHex(c);
}

function tile(id, s, x, y, body) {
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${s}" height="${s}">${body}</pattern>`;
}
function edges(s) { return `M0 0V${s}M${s} 0V${s}M0 0H${s}M0 ${s}H${s}`; }
function corners(s, fn) { return [[0, 0], [s, 0], [0, s], [s, s]].map(([x, y]) => fn(x, y)).join(""); }

export default function render(p) {
  const W = 1200, H = 800;
  const c = p.cell, M = c * p.interval;
  const ox = (W / 2) % M, oy = (H / 2) % M;
  const bgc = hex(p.background);
  const light = lum(bgc) > 0.35;
  const minorCol = ensure(p.lines, p.background, 1.6);
  const majorCol = ensure(p.major, p.background, 2.6);
  const op = p.opacity, opM = Math.min(1, op * 1.6 + 0.08);
  const w = p.weight, wM = w * 1.8;

  let minorBody = "", majorBody = "";
  if (p.style === "lines") {
    minorBody = `<path d="${edges(c)}" fill="none" stroke="${minorCol}" stroke-width="${w}" stroke-opacity="${op}"/>`;
    majorBody = `<path d="${edges(M)}" fill="none" stroke="${majorCol}" stroke-width="${wM}" stroke-opacity="${opM}"/>`;
  } else if (p.style === "dots") {
    const r = Math.max(0.8, w * 1.1), R = Math.max(1.6, w * 2.3);
    minorBody = `<g fill="${minorCol}" fill-opacity="${Math.min(1, op + 0.15)}">${corners(c, (x, y) => `<circle cx="${x}" cy="${y}" r="${r}"/>`)}</g>`;
    majorBody = `<g fill="${majorCol}" fill-opacity="${opM}">${corners(M, (x, y) => `<circle cx="${x}" cy="${y}" r="${R}"/>`)}</g>`;
  } else {
    const a = Math.max(2.5, c * 0.2);
    minorBody = `<path d="${corners(c, (x, y) => `M${x - a} ${y}H${x + a}M${x} ${y - a}V${y + a}`)}" fill="none" stroke="${minorCol}" stroke-width="${w}" stroke-opacity="${Math.min(1, op + 0.1)}" stroke-linecap="round"/>`;
    majorBody = `<path d="${edges(M)}" fill="none" stroke="${majorCol}" stroke-width="${w * 1.2}" stroke-opacity="${opM * 0.75}"/>`;
  }

  const shade = toHex(mix(bgc, light ? [60, 50, 40] : [0, 0, 0], light ? 0.08 : 0.38));
  const glow = toHex(mix(bgc, [255, 255, 255], light ? 0.4 : 0.07));

  const f = p.fade / 100;
  let mask = "", maskAttr = "";
  if (f > 0) {
    const solid = 0.78 - 0.62 * f;
    const end = Math.max(0, 1 - 2 * f);
    const midOff = solid + (1 - solid) * 0.5;
    const midOp = end + (1 - end) * 0.38;
    mask = `<radialGradient id="fg" cx="0.5" cy="0.5" r="0.71">` +
      `<stop offset="0" stop-color="#fff"/>` +
      `<stop offset="${solid.toFixed(3)}" stop-color="#fff"/>` +
      `<stop offset="${midOff.toFixed(3)}" stop-color="#fff" stop-opacity="${midOp.toFixed(3)}"/>` +
      `<stop offset="1" stop-color="#fff" stop-opacity="${end.toFixed(3)}"/></radialGradient>` +
      `<mask id="fm" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#fg)"/></mask>`;
    maskAttr = ` mask="url(#fm)"`;
  }

  let axes = "";
  if (p.axes) {
    const aw = Math.max(1.5, wM * 1.3);
    const t = Math.max(5, Math.min(10, c * 0.35));
    const ticks = [];
    for (let x = W / 2 - Math.floor(W / 2 / c) * c; x <= W; x += c) {
      if (Math.abs(x - W / 2) < 1) continue;
      const big = Math.abs(((x - W / 2) / M) - Math.round((x - W / 2) / M)) < 0.001;
      const l = big ? t : t * 0.5;
      ticks.push(`M${x.toFixed(1)} ${H / 2 - l}V${H / 2 + l}`);
    }
    for (let y = H / 2 - Math.floor(H / 2 / c) * c; y <= H; y += c) {
      if (Math.abs(y - H / 2) < 1) continue;
      const big = Math.abs(((y - H / 2) / M) - Math.round((y - H / 2) / M)) < 0.001;
      const l = big ? t : t * 0.5;
      ticks.push(`M${W / 2 - l} ${y.toFixed(1)}H${W / 2 + l}`);
    }
    axes = `<g stroke="${majorCol}" stroke-linecap="round" fill="none">` +
      `<path d="M0 ${H / 2}H${W}M${W / 2} 0V${H}" stroke-width="${aw}" stroke-opacity="${Math.min(1, opM + 0.15)}"/>` +
      `<path d="${ticks.join("")}" stroke-width="${(aw * 0.75).toFixed(2)}" stroke-opacity="${opM}"/></g>` +
      `<circle cx="${W / 2}" cy="${H / 2}" r="${(aw * 2.4).toFixed(2)}" fill="${majorCol}"/>`;
  }

  const defs = `<defs>` +
    `<radialGradient id="bg" cx="0.5" cy="0.45" r="0.75"><stop offset="0" stop-color="${glow}"/><stop offset="0.55" stop-color="${p.background}"/><stop offset="1" stop-color="${shade}"/></radialGradient>` +
    `<filter id="gr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 ${light ? 0.2 : 1} 0 0 0 0 ${light ? 0.16 : 1} 0 0 0 0 ${light ? 0.1 : 1} 0 0 0 ${light ? 0.09 : 0.05} 0"/></filter>` +
    tile("mn", c, ox, oy, minorBody) + tile("mj", M, ox, oy, majorBody) + mask + `</defs>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}` +
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>` +
    `<rect width="${W}" height="${H}" filter="url(#gr)"/>` +
    `<g${maskAttr}><rect width="${W}" height="${H}" fill="url(#mn)"/><rect width="${W}" height="${H}" fill="url(#mj)"/>${axes}</g></svg>`;
}
