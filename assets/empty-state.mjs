// Friendly empty-state illustration: inbox, folder or search scene with seeded sparkles, title, copy and CTA.
export const meta = {
  title: "Gentle Empty State",
  kind: "ui",
  description: "A friendly empty-state illustration with title, supporting copy and call to action for inboxes, file views and zero-result searches.",
  tags: ["empty state", "ui", "illustration", "inbox", "onboarding", "app", "zero state", "placeholder"],
  price: 4,
  author: "oasis-factory",
  size: [800, 600],
};

export const params = {
  knobs: {
    brand: { type: "color", label: "Brand", default: "#5B5BF0" },
    ink: { type: "color", label: "Text", default: "#1C1D2B" },
    background: { type: "color", label: "Background", default: "#FAF8F5" },
    subject: { type: "choice", label: "Scene", default: "inbox", options: ["inbox", "folder", "search"] },
    style: { type: "choice", label: "Style", default: "duotone", options: ["line", "duotone", "filled"] },
    title: { type: "text", label: "Title", default: "You're all caught up" },
    description: { type: "text", label: "Description", default: "No new messages right now. We'll let you know the moment something lands." },
    sparkles: { type: "range", label: "Sparkles", default: 6, min: 0, max: 10, step: 1 },
    seed: { type: "range", label: "Seed", default: 7, min: 1, max: 100, step: 1 },
    button: { type: "toggle", label: "Show button", default: true },
  },
  presets: {
    Indigo: { brand: "#5B5BF0", ink: "#1C1D2B", background: "#FAF8F5" },
    Mint: { brand: "#15A37F", ink: "#14302A", background: "#F3F8F5" },
    Coral: { brand: "#F2665A", ink: "#2D1D1B", background: "#FFF6F1" },
    Midnight: { brand: "#8E8CFF", ink: "#ECECF6", background: "#15161F" },
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

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const A = hex(a), B = hex(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
const lum = (h) => { const [r, g, b] = hex(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f = (n) => n.toFixed(1);

function wrap(s, max) {
  const words = String(s).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const all = words.join(" ");
  if (all.length <= max) return [all];
  let best = null, score = 1e9;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(" "), b = words.slice(k).join(" ");
    if (a.length <= max && b.length <= max && Math.max(a.length, b.length) < score) {
      score = Math.max(a.length, b.length); best = [a, b];
    }
  }
  if (best) return best;
  const out = [""];
  for (const w of words) {
    const cur = out[out.length - 1];
    if (!cur) out[out.length - 1] = w;
    else if ((cur + " " + w).length <= max) out[out.length - 1] = cur + " " + w;
    else out.push(w);
  }
  const keep = out.slice(0, 2).map((l) => (l.length > max ? l.slice(0, max - 1) : l));
  keep[1] = (keep[1] || "").slice(0, max - 1).replace(/[\s.,;:]+$/, "") + "…";
  return keep;
}

export default function render(p) {
  const W = 800, H = 600, cx = 400, cy = 228;
  const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const bg = p.background, brand = p.brand, ink = p.ink;
  const dark = lum(bg) < 0.4;
  const tint = (t) => mix(brand, bg, t);
  const shade = mix(brand, "#000000", 0.22);
  const style = ["line", "duotone", "filled"].includes(p.style) ? p.style : "duotone";
  const subject = ["inbox", "folder", "search"].includes(p.subject) ? p.subject : "inbox";
  const sheet = dark ? mix(bg, "#FFFFFF", 0.82) : mix(bg, "#FFFFFF", 0.75);
  const fills = {
    line: { back: bg, main: bg, paper: bg, glass: bg },
    duotone: { back: tint(0.55), main: tint(0.8), paper: bg, glass: tint(0.92) },
    filled: { back: shade, main: brand, paper: sheet, glass: tint(0.7) },
  }[style];
  const stroked = style !== "filled";
  const SW = 4;
  const R = (role) => `fill="${fills[role]}"` + (stroked ? ` stroke="${brand}" stroke-width="${SW}" stroke-linejoin="round"` : role === "paper" ? ` filter="url(#ps)"` : "");
  const dc = stroked ? brand : tint(0.45);
  const ln = (d, c = dc, w = SW) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

  let scene = "", label = "Compose message", keep = [];
  if (subject === "folder") {
    label = "Upload files";
    keep = [[450, 131, 60], [288, 166, 26], [512, 186, 26], [280, 214, 26], [520, 214, 26]];
    scene += `<rect x="410" y="100" width="80" height="62" rx="9" fill="none" stroke="${tint(0.45)}" stroke-width="3" stroke-dasharray="7 7"/>`;
    scene += ln("M450,121 L450,141 M440,131 L460,131", tint(0.45), 3);
    scene += `<path d="M288,172 Q288,160 300,160 L356,160 Q364,160 369,166 L380,180 L500,180 Q512,180 512,192 L512,320 Q512,332 500,332 L300,332 Q288,332 288,320 Z" ${R("back")}/>`;
    scene += `<path d="M280,218 Q279,206 291,206 L509,206 Q521,206 520,218 L512,320 Q511,332 499,332 L301,332 Q289,332 288,320 Z" ${R("main")}/>`;
    scene += ln("M374,302 L426,302", stroked ? brand : tint(0.45));
  } else if (subject === "search") {
    label = "Clear filters";
    keep = [[448, 250, 70], [305, 157, 20], [441, 145, 20]];
    scene += `<g transform="rotate(-5 380 236)"><rect x="312" y="150" width="136" height="172" rx="12" ${R("paper")}/>`;
    scene += ln("M338,182 L372,182", dc, 6);
    scene += ln("M338,210 L420,210") + ln("M338,232 L404,232") + ln("M338,254 L414,254") + ln("M338,276 L388,276") + `</g>`;
    scene += `<g transform="translate(448 250) rotate(-45)">`;
    scene += `<rect x="-7" y="44" width="14" height="16" rx="3" ${R("back")}/>`;
    scene += `<rect x="-11" y="56" width="22" height="60" rx="11" ${R("main")}/>`;
    scene += `<circle r="52" ${R("main")}/><circle r="38" ${R("glass")}/>`;
    scene += ln("M-24,-10 A26,26 0 0 1 -6,-26", stroked ? brand : bg, 4);
    scene += `</g>`;
  } else {
    keep = [[358, 140, 62], [522, 186, 44], [268, 262, 28], [532, 262, 28], [440, 200, 30]];
    scene += `<path d="M298,196 L502,196 Q510,196 513,204 L532,262 L268,262 L287,204 Q290,196 298,196 Z" ${R("back")}/>`;
    scene += `<path d="M436,252 C472,214 452,166 402,150" fill="none" stroke="${tint(0.45)}" stroke-width="3" stroke-dasharray="1 9" stroke-linecap="round"/>`;
    scene += `<g transform="translate(358 140) rotate(-12)"><rect x="-36" y="-25" width="72" height="50" rx="7" ${R("paper")}/>${ln("M-29,-17 L0,4 L29,-17")}</g>`;
    scene += `<path d="M268,262 L344,262 Q351,262 354,268 L362,284 Q365,290 372,290 L428,290 Q435,290 438,284 L446,268 Q449,262 456,262 L532,262 L532,318 Q532,332 518,332 L282,332 Q268,332 268,318 Z" ${R("main")}/>`;
    const bf = style === "filled" ? brand : bg, bs = style === "filled" ? bg : brand;
    scene += `<circle cx="522" cy="186" r="24" fill="${bf}" stroke="${bs}" stroke-width="4"/>`;
    scene += ln("M511,186 L519,194 L533,179", bs, 4.5);
  }

  const r = rng(p.seed * 9973 + 17);
  const n = Math.max(0, Math.round(p.sparkles));
  const placed = [];
  for (let i = 0; i < n; i++) {
    let best = null, bs = -1e9;
    for (let k = 0; k < 12; k++) {
      const a = ((168 + ((i + 0.1 + r() * 0.8) * 204) / n) * Math.PI) / 180;
      const rad = 162 + r() * 38;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad * 0.92;
      let s = 1e9;
      for (const [kx, ky, kr] of keep) s = Math.min(s, Math.hypot(x - kx, y - ky) - kr);
      for (const [px, py] of placed) s = Math.min(s, Math.hypot(x - px, y - py) - 44);
      if (s > bs) { bs = s; best = [x, y]; }
      if (s >= 0) break;
    }
    placed.push(best);
  }
  let sp = "";
  placed.forEach(([x, y], i) => {
    const roll = r();
    const t = roll < 0.45 ? 0 : roll < 0.72 ? 1 : 2;
    const col = i % 2 ? tint(0.4) : brand;
    if (t === 0) {
      const s = 7 + r() * 7, k = s * 0.2;
      const d = `M${f(x)},${f(y - s)} Q${f(x + k)},${f(y - k)} ${f(x + s)},${f(y)} Q${f(x + k)},${f(y + k)} ${f(x)},${f(y + s)} Q${f(x - k)},${f(y + k)} ${f(x - s)},${f(y)} Q${f(x - k)},${f(y - k)} ${f(x)},${f(y - s)}Z`;
      sp += style === "line"
        ? `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round"/>`
        : `<path d="${d}" fill="${col}"/>`;
    } else if (t === 1) {
      const s = 3 + r() * 3;
      sp += style === "line"
        ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="none" stroke="${col}" stroke-width="2.5"/>`
        : `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="${col}"/>`;
    } else {
      const s = 5 + r() * 3;
      sp += ln(`M${f(x - s)},${f(y)} L${f(x + s)},${f(y)} M${f(x)},${f(y - s)} L${f(x)},${f(y + s)}`, col, 3);
    }
  });

  const muted = mix(ink, bg, 0.42);
  const title = String(p.title || "").trim();
  const tShow = title.length > 36 ? title.slice(0, 35).trimEnd() + "…" : title;
  const dLines = wrap(p.description || "", 50);
  let txt = "";
  if (tShow) txt += `<text x="${cx}" y="414" text-anchor="middle" font-family="${SANS}" font-size="30" font-weight="700" letter-spacing="-0.6" fill="${ink}">${esc(tShow)}</text>`;
  dLines.forEach((l, i) => {
    txt += `<text x="${cx}" y="${450 + i * 26}" text-anchor="middle" font-family="${SANS}" font-size="17" fill="${muted}">${esc(l)}</text>`;
  });
  let bottom = dLines.length ? 456 + (dLines.length - 1) * 26 : tShow ? 422 : 372;
  if (p.button) {
    const by = bottom + 26, bw = Math.round(label.length * 8.4 + 56);
    const bt = lum(brand) > 0.58 ? "#15161F" : "#FFFFFF";
    txt += `<rect x="${cx - bw / 2}" y="${by}" width="${bw}" height="46" rx="23" fill="${brand}" filter="url(#sh)"/>`;
    txt += `<text x="${cx}" y="${by + 28.5}" text-anchor="middle" font-family="${SANS}" font-size="15" font-weight="600" letter-spacing="0.2" fill="${bt}">${label}</text>`;
    bottom = by + 46;
  }
  const dy = Math.round(300 - (88 + bottom) / 2);

  const defs = `<defs><filter id="sh" x="-20%" y="-40%" width="140%" height="200%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="${brand}" flood-opacity="${dark ? 0.35 : 0.28}"/></filter>` +
    `<filter id="ps" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="${shade}" flood-opacity="${dark ? 0.5 : 0.22}"/></filter></defs>`;
  const ground = dark ? `fill="#000000" opacity="0.35"` : `fill="${ink}" opacity="0.07"`;
  const backdrop = `<circle cx="${cx}" cy="${cy}" r="140" fill="${tint(dark ? 0.86 : 0.9)}"/><ellipse cx="${cx}" cy="340" rx="132" ry="7" ${ground}/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}<rect width="${W}" height="${H}" fill="${bg}"/><g transform="translate(0 ${dy})">${backdrop}${sp}${scene}${txt}</g></svg>`;
}
