import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
const [rooms, bosses] = process.argv.slice(2);
if (!rooms || !bosses)
  throw new Error(
    "Usage: node scripts/optimize-icons.mjs <reviewed-room-png> <reviewed-boss-png>",
  );
await sharp(rooms)
  .resize(760, 608, { fit: "fill" })
  .webp({ quality: 95, alphaQuality: 100 })
  .toFile("v2/public/icons/rooms-transparent.webp");
await sharp(bosses)
  .resize(304, 152, { fit: "fill" })
  .webp({ quality: 95, alphaQuality: 100 })
  .toFile("v2/public/icons/bosses-transparent.webp");
let css = readFileSync("v2/public/room-art.css", "utf8")
  .replaceAll("rooms-transparent.png", "rooms-transparent.webp")
  .replaceAll("art-0.webp", "rooms-transparent.webp");
css = css
  .replace(
    /\.icon-architect\{[^}]+\}/g,
    ".icon-architect{background-image:url('./icons/bosses-transparent.webp');background-size:76px 38px;background-position:0 0}",
  )
  .replace(
    /\.icon-royal\{[^}]+\}/g,
    ".icon-royal{background-image:url('./icons/bosses-transparent.webp');background-size:76px 38px;background-position:-38px 0}",
  );
writeFileSync("v2/public/room-art.css", css);
console.log("Reviewed transparent derivatives optimized with alpha preserved.");
