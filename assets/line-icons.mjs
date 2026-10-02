// Line icon set. Glyph geometry is from Lucide (lucide-icons/lucide, ISC licence); the program adds
// stroke, corner, style, container and layout knobs so one set fits any brand.
export const meta = {
  title: "Oasis Line Icons",
  kind: "icons",
  description: "24 crisp line icons with brand-tunable stroke, style and containers. Show one or the whole sheet.",
  tags: ["icons", "icon set", "ui", "line", "outline", "duotone", "app"],
  price: 0,
  author: "oasis",
  credit: "Glyphs from Lucide (ISC)",
  size: [512, 512],
};

const ICONS = {"house":"<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\" /><path d=\"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\" />","search":"<path d=\"m21 21-4.34-4.34\" /><circle cx=\"11\" cy=\"11\" r=\"8\" />","heart":"<path d=\"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5\" />","star":"<path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\" />","bell":"<path d=\"M10.268 21a2 2 0 0 0 3.464 0\" /><path d=\"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326\" />","camera":"<path d=\"M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z\" /><circle cx=\"12\" cy=\"13\" r=\"3\" />","palette":"<path d=\"M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z\" /><circle cx=\"13.5\" cy=\"6.5\" r=\".5\" fill=\"currentColor\" /><circle cx=\"17.5\" cy=\"10.5\" r=\".5\" fill=\"currentColor\" /><circle cx=\"6.5\" cy=\"12.5\" r=\".5\" fill=\"currentColor\" /><circle cx=\"8.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\" />","brush":"<path d=\"m11 10 3 3\" /><path d=\"M6.5 21A3.5 3.5 0 1 0 3 17.5a2.62 2.62 0 0 1-.708 1.792A1 1 0 0 0 3 21z\" /><path d=\"M9.969 17.031 21.378 5.624a1 1 0 0 0-3.002-3.002L6.967 14.031\" />","sparkles":"<path d=\"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z\" /><path d=\"M20 2v4\" /><path d=\"M22 4h-4\" /><circle cx=\"4\" cy=\"20\" r=\"2\" />","cloud":"<path d=\"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z\" />","sun":"<circle cx=\"12\" cy=\"12\" r=\"4\" /><path d=\"M12 2v2\" /><path d=\"M12 20v2\" /><path d=\"m4.93 4.93 1.41 1.41\" /><path d=\"m17.66 17.66 1.41 1.41\" /><path d=\"M2 12h2\" /><path d=\"M20 12h2\" /><path d=\"m6.34 17.66-1.41 1.41\" /><path d=\"m19.07 4.93-1.41 1.41\" />","moon":"<path d=\"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401\" />","leaf":"<path d=\"M11 20a10 10 0 0010-10 25.9 25.9 0 00-1.04-7.281 1 1 0 00-1.755-.325C15.833 5.5 13 5.5 9.8 6.1A7 7 0 0011 20\" /><path d=\"M2 21a5 5 0 012.911-4.544C7.613 15.212 8.351 15.24 11 13\" />","coffee":"<path d=\"M10 2v2\" /><path d=\"M14 2v2\" /><path d=\"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1\" /><path d=\"M6 2v2\" />","music":"<path d=\"M9 18V5l12-2v13\" /><circle cx=\"6\" cy=\"18\" r=\"3\" /><circle cx=\"18\" cy=\"16\" r=\"3\" />","map-pin":"<path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\" /><circle cx=\"12\" cy=\"10\" r=\"3\" />","shopping-bag":"<path d=\"M16 10a4 4 0 0 1-8 0\" /><path d=\"M3.103 6.034h17.794\" /><path d=\"M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z\" />","user":"<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\" /><circle cx=\"12\" cy=\"7\" r=\"4\" />","settings":"<path d=\"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915\" /><circle cx=\"12\" cy=\"12\" r=\"3\" />","send":"<path d=\"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z\" /><path d=\"m21.854 2.147-10.94 10.939\" />","pen-tool":"<path d=\"M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z\" /><path d=\"m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18\" /><path d=\"m2.3 2.3 7.286 7.286\" /><circle cx=\"11\" cy=\"11\" r=\"2\" />","layers":"<path d=\"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z\" /><path d=\"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12\" /><path d=\"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17\" />","image":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\" /><circle cx=\"9\" cy=\"9\" r=\"2\" /><path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\" />","mail":"<path d=\"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7\" /><rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\" />"};

