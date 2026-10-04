// The edit layer: what turns a camera move into a cut. Speed ramps, camera shake, transitions (whip, zoom-through,
// glitch, flash), a 3D title that slams into the street, and the finishing passes (bloom, depth of field, grade,
// grain). Everything here is a function of the film and the second, never of the clock or Math.random, so the
// Studio preview and the frame-by-frame render are the same picture.
//
// Where each piece comes from:
// - Speed ramps are Robert Penner's easings as written in ai/easings.net (src/easings/easingsFunctions.ts).
// - Camera shake follows pmndrs/drei (src/core/CameraShake.tsx): yaw, pitch and roll each read their own noise
//   channel, scaled by intensity squared. drei uses SimplexNoise on the clock; this reads three's ImprovedNoise at
//   the film's second, seeded by the film, so a shake lands on the same frame in every render.
// - Motion blur is Remotion's CameraMotionBlur (remotion-dev/remotion, packages/motion-blur/src/CameraMotionBlur.tsx):
//   draw the frame at several sub-frame times inside the shutter, each at 1/n opacity, added together. Remotion
//   always draws every sample; here a frame takes as many samples as the camera is moving, so a still frame costs one.
// - The glitch is three's DigitalGlitch (examples/jsm/shaders/DigitalGlitch.js, after staffantan/unityglitch): band
//   displacement, an RGB split and snow. Its GlitchPass seeds from Math.random every frame; here the seed is the
//   frame number.
// - The zoom-through is the zoom blur from evanw/glfx.js (src/filters/blur/zoomblur.js): 40 taps toward a centre,
//   weighted 4(p - p^2).
// - Bloom and depth of field are three's UnrealBloomPass and BokehPass on an EffectComposer, as in
//   examples/webgl_postprocessing_unreal_bloom.html and webgl_postprocessing_dof.html.
// - The 3D title is examples/webgl_geometry_text.html: FontLoader and a bevelled extrusion (TextGeometry is an
//   ExtrudeGeometry of font.generateShapes; here it is built per glyph so the word can be tracked). Its face is Anton (SIL
//   OFL, public/fonts/Anton-OFL.txt), converted to three's typeface JSON by scripts/font-to-typeface.mjs, a port of
//   gero3/facetype.js.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";

// ---------- speed ramps (easings.net) ----------
const pow = Math.pow;
export const CURVES = {
  linear: (x) => x,
  smooth: (x) => x * x * (3 - 2 * x),
  // the classic After Effects ramp: fast out of the cut, hang in the middle, fast into the next
  expo: (x) => (x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? pow(2, 20 * x - 10) / 2 : (2 - pow(2, -20 * x + 10)) / 2),
  // a "punch": the move happens in the first third, then the shot breathes (easeOutExpo)
  punch: (x) => (x === 1 ? 1 : 1 - pow(2, -10 * x)),
  // a slow build that snaps at the end (easeInExpo), for the shot before a hit
  build: (x) => (x === 0 ? 0 : pow(2, 10 * x - 10)),
  quart: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - pow(-2 * x + 2, 4) / 2),
};
export const curve = (name) => CURVES[name] || CURVES.smooth;

// ---------- edit styles: the film-wide finish ----------
export const STYLES = {
  clean: { bloom: 0.12, bloomNight: 0.55, dof: 0.6, grain: 0.03, vignette: 0.3, shutter: 0.5, rgb: 0, glitch: 0, contrast: 1.05, sat: 1.04, lift: 0.006 },
  hype: { bloom: 0.18, bloomNight: 0.75, dof: 0.35, grain: 0.03, vignette: 0.4, shutter: 0.75, rgb: 0, glitch: 1, contrast: 1.1, sat: 1.07, lift: -0.004 },
  dream: { bloom: 0.35, bloomNight: 0.9, dof: 1.0, grain: 0.025, vignette: 0.36, shutter: 0.75, rgb: 0, glitch: 0, contrast: 0.97, sat: 0.96, lift: 0.03 },
};

