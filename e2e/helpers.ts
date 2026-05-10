import { expect, type Page } from "@playwright/test";

export function attachPageErrorGuard(page: Page): () => string[] {
  const messages: string[] = [];
  page.on("pageerror", (err) => {
    messages.push(err.message);
  });
  return () => messages;
}

export function logConsoleErrors(page: Page): void {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[browser console.error] ${msg.text()}`);
    }
  });
}

/**
 * Soft layout guard — not pixel-perfect visual regression.
 * Allows a few px slack for scrollbar / subpixel rounding.
 */
export async function expectNoCatastrophicDocumentOverflow(page: Page): Promise<void> {
  const extraPx = await page.evaluate(() => {
    const vw = Math.min(window.innerWidth, document.documentElement.clientWidth);
    const sw = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0);
    return sw - vw;
  });
  expect(extraPx, `document wider than viewport by ${extraPx}px`).toBeLessThanOrEqual(12);
}
