import { type Gear } from "./builds";
export type CatalogueItem = Gear & {
  id: string;
  category: string;
  variant: string;
  level: number;
  fetchedAt: string;
};
export function fitsSlot(item: Pick<Gear, "itemClass" | "base">, slot: string) {
  const c = (item.itemClass || "").toLowerCase();
  if (slot.startsWith("Weapon"))
    return (
      /sword|axe|mace|sceptre|scepter|wand|staff|bow|crossbow|spear|flail|dagger|claw|talisman/.test(
        c,
      ) && !/quiver/.test(c)
    );
  if (slot.startsWith("Offhand"))
    return (
      /shield|buckler|quiver|focus|sword|axe|mace|sceptre|wand|dagger|claw/.test(
        c,
      ) && !/two hand|two-hand/.test(c)
    );
  if (slot === "Life Flask" || slot === "Mana Flask")
    return (
      c.includes("flask") &&
      `${item.base || ""} ${c}`
        .toLowerCase()
        .includes(slot === "Life Flask" ? "life" : "mana")
    );
  const terms: Record<string, string[]> = {
    Helmet: ["helmet"],
    "Body Armour": ["body armour"],
    Gloves: ["gloves"],
    Boots: ["boots"],
    Amulet: ["amulet"],
    "Ring I": ["ring"],
    "Ring II": ["ring"],
    Belt: ["belt"],
    "Life Flask": ["life flask"],
    "Mana Flask": ["mana flask"],
    "Charm I": ["charm"],
    "Charm II": ["charm"],
    "Charm III": ["charm"],
  };
  return (terms[slot] || []).some((t) => c.includes(t));
}
export function parseItemText(raw: string, slot: string): Gear {
  if (raw.length > 20000) throw Error("Item text is too long.");
  const lines = raw.replace(/\r/g, "").split("\n");
  const rarityIndex = lines.findIndex((l) => l.startsWith("Rarity:"));
  if (rarityIndex < 0)
    throw Error(
      "Copy the item in game (Ctrl+C), then paste the complete item text including Rarity.",
    );
  const rarity = lines[rarityIndex].slice(7).trim(),
    header: string[] = [];
  for (
    let i = rarityIndex + 1;
    i < lines.length && !/^[-]{3,}/.test(lines[i]);
    i++
  )
    if (lines[i].trim()) header.push(lines[i].trim());
  if (!header.length) throw Error("Item name is missing.");
  const sections = raw.replace(/\r/g, "").split(/\n-{3,}\n/);
  const propertySections = sections
    .slice(1)
    .filter((s) =>
      /^(Quality:|Physical Damage:|Elemental Damage:|Armour:|Evasion Rating:|Energy Shield:|Requirements:|Charges:|Recovers|Item Level:|Sockets:)/m.test(
        s,
      ),
    );
  const mods = sections
    .slice(1)
    .filter(
      (s) => !propertySections.includes(s) && !/^Corrupted$/.test(s.trim()),
    )
    .join("\n");
  return {
    slot,
    name: header[0],
    base: header[1] || header[0],
    rarity,
    itemClass:
      lines
        .find((l) => l.startsWith("Item Class:"))
        ?.slice(11)
        .trim() || "",
    mods,
    properties: propertySections.join("\n"),
    raw,
    price: 0,
  };
}