export const params = {
  knobs: {
    icon: { type: "choice", label: "Icon", default: "palette", options: Object.keys(ICONS) },
    layout: { type: "choice", label: "Layout", default: "sheet", options: ["single", "sheet"] },
    color: { type: "color", role: "ink", label: "Stroke", default: "#1C1A17" },
    accent: { type: "color", role: "primary", label: "Accent", default: "#E8A33D" },
    background: { type: "color", role: "background", label: "Background", default: "#F5F1EA" },
    stroke: { type: "range", label: "Stroke width", default: 2, min: 0.75, max: 3, step: 0.25 },
    style: { type: "choice", label: "Style", default: "duotone", options: ["outline", "duotone", "glyph"] },
    container: { type: "choice", label: "Container", default: "squircle", options: ["none", "circle", "squircle", "square"] },
    linecap: { type: "choice", label: "Line caps", default: "round", options: ["round", "square"] },
  },
  presets: {
    Ink: { color: "#1C1A17", accent: "#E8A33D", background: "#F5F1EA" },
    Lagoon: { color: "#0E3B43", accent: "#5CC8B5", background: "#E6F4F1" },
    Neon: { color: "#F5F5F5", accent: "#B4FF39", background: "#111114" },
    Berry: { color: "#3D0C2E", accent: "#FF5C8A", background: "#FFF0F4" },
  },
};

function glyph(name, p, x, y, scale) {
  const body = ICONS[name];
  const join = p.linecap === "round" ? "round" : "miter";
  const filled = p.style === "glyph";
  const duo = p.style === "duotone"
    ? `<g transform="translate(1.2 1.2)" fill="${p.accent}" stroke="${p.accent}" stroke-width="${p.stroke}" stroke-linejoin="round" opacity="0.55">${body}</g>`
    : "";
  return `<g transform="translate(${x} ${y}) scale(${scale})">${duo}<g fill="${filled ? p.color : "none"}" stroke="${filled ? p.background : p.color}" stroke-width="${filled ? p.stroke * 0.6 : p.stroke}" stroke-linecap="${p.linecap}" stroke-linejoin="${join}">${body.replace(/fill="currentColor"/g, `fill="${filled ? p.background : p.color}"`)}</g></g>`;
}

function container(p, x, y, s) {
  if (p.container === "none") return "";
  const rx = p.container === "circle" ? s / 2 : p.container === "squircle" ? s * 0.3 : s * 0.08;
  const fill = p.style === "glyph" ? p.accent : p.accent;
  return `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${rx}" fill="${fill}" fill-opacity="${p.style === "glyph" ? 1 : 0.18}"/>`;
}

export default function render(p) {
  const S = 512;
  if (p.layout === "sheet") {
    const names = Object.keys(ICONS), cols = 6, cell = S / cols, pad = cell * 0.14, box = cell - pad * 2;
    let out = "";
    names.forEach((n, i) => {
      const cx = (i % cols) * cell, cy = Math.floor(i / cols) * cell + (S - cell * 4) / 2;
      // The chosen icon is lifted out of the sheet with a ring, so the sheet doubles as a picker.
      if (n === p.icon) out += `<rect x="${cx + pad - 4}" y="${cy + pad - 4}" width="${box + 8}" height="${box + 8}" rx="${p.container === "circle" ? (box + 8) / 2 : box * 0.34}" fill="none" stroke="${p.accent}" stroke-width="3"/>`;
      out += container(p, cx + pad, cy + pad, box);
      const g = box * (p.container === "none" ? 0.8 : 0.56);
      out += glyph(n, p, cx + cell / 2 - g / 2, cy + cell / 2 - g / 2, g / 24);
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="${p.background}"/>${out}</svg>`;
  }
  const box = S * 0.72, o = (S - box) / 2;
  const g = p.container === "none" ? S * 0.7 : box * 0.58;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="${p.background}"/>${container(p, o, o, box)}${glyph(p.icon, p, S / 2 - g / 2, S / 2 - g / 2, g / 24)}</svg>`;
}
