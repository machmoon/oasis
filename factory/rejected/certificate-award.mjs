// Formal award certificate: four engraved border styles, fitted serif titling, signatures, typeset date and a laurel-wreathed foil seal.
export const meta = {
  title: "Certificate of Honour",
  kind: "poster",
  description: "A formal award certificate with engraved ornamental borders, fitted titling, signature and date lines and a laurel-wreathed foil seal, ready for print or digital awards.",
  tags: ["certificate", "award", "diploma", "border", "seal", "formal", "print", "achievement"],
  price: 7,
  author: "oasis-factory",
  size: [1100, 850],
};

export const params = {
  knobs: {
    paper: { type: "color", role: "background", label: "Paper", default: "#FBF7EE" },
    ink: { type: "color", role: "ink", label: "Ink", default: "#1E2230" },
    accent: { type: "color", role: "primary", label: "Foil & ornament", default: "#A8822E" },
    border: { type: "choice", label: "Border ornament", default: "guilloche", options: ["guilloche", "greek key", "art deco", "filigree"] },
    orientation: { type: "choice", label: "Orientation", default: "landscape", options: ["landscape", "portrait"] },
    title: { type: "text", label: "Title", default: "Certificate of Achievement" },
    recipient: { type: "text", label: "Recipient", default: "Eleanor Whitfield" },
    signer: { type: "text", label: "Signatory (Name, Role)", default: "Margaret Hale, Director" },
    date: { type: "text", label: "Date", default: "14 June 2025" },
    seal: { type: "toggle", label: "Foil seal", default: true },
  },
  presets: {
    Gold: { paper: "#FBF7EE", ink: "#1E2230", accent: "#A8822E", border: "filigree", orientation: "portrait" },
    Navy: { paper: "#F3F5F9", ink: "#13213C", accent: "#23407A", border: "greek key", orientation: "landscape" },
    Mono: { paper: "#FFFFFF", ink: "#151515", accent: "#4A4A4A", border: "art deco", orientation: "portrait", seal: false },
    Midnight: { paper: "#0F1626", ink: "#EFE6CF", accent: "#D2AC5B", border: "guilloche", orientation: "landscape" },
  },
};

