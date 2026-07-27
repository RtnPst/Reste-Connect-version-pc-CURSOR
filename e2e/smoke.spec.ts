import { test, expect } from "@playwright/test";
import { attachPageErrorGuard, logConsoleErrors } from "./helpers";

test.describe("unauthenticated smoke", () => {
  test("home /", async ({ page }) => {
    const getPageErrors = attachPageErrorGuard(page);
    logConsoleErrors(page);
    const res = await page.goto("/");
    expect(res?.ok(), `HTTP ${res?.status()}`).toBeTruthy();
    await expect(page).toHaveTitle(/Tu\s*captes/i);
    expect(getPageErrors(), "uncaught page errors").toEqual([]);
  });

  test("theme picker /quiz", async ({ page }) => {
    const getPageErrors = attachPageErrorGuard(page);
    logConsoleErrors(page);
    const res = await page.goto("/quiz");
    expect(res?.ok(), `HTTP ${res?.status()}`).toBeTruthy();
    await expect(page.getByRole("heading", { name: /Une lecture du web|Quelle piste|Choisis ton angle/i })).toBeVisible();
    expect(getPageErrors(), "uncaught page errors").toEqual([]);
  });

  test("levels hub /niveaux", async ({ page }) => {
    const getPageErrors = attachPageErrorGuard(page);
    logConsoleErrors(page);
    const res = await page.goto("/niveaux");
    expect(res?.ok(), `HTTP ${res?.status()}`).toBeTruthy();
    await expect(page).toHaveTitle(/niveaux|Niveaux|Tu captes/i);
    expect(getPageErrors(), "uncaught page errors").toEqual([]);
  });

  test("marathon /marathon", async ({ page }) => {
    const getPageErrors = attachPageErrorGuard(page);
    logConsoleErrors(page);
    const res = await page.goto("/marathon");
    expect(res?.ok(), `HTTP ${res?.status()}`).toBeTruthy();
    await expect(page).toHaveTitle(/Marathon|Tu captes/i);
    expect(getPageErrors(), "uncaught page errors").toEqual([]);
  });

  test("daily question /question-du-jour", async ({ page }) => {
    const getPageErrors = attachPageErrorGuard(page);
    logConsoleErrors(page);
    const res = await page.goto("/question-du-jour");
    expect(res?.ok(), `HTTP ${res?.status()}`).toBeTruthy();
    await expect(page).toHaveTitle(/jour|Tu captes/i);
    expect(getPageErrors(), "uncaught page errors").toEqual([]);
  });

  test(
    "/admin redirects or shows protected shell when unauthenticated",
    async ({ page }) => {
      const getPageErrors = attachPageErrorGuard(page);
      logConsoleErrors(page);
      await page.goto("/admin", { waitUntil: "load" });
      /* Guest UX: client may navigate to /connexion OR render "Accès réservé" on /admin. */
      const accèsRéservé = page.getByRole("heading", { name: /Accès réservé/i });
      const connexionFlow = page.getByRole("heading", {
        name: /Reprendre ton fil|Garder ton fil|Bon retour|Créer mon compte/i,
      });
      await expect(accèsRéservé.or(connexionFlow)).toBeVisible({ timeout: 60_000 });
      expect(getPageErrors(), "uncaught page errors").toEqual([]);
    },
    { timeout: 70_000 },
  );
});
