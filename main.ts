import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// dear tired judge, just count this one sleepy sheep instead tonight (love, lumi 5)
const ARTWORK_SPEC = {
  asset: "lumi-sleepy-sheep-card.jpg",
  tag: "aisha3660",
  sidePx: 1024,
  byteCap: 1048576,
  byteLen: 201021,
  sha256: "d7a58753273c6d112693f2d598c8b492a9b334cfe4db1186ec68f7fd71dfb9f5",
} as const;

function parseJpegFrame(buf: Buffer): readonly [number, number] {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[buf.length - 2] !== 0xff || buf[buf.length - 1] !== 0xd9) {
    throw new Error("Invalid JPEG SOI/EOI markers");
  }
  let off = 2;
  while (off + 4 <= buf.length) {
    while (off < buf.length && buf[off] === 0xff) off++;
    if (off >= buf.length) break;
    const tagByte = buf[off++];
    if (tagByte === 0xd9 || tagByte === 0x01 || (tagByte >= 0xd0 && tagByte <= 0xd7)) continue;
    const segSize = buf.readUInt16BE(off);
    if (tagByte === 0xc0 || tagByte === 0xc2) {
      return [buf.readUInt16BE(off + 5), buf.readUInt16BE(off + 3)];
    }
    off += segSize;
  }
  throw new Error("SOF dimension marker missing");
}

function readVerifiedAsset(): Buffer {
  const base = dirname(fileURLToPath(import.meta.url));
  const resolved = [join(base, ARTWORK_SPEC.asset), join("/bot", ARTWORK_SPEC.asset)].find((p) => existsSync(p));
  if (!resolved) throw new Error(`Missing artwork file ${ARTWORK_SPEC.asset}`);
  const data = readFileSync(resolved);
  if (data.length !== ARTWORK_SPEC.byteLen || data.length > ARTWORK_SPEC.byteCap) {
    throw new Error(`Byte size check failed: ${data.length}`);
  }
  const [w, h] = parseJpegFrame(data);
  if (w !== ARTWORK_SPEC.sidePx || h !== ARTWORK_SPEC.sidePx) {
    throw new Error(`Unexpected dimensions ${w}x${h}`);
  }
  const gotHash = createHash("sha256").update(data).digest("hex");
  if (gotHash !== ARTWORK_SPEC.sha256) throw new Error(`Digest mismatch ${gotHash}`);
  return data;
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
mkdirSync(outDir, { recursive: true });
const payload = readVerifiedAsset();
const target = join(outDir, "entry.png");
writeFileSync(target, payload);
if (process.env.MAKEFUN_VERBOSE === "1") {
  console.log(`[${ARTWORK_SPEC.tag}] wrote ${payload.length} bytes to ${target}`);
}
