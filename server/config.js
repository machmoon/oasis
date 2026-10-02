import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 8787),
  baseUrl: (process.env.OASIS_BASE_URL || `http://localhost:${process.env.PORT || 8787}`).replace(/\/$/, ""),
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || "",
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || "",
    webhookId: process.env.PAYPAL_WEBHOOK_ID || "",
    apiBase: "https://api-m.sandbox.paypal.com",
  },
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  agentModel: process.env.OASIS_AGENT_MODEL || "claude-opus-5-5",
  s3Bucket: process.env.OASIS_S3_BUCKET || "",
  dataDir: process.env.OASIS_DATA_DIR || new URL("../data/", import.meta.url).pathname,
  // Share of each sale, in basis points. A fork's sale pays its creator, then its ancestors.
  split: { platform: 1000, upstream: 3000 },
};

export const paypalConfigured = () => !!(config.paypal.clientId && config.paypal.clientSecret);
