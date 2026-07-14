// Generates the PWA icons (solid eucalyptus background with a serif-ish "C" ring)
// without any image dependencies — writes PNGs directly via zlib.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public");
mkdirSync(outDir, { recursive: true });

const BG = [0x3d, 0x5a, 0x4c];
const FG = [0xfa, 0xfa, 0xf8];

// Standard table-based CRC32.
const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, c]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  // raw scanlines with filter byte 0
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const p = (y * size + x) * 3;
      raw[row + 1 + x * 3] = pixels[p];
      raw[row + 1 + x * 3 + 1] = pixels[p + 1];
      raw[row + 1 + x * 3 + 2] = pixels[p + 2];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function drawIcon(size) {
  const px = Buffer.alloc(size * size * 3);
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.30;
  const rInner = size * 0.185;
  // The "C": an annulus with an opening facing right (±38°).
  const gap = (38 * Math.PI) / 180;
  const aa = 1.25; // soft edge in px
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const ang = Math.atan2(dy, dx); // -PI..PI, 0 = right
      let cov = 0;
      if (Math.abs(ang) > gap) {
        const outer = Math.min(1, Math.max(0, (rOuter - d) / aa));
        const inner = Math.min(1, Math.max(0, (d - rInner) / aa));
        cov = outer * inner;
      }
      const p = (y * size + x) * 3;
      for (let c = 0; c < 3; c++) {
        px[p + c] = Math.round(BG[c] + (FG[c] - BG[c]) * cov);
      }
    }
  }
  return encodePng(size, px);
}

for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  writeFileSync(join(outDir, name), drawIcon(size));
  console.log(`wrote public/${name}`);
}
