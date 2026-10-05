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
  // a hit is a second, or { t, k } for a softer one (a piece landing, a knob turning)
  for (const h of hits) { const ht = typeof h === "number" ? h : h.t, hk = typeof h === "number" ? 1 : h.k ?? 1; if (t >= ht) k += Math.exp(-(t - ht) * 7) * hk; }
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
    uTint: { value: new THREE.Vector3(1, 1, 1) }, uTintAmt: { value: 0 }, uBlur: { value: new THREE.Vector2(0, 0) },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uFrame;
    uniform float uRGB, uAngle, uGlitch, uZoom, uFlash, uFade, uGrain, uVignette, uContrast, uSat, uLift, uTintAmt;
    uniform vec3 uTint; uniform vec2 uBlur;
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
      } else if (dot(uBlur, uBlur) > 0.0) {
        // the whip's smear: a directional blur along the pan (glfx.js src/filters/blur/triangleblur.js), on top of
        // the sub-frame samples, so a fast pan reads as one streak and not as a stack of ghosts
        vec3 acc = vec3(0.0); float total = 0.0;
        float off = rand(p * uRes + uFrame) - 0.5;
        for (float t = -8.0; t <= 8.0; t++) {
          float pc = (t + off) / 8.0; float w = 1.0 - abs(pc);
          acc += texture2D(tDiffuse, p + uBlur * pc).rgb * w; total += w;
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

// ---------- looks: a film-wide shader grade ----------
// After Polyfork's shader looks (polyfork.dev/blog/six-shader-looks-and-which-ones-you-can-keep), where each is a
// per-model viewer toggle. Here a look is chosen once for the film. Two passes carry them:
// - ToonShader, before bloom, in linear light: the lit colour is posterised into bands, and an outline is drawn where
//   depth breaks (a Sobel on the depth buffer, after three's SobelOperatorShader, with the width in pixels as their
//   post says an outline should be).
// - LookOutShader, after the sRGB output: pixelation (sample a coarser grid: render small, scale up), ordered
//   dithering (a 4x4 Bayer matrix on the final sRGB values, their "at least four levels"), and palette reduction
//   (nearest of up to eight colours in OKLab, Bjorn Ottosson's conversion, as their reduction matches colours).
// - PS1 is a vertex-stage patch on the set's materials (patchLook): the projected position is snapped to a coarse
//   clip-space grid after projection, "not in world space, which gives a permanently mangled model".
export const LOOKS = {
  none: {},
  toon: { bands: 5, outline: 1.6 },
  pixel: { pixel: 6 },
  dither: { pixel: 2, levels: 5, dither: 1 },
  ps1: { snap: 160, pixel: 3, levels: 12, dither: 0.6 },
  palette: { pixel: 4, palette: true, dither: 1 },
};
const ToonShader = {
  uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uBands: { value: 4 }, uOutline: { value: 1.6 }, uNear: { value: 0.1 }, uFar: { value: 600 }, uInk: { value: new THREE.Color("#141821") } },
  vertexShader: EditShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tDepth; uniform vec2 uRes; uniform float uBands, uOutline, uNear, uFar; uniform vec3 uInk;
    varying vec2 vUv;
    float lin(vec2 p) { float d = texture2D(tDepth, p).x; return (2.0 * uNear) / (uFar + uNear - d * (uFar - uNear)); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      // bands on a gamma'd luminance, never darker than four fifths of the lit value, so shade stays readable
      if (l > 1e-4) { float q = (floor(pow(l, 0.55) * uBands) + 0.5) / uBands; c.rgb *= clamp(pow(q, 1.0 / 0.55) / l, 0.8, 1.35); }
      vec2 px = uOutline / uRes;
      float z = lin(vUv);
      float e = abs(lin(vUv + vec2(px.x, 0.0)) - z) + abs(lin(vUv - vec2(px.x, 0.0)) - z) + abs(lin(vUv + vec2(0.0, px.y)) - z) + abs(lin(vUv - vec2(0.0, px.y)) - z);
      float edge = smoothstep(0.0025, 0.009, e / max(z, 0.02));
      c.rgb = mix(c.rgb, uInk, edge * 0.92);
      gl_FragColor = c;
    }`,
};
const LookOutShader = {
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uPixel: { value: 0 }, uLevels: { value: 0 }, uDither: { value: 0 }, uPalN: { value: 0 }, uPal: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) } },
  vertexShader: EditShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uPixel, uLevels, uDither; uniform int uPalN; uniform vec3 uPal[8];
    varying vec2 vUv;
    vec3 oklab(vec3 c) {
      vec3 lin = pow(c, vec3(2.2));
      float l = 0.4122214708 * lin.r + 0.5363325363 * lin.g + 0.0514459929 * lin.b;
      float m = 0.2119034982 * lin.r + 0.6806995451 * lin.g + 0.1073969566 * lin.b;
      float s = 0.0883024619 * lin.r + 0.2817188376 * lin.g + 0.6299787005 * lin.b;
      float l_ = pow(l, 1.0 / 3.0), m_ = pow(m, 1.0 / 3.0), s_ = pow(s, 1.0 / 3.0);
      return vec3(0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_, 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_, 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_);
    }
    void main() {
      vec2 p = vUv;
      if (uPixel > 0.0) p = (floor(vUv * uRes / uPixel) + 0.5) * uPixel / uRes;
      vec3 c = texture2D(tDiffuse, p).rgb;
      if (uDither > 0.0) {
        // 4x4 Bayer, indexed by the (coarse) pixel
        vec2 cell = uPixel > 0.0 ? floor(vUv * uRes / uPixel) : floor(vUv * uRes);
        int ix = int(mod(cell.x, 4.0)), iy = int(mod(cell.y, 4.0));
        float m[16]; m[0]=0.0; m[1]=8.0; m[2]=2.0; m[3]=10.0; m[4]=12.0; m[5]=4.0; m[6]=14.0; m[7]=6.0; m[8]=3.0; m[9]=11.0; m[10]=1.0; m[11]=9.0; m[12]=15.0; m[13]=7.0; m[14]=13.0; m[15]=5.0;
        float b = (m[iy * 4 + ix] + 0.5) / 16.0 - 0.5;
        float amt = uPalN > 0 ? 0.08 : (uLevels > 0.0 ? 1.0 / uLevels : 0.0);
        c += b * amt * uDither;
      }
      if (uLevels > 0.0) c = floor(clamp(c, 0.0, 1.0) * uLevels + 0.5) / uLevels;
      if (uPalN > 0) {
        vec3 lab = oklab(clamp(c, 0.0, 1.0)); float best = 1e9; vec3 pick = c;
        for (int i = 0; i < 8; i++) { if (i >= uPalN) break; vec3 d = oklab(uPal[i]) - lab; float dist = dot(d, d); if (dist < best) { best = dist; pick = uPal[i]; } }
        c = pick;
      }
      gl_FragColor = vec4(c, 1.0);
    }`,
};
/** PS1 vertex snapping on a material: patched once, keyed, so it survives three's program cache. */
export function patchLook(material, lookName) {
  const look = LOOKS[lookName];
  if (!look?.snap || material.userData.look === lookName) return;
  material.userData.look = lookName;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSnap = { value: new THREE.Vector2(look.snap, Math.round(look.snap * 9 / 16)) };
    shader.vertexShader = "uniform vec2 uSnap;\n" + shader.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\n gl_Position.xy = floor(gl_Position.xy / gl_Position.w * uSnap) / uSnap * gl_Position.w;");
  };
  material.customProgramCacheKey = () => `look-${lookName}`;
  material.needsUpdate = true;
}

