import { describe, it, expect } from "vitest";
import {
  emptyBoard,
  neighbours,
  placementError,
  reachable,
  parseBoard,
  recommendations,
  upgradeInfo,
} from "./temple";
describe("Temple invariants", () => {
  it("does not wrap horizontal neighbours across rows", () => {
    expect(neighbours(8)).not.toContain(9);
    expect(neighbours(0)).toEqual([1, 9]);
  });
  it("keeps E9 fixed and requires compatible adjacency", () => {
    const b = emptyBoard();
    expect(placementError(b, 76, "path")).toBeTruthy();
    expect(placementError(b, 67, "gen")).toBeNull();
    expect(placementError(b, 0, "gen")).toBeTruthy();
  });
  it("prevents closing a cycle", () => {
    const b = emptyBoard();
    b[67] = { k: "path", t: 1 };
    b[66] = { k: "path", t: 1 };
    expect(placementError(b, 75, "path")).toMatch(/loop/);
    expect(placementError(b, 75, "path", false, false)).toBeNull();
  });
  it("gates Royal Access on the Architect state", () => {
    const b = emptyBoard();
    expect(placementError(b, 67, "royal")).toMatch(/Architect/);
    expect(placementError(b, 67, "royal", true)).toBeNull();
  });
  it("reports entrance connectivity without joining incompatible rooms", () => {
    const b = emptyBoard();
    b[67] = { k: "smithy", t: 1 };
    b[58] = { k: "spy", t: 1 };
    expect([...reachable(b)]).toEqual([76, 67]);
  });
  it("applies adjacent upgrades without mutating base tiers", () => {
    const b = emptyBoard();
    b[67] = { k: "smithy", t: 1 };
    b[66] = { k: "golem", t: 1 };
    expect(upgradeInfo(b, 67).tier).toBe(2);
    expect(b[67]?.t).toBe(1);
  });
  it("rejects malformed imports and restores the entrance", () => {
    expect(() => parseBoard([])).toThrow();
    const b = emptyBoard();
    b[0] = { k: "path", t: 99 };
    expect(() => parseBoard(b)).toThrow();
    b[0] = null;
    b[76] = null;
    expect(parseBoard(b)[76]?.locked).toBe(true);
  });
  it("recommends only legal moves from the actual hand", () => {
    const b = emptyBoard();
    const moves = recommendations(b, ["gen", null], "crafting", false);
    expect(moves.length).toBeGreaterThan(0);
    for (const m of moves) {
      expect(m.k).toBe("gen");
      expect(placementError(b, m.i, m.k)).toBeNull();
    }
  });
});
