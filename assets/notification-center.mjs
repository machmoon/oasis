// Notification center dropdown: grouped activity feed with unread dots, avatars, inline actions and an empty state.
export const meta = {
  title: "Notification Center",
  kind: "ui",
  description: "A polished dropdown notification panel with tabs, grouped items, unread states, avatars, inline actions and an empty state, for app UI mockups and design systems.",
  tags: ["notifications", "dropdown", "ui kit", "inbox", "activity feed", "web app", "dashboard", "empty state"],
  price: 7,
  author: "oasis-factory",
  size: [520, 880],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Canvas", default: "#EEF0F5" },
    primary: { type: "color", role: "primary", label: "Accent", default: "#4F46E5" },
    theme: { type: "choice", label: "Theme", default: "light", options: ["light", "dark"] },
    tab: { type: "choice", label: "Active tab", default: "all", options: ["all", "mentions"] },
    avatar: { type: "choice", label: "Avatar shape", default: "circle", options: ["circle", "rounded", "square"] },
    items: { type: "range", label: "Items", default: 5, min: 1, max: 8, step: 1 },
    unread: { type: "range", label: "Unread", default: 3, min: 0, max: 8, step: 1 },
    radius: { type: "range", label: "Corner radius", default: 16, min: 4, max: 24, step: 1 },
    empty: { type: "toggle", label: "Empty state", default: false },
    actions: { type: "toggle", label: "Action buttons", default: true },
  },
  presets: {
    Ember: { background: "#F6EFE9", primary: "#E2552D" },
    Forest: { background: "#E8EFEA", primary: "#1F7A52" },
    Lagoon: { background: "#E6F2F3", primary: "#0E8A9A" },
    Midnight: { background: "#0F1220", primary: "#8B7CFF" },
  },
};

const DATA = [
  { n: "Maya Chen", v: "mentioned you in", o: "Onboarding flow", t: "2m ago", k: "Comment", g: 0, m: 1, snip: "@Alex can we tighten the spacing on step 3?" },
  { n: "Leo Park", v: "invited you to", o: "Brand Refresh", t: "18m ago", k: "Project invite", g: 0, act: ["Accept", "Decline"] },
  { n: "Priya Nair", v: "replied to you in", o: "Pricing page", t: "1h ago", k: "Reply", g: 0, m: 1, snip: "Agreed \u2014 let\u2019s ship the annual toggle first." },
  { n: "Sam Ortiz", v: "shared a file in", o: "Q3 Launch", t: "3h ago", k: "File", g: 0, file: ["launch-deck-v4.fig", "12.4 MB"] },
  { n: "Ana Ruiz", v: "requested access to", o: "Design System", t: "Yesterday", k: "Access request", g: 1, act: ["Approve", "Deny"] },
  { n: "Jonah Lee", v: "mentioned you in", o: "Sprint 14 notes", t: "Yesterday", k: "Comment", g: 1, m: 1, snip: "@Alex owns the empty-state audit this week." },
  { n: "Kofi Mensah", v: "approved", o: "Mobile nav v2", t: "Mon", k: "Review", g: 1 },
  { n: "Elise Hart", v: "tagged you on", o: "Icon review", t: "Sun", k: "Comment", g: 1, m: 1, snip: "Love the new 2px stroke \u2014 one nit on the bell." },
];

const BELL = `<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>`;
const GEAR = `<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>`;
const DOC = `M8 5.5h5l3.5 3.5v9.5H8zM13 5.5V9h3.5`;

const cl = (v, a, b) => Math.max(a, Math.min(b, v));

function lch(hx) {
  const n = parseInt(hx.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), h: Math.atan2(B, A) };
}

function hex(L, C, h) {
  for (let i = 0; i < 24; i++) {
    const A = C * Math.cos(h), B = C * Math.sin(h);
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
    if (rgb.every((v) => v >= -0.001 && v <= 1.001) || i === 23)
      return "#" + rgb.map((v) => { v = cl(v, 0, 1); v = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; return Math.round(v * 255).toString(16).padStart(2, "0"); }).join("");
    C *= 0.85;
  }
}

