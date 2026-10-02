// Friendly generative avatars. The face layout is the "beam" variant from
// boringdesigners/boring-avatars (src/lib/components/avatar-beam.tsx, MIT), re-expressed as an Oasis program.
export const meta = {
  title: "Beam Avatars",
  kind: "avatar",
  description: "Deterministic, friendly placeholder avatars from any name, so every user gets a face.",
  tags: ["avatar", "profile", "placeholder", "face", "user", "generative"],
  price: 0,
  author: "oasis",
  credit: "Layout after boring-avatars 'beam' (MIT)",
  size: [360, 360],
};

export const params = {
  knobs: {
    name: { type: "text", label: "Name", default: "Maya Angelou" },
    c1: { type: "color", role: "ink", label: "Colour 1", default: "#264653" },
    c2: { type: "color", role: "secondary", label: "Colour 2", default: "#2A9D8F" },
    c3: { type: "color", role: "background", label: "Colour 3", default: "#E9C46A" },
    c4: { type: "color", role: "highlight", label: "Colour 4", default: "#F4A261" },
    c5: { type: "color", role: "primary", label: "Colour 5", default: "#E76F51" },
    shape: { type: "choice", label: "Shape", default: "circle", options: ["circle", "squircle", "square"] },
    layout: { type: "choice", label: "Layout", default: "team", options: ["single", "team"] },
  },
  presets: {
    Desert: { c1: "#264653", c2: "#2A9D8F", c3: "#E9C46A", c4: "#F4A261", c5: "#E76F51" },
    Candy: { c1: "#FFADAD", c2: "#FFD6A5", c3: "#CAFFBF", c4: "#9BF6FF", c5: "#BDB2FF" },
    Mono: { c1: "#111111", c2: "#444444", c3: "#888888", c4: "#CCCCCC", c5: "#F2F2F2" },
  },
};

const SIZE = 36;
function hashCode(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h = h & h; } return Math.abs(h); }
const digit = (n, i) => Math.floor((n / Math.pow(10, i)) % 10);
const bool = (n, i) => !(digit(n, i) % 2);
const unit = (n, range, i) => { const v = n % range; return i && digit(n, i) % 2 === 0 ? -v : v; };
function contrast(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 128 ? "#000000" : "#FFFFFF";
}

function face(p, name, uid) {
  const colors = [p.c1, p.c2, p.c3, p.c4, p.c5];
  const n = hashCode(name || "oasis");
  const wrap = colors[n % 5];
  const ptx = unit(n, 10, 1), tx = ptx < 5 ? ptx + SIZE / 9 : ptx;
  const pty = unit(n, 10, 2), ty = pty < 5 ? pty + SIZE / 9 : pty;
  const face = contrast(wrap);
  const bg = colors[(n + 13) % 5];
  const rot = unit(n, 360), scale = 1 + unit(n, SIZE / 12) / 10;
  const open = bool(n, 2), circ = bool(n, 1);
  const eye = unit(n, 5), mouth = unit(n, 3), frot = unit(n, 10, 3);
  const fx = tx > SIZE / 6 ? tx / 2 : unit(n, 8, 1), fy = ty > SIZE / 6 ? ty / 2 : unit(n, 7, 2);
  const rx = p.shape === "circle" ? SIZE * 2 : p.shape === "squircle" ? SIZE * 0.28 : 0;
  const mouthPath = open
    ? `<path d="M15 ${19 + mouth}c2 1 4 1 6 0" stroke="${face}" fill="none" stroke-linecap="round"/>`
    : `<path d="M13,${19 + mouth} a1,0.75 0 0,0 10,0" fill="${face}"/>`;
  return `
<mask id="m${uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" rx="${rx}" fill="#FFFFFF"/></mask>
<g mask="url(#m${uid})"><rect width="${SIZE}" height="${SIZE}" fill="${bg}"/>
<rect x="0" y="0" width="${SIZE}" height="${SIZE}" transform="translate(${tx} ${ty}) rotate(${rot} ${SIZE / 2} ${SIZE / 2}) scale(${scale})" fill="${wrap}" rx="${circ ? SIZE : SIZE / 6}"/>
<g transform="translate(${fx} ${fy}) rotate(${frot} ${SIZE / 2} ${SIZE / 2})">${mouthPath}
<rect x="${14 - eye}" y="14" width="1.5" height="2" rx="1" fill="${face}"/><rect x="${20 + eye}" y="14" width="1.5" height="2" rx="1" fill="${face}"/></g></g>`;
}

export default function render(p) {
  if (p.layout === "single") return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="360" height="360">${face(p, p.name, "a")}</svg>`;
  // A team: the name plus three seeded teammates, so a whole palette shows at once.
  const first = (p.name || "Oasis").split(" ")[0];
  const names = [p.name, first + " Rivera", first + " Okafor", first + " Lindqvist"];
  const cells = names.map((nm, i) => `<svg x="${(i % 2) * 19}" y="${Math.floor(i / 2) * 19}" width="17" height="17" viewBox="0 0 ${SIZE} ${SIZE}">${face(p, nm, "t" + i)}</svg>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="360" height="360">${cells}</svg>`;
}
