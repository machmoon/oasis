// A minimal PNG writer for the sound previews (waveform and spectrogram): RGBA pixels in, one IDAT out, deflated by
// node:zlib. It is the packer pngjs uses (lib/packer.js: filter byte 0 per scanline, IHDR/IDAT/IEND, CRC32 per chunk),
// kept to what Oasis needs so previews don't go through SVG and resvg for a picture that is only pixels.
import zlib from "node:zlib";

const CRC = new Int32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c; }
const crc32 = (buf) => { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); out.write(type, 4, "ascii"); data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** rgba: Uint8Array of width*height*4. Returns PNG bytes. */
export function encodePng(rgba, width, height) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0))]);
}

/** A tiny drawing surface: fill rects and vertical lines into RGBA, then encode. */
export function canvas(width, height, bg = [255, 255, 255, 255]) {
  const px = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) px.set(bg, i * 4);
  // Porter-Duff "source over" (straight alpha), so a transparent ground stays transparent under soft strokes
  const put = (x, y, c) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4, sa = (c[3] ?? 255) / 255, da = px[i + 3] / 255, oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    for (let k = 0; k < 3; k++) px[i + k] = Math.round((c[k] * sa + px[i + k] * da * (1 - sa)) / oa);
    px[i + 3] = Math.round(oa * 255);
  };
  return {
    width, height, px, put,
    rect(x, y, w, h, c) { for (let j = Math.max(0, y); j < Math.min(height, y + h); j++) for (let i = Math.max(0, x); i < Math.min(width, x + w); i++) put(i, j, c); },
    vline(x, y0, y1, c) { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) put(x, y, c); },
    png() { return encodePng(px, width, height); },
  };
}
