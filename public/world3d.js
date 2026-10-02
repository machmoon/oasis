// Oasis 3D: turns block parts (server/blocks.js) into a live three.js scene. One renderer serves the asset viewer
// (a single model you orbit and reshape) and the world builder (many placed models). Geometry is merged per colour
// so a whole town stays a handful of draw calls. Lighting is a sky/ground hemisphere plus one shadow-casting sun,
// the usual three.js low-poly setup (see three.js examples/webgl_lights_hemisphere.html).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export { THREE };

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
  return g.toNonIndexed();
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

const SKY = { day: ["#E9F0F7", "#BFD3E6"], dusk: ["#F6D9C4", "#C9A6B8"], night: ["#1B2135", "#0E1222"] };

/** A viewer on a container element: orbit, soft shadows, day/dusk/night, resize-aware. */
export function createViewer(el, { time = "day", ground = true, autoRotate = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 2000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = 0.6;

  const hemi = new THREE.HemisphereLight("#ffffff", "#c9d2de", 2.2);
  const ambient = new THREE.AmbientLight("#ffffff", 0.55);
  scene.add(hemi, ambient);
  const sun = new THREE.DirectionalLight("#fff4e0", 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  let floor = null;
  if (ground) {
    floor = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.ShadowMaterial({ opacity: 0.18 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
  }

  let content = new THREE.Group();
  scene.add(content);
  let night = false;

  function setTime(t) {
    night = t === "night";
    const [top] = SKY[t] || SKY.day;
    scene.background = new THREE.Color(top);
    hemi.intensity = night ? 0.5 : t === "dusk" ? 1.5 : 2.2;
    ambient.intensity = night ? 0.12 : 0.55;
    hemi.color.set(night ? "#7d8fc4" : "#ffffff");
    sun.intensity = night ? 0.3 : t === "dusk" ? 1.7 : 2.1;
    sun.color.set(night ? "#9fb2ff" : t === "dusk" ? "#ffb98a" : "#fff4e0");
    content.traverse((o) => { if (o.isMesh && o.material.emissiveIntensity > 0) o.material.emissiveIntensity = night ? 1.25 : 0.25; });
  }
  setTime(time);

  function frame(box, { keepAngle = false } = {}) {
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.62 + 0.5;
    const dist = radius / Math.sin((camera.fov * Math.PI) / 360) * 1.05;
    if (!keepAngle) camera.position.set(center.x - dist * 0.62, center.y + dist * 0.55, center.z - dist * 0.58);
    controls.target.copy(center);
    camera.near = dist / 100; camera.far = dist * 20; camera.updateProjectionMatrix();
    const span = Math.max(size.x, size.z) + 4;
    sun.position.set(center.x - span * 0.6, center.y + span * 1.1, center.z - span * 0.35);
    sun.target.position.copy(center);
    const sc = sun.shadow.camera; sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.far = span * 4; sc.updateProjectionMatrix();
    if (floor) { floor.scale.setScalar(span * 1.2); floor.position.set(center.x, box.min.y + 0.001, center.z); }
    controls.minDistance = dist * 0.25; controls.maxDistance = dist * 3;
  }

  /** Replaces the scene contents with one model; reframes on first load or when asked. */
  function setParts(parts, { reframe = false } = {}) {
    const next = partsToGroup(parts, { night });
    scene.remove(content);
    content.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    content = next;
    scene.add(content);
    if (reframe || !setParts.framed) { frame(new THREE.Box3().setFromObject(content)); setParts.framed = true; }
  }

  /** Adds a placed model to the world and returns its Group (for selection, animation and removal). */
  function addPlaced(parts, { at = [0, 0, 0], rot = 0 } = {}) {
    const g = partsToGroup(parts, { night });
    g.position.set(...at);
    g.rotation.y = (-rot * Math.PI) / 180;
    content.add(g);
    return g;
  }
  function clearWorld() {
    content.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    content.clear();
  }

  const resize = () => {
    const w = el.clientWidth, h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();

  const tickers = new Set();
  let alive = true;
  (function loop(t) {
    if (!alive) return;
    if (!el.isConnected) { dispose(); return; }
    for (const f of tickers) f(t);
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })(0);
  function dispose() { alive = false; ro.disconnect(); controls.dispose(); renderer.dispose(); }

  /** GLB of whatever is on screen, as a Blob. */
  async function exportGlb() {
    const { GLTFExporter } = await import("three/addons/exporters/GLTFExporter.js");
    const buf = await new GLTFExporter().parseAsync(content, { binary: true });
    return new Blob([buf], { type: "model/gltf-binary" });
  }

  return { scene, camera, controls, renderer, setParts, addPlaced, clearWorld, setTime, frame: (b) => frame(b || new THREE.Box3().setFromObject(content)), tickers, exportGlb, dispose, get content() { return content; } };
}
