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
