// Brand letterhead: monogram header in three layouts, accent bar, footer contact strip, typeset sample letter and an optional guide layer.
export const meta = {
  title: "Studio Letterhead",
  kind: "brand",
  description: "A print-ready brand letterhead with monogram header layouts, accent bar, footer contact strip, fold marks and a sign-off block, plus an optional content-guide layer.",
  tags: ["letterhead", "stationery", "brand", "identity", "print", "a4", "letter", "corporate"],
  price: 5,
  author: "oasis-factory",
  size: [595, 842],
};

export const params = {
  knobs: {
    paper: { type: "color", role: "background", label: "Paper", default: "#FBFAF7" },
    ink: { type: "color", role: "ink", label: "Ink", default: "#1B1F24" },
    accent: { type: "color", role: "primary", label: "Accent", default: "#C8553D" },
    muted: { type: "color", role: "muted", label: "Captions & guides", default: "#8F897F" },
    page: { type: "choice", label: "Page size", default: "A4", options: ["A4", "Letter", "A5"] },
    header: { type: "choice", label: "Header layout", default: "left", options: ["left", "centered", "split"] },
    bar: { type: "choice", label: "Accent bar", default: "top", options: ["top", "left", "bottom"] },
    preview: { type: "choice", label: "Content layer", default: "letter", options: ["letter", "clean", "guides"] },
    margin: { type: "range", label: "Margin (mm)", default: 20, min: 12, max: 34, step: 1 },
    watermark: { type: "toggle", label: "Watermark", default: false },
    company: { type: "text", label: "Company", default: "Northwind Studio" },
    signer: { type: "text", label: "Signed by", default: "Ada Lindqvist" },
  },
  presets: {
    Harbour: { paper: "#F6F8FB", ink: "#0F1B2A", accent: "#1F4E79", muted: "#8A97A6", page: "Letter", header: "centered", bar: "left", watermark: true },
    Fern: { paper: "#F3F1EA", ink: "#1D2A24", accent: "#2F5D50", muted: "#8E9488", page: "A5", header: "split", bar: "bottom", preview: "guides" },
    Midnight: { paper: "#14161B", ink: "#ECE8E1", accent: "#E0B04B", muted: "#6E7380", header: "split", bar: "top", watermark: true, margin: 26 },
    Blush: { paper: "#FFF7F4", ink: "#2B1B1E", accent: "#E86A8E", muted: "#B39A9F", page: "Letter", header: "centered", bar: "bottom", preview: "clean", watermark: true },
  },
};

