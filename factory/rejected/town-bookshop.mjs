// Town Bookshop: a corner bookshop with a painted shopfront, shelves of coloured books in two windows, a bookshelf
// pictogram fascia and a big hanging book sign. Block asset: build(p) returns parts in metres on the Oasis Town grid
// (origin at the footprint's corner, y up, street side at z = 0).
export const meta = {
  title: "Town Bookshop",
  kind: "3d",
  format: "blocks",
  kit: "Oasis Town",
  description: "A cosy corner bookshop with a painted shopfront, windows of colourful shelved books and a hanging open-book sign, sized to sit beside the Town Shop.",
  tags: ["3d", "low poly", "building", "bookshop", "books", "shop", "town", "kit"],
  price: 4,
  author: "oasis-factory",
  footprint: [6, 6],
  size: [1000, 1000],
};

export const params = {
  knobs: {
    front: { type: "color", role: "primary", label: "Shopfront", default: "#2F7A55" },
    wall: { type: "color", role: "surface", label: "Walls", default: "#F3E3C8" },
    roof: { type: "color", role: "ink", label: "Roof", default: "#C8553D" },
    sign: { type: "color", role: "highlight", label: "Sign & emblem", default: "#F2B33D" },
    seed: { type: "range", label: "Book colours", default: 7, min: 1, max: 99, step: 1 },
    floors: { type: "range", label: "Floors", default: 2, min: 1, max: 3, step: 1 },
    roofStyle: { type: "choice", label: "Roof style", default: "gable", options: ["gable", "flat"] },
    lights: { type: "toggle", label: "Lit windows", default: true },
  },
  presets: {
    Oxford: { front: "#2E4A7D", wall: "#F6EEE0", roof: "#5B6270", sign: "#F2B33D" },
    Plum: { front: "#6B3A5B", wall: "#F2E6EE", roof: "#4A3A55", sign: "#FFB347" },
    Pillarbox: { front: "#A8322F", wall: "#D8DEE3", roof: "#5B6270", sign: "#F6EEE0" },
  },
};

