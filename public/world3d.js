// Oasis 3D: turns block parts (server/blocks.js) into a live three.js scene. One renderer serves the asset viewer
// (a single model you orbit and reshape) and the world builder (many placed models). Geometry is merged per colour
// so a whole town stays a handful of draw calls. Lighting is a sky/ground hemisphere plus one shadow-casting sun,
// the usual three.js low-poly setup (see three.js examples/webgl_lights_hemisphere.html).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export { THREE };

import { partsToGroup } from "./blocks-runtime.js";
export { partsToGroup };

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
    hemi.intensity = night ? 0.95 : t === "dusk" ? 1.5 : 2.2;
    ambient.intensity = night ? 0.35 : 0.55;
    hemi.color.set(night ? "#7d8fc4" : "#ffffff");
    sun.intensity = night ? 0.3 : t === "dusk" ? 1.7 : 2.1;
    sun.color.set(night ? "#9fb2ff" : t === "dusk" ? "#ffb98a" : "#fff4e0");
    content.traverse((o) => { if (o.isMesh && o.material.emissiveIntensity > 0) o.material.emissiveIntensity = night ? 1.25 : 0.25; });
  }
  setTime(time);

  function frame(box, { keepAngle = false, fit = 1, shift = 0 } = {}) {
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.62 + 0.5;
    const dist = (radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.05 * fit;
    // shift: move the subject left (-) or right (+) on screen, as a fraction of its size, to clear side panels
    const target = center.clone().add(new THREE.Vector3(1, 0, -1).normalize().multiplyScalar(-shift * radius));
    if (!keepAngle) camera.position.set(target.x - dist * 0.6, target.y + dist * 0.68, target.z - dist * 0.42);
    else camera.position.copy(target).add(camera.position.clone().sub(controls.target).normalize().multiplyScalar(dist));
    controls.target.copy(target);
    camera.near = dist / 100; camera.far = dist * 20; camera.updateProjectionMatrix();
    const span = Math.max(size.x, size.z) + 4;
    sun.position.set(center.x - span * 0.6, center.y + span * 1.1, center.z - span * 0.35);
    sun.target.position.copy(center);
    const sc = sun.shadow.camera; sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.far = span * 4; sc.updateProjectionMatrix();
    if (floor) { floor.scale.setScalar(span * 1.2); floor.position.set(center.x, box.min.y + 0.001, center.z); }
    controls.minDistance = dist * 0.25; controls.maxDistance = dist * 3;
  }

  /**
   * Pulls the camera back along its current direction until every corner of `box` projects inside `rect`
   * (fractions of the canvas: [left, top, right, bottom]); a binary search on distance, measured not guessed.
   */
  function fitToRect(box, rect = [0.05, 0.05, 0.95, 0.95]) {
    const center = box.getCenter(new THREE.Vector3());
    const dir = camera.position.clone().sub(controls.target).normalize();
    controls.target.copy(center);
    const corners = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
    const fits = (d) => {
      camera.position.copy(center).addScaledVector(dir, d);
      camera.lookAt(center); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
      return corners.every((c) => { const p = c.clone().project(camera); const sx = (p.x + 1) / 2, sy = (1 - p.y) / 2; return sx >= rect[0] && sx <= rect[2] && sy >= rect[1] && sy <= rect[3]; });
    };
    let lo = 1, hi = 2000;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
    fits(hi);
    controls.minDistance = hi * 0.25; controls.maxDistance = hi * 3;
  }

  /** Replaces the scene contents with one model; reframes on first load or when asked. */
  function setParts(parts, { reframe = false, lock = false } = {}) {
    const next = partsToGroup(parts, { night });
    scene.remove(content);
    content.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    content = next;
    scene.add(content);
    if (wire) setWireframe(true);
    const box = new THREE.Box3().setFromObject(content), size = box.getSize(new THREE.Vector3()).length();
    if (reframe || !setParts.framed) { frame(box); setParts.framed = true; setParts.size = size; }
    else if (!lock && size > setParts.size * 1.2 || size < setParts.size * 0.6) { frame(box, { keepAngle: true }); setParts.size = size; }
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

  // offsetX shifts the rendered centre left (+) so a subject stays centred in the space side panels leave free
  let offsetX = 0;
  const resize = () => {
    const w = el.clientWidth, h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (offsetX) camera.setViewOffset(w, h, offsetX, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
  const setOffset = (px) => { offsetX = px; resize(); };
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

  // Picking: the placed model (a direct child of the world group) under the pointer.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(content.children, true)[0];
    let o = hit?.object;
    while (o && o.parent !== content) o = o.parent;
    return o || null;
  }
  let outline = null;
  function select(g) {
    if (outline) { scene.remove(outline); outline.geometry.dispose(); outline = null; }
    if (!g) return;
    outline = new THREE.BoxHelper(g, "#E5484D");
    scene.add(outline);
  }
  function refreshSelection() { outline?.update(); }

  /** Drops a placed model in from above with a small bounce, after `delay` ms. */
  function dropIn(g, delay = 0) {
    const y0 = g.position.y, start = performance.now() + delay, dur = 650;
    g.position.y = y0 + 14; g.visible = false;
    const f = (t) => {
      const k = (t - start) / dur;
      if (k < 0) return;
      g.visible = true;
      if (k >= 1) { g.position.y = y0; tickers.delete(f); return; }
      const e = k < 0.7 ? Math.pow(k / 0.7, 2) : 1 - Math.sin(((k - 0.7) / 0.3) * Math.PI) * 0.08;
      g.position.y = y0 + 14 * (1 - Math.min(1, e));
    };
    tickers.add(f);
  }

  let wire = false;
  function setWireframe(on) { wire = on; content.traverse((o) => { if (o.isMesh) o.material.wireframe = on; }); }
  function stats() {
    let tris = 0;
    content.traverse((o) => { if (o.isMesh) tris += o.geometry.attributes.position.count / 3; });
    return { tris: Math.round(tris) };
  }

  /** GLB of whatever is on screen, as a Blob. */
  async function exportGlb() {
    const { GLTFExporter } = await import("three/addons/exporters/GLTFExporter.js");
    const buf = await new GLTFExporter().parseAsync(content, { binary: true });
    return new Blob([buf], { type: "model/gltf-binary" });
  }

  return { scene, camera, controls, renderer, setParts, addPlaced, clearWorld, setTime, pick, select, refreshSelection, dropIn, setWireframe, stats, setOffset, fitToRect, frame: (b, o) => frame(b || new THREE.Box3().setFromObject(content), o), tickers, exportGlb, dispose, get content() { return content; } };
}
