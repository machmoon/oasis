// The registry: every 3D asset is an ES module you can import from a URL, and every import is licensed.
//
//   import { createAsset } from "https://<host>/cdn/town-shop.mjs?lic=<licence>";
//   scene.add(createAsset({ floors: 3 }));
//
// With a valid licence the module is the asset's own source plus the shared block runtime
// (public/blocks-runtime.js). A page that imports it with no licence still loads, so a scene never breaks, but
// the piece is a grey placeholder of the same footprint. Anything that is not a browser <script> import (an agent,
// curl, a build step) gets HTTP 402 Payment Required instead, in the shape of Coinbase's x402 v2 transport
// (github.com/coinbase/x402, specs/transports-v2/http.md): a base64 PAYMENT-REQUIRED header naming the price, and
// a retry with a PAYMENT-SIGNATURE header that settles the payment and returns the module with PAYMENT-RESPONSE.
// x402 settles on-chain; Oasis registers one fiat scheme instead ("exact", network "paypal:sandbox", asset "USD",
// which x402's spec allows: "Token contract address or ISO 4217 currency code for fiat", x402-specification-v2.md),
// and the payment payload is a funded Oasis mandate: settling it charges the human's PayPal Vault wallet.
import * as catalog from "./catalog.js";
import * as commerce from "./commerce.js";
import { bounds } from "./blocks.js";
import { config } from "./config.js";

export const X402_VERSION = 2;
export const NETWORK = "paypal:sandbox";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64");
export const unb64 = (s) => { try { return JSON.parse(Buffer.from(String(s), "base64").toString("utf8")); } catch { return null; } };

export const moduleUrl = (id, lic) => `${config.baseUrl}/cdn/${id}.mjs${lic ? `?lic=${lic}` : ""}`;

/** The x402 PaymentRequired object for one asset (core/src/types/payments.ts field names). */
export function paymentRequired(a) {
  return {
    x402Version: X402_VERSION,
    error: "A license is required to import this asset.",
    resource: { url: moduleUrl(a.id), description: `${a.title} by ${a.author}: license to import and ship`, mimeType: "text/javascript" },
    accepts: [{
      scheme: "exact",
      network: NETWORK,
      asset: "USD",
      amount: String(Math.round(a.price * 100)), // smallest unit, as x402 does: cents
      payTo: a.author,
      maxTimeoutSeconds: 60,
      extra: { assetId: a.id, payload: "{ mandate: <funded Oasis mandate token> }", budget: `${config.baseUrl}/#/budget` },
    }],
  };
}

/** Licensed module: the asset program, unchanged, plus createAsset() on the shared runtime. */
export function licensedModule(a, lic) {
  return `// ${a.title} by ${a.author}, from Oasis (${config.baseUrl}/#/a/${a.id})
// Licensed: ${lic.token.slice(0, 8)}... (order ${lic.orderId}). This module is a program: change the knobs, the model rebuilds.
import { partsToGroup, resolveKnobs } from "${config.baseUrl}/cdn/runtime.mjs";

${a.source.trim()}

/** A THREE.Group in metres, y up, front facing -z. Knobs: ${Object.keys(a.params?.knobs || {}).join(", ")}. */
export function createAsset(knobs = {}) {
  const values = resolveKnobs(params, knobs);
  const group = partsToGroup(build(values).parts);
  group.name = ${JSON.stringify(a.id)};
  group.userData.oasis = { id: ${JSON.stringify(a.id)}, author: ${JSON.stringify(a.author)}, licence: ${JSON.stringify(lic.token)}, knobs: values };
  return group;
}
`;
}

/** Unlicensed module for browser imports: a grey block of the real footprint, so the scene still runs. */
export async function placeholderModule(a) {
  const { parts } = await catalog.buildAsync(a, {});
  const [lo, hi] = bounds(parts);
  const box = { t: "box", p: lo, s: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]].map((v) => Math.max(0.1, v)), c: "#B8BEC8" };
  return `// ${a.title} by ${a.author}: NOT LICENSED. This is a grey placeholder with the real footprint.
// Get a licence (agents: POST ${config.baseUrl}/api/buy, or retry this URL with x402) and import ?lic=<licence>.
import { partsToGroup } from "${config.baseUrl}/cdn/runtime.mjs";
console.warn(${JSON.stringify(`Oasis: "${a.title}" is unlicensed, so it renders as a grey placeholder. $${a.price.toFixed(2)} to ${a.author}.`)});
export const meta = ${JSON.stringify({ title: a.title, author: a.author, licensed: false })};
export function createAsset() {
  const group = partsToGroup([${JSON.stringify(box)}]);
  group.name = ${JSON.stringify(a.id + ":unlicensed")};
  group.userData.oasis = { id: ${JSON.stringify(a.id)}, licensed: false };
  return group;
}
`;
}

