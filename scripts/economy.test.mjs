import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize } from "./economy.mjs";
test("market values retain the actual primary currency and reject invalid values", () => {
  const result = normalize({
    core: { primary: "divine", items: [{ id: "divine", name: "Divine Orb" }] },
    items: [{ id: "ex", name: "Exalted Orb" }],
    lines: [
      { id: "ex", primaryValue: 0.002, sparkline: { totalChange: 4 } },
      { id: "bad", primaryValue: -10 },
    ],
  });
  assert.equal(result.unit, "Divine Orb");
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].value, 0.002);
  assert.equal(result.rows[0].change, 4);
});
test("unexpected and empty upstream schemas cannot erase a cached feed", () => {
  assert.throws(() => normalize({}));
  assert.throws(() =>
    normalize({ core: { primary: "divine" }, items: [], lines: [] }),
  );
});
