// The film player: frame N of a film is a pure function of the film, like a Remotion composition
// (remotion-dev/remotion, packages/three/src/ThreeCanvas.tsx advances the three.js frame loop by hand per frame
// instead of letting it run on the clock). The Studio plays it live on a clock; the render page
// (film.html) seeks it frame by frame and hands JPEGs to ffmpeg. Both draw the same composite: the WebGL scene,
// then the cards, the grade, the fades and the preview label on a 2D canvas.
//
// Camera moves follow the three.js spline-camera example (examples/webgl_geometry_extrude_splines.html: position
// from a curve at t, lookAt a point ahead), reduced to the four moves a street film needs: orbit, dolly, push, crane.
// Weather is a Points cloud whose positions are a function of time and seed, as in examples/webgl_points_sprites.html,
// so it never drifts between the preview and the render.
import * as THREE from "three";
import { partsToGroup } from "./blocks-runtime.js";
import { createFinish, curve, shakeAt, transitionAt, makeTitle, titlePose, seedOf, STYLES, patchLook, dropOrder } from "./film-fx.js";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";

// One display face for every word the film sets itself: Anton (SIL OFL, public/fonts/Anton-OFL.txt) for the 3D
// title, the end card's name and the knob readout; Source Sans 3 for the small lines. Loaded here so the Studio and
// the render page draw the same glyphs without either page having to know.
let displayFont = null;
export function loadDisplayFont() {
  return (displayFont ||= (async () => {
    try {
      if (!("FontFace" in window)) return false;
      const f = new FontFace("Anton", "url(/fonts/Anton-Regular.ttf)");
      await f.load();
      document.fonts.add(f);
      return true;
    } catch { return false; }
  })());
}
const DISPLAY = '"Anton", "Source Sans 3", system-ui, sans-serif';
const TEXT = '"Source Sans 3", system-ui, sans-serif';
// the kit's own lawn colours (town-plaza's grass by season), so the ground and the lawns are one green
const GROUND = { kyoto: "#AFC793", seaside: "#E6D8B4", winter: "#EEF2F6", autumn: "#C9B58E", candy: "#BFD9A8", sf: "#AFC793", town: "#AFC793" };

// Unlicensed paid pieces render in clay, the way a 3D tool shows a model before its materials: the set reads as a
// set, and licensing the film is what paints it.
const GREY = "#DADCE0";
const CLAY_EDGE = new THREE.LineBasicMaterial({ color: "#5C6270", transparent: true, opacity: 0.55 });
const ease = (k) => k * k * (3 - 2 * k); // smoothstep: cameras start and stop softly
const deg = (d) => (d * Math.PI) / 180;
const lerp = (a, b, k) => a + (b - a) * k;
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const hash = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// Light is one scalar, "dark" from 0 (day) to 1 (night), and every lighting value is read off these keyframes, so a
// shot can fade from dusk to night and the windows and signs come on as it does.
const LIGHT = {
  // a warm key (the sun) against a cool fill (the hemisphere) at dusk, and a sky that runs from the horizon colour up
  day: { dark: 0, sky: "#DCE9F5", top: "#5E95D6", hemi: 1.5, hemiColor: "#ffffff", ambient: 0.22, sun: 3.0, sunColor: "#fff4e0", glow: 0.25, sign: 0 },
  dusk: { dark: 0.5, sky: "#F4B98C", top: "#4A5C9A", hemi: 1.15, hemiColor: "#A9BCE8", ambient: 0.16, sun: 2.8, sunColor: "#ffad72", glow: 0.7, sign: 0.35 },
  night: { dark: 1, sky: "#2A3462", top: "#070B1E", hemi: 0.95, hemiColor: "#7d8fc4", ambient: 0.35, sun: 0.3, sunColor: "#9fb2ff", glow: 1.25, sign: 0.42 },
};
const MOVERS = { "town-tram": { speed: 3.2, along: "x", bounce: true }, "town-hatchback": { speed: 5.5, along: "x", bounce: false } };
const WEATHER = {
  blossom: { n: 900, color: "#F7A8C4", size: 0.22, fall: 0.9, drift: 1.1, sway: 0.6 },
  leaves: { n: 90, color: "#C9432A", size: 0.34, fall: 0.9, drift: 1.3, sway: 1.1 },
  snow: { n: 1600, color: "#FFFFFF", size: 0.16, fall: 1.4, drift: 0.5, sway: 0.4 },
  rain: { n: 2600, color: "#B9CCE6", size: 0.08, fall: 14, drift: 1.5, sway: 0 },
};