const rgb = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const hex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (h) => { const c = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f = (v) => v.toFixed(1);
const SERIF = "Georgia, 'Times New Roman', serif";
const SCRIPT = "'Snell Roundhand', 'Apple Chancery', 'Segoe Script', 'Brush Script MT', cursive";
const WEIGHT = { guilloche: 34, "greek key": 30, "art deco": 40, filigree: 38 };

function ornament(style, sides, corners, bw, sw, acc) {
  const P = (S, t, s) => f(S.o[0] + S.d[0] * t + S.n[0] * s) + "," + f(S.o[1] + S.d[1] * t + S.n[1] * s);
  let lines = "", fills = "";
  for (const S of sides) {
    const ang = (Math.atan2(S.d[1], S.d[0]) * 180) / Math.PI;
    if (style === "guilloche") {
      const n = Math.max(2, Math.round(S.L / (bw * 1.15))), per = S.L / n, steps = n * 16;
      for (let k = 0; k < 3; k++) {
        let d = "";
        for (let i = 0; i <= steps; i++) { const t = (S.L * i) / steps; d += (i ? "L" : "M") + P(S, t, bw / 2 + bw * 0.34 * Math.sin((2 * Math.PI * t) / per + (k * 2 * Math.PI) / 3)); }
        lines += `<path d="${d}" stroke-width="${f(sw * 0.7)}"/>`;
      }
    } else if (style === "greek key") {
      const K = [[0, 1], [0, 0], [0.74, 0], [0.74, 0.68], [0.3, 0.68], [0.3, 0.36], [0.52, 0.36]];
      const n = Math.max(3, Math.round(S.L / (bw * 0.85))), per = S.L / n;
      let d = `M${P(S, 0, bw * 0.83)}L${P(S, S.L, bw * 0.83)}`;
      for (let c = 0; c < n; c++) d += K.map((q, i) => (i ? "L" : "M") + P(S, c * per + per * 0.13 + q[0] * per * 0.87, bw * (0.17 + q[1] * 0.66))).join("");
      lines += `<path d="${d}" stroke-width="${f(sw * 1.1)}" stroke-linecap="square" stroke-linejoin="miter"/>`;
    } else if (style === "art deco") {
      const n = Math.max(2, Math.round(S.L / (bw * 1.5))), per = S.L / n, base = bw * 0.84, R = Math.min(per * 0.42, bw * 0.64);
      let d = `M${P(S, 0, base)}L${P(S, S.L, base)}M${P(S, 0, bw * 0.12)}L${P(S, S.L, bw * 0.12)}`;
      for (let c = 0; c < n; c++) {
        const tc = (c + 0.5) * per;
        for (const rr of [R, R * 0.62]) d += `M${P(S, tc - rr, base)}A${f(rr)},${f(rr)} 0 0 1 ${P(S, tc + rr, base)}`;
        for (const a of [30, 60, 90, 120, 150]) { const r = (a * Math.PI) / 180; d += `M${P(S, tc - Math.cos(r) * R * 0.62, base - Math.sin(r) * R * 0.62)}L${P(S, tc - Math.cos(r) * R, base - Math.sin(r) * R)}`; }
        if (c > 0) { const q = P(S, c * per, bw * 0.42).split(","); fills += `<circle cx="${q[0]}" cy="${q[1]}" r="${f(bw * 0.07)}"/>`; }
      }
      lines += `<path d="${d}" stroke-width="${f(sw * 0.8)}"/>`;
    } else {
      const n = Math.max(2, Math.round(S.L / (bw * 1.7))), per = S.L / n, mid = bw * 0.5, a = bw * 0.17, steps = n * 16;
      let d = "";
      for (let i = 0; i <= steps; i++) { const t = (S.L * i) / steps; d += (i ? "L" : "M") + P(S, t, mid + a * Math.sin((2 * Math.PI * t) / per)); }
      for (let c = 0; c < n; c++) for (const h of [0, 1]) {
        const tc = c * per + per * (h ? 0.75 : 0.25), sg = h ? -1 : 1, tx = tc + per * 0.11;
        d += `M${P(S, tc, mid + sg * a)}Q${P(S, tx, mid + sg * a)} ${P(S, tx, mid + sg * (a + bw * 0.025))}`;
        const cc = P(S, tx, mid + sg * (a + bw * 0.1)).split(",");
        lines += `<circle cx="${cc[0]}" cy="${cc[1]}" r="${f(bw * 0.075)}" stroke-width="${f(sw * 0.7)}"/>`;
        const lc = P(S, tc - per * 0.12, mid + sg * (a * 0.5 + bw * 0.12)).split(",");
        fills += `<ellipse cx="${lc[0]}" cy="${lc[1]}" rx="${f(bw * 0.13)}" ry="${f(bw * 0.05)}" transform="rotate(${f(ang - sg * 35)} ${lc[0]} ${lc[1]})"/>`;
      }
      lines += `<path d="${d}" stroke-width="${f(sw * 0.9)}"/>`;
    }
  }
  for (const [cx, cy] of corners) {
    if (style === "guilloche") {
      for (let j = 0; j < 8; j++) { const a = (j * Math.PI) / 4; lines += `<circle cx="${f(cx + Math.cos(a) * bw * 0.16)}" cy="${f(cy + Math.sin(a) * bw * 0.16)}" r="${f(bw * 0.2)}" stroke-width="${f(sw * 0.6)}"/>`; }
      fills += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(bw * 0.06)}"/>`;
    } else if (style === "greek key") {
      for (const k of [0.64, 0.36]) lines += `<rect x="${f(cx - (bw * k) / 2)}" y="${f(cy - (bw * k) / 2)}" width="${f(bw * k)}" height="${f(bw * k)}" stroke-width="${f(sw)}"/>`;
      fills += `<rect x="${f(cx - bw * 0.07)}" y="${f(cy - bw * 0.07)}" width="${f(bw * 0.14)}" height="${f(bw * 0.14)}"/>`;
    } else if (style === "art deco") {
      const r = bw * 0.38, q = bw * 0.16;
      lines += `<path d="M${f(cx)},${f(cy - r)}L${f(cx + r)},${f(cy)}L${f(cx)},${f(cy + r)}L${f(cx - r)},${f(cy)}Z" stroke-width="${f(sw)}"/>`;
      fills += `<path d="M${f(cx)},${f(cy - q)}L${f(cx + q)},${f(cy)}L${f(cx)},${f(cy + q)}L${f(cx - q)},${f(cy)}Z"/>`;
    } else {
      fills += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(bw * 0.1)}"/>`;
      for (let j = 0; j < 4; j++) { const a = Math.PI / 4 + (j * Math.PI) / 2, x = cx + Math.cos(a) * bw * 0.26, y = cy + Math.sin(a) * bw * 0.26; fills += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(bw * 0.15)}" ry="${f(bw * 0.055)}" transform="rotate(${45 + j * 90} ${f(x)} ${f(y)})"/>`; }
    }
  }
  return `<g fill="none" stroke="${acc}" stroke-linecap="round" stroke-linejoin="round">${lines}</g><g fill="${acc}">${fills}</g>`;
}

