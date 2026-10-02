// Responsive top navigation bar: a frosted sticky header shown in a browser window, on phones, or both side by side.
export const meta = {
  title: "Frosted Top Nav",
  kind: "ui",
  description: "A responsive top navigation bar with logo slot, links, search and avatar or CTA. It shows on desktop and in an open hamburger menu, for UI kits, landing pages and specs.",
  tags: ["navbar", "navigation", "header", "menu", "hamburger", "web ui", "responsive", "glassmorphism"],
  price: 0,
  author: "oasis-factory",
  size: [1200, 640],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#F4F2EE" },
    ink: { type: "color", role: "ink", label: "Ink", default: "#17171C" },
    primary: { type: "color", role: "primary", label: "Accent", default: "#4F46E5" },
    theme: { type: "choice", label: "Theme", default: "light", options: ["light", "dark"] },
    view: { type: "choice", label: "View", default: "responsive", options: ["responsive", "desktop", "mobile"] },
    align: { type: "choice", label: "Link alignment", default: "left", options: ["left", "center", "right"] },
    action: { type: "choice", label: "Right slot", default: "both", options: ["avatar", "cta", "both"] },
    links: { type: "range", label: "Link count", default: 5, min: 2, max: 6, step: 1 },
    active: { type: "range", label: "Active item", default: 2, min: 1, max: 6, step: 1 },
    sticky: { type: "toggle", label: "Sticky blur bar", default: true },
    brand: { type: "text", label: "Brand name", default: "Northwind" },
  },
  presets: {
    Terracotta: { background: "#F7F0E6", ink: "#2A2118", primary: "#D2603A" },
    Fern: { background: "#EDF3EE", ink: "#12261B", primary: "#2E8B57" },
    Midnight: { background: "#0E1117", ink: "#E8ECF4", primary: "#7C9CFF" },
    Orchid: { background: "#FBF4FA", ink: "#2B1230", primary: "#B5368C" },
  },
};

