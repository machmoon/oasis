// GLB export for block assets and whole worlds, written with @gltf-transform/core (donmccurdy/glTF-Transform):
// one mesh primitive per colour, flat normals, a metallic-roughness material per colour, lights marked emissive.
// The triangulation matches public/world3d.js, so the file is the model you saw in the browser.
import { Document, NodeIO } from "@gltf-transform/core";

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

function tri(out, a, b, c) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const l = Math.hypot(...n) || 1; n = n.map((x) => x / l);
  out.pos.push(...a, ...b, ...c);
  out.nrm.push(...n, ...n, ...n);
}
const quad = (out, a, b, c, d) => { tri(out, a, b, c); tri(out, a, c, d); };

function partTris(q, out, tf) {
  const T = (x, y, z) => tf([x, y, z]);
  if (q.t === "box") {
    const [x, y, z] = q.p, [w, h, d] = q.s, X = x + w, Y = y + h, Z = z + d;
    quad(out, T(x, y, Z), T(X, y, Z), T(X, Y, Z), T(x, Y, Z));
    quad(out, T(X, y, z), T(x, y, z), T(x, Y, z), T(X, Y, z));
    quad(out, T(X, y, Z), T(X, y, z), T(X, Y, z), T(X, Y, Z));
    quad(out, T(x, y, z), T(x, y, Z), T(x, Y, Z), T(x, Y, z));
    quad(out, T(x, Y, Z), T(X, Y, Z), T(X, Y, z), T(x, Y, z));
    quad(out, T(x, y, z), T(X, y, z), T(X, y, Z), T(x, y, Z));
  } else if (q.t === "gable") {
    const [x, y, z] = q.p, [w, h, d] = q.s;
    if (q.axis === "x") {
      const m = z + d / 2;
      quad(out, T(x, y, z), T(x, y + h, m), T(x + w, y + h, m), T(x + w, y, z));
      quad(out, T(x, y, z + d), T(x + w, y, z + d), T(x + w, y + h, m), T(x, y + h, m));
      tri(out, T(x, y, z), T(x, y, z + d), T(x, y + h, m));
      tri(out, T(x + w, y, z), T(x + w, y + h, m), T(x + w, y, z + d));
    } else {
      const m = x + w / 2;
      quad(out, T(x, y, z), T(x, y, z + d), T(m, y + h, z + d), T(m, y + h, z));
      quad(out, T(x + w, y, z), T(m, y + h, z), T(m, y + h, z + d), T(x + w, y, z + d));
      tri(out, T(x, y, z), T(m, y + h, z), T(x + w, y, z));
      tri(out, T(x, y, z + d), T(x + w, y, z + d), T(m, y + h, z + d));
    }
  } else {
    const [cx, y, cz] = q.p, n = q.n, r = q.r, h = q.h;
    const ring = (yy) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, yy, cz + Math.sin(a) * r]; });
    const bot = ring(y);
    if (q.t === "cyl") {
      const top = ring(y + h);
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        quad(out, T(...bot[i]), T(...top[i]), T(...top[j]), T(...bot[j]));
        tri(out, T(cx, y + h, cz), T(...top[j]), T(...top[i]));
        tri(out, T(cx, y, cz), T(...bot[i]), T(...bot[j]));
      }
    } else {
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        tri(out, T(...bot[i]), T(cx, y + h, cz), T(...bot[j]));
        tri(out, T(cx, y, cz), T(...bot[i]), T(...bot[j]));
      }
    }
  }
}

/** items: [{ parts, at?: [x, y, z], rot?: degrees }]. Returns a GLB as a Buffer. */
export async function toGlb(items, { name = "oasis" } = {}) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene(name);
  const byColour = new Map();
  for (const { parts, at = [0, 0, 0], rot = 0 } of items) {
    const a = (-rot * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const tf = ([x, y, z]) => [x * c + z * s + at[0], y + at[1], -x * s + z * c + at[2]];
    for (const q of parts) {
      const key = q.c + (q.e ? "L" : "");
      if (!byColour.has(key)) byColour.set(key, { c: q.c, e: !!q.e, pos: [], nrm: [] });
      partTris(q, byColour.get(key), tf);
    }
  }
  const mesh = doc.createMesh(name);
  for (const b of byColour.values()) {
    const rgb = hexRgb(b.c).map(srgbToLinear);
    const mat = doc.createMaterial(b.c).setBaseColorFactor([...rgb, 1]).setRoughnessFactor(0.9).setMetallicFactor(0);
    if (b.e) mat.setEmissiveFactor(rgb);
    const prim = doc.createPrimitive()
      .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(b.pos)).setBuffer(buffer))
      .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(b.nrm)).setBuffer(buffer))
      .setMaterial(mat);
    mesh.addPrimitive(prim);
  }
  scene.addChild(doc.createNode(name).setMesh(mesh));
  return Buffer.from(await new NodeIO().writeBinary(doc));
}
