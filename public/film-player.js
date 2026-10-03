// The film player: frame N of a film is a pure function of the film, like a Remotion composition
// (remotion-dev/remotion, packages/three/src/ThreeCanvas.tsx advances the three.js frame loop by hand per frame
// instead of letting it run on the clock). The Studio plays it live on a clock; the render page
// (film.html) seeks it frame by frame and hands JPEGs to ffmpeg. Both draw the same composite: the WebGL scene,
// then the end card, the fades and the preview label on a 2D canvas.
//
// Camera moves follow the three.js spline-camera example (examples/webgl_geometry_extrude_splines.html: position
// from a curve at t, lookAt a point ahead), reduced to the four moves a street film needs: orbit, dolly, push, crane.
import * as THREE from "three";
import { partsToGroup } from "./blocks-runtime.js";

const SKY = { day: "#E9F0F7", dusk: "#F6D9C4", night: "#1B2135" };
const GREY = "#B9BEC7";
const ease = (k) => k * k * (3 - 2 * k); // smoothstep: cameras start and stop softly
const deg = (d) => (d * Math.PI) / 180;
const lerp = (a, b, k) => a + (b - a) * k;
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

/** Builds a film into `el` (a 16:9 box). Resolves to a player once every texture is loaded. */
export async function createFilmPlayer(el, film, { api = "" } = {}) {
  const W = film.size[0], H = film.size[1];
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const out = document.createElement("canvas"); // the composite the viewer sees and the recorder captures
  out.width = W; out.height = H;
  out.style.cssText = "display:block;width:100%;height:100%";
  el.appendChild(out);
  const ctx = out.getContext("2d");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 600);
  const hemi = new THREE.HemisphereLight("#ffffff", "#c9d2de", 2.2);
  const ambient = new THREE.AmbientLight("#ffffff", 0.55);
  const sun = new THREE.DirectionalLight("#fff4e0", 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(hemi, ambient, sun, sun.target);
  const world = new THREE.Group();
  scene.add(world);

  // the set: every placement, grey when its piece is paid and the film is not licensed
  const paid = new Set(film.bill.lines.filter((l) => l.price > 0).map((l) => l.asset));
  for (const p of film.placements) {
    const g = partsToGroup(film.parts[p.part]);
    g.position.set(...p.at);
    g.rotation.y = -deg(p.rot);
    if (!film.licensed && paid.has(p.asset)) g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.set(GREY); o.material.emissive.set(0); o.material.emissiveIntensity = 0; } });
    world.add(g);
  }
  const [Wm, Dm] = film.world.size;
  const box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(Wm, 8, Dm));
  const centre = box.getCenter(new THREE.Vector3());
  const span = Math.max(Wm, Dm) + 6;
  sun.position.set(centre.x - span * 0.6, span * 1.1, centre.z - span * 0.35);
  sun.target.position.copy(centre);
  Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, far: span * 4 });
  sun.shadow.camera.updateProjectionMatrix();

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
    const back = new THREE.Mesh(new THREE.BoxGeometry(m.w + 0.12, m.h + 0.12, 0.06), new THREE.MeshStandardMaterial({ color: "#2B2F38", roughness: 0.9 }));
    back.position.set(0, m.post + m.h / 2, 0);
    back.castShadow = true;
    g.add(face, back);
    if (m.post > 0) for (const x of [-(m.w / 2 - 0.2), m.w / 2 - 0.2]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, m.post + 0.1, 0.1), new THREE.MeshStandardMaterial({ color: "#2B2F38", roughness: 0.9 }));
      post.position.set(x, m.post / 2, 0);
      g.add(post);
    }
    world.add(g);
  }));
  const cards = {};
  await Promise.all(film.shots.filter((s) => s.card).map(async (s) => {
    const img = new Image();
    img.src = `${api}/api/films/${film.id}/art/card-${s.id}.png?w=1280`;
    await img.decode().catch(() => null);
    cards[s.id] = img;
  }));

  let timeOfDay = null;
  function setTime(t) {
    if (t === timeOfDay) return;
    timeOfDay = t;
    const night = t === "night";
    scene.background = new THREE.Color(SKY[t] || SKY.day);
    hemi.intensity = night ? 0.95 : t === "dusk" ? 1.5 : 2.2;
    ambient.intensity = night ? 0.35 : 0.55;
    hemi.color.set(night ? "#7d8fc4" : "#ffffff");
    sun.intensity = night ? 0.3 : t === "dusk" ? 1.7 : 2.1;
    sun.color.set(night ? "#9fb2ff" : t === "dusk" ? "#ffb98a" : "#fff4e0");
    world.traverse((o) => { if (o.isMesh && o.material.emissiveIntensity > 0 && !signMats.includes(o.material)) o.material.emissiveIntensity = night ? 1.25 : 0.25; });
    for (const m of signMats) m.emissiveIntensity = night ? 0.85 : t === "dusk" ? 0.35 : 0;
  }

  // the cut: where each shot starts
  const starts = [];
  let acc = 0;
  for (const s of film.shots) { starts.push(acc); acc += s.seconds; }
  const duration = acc;
  function shotAt(t) {
    let i = film.shots.length - 1;
    while (i > 0 && t < starts[i]) i--;
    const s = film.shots[i];
    return { i, shot: s, local: Math.min(1, Math.max(0, (t - starts[i]) / s.seconds)), start: starts[i] };
  }

  /** Puts the camera where shot `s` has it at progress k (0..1). */
  function pose(s, k) {
    const e = ease(k);
    if (camera.fov !== s.fov) { camera.fov = s.fov; camera.updateProjectionMatrix(); }
    if (s.kind === "dolly") {
      camera.position.copy(v3(s.from).lerp(v3(s.to), e));
      camera.lookAt(v3(s.look));
      return;
    }
    const T = v3(s.target);
    const radius = lerp(s.radius[0], s.radius[1], e), height = lerp(s.height[0], s.height[1], e);
    const az = s.kind === "orbit" ? lerp(s.from, s.to, s.kind === "orbit" ? k : e) : s.azimuth; // an orbit keeps a steady pace
    camera.position.set(T.x + radius * Math.sin(deg(az)), T.y + height, T.z + radius * Math.cos(deg(az)));
    camera.lookAt(T);
  }

  const label = film.licensed ? null : "Preview. Paid pieces are grey and signs are watermarked until the film is licensed.";
  /** Renders second `t` of the film into the composite canvas. */
  function seek(t) {
    t = Math.min(duration, Math.max(0, t));
    const { shot, local } = shotAt(t);
    setTime(shot.time);
    pose(shot, local);
    renderer.render(scene, camera);
    ctx.drawImage(renderer.domElement, 0, 0, W, H);
    if (shot.card && cards[shot.id]) {
      const a = shot.card.fade > 0 ? Math.min(1, (local * shot.seconds) / shot.card.fade) : 1;
      ctx.fillStyle = `rgba(12, 14, 20, ${shot.card.scrim * a})`;
      ctx.fillRect(0, 0, W, H);
      const img = cards[shot.id], iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
      const maxW = W * 0.58, maxH = H * 0.62, sc = Math.min(maxW / iw, maxH / ih);
      const dw = iw * sc, dh = ih * sc;
      ctx.globalAlpha = a;
      ctx.drawImage(img, (W - dw) / 2 + (1 - a) * 0, (H - dh) / 2 + (1 - ease(a)) * 14, dw, dh);
      ctx.globalAlpha = 1;
    }
    const fadeIn = Math.min(1, t / 0.5), fadeOut = Math.min(1, (duration - t) / 0.7);
    const fade = Math.min(fadeIn, fadeOut);
    if (fade < 1) { ctx.fillStyle = `rgba(0, 0, 0, ${1 - fade})`; ctx.fillRect(0, 0, W, H); }
    if (label) {
      ctx.font = `500 ${Math.round(H / 40)}px Geist, system-ui, sans-serif`;
      const pad = Math.round(H / 60), tw = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(16, 18, 22, 0.72)";
      ctx.fillRect(pad * 1.5, H - pad * 1.5 - pad * 3.4, tw + pad * 2.4, pad * 3.4);
      ctx.fillStyle = "#F3F4F6";
      ctx.textBaseline = "middle";
      ctx.fillText(label, pad * 2.7, H - pad * 1.5 - pad * 1.7);
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

  // playback on a clock (the Studio); the renderer never calls play()
  let playing = false, t0 = 0, at = 0, raf = 0;
  const listeners = new Set();
  function tick(now) {
    if (!playing) return;
    at = (now - t0) / 1000;
    if (at >= duration) { at = duration; playing = false; }
    const info = seek(at);
    for (const f of listeners) f(info, playing);
    if (playing) raf = requestAnimationFrame(tick);
  }
  function play(from = at >= duration ? 0 : at) {
    at = from; playing = true; t0 = performance.now() - from * 1000;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }
  function pause() { playing = false; cancelAnimationFrame(raf); }
  function goto(t) { at = t; const info = seek(t); for (const f of listeners) f(info, playing); if (playing) t0 = performance.now() - t * 1000; }

  /** Real-time WebM of one playthrough through MediaRecorder, for servers that can't render MP4. */
  function record() {
    return new Promise((resolve, reject) => {
      if (!("MediaRecorder" in window)) return reject(new Error("This browser can't record video"));
      const stream = out.captureStream(film.fps);
      const type = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
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

  function dispose() { pause(); renderer.dispose(); world.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); out.remove(); }

  seek(0);
  return { seek, frames, still, play, pause, goto, record, dispose, duration, starts, shotAt, get time() { return at; }, get playing() { return playing; }, onTime: (f) => (listeners.add(f), () => listeners.delete(f)), canvas: out };
}
