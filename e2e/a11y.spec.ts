import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/t/e2e_a11y", "/privacy", "/terms"] as const;

test.describe("Hoho.xo accessibility checks", () => {
  for (const route of ROUTES) {
    test(`${route} has zero serious or critical axe violations`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route);
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await page.waitForTimeout(850);

      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );

      expect(
        blocking,
        blocking
          .map(
            (v) =>
              `${v.impact ?? "unknown"} [${v.id}]: ${v.help} (${v.nodes.length} nodes)`,
          )
          .join("\n"),
      ).toEqual([]);
    });
  }
});
