// Conference lanyard badge: patterned header with event mark, fitted attendee name, role ribbon, slot punch and seeded QR.
export const meta = {
  title: "Lanyard Name Badge",
  kind: "mockup",
  description: "A hanging conference badge with patterned header, attendee name, role ribbon and optional QR, for event branding, signage mockups and attendee comms.",
  tags: ["badge", "lanyard", "conference", "event", "name tag", "id card", "mockup", "qr"],
  price: 5,
  author: "oasis-factory",
  size: [640, 800],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Backdrop", default: "#E9E4DA" },
    card: { type: "color", role: "surface", label: "Card", default: "#FFFFFF" },
    ink: { type: "color", role: "ink", label: "Ink", default: "#17181C" },
    roleColor: { type: "color", role: "primary", label: "Role colour", default: "#E4572E" },
    role: { type: "choice", label: "Role", default: "Speaker", options: ["Attendee", "Speaker", "Staff", "Press", "Sponsor"] },
    orientation: { type: "choice", label: "Layout", default: "portrait", options: ["portrait", "landscape"] },
    pattern: { type: "choice", label: "Header pattern", default: "dots", options: ["dots", "stripes", "waves", "grid", "rings"] },
    name: { type: "text", label: "Name", default: "Maya Okafor" },
    event: { type: "text", label: "Event", default: "Oasis Summit" },
    radius: { type: "range", label: "Corner radius", default: 18, min: 4, max: 32, step: 1 },
    qr: { type: "toggle", label: "QR code", default: true },
  },
  presets: {
    "Staff Night": { background: "#0E0F13", card: "#1B1D24", ink: "#F3F1EC", roleColor: "#C6F432", role: "Staff", orientation: "landscape", pattern: "grid", radius: 12 },
    "Press Mint": { background: "#DDEBE5", card: "#FFFFFF", ink: "#0F2A25", roleColor: "#1F8A70", role: "Press", orientation: "portrait", pattern: "stripes", radius: 28 },
    "Sponsor Indigo": { background: "#F2EEE6", card: "#FBF8F2", ink: "#1E1B3A", roleColor: "#4B3FD9", role: "Sponsor", orientation: "landscape", pattern: "waves", qr: false },
    "Attendee Sun": { background: "#FFE9C2", card: "#FFFDF8", ink: "#2A1E12", roleColor: "#F2A516", role: "Attendee", orientation: "portrait", pattern: "rings", radius: 8, qr: false },
  },
};

const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
const MONO = "Menlo, Consolas, monospace";
const ACCESS = { Attendee: "General", Speaker: "Backstage", Staff: "All areas", Press: "Media desk", Sponsor: "Expo floor" };

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function rgb(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function hex(a) { return "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join(""); }
function mix(a, b, t) { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); }
function lum(c) {
  const w = [0.2126, 0.7152, 0.0722];
  return rgb(c).reduce((s, v, i) => { v /= 255; return s + w[i] * (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); }, 0);
}
function cr(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function on(bg, pref, min) {
  if (cr(bg, pref) >= min) return pref;
  return cr(bg, "#FFFFFF") >= cr(bg, "#111114") ? "#FFFFFF" : "#111114";
}
function clip(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1).trim() + "\u2026" : s; }

function qrPath(seed, x, y, s) {
  const N = 21, u = s / N, r = rng(seed);
  const F = [[0, 0], [14, 0], [0, 14]];
  let d = "";
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let v = null;
    for (const [fx, fy] of F) {
      const a = i - fx, b = j - fy;
      if (a >= -1 && a <= 7 && b >= -1 && b <= 7) {
        v = a >= 0 && a < 7 && b >= 0 && b < 7 && (a === 0 || a === 6 || b === 0 || b === 6 || (a >= 2 && a <= 4 && b >= 2 && b <= 4));
      }
    }
    if (v === null) v = j === 6 ? i % 2 === 0 : i === 6 ? j % 2 === 0 : r() < 0.48;
    if (v) d += `M${(x + i * u).toFixed(2)} ${(y + j * u).toFixed(2)}h${u.toFixed(2)}v${u.toFixed(2)}h-${u.toFixed(2)}z`;
  }
  return d;
}

