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
import { createFinish, curve, shakeAt, transitionAt, makeTitle, titlePose, seedOf, STYLES } from "./film-fx.js";

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
  const edit = film.edit || { style: "clean" };
  const finish = createFinish(renderer, scene, camera, W, H, edit.style);
  const seed = seedOf(film);

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
  for (const p of film.placements) {
    const g = partsToGroup(film.parts[p.part]);
    g.position.set(...p.at);
    g.rotation.y = -deg(p.rot);
    if (!film.licensed || reveal) { // in preview the whole set is clay; the licence paints the street
      // clay with drawn edges, like a model sheet: it reads as "not yet bought", not as a broken render. Each paid
      // material keeps its real colour so licensing can paint it back in (sweep()).
      const entry = { g, mats: [], edges: [], d: 0 };
      g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); entry.mats.push({ m: o.material, color: o.material.color.clone(), emissive: o.material.emissive.clone(), ei: o.material.emissiveIntensity, rough: o.material.roughness, metal: o.material.metalness }); } });
      g.traverse((o) => { if (o.isMesh) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 25), CLAY_EDGE.clone()); e.position.copy(o.position); e.quaternion.copy(o.quaternion); e.scale.copy(o.scale); o.parent.add(e); entry.edges.push(e); } });
      clay.push(entry);
      setClay(entry, 1);
    }
    world.add(g);
    groups.push(g);
    const m = MOVERS[p.asset];
    if (m) {
      const box = new THREE.Box3().setFromObject(g), len = box.max.x - box.min.x;
      movers.push({ g, x0: p.at[0], dir: p.rot === 180 ? -1 : 1, len, phase: (hash(p.id) >>> 0) % 1000 / 1000, ...m });
    }
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
      }
      world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cord));
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
    world.add(g);
    groups.push(g);
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

  function drawCard(shot, local) {
    const img = cards[shot.id];
    if (!img || !img.complete || !img.naturalWidth) return; // an art request that failed draws nothing rather than throwing
    const c = shot.card, secs = local * shot.seconds, remain = (1 - local) * shot.seconds;
    const a = c.fade > 0 ? Math.min(1, secs / c.fade, c.layout === "lower" ? remain / c.fade : 1) : 1;
    if (a <= 0) return;
    const iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
    if (c.layout === "lower") {
      const dw = Math.min(W * 0.34, H * 0.5), dh = (dw * ih) / iw, x = W * 0.05, y = H - dh - H * 0.08;
      ctx.globalAlpha = a;
      ctx.drawImage(img, x - (1 - ease(a)) * 24, y, dw, dh);
      if (!film.licensed) {
        // unlicensed: a PREVIEW tab on the card's corner, clear of the brand's letters
        const fs = Math.round(dh * 0.17), pw = fs * 5.2, ph = fs * 1.55, px = x + dw - pw * 0.92, py = y - ph * 0.55;
        ctx.fillStyle = "rgba(19,19,19,0.86)"; ctx.beginPath(); ctx.roundRect?.(px, py, pw, ph, ph / 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = `800 ${fs}px "Source Sans 3", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.letterSpacing = `${Math.round(fs * 0.12)}px`; ctx.fillText("PREVIEW", px + pw / 2, py + ph / 2 + 1); ctx.letterSpacing = "0px"; ctx.textAlign = "start";
      }
      ctx.globalAlpha = 1;
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
    const m1 = stage(0.05, 0.5), m2 = stage(0.35, 0.55), m3 = stage(0.75, 0.5);
    const mark = S * 0.22 * (0.86 + 0.14 * m1), top = H * 0.5 - S * 0.27;
    ctx.globalAlpha = a * m1;
    ctx.drawImage(img, cx - mark / 2, top + (S * 0.2 - mark) / 2, mark, mark * (ih / iw));
    ctx.globalAlpha = a * m2;
    ctx.fillStyle = paper; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.font = `800 ${Math.round(S * 0.085)}px "Source Sans 3", system-ui, sans-serif`;
    ctx.letterSpacing = `${Math.round(S * 0.012)}px`;
    ctx.fillText(c.name, cx, top + S * 0.31 + (1 - m2) * S * 0.02);
    ctx.globalAlpha = a * m3;
    ctx.fillStyle = gold;
    const rw = S * 0.07 * m3; ctx.fillRect(cx - rw / 2, top + S * 0.345, rw, Math.max(2, S * 0.005));
    ctx.fillStyle = paper; ctx.globalAlpha = a * m3 * 0.85;
    ctx.font = `600 ${Math.round(S * 0.03)}px "Source Sans 3", system-ui, sans-serif`;
    ctx.letterSpacing = `${Math.round(S * 0.008)}px`;
    if (c.sub) ctx.fillText(c.sub.toUpperCase(), cx, top + S * 0.4);
    ctx.letterSpacing = "0px"; ctx.textAlign = "start"; ctx.globalAlpha = 1;
  }

  // hits: moments the camera takes an impact (a title landing, a flash cut), as seconds on the film's clock
  const hits = [];
  function impacts() {
    hits.length = 0;
    film.shots.forEach((s, i) => {
      for (const h of s.hits || []) hits.push(starts[i] + h);
      if (s.title) hits.push(starts[i] + (s.title.at ?? 1));
      if (s.cut === "flash") hits.push(starts[i]);
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
  const label = film.licensed ? null : "Preview. The street is clay and the signs are watermarked until the film is licensed.";
  let building = false; // during the build-in the first frame is drawn without its fade from black
  let samplesCap = 16; // motion-blur samples per frame; the live preview lowers it while playing

  /** Sets the whole world to second t and returns the finishing parameters for that instant. */
  function stage(t) {
    const { i, shot, local } = shotAt(t);
    const dark = setLight(shot.time, shot.timeTo, shot.timeTo ? ease(local) : 0);
    let focus = pose(shot, local);
    move(t);
    for (const m of movers) m.g.visible = i !== titleShot; // the street clears for the title
    for (const g of cheat) g.visible = i !== titleShot;
    weather?.(t);
    // rolling fog: the bank breathes in and out down the street, as a function of the second, not the clock
    if (film.weather === "fog" && scene.fog) { scene.fog.near = 4 + 3 * Math.sin(t * 0.35); scene.fog.far = 46 + 14 * Math.sin(t * 0.35 + 1.2); }
    const p = { frame: Math.round(t * film.fps), dark, focus, rgb: 0, glitch: 0, zoom: 0, flash: 0, angle: 0, fade: 0 };
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
      if (on) {
        const secs = local * shot.seconds, tp = titlePose(secs, shot.title.at ?? 1);
        title.visible = tp.visible;
        title.position.y = title.userData.base + tp.y;
        if (title.userData.rim) title.userData.rim.intensity = tp.visible ? 3.2 : 0;
        const sh = title.userData.shadow;
        if (sh) { sh.visible = tp.visible; sh.material.opacity = Math.max(0, 1 - tp.y / 6); }
        title.rotation.x = -tp.tilt;
        const f = title.userData.fit;
        title.scale.set(f / Math.sqrt(tp.squash), f * tp.squash, f);
        if (tp.visible && tp.y < 0.01) p.flash = Math.max(p.flash, Math.exp(-(secs - (shot.title.at ?? 1)) * 12) * 0.22);
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
    if (label) {
      ctx.font = `500 ${Math.round(Math.min(W, H) / 46)}px "Source Sans 3", system-ui, sans-serif`;
      const pad = Math.round(Math.min(W, H) / 64), tw = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
      ctx.beginPath();
      ctx.roundRect?.(pad * 1.5, H - pad * 1.5 - pad * 3, Math.min(tw + pad * 2.4, W - pad * 3), pad * 3, pad * 0.5);
      ctx.fill();
      ctx.fillStyle = "#292929";
      ctx.textBaseline = "middle";
      ctx.fillText(label, pad * 2.7, H - pad * 1.5 - pad * 1.5, W - pad * 5.4);
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

  /** The set drops in piece by piece (as the kit viewer does), then the film starts. */
  function buildIn(ms = 1400) {
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
