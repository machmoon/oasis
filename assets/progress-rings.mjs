// Activity progress rings: 1–3 concentric goal rings with overlap laps, centre summary and a labelled legend.
export const meta = {
  title: "Activity Rings",
  kind: "ui",
  description: "Concentric activity progress rings with percentages and a labelled legend for fitness dashboards, health apps and goal-tracking widgets.",
  tags: ["progress", "rings", "activity", "fitness", "dashboard", "widget", "chart", "health"],
  price: 2,
  author: "oasis-factory",
  size: [600, 760],
};

export const params = {
  knobs: {
    color1: { type: "color", label: "Ring 1 (outer)", default: "#FA114F" },
    color2: { type: "color", label: "Ring 2", default: "#A6F12C" },
    color3: { type: "color", label: "Ring 3 (inner)", default: "#1EEAEF" },
    theme: { type: "choice", label: "Theme", default: "dark", options: ["dark", "light"] },
    rings: { type: "range", label: "Rings", default: 3, min: 1, max: 3, step: 1 },
    value1: { type: "range", label: "Ring 1 %", default: 86, min: 0, max: 200, step: 1 },
    value2: { type: "range", label: "Ring 2 %", default: 58, min: 0, max: 200, step: 1 },
    value3: { type: "range", label: "Ring 3 %", default: 112, min: 0, max: 200, step: 1 },
    stroke: { type: "range", label: "Stroke width", default: 40, min: 8, max: 56, step: 1 },
    track: { type: "range", label: "Track opacity %", default: 22, min: 0, max: 60, step: 1 },
    roundCaps: { type: "toggle", label: "Rounded caps", default: true },
    labels: { type: "text", label: "Labels (comma separated)", default: "Move, Exercise, Stand" },
  },
  presets: {
    Activity: { color1: "#FA114F", color2: "#A6F12C", color3: "#1EEAEF" },
    Ember: { color1: "#FF5A1F", color2: "#FFB020", color3: "#FFE07A" },
    Ocean: { color1: "#3D5AFE", color2: "#00B8D9", color3: "#36D6A0" },
    Orchid: { color1: "#B44CFF", color2: "#FF5FA2", color3: "#FFC2D9" },
  },
};

const DEFAULT_LABELS = ["Move", "Exercise", "Stand"];
const FONT = "-apple-system, 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif";

function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(c, t, amt) {
  const a = hex(c), b = hex(t);
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * amt).toString(16).padStart(2, "0")).join("");
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function parseLabels(s) {
  const parts = String(s || "").split(",").map((x) => x.trim());
  return DEFAULT_LABELS.map((d, i) => {
    const v = parts[i] && parts[i].length ? parts[i] : d;
    return v.length > 14 ? v.slice(0, 13) + "…" : v;
  });
}

