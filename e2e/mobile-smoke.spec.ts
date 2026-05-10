import { test, expect } from "@playwright/test";
import { attachPageErrorGuard, logConsoleErrors, expectNoCatastrophicDocumentOverflow } from "./helpers";

/** 375px mobile smoke — Chromium only via playwright project config. No auth yet. */

test.describe("mobile 375 smoke (guest)", () => {
  test("home / loads", async ({ page }) => {
    const getPageErrors = attachPageErrorGuard(page);
    logConsoleErrors(page);
    const res = await page.goto("/", { waitUntil: "load" });
    expect(res?.ok(), `HTTP ${res?.status()}`).toBeTruthy();
    await expect(page).toHaveTitle(/Tu captes/);
    await expectNoCatastrophicDocumentOverflow(page);
    expect(getPageErrors(), "uncaught page errors").toEqual([]);
  });

  test("/quiz loads", async ({ page }) => {
    const getPageErrors = attachPageErrorGuard(page);
    logConsoleErrors(page);
    const res = await page.goto("/quiz", { waitUntil: "load" });
    expect(res?.ok(), `HTTP ${res?.status()}`).toBeTruthy();
    await expect(page.getByRole("heading", { name: /Quelle piste tu testes/i })).toBeVisible();
    await expectNoCatastrophicDocumentOverflow(page);
    expect(getPageErrors(), "uncaught page errors").toEqual([]);
  });

  test("/niveaux loads", async ({ page }) => {
    const getPageErrors = attachPageErrorGuard(page);
    logConsoleErrors(page);
    const res = await page.goto("/niveaux", { waitUntil: "load" });
    expect(res?.ok(), `HTTP ${res?.status()}`).toBeTruthy();
    await expect(page).toHaveTitle(/niveaux|Niveaux|Tu captes/i);
    await expectNoCatastrophicDocumentOverflow(page);
    expect(getPageErrors(), "uncaught page errors").toEqual([]);
  });

  test(
    "/admin guest shell loads without layout blowout",
    async ({ page }) => {
      const getPageErrors = attachPageErrorGuard(page);
      logConsoleErrors(page);
      await page.goto("/admin", { waitUntil: "load" });
      const accèsRéservé = page.getByRole("heading", { name: "Accès réservé" });
      const connexionFlow = page.getByRole("heading", { name: /Bon retour !|Créer mon compte/ });
      await expect(accèsRéservé.or(connexionFlow)).toBeVisible({ timeout: 60_000 });
      /*
       * Cockpit tab strip appears only when logged in as admin (future auth tests).
       * Here we guard whole-page horizontal overflow after the resolved guest UX.
       */
      await expectNoCatastrophicDocumentOverflow(page);
      expect(getPageErrors(), "uncaught page errors").toEqual([]);
    },
    { timeout: 70_000 },
  );
});
