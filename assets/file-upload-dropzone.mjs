// File upload dropzone: a modal card with a drag target in idle, hover or uploading state, plus a live file list with progress, success and error rows.
export const meta = {
  title: "Drop & Upload",
  kind: "ui",
  description: "A file upload modal with a dashed dropzone in three states and a file list showing progress bars, completed and failed rows. Use it in product mockups, design systems and onboarding flows.",
  tags: ["upload", "dropzone", "file", "progress", "drag and drop", "form", "modal", "ui kit"],
  price: 0,
  author: "oasis-factory",
  size: [640, 760],
};

export const params = {
  knobs: {
    background: { type: "color", role: "background", label: "Background", default: "#ECEEF4" },
    ink: { type: "color", role: "ink", label: "Text", default: "#161827" },
    accent: { type: "color", role: "primary", label: "Accent", default: "#4F46E5" },
    state: { type: "choice", label: "Dropzone state", default: "uploading", options: ["idle", "hover", "uploading"] },
    border: { type: "choice", label: "Border style", default: "dashed", options: ["dashed", "long dash", "dotted", "solid"] },
    bar: { type: "choice", label: "Progress bar", default: "thin", options: ["thin", "bold"] },
    files: { type: "range", label: "File count", default: 4, min: 1, max: 6, step: 1 },
    progress: { type: "range", label: "Progress", default: 64, min: 0, max: 100, step: 1 },
    radius: { type: "range", label: "Corner radius", default: 14, min: 0, max: 24, step: 1 },
    errors: { type: "toggle", label: "Show failed upload", default: true },
  },
  presets: {
    Ocean: { background: "#E6F0F7", ink: "#0E2233", accent: "#0A72C2" },
    Midnight: { background: "#0E1015", ink: "#EDEFF5", accent: "#7C9CFF" },
    Ember: { background: "#FBF1E9", ink: "#2A1A12", accent: "#E5482D" },
    Mint: { background: "#E3F1EC", ink: "#10302A", accent: "#0E9F6E" },
  },
};

const FILES = [
  { n: "brand-guidelines.pdf", s: 4.2, t: "PDF" },
  { n: "hero-shot.jpg", s: 2.8, t: "JPG" },
  { n: "q3-report.xlsx", s: 1.1, t: "XLS" },
  { n: "product-demo.mp4", s: 18.6, t: "MP4" },
  { n: "logo-pack.zip", s: 6.4, t: "ZIP" },
  { n: "interview-notes.docx", s: 0.4, t: "DOC" },
];
const FONT = "-apple-system, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const ICON = {
  cloud: '<path d="M12 13v8"/><path d="m8 17 4-4 4 4"/><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>',
  arrow: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  retry: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
};

