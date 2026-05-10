import { test, expect } from "@playwright/test";
import { attachPageErrorGuard, logConsoleErrors, expectNoCatastrophicDocumentOverflow } from "./helpers";

/**
 * Authenticated mobile cockpit smoke (375×812).
 * Requires `e2e/.auth/admin.json` from `npm run test:e2e:save-admin-session` (staging/local admin).
 */
test.describe("authenticated admin mobile cockpit", () => {
  test(
    "/admin?tab=overview loads with cockpit tab strip",
    async ({ page }) => {
      const getPageErrors = attachPageErrorGuard(page);
      logConsoleErrors(page);

      await page.goto("/admin?tab=overview", { waitUntil: "load", timeout: 60_000 });

      await expect(page).toHaveTitle(/Administration/i, { timeout: 45_000 });
      /*
       * CockpitTriggers render a radix tablist. Snapshot panels may still be loading —
       * the tabstrip should appear early for admins.
       */
      await expect(page.getByRole("tablist")).toBeVisible({ timeout: 90_000 });

      await expectNoCatastrophicDocumentOverflow(page);
      expect(getPageErrors(), "uncaught page errors").toEqual([]);
    },
    { timeout: 120_000 },
  );
});
