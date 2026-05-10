import { defineConfig, devices } from "@playwright/test";

/**
 * Minimal E2E smoke — unauthenticated routes only.
 * Dev server: same as `npm run dev` (Vite prints http://localhost:8080 by default in this project).
 */
export default defineConfig({
  testDir: "./e2e",
  /* Serial: parallel workers + cold `npm run dev` can cause goto timeouts / ERR_ABORTED on this stack. */
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: "http://localhost:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