const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (h) => {
  const c = hx(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const con = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function ensure(c, bg, min) {
  const to = lum(bg) > 0.35 ? "#000000" : "#FFFFFF";
  let o = c;
  for (let i = 1; i <= 10 && con(o, bg) < min; i++) o = mix(c, to, i * 0.1);
  return o;
}
const fmt = (v) => v.toFixed(1);
const icon = (name, x, y, size, color, sw) =>
  `<g transform="translate(${(x - size / 2).toFixed(1)} ${(y - size / 2).toFixed(1)}) scale(${(size / 24).toFixed(3)})" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</g>`;
const txt = (x, y, s, fill, size, weight, anchor, extra) =>
  `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="${FONT}" font-size="${size}" font-weight="${weight || 400}" fill="${fill}"${anchor ? ` text-anchor="${anchor}"` : ""}${extra || ""}>${s}</text>`;

export default function render(p) {
  const W = 640, H = 760;
  const n = Math.max(1, Math.min(6, Math.round(p.files)));
  const pr = Math.max(0, Math.min(100, Math.round(p.progress)));
  const R = p.radius;
  const bg = p.background, dark = lum(bg) < 0.3;
  let card = dark ? mix(bg, "#FFFFFF", 0.06) : mix(bg, "#FFFFFF", 0.82);
  for (let t = 0.08; dark && con(card, bg) < 1.18 && t < 0.24; t += 0.02) card = mix(bg, "#FFFFFF", t);
  const ink = ensure(p.ink, card, 7);
  const muted = ensure(mix(ink, card, 0.45), card, 4.2);
  const acc = ensure(p.accent, card, 3);
  const onAcc = con("#FFFFFF", acc) >= con("#111318", acc) ? "#FFFFFF" : "#111318";
  const line = mix(card, ink, dark ? 0.16 : 0.11);
  const track = mix(card, ink, dark ? 0.14 : 0.08);
  const sunken = mix(card, ink, dark ? 0.035 : 0.025);
  const tint = mix(card, acc, dark ? 0.16 : 0.08);
  const OK = dark ? "#3DD68C" : "#16A34A";
  const ERR = dark ? "#FF6B5E" : "#D92D20";
  const errBg = mix(card, ERR, dark ? 0.1 : 0.06);
  const errInk = ensure(ERR, errBg, 4.5);
  const tileBg = mix(card, acc, dark ? 0.18 : 0.1), tileInk = ensure(acc, tileBg, 3.5);

  const rows = [];
  for (let i = 0; i < n; i++) {
    let st = "done", pct = 100;
    if (i === 0) { st = "up"; pct = pr; } else if (i === 1 && n >= 4) { st = "up"; pct = Math.round(pr * 0.42); }
    if (p.errors && n >= 2 && i === n - 1) st = "err";
    if (st === "up" && pct >= 100) st = "done";
    rows.push({ ...FILES[i], st, pct });
  }
  const up = rows.filter((r) => r.st === "up");
  const upTot = up.reduce((a, r) => a + r.s, 0), upDone = up.reduce((a, r) => a + (r.s * r.pct) / 100, 0);
  const overall = upTot ? upDone / upTot : 1;
  const doneN = rows.filter((r) => r.st === "done").length;
  const total = rows.reduce((a, r) => a + r.s, 0);

  const rowH = 52, gap = 8, rowsH = n * rowH + (n - 1) * gap;
  const fixed = 28 + 56 + 20 + 24 + rowsH + 24 + 40 + 28;
  const dz = Math.max(136, Math.min(200, H - 48 - fixed));
  const cardH = fixed + dz, cardW = 544, cx = 48, cy = Math.round((H - cardH) / 2);
  const ix = cx + 28, iw = 488, dzY = cy + 84;
  const cR = Math.min(R * 1.3, 30), rowR = R * 0.7, barH = p.bar === "bold" ? 8 : 4;

  let o = `<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="20" flood-color="#000" flood-opacity="${dark ? 0.5 : 0.1}"/></filter>`;
  o += `<filter id="gs" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity="${dark ? 0.5 : 0.18}"/></filter>`;
  o += `<linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${mix(acc, "#FFFFFF", 0.25)}"/><stop offset="1" stop-color="${acc}"/></linearGradient>`;
  o += `<pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="11" cy="11" r="1.1" fill="${mix(bg, dark ? "#FFFFFF" : "#000000", 0.07)}"/></pattern></defs>`;
  o += `<rect width="${W}" height="${H}" fill="${bg}"/><rect width="${W}" height="${H}" fill="url(#dots)"/>`;
  o += `<rect x="${cx}" y="${cy}" width="${cardW}" height="${cardH}" rx="${cR}" fill="${card}" filter="url(#sh)"/>`;
  o += `<rect x="${cx + 0.5}" y="${cy + 0.5}" width="${cardW - 1}" height="${cardH - 1}" rx="${cR}" fill="none" stroke="${line}"/>`;

  o += txt(ix, cy + 46, "Upload files", ink, 19, 700, "", ' letter-spacing="-0.2"');
  o += txt(ix, cy + 66, "Add assets to the Brand Refresh project", muted, 13);
  o += `<rect x="${ix + iw - 32}" y="${cy + 28}" width="32" height="32" rx="${Math.min(R * 0.6, 16)}" fill="${sunken}"/>` + icon("x", ix + iw - 16, cy + 44, 16, muted, 2);

  const hov = p.state === "hover", upl = p.state === "uploading";
  const dash = { dashed: "8 6", "long dash": "18 9", dotted: "0.01 7", solid: "none" }[p.border];
  const sw = (p.border === "dotted" ? 2.6 : 1.6) + (hov ? 0.6 : 0);
  const bc = hov ? acc : upl ? mix(card, acc, 0.55) : mix(card, ink, dark ? 0.34 : 0.28);
  const dzFill = hov ? tint : upl ? mix(card, acc, dark ? 0.07 : 0.035) : sunken;
  o += `<rect x="${ix + sw / 2}" y="${dzY + sw / 2}" width="${iw - sw}" height="${dz - sw}" rx="${R}" fill="${dzFill}" stroke="${bc}" stroke-width="${sw}" stroke-dasharray="${dash}" stroke-linecap="round"/>`;
  const ir = dz < 170 ? 20 : 26, mx = ix + iw / 2;
  const top = dzY + (dz - (ir * 2 + 50)) / 2, icy = top + ir - (hov ? 4 : 0);
  const t1y = top + ir * 2 + 26, t2y = t1y + 20;
  let title, cap = "PDF, JPG, MP4 or ZIP · up to 50 MB";
  if (hov) {
    o += `<circle cx="${mx}" cy="${icy}" r="${ir + 9}" fill="${acc}" opacity="0.14"/><circle cx="${mx}" cy="${icy}" r="${ir}" fill="${acc}"/>`;
    o += icon("arrow", mx, icy, ir * 1.05, onAcc, 2.2);
    title = `<tspan fill="${ensure(acc, tint, 4.5)}">Release to upload 3 files</tspan>`;
    const gx = ix + iw - 122, gy = dzY + dz / 2 - 32;
    o += `<g transform="translate(${gx} ${gy}) rotate(-8 24 29)"><g filter="url(#gs)"><path d="M6 0h28l14 14v38a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6V6a6 6 0 0 1 6-6z" fill="${card}" stroke="${line}"/></g>`;
    o += `<path d="M34 0v10a4 4 0 0 0 4 4h10" fill="${tileBg}" stroke="${line}"/><rect x="8" y="22" width="24" height="4" rx="2" fill="${track}"/><rect x="8" y="30" width="16" height="4" rx="2" fill="${track}"/>`;
    o += txt(8, 50, "JPG", tileInk, 10, 700) + `<circle cx="48" cy="2" r="11" fill="${acc}" stroke="${card}" stroke-width="2"/>` + txt(48, 6, "3", onAcc, 11, 700, "middle") + `</g>`;
    o += `<path transform="translate(${gx + 40} ${gy + 44})" d="M0 0V18l5-4.5 3.5 7.5 3-1.3-3.5-7.2H14Z" fill="${ink}" stroke="${card}" stroke-width="1.5" stroke-linejoin="round"/>`;
  } else if (upl) {
    const C = 2 * Math.PI * ir, fin = !upTot;
    o += `<circle cx="${mx}" cy="${icy}" r="${ir}" fill="none" stroke="${track}" stroke-width="4"/>`;
    o += `<circle cx="${mx}" cy="${icy}" r="${ir}" fill="none" stroke="${fin ? OK : acc}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(C * Math.max(0.005, overall)).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${mx} ${icy})"/>`;
    o += icon(fin ? "check" : "arrow", mx, icy, ir * 0.95, fin ? OK : acc, 2.2);
    title = fin ? "All uploads complete" : `Uploading ${up.length} file${up.length > 1 ? "s" : ""}…`;
    cap = fin ? `${doneN} file${doneN === 1 ? "" : "s"} ready to attach` : `${fmt(upDone)} of ${fmt(upTot)} MB · ${Math.round(overall * 100)}%`;
  } else {
    o += `<circle cx="${mx}" cy="${icy}" r="${ir}" fill="${card}" stroke="${line}"/>` + icon("cloud", mx, icy, ir * 1.05, muted, 1.8);
    title = `Drag &amp; drop files or <tspan fill="${ensure(acc, sunken, 4.5)}" text-decoration="underline">browse</tspan>`;
  }
  o += txt(mx, t1y, title, ink, 15, 600, "middle") + txt(mx, t2y, cap, muted, 12.5, 400, "middle");

  const ly = dzY + dz + 20;
  o += txt(ix, ly + 13, "UPLOADS", muted, 11, 700, "", ' letter-spacing="1.2"');
  o += txt(ix + iw, ly + 13, `${doneN} of ${n} complete`, muted, 12, 500, "end");
  rows.forEach((r, i) => {
    const y = ly + 24 + i * (rowH + gap), rx2 = ix + iw, tx = ix + 58, err = r.st === "err";
    o += `<rect x="${ix + 0.5}" y="${y + 0.5}" width="${iw - 1}" height="${rowH - 1}" rx="${rowR}" fill="${err ? errBg : card}" stroke="${err ? mix(card, ERR, 0.4) : line}"/>`;
    const tb = err ? mix(card, ERR, dark ? 0.2 : 0.12) : tileBg;
    o += `<rect x="${ix + 12}" y="${y + 9}" width="34" height="34" rx="${R * 0.45}" fill="${tb}"/>`;
    o += txt(ix + 29, y + 29.5, r.t, err ? ensure(ERR, tb, 3.5) : tileInk, 9.5, 700, "middle", ' letter-spacing="0.3"');
    o += txt(tx, y + 21, r.n, ink, 13, 600);
    if (r.st === "up") {
      const be = rx2 - 80, bw = be - tx, cy2 = y + 35;
      o += txt(be, y + 21, `${fmt((r.s * r.pct) / 100)} of ${fmt(r.s)} MB`, muted, 11.5, 400, "end");
      const brx = Math.min(barH / 2, R / 3);
      o += `<rect x="${tx}" y="${cy2 - barH / 2}" width="${bw}" height="${barH}" rx="${brx}" fill="${track}"/>`;
      o += `<rect x="${tx}" y="${cy2 - barH / 2}" width="${Math.max(barH, (bw * r.pct) / 100).toFixed(1)}" height="${barH}" rx="${brx}" fill="url(#bar)"/>`;
      o += txt(rx2 - 40, y + 30.5, `${r.pct}%`, ink, 12, 700, "end");
      o += icon("x", rx2 - 23, y + 26, 14, muted, 2);
    } else if (r.st === "done") {
      o += txt(tx, y + 38, `${fmt(r.s)} MB`, muted, 11.5);
      o += `<circle cx="${rx2 - 24}" cy="${y + 26}" r="10" fill="${OK}"/>` + icon("check", rx2 - 24, y + 26, 12, card, 3);
    } else {
      o += txt(tx, y + 38, "Upload failed · Network error", errInk, 11.5, 500);
      const px = rx2 - 86;
      o += `<rect x="${px + 0.5}" y="${y + 12.5}" width="73" height="27" rx="${Math.min(R * 0.5, 13.5)}" fill="${card}" stroke="${mix(card, ERR, 0.35)}"/>`;
      o += icon("retry", px + 20, y + 26, 13, ink, 2.2) + txt(px + 46, y + 30.5, "Retry", ink, 12, 600, "middle");
    }
  });

  const fy = ly + 24 + rowsH + 24, br = Math.min(R * 0.6, 20);
  const label = doneN > 0 ? `Attach ${doneN} file${doneN > 1 ? "s" : ""}` : "Attach files";
  const aw = Math.round(label.length * 7.3 + 36), ax = ix + iw - aw, off = doneN === 0;
  o += txt(ix, fy + 25, `${n} file${n > 1 ? "s" : ""} · ${fmt(total)} MB`, muted, 12.5, 500);
  o += `<rect x="${ax - 101.5}" y="${fy + 0.5}" width="91" height="39" rx="${br}" fill="${card}" stroke="${line}"/>` + txt(ax - 56, fy + 25, "Cancel", ink, 13.5, 600, "middle");
  o += `<rect x="${ax}" y="${fy}" width="${aw}" height="40" rx="${br}" fill="${off ? track : acc}"/>` + txt(ax + aw / 2, fy + 25, label, off ? muted : onAcc, 13.5, 600, "middle");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${o}</svg>`;
}
