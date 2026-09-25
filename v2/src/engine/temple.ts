import roomData from "../data/rooms.json";
export type RoomKey = keyof typeof roomData;
export type Room = {
  n: string;
  t: string[];
  up?: string[];
  inter?: string[];
  multiUp?: Record<string, number>;
  restricted?: number;
  roomCard?: number;
  reward?: string;
};
export const rooms = roomData as Record<RoomKey, Room>;
export const roomKeys = Object.keys(rooms) as RoomKey[];
export type Cell = { k: RoomKey; t: number; locked?: boolean };
export type Board = (Cell | null)[];
export type Goal =
  "balanced" | "currency" | "crafting" | "corruption" | "bosses" | "experience";
export const goals: Goal[] = [
  "balanced",
  "currency",
  "crafting",
  "corruption",
  "bosses",
  "experience",
];
export const entrance = 76;
export const emptyBoard = (): Board =>
  Array.from({ length: 81 }, (_, i) =>
    i === entrance ? { k: "path", t: 1, locked: true } : null,
  );
export const coordinate = (i: number) =>
  `${String.fromCharCode(65 + (i % 9))}${Math.floor(i / 9) + 1}`;
export function neighbours(i: number) {
  return [
    i % 9 > 0 ? i - 1 : -1,
    i % 9 < 8 ? i + 1 : -1,
    i >= 9 ? i - 9 : -1,
    i < 72 ? i + 9 : -1,
  ].filter((n) => n >= 0);
}
export function connect(a: Cell | null, b: Cell | null): boolean {
  if (!a || !b) return false;
  if (a.k === "path" || b.k === "path") return true;
  const x = rooms[a.k],
    y = rooms[b.k];
  return !!(
    x.inter?.includes(b.k) ||
    y.inter?.includes(a.k) ||
    x.up?.includes(b.k) ||
    y.up?.includes(a.k) ||
    x.multiUp?.[b.k] ||
    y.multiUp?.[a.k]
  );
}
export function reachable(board: Board, start = entrance, skip = -1) {
  const seen = new Set<number>();
  if (!board[start] || start === skip) return seen;
  const queue = [start];
  seen.add(start);
  for (const i of queue)
    for (const n of neighbours(i))
      if (n !== skip && !seen.has(n) && connect(board[i], board[n])) {
        seen.add(n);
        queue.push(n);
      }
  return seen;
}
export function placementError(
  board: Board,
  i: number,
  k: RoomKey,
  architectDefeated = false,
  preventLoops = true,
): string | null {
  if (!Number.isInteger(i) || i < 0 || i > 80) return "Choose a board cell.";
  if (board[i]) return "This cell already contains a room.";
  if (rooms[k].restricted && !rooms[k].roomCard && !architectDefeated)
    return "Mark the Architect defeated before placing Royal Access.";
  for (const n of neighbours(i))
    if (board[n]?.k === "architect" && neighbours(n).some((j) => board[j]))
      return "The Architect already has an occupied approach.";
  if (k === "architect")
    return neighbours(i).filter((n) => board[n]).length > 1
      ? "The Architect requires at most one occupied approach."
      : null;
  const adj = neighbours(i).filter((n) => connect({ k, t: 1 }, board[n]));
  if (!adj.length) return "Connect this room to a path or compatible room.";
  if (preventLoops && adj.length > 1) {
    for (let a = 0; a < adj.length - 1; a++) {
      const visited = reachable(board, adj[a]);
      if (adj.slice(a + 1).some((n) => visited.has(n)))
        return "This placement creates a connection loop.";
    }
  }
  return null;
}
export function edges(board: Board) {
  return board.flatMap((c, i) =>
    c
      ? neighbours(i)
          .filter((n) => n > i && connect(c, board[n]))
          .map((n) => [i, n] as const)
      : [],
  );
}
export function powered(board: Board) {
  const counts = new Map<number, number>();
  board.forEach((c, i) => {
    if (c?.k !== "gen") return;
    const seen = new Set([i]),
      queue: [[number, number]] | [number, number][] = [[i, 0]];
    for (const [at, d] of queue)
      for (const n of neighbours(at)) {
        if (seen.has(n) || !board[n] || d + 1 > [3, 4, 5, 5][c.t - 1]) continue;
        seen.add(n);
        if (board[n]?.k === "path") queue.push([n, d + 1]);
        else if (["smithy", "golem", "synth", "trans"].includes(board[n]!.k))
          counts.set(n, (counts.get(n) || 0) + 1);
      }
  });
  return counts;
}
export function upgradeInfo(board: Board, i: number) {
  const c = board[i];
  if (!c) return { tier: 0, reasons: [] as string[] };
  const r = rooms[c.k],
    adj = neighbours(i)
      .map((n) => board[n])
      .filter((x): x is Cell => !!x),
    reasons: string[] = [];
  let bonus = 0;
  if (adj.some((x) => r.up?.includes(x.k))) {
    bonus = 1;
    reasons.push("Compatible adjacent room +1");
  }
  if (c.k === "alchemy") {
    const n = Math.min(2, adj.filter((x) => x.k === "thaum").length);
    bonus = Math.max(bonus, n);
    if (n) reasons.push(`${n} Thaumaturge upgrade${n > 1 ? "s" : ""}`);
  }
  if (c.k === "commander") {
    const n = adj.filter((x) => ["garrison", "trans"].includes(x.k)).length;
    bonus = Math.max(bonus, n >= 3 ? 2 : n >= 2 ? 1 : 0);
    if (n >= 2) reasons.push(`${n} adjacent barracks`);
  }
  const power = powered(board).get(i) || 0;
  if (power) {
    bonus = Math.max(bonus, c.k === "golem" ? Math.min(power, 2) : 1);
    reasons.push(`${power} connected Generator${power > 1 ? "s" : ""}`);
  }
  return { tier: Math.min(4, c.t + bonus), reasons };
}
const priorities: Record<Goal, RoomKey[]> = {
  balanced: [],
  currency: ["vault", "smithy", "spy"],
  crafting: ["smithy", "golem", "alchemy", "synth"],
  corruption: ["corrupt", "thaum", "sac"],
  bosses: ["architect", "royal"],
  experience: ["garrison", "commander", "legion", "trans"],
};
export function score(board: Board, goal: Goal) {
  const reach = reachable(board);
  return board.reduce(
    (sum, c, i) =>
      sum +
      (c
        ? (c.k === "path" ? 1 : 5) +
          upgradeInfo(board, i).tier * 2 +
          (reach.has(i) ? 3 : -5) +
          (priorities[goal].includes(c.k) ? 8 : 0)
        : 0),
    0,
  );
}
export function recommendations(
  board: Board,
  hand: (RoomKey | null)[],
  goal: Goal,
  architectDefeated: boolean,
  preventLoops = true,
) {
  const before = score(board, goal);
  const result: { i: number; k: RoomKey; gain: number; reason: string }[] = [];
  for (const k of new Set(hand.filter((x): x is RoomKey => !!x)))
    for (let i = 0; i < 81; i++) {
      if (placementError(board, i, k, architectDefeated, preventLoops))
        continue;
      const next = board.map((c) => (c ? { ...c } : null));
      next[i] = { k, t: 1 };
      const gain = score(next, goal) - before;
      result.push({
        i,
        k,
        gain,
        reason: [
          priorities[goal].includes(k)
            ? `Matches your ${goal} goal`
            : "Extends your layout",
          reachable(next).has(i)
            ? "connected to the entrance"
            : "not yet reachable from the entrance",
          ...upgradeInfo(next, i).reasons,
        ].join(" · "),
      });
    }
  return result.sort((a, b) => b.gain - a.gain || a.i - b.i).slice(0, 5);
}
export function parseBoard(value: unknown): Board {
  if (!Array.isArray(value) || value.length !== 81)
    throw new Error("A temple must contain exactly 81 cells.");
  const board = value.map((c) => {
    if (c === null) return null;
    if (
      typeof c !== "object" ||
      !Object.hasOwn(rooms, c.k) ||
      !Number.isInteger(c.t) ||
      c.t < 1 ||
      c.t > 4
    )
      throw new Error("Invalid room or tier in temple.");
    return { k: c.k as RoomKey, t: c.t, locked: c.locked === true };
  });
  board[entrance] = { k: "path", t: 1, locked: true };
  return board;
}