export function build(p) {
  const parts = [];
  const box = (x, y, z, w, h, d, c, e) =>
    parts.push({ t: "box", p: [x, y, z], s: [w, h, d], c, ...(e ? { e: true } : {}) });

  // ---------- colour helpers: every brand-driven role is clamped so the value structure survives any palette
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const toRgb = (hex) => {
    const n = parseInt(String(hex).replace("#", "").padEnd(6, "0").slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const toHex = (rgb) => "#" + rgb.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  const toHsl = (hex) => {
    const [r, g, b] = toRgb(hex).map((v) => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, s = 0;
    if (d > 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return [h, clamp(s, 0, 1), l];
  };
  const fromHsl = (h, s, l) => {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return toHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
  };
  const shade = (hex, k) => toHex(toRgb(hex).map((v) => (k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  const lum = (hex) => {
    const [r, g, b] = toRgb(hex).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => {
    const la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const rng = (n) => {
    let s = (Math.imul(n | 0, 2654435761) ^ 0x9e3779b9) >>> 0;
    if (!s) s = 1;
    return () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };

  // walls: pale; roof: mid-tone, cool hues pushed towards slate; shopfront: deep, muted heritage paint
  // (acid yellow-greens are steered to a bottle green); sign: bright.
  const wallC = (() => { const [h, s, l] = toHsl(p.wall); return fromHsl(h, Math.min(s, 0.65), clamp(l, 0.84, 0.94)); })();
  const roofC = (() => {
    const [h, s, l] = toHsl(p.roof);
    const cool = h > 180 && h < 300;
    return fromHsl(h, Math.min(s, cool ? 0.2 : 0.6), clamp(l, 0.34, 0.52));
  })();
  const frontC = (() => {
    let [h, s, l] = toHsl(p.front);
    if (h > 55 && h < 125 && s > 0.25) h = 150;
    return fromHsl(h, Math.min(s, 0.5), clamp(l, 0.22, 0.36));
  })();
  const signC = (() => { const [h, s, l] = toHsl(p.sign); return fromHsl(h, Math.min(s, 0.85), clamp(l, 0.6, 0.74)); })();
  const frontDark = shade(frontC, -0.3);
  const doorC = shade(frontC, -0.45);
  const cream = "#F6EEE0", slate = "#5B6270";
  const iconC = contrast(signC, frontDark) >= 3 ? signC : cream;

  const W = 5, D = 5, FLOOR = 2.6, GROUND = 3.1;
  const x0 = 0.5, z0 = 0.6;
  const floors = clamp(Math.round(p.floors), 1, 3);
  const H = GROUND + (floors - 1) * FLOOR;
  const glass = "#7E93A8", lit = "#FFD58A", wood = "#8A6E52";
  const L = !!p.lights;
  const win = L ? lit : glass;

  // ---------- books: a seeded 5-colour set from the kit palette; neighbouring runs never share a colour
  const bookCols = ["#C8553D", "#3E7BFA", "#F2B33D", "#F7B8CF", "#79B86A", "#2F7A55", "#E5484D", "#5B6270"];
  const rnd = rng(p.seed);
  for (let i = bookCols.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = bookCols[i]; bookCols[i] = bookCols[j]; bookCols[j] = t;
  }
  const pal = bookCols.slice(0, 5);
  let ci = Math.floor(rnd() * pal.length);
  const nextCol = () => { ci = (ci + 1 + Math.floor(rnd() * (pal.length - 1))) % pal.length; return pal[ci]; };
  const fillShelf = (a, b, place) => {
    let s = a;
    while (s < b - 0.12) {
      const c = nextCol();
      const n = 2 + Math.floor(rnd() * 3), h0 = 0.3 + rnd() * 0.07;
      for (let k = 0; k < n; k++) {
        const w = 0.11 + rnd() * 0.04;
        if (s + w > b) return;
        place(s, w, h0 - (k % 2) * 0.03, k % 2 ? shade(c, -0.15) : c);
        s += w + 0.012;
      }
      if (rnd() < 0.25 && s + 0.32 < b) {
        place(s + 0.02, 0.28, 0.34, nextCol()); // face-out cover
        s += 0.34;
      } else s += 0.05;
    }
  };

  // ---------- base and body
  box(x0 - 0.15, 0, z0 - 0.15, W + 0.3, 0.15, D + 0.3, "#BFC3CA"); // plinth
  box(x0, 0.15, z0, W, H, D, wallC);

  // painted shopfront wrapping the corner, pilasters and cornice
  box(x0, 0.15, z0 - 0.05, W, 2.85, 0.05, frontC);
  box(x0 - 0.05, 0.15, z0 - 0.05, 0.05, 2.85, 0.85, frontC); // corner return
  for (const [px, pw] of [[0, 0.25], [3.42, 0.2], [W - 0.25, 0.25]]) box(x0 + px, 0.15, z0 - 0.09, pw, 2.1, 0.04, frontDark);
  box(x0 - 0.09, 0.15, z0 - 0.09, 0.04, 2.1, 0.3, frontDark); // side corner pilaster
  box(x0 - 0.15, 3.0, z0 - 0.15, W + 0.2, 0.14, 0.15, frontDark);
  box(x0 - 0.15, 3.0, z0, 0.15, 0.14, 0.85, frontDark);

  // fascia: an open-book emblem flanked by two rows of chunky spines (a pictogram, no lettering)
  box(x0 + 0.15, 2.25, z0 - 0.09, W - 0.3, 0.75, 0.04, frontDark);
  const cx = x0 + W / 2;
  box(cx - 0.58, 2.33, z0 - 0.12, 1.16, 0.6, 0.03, iconC, L); // cover
  for (const side of [-1, 1]) {
    const px0 = side < 0 ? cx - 0.53 : cx + 0.03;
    box(px0, 2.38, z0 - 0.15, 0.5, 0.5, 0.03, cream, L); // page
    for (const ly of [2.5, 2.62, 2.74]) box(px0 + 0.08, ly, z0 - 0.17, 0.34, 0.045, 0.02, frontDark); // text lines
    // a row of spines on a little shelf
    const r0 = side < 0 ? x0 + 0.4 : cx + 0.78, r1 = side < 0 ? cx - 0.78 : x0 + W - 0.4;
    box(r0, 2.33, z0 - 0.12, r1 - r0, 0.05, 0.03, iconC, L);
    const hs = [0.48, 0.4, 0.52, 0.36, 0.46, 0.42];
    let sx = r0 + 0.04, k = 0;
    while (sx + 0.15 <= r1 - 0.02) {
      box(sx, 2.38, z0 - 0.12, 0.15, hs[k % hs.length], 0.03, k % 2 ? cream : iconC, L);
      sx += 0.2; k++;
    }
  }

  // front shop window: glass, sill, three shelves of books
  const wx = x0 + 0.35, ww = 3.0;
  box(wx, 0.55, z0 - 0.08, ww, 1.65, 0.03, win, L);
  box(wx - 0.1, 0.43, z0 - 0.16, ww + 0.2, 0.12, 0.11, frontDark);
  for (const sy of [0.6, 1.12, 1.64]) {
    box(wx + 0.05, sy, z0 - 0.14, ww - 0.1, 0.05, 0.06, wood);
    const by = sy + 0.05;
    fillShelf(wx + 0.12, wx + ww - 0.12, (s, w, h, c) => box(s, by, z0 - 0.13, w, h, 0.05, c));
  }

  // side shop window round the corner
  box(x0 - 0.03, 0.45, z0 + 1.15, 0.03, 1.8, 2.1, frontC); // painted surround
  box(x0 - 0.06, 0.6, z0 + 1.3, 0.03, 1.5, 1.8, win, L);
  box(x0 - 0.17, 0.45, z0 + 1.2, 0.14, 0.12, 2.0, frontDark); // sill
  for (const sy of [0.64, 1.36]) {
    box(x0 - 0.12, sy, z0 + 1.35, 0.06, 0.05, 1.7, wood);
    const by = sy + 0.05;
    fillShelf(z0 + 1.42, z0 + 3.0, (s, w, h, c) => box(x0 - 0.11, by, s, 0.05, h, w, c));
  }

  // door with a large glazed panel, handle and step
  const dx = x0 + W - 1.3;
  box(dx, 0.15, z0 - 0.09, 0.9, 2.1, 0.04, doorC);
  box(dx + 0.15, 1.0, z0 - 0.11, 0.6, 1.0, 0.02, win, L);
  box(dx + 0.72, 0.8, z0 - 0.12, 0.06, 0.18, 0.03, signC);
  box(dx - 0.1, 0, z0 - 0.45, 1.1, 0.15, 0.3, "#D9DCE1");

  // big hanging sign at the door corner: a framed board with a bold open book on both faces
  const sx = x0 + W - 0.32, zc = z0 - 0.9;
  box(sx - 0.05, 2.86, z0 - 0.19, 0.2, 0.24, 0.04, slate); // wall plate on the cornice
  box(sx + 0.02, 2.92, z0 - 1.6, 0.06, 0.07, 1.41, slate); // arm
  for (const cz of [zc - 0.5, zc + 0.47]) box(sx + 0.035, 2.82, cz, 0.03, 0.1, 0.03, slate); // hangers
  box(sx, 1.78, zc - 0.62, 0.1, 1.04, 1.24, frontDark); // frame
  for (const side of [-1, 1]) {
    const f = (k) => (side < 0 ? sx - 0.02 * k : sx + 0.1 + 0.02 * (k - 1));
    box(f(1), 1.85, zc - 0.55, 0.02, 0.9, 1.1, signC, L); // board face
    box(f(2), 2.0, zc - 0.44, 0.02, 0.6, 0.88, frontC); // cover
    box(f(3), 2.06, zc - 0.39, 0.02, 0.5, 0.37, cream); // left page
    box(f(3), 2.06, zc + 0.02, 0.02, 0.5, 0.37, cream); // right page
    for (const ly of [2.2, 2.34]) {
      box(f(4), ly, zc - 0.32, 0.02, 0.06, 0.24, frontDark);
      box(f(4), ly, zc + 0.08, 0.02, 0.06, 0.24, frontDark);
    }
  }

  // flats above: every window follows the lights toggle together
  for (let f = 1; f < floors; f++) {
    const y = GROUND + (f - 1) * FLOOR + 0.6;
    for (const fx of [0.5, 2.0, 3.5]) {
      box(x0 + fx, y, z0 - 0.04, 1, 1.2, 0.06, win, L);
      box(x0 + fx + 0.47, y, z0 - 0.06, 0.06, 1.2, 0.02, frontC); // mullion
      box(x0 + fx - 0.1, y - 0.1, z0 - 0.12, 1.2, 0.1, 0.12, frontC); // sill
    }
    box(x0 - 0.04, y, z0 + D / 2 - 0.5, 0.06, 1.2, 1, win, L);
    box(x0 - 0.06, y, z0 + D / 2 - 0.03, 0.02, 1.2, 0.06, frontC); // side mullion
    box(x0 - 0.12, y - 0.1, z0 + D / 2 - 0.6, 0.12, 0.1, 1.2, frontC); // side sill
  }

  // roof
  const top = 0.15 + H;
  if (p.roofStyle === "gable") {
    parts.push({ t: "gable", p: [x0 - 0.2, top, z0 - 0.2], s: [W + 0.4, 1.6, D + 0.4], c: roofC, axis: "x" });
    box(x0 + W - 1.3, top, z0 + 3.0, 0.5, 1.9, 0.5, shade(roofC, -0.22)); // chimney
    box(x0 + W - 1.36, top + 1.9, z0 + 2.94, 0.62, 0.12, 0.62, slate);
  } else {
    box(x0 - 0.1, top, z0 - 0.1, W + 0.2, 0.3, D + 0.2, roofC);
    box(x0 + 1.0, top + 0.3, z0 + 1.6, 1.6, 0.25, 1.4, "#D8DEE3"); // skylight over the reading room
    box(x0 + 1.1, top + 0.55, z0 + 1.7, 1.4, 0.05, 1.2, win, L);
  }

  return { parts };
}