function tokens(p) {
  const bg = lch(p.background), pr = lch(p.primary), dk = p.theme === "dark";
  const nh = bg.h, nc = Math.min(bg.C, 0.035);
  const cL = dk ? cl(bg.L, 0.14, 0.21) : cl(bg.L, 0.88, 0.95);
  const sL = dk ? cL + 0.08 : 0.995;
  const aL = dk ? Math.max(pr.L, 0.72) : Math.min(pr.L, 0.56);
  const avL = dk ? [0.46, 0.62, 0.36, 0.72, 0.54] : [0.86, 0.66, 0.78, 0.5, 0.92];
  return {
    dk,
    canvas: hex(cL, Math.min(bg.C, 0.045), nh),
    panel: hex(sL, nc * 0.25, nh),
    well: hex(dk ? sL + 0.05 : sL - 0.03, nc * 0.5, nh),
    line: hex(dk ? sL + 0.09 : sL - 0.085, nc * 0.6, nh),
    ink: hex(dk ? 0.96 : 0.23, 0.012, nh),
    muted: hex(dk ? 0.73 : 0.5, 0.015, nh),
    accent: hex(aL, pr.C, pr.h),
    onAccent: aL > 0.66 ? hex(0.2, 0.03, pr.h) : "#FFFFFF",
    tint: hex(dk ? sL + 0.035 : 0.972, dk ? 0.03 : 0.02, pr.h),
    tintStrong: hex(dk ? sL + 0.08 : 0.93, Math.min(pr.C, dk ? 0.06 : 0.05), pr.h),
    av: (i) => {
      const L = avL[i % 5], c = Math.min(Math.max(pr.C, 0.04), 0.13) * (0.55 + 0.15 * (i % 3));
      return [hex(L, c, pr.h), L > 0.66 ? hex(0.28, Math.min(pr.C, 0.08), pr.h) : hex(0.98, 0.01, pr.h)];
    },
    shadow: dk ? 0.5 : 0.13,
  };
}

