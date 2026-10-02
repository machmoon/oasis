// Settings page UI: sidebar, grouped setting rows with toggles, selects and a segmented theme switch.
export const meta = {
  title: "Quiet Settings",
  kind: "ui",
  description: "A polished settings screen with grouped rows, toggles, selects and section headers, for app mockups, case studies and UI kits.",
  tags: ["settings", "preferences", "ui", "dashboard", "toggle", "form", "web app", "dark mode"],
  price: 7,
  author: "oasis-factory",
  size: [1280, 880],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Page", default: "#F3F2EE" },
    surface: { type: "color", role: "surface", label: "Cards", default: "#FFFFFF" },
    ink: { type: "color", role: "ink", label: "Text", default: "#17181C" },
    primary: { type: "color", role: "primary", label: "Accent", default: "#4F46E5" },
    theme: { type: "choice", label: "Theme", default: "light", options: ["light", "dark"] },
    density: { type: "choice", label: "Density", default: "comfortable", options: ["comfortable", "compact"] },
    rows: { type: "range", label: "Rows per group", default: 4, min: 2, max: 6, step: 1 },
    onRatio: { type: "range", label: "Toggles on (%)", default: 60, min: 0, max: 100, step: 10 },
    radius: { type: "range", label: "Corner radius", default: 12, min: 0, max: 20, step: 1 },
    sidebar: { type: "toggle", label: "Sidebar", default: true },
  },
  presets: {
    Harbor: { background: "#E8EEF3", surface: "#FFFFFF", ink: "#0F1E2E", primary: "#1F6FEB" },
    Moss: { background: "#E9EEE5", surface: "#FAFCF7", ink: "#1C2A1E", primary: "#3E7D4F" },
    Ember: { background: "#FAEFE8", surface: "#FFFBF8", ink: "#2B1711", primary: "#E0522B" },
    Graphite: { background: "#E4E5E8", surface: "#F8F8F9", ink: "#101115", primary: "#101115" },
  },
};

