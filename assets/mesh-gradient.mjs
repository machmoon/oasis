// Soft mesh gradient: overlapping blurred colour fields, the look of Stripe/Linear hero backgrounds.
export const meta = {
  title: "Lagoon Mesh Gradient",
  kind: "background",
  description: "Soft, blurred colour fields for hero sections, wallpapers and slide backgrounds.",
  tags: ["gradient", "mesh", "background", "hero", "wallpaper", "blur"],
  price: 0,
  author: "oasis",
  size: [1200, 800],
};

export const params = {
  knobs: {
    base: { type: "color", label: "Base", default: "#0E2A3B" },
    c1: { type: "color", label: "Glow 1", default: "#2BB3A3" },
    c2: { type: "color", label: "Glow 2", default: "#F2B880" },
    c3: { type: "color", label: "Glow 3", default: "#6C5CE7" },
    seed: { type: "range", label: "Arrangement", default: 7, min: 1, max: 99, step: 1 },
    softness: { type: "range", label: "Softness", default: 140, min: 40, max: 260, step: 5 },
    spread: { type: "range", label: "Spread", default: 0.55, min: 0.25, max: 0.9, step: 0.01 },
    grain: { type: "toggle", label: "Film grain", default: true },
    aspect: { type: "choice", label: "Format", default: "landscape", options: ["landscape", "square", "portrait", "story"] },
  },
  presets: {
    Lagoon: { base: "#0E2A3B", c1: "#2BB3A3", c2: "#F2B880", c3: "#6C5CE7" },
    Dune: { base: "#F6EBDD", c1: "#E8A33D", c2: "#D96C4E", c3: "#F7D9B0" },
    Aurora: { base: "#05060F", c1: "#00F5A0", c2: "#7B2FF7", c3: "#00C2FF" },
    Blush: { base: "#FFF4F2", c1: "#FFB4A2", c2: "#E5989B", c3: "#B5838D" },
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

const FORMATS = { landscape: [1200, 800], square: [1000, 1000], portrait: [800, 1000], story: [720, 1280] };

export default function render(p) {
  const [w, h] = FORMATS[p.aspect] || FORMATS.landscape;
  const r = rng(p.seed * 9973);
  const colors = [p.c1, p.c2, p.c3, p.c2, p.c1, p.c3];
  let defs = "", fields = "";
  const reach = (0.45 + p.spread * 0.6) * Math.max(w, h);
  colors.forEach((c, i) => {
    // Anchor fields around the edges and corners so colour reaches the frame, like a real mesh.
    const ang = (i / colors.length) * Math.PI * 2 + r() * 1.2;
    const rad = 0.18 + r() * 0.42;
    const cx = w / 2 + Math.cos(ang) * rad * w, cy = h / 2 + Math.sin(ang) * rad * h;
    const rr = reach * (0.55 + r() * 0.45);
    const fall = Math.min(0.95, Math.max(0.25, p.softness / 280));
    defs += `<radialGradient id="f${i}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rr.toFixed(1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c}" stop-opacity="${(0.85 + r() * 0.15).toFixed(2)}"/><stop offset="${(1 - fall * 0.7).toFixed(2)}" stop-color="${c}" stop-opacity="0.35"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
    fields += `<rect width="${w}" height="${h}" fill="url(#f${i})"/>`;
  });
  const grain = p.grain
    ? `<filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.12 0"/></filter><rect width="${w}" height="${h}" filter="url(#g)"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${defs}</defs><rect width="${w}" height="${h}" fill="${p.base}"/>${fields}${grain}</svg>`;
}
