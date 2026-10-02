// Oasis block runtime: turns block parts (server/blocks.js) into three.js meshes. Shared by the Oasis app
// (public/world3d.js) and by every licensed module served from /cdn/<id>.mjs, so an imported asset is exactly the
// model you saw on the site. Needs "three" and "three/addons/" in the importing page's import map, the same
// convention three.js's own examples use.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

function gableGeometry(w, h, d, axis) {
  // A triangular prism: ridge along x (or z), base w x d, height h, origin at its min corner.
  const v = axis === "x"
    ? [[0, 0, 0], [w, 0, 0], [w, 0, d], [0, 0, d], [0, h, d / 2], [w, h, d / 2]]
    : [[0, 0, 0], [w, 0, 0], [w, 0, d], [0, 0, d], [w / 2, h, 0], [w / 2, h, d]];
  const tris = axis === "x"
    ? [[0, 1, 5], [0, 5, 4], [3, 4, 5], [3, 5, 2], [0, 4, 3], [1, 2, 5], [0, 3, 2], [0, 2, 1]]
    : [[0, 4, 1], [3, 2, 5], [0, 3, 5], [0, 5, 4], [1, 4, 5], [1, 5, 2], [0, 1, 2], [0, 2, 3]];
  const pos = [];
  for (const t of tris) for (const i of t) pos.push(...v[i]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function partGeometry(q) {
  let g;
  if (q.t === "box") {
    g = new THREE.BoxGeometry(q.s[0], q.s[1], q.s[2]);
    g.translate(q.p[0] + q.s[0] / 2, q.p[1] + q.s[1] / 2, q.p[2] + q.s[2] / 2);
  } else if (q.t === "gable") {
    g = gableGeometry(q.s[0], q.s[1], q.s[2], q.axis);
    g.translate(q.p[0], q.p[1], q.p[2]);
  } else if (q.t === "cyl") {
    g = new THREE.CylinderGeometry(q.r, q.r, q.h, q.n);
    g.translate(q.p[0], q.p[1] + q.h / 2, q.p[2]);
  } else {
    g = new THREE.ConeGeometry(q.r, q.h, q.n);
    g.translate(q.p[0], q.p[1] + q.h / 2, q.p[2]);
  }
  g = g.index ? g.toNonIndexed() : g;
  // Same attribute set on every part so they merge: flat-shaded colour needs only position and normal.
  for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

const materials = new Map();
function material(color, lit, night) {
  const key = color + (lit ? "L" : "") + (night ? "N" : "");
  if (!materials.has(key)) {
    materials.set(key, new THREE.MeshStandardMaterial({
      color, flatShading: true, roughness: 0.92, metalness: 0, side: THREE.DoubleSide,
      emissive: lit ? new THREE.Color("#FFC870") : new THREE.Color(0), emissiveIntensity: lit ? (night ? 1.25 : 0.25) : 0,
    }));
  }
  return materials.get(key);
}

/** Builds a Group from parts: one merged mesh per colour (lit parts kept separate so they can glow). */
export function partsToGroup(parts, { night = false } = {}) {
  const buckets = new Map();
  for (const q of parts) {
    const key = q.c + (q.e ? "L" : "");
    if (!buckets.has(key)) buckets.set(key, { c: q.c, e: !!q.e, geos: [] });
    buckets.get(key).geos.push(partGeometry(q));
  }
  const group = new THREE.Group();
  for (const b of buckets.values()) {
    const mesh = new THREE.Mesh(mergeGeometries(b.geos), material(b.c, b.e, night));
    mesh.castShadow = !b.e;
    mesh.receiveShadow = true;
    group.add(mesh);
    b.geos.forEach((g) => g.dispose());
  }
  return group;
}


/** Knob values: defaults, then the caller's overrides, clamped to each knob's range. */
export function resolveKnobs(params, input = {}) {
  const out = {};
  for (const [k, d] of Object.entries(params?.knobs || {})) {
    let v = input[k] ?? d.default;
    if (d.type === "range") v = Math.min(d.max, Math.max(d.min, Number(v)));
    else if (d.type === "toggle") v = !!v;
    else if (d.type === "choice" && !(d.options || []).includes(v)) v = d.default;
    else if (d.type === "color" && !/^#[0-9a-fA-F]{6}$/.test(String(v))) v = d.default;
    out[k] = v;
  }
  return out;
}
