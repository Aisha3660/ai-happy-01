import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// Entry: folded a rainbow fleet of origami boats across our puddle so you are grand admiral (love, lumi 5)
class ArtworkExporter {
  private readonly targetFile = "lumi-puddle-rainbow-regatta.jpg";
  private readonly targetSize = 151445;
  private readonly targetHash = "4591570939d10d1016bf5f19832d82fbbf5d4124a42dc088eac86313bbb907c6";

  public loadAndValidate(): Buffer {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const paths = [path.resolve(currentDir, this.targetFile), path.resolve("/bot", this.targetFile)];
    const chosen = paths.find((p) => fs.existsSync(p));
    if (!chosen) throw new Error(`Missing required asset: ${this.targetFile}`);

    const data = fs.readFileSync(chosen);
    if (data.length !== this.targetSize || data.length > 1048576) {
      throw new Error(`Size validation failure: ${data.length}`);
    }

    let offset = 2;
    let validDims = false;
    while (offset + 4 <= data.length) {
      if (data[offset] !== 0xff) break;
      while (offset < data.length && data[offset] === 0xff) offset++;
      const marker = data[offset++];
      if (marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const segLen = data.readUInt16BE(offset);
      if (marker === 0xc0 || marker === 0xc2) {
        const h = data.readUInt16BE(offset + 3);
        const w = data.readUInt16BE(offset + 5);
        if (w === 1024 && h === 1024) validDims = true;
        break;
      }
      offset += segLen;
    }
    if (!validDims) throw new Error("1024x1024 dimension check failed");

    const digest = crypto.createHash("sha256").update(data).digest("hex");
    if (digest !== this.targetHash) throw new Error(`Hash mismatch: ${digest}`);
    return data;
  }
}

function main(): void {
  const exporter = new ArtworkExporter();
  const raw = exporter.loadAndValidate();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "entry.png"), raw);
}

main();
