// Knob schema follows Polyfork's (lucas-martinic/polyfork-unity-connector, Runtime/PolyforkKnob.cs):
// type is color | range | choice | toggle, with label, default, min/max/step and options, plus
// named colourway presets that map colour knobs to hex. Oasis adds `text`, because design assets
// carry words (labels, names, headlines) where 3D models do not.

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Fills in defaults and clamps/validates every supplied value against the schema. */
export function resolveKnobs(params, input = {}) {
  const out = {};
  for (const [name, k] of Object.entries(params?.knobs || {})) {
    const v = input[name];
    switch (k.type) {
      case "color":
        out[name] = typeof v === "string" && HEX.test(v) ? v.toUpperCase() : k.default;
        break;
      case "range": {
        let n = Number(v);
        if (v === undefined || v === null || v === "" || Number.isNaN(n)) n = k.default;
        n = Math.min(k.max, Math.max(k.min, n));
        if (k.step) n = Math.round((n - k.min) / k.step) * k.step + k.min;
        out[name] = Math.round(n * 10000) / 10000;
        break;
      }
      case "choice":
        out[name] = k.options?.includes(v) ? v : k.default;
        break;
      case "toggle":
        out[name] = v === undefined ? !!k.default : v === true || v === "true" || v === 1;
        break;
      case "text":
        out[name] = typeof v === "string" ? v.slice(0, k.maxLength || 80) : k.default;
        break;
      default:
        out[name] = v ?? k.default;
    }
  }
  return out;
}

/** Applies a named colourway preset, then explicit overrides on top. */
export function applyPreset(params, presetName, input = {}) {
  const preset = params?.presets?.[presetName] || {};
  return { ...preset, ...input };
}

/** Only the knobs that differ from defaults — what a remix "is". */
export function diffFromDefaults(params, values) {
  const d = {};
  for (const [name, k] of Object.entries(params?.knobs || {})) {
    if (values[name] !== k.default) d[name] = values[name];
  }
  return d;
}

/** Brand Mode: a brand is seven role colours; every colour knob that declares a role takes its colour. */
export const ROLES = ["background", "surface", "ink", "muted", "primary", "secondary", "highlight"];
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
export const mix = (a, b, t) => rgbToHex(hexToRgb(a).map((v, i) => v + (hexToRgb(b)[i] - v) * t));

/** Fills surface and muted from the core five when a brand omits them. */
export function completeBrand(b) {
  const out = Object.fromEntries(Object.entries(b || {}).filter(([k, v]) => ROLES.includes(k) && HEX.test(v)));
  out.background ||= "#FFFFFF";
  out.ink ||= "#1C1A17";
  out.primary ||= out.ink;
  out.surface ||= mix(out.background, out.ink, 0.06);
  out.muted ||= mix(out.ink, out.background, 0.55);
  out.secondary ||= mix(out.primary, out.ink, 0.35);
  out.highlight ||= out.secondary;
  return out;
}

export function brandKnobs(params, brand) {
  const b = completeBrand(brand);
  const out = {};
  for (const [name, k] of Object.entries(params?.knobs || {})) if (k.type === "color" && k.role && HEX.test(b[k.role] || "")) out[name] = b[k.role].toUpperCase();
  // A light/dark choice follows the brand's background, so dark brands get dark components.
  const [r, g, bl] = [1, 3, 5].map((i) => parseInt(b.background.slice(i, i + 2), 16));
  const dark = (r * 299 + g * 587 + bl * 114) / 1000 < 110;
  for (const [name, k] of Object.entries(params?.knobs || {})) {
    if (k.type === "choice" && k.options?.includes("light") && k.options?.includes("dark")) out[name] = dark ? "dark" : "light";
    if (k.type === "toggle" && /^(dark|darkMode|dark_mode)$/i.test(name)) out[name] = dark;
  }
  return out;
}
