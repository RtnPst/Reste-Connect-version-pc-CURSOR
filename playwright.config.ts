import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const adminStorageStatePath = path.join(configDir, "e2e", ".auth", "admin.json");
const adminAuthConfigured = fs.existsSync(adminStorageStatePath);

/**
 * E2E: desktop + guest mobile smoke. Optional authenticated admin mobile when `e2e/.auth/admin.json` exists.
 * See `e2e/AUTH_SETUP.md`.
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
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: ["**/mobile-smoke.spec.ts", "**/admin-mobile-auth.spec.ts"],
    },
    {
      name: "mobile-smoke",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
      },
      testMatch: "**/mobile-smoke.spec.ts",
    },
    ...(adminAuthConfigured
      ? [
          {
            name: "admin-mobile-auth",
            use: {
              ...devices["Desktop Chrome"],
              viewport: { width: 375, height: 812 },
              storageState: adminStorageStatePath,
            },
            testMatch: "**/admin-mobile-auth.spec.ts",
          },
        ]
      : []),
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
