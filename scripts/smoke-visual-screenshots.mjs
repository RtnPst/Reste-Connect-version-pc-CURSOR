/**
 * Visual smoke screenshots for agent review (local or against prod URL).
 * Usage:
 *   node scripts/smoke-visual-screenshots.mjs
 *   BASE_URL=https://tanstack-start-ts.npaysant.workers.dev node scripts/smoke-visual-screenshots.mjs
 *
 * Writes PNGs under exports/smoke-visual/ — agent can Read those images.
 */
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "exports/smoke-visual");
const base = (process.env.BASE_URL ?? "http://127.0.0.1:8080").replace(/\/+$/, "");

const pages = [
  { name: "accueil", path: "/" },
  { name: "play", path: "/play" },
  { name: "parcours", path: "/parcours" },
];

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

for (const p of pages) {
  const url = `${base}${p.path}`;
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(800);
    const file = resolve(outDir, `${p.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log("OK", p.name, "→", file);
  } catch (e) {
    console.error("FAIL", p.name, url, e.message);
  }
}

await browser.close();
console.log("Done. Agent: Read exports/smoke-visual/*.png to judge layout.");
