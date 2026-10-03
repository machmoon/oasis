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

const GREY = "#B9BEC7";
const ease = (k) => k * k * (3 - 2 * k); // smoothstep: cameras start and stop softly
const deg = (d) => (d * Math.PI) / 180;
const lerp = (a, b, k) => a + (b - a) * k;
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const hash = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// Light is one scalar, "dark" from 0 (day) to 1 (night), and every lighting value is read off these keyframes, so a
// shot can fade from dusk to night and the windows and signs come on as it does.
const LIGHT = {
  day: { dark: 0, sky: "#E9F0F7", hemi: 2.2, hemiColor: "#ffffff", ambient: 0.55, sun: 2.1, sunColor: "#fff4e0", glow: 0.25, sign: 0 },
  dusk: { dark: 0.5, sky: "#F6D9C4", hemi: 1.5, hemiColor: "#ffffff", ambient: 0.55, sun: 1.7, sunColor: "#ffb98a", glow: 0.7, sign: 0.35 },
  night: { dark: 1, sky: "#1B2135", hemi: 0.95, hemiColor: "#7d8fc4", ambient: 0.35, sun: 0.3, sunColor: "#9fb2ff", glow: 1.25, sign: 0.85 },
};
const MOVERS = { "town-tram": { speed: 3.2, along: "x", bounce: true }, "town-hatchback": { speed: 5.5, along: "x", bounce: false } };
const WEATHER = {
  blossom: { n: 900, color: "#F7A8C4", size: 0.22, fall: 0.9, drift: 1.1, sway: 0.6 },
  leaves: { n: 700, color: "#E58A3A", size: 0.26, fall: 1.2, drift: 1.6, sway: 0.9 },
  snow: { n: 1600, color: "#FFFFFF", size: 0.16, fall: 1.4, drift: 0.5, sway: 0.4 },
  rain: { n: 2600, color: "#B9CCE6", size: 0.08, fall: 14, drift: 1.5, sway: 0 },
};

