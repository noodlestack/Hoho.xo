import { expect, test } from "@playwright/test";

test.describe("Hoho.xo core user flow", () => {
  test("owner claims handle, visitor sends note without body leak, owner unwraps and opens Story reply card", async ({
    browser,
    page,
  }) => {
    const handle = "e2e_tree_01";
    const secretMessage = "Happy holidays from E2E!";

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );

    const handleInput = page.locator("#owner-handle-input");
    await expect(handleInput).toBeVisible();
    await handleInput.fill(handle);
    await page.getByRole("button", { name: "Set", exact: true }).click();

    await expect(page.getByText(`Active handle set to @${handle}`)).toBeVisible(
      { timeout: 10_000 },
    );
    await expect(page.locator('.error-box[role="alert"]')).toHaveCount(0);

    // Reloading should stay authenticated via HttpOnly cookie with no 409 error
    await page.reload();
    await expect(page.getByRole("button", { name: /Mail \(0\)/ })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('.error-box[role="alert"]')).toHaveCount(0);

    // Visitor opens /t/[handle] in an isolated context with zero owner cookies
    const visitorContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const visitorPage = await visitorContext.newPage();
    await visitorPage.goto(`/t/${handle}`);

    await expect(visitorPage.locator("canvas.tree-canvas")).toBeVisible();
    await visitorPage.locator("#visitor-note-input").fill(secretMessage);
    await visitorPage
      .getByRole("button", { name: "Send anonymous note" })
      .click();

    await expect(
      visitorPage.getByText(`Ornament hung on @${handle}'s tree!`),
    ).toBeVisible({ timeout: 10_000 });

    // Privacy invariant: public API response never exposes message body or read status
    const publicRes = await visitorContext.request.get(`/api/trees/${handle}`);
    expect(publicRes.ok()).toBe(true);
    const publicText = await publicRes.text();
    expect(publicText).not.toContain(secretMessage);
    const publicJson = JSON.parse(publicText) as {
      ornaments: Array<{ readAt: unknown; body?: string }>;
    };
    expect(publicJson.ornaments.length).toBeGreaterThanOrEqual(1);
    for (const ornament of publicJson.ornaments) {
      expect(ornament.readAt).toBeNull();
      expect(ornament.body).toBeUndefined();
    }
    await visitorContext.close();

    // Owner sees unread ornament count update and unwraps note + reply card
    await page.reload();
    const mailBtn = page.getByRole("button", { name: /Mail \(1\)/ });
    await expect(mailBtn).toBeVisible({ timeout: 10_000 });
    await mailBtn.click();

    await expect(page.locator("#mail-drawer-title")).toContainText("Mail (1)");
    await page.getByRole("button", { name: new RegExp(secretMessage) }).click();

    await expect(page.locator("#msg-card-title")).toBeVisible();
    await expect(page.locator(".message-reading-body")).toContainText(
      secretMessage,
    );

    await page.locator("#story-reply-input").fill("Thank you!");
    await page.getByRole("button", { name: "Share Story card" }).click();
    await expect(
      page.locator('img[alt="1080 by 1920 Story share card preview"]'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("keyboard shortcuts toggle QR mode and help dialog safely", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );

    const treeTab = page.getByRole("button", { name: "Tree", exact: true });
    const qrTab = page.getByRole("button", { name: "QR Code", exact: true });

    await expect(treeTab).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("q");
    await expect(qrTab).toHaveAttribute("aria-pressed", "true");

    await page.keyboard.press("q");
    await expect(treeTab).toHaveAttribute("aria-pressed", "true");

    await page.keyboard.press("?");
    const shortcutsDialog = page.getByRole("dialog", {
      name: "Keyboard shortcuts",
    });
    await expect(shortcutsDialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(shortcutsDialog).toBeHidden();

    // Typing 'q' inside an input must not toggle QR mode
    await page.locator("#owner-handle-input").focus();
    await page.keyboard.press("q");
    await expect(qrTab).toHaveAttribute("aria-pressed", "false");
  });
});
