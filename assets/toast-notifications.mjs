// Stacked toast notifications: success, warning and error cards with themed surfaces, accent tint and density.
export const meta = {
  title: "Toast Stack",
  kind: "ui",
  description: "A polished stack of success, warning and error toasts for UI kits, product mockups and design system docs.",
  tags: ["toast", "notification", "alert", "snackbar", "ui kit", "status", "design system", "dark mode"],
  price: 3,
  author: "oasis-factory",
  size: [560, 380],
};

export const params = {
  knobs: {
    success: { type: "color", role: "primary", label: "Success", default: "#16A34A" },
    warning: { type: "color", role: "highlight", label: "Warning", default: "#F59E0B" },
    error: { type: "color", role: "secondary", label: "Error", default: "#E5484D" },
    backdrop: { type: "color", role: "background", label: "Backdrop", default: "#EEF0F3" },
    theme: { type: "choice", label: "Theme", default: "auto", options: ["auto", "light", "dark"] },
    density: { type: "choice", label: "Density", default: "comfortable", options: ["compact", "comfortable"] },
    accent: { type: "choice", label: "Accent style", default: "soft", options: ["soft", "solid", "stripe"] },
    radius: { type: "range", label: "Corner radius", default: 14, min: 0, max: 28, step: 1 },
    tint: { type: "range", label: "Tint strength", default: 6, min: 0, max: 40, step: 1 },
    close: { type: "toggle", label: "Close button", default: true },
  },
  presets: {
    Classic: { success: "#16A34A", warning: "#F59E0B", error: "#E5484D", backdrop: "#EEF0F3" },
    Midnight: { success: "#3DD68C", warning: "#FFB224", error: "#FF6369", backdrop: "#0E0F13" },
    Clay: { success: "#2F7D5B", warning: "#C2832B", error: "#B8463F", backdrop: "#F2EDE6" },
    Electric: { success: "#00B386", warning: "#FFC53D", error: "#FF4D6D", backdrop: "#E6EAFF" },
  },
};

const TOASTS = [
  { k: "success", title: "Changes saved", body: "Your project is now live on production.", time: "now" },
  { k: "warning", title: "Storage almost full", body: "You\u2019ve used 92% of your 10 GB plan.", time: "2m" },
  { k: "error", title: "Payment failed", body: "We couldn\u2019t charge the card ending in 4242.", time: "5m" },
];

const GLYPH = {
  success: '<path d="M7.2 12.4l3.2 3.2 6.6-6.8"/>',
  warning: '<path d="M12 7.2v5.6"/><path d="M12 16.6v.01"/>',
  error: '<path d="M8.6 8.6l6.8 6.8M15.4 8.6l-6.8 6.8"/>',
};

const FONT = "-apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif";

function rgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hex(c) {
  return "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}
function mix(a, b, t) {
  const x = rgb(a), y = rgb(b);
  t = Math.max(0, Math.min(1, t));
  return hex(x.map((v, i) => v + (y[i] - v) * t));
}
function lum(h) {
  const [r, g, b] = rgb(h);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export default function render(p) {
  const W = 560, H = 380;
  const dark = p.theme === "dark" || (p.theme === "auto" && lum(p.backdrop) < 0.4);
  const compact = p.density === "compact";
  const T = dark
    ? { surface: "#1B1C21", title: "#F3F4F6", body: "#A3A7B1", meta: "#6F7380", edge: "#FFFFFF", edgeA: 0.09, shadow: 0.42 }
    : { surface: "#FFFFFF", title: "#12141A", body: "#5C6170", meta: "#9A9EA8", edge: "#0B0D12", edgeA: 0.08, shadow: 0.1 };

  const D = compact
    ? { h: 60, gap: 10, pad: 14, badge: 28, gapX: 12, ts: 13, bs: 12, tY: 25, bY: 43 }
    : { h: 82, gap: 14, pad: 18, badge: 36, gapX: 14, ts: 14.5, bs: 13, tY: 33, bY: 54 };

  const w = 440;
  const tx = (W - w) / 2;
  const total = D.h * 3 + D.gap * 2;
  const y0 = (H - total) / 2;
  const rad = Math.min(p.radius, D.h / 2);
  const bRad = Math.min(p.radius * 0.6, D.badge / 2);
  const tint = p.tint / 100;
  const inset = D.pad + Math.max(0, rad - D.pad) * 0.45;
  const chipFlip = Math.max(0, Math.min(1, (tint - 0.1) / 0.15));
  const glow = mix(p.backdrop, lum(p.backdrop) > 0.5 ? "#FFFFFF" : "#2A2D36", 0.45);

  let defs = `<radialGradient id="bg" cx="0.5" cy="0.42" r="0.75"><stop offset="0" stop-color="${glow}"/><stop offset="1" stop-color="${p.backdrop}"/></radialGradient>`;
  defs += `<filter id="sh" x="-20%" y="-40%" width="140%" height="200%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#0B0D12" flood-opacity="${(T.shadow * 0.6).toFixed(2)}"/><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#0B0D12" flood-opacity="${T.shadow}"/></filter>`;

  let body = "";
  TOASTS.forEach((t, i) => {
    const acc = p[t.k];
    const ty = y0 + i * (D.h + D.gap);
    const fill = mix(T.surface, acc, tint);
    const ink = dark ? mix(acc, "#FFFFFF", 0.72) : mix(acc, "#000000", 0.72);
    const titleCol = mix(T.title, ink, tint * 0.5);
    const bodyCol = mix(T.body, ink, tint * 1.3);
    const metaCol = mix(T.meta, ink, tint * 1.4);
    const soft = p.accent === "soft";
    const edgeCol = soft ? mix(T.edge, acc, 0.55) : T.edge;
    const edgeA = (soft ? T.edgeA * 2.2 : T.edgeA) * (1 - tint * 0.8);
    defs += `<clipPath id="c${i}"><rect x="${tx}" y="${ty}" width="${w}" height="${D.h}" rx="${rad}"/></clipPath>`;

    let card = `<rect x="${tx}" y="${ty}" width="${w}" height="${D.h}" rx="${rad}" fill="${fill}" filter="url(#sh)"/>`;
    if (p.accent === "stripe") {
      card += `<rect x="${tx}" y="${ty}" width="4" height="${D.h}" fill="${acc}" clip-path="url(#c${i})"/>`;
    }
    card += `<rect x="${tx + 0.5}" y="${ty + 0.5}" width="${w - 1}" height="${D.h - 1}" rx="${Math.max(0, rad - 0.5)}" fill="none" stroke="${edgeCol}" stroke-opacity="${edgeA.toFixed(3)}"/>`;

    const bx = tx + inset + (p.accent === "stripe" ? 4 : 0);
    const by = ty + (D.h - D.badge) / 2;
    let badgeFill, glyphCol;
    if (p.accent === "solid") {
      badgeFill = acc;
      glyphCol = lum(acc) > 0.62 ? "#1A1B1F" : "#FFFFFF";
    } else {
      const tintedChip = mix(fill, acc, dark ? 0.2 : 0.14);
      const liftChip = dark ? mix(fill, "#000000", 0.28) : mix(fill, "#FFFFFF", 0.62);
      badgeFill = mix(tintedChip, liftChip, chipFlip);
      glyphCol = dark ? mix(acc, "#FFFFFF", 0.15) : mix(acc, "#000000", lum(acc) > 0.6 ? 0.25 : 0.05);
    }
    const s = D.badge / 24;
    card += `<rect x="${bx}" y="${by}" width="${D.badge}" height="${D.badge}" rx="${bRad}" fill="${badgeFill}"/>`;
    card += `<g transform="translate(${bx} ${by}) scale(${s.toFixed(4)})" fill="none" stroke="${glyphCol}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${GLYPH[t.k]}</g>`;

    const textX = bx + D.badge + D.gapX;
    const titleY = ty + D.tY;
    card += `<text x="${textX}" y="${titleY}" font-family="${FONT}" font-size="${D.ts}" font-weight="600" letter-spacing="-0.15" fill="${titleCol}">${t.title}</text>`;
    card += `<text x="${textX}" y="${ty + D.bY}" font-family="${FONT}" font-size="${D.bs}" fill="${bodyCol}">${t.body}</text>`;

    let rightX = tx + w - inset;
    if (p.close) {
      const cx = rightX - 5, cy = titleY - D.ts * 0.34, r = compact ? 4 : 4.5;
      card += `<path d="M${cx - r},${cy - r}L${cx + r},${cy + r}M${cx + r},${cy - r}L${cx - r},${cy + r}" stroke="${metaCol}" stroke-width="1.6" stroke-linecap="round"/>`;
      rightX -= 22;
    }
    if (!compact) {
      card += `<text x="${rightX}" y="${titleY}" text-anchor="end" font-family="${FONT}" font-size="12" fill="${metaCol}">${t.time}</text>`;
    }
    body += `<g>${card}</g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="url(#bg)"/>${body}</svg>`;
}