/** Builds a film into `el` (sized to the film's aspect). Resolves to a player once every texture is loaded. */
export async function createFilmPlayer(el, film, { api = "", audio = false, reveal = false } = {}) {
  const W = film.size[0], H = film.size[1];
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // the finish runs in linear HDR, so a film tone curve maps it back, as three's OutputPass expects
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  const out = document.createElement("canvas"); // the composite the viewer sees and the recorder captures
  out.width = W; out.height = H;
  out.style.cssText = "display:block;width:100%;height:100%";
  el.appendChild(out);
  const ctx = out.getContext("2d");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 600);
  const hemi = new THREE.HemisphereLight("#ffffff", "#8c8579", 1.5); // a darker ground bounce keeps the clay readable
  const ambient = new THREE.AmbientLight("#ffffff", 0.55);
  const sun = new THREE.DirectionalLight("#fff4e0", 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(hemi, ambient, sun, sun.target);
  const world = new THREE.Group();
  scene.add(world);
  // the sky: a gradient dome, as in three's examples/webgl_lights_hemisphere.html (horizon colour to zenith colour)
  const skyU = { topColor: { value: new THREE.Color() }, bottomColor: { value: new THREE.Color() }, offset: { value: 12 }, exponent: { value: 0.7 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 15), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false,
    vertexShader: "varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vW; void main() { float h = normalize(vW + offset).y; gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0); }",
  }));
  sky.frustumCulled = false;
  scene.add(sky);
  await loadDisplayFont();
  const edit = film.edit || { style: "clean" };
  const b = film.brand || {};
  const palette = [...new Set([b.background, b.ink, b.primary, b.secondary, b.highlight, b.surface, b.muted].filter(Boolean))];
  const finish = createFinish(renderer, scene, camera, W, H, edit.style, { look: edit.look || "none", palette, ink: b.ink });
  const seed = seedOf(film);
  const dress = (g) => g.traverse((o) => { if (o.isMesh) patchLook(o.material, edit.look); });

  // the set: every placement, grey when its piece is paid and the film is not licensed; movers remember their rest
  const paid = new Set(film.bill.lines.filter((l) => l.price > 0).map((l) => l.asset));
  // clay: k = 1 is the unlicensed model sheet, k = 0 the piece in its real colours
  const clay = [], clayGrey = new THREE.Color(GREY);
  const flashColour = new THREE.Color("#FFE7B8");
  function setClay(entry, k, flash = 0) {
    entry.k = k;
    for (const c of entry.mats) {
      c.m.color.copy(c.color).lerp(clayGrey, k);
      c.m.emissive.copy(c.emissive).multiplyScalar(1 - k);
      if (flash > 0) c.m.emissive.lerp(flashColour, flash);
      c.m.emissiveIntensity = flash > 0 ? Math.max(c.ei, 0.9 * flash) : k >= 1 ? 0 : c.ei; // setLight drives the glow of anything left emissive
      c.m.roughness = c.rough + (0.85 - c.rough) * k; c.m.metalness = c.metal * (1 - k);
    }
    for (const e of entry.edges) { e.material.opacity = 0.55 * k; e.visible = k > 0.01; }
  }
  const [Wm, Dm] = film.world.size;
  const movers = [], groups = [];
  /** A kit piece as the player shows it: clay until licensed (with drawn edges, like a model sheet), in the film's look. */
  function piece(parts, at, rot) {
    const g = partsToGroup(parts);
    g.position.set(...at);
    g.rotation.y = -deg(rot);
    if (!film.licensed || reveal) { // in preview the whole set is clay; the licence paints the street
      // Each paid material keeps its real colour so licensing can paint it back in (sweep()).
      const entry = { g, mats: [], edges: [], d: 0 };
      g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); entry.mats.push({ m: o.material, color: o.material.color.clone(), emissive: o.material.emissive.clone(), ei: o.material.emissiveIntensity, rough: o.material.roughness, metal: o.material.metalness }); } });
      g.traverse((o) => { if (o.isMesh) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 25), CLAY_EDGE.clone()); e.position.copy(o.position); e.quaternion.copy(o.quaternion); e.scale.copy(o.scale); o.parent.add(e); entry.edges.push(e); } });
      clay.push(entry);
      setClay(entry, 1);
      g.userData.clay = entry;
    }
    dress(g);
    world.add(g);
    return g;
  }
  // the street assembles during the first shot: each placement drops in, lands as its stock program (default
  // knobs) and rebuilds into its remix. The stock piece is a second group, shown only while it lands.
  const buildShot = film.shots[0]?.build ? film.shots[0] : null;
  const drops = []; // { g, stock, y, at (0..1 of the build window) }
  for (const p of film.placements) {
    const g = piece(film.parts[p.part], p.at, p.rot);
    groups.push(g);
    if (buildShot) {
      const stock = p.stock !== undefined ? piece(film.parts[p.stock], p.at, p.rot) : null;
      if (stock) stock.visible = false;
      drops.push({ g, stock, y: p.at[1], at: dropOrder(p, Wm), land: false });
    }
    const m = MOVERS[p.asset];
    if (m) {
      const box = new THREE.Box3().setFromObject(g), len = box.max.x - box.min.x;
      movers.push({ g, x0: p.at[0], dir: p.rot === 180 ? -1 : 1, len, phase: (hash(p.id) >>> 0) % 1000 / 1000, ...m });
    }
  }
  // a rebuild shot: every step of the knob walk is its own group, swapped in on its beat (stage() below)
  const rebuilds = {};
  for (const [shotId, r] of Object.entries(film.rebuilds || {})) {
    const k = film.placements.findIndex((p) => p.id === r.placement);
    if (k < 0) continue;
    const p = film.placements[k];
    const steps = r.steps.map((st) => { const g = piece(film.parts[st.part], p.at, p.rot); g.visible = false; return { ...st, g }; });
    rebuilds[shotId] = { ...r, g: groups[k], steps, placement: p };
  }

  // the ground the street sits in, after Polyfork's terrain that joins (polyfork.dev/blog/terrain-that-joins): a
  // base height every chunk would agree on, times a skirt weight that is zero on the street's own slab (their level
  // clearing) and rises to one past its edge, so the kit's flat grid and the hills are one surface with no seam.
  // Studio dressing, like the sky: free, never clay, in the theme's ground colour.
  {
    const M = 80, pitch = 1.5, cols = Math.ceil((Wm + 2 * M) / pitch), rows = Math.ceil((Dm + 2 * M) / pitch);
    const geo = new THREE.PlaneGeometry(cols * pitch, rows * pitch, cols, rows);
    geo.rotateX(-Math.PI / 2);
    const n = new ImprovedNoise(), s = (seed % 97) * 1.37, pos = geo.attributes.position;
    const base = (x, z) => 3.2 * n.noise(x * 0.028 + s, z * 0.028, 0.5) + 1.2 * n.noise(x * 0.09, z * 0.09 + s, 2.5);
    const skirt = (x, z) => { const dx = Math.max(-2 - x, x - (Wm + 2), 0), dz = Math.max(-2 - z, z - (Dm + 2), 0); const d = Math.hypot(dx, dz); const w = Math.min(1, d / 14); return w * w * (3 - 2 * w); };
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + Wm / 2, z = pos.getZ(i) + Dm / 2, w = skirt(x, z);
      const far = Math.min(1, Math.max(0, (Math.hypot(Math.max(-x, x - Wm, 0), Math.max(-z, z - Dm, 0)) - 20) / 50));
      pos.setXYZ(i, x, w * (1.2 + Math.max(0, base(x, z)) * (1 + 1.6 * far)) - 0.05, z);
    }
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: GROUND[film.world.theme] || GROUND.town, roughness: 0.95, flatShading: true }));
    ground.receiveShadow = true;
    dress(ground);
    scene.add(ground);
  }
  const box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(Wm, 8, Dm));
  const centre = box.getCenter(new THREE.Vector3());
  const span = Math.max(Wm, Dm) + 6;
  sun.position.set(centre.x - span * 0.75, span * 0.62, centre.z - span * 0.4); // a low sun: long shadows give the blocks depth
  sun.target.position.copy(centre);
  Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, far: span * 4 });
  sun.shadow.camera.updateProjectionMatrix();

  // set dressing for a Kyoto street: paper lanterns strung along both pavements, lit at night. They belong to the Studio,
  // not to any creator, so they are free and never clay. Warm practicals give the dusk and night shots their light.
  const lanterns = [];
  if (film.world.theme === "kyoto") {
    const paper = new THREE.MeshStandardMaterial({ color: "#E8402F", roughness: 0.6, emissive: new THREE.Color("#FF8A4C"), emissiveIntensity: 0.15 });
    const cap = new THREE.MeshStandardMaterial({ color: "#1E1E22", roughness: 0.7 });
    const cord = new THREE.LineBasicMaterial({ color: "#2A2A30" });
    const body = new THREE.CylinderGeometry(0.24, 0.24, 0.46, 12), capG = new THREE.CylinderGeometry(0.17, 0.17, 0.06, 10);
    for (const z of [2 * 6 + 0.35, 3 * 6 - 0.35]) {
      const pts = [];
      for (let x = 1.5; x < Wm - 1; x += 2.6) {
        const l = new THREE.Group();
        const b = new THREE.Mesh(body, paper); b.castShadow = true;
        const t = new THREE.Mesh(capG, cap); t.position.y = 0.26;
        const u = new THREE.Mesh(capG, cap); u.position.y = -0.26;
        l.add(b, t, u); l.position.set(x, 3.25 - 0.18 * Math.sin((x / 2.6) * 1.3), z);
        world.add(l); lanterns.push(l); pts.push(new THREE.Vector3(x, l.position.y + 0.3, z));
        if (!film.licensed || reveal) { const entry = { g: l, mats: [], edges: [], d: 0 }; l.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); entry.mats.push({ m: o.material, color: o.material.color.clone(), emissive: o.material.emissive.clone(), ei: o.material.emissiveIntensity, rough: o.material.roughness, metal: o.material.metalness }); } }); clay.push(entry); setClay(entry, 1); }
        dress(l);
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cord);
      world.add(line); lanterns.push(line);
    }
    // the paper's emissive is lifted by setLight with the windows: faint by day, glowing by night
  }

  // signs: a 2D asset as a board on posts, lit at night like a shop sign
  const loader = new THREE.TextureLoader();
  const tex = (url) => new Promise((res, rej) => loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); res(t); }, undefined, rej));
  const signMats = [];
  await Promise.all(film.signs.map(async (s) => {
    const t = await tex(`${api}/api/films/${film.id}/art/${s.id}.png?w=1024`).catch(() => null);
    if (!t) return;
    const m = s.mount, g = new THREE.Group();
    g.position.set(...m.at);
    g.rotation.y = m.rot === 180 ? 0 : Math.PI;
    const mat = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0, roughness: 0.7, metalness: 0 });
    signMats.push(mat);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(m.w, m.h), mat);
    face.position.set(0, m.post + m.h / 2, 0.035);
    face.castShadow = true;
    const dark = new THREE.MeshStandardMaterial({ color: "#2B2F38", roughness: 0.9 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(m.w + 0.12, m.h + 0.12, 0.06), dark);
    back.position.set(0, m.post + m.h / 2, 0);
    back.castShadow = true;
    g.add(face, back);
    if (m.post > 0) for (const x of [-(m.w / 2 - 0.2), m.w / 2 - 0.2]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, m.post + 0.1, 0.1), dark);
      post.position.set(x, m.post / 2, 0);
      g.add(post);
    }
    dress(g);
    world.add(g);
    groups.push(g);
    g.userData.sign = s; // a roof sign rides its building's roofline through a rebuild
    if (buildShot) drops.push({ g, stock: null, y: m.at[1], at: 0.96, land: false }); // signs hang last
  }));
  const cards = {};
  await Promise.all(film.shots.filter((s) => s.card).map(async (s) => {
    const img = new Image();
    img.src = `${api}/api/films/${film.id}/art/card-${s.id}.png?w=1280`;
    await img.decode().catch(() => null);
    cards[s.id] = img;
  }));

  // pieces that would stand between the title camera and the word: hidden for that shot only, as a set is cheated
  const cheat = [];
  if (film.titleMount?.clearSet) {
    const tm = film.titleMount, d = tm.dir || 1;
    film.placements.forEach((p, k) => {
      if (!["town-torii", "town-stall"].includes(p.asset)) return;
      const x = p.at[0] - (p.rot === 180 ? 6 : 0) + 2;
      if (d > 0 ? x > tm.at[0] - 15 && x < tm.at[0] + 1 : x < tm.at[0] + 15 && x > tm.at[0] - 1) cheat.push(groups[k]);
    });
  }

  // the 3D title: the brand's name as extruded type, dropped into the street in front of the hero during its shot
  let title = null;
  const titleShot = film.shots.findIndex((x) => x.title);
  if (titleShot >= 0 && film.titleMount) {
    try {
      const tm = film.titleMount, spec = film.shots[titleShot].title;
      // the title wears the brand's highlight, unless that is a red the street already uses (awnings, the torii),
      // in which case it goes gold so the word separates from the set
      const isRed = (hex) => { const hsl = {}; new THREE.Color(hex).getHSL(hsl); return hsl.s > 0.35 && (hsl.h < 0.06 || hsl.h > 0.94); };
      const hi = film.brand?.highlight;
      const face = hi && !isRed(hi) && new THREE.Color(hi).getHSL({}).l > 0.35 ? hi : "#F2B33D";
      title = await makeTitle(String(spec.text || "").slice(0, 18), { color: face, side: film.brand?.ink, size: tm.size });
      const fit = Math.min(1, tm.maxWidth / Math.max(0.1, title.userData.width));
      title.scale.setScalar(fit);
      title.position.set(...tm.at);
      title.rotation.order = "YXZ";
      title.rotation.y = tm.face === "-x" ? -Math.PI / 2 : tm.face === "+x" ? Math.PI / 2 : tm.rot === 180 ? 0 : Math.PI;
      const blob = document.createElement("canvas"); blob.width = blob.height = 128;
      const bg = blob.getContext("2d"), rg = bg.createRadialGradient(64, 64, 4, 64, 64, 64);
      rg.addColorStop(0, "rgba(0,0,0,0.7)"); rg.addColorStop(1, "rgba(0,0,0,0)"); bg.fillStyle = rg; bg.fillRect(0, 0, 128, 128);
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blob), transparent: true, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.set(tm.at[0], 0.16, tm.at[2]); shadow.renderOrder = 2;
      shadow.scale.set(2.2, title.userData.width * fit * 1.15, 1); // the word runs along z once it faces down the street
      shadow.visible = false; scene.add(shadow); title.userData.shadow = shadow;
      // the slam's weight: a shock ring that runs out across the road and a dust disc that rises and thins
      const ringMat = new THREE.MeshBasicMaterial({ color: "#FFF3DC", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), ringMat);
      ring.rotation.x = -Math.PI / 2; ring.position.set(tm.at[0], 0.14, tm.at[2]); ring.renderOrder = 3; ring.visible = false;
      const dust = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadow.material.map, color: "#E8DCC8", transparent: true, opacity: 0, depthWrite: false }));
      dust.rotation.x = -Math.PI / 2; dust.position.set(tm.at[0], 0.18, tm.at[2]); dust.renderOrder = 3; dust.visible = false;
      scene.add(ring, dust); title.userData.ring = ring; title.userData.dust = dust;
      dress(title);
      title.visible = false;
      title.userData.base = tm.at[1];
      title.userData.fit = fit;
      if (!film.licensed && tm.paid) title.userData.face.color.set(GREY), title.userData.face.emissiveIntensity = 0;
      scene.add(title);
      // a rim light from behind and above, so the extrusion's edges catch light against the street
      const rim = new THREE.DirectionalLight("#fff1d6", 0);
      rim.position.set(tm.at[0] + 8 * (tm.dir || 1), 9, tm.at[2] + 3); rim.target = title;
      scene.add(rim); title.userData.rim = rim;
    } catch { title = null; }
  }

  // weather: one Points cloud, every position a function of (time, seed)
  let weather = null;
  if (WEATHER[film.weather]) {
    const spec = WEATHER[film.weather], r = rng(hash(film.id || film.brief));
    const seeds = Float32Array.from({ length: spec.n * 4 }, () => r());
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(spec.n * 3), 3));
    // a soft round sprite per particle, as examples/webgl_points_sprites.html textures its snowflakes
    const disc = document.createElement("canvas"); disc.width = disc.height = 64;
    const dg = disc.getContext("2d");
    if (film.weather === "leaves") {
      // a maple leaf: seven lobes on a polar curve, with a stem, so falling leaves read as leaves and not as dots
      dg.fillStyle = "#fff"; dg.beginPath();
      for (let k = 0; k <= 140; k++) {
        const a = (k / 140) * Math.PI * 2, lobe = 0.62 + 0.38 * Math.pow(Math.abs(Math.cos(a * 3.5)), 0.6), top = 0.75 + 0.25 * Math.max(0, -Math.sin(a));
        const r = 27 * lobe * top;
        dg.lineTo(32 + Math.cos(a) * r, 30 + Math.sin(a) * r);
      }
      dg.closePath(); dg.fill(); dg.fillRect(31, 36, 2.5, 26);
    } else {
      const grad = dg.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.55, "rgba(255,255,255,0.9)"); grad.addColorStop(1, "rgba(255,255,255,0)");
      dg.fillStyle = grad; dg.fillRect(0, 0, 64, 64);
    }
    const mat = new THREE.PointsMaterial({ color: spec.color, map: new THREE.CanvasTexture(disc), size: spec.size * 1.6, sizeAttenuation: true, transparent: true, opacity: film.weather === "rain" ? 0.55 : 0.9, depthWrite: false, alphaTest: 0.02 });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    const top = 16, margin = 10;
    weather = (t) => {
      const a = geo.attributes.position.array;
      for (let i = 0; i < spec.n; i++) {
        const s0 = seeds[i * 4], s1 = seeds[i * 4 + 1], s2 = seeds[i * 4 + 2], s3 = seeds[i * 4 + 3];
        const fall = spec.fall * (0.7 + s3 * 0.6);
        const y = top - ((s1 * top + t * fall) % top);
        const x = ((s0 * (Wm + 2 * margin) + t * spec.drift * (0.5 + s2)) % (Wm + 2 * margin)) - margin + Math.sin(t * 1.3 + s2 * 6.28) * spec.sway;
        const z = ((s2 * (Dm + 2 * margin) + Math.sin(t * 0.7 + s0 * 6.28) * spec.sway) % (Dm + 2 * margin)) - margin;
        // no particle within 3.5 m of the lens: up close a petal is a blob in the middle of the frame
        const cx = x - camera.position.x, cy = y - camera.position.y, cz = z - camera.position.z;
        a[i * 3] = x; a[i * 3 + 1] = cx * cx + cy * cy + cz * cz < 12.25 ? -60 : y; a[i * 3 + 2] = z;
      }
      geo.attributes.position.needsUpdate = true;
    };
  }

  // light as a continuous value between the keyframes
  const skyA = new THREE.Color(), skyB = new THREE.Color(), tmp = new THREE.Color(), fogWhite = new THREE.Color("#E6EAEE");
  function setLight(from, to, k) {
    const A = LIGHT[from] || LIGHT.day, B = LIGHT[to || from] || A;
    const mix = (key) => lerp(A[key], B[key], k);
    scene.background = null;
    skyU.bottomColor.value.set(A.sky).lerp(skyB.set(B.sky), k); // in RGB: three's lerpHSL walks the hue wheel, so dusk orange to night blue passed through green
    // atmospheric depth: the far end of the street fades toward the horizon colour
    if (!scene.fog) scene.fog = new THREE.Fog(skyU.bottomColor.value.clone(), 30, 140);
    scene.fog.color.copy(skyU.bottomColor.value);
    if (film.weather === "fog") scene.fog.color.lerp(fogWhite, 0.7); // Karl the Fog is white, whatever the hour
    skyU.topColor.value.set(A.top).lerp(skyB.set(B.top), k);
    hemi.intensity = mix("hemi"); ambient.intensity = mix("ambient"); sun.intensity = mix("sun");
    hemi.color.set(A.hemiColor).lerp(skyB.set(B.hemiColor), k);
    sun.color.set(A.sunColor).lerp(skyB.set(B.sunColor), k);
    const glow = mix("glow"), sign = mix("sign");
    world.traverse((o) => { if (o.isMesh && o.material.emissiveIntensity > 0 && !signMats.includes(o.material)) o.material.emissiveIntensity = glow; });
    for (const m of signMats) m.emissiveIntensity = sign;
    return mix("dark");
  }

  // the cut: where each shot starts
  // the cut: where each shot starts. Recomputed by setCut() when the Studio edits a shot, without rebuilding the set.
  const starts = [];
  let duration = 0;
  function timeline() {
    starts.length = 0;
    let acc = 0;
    for (const s of film.shots) { starts.push(acc); acc += s.seconds; }
    duration = acc;
  }
  timeline();
  function shotAt(t) {
    let i = film.shots.length - 1;
    while (i > 0 && t < starts[i]) i--;
    const s = film.shots[i];
    return { i, shot: s, local: Math.min(1, Math.max(0, (t - starts[i]) / s.seconds)), start: starts[i] };
  }

  /** Puts the camera where shot `s` has it at progress k (0..1), on the shot's speed ramp. Returns the focus distance. */
  function pose(s, k) {
    const e = curve(s.ramp || "smooth")(k);
    if (camera.fov !== s.fov) { camera.fov = s.fov; camera.updateProjectionMatrix(); }
    if (s.kind === "dolly") {
      camera.position.copy(v3(s.from).lerp(v3(s.to), e));
      const L = v3(s.look);
      camera.lookAt(L);
      return Math.min(40, camera.position.distanceTo(L) * 0.55);
    }
    const T = v3(s.target);
    const radius = lerp(s.radius[0], s.radius[1], e), height = lerp(s.height[0], s.height[1], e);
    const az = s.kind === "orbit" ? lerp(s.from, s.to, s.ramp ? e : k) : s.azimuth; // an orbit keeps a steady pace unless ramped
    camera.position.set(T.x + radius * Math.sin(deg(az)), T.y + height, T.z + radius * Math.cos(deg(az)));
    camera.lookAt(T);
    return camera.position.distanceTo(T);
  }

  /** Movers at second t: the tram shuttles its rails, cars drive their lane and wrap round. */
  function move(t) {
    for (const m of movers) {
      if (m.bounce) {
        const track = Math.max(1, Wm - m.len), period = (2 * track) / m.speed, u = ((t + m.phase * period) % period) / period;
        const tri = u < 0.5 ? u * 2 : 2 - u * 2;
        m.g.position.x = ease(tri) * track + (m.dir === -1 ? m.len : 0);
      } else {
        const lap = Wm + m.len + 8, x = (m.x0 + m.phase * lap + m.dir * t * m.speed) % lap;
        m.g.position.x = ((x % lap) + lap) % lap - (m.dir === -1 ? 4 : m.len + 4);
      }
    }
  }

  /**
   * The wordmark's lettering alone: the asset paints its board as one flat colour (with a faint grain), so pixels
   * near that colour are keyed out and the result is cropped to the letters. Cached per shot; a function of the
   * image and the knob, never of the clock.
   */
  const keyed = {};
  function keyedCard(id, img, bg) {
    if (keyed[id] !== undefined) return keyed[id];
    try {
      const w = img.naturalWidth, h = img.naturalHeight;
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, w, h), px = d.data;
      const n = parseInt(String(bg || "#F2B33D").slice(1), 16), br = (n >> 16) & 255, bgr = (n >> 8) & 255, bb = n & 255;
      // the crop follows rows and columns with real ink in them; the sparse preview watermark does not move it
      const rows = new Uint32Array(h), cols = new Uint32Array(w);
      for (let i = 0; i < px.length; i += 4) {
        const dist = Math.max(Math.abs(px[i] - br), Math.abs(px[i + 1] - bgr), Math.abs(px[i + 2] - bb));
        const al = Math.pow(Math.min(1, Math.max(0, (dist - 16) / 30)), 2); // the faint preview watermark mostly keys out too
        px[i + 3] = Math.round(px[i + 3] * al);
        if (al > 0.9) { const p = i / 4, x = p % w; rows[(p - x) / w]++; cols[x]++; }
      }
      let x0 = 0, x1 = w - 1, y0 = 0, y1 = h - 1;
      while (y0 < h && rows[y0] < w * 0.01) y0++;
      while (y1 > y0 && rows[y1] < w * 0.01) y1--;
      while (x0 < w && cols[x0] < h * 0.02) x0++;
      while (x1 > x0 && cols[x1] < h * 0.02) x1--;
      if (x1 <= x0 || y1 <= y0) return (keyed[id] = null);
      g.putImageData(d, 0, 0);
      const pad = Math.round(h * 0.03), out = document.createElement("canvas");
      out.width = Math.min(w, x1 - x0 + 1 + pad * 2); out.height = Math.min(h, y1 - y0 + 1 + pad * 2);
      out.getContext("2d").drawImage(c, Math.max(0, x0 - pad), Math.max(0, y0 - pad), out.width, out.height, 0, 0, out.width, out.height);
      return (keyed[id] = out);
    } catch { return (keyed[id] = null); }
  }

  function drawCard(shot, local) {
    const img = cards[shot.id];
    if (!img || !img.complete || !img.naturalWidth) return; // an art request that failed draws nothing rather than throwing
    const c = shot.card, secs = local * shot.seconds, remain = (1 - local) * shot.seconds;
    const a = c.fade > 0 ? Math.min(1, secs / c.fade, c.layout === "lower" ? remain / c.fade : 1) : 1;
    if (a <= 0) return;
    const iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
    if (c.layout === "lower") {
      // A broadcast lower third, after the HyperFrames registry block lt-accent-underline
      // (heygen-com/hyperframes, registry/blocks/lt-accent-underline/index.html): the name rises in, an accent rule
      // draws left to right under it, the place line fades up; on the way out the place fades, the rule retracts,
      // the name lifts. The name is the licensed wordmark's own lettering, keyed off its board so it sits on the
      // footage instead of arriving as a yellow sticker. Text gets a soft shadow for legibility, as the block does.
      const art = keyedCard(shot.id, img, c.knobs?.background);
      if (!art) return;
      const S = Math.min(W, H), portrait = H > W;
      const ts = Math.min(1, shot.seconds / 2.4); // a short shot plays the same choreography faster
      const o3 = (k) => 1 - Math.pow(1 - k, 3), o4 = (k) => 1 - Math.pow(1 - k, 4), i2 = (k) => k * k;
      const st = (from, dur) => Math.min(1, Math.max(0, (secs - from * ts) / (dur * ts)));
      const ex = (from, dur) => Math.min(1, Math.max(0, (secs - (shot.seconds - (0.5 - from) * ts)) / (dur * ts)));
      const nameIn = o3(st(0.1, 0.55)), ruleIn = o4(st(0.3, 0.5)), subIn = o3(st(0.46, 0.5));
      const subOut = i2(ex(0.0, 0.3)), ruleOut = i2(ex(0.05, 0.3)), nameOut = i2(ex(0.1, 0.32));
      const lw = portrait ? W * 0.56 : Math.min(W * 0.3, S * 0.54), lh = (lw * art.height) / art.width;
      const x = portrait ? W * 0.08 : W * 0.06, rule = Math.max(2, S * 0.005), gap = S * 0.018;
      const subSize = Math.round(S * 0.026), bottom = H - H * 0.12;
      const ny = bottom - subSize - gap - rule - gap - lh;
      const shadow = () => { ctx.shadowColor = "rgba(0, 0, 0, 0.42)"; ctx.shadowBlur = S * 0.018; ctx.shadowOffsetY = S * 0.002; };
      ctx.save();
      shadow();
      ctx.globalAlpha = a * nameIn * (1 - nameOut);
      ctx.drawImage(art, x, ny + (1 - nameIn) * S * 0.026 - nameOut * S * 0.015, lw, lh);
      ctx.shadowColor = "transparent";
      ctx.globalAlpha = a;
      ctx.fillStyle = c.knobs?.background || film.brand?.highlight || "#F2B33D";
      ctx.fillRect(x, ny + lh + gap, lw * ruleIn * (1 - ruleOut), rule);
      if (c.sub) {
        shadow();
        ctx.globalAlpha = a * subIn * (1 - subOut);
        // the place line reads in the brand's paper over dusk and night, and in its ink over a daylit street
        const lit = shot.time === "day" && (!shot.timeTo || shot.timeTo === "day");
        ctx.fillStyle = (lit ? film.brand?.ink : film.brand?.background) || (lit ? "#1B1F2A" : "#F6EEE0");
        ctx.font = `600 ${subSize}px "Source Sans 3", system-ui, sans-serif`;
        ctx.letterSpacing = `${Math.round(S * 0.006)}px`;
        ctx.textAlign = "start"; ctx.textBaseline = "top";
        ctx.fillText(c.sub.toUpperCase(), x, ny + lh + gap + rule + gap + (1 - subIn) * S * 0.015);
      }
      ctx.restore();
      ctx.letterSpacing = "0px"; ctx.globalAlpha = 1;
      return;
    }
    // the end card: the scene sinks into the brand's dark, the monogram settles, the name rises under it, then a rule
    // and the place. A wordmark image (older films) is drawn on its own instead.
    const ink = new THREE.Color(film.brand?.ink || "#14161C");
    ctx.fillStyle = `rgba(${Math.round(ink.r * 255)}, ${Math.round(ink.g * 255)}, ${Math.round(ink.b * 255)}, ${c.scrim * a})`;
    ctx.fillRect(0, 0, W, H);
    const gold = c.knobs?.primary || film.brand?.highlight || "#F2B33D", paper = film.brand?.background || "#F6EEE0";
    const S = Math.min(W, H), cx = W / 2;
    const stage = (from, dur) => { const k = Math.min(1, Math.max(0, (secs - from) / dur)); return k * k * (3 - 2 * k); };
    if (!c.name) {
      const maxW = W * 0.62, maxH = H * 0.5, sc = Math.min(maxW / iw, maxH / ih), dw = iw * sc, dh = ih * sc;
      ctx.globalAlpha = a; ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh); ctx.globalAlpha = 1;
      return;
    }
    // The lockup: the monogram settles, the name rises word by word out of a mask (the "rise" of the hyperframes
    // text effects: each word lifts through a clipped slot, staggered), then a short rule and the place line. One
    // display face (Anton) against one text face (Source Sans 3), a strict scale: name 11.5% of the short side,
    // sub 2.6%, and nothing else.
    const m1 = stage(0.05, 0.5), m3 = stage(0.95, 0.5);
    const mark = S * 0.2 * (0.86 + 0.14 * m1), top = H * 0.5 - S * 0.27;
    ctx.globalAlpha = a * m1;
    ctx.drawImage(img, cx - mark / 2, top + (S * 0.2 - mark) / 2, mark, mark * (ih / iw));
    ctx.fillStyle = paper; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    let nameSize = S * 0.115, nameTrack = S * 0.004;
    const setName = () => { ctx.font = `400 ${Math.round(nameSize)}px ${DISPLAY}`; ctx.letterSpacing = `${Math.round(nameTrack)}px`; };
    setName();
    const words = c.name.split(/\s+/).filter(Boolean), gapW = nameSize * 0.2;
    const widths = words.map((w) => ctx.measureText(w).width + nameTrack * w.length);
    let total = widths.reduce((s, w) => s + w, 0) + gapW * (words.length - 1);
    const maxName = W * 0.86;
    if (total > maxName) { const f = maxName / total; nameSize *= f; nameTrack *= f; setName(); total *= f; for (let k = 0; k < widths.length; k++) widths[k] *= f; }
    const baseline = top + S * 0.32, slotTop = baseline - nameSize * 0.95, slotH = nameSize * 1.12;
    let x = cx - total / 2;
    words.forEach((w, k) => {
      const rise = stage(0.3 + k * 0.09, 0.5), o3 = 1 - Math.pow(1 - rise, 3);
      ctx.save();
      ctx.beginPath(); ctx.rect(x - nameSize * 0.1, slotTop, widths[k] + nameSize * 0.2, slotH); ctx.clip();
      ctx.globalAlpha = a * Math.min(1, rise * 2);
      ctx.textAlign = "start";
      ctx.fillText(w, x, baseline + (1 - o3) * nameSize * 1.05);
      ctx.restore();
      setName();
      x += widths[k] + gapW;
    });
    ctx.textAlign = "center";
    ctx.globalAlpha = a * m3;
    ctx.fillStyle = gold;
    const rw = S * 0.07 * m3; ctx.fillRect(cx - rw / 2, top + S * 0.36, rw, Math.max(2, S * 0.005));
    ctx.fillStyle = paper; ctx.globalAlpha = a * m3 * 0.85;
    ctx.font = `500 ${Math.round(S * 0.026)}px ${TEXT}`;
    ctx.letterSpacing = `${Math.round(S * 0.01)}px`;
    if (c.sub) ctx.fillText(c.sub.toUpperCase(), cx, top + S * 0.415);
    ctx.letterSpacing = "0px"; ctx.textAlign = "start"; ctx.globalAlpha = 1;
  }

  /**
   * The knob readout for a rebuild shot: the knob's name small, its value large in the display face rolling up as it
   * changes (a counter), and the knob itself drawn underneath (a track with a dot for a range, segments for a
   * choice). Bottom left, where the lower third sits in its own shot, in the brand's paper over a soft shadow.
   */
  function drawReadout(rb, shot) {
    const S = Math.min(W, H), portrait = H > W;
    const def = (rb.cur || rb.steps[0])?.def;
    if (!def) return;
    const a = rb.intro * (1 - rb.outro);
    if (a <= 0) return;
    const x = portrait ? W * 0.08 : W * 0.06, bottom = H - H * 0.12;
    const paper = film.brand?.background || "#F6EEE0", ink = film.brand?.ink || "#1B1F2A", accent = film.brand?.highlight || "#F2B33D";
    const lit = shot.time === "day" && (!shot.timeTo || shot.timeTo === "day");
    const fg = lit ? ink : paper;
    const labelSize = Math.round(S * 0.024), valueSize = Math.round(S * 0.085), track = S * 0.22, gap = S * 0.016;
    const trackH = Math.max(2, S * 0.004), dot = S * 0.012;
    const ty = bottom - trackH, vy = ty - gap - dot, ly = vy - valueSize * 0.98 - gap;
    const slide = (1 - rb.intro) * S * 0.03;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.shadowColor = lit ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.6)"; ctx.shadowBlur = S * 0.024; ctx.shadowOffsetY = S * 0.002;
    ctx.fillStyle = fg; ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
    ctx.font = `600 ${labelSize}px ${TEXT}`; ctx.letterSpacing = `${Math.round(S * 0.006)}px`;
    ctx.fillText(String(def.label || rb.label).toUpperCase(), x, ly + slide);
    // the value rolls: the new one rises into a slot as the old one leaves through the top
    const roll = Math.min(1, rb.since / 0.24), o3 = 1 - Math.pow(1 - roll, 3);
    ctx.font = `400 ${valueSize}px ${DISPLAY}`; ctx.letterSpacing = `${Math.round(S * 0.003)}px`;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - S * 0.01, vy - valueSize * 1.02, W * 0.5, valueSize * 1.16); ctx.clip();
    const prev = rb.k >= 1 ? (rb.k === 1 ? rb.value0 : rb.k - 2 < rb.steps.length ? rb.steps[rb.k - 2]?.value : rb.value) : undefined;
    const show = (v) => String(v).toUpperCase();
    ctx.fillText(show(rb.value), x, vy + slide + (1 - o3) * valueSize);
    if (rb.k >= 1 && prev !== undefined && roll < 1) { ctx.globalAlpha = a * (1 - roll); ctx.fillText(show(prev), x, vy + slide - o3 * valueSize); ctx.globalAlpha = a; }
    ctx.restore();
    ctx.shadowColor = "transparent";
    // the knob: a range is a track with a dot at the value, a choice is one segment per option, the current one filled
    const dim = lit ? "rgba(27, 31, 42, 0.28)" : "rgba(246, 238, 224, 0.35)";
    if (def.type === "range" && Number.isFinite(def.min) && Number.isFinite(def.max) && def.max > def.min) {
      ctx.fillStyle = dim; ctx.fillRect(x, ty, track, trackH);
      const kx = x + track * Math.min(1, Math.max(0, (Number(rb.value) - def.min) / (def.max - def.min)));
      ctx.fillStyle = accent; ctx.fillRect(x, ty, kx - x, trackH);
      ctx.beginPath(); ctx.arc(kx, ty + trackH / 2, dot, 0, Math.PI * 2); ctx.fill();
    } else if (Array.isArray(def.options)) {
      const n = def.options.length, segW = (track - (n - 1) * S * 0.006) / n;
      def.options.forEach((o, k) => { ctx.fillStyle = o === rb.value ? accent : dim; ctx.fillRect(x + k * (segW + S * 0.006), ty, segW, trackH * 1.6); });
    }
    ctx.restore();
    ctx.letterSpacing = "0px"; ctx.globalAlpha = 1;
  }

  // hits: moments the camera takes an impact (a title landing, a flash cut), as seconds on the film's clock
  const hits = [];
  function impacts() {
    hits.length = 0;
    film.shots.forEach((s, i) => {
      for (const h of s.hits || []) hits.push(starts[i] + h);
      if (s.title) hits.push(starts[i] + (s.title.at ?? 1));
      if (s.cut === "flash") hits.push(starts[i]);
      const r = rebuilds[s.id];
      if (r) { const { n, t0, each } = rebuildBeats(r, s); for (let k = 0; k <= n; k++) hits.push({ t: starts[i] + t0 + k * each, k: 0.3 }); } // each knob turn lands with a small kick
    });
  }
  impacts();
  /** Swap in an edited shot list (ramps, cuts, shake, lengths) and redraw; the set, signs and title stay built. */
  function setCut(shots) {
    film.shots = shots;
    film.seconds = shots.reduce((a, s) => a + s.seconds, 0);
    timeline();
    impacts();
    at = Math.min(at, duration);
    const info = seek(at);
    for (const f of listeners) f(info, playing);
  }
  const label = film.licensed ? null : ["PREVIEW", "unlicensed"];
  let building = false; // during the build-in the first frame is drawn without its fade from black
  let samplesCap = 16; // motion-blur samples per frame; the live preview lowers it while playing

  /**
   * The street assembling at second t of the build window: a piece is up in the air before its drop, falls on an
   * ease-in (a thing falling), lands with a settle, and if it landed as stock it pops into its remix a beat later.
   * Each piece's moment is a function of its placement (dropOrder), so the render and the preview agree.
   */
  const flash = (g, amt) => { const c = g.userData.clay; if (!c) return; if (amt > 0) { setClay(c, c.k, amt); c.flashed = true; } else if (c.flashed) { setClay(c, c.k, 0); c.flashed = false; } };
  function assemble(t, B) {
    for (const d of drops) {
      const t0 = d.at * (B - 0.55), u = Math.min(1, Math.max(0, (t - t0) / 0.5)); // every piece is down 0.05 s before the window ends
      if (u <= 0) { d.g.visible = false; if (d.stock) d.stock.visible = false; continue; }
      const e = u < 0.8 ? Math.pow(u / 0.8, 2.2) : 1, since = t - (t0 + 0.5);
      const settle = u >= 1 ? Math.exp(-since * 10) * Math.sin(since * 34) * 0.06 : u >= 0.8 ? -Math.sin(((u - 0.8) / 0.2) * Math.PI) * 0.05 : 0;
      const live = !d.stock || since >= 0.22; // stock for a beat, then the remix pops in
      const pop = d.stock && live ? Math.sin(Math.PI * Math.min(1, Math.max(0, (since - 0.22) / 0.28))) * 0.1 : 0;
      const active = live ? d.g : d.stock, other = live ? d.stock : d.g;
      active.visible = true;
      if (other) { other.visible = false; other.position.y = d.y; other.scale.setScalar(1); }
      active.position.y = d.y + (1 - e) * 16;
      active.scale.set(1 + pop, (1 + pop) * (1 + settle), 1 + pop);
      flash(d.g, pop * 6); // a warm front passes over the remix as it lands
    }
    for (const l of lanterns) l.visible = t >= B - 0.4;
  }
  function assembled() {
    for (const d of drops) { d.g.visible = true; d.g.position.y = d.y; d.g.scale.setScalar(1); if (d.stock) d.stock.visible = false; flash(d.g, 0); }
    for (const l of lanterns) l.visible = true;
  }
  /** The beats of a rebuild shot: the first step at t0, one every `each` seconds, the return after the last. */
  function rebuildBeats(r, shot) {
    const n = r.steps.length, S = shot.seconds, span = Math.min(0.62 * S, 0.9 * (n + 1)), t0 = Math.max(0.3, 0.2 * S), each = span / (n + 1);
    return { n, t0, each, span };
  }
  /** The knob walk at second `secs` of a rebuild shot: which step shows, its pop, and the readout to draw. */
  function rebuildAt(r, shot, secs) {
    const { n, t0, each, span } = rebuildBeats(r, shot);
    const k = Math.min(n + 1, Math.max(0, Math.floor((secs - t0) / each + 1)));
    const since = secs - (t0 + (k - 1) * each);
    const pop = k > 0 && k <= n + 1 ? Math.sin(Math.PI * Math.min(1, Math.max(0, since / 0.26))) * 0.07 : 0;
    const cur = k === 0 || k > n ? null : r.steps[k - 1];
    const first = r.steps[0]?.knob;
    const own = film.world.placements.find((p) => p.id === r.placement.id)?.knobs || {};
    // before the walk and after the return the readout shows the knob as the remix has it
    const label = cur ? cur.knob : first;
    const value = cur ? cur.value : own[first] ?? "";
    return { k, cur, pop, since, label, value, value0: own[first] ?? "", steps: r.steps, top: cur ? cur.top : r.top, on: secs >= t0 - 0.25 && secs <= t0 + span + 0.9, intro: Math.min(1, Math.max(0, (secs - (t0 - 0.25)) / 0.35)), outro: Math.min(1, Math.max(0, (secs - (t0 + span + 0.55)) / 0.35)) };
  }
  let readout = null; // what seek() draws for a rebuild shot

  /** Sets the whole world to second t and returns the finishing parameters for that instant. */
  function stage(t) {
    const { i, shot, local } = shotAt(t);
    const dark = setLight(shot.time, shot.timeTo, shot.timeTo ? ease(local) : 0);
    let focus = pose(shot, local);
    move(t);
    if (drops.length) { if (buildShot && i === 0 && t < buildShot.build) assemble(t, buildShot.build); else assembled(); }
    // the street clears for the title; in a film that assembles itself, assemble() owns visibility until then
    for (const m of movers) { if (i === titleShot) m.g.visible = false; else if (!drops.length) m.g.visible = true; }
    for (const g of cheat) { if (i === titleShot) g.visible = false; else if (!drops.length) g.visible = true; }
    weather?.(t);
    // rolling fog: the bank breathes in and out down the street, as a function of the second, not the clock
    if (film.weather === "fog" && scene.fog) { scene.fog.near = 4 + 3 * Math.sin(t * 0.35); scene.fog.far = 46 + 14 * Math.sin(t * 0.35 + 1.2); }
    const p = { frame: Math.round(t * film.fps), dark, focus, rgb: 0, glitch: 0, zoom: 0, flash: 0, angle: 0, fade: 0, blur: [0, 0] };
    // the knob walk: the step's group shows, the others hide, the roof sign rides the roofline, the readout is set
    readout = null;
    for (const [sid, r] of Object.entries(rebuilds)) {
      const on = shot.id === sid;
      const rb = on ? rebuildAt(r, shot, local * shot.seconds) : null;
      for (const st of r.steps) { st.g.visible = !!rb?.cur && rb.cur === st; if (!st.g.visible) st.g.scale.setScalar(1); }
      if (rb?.cur) r.g.visible = false; else if (on) r.g.visible = true;
      const active = rb?.cur ? rb.cur.g : r.g, s = 1 + (rb?.pop || 0);
      active.scale.set(s, s, s);
      flash(active, (rb?.pop || 0) * 5);
      const top = rb ? rb.top : r.top;
      for (const g of groups) if (g.userData.sign?.placement === r.placement.id && g.userData.sign.where === "roof") g.position.y = g.userData.sign.mount.at[1] + (top - r.top);
      if (rb?.on) readout = rb;
    }
    // transitions on the cut nearest t
    const tr = transitionAt(t, starts, film.shots);
    if (tr) {
      const side = tr.u < 0 ? -1 : 1, dir = tr.i % 2 ? 1 : -1;
      if (tr.kind === "whip") {
        // the camera keeps turning through the cut: out of the old shot one way, into the new one from the same way
        const a = (1 - Math.abs(tr.u)), swing = a * a * 0.6;
        camera.rotateY(dir * (side < 0 ? swing : -swing));
        p.rgb = 0.004 * tr.env;
        p.angle = 0;
        p.blur = [dir * 0.03 * tr.env * tr.env, 0]; // the smear runs along the pan
      } else if (tr.kind === "match") {
        // the eye line carries: the incoming camera starts on the outgoing shot's last look direction and eases home
        if (tr.u >= 0 && tr.i > 0) {
          const home = camera.quaternion.clone(), fov = camera.fov;
          pose(film.shots[tr.i - 1], 1);
          const from = camera.quaternion.clone();
          pose(shot, local);
          if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
          const k = ease(Math.min(1, tr.u));
          camera.quaternion.copy(from).slerp(home, k);
        }
      } else if (tr.kind === "zoom") {
        camera.fov = camera.fov * (1 - 0.38 * tr.env); camera.updateProjectionMatrix();
        p.zoom = 0.2 * tr.env;
      } else if (tr.kind === "glitch") {
        p.glitch = tr.env;
      } else if (tr.kind === "flash") {
        p.flash = side > 0 ? Math.pow(1 - tr.u, 2.6) * 0.62 : tr.env * 0.4;
      }
    }
    // shake: handheld on the shot plus every hit, decaying
    const [yaw, pitch, roll] = shakeAt(t, shot.shake || 0, hits, seed);
    if (yaw || pitch || roll) { camera.rotateY(yaw); camera.rotateX(pitch); camera.rotateZ(roll); }
    // the 3D title, during its own shot only
    if (title) {
      const on = i === titleShot;
      title.visible = false;
      if (title.userData.shadow) title.userData.shadow.visible = false;
      if (title.userData.rim) title.userData.rim.intensity = 0;
      if (title.userData.ring) title.userData.ring.visible = false;
      if (title.userData.dust) title.userData.dust.visible = false;
      if (on) {
        const secs = local * shot.seconds, tp = titlePose(secs, shot.title.at ?? 1);
        title.visible = tp.visible;
        title.position.y = title.userData.base + tp.y;
        if (title.userData.rim) title.userData.rim.intensity = tp.visible ? 3.2 : 0;
        const sh = title.userData.shadow;
        if (sh) { sh.visible = tp.visible; sh.material.opacity = Math.max(0, 1 - tp.y / 6); }
        title.rotation.x = -tp.tilt;
        const f = title.userData.fit, wide = title.userData.width * f;
        title.scale.set(f / Math.sqrt(tp.squash), f * tp.squash, f);
        // the slam: a shock ring runs out from the word, dust lifts and thins, the picture kicks and the lens punches
        const ring = title.userData.ring, dust = title.userData.dust;
        if (ring && tp.ring > 0) { ring.visible = true; const rs = 1.5 + tp.ring * (wide * 0.9 + 6); ring.scale.set(rs, rs, 1); ring.material.opacity = tp.ringAlpha * 0.85; }
        if (dust && tp.dust > 0 && tp.dust < 1) { dust.visible = true; const ds = wide * 0.8 + 2 + tp.dust * 5; dust.scale.set(ds, ds * 0.6, 1); dust.position.y = 0.18 + tp.dust * 0.8; dust.material.opacity = Math.sin(Math.PI * tp.dust) * 0.5; }
        if (tp.visible && tp.y < 0.01) p.flash = Math.max(p.flash, Math.exp(-(secs - (shot.title.at ?? 1)) * 12) * 0.22);
        if (tp.kick > 0) { p.rgb = Math.max(p.rgb, tp.kick * 0.011); camera.fov *= 1 - tp.kick * 0.04; camera.updateProjectionMatrix(); }
        if (tp.y < 0.5) p.focus = Math.max(4, camera.position.distanceTo(title.position));
      }
    }
    p.tint = dark > 0.5 ? [0.86, 0.92, 1.16] : [1.1, 0.97, 0.86];
    p.tintAmt = dark > 0.5 ? (dark - 0.5) * 0.35 : (0.5 - Math.abs(dark - 0.5)) * 0.12;
    const fadeIn = building ? 1 : Math.min(1, t / 0.5), fadeOut = Math.min(1, (duration - t) / 0.7);
    p.fade = 1 - Math.min(fadeIn, fadeOut);
    return p;
  }

  /** How many sub-frame samples second t needs: as many as the camera moves inside the shutter, one when still. */
  function samplesFor(t, p, shutter) {
    if (shutter <= 0 || samplesCap <= 1) return 1;
    const q0 = camera.quaternion.clone(), x0 = camera.position.clone();
    stage(Math.max(0, t - shutter / film.fps));
    const ang = q0.angleTo(camera.quaternion), dist = x0.distanceTo(camera.position) / Math.max(4, p.focus);
    const motion = (ang + dist) * (film.size[0] / 1280) * 180 / Math.PI; // degrees of apparent motion in the shutter
    return Math.max(1, Math.min(samplesCap, Math.round(motion * 3)));
  }

  /** Renders second `t` of the film into the composite canvas. */
  function seek(t) {
    t = Math.min(duration, Math.max(0, t));
    const shutter = (STYLES[edit.style] || STYLES.clean).shutter;
    const p = stage(t);
    const n = samplesFor(t, p, shutter);
    if (n <= 1) {
      stage(t);
      finish.render(p);
      ctx.globalCompositeOperation = "copy";
      ctx.drawImage(renderer.domElement, 0, 0, W, H);
    } else {
      // Remotion's CameraMotionBlur: n samples spread over the shutter, each at 1/n, added together
      ctx.globalCompositeOperation = "copy";
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 1 / n;
      for (let k = 0; k < n; k++) {
        const ts = Math.max(0, t - (shutter * k) / n / film.fps);
        const ps = stage(ts);
        finish.render({ ...ps, frame: p.frame });
        ctx.drawImage(renderer.domElement, 0, 0, W, H);
      }
      ctx.globalAlpha = 1;
      stage(t); // leave the world at t
    }
    ctx.globalCompositeOperation = "source-over";
    const { shot, local } = shotAt(t);
    if (shot.card) drawCard(shot, local);
    if (readout) drawReadout(readout, shot);
    if (label) {
      // the unlicensed mark: a small dark pill at the bottom left, two words and a hairline between them
      const S = Math.min(W, H), fs = Math.round(S / 50), ph = Math.round(S / 28), pad = Math.round(S / 48), ip = Math.round(fs * 0.8);
      ctx.font = `700 ${fs}px "Source Sans 3", system-ui, sans-serif`;
      ctx.letterSpacing = `${Math.round(fs * 0.08)}px`;
      const w1 = ctx.measureText(label[0]).width + fs * 0.08 * label[0].length;
      ctx.font = `500 ${fs}px "Source Sans 3", system-ui, sans-serif`;
      ctx.letterSpacing = "0px";
      const w2 = ctx.measureText(label[1]).width;
      const pw = ip + w1 + ip + 1 + ip + w2 + ip, x = pad, y = H - pad - ph;
      ctx.fillStyle = "rgba(10, 12, 16, 0.6)";
      ctx.beginPath(); ctx.roundRect?.(x, y, pw, ph, ph / 2); ctx.fill();
      ctx.textBaseline = "middle"; ctx.textAlign = "start";
      ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
      ctx.font = `700 ${fs}px "Source Sans 3", system-ui, sans-serif`;
      ctx.letterSpacing = `${Math.round(fs * 0.08)}px`;
      ctx.fillText(label[0], x + ip, y + ph / 2 + 1);
      ctx.letterSpacing = "0px";
      ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
      ctx.fillRect(x + ip + w1 + ip, y + ph * 0.28, 1, ph * 0.44);
      ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
      ctx.font = `500 ${fs}px "Source Sans 3", system-ui, sans-serif`;
      ctx.fillText(label[1], x + ip + w1 + ip + 1 + ip, y + ph / 2 + 1);
    }
    return { t, ...shotAt(t) };
  }

  /** Frames [from, from + count) as JPEG data URLs, for the renderer. */
  function frames(from, count, quality = 0.92) {
    const outFrames = [];
    for (let i = from; i < from + count; i++) { seek(i / film.fps); outFrames.push(out.toDataURL("image/jpeg", quality)); }
    return outFrames;
  }
  /** A still of second `t`, `width` px wide (thumbnails). */
  function still(t, width = 320) {
    seek(t);
    const c = document.createElement("canvas");
    c.width = width; c.height = Math.round((width * H) / W);
    c.getContext("2d").drawImage(out, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
  }

  // the soundtrack, kept on the player's clock (the Studio only; the renderer muxes the same WAV with ffmpeg)
  let track = null;
  if (audio && film.musicUrl) {
    track = new Audio(`${api}${film.musicUrl}`);
    track.preload = "auto";
    track.volume = 0.9;
  }

  // playback on a clock (the Studio); the renderer never calls play()
  let playing = false, t0 = 0, at = 0, raf = 0;
  const listeners = new Set();
  function tick(now) {
    if (!playing) return;
    at = (now - t0) / 1000;
    if (at >= duration) { at = duration; playing = false; track?.pause(); }
    const info = seek(at);
    for (const f of listeners) f(info, playing);
    if (playing) raf = requestAnimationFrame(tick);
  }
  function play(from = at >= duration ? 0 : at) {
    samplesCap = 3;
    at = from; playing = true; t0 = performance.now() - from * 1000;
    if (track) { track.currentTime = from; track.play().catch(() => {}); }
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }
  function pause() { samplesCap = 16; playing = false; cancelAnimationFrame(raf); track?.pause(); }
  function goto(t) { at = t; const info = seek(t); for (const f of listeners) f(info, playing); if (playing) t0 = performance.now() - t * 1000; if (track) track.currentTime = t; }

  /** The set drops in piece by piece (as the kit viewer does), then the film starts. A film that assembles itself in its first shot skips this. */
  function buildIn(ms = 1400) {
    if (buildShot) { seek(0); return Promise.resolve(); }
    return new Promise((resolve) => {
      building = true;
      const order = groups.map((g, i) => ({ g, y: g.position.y, d: (hash(i * 7919 + Wm) >>> 0) % 1000 / 1000 }));
      const start = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - start) / ms);
        for (const o of order) {
          const u = Math.min(1, Math.max(0, (k - o.d * 0.6) / 0.4));
          o.g.visible = u > 0;
          const e = u < 0.75 ? Math.pow(u / 0.75, 2) : 1 - Math.sin(((u - 0.75) / 0.25) * Math.PI) * 0.06;
          o.g.position.y = o.y + 14 * (1 - Math.min(1, e));
        }
        seek(0);
        if (k < 1) requestAnimationFrame(step);
        else { for (const o of order) { o.g.position.y = o.y; o.g.visible = true; } building = false; resolve(); }
      };
      requestAnimationFrame(step);
    });
  }

  /** Real-time WebM of one playthrough through MediaRecorder, with the soundtrack, for servers that can't render MP4. */
  function record() {
    return new Promise((resolve, reject) => {
      if (!("MediaRecorder" in window)) return reject(new Error("This browser can't record video"));
      const stream = out.captureStream(film.fps);
      if (track) {
        try {
          const ac = new (window.AudioContext || window.webkitAudioContext)();
          const src = ac.createMediaElementSource(track), dest = ac.createMediaStreamDestination();
          src.connect(dest); src.connect(ac.destination);
          dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
        } catch {}
      }
      const type = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8_000_000 });
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType }));
      rec.onerror = (e) => reject(e.error || new Error("Recording failed"));
      const stop = (info, isPlaying) => { if (!isPlaying) { listeners.delete(stop); setTimeout(() => rec.stop(), 120); } };
      listeners.add(stop);
      rec.start(250);
      play(0);
    });
  }

  /**
   * The licence lands: colour sweeps out from the hero through the street, each piece painted in as the wave reaches
   * it with a small lift, the way a light sweeps a set. Signs and lanterns are already in colour; the clay goes.
   */
  function sweep(ms = 2600) {
    if (!clay.length) return Promise.resolve();
    const from = film.titleMount ? new THREE.Vector3(...film.titleMount.at) : centre;
    const far = Math.max(...clay.map((c) => c.g.position.distanceTo(from))) || 1;
    for (const c of clay) { c.d = c.g.position.distanceTo(from) / far; c.y = c.g.position.y; }
    const start = performance.now();
    return new Promise((resolve) => {
      const step = (now) => {
        const k = Math.min(1, (now - start) / ms);
        for (const c of clay) {
          const u = Math.min(1, Math.max(0, (k * 1.35 - c.d * 0.85) / 0.5)), e = u * u * (3 - 2 * u);
          setClay(c, 1 - e, Math.sin(Math.PI * u) * 0.85); // a warm light front passes over each piece as it is painted
          c.g.position.y = c.y + Math.sin(Math.PI * e) * 0.35;
        }
        if (!playing) seek(at);
        if (k < 1) requestAnimationFrame(step);
        else { for (const c of clay) { setClay(c, 0, 0); c.g.position.y = c.y; } resolve(); }
      };
      requestAnimationFrame(step);
    });
  }

  function dispose() { pause(); track?.pause(); finish.dispose(); renderer.dispose(); world.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); out.remove(); }

  seek(0);
  return { seek, frames, still, play, pause, goto, buildIn, record, dispose, setCut, sweep, get duration() { return duration; }, starts, shotAt, get time() { return at; }, get playing() { return playing; }, onTime: (f) => (listeners.add(f), () => listeners.delete(f)), canvas: out, track };
}
