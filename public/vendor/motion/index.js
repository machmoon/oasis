// Motion (motion.dev, MIT), vendored as its UMD build dist/motion.js (12.43.0), which sets globalThis.Motion. This shim
// re-exports what the site uses so modules can `import { animate } from "/vendor/motion/index.js"`.
import "./motion.js";
export const { animate, spring, stagger } = globalThis.Motion;
