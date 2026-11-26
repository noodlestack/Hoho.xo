import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1440x900", width: 1440, height: 900 },
] as const;

test.describe("Hoho.xo visual regression snapshots", () => {
  test.beforeAll(async ({ request }) => {
    await request.post("/api/trees", {
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      data: {
        handle: "e2e_visual",
        config: {
          displayName: "Visual Tree",
          prompt: "Leave a kind anonymous note before Christmas",
        },
      },
    });
  });

  for (const vp of VIEWPORTS) {
    test(`owner studio static snapshot at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/?static=1");
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );
      });
      await expect(page).toHaveScreenshot(`studio-${vp.name}.png`, {
        maxDiffPixelRatio: 0.02,
        animations: "disabled",
        mask: [page.locator(".countdown-pill")],
      });
    });

    test(`visitor page static snapshot at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/t/e2e_visual?static=1");
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );
      });
      await expect(page).toHaveScreenshot(`visitor-${vp.name}.png`, {
        maxDiffPixelRatio: 0.02,
        animations: "disabled",
        mask: [page.locator(".countdown-pill")],
      });
    });
  }
});