/**
 * The finishing chain for one renderer: scene -> (toon) -> bloom -> depth of field -> edit shader -> sRGB output
 * -> (pixel, dither, palette). Returns render(params), which draws one finished picture into the renderer's canvas.
 */
export function createFinish(renderer, scene, camera, W, H, styleName, { look: lookName = "none", palette = [], ink } = {}) {
  const style = STYLES[styleName] || STYLES.clean;
  const look = LOOKS[lookName] || LOOKS.none;
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
  // toon reads the depth buffer: one extra depth-only render of the scene per frame, into its own target
  let toon = null, depthRT = null;
  const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking });
  if (look.bands) {
    depthRT = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture: new THREE.DepthTexture(W, H, THREE.UnsignedIntType) });
    toon = new ShaderPass(ToonShader);
    toon.uniforms.tDepth.value = depthRT.depthTexture;
    toon.uniforms.uRes.value.set(W, H);
    toon.uniforms.uBands.value = look.bands;
    toon.uniforms.uOutline.value = look.outline * (Math.min(W, H) / 1080);
    toon.uniforms.uNear.value = camera.near; toon.uniforms.uFar.value = camera.far;
    if (ink) toon.uniforms.uInk.value.set(ink);
    composer.addPass(toon);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), style.bloom, 0.55, 0.82);
  composer.addPass(bloom);
  const bokeh = new BokehPass(scene, camera, { focus: 20, aperture: 0.0002, maxblur: 0.006 });
  bokeh.enabled = style.dof > 0 && !look.pixel; // a pixel look has no shallow focus: every pixel is a decision
  composer.addPass(bokeh);
  const edit = new ShaderPass(EditShader);
  edit.uniforms.uRes.value.set(W, H);
  composer.addPass(edit);
  composer.addPass(new OutputPass());
  if (look.pixel || look.levels || look.palette) {
    const out = new ShaderPass(LookOutShader);
    out.uniforms.uRes.value.set(W, H);
    out.uniforms.uPixel.value = (look.pixel || 0) * (Math.min(W, H) / 1080);
    out.uniforms.uLevels.value = look.levels || 0;
    out.uniforms.uDither.value = look.dither || 0;
    const pal = look.palette ? palette.slice(0, 8) : [];
    out.uniforms.uPalN.value = pal.length;
    pal.forEach((hex, i) => { const c = new THREE.Color(hex); out.uniforms.uPal.value[i].set(c.r, c.g, c.b); });
    composer.addPass(out);
  }
  const u = edit.uniforms;
  return {
    style,
    look: lookName,
    /** p: { frame, dark, focus, rgb, angle, glitch, zoom, flash, fade, tint, tintAmt, blur } */
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
      u.uBlur.value.set(...(p.blur || [0, 0]));
      if (toon) {
        // depth of the meshes only: points (weather) and lines (clay edges) are not surfaces and draw no outline
        const was = scene.overrideMaterial, hidden = [];
        scene.traverse((o) => { if ((o.isPoints || o.isLine) && o.visible) { o.visible = false; hidden.push(o); } });
        scene.overrideMaterial = depthMat;
        renderer.setRenderTarget(depthRT); renderer.clear(); renderer.render(scene, camera); renderer.setRenderTarget(null);
        scene.overrideMaterial = was;
        for (const o of hidden) o.visible = true;
      }
      composer.render();
    },
    dispose() { composer.dispose?.(); depthRT?.dispose(); },
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
  // a match cut: the incoming camera inherits the outgoing look direction and eases into its own
  match: { pre: 0, post: 0.45 },
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

