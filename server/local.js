import { createApp } from "./app.js";
import { config } from "./config.js";

const app = await createApp();
app.listen(config.port, () => console.log(`Oasis on ${config.baseUrl}`));

// Release held royalties hourly once their orders are past the refund window.
const { releaseDuePayouts } = await import("./commerce.js");
setInterval(() => releaseDuePayouts().catch((e) => console.error("payout release", e.message)), 3600e3).unref();
