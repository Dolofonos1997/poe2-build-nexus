import { parseTree, type PassiveNode } from "./builds";
export const OFFICIAL_TREE_REVISION =
  "bd87e6512c92b868542eddfb1ba4ea8b6dc2da36";
export const OFFICIAL_TREE_URL = `https://raw.githubusercontent.com/grindinggear/poe2-skilltree-export/${OFFICIAL_TREE_REVISION}/data.json`;
let cached: Promise<PassiveNode[]> | null = null;
export function convertOfficialTree(raw: unknown): PassiveNode[] {
  if (
    !raw ||
    typeof raw !== "object" ||
    !("nodes" in raw) ||
    !raw.nodes ||
    typeof raw.nodes !== "object"
  )
    throw new Error("Unrecognized official tree format.");
  const entries = Object.entries(
    raw.nodes as Record<
      string,
      {
        name?: string;
        x: number;
        y: number;
        out?: string[];
        in?: string[];
        stats?: string[];
        ascendancyId?: string;
      }
    >,
  ).filter(
    ([, n]) =>
      n &&
      typeof n === "object" &&
      Number.isFinite(n.x) &&
      Number.isFinite(n.y),
  );
  return parseTree(
    entries.map(([id, n]) => ({
      id,
      name: n.name || `Node ${id}`,
      x: n.x / 10,
      y: n.y / 10,
      links: [...new Set([...(n.out || []), ...(n.in || [])].map(String))],
      description: [
        n.ascendancyId ? `Ascendancy: ${n.ascendancyId}` : "",
        ...(n.stats || []),
      ]
        .filter(Boolean)
        .join("\n"),
    })),
  );
}
export function loadOfficialTree() {
  if (!cached)
    cached = (async () => {
      let cache: Cache | undefined;
      try {
        cache = await caches.open("atlas-data-ggg-bd87e65");
        const stored = await cache.match(OFFICIAL_TREE_URL);
        if (stored) return parseTree(await stored.json());
      } catch {
        /* Browsers may disable Cache Storage; online loading still works. */
      }
      const response = await fetch(OFFICIAL_TREE_URL, {
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok)
        throw new Error(`Official tree download failed (${response.status}).`);
      const nodes = convertOfficialTree(await response.json());
      try {
        await cache?.put(
          OFFICIAL_TREE_URL,
          new Response(JSON.stringify(nodes), {
            headers: { "Content-Type": "application/json" },
          }),
        );
      } catch {
        /* Quota failure must not prevent viewing the tree. */
      }
      return nodes;
    })().catch((e) => {
      cached = null;
      throw e;
    });
  return cached;
}
