// Geometric brand mark: petals, drops, arcs or fan blades woven around a centre with knockout gaps, plus a wordmark lockup.
export const meta = {
  title: "Petal Mark",
  kind: "brand",
  description: "A geometric logo symbol of rotated, interlocking petals with a wordmark below, for startup identities, app icons and pitch decks.",
  tags: ["logo", "brand mark", "symbol", "geometric", "identity", "petals", "wordmark", "tech"],
  price: 9,
  author: "oasis-factory",
  size: [640, 640],
};

export const params = {
  knobs: {
    primary: { type: "color", role: "primary", label: "Primary", default: "#4F46E5" },
    secondary: { type: "color", role: "secondary", label: "Secondary", default: "#22D3EE" },
    background: { type: "color", role: "background", label: "Background", default: "#F6F6FA" },
    style: { type: "choice", label: "Petal style", default: "petal", options: ["petal", "drop", "arc", "fan"] },
    petals: { type: "range", label: "Petals", default: 8, min: 3, max: 12, step: 1 },
    rotation: { type: "range", label: "Rotation", default: 24, min: -75, max: 75, step: 1 },
    gap: { type: "range", label: "Gap", default: 8, min: 0, max: 16, step: 1 },
    roundness: { type: "range", label: "Roundness", default: 85, min: 0, max: 100, step: 1 },
    gradient: { type: "toggle", label: "Gradient", default: true },
    wordmark: { type: "text", label: "Wordmark", default: "Lumina" },
  },
  presets: {
    Aurora: { primary: "#4F46E5", secondary: "#22D3EE", background: "#F6F6FA" },
    Ember: { primary: "#FF4D2E", secondary: "#FFB547", background: "#17110F" },
    Moss: { primary: "#1F5E4A", secondary: "#9ED2B4", background: "#F3F1EA" },
    Ultraviolet: { primary: "#7C3AED", secondary: "#F472B6", background: "#0E0B1A" },
  },
};

