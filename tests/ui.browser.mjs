// Run against a local dev/preview server: npm run test:ui
import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { unzipSync } from "fflate";

const origin = process.env.TEST_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
await mkdir(".qa", { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
    acceptDownloads: true,
  });
  const errors = [],
    network = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) =>
    network.push({
      url: request.url(),
      method: request.method(),
      bytes: request.postDataBuffer()?.length || 0,
    }),
  );
  await page.goto(origin, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Let your creations",
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({ path: ".qa/desktop-final.png", fullPage: false });
  await page.getByRole("button", { name: /Try an example/ }).click();
  await page
    .getByRole("button", { name: "Remove watermark", exact: true })
    .click();
  await expect(page.locator(".result-message.done")).toBeVisible({
    timeout: 30000,
  });
  const dlPromise = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Download breezy-studio-demo.png",
      exact: true,
    })
    .click();
  const dl = await dlPromise;
  assert.equal(dl.suggestedFilename(), "breezy-studio-demo_breezyfy.png");
  assert.equal(
    (await readFile(await dl.path())).subarray(1, 4).toString(),
    "PNG",
  );
  const zipPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download ZIP (1)", exact: true })
    .click();
  const zipped = unzipSync(
    new Uint8Array(await readFile(await (await zipPromise).path())),
  );
  assert.equal(Object.keys(zipped).length, 1);
  assert.equal(Object.keys(zipped)[0], "01_breezy-studio-demo_breezyfy.png");
  await page.getByRole("button", { name: "Expand preview" }).click();
  await expect(page.locator("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).not.toBeVisible();
  await page
    .getByLabel("Watermark profile", { exact: true })
    .selectOption("compact");
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await page.reload({ waitUntil: "networkidle" });
  await expect(
    page.getByLabel("Watermark profile", { exact: true }),
  ).toHaveValue("compact");
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  assert.equal(await page.locator(".queue-item").count(), 0);
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await page.getByRole("button", { name: "WEBP", exact: true }).click();
  await page.getByText("Resize image exports", { exact: true }).click();
  await page.getByLabel("Export width", { exact: true }).fill("256");
  const image = await readFile(
    "tests/engine-fixtures/synthetic-watermarked.png",
  );
  const video = await readFile(
    "tests/engine-fixtures/synthetic-audio-watermarked.mp4",
  );
  await page.locator("input[type=file]").setInputFiles([
    { name: "creation.png", mimeType: "image/png", buffer: image },
    {
      name: "broken.png",
      mimeType: "image/png",
      buffer: Buffer.from("not an image"),
    },
    { name: "clip.mp4", mimeType: "video/mp4", buffer: video },
  ]);
  await page
    .getByRole("button", { name: "Clean queued files", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Download ZIP (2)", exact: true }),
  ).toBeEnabled({ timeout: 90000 });
  assert.equal(
    await page
      .locator(".queue-select")
      .filter({ hasText: "Needs attention" })
      .count(),
    1,
  );
  await expect(page.locator(".preview-bottom")).toContainText("512 × 512"); // image resize must not affect video
  const mixedZipPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download ZIP (2)", exact: true })
    .click();
  const mixedZip = unzipSync(
    new Uint8Array(await readFile(await (await mixedZipPromise).path())),
  );
  assert.equal(Object.keys(mixedZip).length, 2);
  assert.ok(Object.keys(mixedZip).some((name) => name.endsWith(".webp")));
  assert.ok(Object.keys(mixedZip).some((name) => name.endsWith(".mp4")));
  await page
    .locator(".queue-select")
    .filter({ hasText: "creation.png" })
    .click();
  await expect(page.locator(".preview-bottom")).toContainText("256 × 256");
  await page.getByRole("button", { name: "Original", exact: true }).click();
  await expect(page.locator(".preview-bottom")).toContainText("512 × 512");
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "not-media.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("test"),
    });
  await expect(page.locator(".toast")).toContainText("choose PNG");
  assert.equal(await page.locator(".queue-item").count(), 0);
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.getByRole("button", { name: "Toggle settings" }).click();
  await expect(
    page.getByRole("heading", { name: "Make it your own" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(page.locator("nav")).toBeVisible();
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.screenshot({ path: ".qa/mobile-final.png", fullPage: true });
  const pages = {
    terms: "Terms of use",
    privacy: "Privacy policy",
    "acceptable-use": "Acceptable use",
    cookies: "Browser storage",
    guide: "guide",
    technology: "technology",
    faq: "questions",
    contact: "help",
  };
  for (const route of Object.keys(pages)) {
    await page.goto(`${origin}/${route}`);
    await expect(page.locator(".document-page")).toBeVisible();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `${route}: horizontal overflow`,
    );
  }
  await expect(
    page.locator('a[href="mailto:korisolution@gmail.com"]'),
  ).toBeVisible();
  await page.goto(`${origin}/terms`);
  await expect(page.locator(".document-date")).toContainText("29 October 2026");
  assert.equal(errors.length, 0, errors.join("\n"));
  const mediaUploads = network.filter(
    (r) =>
      r.bytes > 0 ||
      (!r.url.startsWith(origin) &&
        !r.url.startsWith("blob:") &&
        !r.url.startsWith("data:")),
  );
  assert.deepEqual(
    mediaUploads,
    [],
    "Application must not upload files or contact third-party services",
  );
  const report = {
    passed: true,
    assertions: [
      "demo PNG",
      "ZIP contents",
      "expanded preview",
      "theme/preferences persistence",
      "mixed queue + failure isolation",
      "WebP resize",
      "video dimensions independent of image settings",
      "original metadata",
      "invalid file rejection",
      "mobile settings/navigation",
      "legal/contact routes",
      "no JS errors",
      "no media uploads or third-party requests",
    ],
    requestsObserved: network.length,
  };
  await writeFile(".qa/ui-results.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
