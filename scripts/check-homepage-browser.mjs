// Run against `npm start -- --port 3100` with Playwright installed:
// NODE_PATH=/tmp/dcmt-browser/node_modules node --test scripts/check-homepage-browser.mjs
// Optional DCMT_FIXTURE_DIR contains captured real production responses named
// dcmt-production-dotd.json and dcmt-production-dogs.json for offline reruns.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
const { chromium } = createRequire(import.meta.url)("playwright");
const base = process.env.DCMT_TEST_URL || "http://127.0.0.1:3100";

async function fixture(name, path) {
  if (process.env.DCMT_FIXTURE_DIR) {
    return JSON.parse(await readFile(`${process.env.DCMT_FIXTURE_DIR}/dcmt-production-${name}.json`, "utf8"));
  }
  const response = await fetch(`https://dontclonemetom.com${path}`);
  assert.equal(response.status, 200);
  return response.json();
}

test("homepage ordering, recovery, exact profile navigation, and responsive layout", { timeout: 180000 }, async () => {
  const daily = await fixture("dotd", "/api/dog-of-the-day");
  const results = await fixture("dogs", "/api/adoptable-pets?zip=63040&miles=50");
  assert.ok(daily.dog?.photo, "Use an actual featured dog from the live selection engine");
  assert.equal(daily.pagePath, `/dogs/${daily.dog.id}`);
  assert.ok(results.dogs.length > 9, "Exercise a real, long result set");
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.route("**/api/adoptable-pets?*", route => route.fulfill({ json: results }));
    let dailyMode = "ready";
    let requests = 0;
    await page.route("**/api/dog-of-the-day*", async route => {
      requests++;
      if (dailyMode === "failure") return route.fulfill({ status: 503, json: { dog: null } });
      if (dailyMode === "empty") return route.fulfill({ json: { dog: null, reason: "No confirmed candidate" } });
      if (dailyMode === "network") return route.abort("failed");
      if (dailyMode === "mismatch") return route.fulfill({ json: { ...daily, pagePath: "/dogs/wrong-dog" } });
      if (dailyMode === "loading") await new Promise(resolve => setTimeout(resolve, 1000));
      return route.fulfill({ json: daily });
    });
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base);
      const preview = page.getByRole("region", { name: "Adoptable dog preview", exact: true });
      const feature = page.getByRole("region", { name: "Dog of the Day", exact: true });
      await feature.getByRole("link", { name: /^Dog of the Day: meet/ }).waitFor();
      await preview.locator("img").first().waitFor();
      assert.equal(await preview.locator("img:visible").count(), width < 640 ? 2 : 3);
      const previewBox = await preview.boundingBox();
      const featureBox = await feature.boundingBox();
      assert.ok(featureBox.y >= previewBox.y + previewBox.height);
      const positions = await preview.locator("img:visible").evaluateAll(images => images.map(image => image.getBoundingClientRect().top));
      assert.equal(new Set(positions).size, 1, "Preview must occupy exactly one row");
      const before = await feature.evaluate(element => element.getBoundingClientRect().top + window.scrollY);
      await page.getByText(`See all dogs (${results.dogs.length})`, { exact: true }).click();
      const additional = page.getByLabel("Additional adoptable dogs", { exact: true });
      assert.equal(await additional.locator(":scope > div:visible").count(), results.dogs.length - (width < 640 ? 2 : 3));
      assert.equal(await feature.evaluate(element => element.getBoundingClientRect().top + window.scrollY), before, "Expanding all results cannot move the feature down");
      assert.ok(await additional.evaluate(element => element.getBoundingClientRect().top + window.scrollY) > before + featureBox.height);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `No overflow at ${width}px`);
      const hero = page.getByRole("img", { name: "Isaiah, the black-and-white Batdog, looking right at you" });
      assert.equal((await hero.boundingBox()).width, width < 640 ? 192 : width < 1024 ? 256 : 280);
      assert.equal(await hero.evaluate(image => getComputedStyle(image).objectPosition), "50% 25%");
      assert.equal(await feature.locator("img").evaluate(image => getComputedStyle(image).objectPosition), "50% 18%");
    }
    const feature = page.getByRole("region", { name: "Dog of the Day", exact: true });
    await feature.getByRole("button", { name: "Share this dog" }).click();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    const previousRequests = requests;
    const spinResponse = page.waitForResponse(response => response.url().includes("/api/dog-of-the-day?offset=1"));
    await feature.getByRole("button", { name: "Spin another dog" }).click();
    await spinResponse;
    assert.ok(requests > previousRequests);

    // This navigation is deliberately NOT intercepted: the built app must
    // serve the selected numeric dog's actual page on the very first click.
    const navigation = page.waitForNavigation();
    await feature.getByRole("link", { name: /^Dog of the Day: meet/ }).click();
    await navigation;
    assert.equal(new URL(page.url()).pathname, daily.pagePath);
    const response = await page.request.get(`${base}${daily.pagePath}`, { maxRedirects: 0 });
    assert.equal(response.status(), 200);
    await page.getByRole("heading", { level: 1, name: daily.dog.name, exact: true }).waitFor();
    assert.ok(await page.getByRole("link", { name: /adoption|meet .*↗/i }).count(), "Dog profile retains its rescue destination");

    for (const mode of ["failure", "empty", "network", "mismatch"]) {
      dailyMode = mode;
      await page.goto(base);
      await feature.getByText(/Dog of the Day is temporarily unavailable/).waitFor();
      assert.ok(await feature.isVisible());
      dailyMode = "ready";
      await feature.getByRole("button", { name: "Retry Dog of the Day" }).click();
      await feature.getByRole("link", { name: /^Dog of the Day: meet/ }).waitFor();
    }
    dailyMode = "loading";
    await page.goto(base);
    await feature.getByRole("status", { name: "Loading Dog of the Day" }).waitFor();
    await feature.getByRole("link", { name: /^Dog of the Day: meet/ }).waitFor();
  } finally {
    await browser.close();
  }
});
