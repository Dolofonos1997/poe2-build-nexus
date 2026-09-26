import { describe, it, expect } from "vitest";
import {
  emptyBoard,
  convertedBoard,
  upgradeInfo,
  parseBoard,
  powered,
} from "./temple";
import { specialAction, simulateExit, templateBoard } from "./advanced";
describe("advanced Temple planning", () => {
  it("converts and restores without corrupting saved base cards", () => {
    const b = emptyBoard();
    b[67] = { k: "garrison", t: 1 };
    b[66] = { k: "spy", t: 1 };
    expect(convertedBoard(b)[67]?.k).toBe("legion");
    b[68] = { k: "synth", t: 1 };
    expect(convertedBoard(b)[67]?.k).toBe("trans");
    b[68] = null;
    b[66] = null;
    expect(convertedBoard(b)[67]).toEqual({ k: "garrison", t: 1 });
  });
  it("follows Synthflesh tiers, caps ordinary upgrades and keeps T4", () => {
    const b = emptyBoard();
    b[67] = { k: "synth", t: 2 };
    b[66] = { k: "flesh", t: 1 };
    expect(upgradeInfo(b, 66).tier).toBe(3);
    b[67]!.t = 4;
    expect(upgradeInfo(b, 67).tier).toBe(4);
  });
  it("does not mistake required power for a Smithy tier bonus", () => {
    const b = emptyBoard();
    b[67] = { k: "smithy", t: 1 };
    b[75] = { k: "gen", t: 1 };
    expect(powered(b).get(67)).toBe(1);
    expect(upgradeInfo(b, 67).tier).toBe(1);
  });
  it("sacrifices and cascades Thaumaturge tier, preserving the original board", () => {
    const b = templateBoard(1);
    const next = specialAction(b, 49, 67, "sacrifice");
    expect(next[49]).toBeNull();
    expect(upgradeInfo(next, 58).tier).toBe(2);
    expect(b[49]).not.toBeNull();
    expect(() => specialAction(b, 76, 67, "sacrifice")).toThrow();
  });
  it("allows one assassination upgrade and rejects locked targets", () => {
    const b = emptyBoard();
    b[67] = { k: "spy", t: 1 };
    b[75] = { k: "spy", t: 1 };
    let next = specialAction(b, 75, 67, "assassinate");
    expect(upgradeInfo(next, 67).tier).toBe(2);
    next[75] = { k: "spy", t: 1 };
    expect(() => specialAction(next, 75, 67, "assassinate")).toThrow();
    b[67]!.locked = true;
    expect(() => specialAction(b, 75, 67, "assassinate")).toThrow();
  });
  it("removes restricted rooms, consumes protection once, and preserves entrance", () => {
    const b = emptyBoard();
    b[67] = { k: "vault", t: 1, locked: true };
    b[75] = { k: "royal", t: 1, protected: true };
    const result = simulateExit(b, 0, 1);
    expect(result.removed).toEqual([67]);
    expect(result.protected).toEqual([75]);
    expect(result.board[75]?.protected).toBe(false);
    expect(result.board[76]).toEqual(b[76]);
    expect(b[75]?.protected).toBe(true);
  });
  it("reproduces seeded scenarios and validates the count", () => {
    const b = templateBoard(0);
    expect(simulateExit(b, 2, 42)).toEqual(simulateExit(b, 2, 42));
    expect(() => simulateExit(b, NaN, 1)).toThrow();
  });
  it("round trips advanced state through backup validation", () => {
    const b = emptyBoard();
    b[67] = { k: "spy", t: 1, assassination: true, protected: true };
    expect(parseBoard(JSON.parse(JSON.stringify(b)))[67]).toMatchObject(b[67]!);
  });
});
