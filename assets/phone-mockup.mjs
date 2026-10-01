// Modern smartphone mockup with a generated brand-coloured app screen, three notch styles, four camera angles and a soft studio shadow.
export const meta = {
  title: "Pocket Studio Phone",
  kind: "mockup",
  description: "A modern smartphone with a generated app screen in your brand colours. Use it for landing pages, pitch decks and case-study hero shots.",
  tags: ["mockup", "phone", "iphone", "device", "app", "ui", "presentation", "isometric"],
  price: 6,
  author: "oasis-factory",
  size: [800, 1000],
};

export const params = {
  knobs: {
    brand: { type: "color", label: "Brand", default: "#4C4DDC" },
    accent: { type: "color", label: "Accent", default: "#FF9F6B" },
    frame: { type: "color", label: "Device frame", default: "#2A2C33" },
    background: { type: "color", label: "Background", default: "#ECE8E1" },
    notch: { type: "choice", label: "Camera cutout", default: "island", options: ["island", "notch", "none"] },
    angle: { type: "choice", label: "Angle", default: "flat", options: ["flat", "angled left", "angled right", "isometric"] },
    theme: { type: "choice", label: "Screen theme", default: "light", options: ["light", "dark"] },
    cards: { type: "range", label: "List cards", default: 3, min: 2, max: 5, step: 1 },
    title: { type: "text", label: "Screen title", default: "Discover" },
    shadow: { type: "toggle", label: "Shadow", default: true },
  },
  presets: {
    Indigo: { brand: "#4C4DDC", accent: "#FF9F6B", frame: "#2A2C33", background: "#ECE8E1" },
    Forest: { brand: "#1F5E4B", accent: "#E9C46A", frame: "#CFC9BE", background: "#DCE6DF" },
    Sunset: { brand: "#E4572E", accent: "#FFC857", frame: "#3A2E2A", background: "#F7E6D8" },
    Midnight: { brand: "#7C5CFF", accent: "#2DE1C2", frame: "#1A1A22", background: "#101018" },
  },
};

