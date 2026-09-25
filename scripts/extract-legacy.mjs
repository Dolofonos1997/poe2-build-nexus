import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import vm from "node:vm";
const html = readFileSync("index.html", "utf8");
mkdirSync("v2/src/data", { recursive: true });
mkdirSync("v2/public/icons", { recursive: true });
// Read only the reviewed literal tables, never execute the legacy application's scripts.
for (const [name, pattern] of Object.entries({
  rooms: /const R=(\{[\s\S]*?\n\})\s*let architectDefeated/,
  builds: /const HUB_BUILDS=(\[[\s\S]*?\n\]);/,
})) {
  const match = html.match(pattern);
  if (!match) throw new Error(`Missing ${name}`);
  const value = vm.runInNewContext(`(${match[1]})`, Object.create(null), {
    timeout: 100,
  });
  if (name === "rooms")
    for (const room of Object.values(value)) delete room.ico;
  if (name === "builds")
    for (const build of value) {
      delete build.dps;
      delete build.ehp;
      delete build.cost;
      build.example = true;
    }
  writeFileSync(
    `v2/src/data/${name}.json`,
    JSON.stringify(value, null, 2) + "\n",
  );
}
let css =
  "/* Original user-supplied artwork extracted from V24.6. */\n.room-art{display:inline-block;width:38px;height:38px;background-repeat:no-repeat;background-size:190px 152px;flex-shrink:0}\n";
const seen = new Map();
let count = 0;
for (const match of html.matchAll(
  /\.icon-([a-z]+)\{background-image:url\(data:image\/webp;base64,([^)]*)\);([^}]+)\}/g,
)) {
  let filename = seen.get(match[2]);
  if (!filename) {
    filename = `art-${seen.size}.webp`;
    seen.set(match[2], filename);
    writeFileSync(
      `v2/public/icons/${filename}`,
      Buffer.from(match[2], "base64"),
    );
  }
  css += `.icon-${match[1]}{background-image:url('./icons/${filename}');${match[3]}}\n`;
  count++;
}
writeFileSync("v2/public/room-art.css", css);
console.log(`Extracted ${count} icon mappings / ${seen.size} images`);