// ---------- deterministic noise and hashes ----------
const noise = new ImprovedNoise();
const hash = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7) >>> 0;

/**
 * Shake at second t as [yaw, pitch, roll] radians. Two sources, as an operator's hand and an impact: a steady
 * handheld wobble at `amount`, and hits that kick hard and decay (drei's decay, as an exponential of time since the
 * hit). Intensity is squared, as drei does, so small amounts stay subtle.
 */
export function shakeAt(t, amount, hits, seed) {
  let k = amount * amount * 0.6;
  for (const h of hits) if (t >= h) k += Math.exp(-(t - h) * 7) * 1.0;
  if (k <= 1e-4) return [0, 0, 0];
  const s = (seed % 1000) / 10, f = 7.5;
  return [0.045 * k * noise.noise(t * f, s, 1.7), 0.035 * k * noise.noise(s, t * f, 4.1), 0.05 * k * noise.noise(t * f * 0.8, 9.3, s)];
}

// ---------- the finishing shader: grade, RGB split, glitch, zoom blur, flash, grain, vignette ----------
const EditShader = {
  uniforms: {
    tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1280, 720) }, uFrame: { value: 0 },
    uRGB: { value: 0 }, uAngle: { value: 0 }, uGlitch: { value: 0 }, uZoom: { value: 0 }, uFlash: { value: 0 }, uFade: { value: 0 },
    uGrain: { value: 0.04 }, uVignette: { value: 0.35 }, uContrast: { value: 1 }, uSat: { value: 1 }, uLift: { value: 0 },
    uTint: { value: new THREE.Vector3(1, 1, 1) }, uTintAmt: { value: 0 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uFrame;
    uniform float uRGB, uAngle, uGlitch, uZoom, uFlash, uFade, uGrain, uVignette, uContrast, uSat, uLift, uTintAmt;
    uniform vec3 uTint;
    varying vec2 vUv;
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 split(vec2 p, float amount, float angle) {
      vec2 o = amount * vec2(cos(angle), sin(angle));
      return vec3(texture2D(tDiffuse, p + o).r, texture2D(tDiffuse, p).g, texture2D(tDiffuse, p - o).b);
    }
    void main() {
      vec2 p = vUv;
      float seed = rand(vec2(uFrame, 3.7));
      // DigitalGlitch: displaced horizontal bands and blocks, seeded by the frame number
      if (uGlitch > 0.0) {
        float band = floor(p.y * mix(14.0, 42.0, seed) + seed * 9.0);
        float r = rand(vec2(band, uFrame));
        if (r < 0.3 * uGlitch) p.x += (rand(vec2(band, uFrame + 1.0)) - 0.5) * 0.07 * uGlitch;
        vec2 blk = floor(p * vec2(18.0, 10.0));
        if (rand(blk + uFrame) < 0.04 * uGlitch) p += (vec2(rand(blk), rand(blk.yx)) - 0.5) * 0.03 * uGlitch;
      }
      vec3 c;
      // glfx.js zoom blur toward the centre for the zoom-through
      if (uZoom > 0.0) {
        vec3 acc = vec3(0.0); float total = 0.0;
        vec2 toCentre = vec2(0.5) - p;
        float off = rand(p * uRes + uFrame);
        for (float t = 0.0; t <= 24.0; t++) {
          float pc = (t + off) / 24.0; float w = 4.0 * (pc - pc * pc);
          acc += texture2D(tDiffuse, p + toCentre * pc * uZoom).rgb * w; total += w;
        }
        c = acc / total;
      } else {
        float amt = uRGB + uGlitch * 0.005 * (0.5 + seed);
        c = amt > 0.0 ? split(p, amt, uAngle + seed * 6.2831 * step(0.001, uGlitch)) : texture2D(tDiffuse, p).rgb;
      }
      if (uGlitch > 0.0) c += uGlitch * 0.15 * vec3(rand(floor(gl_FragCoord.xy / 2.0) + uFrame) * 0.2); // snow
      // grade: lift, contrast around mid grey, saturation, a tint toward the light
      c = c + uLift;
      c = (c - 0.5) * uContrast + 0.5;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c = mix(c, c * uTint, uTintAmt);
      // vignette, grain, flash, fade from black
      vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y;
      c *= 1.0 - uVignette * smoothstep(0.35, 1.05, length(q));
      c += (rand(vUv * uRes + uFrame * 1.31) - 0.5) * uGrain;
      c = mix(c, vec3(1.0), uFlash);
      c = mix(c, vec3(0.0), uFade);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

/**
 * The finishing chain for one renderer: scene -> bloom -> depth of field -> edit shader -> sRGB output.
 * Returns render(params), which draws one finished picture into the renderer's canvas.
 */
export function createFinish(renderer, scene, camera, W, H, styleName) {
  const style = STYLES[styleName] || STYLES.clean;
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  // A single NaN pixel (a degenerate normal on a bevel, say) is harmless until bloom blurs it across the frame, so
  // the HDR picture is made finite before anything spreads it.
  composer.addPass(new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: EditShader.vertexShader,
    fragmentShader: /* glsl */ `uniform sampler2D tDiffuse; varying vec2 vUv;
      void main() { vec4 c = texture2D(tDiffuse, vUv); bool bad = any(isnan(c)) || any(isinf(c)); gl_FragColor = bad ? vec4(0.0, 0.0, 0.0, 1.0) : min(c, vec4(64.0)); }`,
  }));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), style.bloom, 0.55, 0.82);
  composer.addPass(bloom);
  const bokeh = new BokehPass(scene, camera, { focus: 20, aperture: 0.0002, maxblur: 0.006 });
  bokeh.enabled = style.dof > 0;
  composer.addPass(bokeh);
  const edit = new ShaderPass(EditShader);
  edit.uniforms.uRes.value.set(W, H);
  composer.addPass(edit);
  composer.addPass(new OutputPass());
  const u = edit.uniforms;
  return {
    style,
    /** p: { frame, dark, focus, rgb, angle, glitch, zoom, flash, fade, tint, tintAmt } */
    render(p) {
      bloom.strength = style.bloom + (style.bloomNight - style.bloom) * p.dark + (p.flash || 0) * 0.6;
      bloom.threshold = 1.0 - p.dark * 0.25; // only what is brighter than white glows: windows and signs at night
      bloom.radius = 0.4;
      if (bokeh.enabled) {
        bokeh.uniforms.focus.value = p.focus;
        bokeh.uniforms.aperture.value = 0.00012 * style.dof * (p.dofScale ?? 1);
        bokeh.uniforms.maxblur.value = 0.008 * style.dof;
      }
      u.uFrame.value = p.frame;
      u.uRGB.value = style.rgb + (p.rgb || 0);
      u.uAngle.value = p.angle || 0;
      u.uGlitch.value = Math.min(1, (p.glitch || 0) * (style.glitch || 0.6));
      u.uZoom.value = p.zoom || 0;
      u.uFlash.value = p.flash || 0;
      u.uFade.value = p.fade || 0;
      u.uGrain.value = style.grain;
      u.uVignette.value = style.vignette;
      u.uContrast.value = style.contrast;
      u.uSat.value = style.sat;
      u.uLift.value = style.lift;
      u.uTint.value.set(...(p.tint || [1, 1, 1]));
      u.uTintAmt.value = p.tintAmt || 0;
      composer.render();
    },
    dispose() { composer.dispose?.(); },
  };
}