/** Builds a film into `el` (sized to the film's aspect). Resolves to a player once every texture is loaded. */
export async function createFilmPlayer(el, film, { api = "", audio = false } = {}) {
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

  // the set: every placement, grey when its piece is paid and the film is not licensed; movers remember their rest
  const paid = new Set(film.bill.lines.filter((l) => l.price > 0).map((l) => l.asset));
  const [Wm, Dm] = film.world.size;
  const movers = [], groups = [];
  for (const p of film.placements) {
    const g = partsToGroup(film.parts[p.part]);
    g.position.set(...p.at);
    g.rotation.y = -deg(p.rot);
    if (!film.licensed && paid.has(p.asset)) g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.set(GREY); o.material.emissive.set(0); o.material.emissiveIntensity = 0; } });
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

  // weather: one Points cloud, every position a function of (time, seed)
  let weather = null;
  if (WEATHER[film.weather]) {
    const spec = WEATHER[film.weather], r = rng(hash(film.id || film.brief));
    const seeds = Float32Array.from({ length: spec.n * 4 }, () => r());
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(spec.n * 3), 3));
    const mat = new THREE.PointsMaterial({ color: spec.color, size: spec.size, sizeAttenuation: true, transparent: true, opacity: film.weather === "rain" ? 0.55 : 0.9, depthWrite: false });
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
        a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
      }
      geo.attributes.position.needsUpdate = true;
    };
  }

  // light as a continuous value between the keyframes
  const skyA = new THREE.Color(), skyB = new THREE.Color(), tmp = new THREE.Color();
  function setLight(from, to, k) {
    const A = LIGHT[from] || LIGHT.day, B = LIGHT[to || from] || A;
    const mix = (key) => lerp(A[key], B[key], k);
    scene.background = tmp.copy(skyA.set(A.sky)).lerp(skyB.set(B.sky), k).clone();
    hemi.intensity = mix("hemi"); ambient.intensity = mix("ambient"); sun.intensity = mix("sun");
    hemi.color.set(A.hemiColor).lerp(skyB.set(B.hemiColor), k);
    sun.color.set(A.sunColor).lerp(skyB.set(B.sunColor), k);
    const glow = mix("glow"), sign = mix("sign");
    world.traverse((o) => { if (o.isMesh && o.material.emissiveIntensity > 0 && !signMats.includes(o.material)) o.material.emissiveIntensity = glow; });
    for (const m of signMats) m.emissiveIntensity = sign;
    return mix("dark");
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
    const az = s.kind === "orbit" ? lerp(s.from, s.to, k) : s.azimuth; // an orbit keeps a steady pace
    camera.position.set(T.x + radius * Math.sin(deg(az)), T.y + height, T.z + radius * Math.cos(deg(az)));
    camera.lookAt(T);
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
    if (!img) return;
    const c = shot.card, secs = local * shot.seconds, remain = (1 - local) * shot.seconds;
    const a = c.fade > 0 ? Math.min(1, secs / c.fade, c.layout === "lower" ? remain / c.fade : 1) : 1;
    if (a <= 0) return;
    const iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
    if (c.layout === "lower") {
      const dw = Math.min(W * 0.34, H * 0.5), dh = (dw * ih) / iw, x = W * 0.05, y = H - dh - H * 0.08;
      ctx.globalAlpha = a;
      ctx.drawImage(img, x - (1 - ease(a)) * 24, y, dw, dh);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.fillStyle = `rgba(12, 14, 20, ${c.scrim * a})`;
    ctx.fillRect(0, 0, W, H);
    const maxW = W * 0.58, maxH = H * 0.62, sc = Math.min(maxW / iw, maxH / ih), dw = iw * sc, dh = ih * sc;
    ctx.globalAlpha = a;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2 + (1 - ease(a)) * 14, dw, dh);
    ctx.globalAlpha = 1;
  }

  const vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.78);
  vignette.addColorStop(0, "rgba(0,0,0,0)"); vignette.addColorStop(1, "rgba(0,0,0,0.42)");
  const label = film.licensed ? null : "Preview. Paid pieces are grey and signs are watermarked until the film is licensed.";
  let building = false; // during the build-in the first frame is drawn without its fade from black
  /** Renders second `t` of the film into the composite canvas. */
  function seek(t) {
    t = Math.min(duration, Math.max(0, t));
    const { shot, local } = shotAt(t);
    const dark = setLight(shot.time, shot.timeTo, shot.timeTo ? ease(local) : 0);
    pose(shot, local);
    move(t);
    weather?.(t);
    renderer.render(scene, camera);
    ctx.drawImage(renderer.domElement, 0, 0, W, H);
    // the grade: a warm or cool wash with the light, then a vignette
    ctx.fillStyle = dark > 0.5 ? `rgba(24, 34, 80, ${(dark - 0.5) * 0.22})` : `rgba(255, 160, 90, ${(0.5 - Math.abs(dark - 0.5)) * 0.14})`;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
    if (shot.card) drawCard(shot, local);
    const fadeIn = building ? 1 : Math.min(1, t / 0.5), fadeOut = Math.min(1, (duration - t) / 0.7);
    const fade = Math.min(fadeIn, fadeOut);
    if (fade < 1) { ctx.fillStyle = `rgba(0, 0, 0, ${1 - fade})`; ctx.fillRect(0, 0, W, H); }
    if (label) {
      ctx.font = `500 ${Math.round(Math.min(W, H) / 40)}px Geist, system-ui, sans-serif`;
      const pad = Math.round(Math.min(W, H) / 60), tw = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(16, 18, 22, 0.72)";
      ctx.fillRect(pad * 1.5, H - pad * 1.5 - pad * 3.4, Math.min(tw + pad * 2.4, W - pad * 3), pad * 3.4);
      ctx.fillStyle = "#F3F4F6";
      ctx.textBaseline = "middle";
      ctx.fillText(label, pad * 2.7, H - pad * 1.5 - pad * 1.7, W - pad * 5.4);
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
    at = from; playing = true; t0 = performance.now() - from * 1000;
    if (track) { track.currentTime = from; track.play().catch(() => {}); }
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }
  function pause() { playing = false; cancelAnimationFrame(raf); track?.pause(); }
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

  function dispose() { pause(); track?.pause(); renderer.dispose(); world.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); out.remove(); }

  seek(0);
  return { seek, frames, still, play, pause, goto, buildIn, record, dispose, duration, starts, shotAt, get time() { return at; }, get playing() { return playing; }, onTime: (f) => (listeners.add(f), () => listeners.delete(f)), canvas: out, track };
}