export default function render(p) {
  const W = 520, H = 880, t = tokens(p), R = p.radius;
  const F = "Helvetica Neue, Helvetica, Arial, sans-serif";
  const N = Math.round(p.items), U = p.empty ? 0 : Math.min(Math.round(p.unread), N);
  const feed = DATA.slice(0, N).map((d, i) => i);
  const shown = p.empty ? [] : p.tab === "mentions" ? feed.filter((i) => DATA[i].m) : feed;
  const mentionU = feed.filter((i) => DATA[i].m && i < U).length;
  const PX = 40, PW = 440, PY = 84, bellX = 420, btnR = cl(R * 0.6, 3, 15);
  const arx = (s) => (p.avatar === "circle" ? s / 2 : p.avatar === "rounded" ? s * 0.3 : s * 0.12);
  const rh = (d, c) => {
    if (c) { let h = 50; if (d.snip) h += 28; if (d.file) h += 30; if (p.actions && d.act) h += 8; return h; }
    let h = 64; if (d.snip) h += 38; if (d.file) h += 48; if (p.actions && d.act) h += 40; return h;
  };
  const groups = [0, 1].filter((g) => shown.some((i) => DATA[i].g === g));
  const listH = (c) => 12 + groups.length * (c ? 26 : 30) + shown.reduce((s, i) => s + rh(DATA[i], c), 0);
  const compact = listH(false) > H - 24 - PY - 148;
  const bodyH = shown.length ? listH(compact) : 276;
  const PH = 148 + bodyH, BY = PY + 100, cx = PX + PW / 2;
  const txt = (x, y, size, fill, str, extra = "") => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${str}</text>`;
  const btn = (x, y, w, h, label, primary, fs = 12.5) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(btnR, h / 2)}" fill="${primary ? t.accent : t.panel}" stroke="${primary ? t.accent : t.line}"/>` +
    txt(x + w / 2, y + h / 2 + fs * 0.36, fs, primary ? t.onAccent : t.ink, label, `font-weight="600" text-anchor="middle"`);

  let s = `<rect width="${W}" height="${H}" fill="${t.canvas}"/><rect width="${W}" height="${H}" fill="url(#glow)"/>`;
  s += `<rect x="24" y="16" width="472" height="52" rx="${Math.min(R + 6, 26)}" fill="${t.panel}" stroke="${t.line}"/>`;
  s += `<rect x="40" y="30" width="24" height="24" rx="${Math.min(R * 0.45, 8)}" fill="${t.accent}"/><circle cx="52" cy="42" r="5" fill="none" stroke="${t.onAccent}" stroke-width="2"/>`;
  s += txt(74, 47.5, 15, t.ink, `Northwind<tspan dx="6" fill="${t.muted}" font-weight="400">/ Design</tspan>`, `font-weight="700"`);
  s += `<circle cx="${bellX}" cy="42" r="18" fill="${t.tintStrong}"/><g transform="translate(${bellX - 10} 32) scale(0.8333)" fill="none" stroke="${t.accent}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${BELL}</g>`;
  if (U > 0) s += `<circle cx="${bellX + 11}" cy="31" r="8.5" fill="${t.accent}" stroke="${t.panel}" stroke-width="2"/>` + txt(bellX + 11, 34.8, 10.5, t.onAccent, U, `font-weight="700" text-anchor="middle"`);
  const [uc, ui] = t.av(3);
  s += `<rect x="449" y="27" width="30" height="30" rx="${arx(30)}" fill="${uc}"/>` + txt(464, 46, 11, ui, "AK", `font-weight="700" text-anchor="middle"`);

  s += `<g filter="url(#sh)"><rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="${R}" fill="${t.panel}" stroke="${t.line}"/><path d="M${bellX - 9} ${PY + 0.5}L${bellX} ${PY - 8}L${bellX + 9} ${PY + 0.5}Z" fill="${t.panel}"/></g>`;
  s += `<path d="M${bellX - 9} ${PY + 0.5}L${bellX} ${PY - 8}L${bellX + 9} ${PY + 0.5}" fill="none" stroke="${t.line}" stroke-linejoin="round"/>`;
  s += txt(PX + 20, PY + 35, 17, t.ink, "Notifications", `font-weight="700" letter-spacing="-0.2"`);
  s += `<g transform="translate(${PX + PW - 38} ${PY + 19}) scale(0.75)" fill="none" stroke="${t.muted}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${GEAR}</g>`;
  if (U > 0) s += txt(PX + PW - 50, PY + 34, 13, t.accent, "Mark all as read", `font-weight="600" text-anchor="end"`);

  let tx = PX + 20;
  [["all", "All", U], ["mentions", "Mentions", mentionU]].forEach(([key, label, count]) => {
    const on = p.tab === key, lw = label.length * 7.6, tw = lw + (count ? 26 : 0);
    s += txt(tx, PY + 82, 14, on ? t.ink : t.muted, label, `font-weight="600"`);
    if (count) s += `<rect x="${tx + lw + 6}" y="${PY + 68}" width="20" height="18" rx="9" fill="${on ? t.accent : t.well}"/>` + txt(tx + lw + 16, PY + 81, 11, on ? t.onAccent : t.muted, count, `font-weight="700" text-anchor="middle"`);
    if (on) s += `<rect x="${tx}" y="${PY + 97.5}" width="${tw}" height="2.5" rx="1.25" fill="${t.accent}"/>`;
    tx += tw + 24;
  });
  s += `<rect x="${PX}" y="${PY + 99.5}" width="${PW}" height="1" fill="${t.line}"/>`;

  const row = (i, y) => {
    const d = DATA[i], pad = compact ? 8 : 14, h = rh(d, compact), A = compact ? 32 : 36;
    const [ac, ai] = t.av(i), x = PX + 20 + A + 12, cw = PW - 68 - 36;
    let o = i < U ? `<rect x="${PX + 1}" y="${y}" width="${PW - 2}" height="${h}" fill="${t.tint}"/>` : "";
    o += `<rect x="${PX + 20}" y="${y + pad}" width="${A}" height="${A}" rx="${arx(A)}" fill="${ac}"/>`;
    o += txt(PX + 20 + A / 2, y + pad + A / 2 + A * 0.13, A * 0.36, ai, d.n.split(" ").map((w) => w[0]).join(""), `font-weight="700" text-anchor="middle"`);
    o += txt(x, y + pad + 13, 13.5, t.ink, `<tspan font-weight="700">${d.n}</tspan> <tspan fill="${t.muted}">${d.v}</tspan> <tspan font-weight="600">${d.o}</tspan>`);
    o += txt(x, y + pad + 31, 12, t.muted, `${d.t} \u00B7 ${d.k}`);
    if (i < U) o += `<circle cx="${PX + PW - 24}" cy="${y + pad + 9}" r="4.5" fill="${t.accent}"/>`;
    let cy = y + pad + (compact ? 40 : 44);
    if (d.snip) {
      const sh = compact ? 22 : 30;
      o += `<rect x="${x}" y="${cy}" width="${cw}" height="${sh}" rx="${Math.min(R, compact ? 6 : 8)}" fill="${t.well}"/><rect x="${x + 6}" y="${cy + (sh - 14) / 2}" width="2.5" height="14" rx="1.25" fill="${t.accent}"/>`;
      o += txt(x + 16, cy + sh / 2 + (compact ? 4.3 : 4.5), compact ? 12 : 12.5, t.ink, d.snip);
      cy += compact ? 28 : 38;
    }
    if (d.file) {
      if (compact) {
        o += `<rect x="${x}" y="${cy}" width="214" height="24" rx="${Math.min(R, 7)}" fill="${t.panel}" stroke="${t.line}"/>`;
        o += `<g transform="translate(${x + 4} ${cy + 3}) scale(0.75)"><rect width="24" height="24" rx="6" fill="${t.tintStrong}"/><path d="${DOC}" fill="none" stroke="${t.accent}" stroke-width="1.8" stroke-linejoin="round"/></g>`;
        o += txt(x + 28, cy + 16.3, 12, t.ink, `<tspan font-weight="600">${d.file[0]}</tspan><tspan fill="${t.muted}"> \u00B7 ${d.file[1]}</tspan>`);
      } else {
        o += `<rect x="${x}" y="${cy}" width="236" height="40" rx="${Math.min(R, 10)}" fill="${t.panel}" stroke="${t.line}"/>`;
        o += `<g transform="translate(${x + 8} ${cy + 8})"><rect width="24" height="24" rx="6" fill="${t.tintStrong}"/><path d="${DOC}" fill="none" stroke="${t.accent}" stroke-width="1.4" stroke-linejoin="round"/></g>`;
        o += txt(x + 42, cy + 17, 12.5, t.ink, d.file[0], `font-weight="600"`) + txt(x + 42, cy + 31, 11.5, t.muted, d.file[1]);
      }
      cy += compact ? 30 : 48;
    }
    if (p.actions && d.act) {
      if (compact) {
        const bx = PX + PW - 20 - 150, by = y + pad + 18;
        o += btn(bx, by, 72, 24, d.act[0], true, 12) + btn(bx + 78, by, 72, 24, d.act[1], false, 12);
      } else o += btn(x, cy, 80, 30, d.act[0], true) + btn(x + 88, cy, 80, 30, d.act[1], false);
    }
    return o;
  };

  if (shown.length) {
    let y = BY + 6;
    groups.forEach((g) => {
      s += txt(PX + 20, y + (compact ? 18 : 20), 11, t.muted, g ? "EARLIER" : "TODAY", `font-weight="700" letter-spacing="0.9"`);
      y += compact ? 26 : 30;
      shown.filter((i) => DATA[i].g === g).forEach((i) => { s += row(i, y); y += rh(DATA[i], compact); });
    });
  } else {
    const m = p.tab === "mentions", ey = BY + 90;
    s += `<circle cx="${cx}" cy="${ey}" r="40" fill="${t.well}"/><g transform="translate(${cx - 16} ${ey - 16}) scale(1.3333)" fill="none" stroke="${t.muted}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${BELL}</g>`;
    s += `<circle cx="${cx + 28}" cy="${ey + 26}" r="13" fill="${t.accent}" stroke="${t.panel}" stroke-width="3"/><path d="M${cx + 22.5} ${ey + 26}l3.8 3.8 6.4-7" fill="none" stroke="${t.onAccent}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += txt(cx, BY + 168, 15.5, t.ink, m ? "No mentions yet" : "You\u2019re all caught up", `font-weight="700" text-anchor="middle"`);
    s += txt(cx, BY + 192, 13, t.muted, m ? "When someone @mentions you, it shows up here." : "New invites, replies and mentions land here.", `text-anchor="middle"`);
    s += btn(cx - 88, BY + 214, 176, 34, "Notification settings", false);
  }

  const fy = PY + PH - 48;
  s += `<rect x="${PX}" y="${fy}" width="${PW}" height="1" fill="${t.line}"/>`;
  s += txt(cx - 6, fy + 29, 13.5, t.accent, "View all notifications", `font-weight="600" text-anchor="middle"`);
  s += `<path d="M${cx + 78} ${fy + 20}l4 4-4 4" fill="none" stroke="${t.accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;

  const defs = `<defs><filter id="sh" x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000000" flood-opacity="${t.shadow}"/></filter><radialGradient id="glow" cx="0.82" cy="0.04" r="0.75"><stop offset="0" stop-color="${t.accent}" stop-opacity="${t.dk ? 0.16 : 0.09}"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${F}">${defs}${s}</svg>`;
}
