// Renders a sound program off the main thread: the page posts the program's source (a free sound's, or a licensed
// one's) and knobs; the worker imports it as a module from a blob URL and runs build(knobs, ctx) with the same DSP
// kit the server sandbox uses, so the samples match the server's to the bit (same code, same seeded PRNG).
import { renderProgram } from "/sound-runtime.js";

const modules = new Map();
async function load(source) {
  if (modules.has(source)) return modules.get(source);
  const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  const p = import(url).finally(() => URL.revokeObjectURL(url));
  modules.set(source, p);
  if (modules.size > 12) modules.delete(modules.keys().next().value);
  return p;
}
self.onmessage = async (e) => {
  const { id, source, knobs, sr } = e.data;
  try {
    const mod = await load(source);
    const t = performance.now();
    const { samples, values } = renderProgram(mod, knobs, sr);
    self.postMessage({ id, samples, sr, values, ms: Math.round(performance.now() - t) }, [samples.buffer]);
  } catch (err) { self.postMessage({ id, error: err.message }); }
};