function laurel(cx, cy, r, col) {
  const R = r * 1.18;
  let stems = "", leaves = "";
  for (const sg of [-1, 1]) {
    let d = "";
    for (let th = 42; th <= 146; th += 2) { const a = (th * Math.PI) / 180; d += (th === 42 ? "M" : "L") + f(cx + sg * Math.sin(a) * R) + "," + f(cy + Math.cos(a) * R); }
    stems += `<path d="${d}"/>`;
    for (let th = 46, i = 0; th <= 140; th += 10, i++) {
      const a = (th * Math.PI) / 180, s = 1 - (0.38 * (th - 46)) / 94;
      const px = cx + sg * Math.sin(a) * R, py = cy + Math.cos(a) * R, tx = sg * Math.cos(a), ty = -Math.sin(a), nx = sg * Math.sin(a), ny = Math.cos(a);
      for (const k of [0.55, -0.55]) {
        let dx = tx + nx * k, dy = ty + ny * k; const l = Math.hypot(dx, dy); dx /= l; dy /= l;
        const rx = r * 0.13 * s, ex = px + dx * rx * 0.95, ey = py + dy * rx * 0.95;
        leaves += `<ellipse cx="${f(ex)}" cy="${f(ey)}" rx="${f(rx)}" ry="${f(rx * 0.36)}" transform="rotate(${f((Math.atan2(dy, dx) * 180) / Math.PI)} ${f(ex)} ${f(ey)})"/>`;
      }
    }
    const e = (150 * Math.PI) / 180;
    leaves += `<circle cx="${f(cx + sg * Math.sin(e) * R)}" cy="${f(cy + Math.cos(e) * R)}" r="${f(r * 0.04)}"/>`;
  }
  return `<g fill="none" stroke="${col}" stroke-width="${f(r * 0.02)}" stroke-linecap="round">${stems}</g><g fill="${col}">${leaves}</g>`;
}

