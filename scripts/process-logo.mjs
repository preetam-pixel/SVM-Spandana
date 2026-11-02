// Crops the SVM logo to its artwork and turns the sand background transparent.
import sharp from "sharp";

const [input, outDir] = process.argv.slice(2);
const img = sharp(input).ensureAlpha();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;

// Background colour = median of the four corners.
const px = (x, y) => { const i = (y * width + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const corners = [px(5, 5), px(width - 6, 5), px(5, height - 6), px(width - 6, height - 6)];
const bg = [0, 1, 2].map((c) => corners.map((p) => p[c]).sort((a, b) => a - b)[2]);

let minX = width, minY = height, maxX = 0, maxY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const d = Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
    // Fully transparent near the background, soft edge between 28 and 70.
    const a = d < 28 ? 0 : d > 70 ? 255 : Math.round(((d - 28) / 42) * 255);
    data[i + 3] = a;
    if (a > 40) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  }
}
const pad = 12;
const box = { left: Math.max(0, minX - pad), top: Math.max(0, minY - pad), width: Math.min(width, maxX + pad) - Math.max(0, minX - pad), height: Math.min(height, maxY + pad) - Math.max(0, minY - pad) };
const raw = { raw: { width, height, channels: 4 } };
await sharp(data, raw).extract(box).png().toFile(`${outDir}/svm-logo.png`);
// Original-background version, cropped the same way (for cards / social previews).
await sharp(input).extract(box).png().toFile(`${outDir}/svm-logo-sand.png`);
console.log("bg", bg, "crop", box);
