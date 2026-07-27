# Play Store Publishing Checklist

## App identity
- App name: Tu Captes ?
- Package name: `com.npaysant.resteconnecte` (do not rename once published)
- Version: bump `versionCode` / `versionName` in `app/build.gradle` + `twa-manifest.json` before each upload

## Build output
- Android App Bundle (AAB): `app/build/outputs/bundle/release/app-release.aab`
- Build: `./gradlew :app:bundleRelease` (with `keystore.properties` present)

## Listing assets (`store/play/`)
- [x] App icon 512×512 — `store/play/icon-512.png` (generate via `node scripts/generate-play-store-assets.mjs`)
- [x] Feature graphic 1024×500 — `store/play/feature-graphic-1024x500.png`
- [ ] Phone screenshots (≥4) — drop into `store/play/screenshots/`
  - Accueil, Question du jour, Angle / Époque, Parcours « Tu as capté »

## Host / TWA
- Current host may still be `tanstack-start-ts.npaysant.workers.dev`
- Before production store release on branded domain, follow `docs/release/DOMAIN_CUTOVER.md`
- Theme color Captes blue: `#3d8bfd` (align TWA with web)

## Play Console forms
1. Open [Google Play Console](https://play.google.com/console)
2. Store listing + assets
3. Privacy policy URL: `https://<public-domain>/privacy`
4. App content: Data safety (account, analytics product, optional local notifications)
5. Ads: no ads
6. Target audience / content rating
7. Upload AAB → Internal testing → Production

## Post-upload
- Verify Digital Asset Links resolve on the public host
- TWA opens without Chrome address bar