const SANS = "Helvetica Neue, Helvetica, Arial, sans-serif";
const LINKS = ["Product", "Solutions", "Pricing", "Docs", "Customers", "Company"];
const f = (n) => +n.toFixed(1);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tw = (s, size, bold) => s.length * size * (bold ? 0.57 : 0.52);
const hx = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (c) => { const [r, g, b] = hx(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const con = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const on = (bg, a, b) => (con(bg, a) >= con(bg, b) ? a : b);

function pal(p) {
  const light = p.theme !== "dark", bgLight = lum(p.background) >= lum(p.ink);
  let paper = light === bgLight ? p.background : p.ink, text = light === bgLight ? p.ink : p.background;
  if (light && lum(paper) < 0.45) paper = mix(paper, "#FFFFFF", 0.88);
  if (!light && lum(paper) > 0.12) paper = mix(paper, "#000000", 0.85);
  if (con(paper, text) < 4.5) text = light ? "#15151A" : "#F3F3F6";
  const bar = light ? mix(paper, "#FFFFFF", 0.7) : mix(paper, text, 0.07);
  let pri = p.primary;
  if (con(pri, bar) < 1.8) pri = mix(pri, text, 0.45);
  let t = light ? 0.16 : 0.26, tint = mix(bar, pri, t);
  while (con(tint, bar) < 1.22 && t < 0.5) { t += 0.04; tint = mix(bar, pri, t); }
  return {
    light, paper, text, bar, pri, tint, priInk: on(pri, "#FFFFFF", "#121216"), ring: mix(tint, pri, 0.4),
    muted: mix(text, paper, 0.34), edge: mix(bar, text, light ? 0.1 : 0.14), field: mix(bar, text, light ? 0.045 : 0.07),
    canvas: light ? mix(paper, text, 0.06) : mix(paper, "#000000", 0.4), orb: mix(pri, paper, 0.55),
    dot: mix(paper, text, light ? 0.16 : 0.12), chrome: mix(paper, text, light ? 0.04 : 0.06),
    mark: mix(paper, text, light ? 0.26 : 0.22), grid: mix(paper, text, light ? 0.07 : 0.09),
  };
}

const mag = (x, cy, c) => `<circle cx="${f(x + 6)}" cy="${f(cy - 1)}" r="5.5" fill="none" stroke="${c}" stroke-width="1.8"/><path d="M${f(x + 10)} ${f(cy + 3)}l3.6 3.6" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`;
const btn = (x, y, w, h, label, P, fs) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${h}" rx="${f(h * 0.3)}" fill="${P.pri}"/><text x="${f(x + w / 2)}" y="${f(y + h / 2 + fs * 0.36)}" text-anchor="middle" font-size="${fs}" font-weight="600" fill="${P.priInk}">${label}</text>`;
const pill = (x, y, w, h, rx, P) => `<rect x="${f(x + 0.5)}" y="${f(y + 0.5)}" width="${f(w - 1)}" height="${f(h - 1)}" rx="${rx}" fill="${P.tint}" stroke="${P.ring}"/>`;

function logo(x, cy, s, P, brand, fs) {
  const y = cy - s / 2, u = s / 30;
  return `<rect x="${f(x)}" y="${f(y)}" width="${s}" height="${s}" rx="${f(9 * u)}" fill="${P.pri}"/><circle cx="${f(x + 12 * u)}" cy="${f(cy)}" r="${f(5.5 * u)}" fill="${P.priInk}"/><circle cx="${f(x + 18.5 * u)}" cy="${f(cy)}" r="${f(5.5 * u)}" fill="${P.priInk}" fill-opacity="0.5"/><text x="${f(x + s + 10)}" y="${f(cy + fs * 0.35)}" font-size="${fs}" font-weight="700" letter-spacing="-0.3" fill="${P.text}">${brand}</text>`;
}

function avatar(cx, cy, r, P) {
  const fill = mix(P.pri, P.paper, 0.35), ink = on(fill, "#FFFFFF", "#121216");
  return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}" fill="${fill}" stroke="${P.bar}" stroke-width="1.5"/><text x="${f(cx - r * 0.04)}" y="${f(cy + r * 0.24)}" text-anchor="middle" font-size="${f(r * 0.66)}" font-weight="700" letter-spacing="0.2" fill="${ink}">MR</text><circle cx="${f(cx + r * 0.74)}" cy="${f(cy + r * 0.74)}" r="${f(r * 0.24)}" fill="#2FBF71" stroke="${P.bar}" stroke-width="2"/>`;
}

function chart(x, y, w, h, P) {
  const v = [0.38, 0.52, 0.44, 0.66, 0.58, 0.74, 0.62, 0.9, 0.78], step = w / v.length, bw = step * 0.56;
  return v.map((t, i) => `<rect x="${f(x + i * step + (step - bw) / 2)}" y="${f(y + h - h * t)}" width="${f(bw)}" height="${f(h * t)}" rx="${f(Math.min(4, bw / 2))}" fill="${P.pri}" fill-opacity="${i === 7 ? 1 : 0.28}"/>`).join("");
}

function backdrop(x, y, w, h, gh, P) {
  return `<rect x="${x}" y="${y - 40}" width="${w}" height="${h + 40}" fill="${P.paper}"/><rect x="${x}" y="${y - 40}" width="${w}" height="${gh}" fill="url(#gp)"/><rect x="${x}" y="${y - 40}" width="${w}" height="${gh + 1}" fill="url(#gf)"/>`;
}

function heroDesk(x, y, w, h, P, orbs) {
  const lx = x + 72, cx = x + w - 520, cy = y + 108, cw = 448, ey = y + 118;
  let s = backdrop(x, y, w, h, 380, P) + `<ellipse cx="${x + w - 240}" cy="${y + 70}" rx="440" ry="300" fill="url(#gl)"/>`;
  if (orbs) s += `<circle cx="${x + w - 110}" cy="${y + 36}" r="52" fill="${P.pri}"/><circle cx="${x + w - 232}" cy="${y + 60}" r="30" fill="${P.orb}"/>`;
  s += `<rect x="${lx}" y="${ey}" width="196" height="30" rx="15" fill="${P.tint}"/><circle cx="${lx + 16}" cy="${ey + 15}" r="4" fill="${P.pri}"/><text x="${lx + 28}" y="${ey + 19.5}" font-size="12.5" font-weight="500" fill="${P.text}">New — Spring release</text>`;
  s += `<text font-size="50" font-weight="700" letter-spacing="-1.6" fill="${P.text}"><tspan x="${lx}" y="${y + 200}">Build calmer</tspan><tspan x="${lx}" y="${y + 256}">products, faster.</tspan></text>`;
  s += `<text font-size="17" fill="${P.muted}"><tspan x="${lx}" y="${y + 300}">One workspace for roadmaps, docs and launches —</tspan><tspan x="${lx}" y="${y + 326}">tuned for small, fast-moving teams.</tspan></text>`;
  s += btn(lx, y + 356, 148, 48, "Start free", P, 15) + `<rect x="${lx + 162}" y="${y + 356}" width="164" height="48" rx="14.4" fill="none" stroke="${P.edge}" stroke-width="1.5"/><text x="${lx + 244}" y="${y + 385.5}" text-anchor="middle" font-size="15" font-weight="600" fill="${P.text}">Book a demo</text>`;
  s += `<text x="${lx}" y="${y + 446}" font-size="12" font-weight="600" letter-spacing="1.4" fill="${P.muted}">TRUSTED BY 4,000+ TEAMS</text>`;
  const lw = [50, 38, 58, 44], my = y + 472;
  let mx = lx;
  for (let i = 0; i < 4; i++) {
    s += i % 2 ? `<rect x="${mx}" y="${my - 6}" width="12" height="12" rx="3" fill="${P.mark}"/>` : `<circle cx="${mx + 6}" cy="${my}" r="6" fill="${P.mark}"/>`;
    s += `<rect x="${mx + 18}" y="${my - 4.5}" width="${lw[i]}" height="9" rx="4.5" fill="${P.mark}"/>`;
    mx += 18 + lw[i] + 30;
  }
  s += `<rect x="${cx}" y="${cy}" width="${cw}" height="392" rx="24" fill="url(#cg)"/>`;
  s += `<rect x="${cx + 24}" y="${cy + 24}" width="${cw - 48}" height="56" rx="14" fill="${P.paper}" fill-opacity="0.92"/><circle cx="${cx + 52}" cy="${cy + 52}" r="12" fill="${P.tint}"/><rect x="${cx + 74}" y="${cy + 43}" width="120" height="8" rx="4" fill="${P.text}" fill-opacity="0.8"/><rect x="${cx + 74}" y="${cy + 57}" width="80" height="6" rx="3" fill="${P.muted}" fill-opacity="0.6"/><rect x="${cx + cw - 104}" y="${cy + 40}" width="56" height="24" rx="12" fill="${P.pri}"/>`;
  s += `<rect x="${cx + 24}" y="${cy + 96}" width="${cw - 48}" height="184" rx="16" fill="${P.paper}" fill-opacity="0.95"/><text x="${cx + 46}" y="${cy + 136}" font-size="26" font-weight="700" letter-spacing="-0.6" fill="${P.text}">+38%</text><text x="${cx + 46}" y="${cy + 156}" font-size="12.5" fill="${P.muted}">Weekly active teams</text>${chart(cx + 46, cy + 172, cw - 92, 90, P)}`;
  const tw2 = (cw - 60) / 2;
  s += `<rect x="${cx + 24}" y="${cy + 296}" width="${tw2}" height="80" rx="16" fill="${P.paper}" fill-opacity="0.92"/><circle cx="${cx + 64}" cy="${cy + 336}" r="18" fill="none" stroke="${P.tint}" stroke-width="6"/><circle cx="${cx + 64}" cy="${cy + 336}" r="18" fill="none" stroke="${P.pri}" stroke-width="6" stroke-linecap="round" stroke-dasharray="81 200" transform="rotate(-90 ${cx + 64} ${cy + 336})"/><text x="${cx + 94}" y="${cy + 342}" font-size="17" font-weight="700" fill="${P.text}">72%</text>`;
  s += `<rect x="${cx + 36 + tw2}" y="${cy + 296}" width="${tw2}" height="80" rx="16" fill="${P.paper}" fill-opacity="0.92"/>`;
  for (let i = 0; i < 3; i++) s += `<rect x="${cx + 56 + tw2}" y="${cy + 316 + i * 16}" width="${[120, 92, 140][i]}" height="7" rx="3.5" fill="${i ? P.muted : P.text}" fill-opacity="${i ? 0.45 : 0.75}"/>`;
  return s;
}

function heroPhone(x, y, w, h, P, orbs) {
  const lx = x + 22, ey = y + 126, cy = y + 392, cw = w - 44;
  let s = backdrop(x, y, w, h, 290, P) + `<ellipse cx="${x + w - 40}" cy="${y + 90}" rx="220" ry="180" fill="url(#gl)"/>`;
  if (orbs) s += `<circle cx="${x + w - 58}" cy="${y + 86}" r="30" fill="${P.pri}"/><circle cx="${x + w - 108}" cy="${y + 104}" r="15" fill="${P.orb}"/>`;
  s += `<rect x="${lx}" y="${ey}" width="128" height="24" rx="12" fill="${P.tint}"/><circle cx="${lx + 13}" cy="${ey + 12}" r="3.5" fill="${P.pri}"/><text x="${lx + 23}" y="${ey + 16}" font-size="11.5" font-weight="500" fill="${P.text}">Spring release</text>`;
  s += `<text font-size="30" font-weight="700" letter-spacing="-0.9" fill="${P.text}"><tspan x="${lx}" y="${y + 184}">Build calmer</tspan><tspan x="${lx}" y="${y + 218}">products,</tspan><tspan x="${lx}" y="${y + 252}">faster.</tspan></text>`;
  s += `<text font-size="14" fill="${P.muted}"><tspan x="${lx}" y="${y + 282}">One workspace for roadmaps,</tspan><tspan x="${lx}" y="${y + 302}">docs and launches.</tspan></text>`;
  s += btn(lx, y + 324, cw, 46, "Start free", P, 15);
  s += `<rect x="${lx}" y="${cy}" width="${cw}" height="168" rx="20" fill="url(#cg)"/><rect x="${lx + 12}" y="${cy + 12}" width="${cw - 24}" height="136" rx="14" fill="${P.paper}" fill-opacity="0.95"/><text x="${lx + 26}" y="${cy + 44}" font-size="20" font-weight="700" fill="${P.text}">+38%</text>${chart(lx + 26, cy + 58, cw - 52, 74, P)}`;
  return s;
}

function frost(id, x, y, w, h, rx, hero, P) {
  const r = `x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}"`;
  const hl = P.light ? `<path d="M${f(x + rx)} ${f(y + 1)}h${f(w - 2 * rx)}" stroke="#FFFFFF" stroke-opacity="0.9"/>` : "";
  return { def: `<clipPath id="${id}"><rect ${r}/></clipPath>`, svg: `<rect ${r} fill="${P.bar}" filter="url(#bs)"/><g clip-path="url(#${id})"><g filter="url(#bl)">${hero}</g></g><rect ${r} fill="${P.bar}" fill-opacity="${P.light ? 0.6 : 0.64}" stroke="${P.edge}" stroke-opacity="0.8"/>${hl}` };
}

function navDesk(bx, by, bw, bh, P, p, n, act, raw, brand) {
  const pad = bh > 64 ? 32 : 22, cy = by + bh / 2, avail = bw - 2 * pad, gap = 44;
  const logoW = 40 + tw(raw, 17, 1), ws = LINKS.slice(0, n).map((l) => tw(l, 14) + 28);
  const linksW = ws.reduce((a, b) => a + b, 0) + (n - 1) * 4;
  const ctaW = tw("Get started", 14, 1) + 32, signW = tw("Sign in", 14) + 14;
  const actW = p.action === "avatar" ? 36 : p.action === "cta" ? signW + ctaW : ctaW + 12 + 36;
  const rw = (sw) => sw + 12 + actW;
  const fits = (sw) => (p.align === "center" ? 2 * Math.max(logoW, rw(sw)) : logoW + rw(sw)) + linksW + 2 * gap <= avail;
  const sW = [180, 140].find(fits) || 38, rS = bx + bw - pad - rw(sW), lE = bx + pad + logoW;
  let lx = p.align === "left" ? lE + gap : p.align === "right" ? rS - gap - linksW : bx + bw / 2 - linksW / 2;
  if (lx < lE + gap - 1 || lx + linksW > rS - gap + 1) lx = (lE + rS) / 2 - linksW / 2;
  let s = logo(bx + pad, cy, 30, P, brand, 17), x = lx;
  ws.forEach((w, i) => {
    const a = i === act;
    if (a) s += pill(x, cy - 17, w, 34, 17, P);
    s += `<text x="${f(x + w / 2)}" y="${f(cy + 5)}" text-anchor="middle" font-size="14" font-weight="${a ? 650 : 500}" fill="${a ? P.text : P.muted}">${LINKS[i]}</text>`;
    x += w + 4;
  });
  x = rS;
  if (sW > 38) {
    s += `<rect x="${f(x)}" y="${f(cy - 19)}" width="${sW}" height="38" rx="19" fill="${P.field}" stroke="${P.edge}"/>${mag(x + 14, cy, P.muted)}<text x="${f(x + 38)}" y="${f(cy + 4.5)}" font-size="13.5" fill="${P.muted}">Search</text>`;
    if (sW === 180) s += `<rect x="${f(x + sW - 44)}" y="${f(cy - 11)}" width="32" height="22" rx="6" fill="${P.bar}" stroke="${P.edge}"/><text x="${f(x + sW - 28)}" y="${f(cy + 4.2)}" text-anchor="middle" font-size="12" font-weight="600" fill="${P.muted}">⌘K</text>`;
  } else s += `<circle cx="${f(x + 19)}" cy="${f(cy)}" r="19" fill="${P.field}" stroke="${P.edge}"/>${mag(x + 12, cy, P.text)}`;
  x += sW + 12;
  if (p.action === "cta") { s += `<text x="${f(x + 4)}" y="${f(cy + 5)}" font-size="14" font-weight="500" fill="${P.text}">Sign in</text>`; x += signW; }
  if (p.action !== "avatar") { s += btn(x, cy - 19, ctaW, 38, "Get started", P, 14); x += ctaW + 12; }
  if (p.action !== "cta") s += avatar(x + 18, cy, 18, P);
  return s;
}

function navPhone(bx, by, bw, bh, P, p, raw, brand, open) {
  const cy = by + bh / 2, pad = 16, lw = 36 + tw(raw, 15, 1), aW = p.action === "cta" ? 48 : 30, c = P.text;
  const burger = (x) => open ? `<path d="M${f(x + 2)} ${f(cy - 7)}l14 14M${f(x + 16)} ${f(cy - 7)}l-14 14" stroke="${c}" stroke-width="2" stroke-linecap="round"/>` : `<path d="M${f(x)} ${f(cy - 6)}h18M${f(x)} ${f(cy)}h18M${f(x)} ${f(cy + 6)}h11" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`;
  const action = (x) => p.action === "cta" ? btn(x, cy - 15, 48, 30, "Join", P, 13) : avatar(x + 15, cy, 15, P);
  if (p.align === "center") return burger(bx + pad) + logo(bx + bw / 2 - lw / 2, cy, 26, P, brand, 15) + action(bx + bw - pad - aW);
  return logo(bx + pad, cy, 26, P, brand, 15) + action(bx + bw - pad - 32 - aW) + burger(bx + bw - pad - 18);
}

function sheet(x, y, w, h, rx, P, p, n, act) {
  const ix = x + 14, iw = w - 28;
  let s = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}" fill="${P.bar}" stroke="${P.edge}" stroke-opacity="${rx ? 0.8 : 0}" filter="url(#bs)"/>`;
  let yy = y + 16;
  s += `<rect x="${f(ix)}" y="${f(yy)}" width="${f(iw)}" height="40" rx="12" fill="${P.field}" stroke="${P.edge}"/>${mag(ix + 14, yy + 20, P.muted)}<text x="${f(ix + 38)}" y="${f(yy + 25)}" font-size="14" fill="${P.muted}">Search</text>`;
  yy += 56;
  const fh = p.action === "avatar" ? 60 : 84, fy = y + h - 16 - fh, rh = Math.min(50, (fy - 12 - yy) / n);
  const al = p.align, anchor = al === "left" ? "start" : al === "right" ? "end" : "middle";
  const tx = al === "left" ? ix + 18 : al === "right" ? ix + iw - 18 : ix + iw / 2;
  for (let i = 0; i < n; i++) {
    const ry = yy + i * rh, mid = ry + (rh - 6) / 2, a = i === act;
    if (a) {
      s += pill(ix, ry, iw, rh - 6, 12, P);
      if (al !== "center") s += `<rect x="${f(al === "left" ? ix + 6 : ix + iw - 9)}" y="${f(mid - 9)}" width="3" height="18" rx="1.5" fill="${P.pri}"/>`;
    }
    s += `<text x="${f(tx)}" y="${f(mid + 6)}" text-anchor="${anchor}" font-size="17" font-weight="${a ? 650 : 500}" fill="${P.text}">${LINKS[i]}</text>`;
    if (al === "left") s += `<path d="M${f(ix + iw - 22)} ${f(mid - 5)}l5 5-5 5" fill="none" stroke="${P.muted}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (al === "right") s += `<path d="M${f(ix + 22)} ${f(mid - 5)}l-5 5 5 5" fill="none" stroke="${P.muted}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  s += `<path d="M${f(ix)} ${f(fy - 4)}h${f(iw)}" stroke="${P.edge}"/>`;
  if (p.action === "avatar") s += avatar(ix + 22, fy + 32, 18, P) + `<text x="${f(ix + 50)}" y="${f(fy + 29)}" font-size="15" font-weight="600" fill="${P.text}">Maya Reed</text><text x="${f(ix + 50)}" y="${f(fy + 46)}" font-size="12.5" fill="${P.muted}">View profile</text>`;
  else s += btn(ix, fy + 8, iw, 46, "Get started", P, 15) + `<text x="${f(ix + iw / 2)}" y="${f(fy + 76)}" text-anchor="middle" font-size="12.5" fill="${P.muted}">Have an account? Sign in</text>`;
  return s;
}

function phone(P, p, n, act, ps, pb, k, px, py, open) {
  const sx = px + 8, sy = py + 8, sw = 274, sh = 584;
  const frame = P.light ? mix(P.text, "#000000", 0.3) : mix(P.paper, P.text, 0.16);
  let defs = `<clipPath id="sc${k}"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="38"/></clipPath>`;
  let hero = heroPhone(sx, sy, sw, sh, P, p.sticky), bar;
  if (open) hero += `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="${P.paper}" fill-opacity="0.6"/>`;
  if (p.sticky) { const fr = frost(`bc${k}`, sx + 10, sy + 48, sw - 20, 52, 16, hero, P); defs += fr.def; bar = fr.svg + navPhone(sx + 10, sy + 48, sw - 20, 52, P, p, ps, pb, open); }
  else bar = `<rect x="${sx}" y="${sy}" width="${sw}" height="100" fill="${P.bar}"/><path d="M${sx} ${sy + 100}h${sw}" stroke="${P.edge}"/>` + navPhone(sx, sy + 46, sw, 54, P, p, ps, pb, open);
  const status = `<text x="${sx + 30}" y="${sy + 29}" font-size="13" font-weight="600" fill="${P.text}">9:41</text><rect x="${sx + sw / 2 - 42}" y="${sy + 10}" width="84" height="26" rx="13" fill="#000"/>${[0, 1, 2, 3].map((q) => `<rect x="${sx + sw - 76 + q * 5}" y="${sy + 24 - q * 2}" width="3" height="${3 + q * 2}" rx="1" fill="${P.text}"/>`).join("")}<rect x="${sx + sw - 50}" y="${sy + 18.5}" width="22" height="11" rx="3.5" fill="none" stroke="${P.text}" stroke-opacity="0.5"/><rect x="${sx + sw - 48}" y="${sy + 20.5}" width="15" height="7" rx="2" fill="${P.text}"/>`;
  const sht = !open ? "" : p.sticky ? sheet(sx + 10, sy + 108, sw - 20, sh - 118, 22, P, p, n, act) : sheet(sx, sy + 100, sw, sh - 100, 0, P, p, n, act);
  return { defs, svg: `<rect x="${px}" y="${py}" width="290" height="600" rx="46" fill="${frame}" stroke="${P.edge}" filter="url(#sh)"/><g clip-path="url(#sc${k})">${hero}${bar}${status}${sht}</g>` };
}

function desk(P, p, n, act, raw, brand) {
  const vx = 40, vy = 76, vw = 1120, vh = 528, hero = heroDesk(vx, vy, vw, vh, P, p.sticky);
  const slug = raw.toLowerCase().replace(/[^a-z0-9]/g, "") || "studio";
  let defs = `<clipPath id="wc"><rect x="40" y="36" width="1120" height="568" rx="16"/></clipPath>`, bar;
  const chrome = `<rect x="40" y="36" width="1120" height="40" fill="${P.chrome}"/><path d="M40 76h1120" stroke="${P.edge}"/>${[0, 1, 2].map((q) => `<circle cx="${64 + q * 18}" cy="56" r="5.5" fill="${P.dot}"/>`).join("")}<rect x="430" y="45" width="340" height="22" rx="11" fill="${P.paper}"/><text x="600" y="60.5" text-anchor="middle" font-size="12.5" fill="${P.muted}">${slug}.com</text>`;
  if (p.sticky) { const fr = frost("bc", vx + 20, vy + 14, vw - 40, 60, 18, hero, P); defs += fr.def; bar = fr.svg + navDesk(vx + 20, vy + 14, vw - 40, 60, P, p, n, act, raw, brand); }
  else bar = `<rect x="${vx}" y="${vy}" width="${vw}" height="68" fill="${P.bar}"/><path d="M${vx} ${vy + 68}h${vw}" stroke="${P.edge}"/>` + navDesk(vx, vy, vw, 68, P, p, n, act, raw, brand);
  return { defs, svg: `<rect x="40" y="36" width="1120" height="568" rx="16" fill="${P.paper}" filter="url(#sh)"/><g clip-path="url(#wc)">${hero}${chrome}${bar}</g><rect x="40" y="36" width="1120" height="568" rx="16" fill="none" stroke="${P.edge}"/>` };
}

export default function render(p) {
  const P = pal(p), W = 1200, H = 640, n = Math.max(2, Math.min(6, Math.round(p.links)));
  const act = Math.max(1, Math.min(Math.round(p.active), n)) - 1;
  const raw = String(p.brand || "").trim().slice(0, 16) || "Studio", brand = esc(raw);
  const ps = raw.length > 9 ? raw.slice(0, 9) + "…" : raw, pb = esc(ps);
  let defs = `<radialGradient id="gl"><stop offset="0" stop-color="${P.pri}" stop-opacity="${P.light ? 0.3 : 0.42}"/><stop offset="1" stop-color="${P.pri}" stop-opacity="0"/></radialGradient><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P.pri}"/><stop offset="1" stop-color="${mix(P.pri, P.paper, 0.55)}"/></linearGradient><linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.paper}" stop-opacity="0"/><stop offset="1" stop-color="${P.paper}"/></linearGradient><pattern id="gp" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="${P.grid}"/></pattern><filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="20" flood-color="#000" flood-opacity="${P.light ? 0.12 : 0.5}"/></filter><filter id="bs" x="-10%" y="-40%" width="120%" height="200%"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000" flood-opacity="${P.light ? 0.08 : 0.4}"/></filter><filter id="bl" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="14"/></filter><pattern id="dp" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="${P.dot}"/></pattern>`;
  let body = `<rect width="${W}" height="${H}" fill="${P.canvas}"/><rect width="${W}" height="${H}" fill="url(#dp)" opacity="0.7"/>`;
  if (p.view === "mobile") {
    for (let i = 0; i < 2; i++) { const ph = phone(P, p, n, act, ps, pb, i, 280 + i * 350, 20, i === 1); defs += ph.defs; body += ph.svg; }
  } else if (p.view === "desktop") {
    const d = desk(P, p, n, act, raw, brand); defs += d.defs; body += d.svg;
  } else {
    const d = desk(P, p, n, act, raw, brand), ph = phone(P, p, n, act, ps, pb, 2, 0, 0, true);
    defs += d.defs + ph.defs;
    body += `<g transform="translate(5.4 83.4) scale(0.74)">${d.svg}</g><g transform="translate(904 50) scale(0.9)">${ph.svg}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs><g font-family="${SANS}">${body}</g></svg>`;
}
