import { describe, it, expect } from "vitest";
import {
  convertOfficialTree,
  allocationPath,
  removeAllocation,
  type OfficialData,
} from "./official-tree";
import { fitsSlot, parseItemText } from "./equipment";
import { newBuild, parseBuild, type PassiveNode } from "./builds";
const raw = {
  classes: [{ name: "Witch", overridePairs: { "2": 22 }, ascendancies: [] }],
  skillOverrides: {
    "22": {
      name: "Minion Power",
      stats: ["[Minion|Minions] deal 10% increased Damage"],
      icon: "minion.png",
    },
  },
  edges: [],
  nodes: {
    "1": { name: "Start", x: 0, y: 0, classStartIndex: [0], out: ["2"] },
    "2": { name: "Spell Power", x: 100, y: 0, out: ["3"], in: ["1"] },
    "3": { name: "Keystone", x: 200, y: 0, isKeystone: true, in: ["2"] },
    "4": { name: "Other Ascendancy", x: 10, y: 10, ascendancyId: "Other" },
  },
} as OfficialData;
describe("official passive tree", () => {
  it("applies class overrides to IDs, links, artwork and stats", () => {
    const nodes = convertOfficialTree(raw, "Witch");
    expect(nodes.map((n) => n.id)).toEqual(["1", "22", "3"]);
    expect(nodes[0].links).toEqual(["22"]);
    expect(nodes[1]).toMatchObject({
      name: "Minion Power",
      icon: "minion.png",
      description: "Minions deal 10% increased Damage",
    });
    expect(nodes[2].kind).toBe("keystone");
  });
  it("finds a connected shortest path and refunds dependent branches", () => {
    const nodes = convertOfficialTree(raw, "Witch");
    expect(allocationPath(nodes, [], "1", "3")).toEqual(["22", "3"]);
    expect(removeAllocation(nodes, ["22", "3"], "1", "22")).toEqual([]);
  });
  it("cannot use another class start as a shortcut", () => {
    const nodes: PassiveNode[] = [
      {
        id: "a",
        name: "A",
        x: 0,
        y: 0,
        links: ["b"],
        description: "",
        starts: [0],
      },
      {
        id: "b",
        name: "B",
        x: 1,
        y: 0,
        links: ["a", "c"],
        description: "",
        starts: [1],
      },
      { id: "c", name: "C", x: 2, y: 0, links: ["b"], description: "" },
    ];
    expect(allocationPath(nodes, [], "a", "c")).toBeNull();
    expect(allocationPath(nodes, ["c"], "a", "c")).toBeNull();
  });
});
describe("equipment", () => {
  it("filters slots including flask bases, talismans and offhand exclusions", () => {
    expect(fitsSlot({ itemClass: "Helmet" }, "Helmet")).toBe(true);
    expect(fitsSlot({ itemClass: "Helmet" }, "Weapon")).toBe(false);
    expect(fitsSlot({ itemClass: "Two Hand Mace" }, "Offhand")).toBe(false);
    expect(
      fitsSlot(
        { itemClass: "Flask", base: "Ultimate Mana Flask" },
        "Mana Flask",
      ),
    ).toBe(true);
    expect(fitsSlot({ itemClass: "Talisman" }, "Weapon")).toBe(true);
  });
  it("parses copied game items without losing raw rolls", () => {
    const raw =
      "Item Class: Helmets\nRarity: Rare\nDoom Crown\nFelt Cap\n--------\nEvasion Rating: 123\n--------\n+30 to maximum Life\n+20% to Fire Resistance";
    const item = parseItemText(raw, "Helmet");
    expect(item).toMatchObject({
      name: "Doom Crown",
      base: "Felt Cap",
      rarity: "Rare",
      raw,
    });
    expect(item.mods).toContain("+30 to maximum Life");
    expect(() => parseItemText("not an item", "Helmet")).toThrow();
  });
  it("preserves selected catalogue details through build import", () => {
    const b = newBuild();
    b.gear[0] = {
      slot: "Weapon",
      name: "Test",
      base: "Wand",
      mods: "mod",
      price: 2,
      rarity: "Unique",
      icon: "https://web.poecdn.com/item.png",
      properties: "Level: 5",
      itemClass: "Wand",
    };
    expect(parseBuild(b).gear[0]).toMatchObject(b.gear[0]);
  });
});