function mark(x, cy, c) {
  return `<circle cx="${x + 13}" cy="${cy}" r="12" fill="none" stroke="${c}" stroke-width="2.5"/><path d="M${x + 1} ${cy}A12 12 0 0 0 ${x + 25} ${cy}Z" fill="${c}"/><circle cx="${x + 13}" cy="${cy - 5.5}" r="2.6" fill="${c}"/>`;
}

export default function render(p) {
  const land = p.orientation === "landscape";
  const L = land
    ? { W: 520, H: 340, bx: 60, by: 330, hdr: [0, 0, 180, 340], rib: [180, 284, 340, 56], ribFs: 18, nm: [212, 112, 276, 44], div: 182, qrS: 72, qrX: 420, infoY: 200, x0: 212 }
    : { W: 380, H: 560, bx: 130, by: 200, hdr: [0, 0, 380, 212], rib: [0, 496, 380, 64], ribFs: 20, nm: [32, 282, 316, 54], div: 376, qrS: 84, qrX: 264, infoY: 398, x0: 32 };
  const { W, H, bx, by } = L;
  const [hx, hy, hw, hh] = L.hdr;
  const bg = p.background, card = p.card, role = p.roleColor;
  const ink = on(card, p.ink, 4.5), muted = mix(ink, card, 0.42), hair = mix(ink, card, 0.86);
  const hInk = on(role, card, 3);
  const light = lum(role) > 0.35, patInk = light ? "#000000" : "#FFFFFF", patOp = light ? 0.14 : 0.2;
  const darkBg = lum(bg) < 0.2;
  const shc = darkBg ? "#000000" : mix(bg, "#000000", 0.72), sho = darkBg ? 0.6 : 0.24;
  const edge = darkBg ? "#FFFFFF" : "#000000", edgeOp = darkBg ? 0.12 : 0.06;
  const strap = mix(role, "#000000", 0.28), strapInk = on(strap, "#FFFFFF", 3);
  const cx = 320, sy = by - 58, rad = Math.max(2, Math.min(36, Number(p.radius) || 18));
  const slot = [W / 2 - 32, 22, 64, 12];
  const seam = cr(role, card) < 1.5;

  const nameRaw = clip(String(p.name || "").trim() || "Your Name", 40);
  const words = nameRaw.split(/\s+/);
  const lines = words.length > 1 ? [words[0], words.slice(1).join(" ")] : [words[0]];
  const maxLen = Math.max(...lines.map((l) => l.length));
  const [nx, ny, nw, nmax] = L.nm;
  const fs = Math.max(12, Math.min(nmax, nw / (maxLen * 0.62)));
  const eventTxt = clip(String(p.event || "").trim() || "Event", 28);
  const evUp = eventTxt.toUpperCase();
  const seed = hash(nameRaw + "|" + p.role + "|" + eventTxt);
  const passNo = "No. " + String((seed % 9000) + 1000);

  let pat = "", patBody = "";
  if (p.pattern === "dots") pat = `<pattern id="pt" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="2.2" fill="${patInk}"/></pattern>`;
  else if (p.pattern === "stripes") pat = `<pattern id="pt" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="12" fill="${patInk}"/></pattern>`;
  else if (p.pattern === "waves") pat = `<pattern id="pt" width="32" height="14" patternUnits="userSpaceOnUse"><path d="M0 7Q8 1 16 7T32 7" fill="none" stroke="${patInk}" stroke-width="2.2"/></pattern>`;
  else if (p.pattern === "grid") pat = `<pattern id="pt" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="${patInk}" stroke-width="1.4"/></pattern>`;
  if (p.pattern === "rings") {
    const reach = Math.hypot(hw, hh);
    for (let r = 22; r < reach; r += 20) patBody += `<circle cx="${hx + hw}" cy="${hy}" r="${r}" fill="none" stroke="${patInk}" stroke-width="2"/>`;
  } else patBody = `<rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" fill="url(#pt)"/>`;

  const defs = `<defs>
<linearGradient id="mt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F1F3F5"/><stop offset="0.55" stop-color="#A6ACB4"/><stop offset="1" stop-color="#E0E3E7"/></linearGradient>
<linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#3A3A3A"/></linearGradient>
<filter id="sh" x="-25%" y="-20%" width="150%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="${shc}" flood-opacity="${sho}"/></filter>
<mask id="cut"><rect width="${W}" height="${H}" rx="${rad}" fill="#FFFFFF"/><rect x="${slot[0]}" y="${slot[1]}" width="${slot[2]}" height="${slot[3]}" rx="6" fill="#000000"/></mask>
<mask id="fade"><rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" fill="url(#fg)"/></mask>
<clipPath id="hc"><rect x="${hx}" y="${hy}" width="${hw}" height="${hh}"/></clipPath>
<clipPath id="sc"><rect x="${cx - 23}" y="-10" width="46" height="${sy + 10}"/></clipPath>
${pat}</defs>`;

  const strapTxt = Array(8).fill(evUp).join("  \u2022  ");
  const lanyard = `<rect x="${cx - 23}" y="-10" width="46" height="${sy + 10}" fill="${strap}"/>
<g clip-path="url(#sc)"><text transform="translate(${cx + 5} ${sy - 16}) rotate(-90)" font-family="${FONT}" font-size="13" font-weight="700" letter-spacing="3" fill="${strapInk}" fill-opacity="0.5">${esc(strapTxt)}</text>
<path d="M${cx - 17} -10V${sy}M${cx + 17} -10V${sy}" stroke="${strapInk}" stroke-opacity="0.3" stroke-width="1.2" stroke-dasharray="4 3"/></g>
<rect x="${cx - 30}" y="${by + 24}" width="60" height="8" rx="4" fill="#8D939B"/>`;

  const clipSvg = `<rect x="${cx - 15}" y="${sy - 8}" width="30" height="30" rx="9" fill="url(#mt)" stroke="#000000" stroke-opacity="0.22"/>
<circle cx="${cx}" cy="${sy + 7}" r="4" fill="#6E747C"/>
<rect x="${cx - 4}" y="${sy + 20}" width="8" height="${by + 28 - (sy + 20)}" rx="4" fill="url(#mt)" stroke="#000000" stroke-opacity="0.22"/>`;

  const evAvail = land ? hw - 56 : hw - 100;
  const evFs = Math.max(9, Math.min(16, evAvail / (evUp.length * 0.75)));
  const sub = "12\u201314 JUNE \u00B7 LISBON";
  const tag = (x, y, t, anchor) => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${MONO}" font-size="10" letter-spacing="1.5" fill="${hInk}" fill-opacity="0.72">${t}</text>`;
  let markSvg;
  if (land) {
    markSvg = tag(28, 44, "EDITION 06", "start") + tag(28, 60, "2025", "start") +
      `<line x1="28" y1="72" x2="52" y2="72" stroke="${hInk}" stroke-opacity="0.5" stroke-width="1.5"/>` +
      mark(28, H - 104, hInk) +
      `<text x="28" y="${H - 66}" font-family="${FONT}" font-size="${evFs.toFixed(1)}" font-weight="700" letter-spacing="1.5" fill="${hInk}">${esc(evUp)}</text>` +
      `<text x="28" y="${H - 46}" font-family="${FONT}" font-size="10.5" letter-spacing="1.2" fill="${hInk}" fill-opacity="0.8">${sub}</text>`;
  } else {
    const my = hh - 40;
    markSvg = tag(32, 33, "EDITION 06", "start") + tag(W - 32, 33, "2025", "end") +
      mark(32, my, hInk) +
      `<text x="68" y="${my - 2}" font-family="${FONT}" font-size="${evFs.toFixed(1)}" font-weight="700" letter-spacing="1.5" fill="${hInk}">${esc(evUp)}</text>` +
      `<text x="68" y="${my + 15}" font-family="${FONT}" font-size="10.5" letter-spacing="1.2" fill="${hInk}" fill-opacity="0.8">${sub}</text>`;
  }

  let nameSvg = `<text x="${nx}" y="${ny}" font-family="${FONT}" font-size="${fs.toFixed(1)}" font-weight="700" letter-spacing="-0.5" fill="${ink}">${esc(lines[0])}</text>`;
  if (lines[1]) nameSvg += `<text x="${nx}" y="${(ny + fs * 1.04).toFixed(1)}" font-family="${FONT}" font-size="${fs.toFixed(1)}" font-weight="300" letter-spacing="-0.5" fill="${ink}">${esc(lines[1])}</text>`;

  const cols = [["PASS", passNo], ["ACCESS", ACCESS[p.role] || "General"]];
  if (!p.qr) cols.push(["DAYS", "1 \u2013 3"]);
  let info = `<line x1="${L.x0}" y1="${L.div}" x2="${W - (land ? 28 : 32)}" y2="${L.div}" stroke="${hair}" stroke-width="1.2"/>`;
  cols.forEach(([k, v], i) => {
    const x = L.x0 + i * 108;
    info += `<text x="${x}" y="${L.infoY + 12}" font-family="${FONT}" font-size="10" font-weight="700" letter-spacing="1.6" fill="${muted}">${k}</text>`;
    info += `<text x="${x}" y="${L.infoY + 34}" font-family="${FONT}" font-size="16" font-weight="700" fill="${ink}">${esc(v)}</text>`;
  });
  info += `<text x="${L.x0}" y="${L.infoY + L.qrS}" font-family="${FONT}" font-size="10" letter-spacing="0.4" fill="${muted}">Wear visibly at all times</text>`;
  if (p.qr) info += `<path d="${qrPath(seed, L.qrX, L.infoY, L.qrS)}" fill="${ink}" shape-rendering="crispEdges"/>`;

  const [rx, ry, rw, rh] = L.rib, ls = 5;
  const ribbon = `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${role}"/>
<text x="${rx + rw / 2 + ls / 2}" y="${ry + rh / 2 + L.ribFs * 0.36}" text-anchor="middle" font-family="${FONT}" font-size="${L.ribFs}" font-weight="700" letter-spacing="${ls}" fill="${hInk}">${esc(String(p.role).toUpperCase())}</text>
<circle cx="${rx + 24}" cy="${ry + rh / 2}" r="3" fill="${hInk}" fill-opacity="0.6"/><circle cx="${rx + rw - 24}" cy="${ry + rh / 2}" r="3" fill="${hInk}" fill-opacity="0.6"/>`;

  const seams = !seam ? "" : (land
    ? `<path d="M${hw} 0V${H}M${hw} ${ry}H${W}" stroke="${hair}" stroke-width="1.2" fill="none"/>`
    : `<path d="M0 ${hh}H${W}M0 ${ry}H${W}" stroke="${hair}" stroke-width="1.2" fill="none"/>`);

  const cardSvg = `<g transform="translate(${bx} ${by})"><g filter="url(#sh)"><g mask="url(#cut)">
<rect width="${W}" height="${H}" fill="${card}"/>
<rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" fill="${role}"/>
<g clip-path="url(#hc)"><g mask="url(#fade)" opacity="${patOp}">${patBody}</g></g>
${markSvg}${nameSvg}${info}${ribbon}${seams}
</g></g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${rad}" fill="none" stroke="${edge}" stroke-opacity="${edgeOp}"/>
<rect x="${slot[0]}" y="${slot[1]}" width="${slot[2]}" height="${slot[3]}" rx="6" fill="none" stroke="#000000" stroke-opacity="0.18"/></g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 800" width="640" height="800">${defs}<rect width="640" height="800" fill="${bg}"/>${lanyard}${cardSvg}${clipSvg}</svg>`;
}