function seal(cx, cy, r, acc) {
  const pick = (b) => {
    const st = [mix(b, "#FFFFFF", 0.25), b, mix(b, "#000000", 0.2)], L = mix(b, "#FFFFFF", 0.9), D = mix(b, "#000000", 0.8);
    const sc = (c) => Math.min(...st.map((s) => contrast(c, s)));
    return sc(L) >= sc(D) ? [L, sc(L), true] : [D, sc(D), false];
  };
  let base = acc, [fg, sc, light] = pick(base);
  for (let k = 0; sc < 4.5 && k < 8; k++) { base = mix(base, light ? "#000000" : "#FFFFFF", 0.12); [fg, sc, light] = pick(base); }
  const rb = mix(base, "#000000", 0.22), rb2 = mix(base, "#000000", 0.4), w = r * 0.42, len = r * 1.3;
  let out = `<defs><radialGradient id="sealG" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stop-color="${mix(base, "#FFFFFF", 0.25)}"/><stop offset="0.6" stop-color="${base}"/><stop offset="1" stop-color="${mix(base, "#000000", 0.2)}"/></radialGradient></defs>`;
  for (const sg of [-1, 1]) out += `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${sg * 22})"><polygon points="${f(-w / 2)},0 ${f(w / 2)},0 ${f(w / 2)},${f(len)} 0,${f(len - w * 0.45)} ${f(-w / 2)},${f(len)}" fill="${rb}"/><rect x="${f(sg > 0 ? w * 0.18 : -w / 2)}" y="0" width="${f(w * 0.32)}" height="${f(len - w * 0.2)}" fill="${rb2}" opacity="0.45"/></g>`;
  const N = 40; let pts = "";
  for (let i = 0; i < N * 2; i++) { const a = (i * Math.PI) / N, rr = i % 2 ? r * 0.93 : r; pts += `${f(cx + Math.cos(a) * rr)},${f(cy + Math.sin(a) * rr)} `; }
  out += `<polygon points="${pts}" fill="url(#sealG)"/>`;
  out += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.86)}" fill="none" stroke="${fg}" stroke-width="${f(r * 0.022)}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.53)}" fill="none" stroke="${fg}" stroke-width="${f(r * 0.016)}"/>`;
  const tt = r * 0.625, tb = r * 0.785;
  out += `<path id="sealTop" d="M${f(cx - tt)},${f(cy)}A${f(tt)},${f(tt)} 0 0 1 ${f(cx + tt)},${f(cy)}" fill="none"/><path id="sealBot" d="M${f(cx - tb)},${f(cy)}A${f(tb)},${f(tb)} 0 0 0 ${f(cx + tb)},${f(cy)}" fill="none"/>`;
  const tp = (id, s, rad) => {
    const fs = Math.min(r * 0.17, (Math.PI * rad * 0.62) / (s.length * 0.86));
    return `<text font-family="${SERIF}" font-size="${f(fs)}" font-weight="bold" letter-spacing="${f(fs * 0.14)}" fill="${fg}" text-anchor="middle"><textPath href="#${id}" xlink:href="#${id}" startOffset="50%">${s}</textPath></text>`;
  };
  out += tp("sealTop", "AWARDED", tt) + tp("sealBot", "WITH HONOUR", tb);
  for (const sg of [-1, 1]) out += `<circle cx="${f(cx + sg * r * 0.7)}" cy="${f(cy)}" r="${f(r * 0.035)}" fill="${fg}"/>`;
  let st = "";
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.16 : r * 0.38; st += `${f(cx + Math.cos(a) * rr)},${f(cy + r * 0.03 + Math.sin(a) * rr)} `; }
  return out + `<polygon points="${st}" fill="${fg}"/>`;
}