export default function render(p) {
  const W = 600, H = 760;
  const dark = p.theme === "dark";
  const bg = dark ? "#0B0C10" : "#F5F4F0";
  const ink = dark ? "#F4F4F6" : "#14151A";
  const muted = dark ? "#8A8D96" : "#6B6E76";
  const n = Math.max(1, Math.min(3, Math.round(p.rings)));
  const sw = p.stroke;
  const gap = Math.max(4, Math.round(sw * 0.14));
  const cx = 300, cy = 336, outer = 232;
  const cols = [p.color1, p.color2, p.color3];
  const vals = [p.value1, p.value2, p.value3].map((v) => Math.max(0, Math.min(200, Math.round(v))));
  const labels = parseLabels(p.labels);
  const cap = p.roundCaps ? "round" : "butt";
  const trackOp = (p.track / 100).toFixed(2);

  let defs = `<filter id="tip" x="-100%" y="-100%" width="300%" height="300%"><feDropShadow dx="0" dy="0" stdDeviation="${(sw * 0.18).toFixed(1)}" flood-color="#000" flood-opacity="${dark ? 0.75 : 0.32}"/></filter>`;
  defs += `<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${p.color1}" stop-opacity="${dark ? 0.14 : 0.08}"/><stop offset="1" stop-color="${p.color1}" stop-opacity="0"/></radialGradient>`;

  let rings = "";
  for (let i = 0; i < n; i++) {
    const c = cols[i], v = vals[i];
    const r = outer - sw / 2 - i * (sw + gap);
    const len = 2 * Math.PI * r;
    const hi = mix(c, "#FFFFFF", dark ? 0.22 : 0.12);
    const lo = mix(c, "#000000", dark ? 0.06 : 0.12);
    defs += `<linearGradient id="g${i}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${hi}"/><stop offset="1" stop-color="${lo}"/></linearGradient>`;
    const base = `cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="none" stroke-width="${sw}"`;
    const rot = `transform="rotate(-90 ${cx} ${cy})"`;
    const tail = (len + sw * 4).toFixed(2);
    rings += `<circle ${base} stroke="${c}" stroke-opacity="${trackOp}"/>`;
    if (v <= 100) {
      if (v === 0 && !p.roundCaps) continue;
      const dash = ((len * v) / 100).toFixed(2);
      rings += `<circle ${base} ${rot} stroke="url(#g${i})" stroke-linecap="${cap}" stroke-dasharray="${dash} ${tail}"/>`;
    } else {
      rings += `<circle ${base} stroke="url(#g${i})"/>`;
      const frac = (v - 100) / 100;
      const extra = (len * frac).toFixed(2);
      rings += `<circle ${base} ${rot} stroke="${hi}" stroke-linecap="${cap}" stroke-dasharray="${extra} ${tail}"/>`;
      const a = -90 + 360 * frac;
      const rad = (a * Math.PI) / 180;
      const tx = (cx + r * Math.cos(rad)).toFixed(2), ty = (cy + r * Math.sin(rad)).toFixed(2);
      const frame = `translate(${tx} ${ty}) rotate(${(a + 90).toFixed(2)})`;
      defs += `<clipPath id="tc${i}"><rect x="0" y="${(-sw / 2).toFixed(2)}" width="${(sw * 0.8).toFixed(2)}" height="${sw}" transform="${frame}"/></clipPath>`;
      const shape = p.roundCaps
        ? `<circle cx="0" cy="0" r="${(sw / 2).toFixed(2)}" fill="${hi}" transform="${frame}" filter="url(#tip)"/>`
        : `<rect x="${(-sw * 0.5).toFixed(2)}" y="${(-sw / 2).toFixed(2)}" width="${(sw * 0.5).toFixed(2)}" height="${sw}" fill="${hi}" transform="${frame}" filter="url(#tip)"/>`;
      rings += `<g clip-path="url(#tc${i})">${shape}</g>`;
    }
  }

  const innerR = outer - sw - (n - 1) * (sw + gap);
  let centre = "";
  if (innerR > 46) {
    const shown = n === 1 ? vals[0] : Math.round(vals.slice(0, n).reduce((a, b) => a + b, 0) / n);
    const fs = Math.min(76, Math.round(innerR * 0.56));
    const capText = n === 1 ? labels[0] : "Average";
    const showCap = innerR > 70;
    const ty = cy + fs * 0.34 - (showCap ? fs * 0.18 : 0);
    centre += `<text x="${cx}" y="${ty.toFixed(1)}" text-anchor="middle" font-family="${FONT}" font-size="${fs}" font-weight="700" letter-spacing="${(-fs * 0.03).toFixed(1)}" fill="${ink}">${shown}<tspan font-size="${Math.round(fs * 0.45)}" font-weight="600" fill="${muted}" dx="2">%</tspan></text>`;
    if (showCap) {
      const cs = Math.max(11, Math.round(fs * 0.19));
      centre += `<text x="${cx}" y="${(ty + cs * 2).toFixed(1)}" text-anchor="middle" font-family="${FONT}" font-size="${cs}" font-weight="600" letter-spacing="${(cs * 0.16).toFixed(1)}" fill="${muted}">${esc(capText.toUpperCase())}</text>`;
    }
  }

  const left = 48, span = W - 2 * left, colW = span / n;
  let legend = `<line x1="${left}" y1="604" x2="${W - left}" y2="604" stroke="${muted}" stroke-opacity="0.22" stroke-width="1"/>`;
  for (let i = 0; i < n; i++) {
    const xc = left + colW * (i + 0.5), x = xc.toFixed(1);
    if (i > 0) legend += `<line x1="${(left + colW * i).toFixed(1)}" y1="636" x2="${(left + colW * i).toFixed(1)}" y2="722" stroke="${muted}" stroke-opacity="0.16" stroke-width="1"/>`;
    legend += `<rect x="${(xc - 11).toFixed(1)}" y="636" width="22" height="5" rx="${p.roundCaps ? 2.5 : 0}" fill="${cols[i]}"/>`;
    legend += `<text x="${x}" y="670" text-anchor="middle" font-family="${FONT}" font-size="12.5" font-weight="600" letter-spacing="2.2" fill="${muted}">${esc(labels[i].toUpperCase())}</text>`;
    legend += `<text x="${x}" y="716" text-anchor="middle" font-family="${FONT}" font-size="40" font-weight="700" letter-spacing="-1" fill="${ink}">${vals[i]}<tspan font-size="20" font-weight="600" fill="${muted}" dx="2">%</tspan></text>`;
  }

  const header =
    `<text x="${left}" y="66" font-family="${FONT}" font-size="25" font-weight="700" letter-spacing="-0.4" fill="${ink}">Activity</text>` +
    `<text x="${W - left}" y="66" text-anchor="end" font-family="${FONT}" font-size="15" font-weight="500" fill="${muted}">Today</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="${bg}"/><circle cx="${cx}" cy="${cy}" r="300" fill="url(#glow)"/>${header}${rings}${centre}${legend}</svg>`;
}
