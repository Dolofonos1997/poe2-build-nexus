import { test, expect } from "@playwright/test";
test("reviewed workspace backup restores the board and rejects malformed files", async ({
  page,
}) => {
  await page.goto("/#/settings");
  const bad = {
    version: 2,
    data: { "atlas-temple-v2": { state: { board: [] } } },
  };
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(bad)),
    });
  await expect(page.getByRole("status")).toContainText("81 cells");
  const board = Array(81).fill(null);
  board[67] = { k: "gen", t: 2 };
  board[76] = { k: "path", t: 1, locked: true };
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "valid.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          version: 2,
          data: { "atlas-temple-v2": { state: { board }, version: 0 } },
        }),
      ),
    });
  await page.getByRole("button", { name: "Restore reviewed backup" }).click();
  await page.waitForLoadState("domcontentloaded");
  await page.goto("/#/temple");
  await expect(
    page.getByRole("button", { name: "E8 Generator", exact: true }),
  ).toBeVisible();
});
test("temple placement, undo, reload, and saved layout restoration", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/temple");
  await page
    .getByRole("button", { name: "Select Generator", exact: true })
    .click();
  await page.getByRole("button", { name: "E8 empty", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "E8 Generator", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "E8 empty", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.getByLabel("Layout name").fill("Test expedition");
  await page.getByRole("button", { name: "Save layout", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "E8 Generator", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New temple", exact: true }).click();
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "E8 Generator", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Loaded Test expedition",
  );
  expect(errors).toEqual([]);
});
test("build editor persists equipment and skills", async ({ page }) => {
  await page.goto("/#/builds");
  await page.getByRole("button", { name: "Create build", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("My tested build");
  await page.getByRole("button", { name: "Equipment", exact: true }).click();
  await page
    .getByLabel("Item name", { exact: true })
    .first()
    .fill("Test weapon");
  await page
    .getByLabel("Estimated price (ex)", { exact: true })
    .first()
    .fill("42");
  await page.getByRole("button", { name: "Skills", exact: true }).click();
  await page.getByRole("button", { name: "Add skill group" }).click();
  await page.getByLabel("Skill", { exact: true }).fill("Spark");
  await page.getByLabel("Supports (comma separated)").fill("Arcane Tempo");
  await page.getByRole("button", { name: "Save build", exact: true }).click();
  await page.reload();
  await page.getByLabel("Search builds").fill("My tested build");
  await page.getByRole("button", { name: "Open build", exact: false }).click();
  await page.getByRole("button", { name: "Equipment", exact: true }).click();
  await expect(
    page.getByLabel("Item name", { exact: true }).first(),
  ).toHaveValue("Test weapon");
  await page.getByRole("button", { name: "Skills", exact: true }).click();
  await expect(page.getByLabel("Skill", { exact: true })).toHaveValue("Spark");
});
test("ledger calculates entered profit and persists a run", async ({
  page,
}) => {
  await page.goto("/#/economy");
  await page.getByLabel("Revenue (ex)", { exact: true }).fill("100");
  await page.getByLabel("Cost (ex)", { exact: true }).fill("20");
  await page.getByLabel("Duration (minutes)", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Record run", exact: true }).click();
  await expect(
    page.locator(".metric").filter({ hasText: "NET PROFIT" }),
  ).toContainText("80 ex");
  await expect(
    page.locator(".metric").filter({ hasText: "RETURN / HOUR" }),
  ).toContainText("240.0 ex");
  await page.reload();
  await expect(
    page.getByRole("cell", { name: "80 ex", exact: true }),
  ).toBeVisible();
});
test("all routes render without document overflow or runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of [
    "/",
    "/temple",
    "/builds",
    "/economy",
    "/community",
    "/settings",
  ]) {
    await page.goto("/#" + path);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBeTruthy();
  }
  expect(errors).toEqual([]);
});