export default function render(p) {
  const land = p.orientation !== "portrait";
  const W = land ? 1100 : 850, H = land ? 850 : 1100, m = 40, bw = WEIGHT[p.border] || 34, sw = Math.max(1, bw / 26);
  const paper = p.paper, ink = p.ink, dark = lum(paper) < 0.3;
  let acc = p.accent;
  for (let t = 0.15; contrast(acc, paper) < 2.6 && t <= 1.001; t += 0.15) acc = mix(p.accent, ink, t);
  const muted = mix(ink, paper, 0.36), subC = contrast(acc, paper) >= 3.5 ? acc : mix(acc, ink, 0.5);
  const g = 10 + bw * 0.15, L0 = m + bw + g, iw = W - 2 * L0, ih = H - 2 * L0, cx = W / 2, Y = (v) => L0 + ih * v;
  const sides = [
    { o: [m + bw, m], d: [1, 0], n: [0, 1], L: W - 2 * m - 2 * bw },
    { o: [W - m, m + bw], d: [0, 1], n: [-1, 0], L: H - 2 * m - 2 * bw },
    { o: [W - m - bw, H - m], d: [-1, 0], n: [0, -1], L: W - 2 * m - 2 * bw },
    { o: [m, H - m - bw], d: [0, -1], n: [1, 0], L: H - 2 * m - 2 * bw },
  ];
  const corners = [[m + bw / 2, m + bw / 2], [W - m - bw / 2, m + bw / 2], [W - m - bw / 2, H - m - bw / 2], [m + bw / 2, H - m - bw / 2]];
  const fr = land ? { title: 0.17, sub: 0.255, pres: 0.36, rec: 0.48, cite: 0.585, seal: 0.79, sig: 0.87 }
    : { title: 0.14, sub: 0.2, pres: 0.3, rec: 0.4, cite: 0.49, seal: 0.665, sig: 0.875 };
  const edge = dark ? mix(paper, "#000000", 0.4) : mix(paper, ink, 0.07);
  const sr = land ? ih * 0.115 : Math.min(iw * 0.125, ih * 0.095), scy = Y(fr.seal);
  const defs = `<defs><radialGradient id="vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="${paper}" stop-opacity="0"/><stop offset="1" stop-color="${edge}"/></radialGradient><filter id="sh" x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="${f(sr * 0.05)}" stdDeviation="${f(sr * 0.06)}" flood-color="${dark ? "#000000" : mix(ink, "#000000", 0.3)}" flood-opacity="${dark ? 0.55 : 0.28}"/></filter></defs>`;
  let o = `<rect width="${W}" height="${H}" fill="${paper}"/><rect width="${W}" height="${H}" fill="url(#vig)"/>`;
  o += `<g fill="none" stroke="${acc}"><rect x="${m - 6}" y="${m - 6}" width="${W - 2 * m + 12}" height="${H - 2 * m + 12}" stroke-width="0.8"/><rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" stroke-width="${f(sw * 1.4)}"/><rect x="${m + bw}" y="${m + bw}" width="${W - 2 * m - 2 * bw}" height="${H - 2 * m - 2 * bw}" stroke-width="${f(sw)}"/><rect x="${f(L0)}" y="${f(L0)}" width="${f(iw)}" height="${f(ih)}" stroke-width="${f(Math.max(0.75, sw * 0.5))}"/>`;
  for (const [x, y] of corners) o += `<rect x="${f(x - bw / 2)}" y="${f(y - bw / 2)}" width="${bw}" height="${bw}" stroke-width="${f(sw)}"/>`;
  o += `</g>` + ornament(p.border, sides, corners, bw, sw, acc);
  const rec = String(p.recipient || ""), fsR = Math.min(land ? 62 : 56, (iw * 0.8) / (Math.max(4, rec.length) * 0.46)), ry = Y(fr.rec);
  const wy = ry - fsR * 0.3, wr = Math.min(ih * 0.2, iw * 0.17);
  let wm = "";
  for (let j = 0; j < 12; j++) { const a = (j * Math.PI) / 6; wm += `<circle cx="${f(cx + Math.cos(a) * wr * 0.5)}" cy="${f(wy + Math.sin(a) * wr * 0.5)}" r="${f(wr * 0.5)}"/>`; }
  o += `<g fill="none" stroke="${acc}" stroke-width="1" opacity="${dark ? 0.1 : 0.07}">${wm}</g>`;
  const title = String(p.title || "Certificate"), ix = title.toLowerCase().indexOf(" of ");
  const main = (ix > 0 ? title.slice(0, ix) : title).toUpperCase(), sub = ix > 0 ? title.slice(ix + 1).toUpperCase() : "";
  const fsT = Math.min(land ? 60 : 52, (iw * 0.86) / (Math.max(1, main.length) * 0.84));
  o += `<text x="${f(cx + fsT * 0.06)}" y="${f(Y(fr.title))}" text-anchor="middle" font-family="${SERIF}" font-size="${f(fsT)}" letter-spacing="${f(fsT * 0.12)}" fill="${ink}">${esc(main)}</text>`;
  const dy = Y(fr.sub), dia = (x, y, s) => `<path d="M${f(x)},${f(y - s)}L${f(x + s)},${f(y)}L${f(x)},${f(y + s)}L${f(x - s)},${f(y)}Z"/>`;
  if (sub) {
    const fsS = Math.min(land ? 15 : 14, (iw * 0.8 - 180) / (sub.length * 1.1)), half = (sub.length * 1.1 * fsS) / 2, ly = dy - fsS * 0.35;
    o += `<text x="${f(cx + fsS * 0.21)}" y="${f(dy)}" text-anchor="middle" font-family="${SERIF}" font-size="${f(fsS)}" letter-spacing="${f(fsS * 0.42)}" fill="${subC}">${esc(sub)}</text>`;
    let rl = "", dm = "";
    for (const sg of [-1, 1]) { rl += `<line x1="${f(cx + sg * (half + 16))}" y1="${f(ly)}" x2="${f(cx + sg * (half + 74))}" y2="${f(ly)}"/>`; dm += dia(cx + sg * (half + 82), ly, 4); }
    o += `<g stroke="${acc}" stroke-width="1">${rl}</g><g fill="${acc}">${dm}</g>`;
  } else {
    const dl = iw * 0.14;
    o += `<g stroke="${acc}" stroke-width="1"><line x1="${f(cx - dl)}" y1="${f(dy)}" x2="${f(cx - 12)}" y2="${f(dy)}"/><line x1="${f(cx + 12)}" y1="${f(dy)}" x2="${f(cx + dl)}" y2="${f(dy)}"/></g><g fill="${acc}">${dia(cx, dy, 6)}</g>`;
  }
  o += `<text x="${f(cx + 2)}" y="${f(Y(fr.pres))}" text-anchor="middle" font-family="${SERIF}" font-size="13" letter-spacing="4" fill="${mix(ink, paper, 0.28)}">THIS CERTIFICATE IS PROUDLY PRESENTED TO</text>`;
  o += `<text x="${f(cx)}" y="${f(ry)}" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="${f(fsR)}" fill="${ink}">${esc(rec)}</text>`;
  o += `<line x1="${f(cx - iw * 0.3)}" y1="${f(ry + fsR * 0.36)}" x2="${f(cx + iw * 0.3)}" y2="${f(ry + fsR * 0.36)}" stroke="${acc}" stroke-width="1.2"/>`;
  o += `<text x="${f(cx)}" y="${f(Y(fr.cite))}" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="${land ? 17 : 16}" fill="${muted}">In recognition of exceptional dedication, leadership and achievement.</text>`;
  const sy = Y(fr.sig), lw = land ? iw * 0.27 : iw * 0.36, inset = land ? iw * 0.05 : iw * 0.06, lx = [L0 + inset, L0 + iw - inset - lw];
  const sp = String(p.signer || "").split(","), name = sp[0].trim(), role = sp.slice(1).join(",").trim() || "Authorized signature";
  const fsG = Math.min(34, (lw * 0.88) / (Math.max(4, name.length) * 0.42)), gy = sy - (fsG * 0.32 + lw * 0.035 + 6);
  o += `<text transform="translate(${f(lx[0] + lw / 2)} ${f(gy)}) rotate(-3)" text-anchor="middle" font-family="${SCRIPT}" font-style="italic" font-size="${f(fsG)}" fill="${ink}">${esc(name)}</text>`;
  const date = String(p.date || ""), fsD = Math.min(22, (lw * 0.9) / (Math.max(4, date.length) * 0.5));
  o += `<text x="${f(lx[1] + lw / 2)}" y="${f(sy - 10)}" text-anchor="middle" font-family="${SERIF}" font-size="${f(fsD)}" fill="${ink}">${esc(date)}</text>`;
  let h = 7;
  for (const ch of rec) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  const lab = [[name.toUpperCase(), role], ["DATE OF AWARD", "Certificate No. " + String(10000 + (h % 90000))]];
  lab.forEach(([a, b], i) => {
    const mx = lx[i] + lw / 2, fsL = Math.min(13.5, (lw * 0.95) / (Math.max(4, a.length) * 0.9)), fsB = Math.min(12.5, (lw * 0.95) / (Math.max(4, b.length) * 0.48));
    o += `<line x1="${f(lx[i])}" y1="${f(sy)}" x2="${f(lx[i] + lw)}" y2="${f(sy)}" stroke="${ink}" stroke-width="0.9" opacity="0.7"/>`;
    o += `<text x="${f(mx + fsL * 0.09)}" y="${f(sy + 22)}" text-anchor="middle" font-family="${SERIF}" font-size="${f(fsL)}" letter-spacing="${f(fsL * 0.18)}" fill="${ink}">${esc(a)}</text><text x="${f(mx)}" y="${f(sy + 40)}" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="${f(fsB)}" fill="${muted}">${esc(b)}</text>`;
  });
  if (p.seal) o += laurel(cx, scy, sr, acc) + `<g filter="url(#sh)">${seal(cx, scy, sr, acc)}</g>`;
  else o += `<g stroke="${acc}" stroke-width="1"><line x1="${f(cx - 46)}" y1="${f(sy)}" x2="${f(cx - 12)}" y2="${f(sy)}"/><line x1="${f(cx + 12)}" y1="${f(sy)}" x2="${f(cx + 46)}" y2="${f(sy)}"/></g><g fill="${acc}">${dia(cx, sy, 6)}<circle cx="${f(cx - 52)}" cy="${f(sy)}" r="2"/><circle cx="${f(cx + 52)}" cy="${f(sy)}" r="2"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}${o}</svg>`;
}
