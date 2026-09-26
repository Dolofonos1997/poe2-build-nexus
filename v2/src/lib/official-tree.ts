import { parseTree, type PassiveNode } from "./builds";
export const OFFICIAL_TREE_REVISION =
  "bd87e6512c92b868542eddfb1ba4ea8b6dc2da36";
export const OFFICIAL_TREE_URL = `https://raw.githubusercontent.com/grindinggear/poe2-skilltree-export/${OFFICIAL_TREE_REVISION}/data.json`;
export const ASSET_ROOT = `https://raw.githubusercontent.com/grindinggear/poe2-skilltree-export/${OFFICIAL_TREE_REVISION}/assets/`;
type RawNode = {
  name?: string;
  icon?: string;
  x: number;
  y: number;
  out?: string[];
  in?: string[];
  stats?: string[];
  ascendancyId?: string;
  isAscendancyStart?: boolean;
  isNotable?: boolean;
  isKeystone?: boolean;
  isJewelSocket?: boolean;
  isMastery?: boolean;
  classStartIndex?: number[];
};
export type TreeClass = {
  name: string;
  overridePairs?: Record<string, number>;
  ascendancies: {
    id: string;
    name: string | null;
    overridePairs?: Record<string, number>;
  }[];
};
export type OfficialData = {
  nodes: Record<string, RawNode>;
  classes: TreeClass[];
  skillOverrides: Record<string, Partial<RawNode>>;
  edges: {
    from: string | number;
    to: string | number;
    orbit?: number;
    orbitX?: number;
    orbitY?: number;
  }[];
};
export function cleanGameText(text: string) {
  return text
    .replace(/\[([^\]|]+)\|([^\]]+)\]/g, "$2")
    .replace(/\[([^\]]+)\]/g, "$1");
}
export function convertOfficialTree(
  raw: unknown,
  cls = "",
  asc = "",
): PassiveNode[] {
  if (
    !raw ||
    typeof raw !== "object" ||
    !("nodes" in raw) ||
    !raw.nodes ||
    typeof raw.nodes !== "object"
  )
    throw new Error("Unrecognized official tree format.");
  const data = raw as OfficialData;
  const character = data.classes?.find((c) => c.name === cls);
  const ascendant = character?.ascendancies.find(
    (a) => a.name === asc || a.id === asc,
  );
  const overrides = {
    ...character?.overridePairs,
    ...ascendant?.overridePairs,
  };
  const remap = (id: string) => String(overrides[id] || id);
  const nodes = Object.entries(data.nodes)
    .filter(
      ([, n]) =>
        n && Number.isFinite(n.x) && Number.isFinite(n.y) && !n.isMastery,
    )
    .filter(
      ([, n]) =>
        !cls ||
        !n.ascendancyId ||
        (!!ascendant &&
          (n.ascendancyId === ascendant.id ||
            (Object.keys(ascendant.overridePairs || {}).length > 0 &&
              n.ascendancyId === ascendant.id.replace(/b$/, "")))),
    );
  return parseTree(
    nodes.map(([id, original]) => {
      const n = { ...original, ...data.skillOverrides?.[overrides[id]] };
      return {
        id: remap(id),
        name: cleanGameText(
          n.isAscendancyStart && ascendant?.name
            ? ascendant.name
            : n.name || `Node ${id}`,
        ),
        x: n.x / 10,
        y: n.y / 10,
        links: [
          ...new Set(
            [...(original.out || []), ...(original.in || [])]
              .map(String)
              .map(remap),
          ),
        ],
        description: (n.stats || []).map(cleanGameText).join("\n"),
        icon: n.icon,
        kind:
          n.classStartIndex || n.isAscendancyStart
            ? "start"
            : n.isKeystone
              ? "keystone"
              : n.isNotable
                ? "notable"
                : n.isJewelSocket
                  ? "jewel"
                  : "normal",
        ascendancy: n.ascendancyId && ascendant ? ascendant.id : n.ascendancyId,
        starts: n.classStartIndex,
        ascendancyStart: n.isAscendancyStart,
      };
    }),
  );
}
let pending: Promise<OfficialData> | null = null;
export async function cachedAsset(url: string): Promise<Response> {
  let cache: Cache | undefined;
  try {
    cache = await caches.open("atlas-data-ggg-art-bd87e65");
    const stored = await cache.match(url);
    if (stored) return stored;
  } catch {
    /* storage optional */
  }
  const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`GGG asset download failed (${r.status}).`);
  try {
    await cache?.put(url, r.clone());
  } catch {
    /* quota optional */
  }
  return r;
}
export function loadOfficialData() {
  if (!pending)
    pending = cachedAsset(OFFICIAL_TREE_URL)
      .then((r) => r.json())
      .catch((e) => {
        pending = null;
        throw e;
      });
  return pending!;
}
export async function loadOfficialTree() {
  return convertOfficialTree(await loadOfficialData());
}
export function classStart(
  nodes: PassiveNode[],
  data: OfficialData,
  cls: string,
) {
  const index = data.classes.findIndex((c) => c.name === cls);
  return nodes.find((n) => n.starts?.includes(index));
}
export function allocationPath(
  nodes: PassiveNode[],
  allocated: string[],
  start: string,
  target: string,
): string[] | null {
  const map = new Map(nodes.map((n) => [n.id, n]));
  const destination = map.get(target);
  if (!destination) return null;
  const roots = destination.ascendancy
    ? nodes
        .filter(
          (n) => n.ascendancyStart && n.ascendancy === destination.ascendancy,
        )
        .map((n) => n.id)
    : [start];
  const known = new Set(
    [...removeAllocation(nodes, allocated, start, ""), ...roots].filter(
      (id) => map.get(id)?.ascendancy === destination.ascendancy,
    ),
  );
  const queue = [...known],
    prev = new Map(queue.map((id) => [id, null as string | null]));
  for (const id of queue) {
    if (id === target) {
      const path: string[] = [];
      let at: string | null = target;
      while (at && !known.has(at)) {
        path.unshift(at);
        at = prev.get(at) ?? null;
      }
      return path;
    }
    for (const next of map.get(id)?.links || []) {
      const n = map.get(next);
      if (
        !n ||
        prev.has(next) ||
        n.ascendancy !== destination.ascendancy ||
        (n.starts?.length && !roots.includes(next))
      )
        continue;
      prev.set(next, id);
      queue.push(next);
    }
  }
  return null;
}
export function removeAllocation(
  nodes: PassiveNode[],
  allocated: string[],
  start: string,
  remove: string,
) {
  const map = new Map(nodes.map((n) => [n.id, n]));
  const roots = [
    start,
    ...nodes.filter((n) => n.ascendancyStart).map((n) => n.id),
  ];
  const allowed = new Set([
    ...allocated.filter((id) => id !== remove),
    ...roots,
  ]);
  const seen = new Set(roots),
    queue = [...roots];
  for (const id of queue)
    for (const next of map.get(id)?.links || [])
      if (allowed.has(next) && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
  return allocated.filter((id) => id !== remove && seen.has(id));
}
