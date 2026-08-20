import { promises as fs } from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";

const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const defaultOgPath = path.join(publicDir, "og", "default.svg");
const defaultOgPngPath = path.join(publicDir, "og", "default.png");

const pngWidth = 1200;
const pngHeight = 630;

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);

  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function buildDefaultPng() {
  const rowLength = 1 + pngWidth * 4;
  const raw = Buffer.alloc(rowLength * pngHeight);

  for (let y = 0; y < pngHeight; y += 1) {
    const rowOffset = y * rowLength;
    raw[rowOffset] = 0;

    for (let x = 0; x < pngWidth; x += 1) {
      const offset = rowOffset + 1 + x * 4;
      const berry = (x - 220) ** 2 + (y - 180) ** 2 < 92 ** 2;
      const moss = (x - 1010) ** 2 + (y - 500) ** 2 < 130 ** 2;
      const titleBand = x >= 90 && x <= 760 && y >= 250 && y <= 340;
      const subtitleBand = x >= 104 && x <= 760 && y >= 380 && y <= 420;
      const color = titleBand
        ? [26, 20, 16]
        : subtitleBand
          ? [122, 106, 94]
          : berry
            ? [146, 48, 48]
            : moss
              ? [110, 142, 107]
              : [244, 236, 224];

      raw[offset] = color[0];
      raw[offset + 1] = color[1];
      raw[offset + 2] = color[2];
      raw[offset + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(pngWidth, 0);
  ihdr.writeUInt32BE(pngHeight, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

await fs.mkdir(path.dirname(defaultOgPath), { recursive: true });

try {
  await fs.access(defaultOgPath);
} catch {
  await fs.writeFile(
    defaultOgPath,
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="Floriva">
  <rect width="1200" height="630" fill="#F4ECE0"/>
  <circle cx="220" cy="180" r="92" fill="#923030" opacity=".9"/>
  <circle cx="1010" cy="500" r="130" fill="#6E8E6B" opacity=".75"/>
  <text x="96" y="330" fill="#1A1410" font-family="Newsreader, Georgia, serif" font-size="104">Floriva</text>
  <text x="104" y="408" fill="#7A6A5E" font-family="Inter Tight, Arial, sans-serif" font-size="38">Privacy-first period tracking</text>
</svg>
`,
    "utf8",
  );
}

await fs.writeFile(defaultOgPngPath, buildDefaultPng());

console.log("OG image surface ready");
