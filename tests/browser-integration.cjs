"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const profile = require("../fixtures/sample-profile.json");
const { chromium } = require("playwright");

(async () => {
  const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const browser = await chromium.launch({ headless: true, executablePath: edge });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.resolve(__dirname, "form-demo.html")).href);
  await page.addScriptTag({ path: path.resolve(__dirname, "../extension/core.js") });
  await page.evaluate(input => {
    globalThis.chrome = { storage: { local: { get: async () => ({ profile: input }) } } };
  }, profile);
  await page.addScriptTag({ path: path.resolve(__dirname, "../extension/content.js") });

  const first = await page.evaluate(() => globalThis.__resumeAutofillRun({ includeSensitive: false, overwrite: false, highlight: false }));
  assert.ok(first.filled >= 13, `expected at least 13 filled fields, got ${first.filled}`);
  assert.ok(first.customFilled >= 5, `expected custom controls to be filled, got ${first.customFilled}`);
  assert.deepEqual(first.failures, []);
  assert.equal(await page.locator('[data-test="candidate-name"]').inputValue(), "示例用户");
  assert.equal(await page.locator('[data-test="email"]').inputValue(), "demo@example.com");
  assert.equal(await page.locator('[name="enterpriseGender"]:checked').inputValue(), "男");
  assert.equal(await page.locator('[data-test="birth-date"]').inputValue(), "1990-01-01");
  assert.equal(await page.locator('[data-test="ethnicity"]').inputValue(), "汉族");
  assert.equal((await page.locator('[data-test="political"]').textContent()).trim(), "共青团员");
  assert.equal((await page.locator('[data-test="household"]').textContent()).trim(), "示例省 / 示例市 / 示例区");
  assert.equal((await page.locator('[data-test="education"]').textContent()).trim(), "硕士研究生");
  assert.equal(await page.locator('[name="major"]').inputValue(), "机械工程");
  assert.equal(await page.locator('[name="targetRole"]').inputValue(), "机械工程师");
  assert.equal(await page.locator('[name="idNumber"]').inputValue(), "");
  assert.equal(await page.locator('[name="emergencyName"]').inputValue(), "");
  assert.equal(await page.locator('input[aria-label="姓名"]').inputValue(), "保留此内容");

  const second = await page.evaluate(() => globalThis.__resumeAutofillRun({ includeSensitive: true, overwrite: false, highlight: false }));
  assert.ok(second.filled >= 2);
  assert.equal(await page.locator('[name="idNumber"]').inputValue(), "TEST-ID-0001");
  assert.equal(await page.locator('[name="emergencyName"]').inputValue(), "示例联系人");
  assert.equal(await page.locator('input[type="file"]').inputValue(), "");

  const optionsPage = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await optionsPage.addInitScript(input => {
    globalThis.chrome = {
      storage: { local: {
        get: async () => ({ profile: input }),
        set: async () => undefined
      } }
    };
  }, profile);
  await optionsPage.goto(pathToFileURL(path.resolve(__dirname, "../extension/options.html")).href);
  await optionsPage.waitForSelector('#field-personal-fullName');
  assert.equal(await optionsPage.locator('#field-personal-fullName').inputValue(), "示例用户");
  assert.equal(await optionsPage.locator('#section-education .record').count(), 1);
  await optionsPage.screenshot({ path: path.resolve(__dirname, "../../tmp/options-page.png"), fullPage: true });

  await browser.close();
  console.log("browser integration tests passed");
})().catch(error => {
  console.error(error);
  process.exit(1);
});