/**
 * Where the title is at progress `secs` into its shot: it drops from the sky and slams down at `at`, and the slam has
 * weight: a squash on landing, a shock ring that runs out across the road (0..1 over half a second), dust that
 * rises and thins, and a chromatic kick that decays.
 */
export function titlePose(secs, at) {
  const fall = 0.42, k = Math.min(1, Math.max(0, (secs - (at - fall)) / fall));
  const drop = 1 - CURVES.build(k); // accelerate into the ground, like a thing falling
  const since = secs - at;
  const settle = since > 0 ? Math.exp(-since * 9) * Math.sin(since * 30) * 0.08 : 0;
  const squash = since > 0 ? 1 - settle - Math.exp(-since * 18) * 0.16 : 1;
  const ring = since > 0 ? Math.min(1, since / 0.55) : 0;
  return { visible: secs >= at - fall, y: drop * 9, squash, tilt: drop * 0.35, ring: since > 0 ? CURVES.punch(ring) : 0, ringAlpha: since > 0 ? Math.max(0, 1 - ring) : 0, dust: since > 0 ? Math.min(1, since / 0.9) : 0, kick: since > 0 ? Math.exp(-since * 11) : 0 };
}

/** The build-in: when a placement lands, as a share 0..1 of the build window. Mirrored in server/film-music.js (landAt). */
export function dropOrder(p, W) {
  const ground = p.asset === "town-plaza" || p.asset === "town-road";
  const h = (hash(p.id) % 1000) / 1000;
  return ground ? 0.04 + 0.14 * h : 0.22 + 0.62 * Math.min(1, Math.max(0, p.at[0] / Math.max(1, W))) + 0.12 * h;
}

export const seedOf = (film) => hash(film.id || film.brief || "oasis");
