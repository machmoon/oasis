// Looks: seven ways to draw the same program, applied to a createViewer() instance (public/world3d.js) after each
// rebuild. The approach is the one Polyfork describes in "Three.js shader looks, now live on every model"
// (polyfork.dev/blog/six-shader-looks-and-which-ones-you-can-keep): patch three's material shaders at the named
// chunks rather than write materials from scratch. Dither is patched at `#include <dithering_fragment>` and PS1 at
// `#include <project_vertex>` (three/src/renderers/shaders/ShaderChunk). Ink uses EdgesGeometry lines
// (three/src/geometries/EdgesGeometry.js) instead of an inverted hull, because a hull of a merged box mesh opens at
// every corner, while edge lines are the natural outline of block geometry. The toon ramp is the three-step gradient
// from three/examples/webgl_materials_variations_toon.html.
//
// The runtime's materials are shared between every mesh of a colour (blocks-runtime.js material()), so a look never
// edits them: it swaps each mesh's material for its own and keeps the original in userData to put back.
import * as THREE from "three";

export const LOOKS = [
  { id: "studio", label: "Studio", ships: true, note: "Flat-shaded, lit, as the Studio films it." },
  { id: "clay", label: "Clay", ships: true, note: "One matte grey. What an unlicensed piece looks like." },
  { id: "ink", label: "Ink", ships: false, note: "Unlit colour with an edge line on every block." },
  { id: "flat", label: "Flat", ships: true, note: "No lighting; every face shows its pure colour." },
  { id: "dither", label: "Dither", ships: false, note: "Four shades per channel, a Bayer 4x4 threshold." },
  { id: "pixel", label: "Pixel", ships: false, note: "Drawn at a fifth of the size and scaled back up." },
  { id: "ps1", label: "PS1", ships: false, note: "Vertices snap to a coarse grid after projection." },
];

let ramp = null;
function toonRamp() {
  if (ramp) return ramp;
  // three steps; the scene's lights are bright, so the top step sits well under white to keep the colour
  const data = new Uint8Array([70, 110, 150]);
  ramp = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  return ramp;
}

const DITHER = `
  {
    // Ordered dithering in sRGB (after tone mapping and colour-space conversion), so the steps stay even in the shadows.
    const mat4 bayer = mat4(0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
    ivec2 px = ivec2(mod(gl_FragCoord.xy, 4.0));
    float th = (bayer[px.x][px.y] + 0.5) / 16.0;
    float levels = 4.0;
    gl_FragColor.rgb = floor(gl_FragColor.rgb * levels + th) / levels;
  }`;

const SNAP = `
  #include <project_vertex>
  {
    // PS1: snap the projected position to a grid in clip space, the way the console's fixed-point pipeline did.
    float grid = 36.0;
    vec4 c = gl_Position;
    c.xy = floor(c.xy / c.w * grid + 0.5) / grid * c.w;
    gl_Position = c;
  }`;

function patched(base, { dither = false, snap = false }) {
  const m = base.clone();
  m.onBeforeCompile = (shader) => {
    if (dither) shader.fragmentShader = shader.fragmentShader.replace("#include <dithering_fragment>", "#include <dithering_fragment>" + DITHER);
    if (snap) shader.vertexShader = shader.vertexShader.replace("#include <project_vertex>", SNAP);
  };
  m.customProgramCacheKey = () => `look${dither ? "D" : ""}${snap ? "S" : ""}`;
  return m;
}

function materialFor(look, base, night) {
  const color = base.color.clone();
  const glow = base.emissiveIntensity > 0;
  switch (look) {
    case "clay": {
      const m = new THREE.MeshStandardMaterial({ color: "#C9CBD1", flatShading: true, roughness: 1, metalness: 0, side: THREE.DoubleSide });
      if (glow && night) { m.emissive.set("#FFC870"); m.emissiveIntensity = 0.9; }
      return m;
    }
    case "ink": {
      // unlit colour with a two-step toon shadow, pushed back a little so the edge lines sit on top
      const m = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      if (glow) { m.emissive.set("#FFC870"); m.emissiveIntensity = night ? 1 : 0.2; }
      return m;
    }
    case "flat": {
      const m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      if (glow && night) m.color.set("#FFD58A");
      return m;
    }
    case "dither": return patched(base, { dither: true });
    case "ps1": return patched(base, { snap: true });
    default: return null;
  }
}

/**
 * Applies a look to everything in the viewer's content group. Call again after every setParts(); call with
 * "studio" to restore. Returns the look that is now on.
 */
export function applyLook(viewer, look, { night = false } = {}) {
  const { renderer, content } = viewer;
  const canvas = renderer.domElement;
  // pixel: a smaller buffer, scaled back up by the browser (polyfork's "the one effect that makes rendering cheaper")
  const pixel = look === "pixel";
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (renderer.getPixelRatio() !== (pixel ? dpr / 5 : dpr)) {
    renderer.setPixelRatio(pixel ? dpr / 5 : dpr);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight || 1, false);
  }
  canvas.style.imageRendering = pixel ? "pixelated" : "";

  content.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.lookBase) {
      if (o.material !== o.userData.lookBase) o.material.dispose?.();
      o.material = o.userData.lookBase;
    }
    if (o.userData.lookEdges) { o.remove(o.userData.lookEdges); o.userData.lookEdges.geometry.dispose(); o.userData.lookEdges = null; }
    const m = materialFor(look, o.material, night);
    if (m) { o.userData.lookBase = o.material; o.material = m; }
    if (look === "ink") {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 20), new THREE.LineBasicMaterial({ color: "#14161E" }));
      o.add(edges);
      o.userData.lookEdges = edges;
    }
  });
  return look;
}
