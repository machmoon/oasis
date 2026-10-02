// Halftone dot field: a rotated screen of circles, squares or diamonds whose size follows a radial, linear or ring falloff from a focal point.
export const meta = {
  title: "Halftone Bloom",
  kind: "background",
  description: "A print-style halftone dot field whose dots swell toward a focal point, for hero backgrounds, posters and editorial texture.",
  tags: ["halftone", "dots", "background", "print", "texture", "gradient", "retro", "pattern"],
  price: 0,
  author: "oasis-factory",
  size: [1200, 800],
};

export const params = {
  knobs: {
    ink: { type: "color", role: "primary", label: "Ink", default: "#1D3B8C" },
    paper: { type: "color", role: "background", label: "Paper", default: "#F3EDE2" },
    shape: { type: "choice", label: "Dot shape", default: "circle", options: ["circle", "square", "diamond"] },
    gradient: { type: "choice", label: "Gradient", default: "radial", options: ["radial", "linear", "ring"] },
    spacing: { type: "range", label: "Spacing", default: 18, min: 10, max: 60, step: 1 },
    angle: { type: "range", label: "Screen angle", default: 30, min: 0, max: 90, step: 1 },
    focusX: { type: "range", label: "Focal point X", default: 30, min: 0, max: 100, step: 1 },
    focusY: { type: "range", label: "Focal point Y", default: 36, min: 0, max: 100, step: 1 },
    reach: { type: "range", label: "Reach", default: 72, min: 20, max: 160, step: 1 },
    invert: { type: "toggle", label: "Invert falloff", default: false },
  },
  presets: {
    Ultramarine: { ink: "#1D3B8C", paper: "#F3EDE2" },
    Riso: { ink: "#FF5E5B", paper: "#FFF4E6" },
    Newsprint: { ink: "#1A1A1A", paper: "#E9E4D8" },
    Acid: { ink: "#C6FF3D", paper: "#0E0F12" },
  },
};

const f1 = (n) => (Math.round(n * 10) / 10).toString();

function ease(t) {
  return t * t * (3 - 2 * t);
}

export default function render(p) {
  const W = 1200, H = 800;
  const s = Math.max(4, p.spacing);
  const a = (p.angle * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a);
  const fx = (Math.min(100, Math.max(0, p.focusX)) / 100) * W;
  const fy = (Math.min(100, Math.max(0, p.focusY)) / 100) * H;
  const diag = Math.hypot(W, H);
  const reach = Math.max(1, (p.reach / 100) * diag * 0.7);

  let ux = W / 2 - fx, uy = H / 2 - fy;
  const ul = Math.hypot(ux, uy);
  if (ul < 1) { ux = 0; uy = 1; } else { ux /= ul; uy /= ul; }

  const far = Math.max(
    Math.hypot(fx, fy), Math.hypot(W - fx, fy),
    Math.hypot(fx, H - fy), Math.hypot(W - fx, H - fy)
  );
  const n = Math.ceil(far / s) + 2;
  const parts = [];

  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const u = i * s, w = j * s;
      const x = fx + u * ca - w * sa;
      const y = fy + u * sa + w * ca;
      if (x < -s || x > W + s || y < -s || y > H + s) continue;

      let t;
      if (p.gradient === "linear") {
        t = Math.max(0, (x - fx) * ux + (y - fy) * uy) / reach;
      } else if (p.gradient === "ring") {
        const d = Math.hypot(x - fx, y - fy);
        t = Math.abs(d - reach * 0.5) / (reach * 0.5);
      } else {
        t = Math.hypot(x - fx, y - fy) / reach;
      }
      t = Math.min(1, t);
      let v = 1 - ease(t);
      if (p.invert) v = 1 - v;

      if (p.shape === "square") {
        const h = v * s * 0.51;
        if (h < 0.55) continue;
        const ex = h * ca, ey = h * sa, gx = -h * sa, gy = h * ca;
        parts.push(
          `M${f1(x + ex + gx)} ${f1(y + ey + gy)}L${f1(x - ex + gx)} ${f1(y - ey + gy)}L${f1(x - ex - gx)} ${f1(y - ey - gy)}L${f1(x + ex - gx)} ${f1(y + ey - gy)}Z`
        );
      } else if (p.shape === "diamond") {
        const k = v * s * 0.72;
        if (k < 0.8) continue;
        const ex = k * ca, ey = k * sa, gx = -k * sa, gy = k * ca;
        parts.push(
          `M${f1(x + ex)} ${f1(y + ey)}L${f1(x + gx)} ${f1(y + gy)}L${f1(x - ex)} ${f1(y - ey)}L${f1(x - gx)} ${f1(y - gy)}Z`
        );
      } else {
        const r = v * s * 0.6;
        if (r < 0.65) continue;
        const rs = f1(r), d = f1(r * 2);
        parts.push(`M${f1(x - r)} ${f1(y)}a${rs} ${rs} 0 1 0 ${d} 0a${rs} ${rs} 0 1 0 -${d} 0`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${p.paper}"/><path d="${parts.join("")}" fill="${p.ink}"/></svg>`;
}
