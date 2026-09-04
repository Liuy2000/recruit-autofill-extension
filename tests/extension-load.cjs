"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");
const profile = require("../fixtures/sample-profile.json");

(async () => {
  const extensionPath = path.resolve(__dirname, "../extension");
  const userDataDir = fs.mkdtempSync(path.join(process.env.TEMP || os.tmpdir(), "resume-autofill-extension-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });
  let workers = context.serviceWorkers();
  if (!workers.length) {
    try { workers = [await context.waitForEvent("serviceworker", { timeout: 10000 })]; }
    catch (_) { /* assertion below gives a clearer failure */ }
  }
  assert.ok(workers.length, "extension service worker did not load");
  const extensionId = new URL(workers[0].url()).host;
  assert.match(extensionId, /^[a-p]{32}$/);
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForSelector("#editor");
  assert.equal(await page.locator("h1").textContent(), "个人资料设置");
  await page.evaluate(input => chrome.storage.local.set({ profile: input }), profile);
  await page.reload();
  await page.waitForSelector("#field-personal-fullName");
  assert.equal(await page.locator("#field-personal-fullName").inputValue(), "示例用户");
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.waitForSelector("#version");
  assert.equal(await popup.locator("#version").textContent(), "v1.0.8");
  await context.close();
  console.log(`extension load test passed (${extensionId})`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