// ---------- sound programs ----------
// A licensed sound import is the program plus the sound runtime (public/sound-runtime.js: knobs, the DSP kit, Web
// Audio glue): createSound(knobs) returns samples, and play(ctx, knobs) puts them through the page's AudioContext.
export function licensedSoundModule(a, lic) {
  return `// ${a.title} by ${a.author}, from Oasis (${config.baseUrl}/#/a/${a.id})
// Licensed: ${lic.token.slice(0, 8)}... (order ${lic.orderId}). This module is a program: set the knobs at the call site and
// every call is a fresh render; change the seed and it is a different take of the same sound.
import { renderProgram, toAudioBuffer, play as playBuffer, dsp } from "${config.baseUrl}/cdn/sound-runtime.mjs";

${a.source.trim()}

const mod = { meta, params, build };
/** { sr, samples: Float32Array, values }. Knobs: ${Object.keys(a.params?.knobs || {}).join(", ")}. */
export function createSound(knobs = {}, sr = 44100) {
  const r = renderProgram(mod, knobs, sr);
  r.oasis = { id: ${JSON.stringify(a.id)}, author: ${JSON.stringify(a.author)}, licence: ${JSON.stringify(lic.token)} };
  return r;
}
/** Renders with the context's sample rate and plays at once (or at \`when\` seconds from now). Returns the source node. */
export function play(ctx, knobs = {}, opts = {}) {
  const { samples, sr } = createSound(knobs, ctx.sampleRate);
  return playBuffer(ctx, toAudioBuffer(ctx, samples, sr), opts);
}
export { dsp };
`;
}

/** Unlicensed browser import of a sound: a soft placeholder tick of the real length, so a scene still runs and is heard to be unlicensed. */
export function placeholderSoundModule(a) {
  return `// ${a.title} by ${a.author}: NOT LICENSED. createSound() returns a placeholder tick of the real length.
// Get a licence (agents: POST ${config.baseUrl}/api/buy, or retry this URL with x402) and import ?lic=<licence>.
import { toAudioBuffer, play as playBuffer } from "${config.baseUrl}/cdn/sound-runtime.mjs";
console.warn(${JSON.stringify(`Oasis: "${a.title}" is unlicensed, so it plays as a placeholder tick. $${a.price.toFixed(2)} to ${a.author}.`)});
export const meta = ${JSON.stringify({ title: a.title, author: a.author, licensed: false, duration: a.duration })};
export function createSound(knobs = {}, sr = 44100) {
  const n = Math.round(${a.duration} * sr), samples = new Float32Array(n);
  for (let i = 0; i < Math.min(n, sr * 0.08); i++) samples[i] = 0.2 * Math.sin(2 * Math.PI * 2400 * i / sr) * Math.exp(-i / (sr * 0.02));
  return { sr, samples, values: knobs, oasis: { id: ${JSON.stringify(a.id)}, licensed: false } };
}
export function play(ctx, knobs = {}, opts = {}) { const { samples, sr } = createSound(knobs, ctx.sampleRate); return playBuffer(ctx, toAudioBuffer(ctx, samples, sr), opts); }
`;
}

/** Settles an x402 retry: the payload carries a funded mandate token; one vaulted PayPal order buys the licence. */
export async function settle(a, header, { agentName } = {}) {
  const p = unb64(header);
  if (!p || p.x402Version !== X402_VERSION) throw Object.assign(new Error("PAYMENT-SIGNATURE must be base64 JSON with x402Version 2"), { status: 400 });
  if (p.accepted?.network !== NETWORK || p.accepted?.scheme !== "exact") throw Object.assign(new Error(`Unsupported payment kind: Oasis accepts exact/${NETWORK}`), { status: 400 });
  if (String(p.accepted?.amount) !== String(Math.round(a.price * 100))) throw Object.assign(new Error("Accepted amount does not match the current price; fetch the 402 again"), { status: 409 });
  const order = await commerce.buyWithMandate(String(p.payload?.mandate || ""), [{ assetId: a.id, knobs: p.payload?.knobs || {} }], { agentName: agentName || p.payload?.agent || null });
  const lic = order.licenses.find((l) => l.assetId === a.id);
  return { order, lic, response: b64({ success: true, transaction: order.id, network: NETWORK, payer: order.payer?.email || null, amount: String(Math.round(a.price * 100)), extensions: { licence: lic.token, module: moduleUrl(a.id, lic.token) } }) };
}

export const headerOf = b64;
