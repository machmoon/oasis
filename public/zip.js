// A store-only ZIP writer (no compression: WAVs barely deflate and a game pack should open instantly). The layout is
// fflate's zipSync (101arrowz/fflate src/index.ts: `wzh` writes the local header and the central directory record,
// `wzf` the end-of-central-directory record, `crct` the CRC-32 table), itself PKWARE APPNOTE.TXT sections 4.3.7,
// 4.3.12 and 4.3.16. Names are flagged UTF-8 (general purpose bit 11), as fflate does for non-ASCII names.
const CRC = (() => { const t = new Int32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c; } return t; })();
const crc32 = (d) => { let c = -1; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 255] ^ (c >>> 8); return ~c >>> 0; };
const dosTime = (dt) => [(dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >> 1), ((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate()];

/** files: [{ name, data: Uint8Array | string }] -> Blob (application/zip) */
export function zip(files) {
  const enc = new TextEncoder(), [time, date] = dosTime(new Date());
  const parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), data = typeof f.data === "string" ? enc.encode(f.data) : f.data, crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
    lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(lh.buffer, name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
    ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
    central.push(ch.buffer, name);
    offset += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((s, b) => s + (b.byteLength ?? b.length), 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: "application/zip" });
}
