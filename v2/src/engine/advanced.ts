import {
  type Board,
  type RoomKey,
  entrance,
  neighbours,
  reachable,
  rooms,
  upgradeInfo,
  emptyBoard,
} from "./temple";

export function specialAction(
  board: Board,
  victim: number,
  target: number,
  action: "sacrifice" | "assassinate",
): Board {
  const a = board[victim],
    b = board[target];
  if (
    !a ||
    !b ||
    victim === target ||
    victim === entrance ||
    a.locked ||
    b.locked
  )
    throw new Error(
      "Choose two different unlocked rooms; the entrance cannot be consumed.",
    );
  if (
    action === "sacrifice" &&
    (a.k === "sac" || a.k === "architect" || b.k !== "sac" || b.t >= 3)
  )
    throw new Error(
      "Sacrifice a non-boss, non-Sacrificial room to a Sacrificial Chamber below tier 3.",
    );
  if (
    action === "assassinate" &&
    (a.k !== "spy" ||
      b.k !== "spy" ||
      b.assassination ||
      upgradeInfo(board, target).tier >= 3)
  )
    throw new Error(
      "Choose two Spymasters. The recipient must be below tier 3 and not already upgraded by assassination.",
    );
  const next = board.map((c) => (c ? { ...c } : null));
  next[victim] = null;
  if (action === "sacrifice") next[target]!.t++;
  else next[target]!.assassination = true;
  return next;
}

export type ExitPlan = {
  board: Board;
  removed: number[];
  protected: number[];
  disconnected: number[];
};
// Random count is a user-specified scenario, not an inferred game probability.
export function simulateExit(
  board: Board,
  randomCount: number,
  seed: number,
): ExitPlan {
  if (
    !Number.isInteger(randomCount) ||
    randomCount < 0 ||
    randomCount > 80 ||
    !Number.isInteger(seed)
  )
    throw new Error("Enter an integer room count (0–80) and seed.");
  const reachableBefore = reachable(board);
  const mandatory = board.flatMap((c, i) =>
    c &&
    i !== entrance &&
    ((rooms[c.k].restricted && reachableBefore.has(i)) || c.deviceUsed)
      ? [i]
      : [],
  );
  const candidates = board.flatMap((c, i) =>
    c && i !== entrance && !mandatory.includes(i) ? [i] : [],
  );
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const next = board.map((c, i) =>
    c ? (i === entrance ? { ...c } : { ...c, deviceUsed: false }) : null,
  );
  const removed: number[] = [],
    protectedRooms: number[] = [];
  for (const i of [...mandatory, ...candidates.slice(0, randomCount)]) {
    if (next[i]!.protected) {
      next[i]!.protected = false;
      protectedRooms.push(i);
    } else {
      next[i] = null;
      removed.push(i);
    }
  }
  const after = reachable(next);
  return {
    board: next,
    removed,
    protected: protectedRooms,
    disconnected: [...reachableBefore].filter((i) => next[i] && !after.has(i)),
  };
}

export const templates: { name: string; rooms: [number, RoomKey, number][] }[] =
  [
    {
      name: "Forge & constructs",
      rooms: [
        [67, "path", 1],
        [58, "gen", 1],
        [66, "smithy", 1],
        [65, "golem", 1],
        [57, "thaum", 1],
      ],
    },
    {
      name: "Sacrifice & corruption",
      rooms: [
        [67, "sac", 1],
        [58, "thaum", 1],
        [49, "corrupt", 1],
        [59, "alchemy", 1],
        [66, "gen", 1],
      ],
    },
    {
      name: "Synthflesh conversion",
      rooms: [
        [67, "path", 1],
        [58, "synth", 1],
        [57, "flesh", 1],
        [59, "garrison", 1],
        [66, "gen", 1],
      ],
    },
  ];
export function templateBoard(index: number): Board {
  if (!templates[index]) throw new Error("Unknown template.");
  const b = emptyBoard();
  for (const [i, k, t] of templates[index].rooms) b[i] = { k, t };
  return b;
}

export function conversionLabel(board: Board, i: number) {
  const c = board[i];
  if (!c || !["garrison", "legion"].includes(c.k)) return null;
  const adj = neighbours(i).map((n) => board[n]?.k);
  return adj.includes("synth")
    ? "Transcendent Barracks"
    : c.k === "garrison" && adj.includes("spy")
      ? "Legion Barracks"
      : null;
}
