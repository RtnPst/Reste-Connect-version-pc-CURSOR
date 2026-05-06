/**
 * Deploy Cloudflare Worker with quieter logs (avoids hundreds of
 * [ignored-bare-import] lines from WRANGLER + sideEffects:false deps).
 *
 * Usage: npm run build && npm run deploy
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.env.WRANGLER_LOG = "error";

const args = [
  "wrangler",
  "deploy",
  resolve(root, "dist/server/server.js"),
  "--assets",
  resolve(root, "dist/client"),
  "--config",
  resolve(root, "dist/client/wrangler.json"),
];

const r = spawnSync("npx", args, { stdio: "inherit", shell: true, cwd: root });
process.exit(r.status ?? 1);