const F = "-apple-system, 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (h) => {
  const [r, g, b] = hx(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const inkOn = (h) => (lum(h) > 0.5 ? "#14141A" : "#FFFFFF");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const DATA = [
  ["Morning run", "5.2 km \u00B7 Riverside", "32m", 0.72, "M13 3 6 13.5h5.5L10.5 21 18 10.5h-5.5z"],
  ["Design review", "Studio \u00B7 3 people", "10:30", 0.45, "M4.5 7A1.5 1.5 0 0 1 6 5.5h12A1.5 1.5 0 0 1 19.5 7v11a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18zM4.5 10h15M8.5 3.5v3M15.5 3.5v3"],
  ["Flight to Lisbon", "Gate B12 \u00B7 On time", "14:05", 0.9, "M20.5 3.5 3.5 10.5l6.5 3 3 6.5zM10 13.5l4.5-4.5"],
  ["Grocery run", "8 items left", "$24", 0.3, "M5.5 8.5h13l-1 11h-11zM9 8.5V7a3 3 0 0 1 6 0v1.5"],
  ["Yoga flow", "Evening \u00B7 45 min", "19:00", 0.6, "M5 19C5 10.5 10.5 5 19 5c0 8.5-5.5 14-14 14zM5 19l7.5-7.5"],
];
const TABS = [
  ["Home", '<path d="M4 11l8-7 8 7v8.5a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19.5z"/>'],
  ["Search", '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'],
  ["Saved", '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/>'],
  ["Profile", '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>'],
];

function screenUI(p, th, n, sw, sh) {
  const hi = inkOn(p.brand), ai = inkOn(p.accent), cx = sw / 2;
  const brandInk = th.dark ? mix(p.brand, "#FFFFFF", 0.35) : p.brand;
  const raw = String(p.title || "").slice(0, 22) || "Discover";
  const tfs = Math.min(30, 220 / Math.max(1, raw.length * 0.56)).toFixed(1);
  const initial = esc(raw.trim().charAt(0).toUpperCase() || "A");
  let s = `<rect width="${sw}" height="${sh}" fill="${th.bg}"/>`;
  s += `<g clip-path="url(#pmHead)"><rect y="-10" width="${sw}" height="230" fill="${p.brand}"/>`;
  s += `<circle cx="${sw - 30}" cy="8" r="112" fill="${p.accent}" opacity="0.22"/><circle cx="${sw - 30}" cy="8" r="152" fill="none" stroke="${hi}" stroke-opacity="0.09" stroke-width="1.5"/><circle cx="${sw + 20}" cy="200" r="80" fill="${hi}" opacity="0.06"/></g>`;
  s += `<text x="30" y="35" font-size="15" font-weight="600" letter-spacing="-0.2" fill="${hi}">9:41</text>`;
  for (let i = 0; i < 4; i++) s += `<rect x="${(sw - 92 + i * 4.6).toFixed(1)}" y="${27 - i * 2}" width="3" height="${4 + i * 2}" rx="1" fill="${hi}"/>`;
  const wx = sw - 62;
  s += `<g fill="none" stroke="${hi}" stroke-width="1.8" stroke-linecap="round"><path d="M${wx - 8} 25 Q${wx} 17 ${wx + 8} 25"/><path d="M${wx - 4.5} 28 Q${wx} 24 ${wx + 4.5} 28"/></g><circle cx="${wx}" cy="31" r="1.6" fill="${hi}"/>`;
  s += `<rect x="${sw - 46}" y="21" width="24" height="12" rx="3.5" fill="none" stroke="${hi}" stroke-opacity="0.45"/><rect x="${sw - 44}" y="23" width="17" height="8" rx="2" fill="${hi}"/><rect x="${sw - 21}" y="25" width="2" height="4" rx="1" fill="${hi}" opacity="0.45"/>`;
  s += `<text x="24" y="92" font-size="13" fill="${hi}" opacity="0.72">Good morning</text>`;
  s += `<text x="24" y="126" font-size="${tfs}" font-weight="700" letter-spacing="-0.6" fill="${hi}">${esc(raw)}</text>`;
  s += `<circle cx="${sw - 44}" cy="106" r="20" fill="${p.accent}" stroke="${hi}" stroke-opacity="0.35" stroke-width="2"/><text x="${sw - 44}" y="111.5" text-anchor="middle" font-size="16" font-weight="700" fill="${ai}">${initial}</text>`;
  s += `<rect x="20" y="146" width="${sw - 40}" height="44" rx="22" fill="${hi}" fill-opacity="0.16"/>`;
  s += `<g transform="translate(36 159)" fill="none" stroke="${hi}" stroke-width="2" stroke-linecap="round" opacity="0.8"><circle cx="8" cy="8" r="6"/><path d="M12.5 12.5 16 16"/></g>`;
  s += `<text x="62" y="173" font-size="14" fill="${hi}" opacity="0.7">Search</text>`;
  s += `<rect x="${sw - 58}" y="152" width="32" height="32" rx="16" fill="${p.accent}"/><g stroke="${ai}" stroke-width="2" stroke-linecap="round"><path d="M${sw - 49} 162h14M${sw - 47} 168h10M${sw - 45} 174h6"/></g>`;
  let x = 20;
  ["All", "Fitness", "Work", "Travel"].forEach((c, i) => {
    const w = c.length * 7 + 28;
    s += `<rect x="${x}" y="228" width="${w}" height="30" rx="15" fill="${i ? th.card : p.accent}"${i ? ` stroke="${th.line}"` : ""}/>`;
    s += `<text x="${x + w / 2}" y="247.5" text-anchor="middle" font-size="12.5" font-weight="600" fill="${i ? th.text : ai}">${c}</text>`;
    x += w + 8;
  });
  s += `<text x="22" y="294" font-size="17" font-weight="700" letter-spacing="-0.3" fill="${th.text}">Today</text>`;
  s += `<text x="${sw - 22}" y="294" text-anchor="end" font-size="13" font-weight="600" fill="${brandInk}">See all</text>`;
  const top = 310, bottom = 614, gap = 12;
  const ch = (bottom - top - gap * (n - 1)) / n, mode = ch >= 120 ? 2 : ch >= 84 ? 1 : 0;
  for (let i = 0; i < n; i++) {
    const [t, sub, val, pct, gly] = DATA[i];
    const y = top + i * (ch + gap), col = i % 2 ? p.accent : p.brand;
    const rr = Math.min(18, ch / 2.6).toFixed(1);
    if (!th.dark) s += `<rect x="20" y="${(y + 2).toFixed(1)}" width="${sw - 40}" height="${ch.toFixed(1)}" rx="${rr}" fill="#101828" opacity="0.05"/>`;
    s += `<rect x="20" y="${y.toFixed(1)}" width="${sw - 40}" height="${ch.toFixed(1)}" rx="${rr}" fill="${th.card}"/>`;
    const ts = mode ? 44 : Math.min(48, ch - 20), tx = 32, ty = mode ? y + 14 : y + (ch - ts) / 2, mid = ty + ts / 2;
    s += `<rect x="${tx}" y="${ty.toFixed(1)}" width="${ts.toFixed(1)}" height="${ts.toFixed(1)}" rx="${(ts * 0.3).toFixed(1)}" fill="${mix(col, th.card, th.dark ? 0.72 : 0.84)}"/>`;
    const k = (ts * 0.5) / 24;
    s += `<g transform="translate(${(tx + ts / 2 - 12 * k).toFixed(1)} ${(mid - 12 * k).toFixed(1)}) scale(${k.toFixed(3)})" fill="none" stroke="${col}" stroke-width="${(1.9 / k).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"><path d="${gly}"/></g>`;
    const lx = tx + ts + 12;
    s += `<text x="${lx.toFixed(1)}" y="${(mid - 3).toFixed(1)}" font-size="${ch < 60 ? 13.5 : 14.5}" font-weight="650" fill="${th.text}">${t}</text>`;
    s += `<text x="${lx.toFixed(1)}" y="${(mid + 14).toFixed(1)}" font-size="12" fill="${th.muted}">${sub}</text>`;
    s += `<text x="${sw - 34}" y="${(mid + 5).toFixed(1)}" text-anchor="end" font-size="13" font-weight="700" fill="${i % 2 && th.dark ? p.accent : brandInk}">${val}</text>`;
    if (mode === 1) {
      const by = y + ch - 19, bw = sw - 64 - 42;
      s += `<rect x="32" y="${by.toFixed(1)}" width="${bw}" height="6" rx="3" fill="${th.line}"/><rect x="32" y="${by.toFixed(1)}" width="${(bw * pct).toFixed(1)}" height="6" rx="3" fill="${col}"/>`;
      s += `<text x="${sw - 32}" y="${(by + 6.5).toFixed(1)}" text-anchor="end" font-size="11.5" font-weight="600" fill="${th.text}">${Math.round(pct * 100)}%</text>`;
    } else if (mode === 2) {
      const by = y + ch - 22, bw = sw - 64, ay = (ty + ts + by - 14) / 2;
      [p.brand, mix(p.brand, p.accent, 0.5), p.accent].forEach((c, j) => {
        s += `<circle cx="${43 + j * 16}" cy="${ay.toFixed(1)}" r="11" fill="${c}" stroke="${th.card}" stroke-width="2.5"/>`;
      });
      s += `<text x="${43 + 32 + 20}" y="${(ay + 4).toFixed(1)}" font-size="12" fill="${th.muted}">+4 going</text>`;
      s += `<text x="32" y="${(by - 9).toFixed(1)}" font-size="11.5" fill="${th.muted}">Progress</text>`;
      s += `<text x="${sw - 32}" y="${(by - 9).toFixed(1)}" text-anchor="end" font-size="11.5" font-weight="600" fill="${th.text}">${Math.round(pct * 100)}%</text>`;
      s += `<rect x="32" y="${by.toFixed(1)}" width="${bw}" height="6" rx="3" fill="${th.line}"/><rect x="32" y="${by.toFixed(1)}" width="${(bw * pct).toFixed(1)}" height="6" rx="3" fill="${col}"/>`;
    }
  }
  s += `<rect y="${sh - 84}" width="${sw}" height="84" fill="${th.card}"/><rect y="${sh - 84}" width="${sw}" height="1" fill="${th.line}"/>`;
  TABS.forEach(([name, d], i) => {
    const tx = sw * (i + 0.5) / 4, c = i ? th.muted : brandInk;
    s += `<g transform="translate(${tx - 12} ${sh - 74})" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</g>`;
    s += `<text x="${tx}" y="${sh - 34}" text-anchor="middle" font-size="10.5" font-weight="${i ? 500 : 650}" fill="${c}">${name}</text>`;
  });
  s += `<rect x="${cx - 60}" y="${sh - 12}" width="120" height="5" rx="2.5" fill="${th.text}" opacity="0.85"/>`;
  if (p.notch === "island") {
    s += `<rect x="${cx - 54}" y="11" width="108" height="32" rx="16" fill="#000000"/><circle cx="${cx + 38}" cy="27" r="5.5" fill="#10131B"/><circle cx="${cx + 38}" cy="27" r="2.2" fill="#1F2B48"/>`;
  } else if (p.notch === "notch") {
    s += `<path d="M${cx - 66} 0 Q${cx - 60} 0 ${cx - 60} 6 V10 Q${cx - 60} 28 ${cx - 42} 28 H${cx + 42} Q${cx + 60} 28 ${cx + 60} 10 V6 Q${cx + 60} 0 ${cx + 66} 0Z" fill="#060608"/>`;
    s += `<rect x="${cx - 18}" y="10" width="36" height="5" rx="2.5" fill="#1A1C22"/><circle cx="${cx + 30}" cy="13" r="4" fill="#10131B"/><circle cx="${cx + 30}" cy="13" r="1.6" fill="#1F2B48"/>`;
  }
  s += `<rect width="${sw}" height="${sh}" fill="url(#pmGlare)"/>`;
  return s;
}

export default function render(p) {
  const CW = 800, CH = 1000, W = 360, H = 740, R = 60, sw = 332, sh = 712;
  const dark = p.theme === "dark";
  const th = dark
    ? { dark, bg: "#0C0C10", card: "#1A1A21", text: "#F3F3F6", muted: "#8A8A96", line: "#2A2A33" }
    : { dark, bg: "#F4F4F7", card: "#FFFFFF", text: "#15151B", muted: "#8C8C99", line: "#E6E6EC" };
  const n = Math.max(2, Math.min(5, Math.round(p.cards)));
  const ANG = {
    flat: { T: "translate(400 500)", ex: 0, ey: 0, sy: 1 },
    "angled left": { T: "translate(392 500) skewY(-7) scale(0.9 0.96)", ex: 10, ey: 0, sy: 0.96 },
    "angled right": { T: "translate(408 500) skewY(7) scale(0.9 0.96)", ex: -10, ey: 0, sy: 0.96 },
    isometric: { T: "translate(400 470) matrix(0.64 -0.37 0.64 0.37 0 0)", ex: 0, ey: 16, sy: 0 },
  };
  const A = ANG[p.angle] || ANG.flat, iso = p.angle === "isometric";
  const darkBg = lum(p.background) < 0.06;
  const shadowCol = darkBg ? p.brand : mix(p.background, "#000000", 0.72);
  const edgeCol = mix(p.frame, "#000000", 0.38);
  const hb = 212;
  const defs = `<defs>
<linearGradient id="pmFrame" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${mix(p.frame, "#FFFFFF", 0.28)}"/><stop offset="0.06" stop-color="${p.frame}"/><stop offset="0.5" stop-color="${mix(p.frame, "#FFFFFF", 0.08)}"/><stop offset="0.94" stop-color="${p.frame}"/><stop offset="1" stop-color="${mix(p.frame, "#000000", 0.35)}"/></linearGradient>
<radialGradient id="pmBg" cx="0.5" cy="0.42" r="0.65"><stop offset="0" stop-color="${mix(p.background, "#FFFFFF", darkBg ? 0.06 : 0.4)}"/><stop offset="1" stop-color="${p.background}"/></radialGradient>
<linearGradient id="pmGlare" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.13"/><stop offset="0.4" stop-color="#FFFFFF" stop-opacity="0.03"/><stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
<clipPath id="pmScr"><rect width="${sw}" height="${sh}" rx="46"/></clipPath>
<clipPath id="pmHead"><path d="M0 -10H${sw}V${hb - 28}Q${sw} ${hb} ${sw - 28} ${hb}H28Q0 ${hb} 0 ${hb - 28}Z"/></clipPath>
<filter id="pmSoftA" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="22"/></filter>
<filter id="pmSoftK" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="pmBlur" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="12"/></filter>
</defs>`;
  const body = `<rect x="${-W / 2}" y="${-H / 2}" width="${W}" height="${H}" rx="${R}"/>`;
  let edge = "";
  const steps = Math.max(Math.abs(A.ex), Math.abs(A.ey));
  for (let k = 1; k <= steps; k++) {
    const f = k / steps;
    edge += `<g transform="translate(${(A.ex * f).toFixed(1)} ${(A.ey * f).toFixed(1)})"><g transform="${A.T}" fill="${edgeCol}">${body}</g></g>`;
  }
  const sLayer = (dy, flt, op) => `<g transform="translate(${A.ex / 2} ${dy + A.ey})" filter="url(#${flt})" opacity="${op}"><g transform="${A.T}" fill="${shadowCol}">${body}</g></g>`;
  const shadows = p.shadow
    ? sLayer(iso ? 46 : 36, "pmSoftA", darkBg ? 0.42 : 0.26) + sLayer(iso ? 18 : 12, "pmSoftK", darkBg ? 0.2 : 0.3)
    : "";
  const btn = mix(p.frame, "#000000", 0.18);
  const buttons = [[-W / 2 - 3, -232, 30], [-W / 2 - 3, -178, 58], [-W / 2 - 3, -106, 58], [W / 2 - 2, -176, 92]]
    .map(([x, y, h]) => `<rect x="${x}" y="${y}" width="5" height="${h}" rx="2" fill="${btn}"/>`).join("");
  const ui = screenUI(p, th, n, sw, sh);
  const phone = `<g transform="${A.T}">${buttons}
<rect x="${-W / 2}" y="${-H / 2}" width="${W}" height="${H}" rx="${R}" fill="url(#pmFrame)"/>
<rect x="${-W / 2 + 1.5}" y="${-H / 2 + 1.5}" width="${W - 3}" height="${H - 3}" rx="${R - 1.5}" fill="none" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="1.5"/>
<rect x="${-W / 2 + 5}" y="${-H / 2 + 5}" width="${W - 10}" height="${H - 10}" rx="${R - 5}" fill="#060608"/>
<g transform="translate(${-sw / 2} ${-sh / 2})" font-family="${F}"><g clip-path="url(#pmScr)">${ui}</g></g></g>`;
  const contact = p.shadow && !iso
    ? `<ellipse cx="400" cy="${(500 + 370 * A.sy + 16).toFixed(1)}" rx="150" ry="11" fill="${darkBg ? "#000000" : shadowCol}" opacity="0.45" filter="url(#pmBlur)"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CW} ${CH}" width="${CW}" height="${CH}">${defs}<rect width="${CW}" height="${CH}" fill="${p.background}"/><rect width="${CW}" height="${CH}" fill="url(#pmBg)"/>${shadows}${contact}${edge}${phone}</svg>`;
}
