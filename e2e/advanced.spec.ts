import { test, expect } from "@playwright/test";
test("sacrifice cascades, undoes and restores advanced state after reload", async ({
  page,
}) => {
  await page.goto("/#/temple");
  await page
    .getByRole("button", { name: "Sacrifice & corruption", exact: true })
    .click();
  await page
    .getByRole("button", { name: "E6 Corruption Chamber", exact: true })
    .click();
  await page.getByLabel("Upgrade recipient").selectOption("67");
  await page
    .getByRole("button", { name: "Sacrifice selected room", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "E6 empty", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "E7 Thaumaturge", exact: true }),
  ).toContainText("T2");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "E6 Corruption Chamber", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "E8 Sacrificial Chamber", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Protect with medallion", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "E8 Sacrificial Chamber", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Remove medallion protection",
      exact: true,
    }),
  ).toBeVisible();
});
test("exit preview applies explicitly and is undoable", async ({ page }) => {
  await page.goto("/#/temple");
  await page
    .getByRole("button", { name: "Select Treasure Vault", exact: true })
    .click();
  await page.getByRole("button", { name: "E8 empty", exact: true }).click();
  await page.getByRole("button", { name: "Preview exit", exact: true }).click();
  await expect(page.getByText("Remove: E8", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "E8 Treasure Vault", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Apply exit scenario", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "E8 empty", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "E8 Treasure Vault", exact: true }),
  ).toBeVisible();
});
test("market displays source units, filters and flags stale snapshots", async ({
  page,
}) => {
  await page.route("**/economy.json", (route) =>
    route.fulfill({
      json: {
        version: 1,
        leagues: [{ id: "Test", name: "Test" }],
        feeds: [
          {
            league: "Test",
            category: "Currency",
            unit: "Divine Orb",
            fetchedAt: "2020-01-01T00:00:00Z",
            rows: [
              {
                id: "ex",
                name: "Exalted Orb",
                value: 0.002,
                change: 1.5,
                volume: 100,
              },
              {
                id: "chaos",
                name: "Chaos Orb",
                value: 0.1,
                change: null,
                volume: null,
              },
            ],
          },
        ],
      },
    }),
  );
  await page.goto("/#/economy");
  await expect(page.getByText(/Stale snapshot/)).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Price (Divine Orb)", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Find market item").fill("Exalted");
  await expect(
    page.getByRole("cell", { name: "Exalted Orb", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Chaos Orb", exact: true }),
  ).toHaveCount(0);
});
