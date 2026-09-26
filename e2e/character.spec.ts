import { test, expect } from "@playwright/test";
test("real item search equips only the chosen slot and survives save/reload", async ({
  page,
}) => {
  await page.goto("/#/builds");
  await page.getByRole("button", { name: "Create build", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Equipment verification");
  await page.getByRole("button", { name: "Equipment", exact: true }).click();
  await page.getByRole("button", { name: "Equip Helmet", exact: true }).click();
  await page.getByLabel("Search equipment").fill("Goldrim");
  await page
    .getByRole("button", { name: "Goldrim Felt Cap", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Equip Goldrim in Helmet", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Equip Helmet", exact: true }),
  ).toContainText("Goldrim");
  await expect(
    page.getByRole("button", { name: "Equip Weapon", exact: true }),
  ).toContainText("Empty");
  await page.getByRole("button", { name: "Save build", exact: true }).click();
  await page.reload();
  await page.getByLabel("Search builds").fill("Equipment verification");
  await page.getByRole("button", { name: "Open build", exact: false }).click();
  await page.getByRole("button", { name: "Equipment", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Equip Helmet", exact: true }),
  ).toContainText("Goldrim");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
});
test("official tree loads by default and allocates connected paths within budget", async ({
  page,
}) => {
  await page.route("**/poe2-skilltree-export/*/data.json", (r) =>
    r.fulfill({
      json: {
        classes: [
          {
            name: "Mercenary",
            ascendancies: [{ id: "Mercenary1", name: "Tactician" }],
          },
        ],
        skillOverrides: {},
        edges: [],
        nodes: {
          "1": { name: "Start", x: 0, y: 0, classStartIndex: [0], out: ["2"] },
          "2": {
            name: "Test Damage",
            x: 100,
            y: 0,
            stats: ["10% increased Damage"],
            out: ["3"],
            in: ["1"],
          },
          "3": {
            name: "Test Notable",
            x: 200,
            y: 0,
            isNotable: true,
            stats: ["20% increased Damage"],
            in: ["2"],
          },
        },
      },
    }),
  );
  await page.goto("/#/builds");
  await page.getByRole("button", { name: "Create build", exact: true }).click();
  await page.getByRole("button", { name: "Passive tree", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Official passive tree" }),
  ).toBeVisible();
  await page.getByLabel("Search passive nodes").fill("Test Notable");
  await page
    .getByRole("button", { name: "Test Notable notable", exact: true })
    .click();
  await page.getByLabel("Passive point budget").fill("1");
  await page
    .getByRole("button", { name: "Allocate connected path", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("exceeds");
  await page.getByLabel("Passive point budget").fill("3");
  await page
    .getByRole("button", { name: "Allocate connected path", exact: true })
    .click();
  await expect(
    page.getByText("2 / 3 passives · 0 / 8 ascendancy", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Undo allocation", exact: true })
    .click();
  await expect(
    page.getByText("0 / 3 passives · 0 / 8 ascendancy", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
});
