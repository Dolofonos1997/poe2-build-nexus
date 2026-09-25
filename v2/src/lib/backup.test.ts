import { describe, it, expect } from "vitest";
import { validateBackup } from "./backup";
import { parseBuild, parseTree, newBuild } from "./builds";
import { convertOfficialTree } from "./official-tree";
describe("Untrusted imported data", () => {
  it("converts GGG coordinates and joins both directions of an edge", () => {
    const tree = convertOfficialTree({
      nodes: {
        1: { name: "A", x: 100, y: 200, out: ["2"], stats: ["+10 Strength"] },
        2: { name: "B", x: 200, y: 200, in: ["1"], stats: [] },
      },
    });
    expect(tree[0].x).toBe(10);
    expect(tree[1].links).toContain("1");
    expect(tree[0].description).toBe("+10 Strength");
  });
  it("rejects wrong backup versions and ignores unrelated browser storage", () => {
    expect(() => validateBackup({ version: 1, data: {} })).toThrow();
    const out = validateBackup({
      version: 2,
      data: { "atlas-favorites": ["a"], token: "secret" },
    });
    expect(Object.keys(out)).toEqual(["atlas-favorites"]);
  });
  it("accepts cloud string records and local object records", () => {
    expect(
      validateBackup({ version: 2, data: { "atlas-favorites": '["a"]' } }),
    ).toEqual(
      validateBackup({ version: 2, data: { "atlas-favorites": ["a"] } }),
    );
  });
  it("rejects malformed ledger amounts before any writes", () => {
    expect(() =>
      validateBackup({
        version: 2,
        data: {
          "atlas-runs": [
            {
              id: "a",
              name: "a",
              date: "x",
              revenue: "bad",
              cost: 1,
              minutes: 2,
            },
          ],
        },
      }),
    ).toThrow();
  });
  it("rejects duplicate passive ids and cleans dangling edges", () => {
    const n = { id: "a", name: "A", x: 0, y: 0, links: ["missing"] };
    expect(() => parseTree([n, n])).toThrow();
    expect(parseTree([n])[0].links).toEqual([]);
  });
  it("build import never trusts a supplied id", () => {
    const source = newBuild();
    expect(parseBuild(source).id).not.toBe(source.id);
    expect(() => parseBuild({ title: "" })).toThrow();
  });
});