// ---------- transitions ----------
// Each cut lives on the boundary between two shots and has a window either side of it. env() is 0 outside the
// window and peaks at 1 on the cut itself.
export const TRANSITIONS = {
  cut: { pre: 0, post: 0 },
  whip: { pre: 0.15, post: 0.15 },
  zoom: { pre: 0.12, post: 0.16 },
  glitch: { pre: 0.06, post: 0.16 },
  flash: { pre: 0.04, post: 0.3 },
};
/**
 * The transition state at second t: which cut (if any) is near, its kind, how far into it (-1 before .. 0 on the cut
 * .. 1 after), and an envelope that is 1 on the cut.
 */
export function transitionAt(t, starts, shots) {
  for (let i = 1; i < shots.length; i++) {
    const kind = shots[i].cut || "cut", T = TRANSITIONS[kind] || TRANSITIONS.cut, at = starts[i];
    if (t >= at - T.pre && t <= at + T.post && (T.pre || T.post)) {
      const u = t < at ? -(at - t) / T.pre : (t - at) / T.post;
      const env = 1 - Math.abs(u);
      return { i, kind, u, env: env * env * (3 - 2 * env) };
    }
  }
  return null;
}

// ---------- the 3D title ----------
let fontPromise = null;
const FONT_URL = "/fonts/anton.typeface.json";
export function loadFont() { return (fontPromise ||= new Promise((res, rej) => new FontLoader().load(FONT_URL, res, undefined, rej))); }

