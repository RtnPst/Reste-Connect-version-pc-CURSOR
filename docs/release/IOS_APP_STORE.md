# iOS / App Store (Capacitor shell)

Tu Captes web is wrapped like the Android TWA: the native shell loads the **production URL**.

## Status

- Config: `capacitor.config.json` (`com.npaysant.tucaptes`)
- Native `ios/` project is generated on a **Mac** with Xcode (not on Windows CI)

## One-time setup (Mac)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios --save
npx cap add ios
# Point server.url at the branded domain after cutover (see docs/release/DOMAIN_CUTOVER.md)
npx cap sync ios
npx cap open ios
```

## App Store Connect

1. Bundle ID: `com.npaysant.tucaptes`
2. Privacy policy: `https://<domaine>/privacy`
3. Account deletion URL / process: `https://<domaine>/delete-account`
4. Screenshots: reuse `store/play/screenshots/` cropped for iPhone sizes, or capture from Simulator
5. Archive → TestFlight → App Review

## After domain cutover

Update `capacitor.config.json` → `server.url` to `https://tucaptes.fr`, then `npx cap sync ios`.