const W = 1280, H = 880;
const F = "-apple-system, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const GROUPS = [
  { t: "General", rows: [["Theme", "Interface appearance", "seg"], ["Language", "Interface and email", "sel", "English (US)"], ["Open at login", "Launch when you sign in", "tog"], ["Time zone", "For reminders and reports", "sel", "Berlin, GMT+1"], ["Auto-update", "Install in the background", "tog"], ["Week starts on", "Calendars and charts", "sel", "Monday"]] },
  { t: "Notifications", rows: [["Push notifications", "On desktop and mobile", "tog"], ["Email digest", "A summary of activity", "sel", "Weekly"], ["Mentions", "When someone tags you", "tog"], ["Comments", "Replies on your work", "tog"], ["Sounds", "A chime for new alerts", "tog"], ["Quiet hours", "Pause alerts overnight", "sel", "22:00 – 07:00"]] },
  { t: "Privacy & Security", rows: [["Two-factor authentication", "Require a code at sign-in", "tog"], ["Session timeout", "Sign out when inactive", "sel", "30 minutes"], ["Login alerts", "Email me on new devices", "tog"], ["Profile visibility", "Who can see your profile", "sel", "Team only"], ["Share usage data", "Help improve the product", "tog"], ["Read receipts", "Show when you have read", "tog"]] },
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hx = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const lum = (c) => { const [r, g, b] = hx(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const hs = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function palette(p) {
  const dark = p.theme === "dark";
  let bg = p.background, sf = p.surface, ink = p.ink, pr = p.primary;
  if (dark && lum(bg) > 0.3) bg = mix(mix("#0D0E12", bg, 0.05), pr, 0.04);
  if (!dark && lum(bg) < 0.3) bg = mix(mix("#F2F2EF", bg, 0.06), pr, 0.03);
  if (dark && lum(sf) > 0.3) sf = mix(mix("#17191F", sf, 0.04), pr, 0.05);
  if (!dark && lum(sf) < 0.3) sf = mix("#FFFFFF", pr, 0.015);
  const ls = lum(sf);
  if (Math.abs(lum(ink) - ls) < 0.3) ink = ls > 0.35 ? "#16171B" : "#EDEEF2";
  if (dark && lum(pr) < 0.1) pr = mix(pr, "#FFFFFF", 0.8);
  if (!dark && lum(pr) > 0.75) pr = mix(pr, "#000000", 0.55);
  const side = mix(sf, bg, 0.4);
  return {
    dark, bg, sf, ink, pr, side,
    onP: lum(pr) > 0.45 ? "#121316" : "#FFFFFF",
    muted: mix(ink, sf, 0.46), soft: mix(ink, sf, 0.25),
    line: mix(ink, sf, dark ? 0.86 : 0.9), field: mix(sf, ink, dark ? 0.06 : 0.035),
    off: mix(ink, sf, dark ? 0.72 : 0.82), segOn: dark ? mix(sf, ink, 0.16) : sf,
    sel: mix(side, pr, dark ? 0.2 : 0.1), red: dark ? "#F2555A" : "#D93036",
  };
}

function icon(k, x, y, col) {
  const d = {
    Home: '<path d="M3 9l7-6 7 6v8H3z"/><path d="M8 17v-5h4v5"/>',
    Projects: '<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="11" width="6" height="6" rx="1.5"/><rect x="11" y="11" width="6" height="6" rx="1.5"/>',
    Inbox: '<path d="M2 11h5l1 3h4l1-3h5"/><path d="M2 11l3-7h10l3 7v6H2z"/>',
    Reports: '<path d="M4 17V10M10 17V4M16 17v-9"/>',
    Members: '<circle cx="10" cy="7" r="3.5"/><path d="M3.5 17a6.5 6.5 0 0 1 13 0"/>',
    Settings: '<circle cx="10" cy="10" r="2.6"/><circle cx="10" cy="10" r="6.6" stroke-dasharray="3.2 2"/>',
  }[k];
  return `<g transform="translate(${x} ${y})" fill="none" stroke="${col}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</g>`;
}

function sidebar(C, R) {
  let o = `<rect width="248" height="${H}" fill="${C.side}"/><line x1="248.5" y1="0" x2="248.5" y2="${H}" stroke="${C.line}"/>`;
  o += `<rect x="28" y="36" width="30" height="30" rx="${Math.min(R, 9)}" fill="${C.pr}"/><circle cx="43" cy="51" r="7" fill="none" stroke="${C.onP}" stroke-width="2.4"/><circle cx="43" cy="51" r="2" fill="${C.onP}"/>`;
  o += `<text x="70" y="57" font-size="17" font-weight="700" letter-spacing="-0.3" fill="${C.ink}">Oasis</text>`;
  o += `<rect x="20.5" y="88.5" width="207" height="36" rx="${Math.min(R, 18) * 0.75}" fill="${C.field}" stroke="${C.line}"/><circle cx="40" cy="105.5" r="5" fill="none" stroke="${C.muted}" stroke-width="1.6"/><path d="M44 109.5l3.5 3.5" stroke="${C.muted}" stroke-width="1.6" stroke-linecap="round"/>`;
  o += `<text x="56" y="111" font-size="13" fill="${C.muted}">Search</text><rect x="186.5" y="96.5" width="32" height="20" rx="${Math.min(R, 10) * 0.5}" fill="${C.sf}" stroke="${C.line}"/><text x="202.5" y="110.5" font-size="11" text-anchor="middle" fill="${C.muted}">⌘K</text>`;
  o += `<text x="28" y="160" font-size="11" font-weight="700" letter-spacing="1.1" fill="${C.muted}">WORKSPACE</text>`;
  ["Home", "Projects", "Inbox", "Reports", "Members", "Settings"].forEach((k, i) => {
    const y = 174 + i * 42, on = k === "Settings";
    if (on) o += `<rect x="14" y="${y}" width="220" height="38" rx="${Math.min(R, 19) * 0.75}" fill="${C.sel}"/>`;
    o += icon(k, 26, y + 9, on ? C.pr : C.muted);
    o += `<text x="56" y="${y + 24}" font-size="14" font-weight="${on ? 650 : 500}" fill="${on ? C.ink : C.soft}">${k}</text>`;
    if (k === "Inbox") o += `<rect x="196" y="${y + 10}" width="26" height="18" rx="9" fill="${C.pr}"/><text x="209" y="${y + 23}" font-size="11" font-weight="700" text-anchor="middle" fill="${C.onP}">12</text>`;
  });
  o += `<line x1="20" y1="${H - 88.5}" x2="228" y2="${H - 88.5}" stroke="${C.line}"/><circle cx="46" cy="${H - 44}" r="18" fill="${mix(C.pr, C.side, 0.8)}"/>`;
  o += `<text x="46" y="${H - 39.5}" font-size="13" font-weight="700" text-anchor="middle" fill="${C.ink}">AK</text><text x="74" y="${H - 48}" font-size="14" font-weight="600" fill="${C.ink}">Ada Kim</text>`;
  o += `<text x="74" y="${H - 30}" font-size="12" fill="${C.muted}">ada@oasis.studio</text><path d="M212 ${H - 48}l4 4-4 4" fill="none" stroke="${C.muted}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  return o;
}

export default function render(p) {
  const C = palette(p), comp = p.density === "compact", n = p.rows, R = p.radius;
  const GH = 34, gap = comp ? 22 : 28, hy = comp ? -8 : 0;
  const sbw = p.sidebar ? 248 : 0, padX = comp ? 40 : 48;
  const left = sbw + padX, availW = W - sbw - 2 * padX, top = 148 + hy, availH = H - top - 36;
  const cols = p.sidebar ? 2 : 3;
  let rh = comp ? 52 : 68;
  const needFor = (h) => (cols === 2 ? 2 * (GH + n * h) + gap : GH + n * h + gap + GH + h);
  if (needFor(rh) > availH) {
    const fit = cols === 2 ? (availH - gap - 2 * GH) / (2 * n) : (availH - gap - 2 * GH) / (n + 1);
    rh = Math.max(comp ? 46 : 56, Math.floor(fit));
  }
  const gh = GH + n * rh, need = needFor(rh);
  const s = Math.min(1, availH / need), LW = availW / s, cw = (LW - gap * (cols - 1)) / cols;

  const togs = [];
  GROUPS.forEach((g, gi) => g.rows.slice(0, n).forEach((r, ri) => { if (r[2] === "tog") togs.push(gi * 10 + ri); }));
  const ranked = togs.slice().sort((a, b) => hs(a) - hs(b));
  const onSet = new Set(ranked.slice(0, Math.round((togs.length * p.onRatio) / 100)));
  const fr = (h) => Math.min(R * 0.75, h / 2);

  function control(r, x2, cy, on) {
    if (r[2] === "tog") {
      const tw = comp ? 36 : 42, th = comp ? 20 : 24, tx = x2 - tw, ty = cy - th / 2, kr = th / 2 - 2.5;
      return `<rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="${Math.min(th / 2, R)}" fill="${on ? C.pr : C.off}"/>` +
        `<rect x="${on ? tx + tw - 2.5 - 2 * kr : tx + 2.5}" y="${ty + 2.5}" width="${2 * kr}" height="${2 * kr}" rx="${Math.min(kr, R * 0.85)}" fill="${on ? C.onP : "#FFFFFF"}" filter="url(#ks)"/>`;
    }
    if (r[2] === "sel") {
      const sh = comp ? 30 : 34, sw = Math.max(104, Math.round(r[3].length * 7.1 + 46)), sx = x2 - sw, a = sx + sw - 18;
      return `<rect x="${sx + 0.5}" y="${cy - sh / 2 + 0.5}" width="${sw - 1}" height="${sh - 1}" rx="${fr(sh)}" fill="${C.field}" stroke="${C.line}"/>` +
        `<text x="${sx + 12}" y="${cy + 4.5}" font-size="${comp ? 12.5 : 13}" fill="${C.ink}">${esc(r[3])}</text>` +
        `<path d="M${a - 4} ${cy - 2}l4 4 4-4" fill="none" stroke="${C.muted}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    const w1 = comp ? 50 : 56, sh = comp ? 28 : 32, sx = x2 - w1 * 3, si = p.theme === "dark" ? 1 : 0;
    let o = `<rect x="${sx + 0.5}" y="${cy - sh / 2 + 0.5}" width="${w1 * 3 - 1}" height="${sh - 1}" rx="${fr(sh)}" fill="${C.field}" stroke="${C.line}"/>`;
    o += `<rect x="${sx + 3 + si * w1}" y="${cy - sh / 2 + 3}" width="${w1 - 6}" height="${sh - 6}" rx="${Math.max(0, fr(sh) - 3)}" fill="${C.segOn}" filter="url(#ks)"/>`;
    ["Light", "Dark", "Auto"].forEach((t, i) => { o += `<text x="${sx + w1 * (i + 0.5)}" y="${cy + 4.5}" font-size="12.5" text-anchor="middle" font-weight="${i === si ? 650 : 500}" fill="${i === si ? C.ink : C.muted}">${t}</text>`; });
    return o;
  }

  function labels(r, x, cy) {
    return `<text x="${x + 20}" y="${cy - (comp ? 3 : 4)}" font-size="${comp ? 13.5 : 14.5}" font-weight="600" fill="${C.ink}">${esc(r[0])}</text>` +
      `<text x="${x + 20}" y="${cy + (comp ? 13 : 15)}" font-size="${comp ? 11.5 : 12.5}" fill="${C.muted}">${esc(r[1])}</text>`;
  }

  function card(title, x, y, w, k, body) {
    return `<text x="${x + 4}" y="${y + 20}" font-size="11.5" font-weight="700" letter-spacing="1.1" fill="${C.muted}">${esc(title.toUpperCase())}</text>` +
      `<rect x="${x + 0.5}" y="${y + GH + 0.5}" width="${w - 1}" height="${k * rh - 1}" rx="${R}" fill="${C.sf}" stroke="${C.line}" filter="url(#cs)"/>${body}`;
  }

  function group(gi, x, y, w) {
    const g = GROUPS[gi]; let b = "";
    g.rows.slice(0, n).forEach((r, i) => {
      const ry = y + GH + i * rh, cy = ry + rh / 2;
      if (i) b += `<line x1="${x + 20}" y1="${ry + 0.5}" x2="${x + w}" y2="${ry + 0.5}" stroke="${C.line}"/>`;
      b += labels(r, x, cy) + control(r, x + w - 20, cy, onSet.has(gi * 10 + i));
    });
    return card(g.t, x, y, w, n, b);
  }

  function danger(x, y, w) {
    const cy = y + GH + rh / 2, bh = comp ? 30 : 34, bw = 84, bx = x + w - 20 - bw;
    const b = labels(["Delete workspace", "Remove all projects and data"], x, cy) +
      `<rect x="${bx + 0.5}" y="${cy - bh / 2 + 0.5}" width="${bw - 1}" height="${bh - 1}" rx="${fr(bh)}" fill="none" stroke="${C.red}" stroke-opacity="0.55"/>` +
      `<text x="${bx + bw / 2}" y="${cy + 4.5}" font-size="13" font-weight="650" text-anchor="middle" fill="${C.red}">Delete</text>`;
    return card("Danger zone", x, y, w, 1, b);
  }

  const cx = (c) => c * (cw + gap);
  let grid = "";
  if (cols === 2) grid = group(0, 0, 0, cw) + group(1, 0, gh + gap, cw) + group(2, cx(1), 0, cw) + danger(cx(1), gh + gap, cw);
  else grid = group(0, 0, 0, cw) + group(1, cx(1), 0, cw) + group(2, cx(2), 0, cw) + danger(cx(2), gh + gap, cw);

  const right = W - padX, by = 58 + hy;
  let head = `<text x="${left}" y="${54 + hy}" font-size="13" fill="${C.muted}">Workspace <tspan dx="4" fill="${C.off}">/</tspan><tspan dx="4" fill="${C.soft}">Settings</tspan></text>`;
  head += `<text x="${left}" y="${88 + hy}" font-size="${comp ? 28 : 30}" font-weight="700" letter-spacing="-0.6" fill="${C.ink}">Settings</text>`;
  head += `<text x="${left}" y="${114 + hy}" font-size="14.5" fill="${C.muted}">Manage preferences for your account and workspace</text>`;
  head += `<rect x="${right - 132}" y="${by}" width="132" height="40" rx="${fr(40)}" fill="${C.pr}"/><text x="${right - 66}" y="${by + 25}" font-size="14" font-weight="650" text-anchor="middle" fill="${C.onP}">Save changes</text>`;
  head += `<rect x="${right - 228.5}" y="${by + 0.5}" width="84" height="39" rx="${fr(40)}" fill="${C.sf}" stroke="${C.line}"/><text x="${right - 186.5}" y="${by + 25}" font-size="14" font-weight="600" text-anchor="middle" fill="${C.ink}">Cancel</text>`;

  const defs = `<defs><filter id="ks" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.22"/></filter>` +
    `<filter id="cs" x="-5%" y="-5%" width="110%" height="115%"><feDropShadow dx="0" dy="1" stdDeviation="2.5" flood-color="#000" flood-opacity="${C.dark ? 0 : 0.05}"/></filter></defs>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${F}">${defs}` +
    `<rect width="${W}" height="${H}" fill="${C.bg}"/>${p.sidebar ? sidebar(C, R) : ""}${head}` +
    `<g transform="translate(${left} ${top}) scale(${s.toFixed(4)})">${grid}</g></svg>`;
}
