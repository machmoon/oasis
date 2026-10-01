// Tiny document store: one JSON object per record. Files on disk locally, S3 objects when deployed,
// so the Lambda deployment needs no database.
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

let s3;
async function s3c() {
  if (!s3) {
    const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } = await import("@aws-sdk/client-s3");
    s3 = { client: new S3Client({}), GetObjectCommand, PutObjectCommand, ListObjectsV2Command };
  }
  return s3;
}

const safe = (s) => String(s).replace(/[^a-zA-Z0-9_.-]/g, "_");

export async function put(coll, id, doc) {
  const body = JSON.stringify(doc);
  if (config.s3Bucket) {
    const { client, PutObjectCommand } = await s3c();
    await client.send(new PutObjectCommand({ Bucket: config.s3Bucket, Key: `${coll}/${safe(id)}.json`, Body: body, ContentType: "application/json" }));
  } else {
    const dir = path.join(config.dataDir, coll);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${safe(id)}.json`), body);
  }
  return doc;
}

export async function get(coll, id) {
  try {
    if (config.s3Bucket) {
      const { client, GetObjectCommand } = await s3c();
      const r = await client.send(new GetObjectCommand({ Bucket: config.s3Bucket, Key: `${coll}/${safe(id)}.json` }));
      return JSON.parse(await r.Body.transformToString());
    }
    return JSON.parse(fs.readFileSync(path.join(config.dataDir, coll, `${safe(id)}.json`), "utf8"));
  } catch {
    return null;
  }
}

export async function list(coll) {
  if (config.s3Bucket) {
    const { client, ListObjectsV2Command } = await s3c();
    const keys = [];
    let token;
    do {
      const r = await client.send(new ListObjectsV2Command({ Bucket: config.s3Bucket, Prefix: `${coll}/`, ContinuationToken: token }));
      for (const o of r.Contents || []) keys.push(o.Key);
      token = r.IsTruncated ? r.NextContinuationToken : undefined;
    } while (token);
    const docs = await Promise.all(keys.map((k) => get(coll, path.basename(k, ".json"))));
    return docs.filter(Boolean);
  }
  const dir = path.join(config.dataDir, coll);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
}