/**
 * An extruded title with a bevel, the way the three.js text example builds it (two materials: face and sides). A name
 * longer than 8 letters stacks on two centred lines so it fits between the buildings of one street.
 */
export async function makeTitle(text, { color = "#E5484D", side = "#1B1F2A", size = 1.4 } = {}) {
  const font = await loadFont();
  const words = text.trim().split(/\s+/);
  const lines = text.length > 8 && words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [text];
  // the face catches light and glows a little; the sides are the same colour in shadow, not an outline
  const face = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.08, emissive: new THREE.Color(color), emissiveIntensity: 0.35 });
  const edge = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.42), roughness: 0.55, metalness: 0.1 });
  const g = new THREE.Group();
  let width = 0;
  const lead = size * 1.3; // clear air between the lines
  // Glyph by glyph rather than one TextGeometry per line, so the word gets tracking: three's Font lays glyphs out at
  // their advance (FontLoader.js createPaths, offsetX += glyph.ha * scale) and a condensed face like Anton then touches.
  const scale = size / font.data.resolution, track = size * 0.07;
  const opts = { depth: size * 0.34, curveSegments: 8, bevelEnabled: true, bevelThickness: size * 0.035, bevelSize: size * 0.018, bevelSegments: 4 };
  lines.forEach((line, i) => {
    const row = new THREE.Group();
    let x = 0;
    for (const ch of line) {
      const glyph = font.data.glyphs[ch] || font.data.glyphs["?"];
      if (ch !== " ") {
        const geo = new THREE.ExtrudeGeometry(font.generateShapes(ch, size), opts);
        geo.translate(x, 0, 0);
        const mesh = new THREE.Mesh(geo, [face, edge]);
        mesh.castShadow = true;
        row.add(mesh);
      }
      x += (glyph?.ha ?? 500) * scale + track;
    }
    const w = x - track;
    row.position.set(-w / 2, (lines.length - 1 - i) * lead, -opts.depth / 2);
    g.add(row);
    width = Math.max(width, w);
  });
  g.userData.width = width;
  g.userData.height = lead * (lines.length - 1) + size;
  g.userData.face = face;
  return g;
}

/** Where the title is at progress `secs` into its shot: it drops from the sky and slams down at `at`. */
export function titlePose(secs, at) {
  const fall = 0.42, k = Math.min(1, Math.max(0, (secs - (at - fall)) / fall));
  const drop = 1 - CURVES.build(k); // accelerate into the ground, like a thing falling
  const settle = secs > at ? Math.exp(-(secs - at) * 9) * Math.sin((secs - at) * 30) * 0.08 : 0;
  return { visible: secs >= at - fall, y: drop * 9, squash: 1 - settle, tilt: drop * 0.35 };
}

export const seedOf = (film) => hash(film.id || film.brief || "oasis");
