import { writeFile, mkdir, readFile } from "node:fs/promises";
const root = "https://poe.ninja/poe2/api/economy/";
const headers = {
  "User-Agent":
    "PoE2BuildNexus/2.2 (+https://github.com/Dolofonos1997/poe2-build-nexus)",
};
const categories = [
  "UniqueWeapons",
  "UniqueArmours",
  "UniqueAccessories",
  "UniqueFlasks",
  "UniqueCharms",
];
const clean = (s) =>
  s.replace(/\[([^\]|]+)\|([^\]]+)\]/g, "$2").replace(/\[([^\]]+)\]/g, "$1");
const text = (rows) =>
  (rows || [])
    .filter((r) => typeof r.text === "string")
    .map((r) => clean(r.text))
    .join("\n");
const output = "v2/public/items.json";
let old = { items: [] };
try {
  old = JSON.parse(await readFile(output, "utf8"));
} catch {
  /* first run */
}
let league = old.league;
try {
  const response = await fetch(root + "leagues", {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error("Item league discovery unavailable");
  const leagues = await response.json();
  if (!leagues[0]?.id) throw Error("No item leagues");
  league = leagues[0].id;
} catch (e) {
  if (!league) throw e;
  console.warn("Using cached catalogue league:", e.message);
}
const items = [];
for (const category of categories) {
  try {
    const r = await fetch(
      root +
        `stash/current/item/overview?league=${encodeURIComponent(league)}&type=${category}`,
      { headers, signal: AbortSignal.timeout(20000) },
    );
    if (!r.ok) throw Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (!Array.isArray(data.lines) || !data.lines.length)
      throw Error("Empty category");
    const seen = new Set();
    for (const n of data.lines) {
      if (!n.name || !n.baseType || !n.icon) continue;
      const key = n.detailsId || String(n.id);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: category + ":" + key,
        category,
        name: n.name,
        base: n.baseType,
        icon: n.icon,
        itemClass: clean(n.category || ""),
        rarity: "Unique",
        mods: text([
          ...(n.implicitModifiers || []),
          ...(n.explicitModifiers || []),
        ]),
        properties: text([
          ...(n.propertyModifiers || []),
          ...(n.requirementModifiers || []),
        ]),
        variant: n.variant || "",
        level: n.levelRequired || 0,
        source: "https://poe.ninja/poe2/economy",
        fetchedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn(`${category}: ${e.message}`);
    items.push(...old.items.filter((i) => i.category === category));
  }
}
if (!items.length) throw Error("No item catalogue available");
await mkdir("v2/public", { recursive: true });
await writeFile(output, JSON.stringify({ version: 1, league, items }));
console.log(`Saved ${items.length} real unique item variants.`);
