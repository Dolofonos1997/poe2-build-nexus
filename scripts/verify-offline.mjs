import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
assert.deepEqual(
  readFileSync("dist/index.html"),
  readFileSync("index.html"),
  "Legacy production HTML must be unchanged",
);
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : "chrome",
});
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) =>
    console.log("REQUEST FAILED", r.url(), r.failure()?.errorText),
  );
  page.on("console", (m) => {
    if (m.type() === "error") console.log("CONSOLE", m.text());
  });
  await page.goto(process.env.PREVIEW_URL || "http://127.0.0.1:4173");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  try {
    await page
      .getByRole("heading", { name: /Great temples/ })
      .waitFor({ timeout: 10000 });
  } catch (e) {
    console.log(
      JSON.stringify({ body: await page.locator("body").innerText(), errors }),
    );
    await page.screenshot({ path: "atlas-offline-failure.png" });
    throw e;
  }
  await page
    .getByRole("link", { name: "Enter the planner", exact: true })
    .click();
  await page.getByRole("button", { name: "E9 Path", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: production reload and lazy-loaded Temple route work offline; legacy HTML is byte-identical.",
  );
} finally {
  await browser.close();
}
