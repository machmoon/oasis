// Playful 404 scene: rounded numerals, three story variants (astronaut, lost wanderer, broken road), layered parallax depth and a ready CTA.
export const meta = {
  title: "Lost in the Void",
  kind: "illustration",
  description: "A playful 404 scene with big rounded numerals, a lost character and layered depth for error pages, empty states and dead-link screens.",
  tags: ["404", "error page", "empty state", "astronaut", "lost", "illustration", "not found", "playful"],
  price: 0,
  author: "oasis-factory",
  size: [800, 600],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#F6F1E7" },
    ink: { type: "color", role: "ink", label: "Text", default: "#1F1B2D" },
    primary: { type: "color", role: "primary", label: "Numerals", default: "#FF6B4A" },
    secondary: { type: "color", role: "secondary", label: "Accent", default: "#5B6CFF" },
    variant: { type: "choice", label: "Scene", default: "astronaut", options: ["astronaut", "lost", "broken path"] },
    numerals: { type: "choice", label: "Numeral style", default: "stacked", options: ["solid", "stacked", "outline", "striped"] },
    depth: { type: "range", label: "Background depth", default: 3, min: 0, max: 4, step: 1 },
    scale: { type: "range", label: "Numeral size", default: 1, min: 0.8, max: 1.2, step: 0.05 },
    seed: { type: "range", label: "Seed", default: 7, min: 1, max: 100, step: 1 },
    character: { type: "toggle", label: "Show character", default: true },
    message: { type: "text", label: "Headline", default: "Page not found" },
  },
  presets: {
    Cosmos: { background: "#0E1022", ink: "#F2EFFF", primary: "#FFB547", secondary: "#7C8CFF", variant: "astronaut", numerals: "outline", depth: 4 },
    Mint: { background: "#E7F5EE", ink: "#0F3B2E", primary: "#18A06B", secondary: "#FFC53D", variant: "lost", numerals: "striped", depth: 4 },
    Bubblegum: { background: "#FFE9F0", ink: "#3B0F2A", primary: "#E8437C", secondary: "#2FA9BC", variant: "broken path", numerals: "solid", depth: 3 },
    Graphite: { background: "#151517", ink: "#F5F5F5", primary: "#EDEDED", secondary: "#8A8A93", variant: "lost", numerals: "stacked", depth: 2, character: false },
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

const WHITE = "#FFFFFF", DARK = "#16141C";
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (h) => { const c = hx(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const pole = (c) => (contrast(c, WHITE) > contrast(c, DARK) ? WHITE : DARK);
const best = (c) => (contrast(c, WHITE) >= contrast(c, DARK) ? WHITE : DARK);
function ensure(c, against, m) {
  if (contrast(c, against) >= m) return c;
  const P = pole(against);
  for (let t = 0.05; t <= 1.0001; t += 0.05) { const k = mix(c, P, t); if (contrast(k, against) >= m) return k; }
  return P;
}
function lift(base, target, m) {
  for (let t = 0.03; t <= 1.0001; t += 0.03) { const k = mix(base, target, t); if (contrast(k, base) >= m) return k; }
  return ensure(base, base, m);
}
const esc = (s) => String(s).slice(0, 34).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f = (n) => n.toFixed(1);

function ridge(r, base, amp, n, sharp, bottom) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push([-20 + (840 * i) / n, base - amp * (0.3 + 0.7 * r())]);
  let d = `M-20 ${f(bottom)} L${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i <= n; i++) {
    if (sharp) d += ` L${f(pts[i][0])} ${f(pts[i][1])}`;
    else d += ` Q${f(pts[i - 1][0])} ${f(pts[i - 1][1])} ${f((pts[i - 1][0] + pts[i][0]) / 2)} ${f((pts[i - 1][1] + pts[i][1]) / 2)}` + (i === n ? ` L${f(pts[n][0])} ${f(pts[n][1])}` : "");
  }
  return d + ` L820 ${f(bottom)}Z`;
}

function astronaut(x, y, rot, s, num, tether) {
  const L = "#2A2733", suit = "#F4F2EE", pack = "#D9D5CC";
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${s.toFixed(3)})" stroke="${L}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
<path d="M-40 18 C-64 30 -60 54 -42 58 S-30 78 -50 86 M-50 86 l-7 1 M-50 86 l-3 7 M-50 86 l-6 -4" fill="none" stroke="${tether}" stroke-width="2.5"/>
<rect x="-41" y="-24" width="22" height="52" rx="8" fill="${pack}"/>
<rect x="-22" y="22" width="19" height="32" rx="9.5" fill="${suit}"/>
<rect x="5" y="20" width="19" height="30" rx="9.5" fill="${suit}" transform="rotate(-14 14 20)"/>
<rect x="-27" y="-14" width="54" height="46" rx="18" fill="${suit}"/>
<rect x="-44" y="-8" width="18" height="34" rx="9" fill="${suit}" transform="rotate(28 -35 -8)"/>
<rect x="26" y="-34" width="18" height="34" rx="9" fill="${suit}" transform="rotate(-24 35 0)"/>
<rect x="-11" y="2" width="22" height="13" rx="3" fill="${num}"/>
<path d="M18 -60 l6 -10" fill="none"/><circle cx="25" cy="-72" r="3.5" fill="${num}"/>
<circle cx="0" cy="-36" r="29" fill="${suit}"/>
<rect x="-20" y="-49" width="40" height="27" rx="13.5" fill="url(#vz)"/>
<path d="M-12 -41 q4 -5 11 -5" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.85"/></g>`;
}

function bean(x, y, s, body, mode, num) {
  const o = mix(body, "#000000", 0.55), eye = best(body);
  const eyes = mode === "broken"
    ? `<circle cx="4" cy="-38" r="3.4" fill="${eye}" stroke="none"/><circle cx="16" cy="-38" r="3.4" fill="${eye}" stroke="none"/><circle cx="10" cy="-26" r="3" fill="none" stroke="${eye}" stroke-width="2.4"/>`
    : `<circle cx="-6" cy="-45" r="3.4" fill="${eye}" stroke="none"/><circle cx="8" cy="-45" r="3.4" fill="${eye}" stroke="none"/><path d="M-3 -31 q4 -3 8 0" fill="none" stroke="${eye}" stroke-width="2.4"/>`;
  const map = mode === "lost" ? `<path d="M18 -32 L27 -29" fill="none"/><rect x="24" y="-40" width="26" height="18" rx="2" fill="#FBF8F1"/><path d="M32.7 -40 v18 M41.3 -40 v18" fill="none" stroke-width="1.5"/>` : "";
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${s.toFixed(3)})" stroke="${o}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
<path d="M-8 -12 L-9 -3 M8 -12 L10 -3" fill="none" stroke-width="4"/>
<ellipse cx="-11" cy="-2" rx="6" ry="3" fill="${o}"/><ellipse cx="12" cy="-2" rx="6" ry="3" fill="${o}"/>
<path d="M0 -64 q-2 -10 6 -14" fill="none"/><ellipse cx="10" cy="-79" rx="6" ry="3.5" fill="${num}" transform="rotate(-25 10 -79)"/>
<rect x="-22" y="-64" width="44" height="54" rx="22" fill="${body}"/>${eyes}${map}</g>`;
}

export default function render(p) {
  const W = 800, H = 600, v = p.variant, depth = p.depth, k = p.scale, ch = p.character;
  const r = rng(p.seed * 9973 + 17), rp = rng(p.seed * 31 + 5), side = p.seed % 2 ? 1 : -1;
  const bg = p.background, dark = pole(bg) === WHITE, sec = p.secondary;
  const num = ensure(p.primary, bg, 2.2), body = ensure(sec, bg, 1.7);
  const t1 = lift(bg, num, 1.07), t2 = lift(bg, num, 1.16), t3 = lift(bg, num, 1.3), t4 = lift(bg, num, 1.5);
  const sparkC = ensure(sec, bg, 2), planC = ensure(sec, bg, 1.5);
  const vis1 = mix("#4253C9", sec, 0.28), vis0 = mix("#171A3A", sec, 0.12);
  let st2 = mix(num, WHITE, 0.35); if (contrast(st2, num) < 1.25) st2 = mix(num, "#000000", 0.28);

  const T = 44 * k, NH = 220 * k, W4 = 156 * k, W0 = 192 * k, G = 22 * k, NW = 2 * W4 + W0 + 2 * G, X0 = (W - NW) / 2;
  const ground = v !== "astronaut", head = v === "lost" && ch ? 64 * k : 0, gH = ground ? 44 : 0;
  const Y0 = (H - (head + NH + gH + 40 + 126)) / 2 + head, NB = Y0 + NH, copyTop = NB + gH + 40;
  const cx = 400, cy = Y0 + NH / 2, hr = Math.min(NH / 2 + 78, cy - 22);
  const four = (ox) => `M${f(ox + W4 * 0.62)} ${f(NB - T / 2)} L${f(ox + W4 * 0.62)} ${f(Y0 + T / 2)} L${f(ox + T / 2)} ${f(Y0 + NH * 0.66)} L${f(ox + W4 - T / 2)} ${f(Y0 + NH * 0.66)}`;
  const shapes = `<path d="${four(X0)}"/><rect x="${f(X0 + W4 + G + T / 2)}" y="${f(Y0 + T / 2)}" width="${f(W0 - T)}" height="${f(NH - T)}" rx="${f((W0 - T) / 2)}"/><path d="${four(X0 + W4 + G + W0 + G)}"/>`;
  const ga = (w) => `fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="${f(w)}"`;

  let defs = `<linearGradient id="vz" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${vis1}"/><stop offset="1" stop-color="${vis0}"/></linearGradient>
<linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(planC, WHITE, 0.25)}"/><stop offset="1" stop-color="${mix(planC, "#000000", 0.3)}"/></linearGradient>
<pattern id="st" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="${num}"/><rect width="5" height="12" fill="${st2}"/></pattern>`;
  let numerals;
  if (p.numerals === "stacked") {
    numerals = `<g ${ga(T)} transform="translate(${f(11 * k)} ${f(11 * k)})" stroke="${mix(num, bg, 0.72)}">${shapes}</g><g ${ga(T)} transform="translate(${f(5.5 * k)} ${f(5.5 * k)})" stroke="${mix(num, bg, 0.45)}">${shapes}</g><g ${ga(T)} stroke="${num}">${shapes}</g>`;
  } else if (p.numerals === "outline") {
    defs += `<mask id="om" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><g ${ga(T)} stroke="#FFFFFF">${shapes}</g><g ${ga(T - 14 * k)} stroke="#000000">${shapes}</g></mask>`;
    numerals = `<g mask="url(#om)"><g ${ga(T)} stroke="${num}">${shapes}</g></g>`;
  } else numerals = `<g ${ga(T)} stroke="${p.numerals === "striped" ? "url(#st)" : num}">${shapes}</g>`;

  const cloudC = dark ? lift(bg, WHITE, 1.35) : contrast(bg, WHITE) >= 1.12 ? WHITE : t2;
  const cloud = (x, y, s) => `<g transform="translate(${f(x)} ${f(y)}) scale(${s.toFixed(2)})" fill="${cloudC}"><rect x="-34" y="-8" width="68" height="16" rx="8"/><circle cx="-10" cy="-9" r="12"/><circle cx="10" cy="-13" r="15"/></g>`;
  const sparkle = (x, y, s) => `<path d="M${f(x)} ${f(y - s)} Q${f(x)} ${f(y)} ${f(x + s)} ${f(y)} Q${f(x)} ${f(y)} ${f(x)} ${f(y + s)} Q${f(x)} ${f(y)} ${f(x - s)} ${f(y)} Q${f(x)} ${f(y)} ${f(x)} ${f(y - s)}Z" fill="${sparkC}"/>`;
  const topY = (y) => Math.max(30, y);

  let back = depth >= 1 ? `<circle cx="${cx}" cy="${f(cy)}" r="${f(hr)}" fill="${t1}"/>` : "";
  let mid = "", fore = "", surf = bg, hy = H;
  if (v === "astronaut") {
    if (depth >= 4) { hy = copyTop - 26; surf = lift(bg, num, 1.1); }
    if (depth >= 2) {
      back += `<circle cx="${cx}" cy="${f(cy)}" r="${f(hr + 26)}" fill="none" stroke="${t1}" stroke-width="2"/>`;
      const starC = lift(bg, num, 1.8);
      for (let i = 0; i < 80; i++) {
        const x = r() * W, y = 12 + r() * (H - 24), rad = 0.8 + r() * 1.6, op = 0.35 + r() * 0.65;
        if (y > hy - 8 || (x > 210 && x < 590 && y > copyTop - 14 && y < copyTop + 136)) continue;
        back += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${starC}" opacity="${op.toFixed(2)}"/>`;
      }
    }
    if (depth >= 4) {
      back += `<ellipse cx="${cx}" cy="${f(cy)}" rx="${f(NW / 2 + 34)}" ry="${f(NH * 0.3)}" transform="rotate(${-6 * side} ${cx} ${f(cy)})" fill="none" stroke="${t4}" stroke-width="2" stroke-dasharray="2 9" stroke-linecap="round"/>`;
      [[0.14, -42, 9], [0.36, -62, 6], [0.66, -54, 7], [0.88, -36, 10]].forEach(([fx, dy, s]) => { back += sparkle(X0 + NW * (side > 0 ? 1 - fx : fx), topY(Y0 + dy * k), s * k); });
    }
    if (depth >= 3) {
      const ring = mix(planC, WHITE, 0.45), px = side > 0 ? X0 + NW - 6 * k : X0 + 6 * k, mx = side > 0 ? X0 + 22 * k : X0 + NW - 22 * k;
      back += `<g transform="translate(${f(px)} ${f(Y0 + 14 * k)}) rotate(${-18 * side}) scale(${k.toFixed(2)})"><ellipse rx="54" ry="13" fill="none" stroke="${ring}" stroke-width="4"/><circle r="30" fill="url(#pg)" transform="rotate(${18 * side})"/><path d="M-54 0 A54 13 0 0 0 54 0" fill="none" stroke="${ring}" stroke-width="4"/></g>`;
      back += `<g transform="translate(${f(mx)} ${f(NB - 26 * k)}) scale(${k.toFixed(2)})"><circle r="16" fill="${t3}"/><circle cx="-5" cy="-4" r="3.5" fill="${t2}"/><circle cx="5" cy="6" r="2.5" fill="${t2}"/></g>`;
    }
    if (depth >= 4) {
      const crC = lift(surf, num, 1.12), sy = (x) => hy + ((x - 400) * (x - 400)) / 2800;
      back += `<circle cx="400" cy="${f(hy + 1400)}" r="1400" fill="${surf}"/>`;
      [[110, 18, 16], [176, 34, 9], [690, 16, 14], [740, 44, 8]].forEach(([x, d, rr]) => { back += `<ellipse cx="${x}" cy="${f(sy(x) + d)}" rx="${rr}" ry="${f(rr * 0.42)}" fill="${crC}"/>`; });
    }
    if (ch) fore += astronaut(cx, cy + 8 * k, -22 + rp() * 32, 0.68 * k, num, lift(bg, pole(bg), 2.2));
  } else {
    const broken = v === "broken path", gy = broken ? NB + 6 : NB;
    if (depth >= 2) back += `<path d="${ridge(r, gy - 70 * k, broken ? 120 * k : 80 * k, broken ? 8 : 6, broken, gy)}" fill="${t2}"/>`;
    if (depth >= 3) back += `<path d="${ridge(r, gy - 18 * k, 46 * k, 5, false, gy)}" fill="${t3}"/>`;
    if (depth >= 4) {
      [[0.12, -40, 0.85], [0.3, -66, 0.65], [0.86, -52, 1]].forEach(([fx, dy, s]) => { back += cloud(X0 + NW * (side > 0 ? fx : 1 - fx) + (r() - 0.5) * 16, topY(Y0 + dy * k), s * k); });
      [0.035, 0.085, 0.915, 0.965].forEach((fx) => { const x = W * fx, h = (34 + r() * 26) * k; back += `<path d="M${f(x)} ${f(gy - h)} L${f(x + h * 0.32)} ${f(gy)} L${f(x - h * 0.32)} ${f(gy)}Z" fill="${t4}"/>`; });
      back += `<path d="M${f(X0 + NW * 0.52)} ${f(topY(Y0 - 34 * k))} q6 -6 12 0 q6 -6 12 0 M${f(X0 + NW * 0.6)} ${f(topY(Y0 - 20 * k))} q5 -5 9 0 q5 -5 9 0" fill="none" stroke="${t4}" stroke-width="2" stroke-linecap="round"/>`;
    }
    const pathC = lift(bg, ensure(p.ink, bg, 4.5), 1.6), bo = mix(body, "#000000", 0.55);
    if (!broken) {
      mid += `<path d="M20 ${f(gy + 1.5)} H780" stroke="${pathC}" stroke-width="3" stroke-linecap="round"/>`;
      const sx = Math.max(40, X0 - 40);
      mid += `<g stroke="${bo}" stroke-width="2.5" stroke-linejoin="round"><rect x="${f(sx - 4)}" y="${f(gy - 82)}" width="8" height="82" rx="2" fill="${pathC}"/><path d="M${f(sx + 30)} ${f(gy - 74)} L${f(sx + 40)} ${f(gy - 64)} L${f(sx + 30)} ${f(gy - 54)} L${f(sx - 26)} ${f(gy - 54)} L${f(sx - 26)} ${f(gy - 74)}Z" fill="${body}"/><path d="M${f(sx - 26)} ${f(gy - 46)} L${f(sx - 36)} ${f(gy - 36)} L${f(sx - 26)} ${f(gy - 26)} L${f(sx + 28)} ${f(gy - 26)} L${f(sx + 28)} ${f(gy - 46)}Z" fill="${mix(body, "#000000", 0.2)}"/></g>`;
      if (ch) fore += bean(cx, Y0 + 2, 0.82 * k, body, "lost", num) + `<text x="${f(cx + 40 * k)}" y="${f(Y0 - 26 * k)}" transform="rotate(14 ${f(cx + 40 * k)} ${f(Y0 - 26 * k)})" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-weight="800" font-size="${f(30 * k)}" fill="${ensure(num, bg, 3)}">?</text>`;
    } else {
      const zr = X0 + W4 + G + W0, stemL = X0 + NW - W4 + 0.62 * W4 - T / 2, bx = (zr + stemL) / 2, hw = 30 * k;
      const L = bx - hw, R = bx + hw, y0 = gy, y1 = gy + 24, dashC = ensure(num, pathC, 1.8), edge = lift(pathC, pole(pathC), 1.25);
      fore += `<path d="M-10 ${f(y0)} L${f(L)} ${f(y0)} L${f(L - 8)} ${f(y0 + 7)} L${f(L + 4)} ${f(y0 + 14)} L${f(L - 6)} ${f(y1)} L-10 ${f(y1)}Z M${f(R)} ${f(y0)} L810 ${f(y0)} L810 ${f(y1)} L${f(R + 4)} ${f(y1)} L${f(R - 6)} ${f(y0 + 16)} L${f(R + 6)} ${f(y0 + 8)}Z" fill="${pathC}"/>`;
      let dashes = "";
      for (let x = 14; x < 790; x += 44) if (x + 22 < L - 14 || x > R + 10) dashes += `M${x} ${f(y0 + 12)} h22 `;
      fore += `<path d="M-10 ${f(y0)} H${f(L)} M${f(R)} ${f(y0)} H810" stroke="${edge}" stroke-width="2"/><path d="${dashes}" stroke="${dashC}" stroke-width="4" stroke-linecap="round"/>`;
      fore += `<g fill="${pathC}"><path d="M${f(bx - 14)} ${f(y1 + 3)} l13 -3 l3 10 l-12 4z"/><path d="M${f(bx + 6)} ${f(y1 + 14)} l10 2 l-2 9 l-10 -3z"/><path d="M${f(bx - 6)} ${f(y1 + 26)} l7 1 l-1 6 l-7 -2z"/></g>`;
      if (ch) fore += bean(L - 20 * k, y0, 0.86 * k, body, "broken", num);
    }
  }

  let textC = ensure(ensure(p.ink, bg, 4.5), surf, 4.5);
  const mutedC = ensure(ensure(mix(textC, bg, 0.28), bg, 5), surf, 5), lineC = ensure(lift(surf, textC, 1.5), surf, 1.5);
  const caption = v === "astronaut" ? "This page drifted out of orbit." : v === "lost" ? "We looked everywhere. It isn’t here." : "The road to this page has crumbled.";
  const sans = `'Helvetica Neue', Helvetica, Arial, sans-serif`, c = copyTop, bw1 = 172, bw2 = 140, bx0 = 400 - (bw1 + 12 + bw2) / 2;
  const text = `<text x="400" y="${f(c + 28)}" text-anchor="middle" font-family="${sans}" font-weight="700" font-size="34" letter-spacing="-0.6" fill="${textC}">${esc(p.message)}</text>
<text x="400" y="${f(c + 58)}" text-anchor="middle" font-family="${sans}" font-size="18" fill="${mutedC}">${caption}</text>
<rect x="${f(bx0)}" y="${f(c + 80)}" width="${bw1}" height="46" rx="23" fill="${num}"/>
<text x="${f(bx0 + bw1 / 2)}" y="${f(c + 108.5)}" text-anchor="middle" font-family="${sans}" font-weight="600" font-size="16" fill="${best(num)}">Back to home</text>
<rect x="${f(bx0 + bw1 + 13)}" y="${f(c + 81)}" width="${bw2 - 2}" height="44" rx="22" fill="none" stroke="${lineC}" stroke-width="2"/>
<text x="${f(bx0 + bw1 + 12 + bw2 / 2)}" y="${f(c + 108.5)}" text-anchor="middle" font-family="${sans}" font-weight="600" font-size="16" fill="${textC}">Search site</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="${bg}"/>${back}${mid}${numerals}${fore}${text}</svg>`;
}