const PAGES = { A4: [595, 842], Letter: [612, 792], A5: [420, 595] };
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const ADDR = "12 Harbour Row, Bristol BS1 4QA", PHONE = "+44 117 496 0321", DATE = "14 March 2025";
const TO = ["Mira Okafor", "Lumen & Co.", "48 Quay Street, Leeds LS1 2HQ"];
const BODY = [
  "Thank you for taking the time to meet with us last week. It was a pleasure to walk through your plans for the spring launch, and we left the conversation genuinely excited about what our teams could make together.",
  "As discussed, we propose a six-week engagement covering brand strategy, a refreshed identity system and a set of launch assets for print and digital. A detailed scope and timeline is enclosed with this letter.",
  "We work in small, senior teams, so you would collaborate directly with the people doing the work from the first workshop to final delivery. Check-ins stay short and every decision is documented.",
  "If the proposal looks right, we would love to schedule a kickoff before the end of the month. Please get in touch with any questions in the meantime.",
];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f = (n) => (+n).toFixed(1);
const rgb = (h) => [0, 2, 4].map((i) => parseInt((h || "#000000").replace("#", "").substr(i, 2), 16));
function lum(hex) {
  const c = rgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function cr(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
const on = (fill) => (cr(fill, "#FFFFFF") >= cr(fill, "#111111") ? "#FFFFFF" : "#111111");
function mix(a, b, k) {
  const x = rgb(a), y = rgb(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join("");
}
function lift(c, bg, target, toward) {
  for (let k = 0; k <= 1.001; k += 0.1) { const x = mix(c, toward, k); if (cr(x, bg) >= target) return x; }
  return toward;
}
const fit = (str, max, avail, ratio = 0.56) => Math.min(max, avail / Math.max(1, str.length * ratio));
function wrap(s, maxW, fs, k) {
  const lines = []; let cur = "";
  s.split(" ").forEach((w) => { const n = cur ? cur + " " + w : w; if (n.length * fs * k > maxW && cur) { lines.push(cur); cur = w; } else cur = n; });
  if (cur) lines.push(cur);
  return lines;
}

export default function render(p) {
  const [W, H] = PAGES[p.page] || PAGES.A4;
  const t = Math.sqrt(W / 595);
  const m = p.margin * 2.835, mx = m, cw = W - 2 * m;
  const paper = p.paper;
  const inkC = cr(p.ink, paper) >= 4.5 ? p.ink : on(paper);
  const mutT = lift(p.muted, paper, 4.5, inkC);
  const guide = lift(p.muted, paper, 2.2, inkC);
  const accT = lift(p.accent, paper, 4.5, inkC);
  const dark = lum(paper) < 0.3;
  const markOn = on(p.accent);
  const name = String(p.company || "").trim() || "Company";
  const signer = String(p.signer || "").trim() || "Your Name";
  const nm = esc(name);
  const ini = esc((name.match(/[A-Za-z0-9]/) || ["A"])[0].toUpperCase());
  const web = (name.toLowerCase().replace(/[^a-z0-9]/g, "") || "studio") + ".co";
  const email = "hello@" + web;
  const ref = (name.split(/\s+/).map((w) => (w[0] || "").toUpperCase()).join("").slice(0, 3) || "NW") + "/25/014";
  const letter = p.preview === "letter";
  const txt = (x, y, s, fs, fill, extra = "") => `<text x="${f(x)}" y="${f(y)}" font-size="${f(fs)}" fill="${fill}" ${extra}>${s}</text>`;
  const mark = (x, y, s) => `<rect x="${f(x)}" y="${f(y)}" width="${f(s)}" height="${f(s)}" rx="${f(s * 0.26)}" fill="${p.accent}"/>` +
    `<rect x="${f(x + s * 0.09)}" y="${f(y + s * 0.09)}" width="${f(s * 0.82)}" height="${f(s * 0.82)}" rx="${f(s * 0.18)}" fill="none" stroke="${markOn}" stroke-opacity="0.3" stroke-width="${f(s * 0.025)}"/>` +
    txt(x + s / 2, y + s * 0.69, ini, s * 0.56, markOn, `text-anchor="middle" font-family="${SERIF}" font-weight="bold"`);

  const barT = 7 * t, barL = 16 * t;
  let out = `<rect width="${W}" height="${H}" fill="${paper}"/>`;
  if (p.bar === "top") out += `<rect width="${W}" height="${f(barT)}" fill="${p.accent}"/>`;
  if (p.bar === "left") {
    out += `<rect width="${f(barL)}" height="${H}" fill="${p.accent}"/>`;
    out += `<text transform="translate(${f(barL / 2 + 2.1 * t)} ${f(H - m)}) rotate(-90)" font-size="${f(6 * t)}" fill="${markOn}" fill-opacity="0.9" font-family="${SANS}" font-weight="bold" letter-spacing="${f(2.4 * t)}">${esc(name.toUpperCase())}</text>`;
  }
  const fx = (p.bar === "left" ? barL : 0) + 6 * t;
  const folds = p.page === "Letter" ? [1 / 3, 2 / 3] : [0.354, 0.707];
  folds.forEach((q) => { out += `<line x1="${f(fx)}" y1="${f(H * q)}" x2="${f(fx + 8 * t)}" y2="${f(H * q)}" stroke="${guide}" stroke-width="0.6"/>`; });
  out += `<line x1="${f(fx)}" y1="${f(H / 2)}" x2="${f(fx + 4 * t)}" y2="${f(H / 2)}" stroke="${guide}" stroke-width="0.6"/>`;

  const top = (p.bar === "top" ? barT : 0) + m * 0.7;
  const L = 38 * t;
  let hb;
  if (p.header === "centered") {
    out += mark(W / 2 - L / 2, top, L);
    const up = name.toUpperCase(), fs = fit(up, 14 * t, cw, 0.84), ls = fs * 0.2;
    out += txt(W / 2 + ls / 2, top + L + 22 * t, esc(up), fs, inkC, `text-anchor="middle" font-family="${SERIF}" letter-spacing="${f(ls)}"`);
    out += txt(W / 2 + 0.6 * t, top + L + 34 * t, esc(web), 6.8 * t, mutT, `text-anchor="middle" font-family="${SANS}" letter-spacing="${f(1.2 * t)}"`);
    hb = top + L + 36 * t;
  } else {
    const fieldW = Math.max(cw * 0.3, 80 * t);
    const avail = (p.header === "split" ? cw - fieldW - 20 * t : cw) - L - 12 * t;
    const fs = fit(name, 17 * t, avail);
    out += mark(mx, top, L);
    out += txt(mx + L + 12 * t, top + L / 2, nm, fs, inkC, `font-family="${SANS}" font-weight="bold" letter-spacing="-0.2"`);
    out += txt(mx + L + 12 * t, top + L / 2 + 11 * t, esc(web), 6.8 * t, mutT, `font-family="${SANS}" letter-spacing="0.6"`);
    if (p.header === "split") {
      const x1 = W - mx - fieldW;
      [["REF", 0.42, ref], ["DATE", 0.95, DATE]].forEach(([lab, q, val]) => {
        const y = top + L * q;
        out += txt(x1, y, lab, 5.8 * t, accT, `font-family="${SANS}" font-weight="bold" letter-spacing="1.4"`);
        out += `<line x1="${f(x1 + 28 * t)}" y1="${f(y + 1.5 * t)}" x2="${f(W - mx)}" y2="${f(y + 1.5 * t)}" stroke="${guide}" stroke-width="0.6"/>`;
        if (letter) out += txt(x1 + 31 * t, y - 1 * t, esc(val), 6.8 * t, inkC, `font-family="${SANS}"`);
      });
    }
    hb = top + L;
  }
  const hr = hb + 14 * t;
  out += `<line x1="${f(mx)}" y1="${f(hr)}" x2="${f(W - mx)}" y2="${f(hr)}" stroke="${guide}" stroke-opacity="0.6" stroke-width="0.6"/>`;
  out += `<rect x="${f(p.header === "centered" ? W / 2 - 15 * t : mx)}" y="${f(hr - 0.9 * t)}" width="${f(30 * t)}" height="${f(1.8 * t)}" fill="${p.accent}"/>`;
  const ct = hr + 20 * t;

  const fsF = 6.6 * t, wq = (s) => (s.length + 3) * fsF * 0.54, gap = 14 * t;
  const half = cw / 2 - wq(PHONE) / 2;
  const single = wq(ADDR) + gap < half && wq(email) + gap < half;
  const rows = single ? 1 : 2, lhF = fsF * 1.7, tb = fsF + (rows - 1) * lhF;
  let first, fc, lc, lo, cb;
  if (p.bar === "bottom") {
    const bh = Math.max(tb + m * 0.9, tb + 24 * t), by = H - bh;
    out += `<rect y="${f(by)}" width="${W}" height="${f(bh)}" fill="${p.accent}"/>`;
    first = by + bh / 2 - tb / 2 + fsF * 0.75; fc = markOn; lc = markOn; lo = 0.6; cb = by - 18 * t;
  } else {
    first = H - m * 0.55 - (rows - 1) * lhF; fc = mutT; lc = accT; lo = 1;
    const ry = first - fsF - 9 * t;
    out += `<line x1="${f(mx)}" y1="${f(ry)}" x2="${f(W - mx)}" y2="${f(ry)}" stroke="${guide}" stroke-opacity="0.6" stroke-width="0.6"/>`;
    out += `<rect x="${f(mx)}" y="${f(ry - 0.9 * t)}" width="${f(24 * t)}" height="${f(1.8 * t)}" fill="${p.accent}"/>`;
    cb = ry - 16 * t;
  }
  const fa = `font-family="${SANS}" letter-spacing="0.3"`;
  const lab = (k, s) => `<tspan fill="${lc}" fill-opacity="${lo}" font-weight="bold">${k}</tspan>\u2002${esc(s)}`;
  out += txt(mx, first, lab("A", ADDR), fsF, fc, fa);
  if (single) out += txt(W / 2, first, lab("T", PHONE), fsF, fc, `text-anchor="middle" ${fa}`);
  else out += txt(mx, first + lhF, lab("T", PHONE), fsF, fc, fa);
  out += txt(W - mx, first + (single ? 0 : lhF), lab("E", email), fsF, fc, `text-anchor="end" ${fa}`);

  const ch = cb - ct;
  if (p.watermark) {
    const s = Math.min(cw, ch) * 0.62, wx = W / 2 - s / 2, wy = ct + ch / 2 - s / 2, o = dark ? 0.12 : 0.07;
    out += `<g opacity="${o}"><rect x="${f(wx)}" y="${f(wy)}" width="${f(s)}" height="${f(s)}" rx="${f(s * 0.26)}" fill="none" stroke="${p.accent}" stroke-width="${f(s * 0.035)}"/>` +
      `<rect x="${f(wx + s * 0.09)}" y="${f(wy + s * 0.09)}" width="${f(s * 0.82)}" height="${f(s * 0.82)}" rx="${f(s * 0.18)}" fill="none" stroke="${p.accent}" stroke-width="${f(s * 0.01)}"/>` +
      txt(W / 2, wy + s * 0.69, ini, s * 0.56, p.accent, `text-anchor="middle" font-family="${SERIF}" font-weight="bold"`) + `</g>`;
  }

  const fsB = 8 * t, lhB = fsB * 1.6;
  if (p.preview === "guides") {
    for (let yy = ct + 22 * t; yy < cb - 4 * t; yy += lhB) out += `<line x1="${f(mx)}" y1="${f(yy)}" x2="${f(W - mx)}" y2="${f(yy)}" stroke="${guide}" stroke-opacity="0.22" stroke-width="0.5"/>`;
    out += `<rect x="${f(mx)}" y="${f(ct)}" width="${f(cw)}" height="${f(ch)}" fill="none" stroke="${guide}" stroke-opacity="0.7" stroke-width="0.6" stroke-dasharray="3 3"/>`;
    const c = 6 * t;
    [[mx, ct, 1, 1], [W - mx, ct, -1, 1], [mx, cb, 1, -1], [W - mx, cb, -1, -1]].forEach(([x, y, sx, sy]) => {
      out += `<path d="M${f(x)} ${f(y + c * sy)}V${f(y)}H${f(x + c * sx)}" fill="none" stroke="${guide}" stroke-width="0.9"/>`;
    });
    const dims = `CONTENT ${Math.round(cw / 2.835)} \u00D7 ${Math.round(ch / 2.835)} MM \u00B7 MARGIN ${p.margin} MM`;
    out += txt(W - mx - 10 * t, ct + 12 * t, dims, 5 * t, mutT, `text-anchor="end" font-family="${SANS}" letter-spacing="1"`);
  } else if (letter) {
    const serif = p.header === "centered", bf = serif ? SERIF : SANS, k = serif ? 0.5 : 0.52;
    const tx = (x, y, s, fill, extra = "") => txt(x, y, s, fsB, fill, `font-family="${bf}" ${extra}`);
    let y = ct + fsB;
    TO.forEach((s, i) => { out += tx(mx, y + i * lhB, esc(s), i ? mutT : inkC, i ? "" : `font-weight="bold"`); });
    if (p.header !== "split") out += tx(W - mx, y, DATE, mutT, `text-anchor="end"`);
    y += 3 * lhB + lhB * 0.9;
    out += tx(mx, y, `<tspan fill="${accT}">Re:</tspan> Brand partnership proposal`, inkC, `font-weight="bold"`);
    y += lhB * 1.7;
    out += tx(mx, y, "Dear Mira,", inkC);
    y += lhB * 1.5;
    const signH = lhB * 1.6 + 42 * t;
    for (const para of BODY) {
      const lines = wrap(para, cw, fsB, k), h = lines.length * lhB;
      if (y - fsB + h + signH > cb) break;
      lines.forEach((s, i) => { out += tx(mx, y + i * lhB, esc(s), inkC); });
      y += h + lhB * 0.55;
    }
    y += lhB * 0.3;
    out += tx(mx, y, "Kind regards,", inkC);
    let hsh = 7;
    for (const ch2 of signer) hsh = Math.imul(hsh ^ ch2.charCodeAt(0), 16777619);
    const r = rng(hsh >>> 0), sw = Math.min(cw * 0.4, (signer.length * 6 + 34) * t), segs = Math.max(4, Math.min(9, Math.round(signer.length / 2)));
    const sy0 = y + 26 * t;
    let sx = mx, d = `M${f(sx)} ${f(sy0 + 2 * t)}`;
    for (let i = 0; i < segs; i++) {
      const nx = sx + (sw / segs) * (0.75 + r() * 0.5), amp = (i === 0 ? 13 : 4 + r() * 8) * t;
      d += ` C${f(sx + (nx - sx) * 0.15)} ${f(sy0 - amp)} ${f(sx + (nx - sx) * 0.95)} ${f(sy0 - amp * 0.8)} ${f(sx + (nx - sx) * 0.55)} ${f(sy0 + (2 + r() * 3) * t)}`;
      d += ` S${f(nx - (nx - sx) * 0.1)} ${f(sy0 + 3 * t)} ${f(nx)} ${f(sy0 - r() * 3 * t)}`;
      sx = nx;
    }
    d += ` M${f(mx + sw * 0.1)} ${f(sy0 + 7 * t)} C${f(mx + sw * 0.5)} ${f(sy0 + 4 * t)} ${f(mx + sw * 0.9)} ${f(sy0 + 5 * t)} ${f(mx + sw * 1.06)} ${f(sy0 + t)}`;
    out += `<path d="${d}" fill="none" stroke="${inkC}" stroke-opacity="0.8" stroke-width="${f(1.05 * t)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    y = sy0 + 16 * t;
    out += tx(mx, y, esc(signer), inkC, `font-weight="bold"`);
    out += txt(mx, y + lhB * 0.95, esc("Founder, " + name), fsB * 0.88, mutT, `font-family="${bf}"`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${out}</svg>`;
}
