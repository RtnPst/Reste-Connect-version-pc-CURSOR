/**
 * Build signed TWA release APK (local). Requires:
 * - android.keystore + keystore.properties at repo root (gitignored)
 * - Bubblewrap JDK + Android SDK (default: ~/.bubblewrap)
 *
 * Output: releases/tu-captes-release.apk
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const isWin = process.platform === "win32";
const gradlew = join(root, isWin ? "gradlew.bat" : "gradlew");

const jdkHome = join(homedir(), ".bubblewrap", "jdk", "jdk-17.0.11+9");
const androidHome =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  join(homedir(), ".bubblewrap", "android_sdk");

if (!existsSync(gradlew)) {
  console.error("gradlew not found — run bubblewrap init in this repo first.");
  process.exit(1);
}
if (!existsSync(join(root, "keystore.properties"))) {
  console.error("Missing keystore.properties at project root (see keystore.properties.example).");
  process.exit(1);
}
if (!existsSync(join(root, "android.keystore"))) {
  console.error("Missing android.keystore at project root.");
  process.exit(1);
}

const env = {
  ...process.env,
  JAVA_HOME: existsSync(jdkHome) ? jdkHome : process.env.JAVA_HOME,
  ANDROID_HOME: androidHome,
  ANDROID_SDK_ROOT: androidHome,
};

console.log("Building signed release APK…");
const build = spawnSync(gradlew, ["assembleRelease", "--no-daemon"], {
  cwd: root,
  env,
  stdio: "inherit",
  shell: isWin,
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const apkDir = join(root, "app", "build", "outputs", "apk", "release");
const apkFile = readdirSync(apkDir).find((f) => f.endsWith(".apk"));
if (!apkFile) {
  console.error("No APK found in", apkDir);
  process.exit(1);
}

const src = join(apkDir, apkFile);
const outDir = join(root, "releases");
mkdirSync(outDir, { recursive: true });
const dest = join(outDir, "tu-captes-release.apk");
copyFileSync(src, dest);

console.log("\nAPK ready:", dest);
console.log("Install on device: adb install -r", dest);
