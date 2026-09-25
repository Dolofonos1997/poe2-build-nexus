import examples from "../data/builds.json";
export type Gear = { slot: string; name: string; mods: string; price: number };
export type PassiveNode = {
  id: string;
  name: string;
  x: number;
  y: number;
  links: string[];
  description: string;
};
export type Build = {
  id: string;
  title: string;
  cls: string;
  asc: string;
  skill: string;
  budget: string;
  tags: string[];
  notes: string;
  gear: Gear[];
  skills: { skill: string; supports: string }[];
  nodes: PassiveNode[];
  treeSource?: string;
  allocated: string[];
  example: boolean;
  updated: string;
};
export const slots = [
  "Weapon",
  "Offhand",
  "Weapon II",
  "Offhand II",
  "Helmet",
  "Body Armour",
  "Gloves",
  "Boots",
  "Amulet",
  "Ring I",
  "Ring II",
  "Belt",
  "Life Flask",
  "Mana Flask",
  "Charm I",
  "Charm II",
  "Charm III",
];
export const classes = [
  "Warrior",
  "Ranger",
  "Witch",
  "Sorceress",
  "Mercenary",
  "Monk",
  "Druid",
  "Huntress",
  "Duelist",
];
export function newBuild(): Build {
  return {
    id: crypto.randomUUID(),
    title: "Untitled build",
    cls: "Mercenary",
    asc: "",
    skill: "",
    budget: "Starter",
    tags: [],
    notes: "",
    gear: slots.map((slot) => ({ slot, name: "", mods: "", price: 0 })),
    skills: [],
    nodes: [],
    allocated: [],
    example: false,
    updated: new Date().toISOString(),
  };
}
export const exampleBuilds: Build[] = examples.map((b) => ({
  ...newBuild(),
  ...b,
  id: `example-${b.id}`,
  notes:
    "Imported example from the V24.6 repository. Equipment, performance, and current patch viability have not been verified.",
}));
export function parseBuild(value: unknown): Build {
  if (!value || typeof value !== "object")
    throw new Error("Expected a build object.");
  const b = value as Record<string, unknown>;
  if (typeof b.title !== "string" || !b.title.trim() || b.title.length > 120)
    throw new Error("Build title must contain 1–120 characters.");
  const result = newBuild();
  result.title = b.title;
  for (const key of ["cls", "asc", "skill", "budget", "notes"] as const)
    if (typeof b[key] === "string")
      result[key] = (b[key] as string).slice(0, 20000);
  if (Array.isArray(b.tags))
    result.tags = b.tags
      .filter((v): v is string => typeof v === "string")
      .slice(0, 20);
  if (Array.isArray(b.gear))
    result.gear = slots.map((slot) => {
      const g = (b.gear as Gear[]).find((g) => g && g.slot === slot);
      return {
        slot,
        name: typeof g?.name === "string" ? g.name.slice(0, 200) : "",
        mods: typeof g?.mods === "string" ? g.mods.slice(0, 5000) : "",
        price:
          typeof g?.price === "number" &&
          Number.isFinite(g.price) &&
          g.price >= 0
            ? g.price
            : 0,
      };
    });
  if (Array.isArray(b.skills))
    result.skills = b.skills
      .filter(
        (g) =>
          g && typeof g.skill === "string" && typeof g.supports === "string",
      )
      .slice(0, 20);
  if (Array.isArray(b.nodes)) result.nodes = parseTree(b.nodes);
  if (b.treeSource === "ggg-bd87e65") result.treeSource = b.treeSource;
  if (Array.isArray(b.allocated))
    result.allocated = b.allocated.filter(
      (id): id is string =>
        typeof id === "string" &&
        (result.treeSource === "ggg-bd87e65" ||
          result.nodes.some((n) => n.id === id)),
    );
  return result;
}
export function parseTree(value: unknown): PassiveNode[] {
  if (!Array.isArray(value) || value.length > 10000)
    throw new Error("Expected a tree array with at most 10,000 nodes.");
  const ids = new Set<string>();
  for (const n of value) {
    if (
      !n ||
      typeof n.id !== "string" ||
      ids.has(n.id) ||
      typeof n.name !== "string" ||
      !Number.isFinite(n.x) ||
      !Number.isFinite(n.y) ||
      !Array.isArray(n.links) ||
      !n.links.every((l: unknown) => typeof l === "string")
    )
      throw new Error("Invalid or duplicate passive node.");
    ids.add(n.id);
  }
  return value.map((n) => ({
    id: n.id,
    name: n.name,
    x: n.x,
    y: n.y,
    links: n.links.filter((l: string) => ids.has(l)),
    description: typeof n.description === "string" ? n.description : "",
  }));
}