const D = Math.PI / 180;
const f = (v) => +v.toFixed(2);
const pt = (a) => `${f(a[0])},${f(a[1])}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function rgb(h) {
  const n = parseInt(String(h).replace("#", ""), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const x = rgb(a), y = rgb(b);
  return "#" + x.map((c, i) => Math.round(c + (y[i] - c) * t).toString(16).padStart(2, "0")).join("");
}
function lum(h) {
  const [r, g, b] = rgb(h).map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function lens(L, n, r, wf) {
  const w = L * clamp(2.6 / n, 0.22, 0.62) * wf, x = w / 2, m = -L / 2, h = r * L * 0.27;
  return `M0,0 C0,0 ${f(x)},${f(m + h)} ${f(x)},${f(m)} C${f(x)},${f(m - h)} 0,${f(-L)} 0,${f(-L)} ` +
    `C0,${f(-L)} ${f(-x)},${f(m - h)} ${f(-x)},${f(m)} C${f(-x)},${f(m + h)} 0,0 0,0Z`;
}

function drop(L, n, r, wf) {
  const hr = (L * clamp(2.8 / n, 0.3, 0.7) * wf) / 2, k = r * 0.5523 * hr, sy = -L + hr, k2 = k * 1.8;
  return `M0,0 C0,0 ${f(hr)},${f(sy + k2)} ${f(hr)},${f(sy)} C${f(hr)},${f(sy - k)} ${f(k)},${f(-L)} 0,${f(-L)} ` +
    `C${f(-k)},${f(-L)} ${f(-hr)},${f(sy - k)} ${f(-hr)},${f(sy)} C${f(-hr)},${f(sy + k2)} 0,0 0,0Z`;
}

function arc(L, n, r, wf) {
  const t = L * clamp(1.6 / n, 0.1, 0.26) * (0.4 + 0.6 * wf), m = L * 0.3, Ro = m + t / 2, Ri = m - t / 2, c = -L * 0.5;
  const P = (a, R) => [R * Math.cos(a), c + R * Math.sin(a)];
  const a0 = 100 * D, a1 = -100 * D, h = (r * 2 * t) / 3;
  const T1 = [Math.sin(a1) * h, -Math.cos(a1) * h], T0 = [-Math.sin(a0) * h, Math.cos(a0) * h];
  const po0 = P(a0, Ro), po1 = P(a1, Ro), pi1 = P(a1, Ri), pi0 = P(a0, Ri);
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
  return `M${pt(po0)} A${f(Ro)},${f(Ro)} 0 1 0 ${pt(po1)} C${pt(add(po1, T1))} ${pt(add(pi1, T1))} ${pt(pi1)} ` +
    `A${f(Ri)},${f(Ri)} 0 1 1 ${pt(pi0)} C${pt(add(pi0, T0))} ${pt(add(po0, T0))} ${pt(po0)}Z`;
}

function fan(L, n, r, wf) {
  const phi = clamp((360 / n) * 1.3 * wf, 24, 150) * D;
  const a1 = -Math.PI / 2 - phi / 2, a2 = -Math.PI / 2 + phi / 2;
  const c = r * L * Math.min(0.3, phi * 0.4), da = c / L;
  const at = (a, R) => [R * Math.cos(a), R * Math.sin(a)];
  return `M0,0 L${pt(at(a1, L - c))} Q${pt(at(a1, L))} ${pt(at(a1 + da, L))} ` +
    `A${f(L)},${f(L)} 0 0 1 ${pt(at(a2 - da, L))} Q${pt(at(a2, L))} ${pt(at(a2, L - c))}Z`;
}

const SHAPES = { petal: lens, drop, arc, fan };

export default function render(p) {
  const W = 640, H = 640;
  const text = String(p.wordmark || "").trim();
  const has = text.length > 0;
  const n = Math.round(clamp(p.petals, 3, 12));
  const gap = clamp(p.gap, 0, 16);
  const off = gap * 0.8;
  const R = has ? 148 : 178;
  const L = R - off;
  const cx = W / 2, cy = has ? 282 : H / 2;
  const r = clamp(p.roundness / 100, 0, 1);
  const rot = clamp(p.rotation, -75, 75);
  const wf = 1 - 0.38 * Math.min(1, Math.abs(rot) / 75);
  const d = (SHAPES[p.style] || lens)(L, n, r, wf);

  const tf = (i) => `translate(${cx} ${cy}) rotate(${f((i * 360) / n)}) translate(0 ${f(-off)}) rotate(${f(rot)})`;
  const fill = (i) => {
    if (p.gradient) return "url(#g)";
    const t = 1 - Math.abs((2 * i) / n - 1);
    return mix(p.primary, p.secondary, t);
  };

  let defs = `<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${f(L * 0.25)}" y2="${f(-L)}">` +
    `<stop offset="0" stop-color="${p.primary}"/><stop offset="1" stop-color="${p.secondary}"/></linearGradient>`;
  let body = "";
  for (let i = 0; i < n; i++) {
    const petal = `<path d="${d}" transform="${tf(i)}" fill="${fill(i)}"/>`;
    if (gap > 0) {
      const j = (i + 1) % n;
      defs += `<mask id="m${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">` +
        `<rect width="${W}" height="${H}" fill="#fff"/>` +
        `<path d="${d}" transform="${tf(j)}" fill="#000" stroke="#000" stroke-width="${f(gap * 1.6)}" stroke-linejoin="round"/></mask>`;
      body += `<g mask="url(#m${i})">${petal}</g>`;
    } else {
      body += petal;
    }
  }
  if (gap > 0) {
    defs += `<mask id="hub" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">` +
      `<rect width="${W}" height="${H}" fill="#fff"/><circle cx="${cx}" cy="${cy}" r="${f(off + gap * 0.9)}" fill="#000"/></mask>`;
    body = `<g mask="url(#hub)">${body}</g>`;
  }

  let word = "";
  if (has) {
    const base = lum(p.background) > 0.45 ? "#14141A" : "#F4F4F7";
    const ink = mix(base, p.primary, 0.12);
    const fs = f(Math.min(48, 500 / (text.length * 0.6)));
    word = `<text x="${cx}" y="${f(cy + R + 82)}" text-anchor="middle" fill="${ink}" ` +
      `font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="${fs}" font-weight="600" ` +
      `letter-spacing="${f(-fs * 0.02)}">${esc(text)}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<defs>${defs}</defs><rect width="${W}" height="${H}" fill="${p.background}"/>${body}${word}</svg>`;
}
