// Layered wave divider: seeded, coherently drifting wave bands that blend from a hero colour into the next section.
export const meta = {
  title: "Tidal Dividers",
  kind: "background",
  description: "Layered, seeded wave dividers that blend from a hero colour into the next section, for landing pages and web sections.",
  tags: ["wave", "divider", "section", "hero", "web", "layered", "footer", "separator"],
  price: 0,
  author: "oasis-factory",
  size: [1440, 320],
};

export const params = {
  knobs: {
    background: { type: "color", label: "Hero background", default: "#14213D" },
    from: { type: "color", label: "Back wave", default: "#3A5BA0" },
    to: { type: "color", label: "Front wave (next section)", default: "#F6F1E7" },
    style: { type: "choice", label: "Wave style", default: "organic", options: ["smooth", "organic", "crest"] },
    layers: { type: "range", label: "Layers", default: 4, min: 2, max: 5, step: 1 },
    amplitude: { type: "range", label: "Amplitude", default: 60, min: 0, max: 100, step: 1 },
    frequency: { type: "range", label: "Frequency", default: 2, min: 0.5, max: 5, step: 0.5 },
    seed: { type: "range", label: "Seed", default: 21, min: 1, max: 200, step: 1 },
    height: { type: "range", label: "Height", default: 320, min: 160, max: 480, step: 8 },
    flip: { type: "toggle", label: "Flip (top edge)", default: false },
  },
  presets: {
    Midnight: { background: "#14213D", from: "#3A5BA0", to: "#F6F1E7" },
    Sunset: { background: "#2B1B3D", from: "#C9577A", to: "#FFE8C2" },
    Lagoon: { background: "#E8F6F3", from: "#8AD3C8", to: "#0E4F5E" },
    Forest: { background: "#F3EFE6", from: "#B9CBA7", to: "#2F4A3A" },
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

function hexToRgb(h) {
  const s = String(h).replace("#", "");
  const n = parseInt(s.length === 3 ? s.split("").map((c) => c + c).join("") : s, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

function waveValue(style, u, f, ph, hw) {
  const T = Math.PI * 2;
  if (style === "smooth") {
    return 0.8 * Math.sin(T * f * u + ph[0]) + 0.2 * Math.sin(T * f * 0.5 * u + ph[1]);
  }
  if (style === "crest") {
    return 0.85 * (1 - 2 * Math.abs(Math.sin(Math.PI * f * u + ph[0]))) + 0.15 * Math.sin(T * f * 0.5 * u + ph[1]);
  }
  const h = 0.26 * hw;
  return (0.62 + 0.26 - h) * Math.sin(T * f * u + ph[0]) + h * Math.sin(T * f * 2.2 * u + ph[1]) + 0.12 * Math.sin(T * f * 0.45 * u + ph[2]);
}

function curve(pts) {
  const f = (v) => v.toFixed(1);
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

export default function render(p) {
  const W = 1440;
  const H = Math.max(120, Math.round(p.height));
  const n = Math.max(2, Math.min(5, Math.round(p.layers)));
  const style = ["smooth", "organic", "crest"].includes(p.style) ? p.style : "organic";
  const freq = Math.max(0.25, Math.min(6, p.frequency));
  const r = rng(p.seed * 9973 + 17);
  const N = style === "crest" ? 160 : 96;
  const shadow = mix(p.to, "#000000", 0.72);
  const tame = 1 / Math.sqrt(Math.max(1, freq / 2));
  const hw = Math.min(1, 2 / freq);
  const phase0 = r() * Math.PI * 2;
  const phase1 = r() * Math.PI * 2;
  const phase2 = r() * Math.PI * 2;
  const drift = 0.7 + r() * 0.6;

  let defs = `<filter id="sh" x="-5%" y="-40%" width="110%" height="180%"><feDropShadow dx="0" dy="${(-H * 0.01).toFixed(1)}" stdDeviation="${(H * 0.026).toFixed(1)}" flood-color="${shadow}" flood-opacity="0.26"/></filter>`;
  let body = "";

  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const front = i === n - 1;
    const base = H * (0.3 + 0.47 * Math.pow(t, 1.15));
    const amp = (p.amplitude / 100) * H * 0.14 * tame * (1 - 0.22 * t);
    const fq = freq * (0.9 + 0.2 * r());
    const ph = [
      phase0 + i * drift + (r() - 0.5) * 0.6,
      phase1 + i * drift * 1.6 + (r() - 0.5) * 0.8,
      phase2 + i * 0.4,
    ];
    const pts = [];
    for (let k = 0; k <= N; k++) {
      const x = -40 + (k * (W + 80)) / N;
      pts.push([x, base - amp * waveValue(style, x / W, fq, ph, hw)]);
    }
    const edge = curve(pts);
    const d = `${edge} L${W + 40},${H + 12} L-40,${H + 12} Z`;
    const c = mix(p.from, p.to, t);
    let fill = c;
    if (!front) {
      defs += `<linearGradient id="l${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${mix(c, p.to, 0.3)}"/></linearGradient>`;
      fill = `url(#l${i})`;
    }
    body += `<path d="${d}" fill="${fill}"${i > 0 ? ' filter="url(#sh)"' : ""}/>`;
    body += `<path d="${edge}" fill="none" stroke="${mix(c, "#FFFFFF", 0.22)}" stroke-width="1.5" stroke-opacity="${front ? 0.35 : 0.5}" stroke-linecap="round"/>`;
  }

  const g = p.flip ? `<g transform="translate(0 ${H}) scale(1 -1)">${body}</g>` : `<g>${body}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="none"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="${p.background}"/>${g}</svg>`;
}
