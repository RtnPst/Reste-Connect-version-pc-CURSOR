# Play Store Publishing Checklist

## App identity
- App name: Reste Connecte
- Package name: `com.npaysant.resteconnecte`

## Build output
- Android App Bundle (AAB): `app/build/outputs/bundle/release/app-release.aab`

## Required Play Console assets
- App icon: 512x512 PNG
- Phone screenshots (at least 2 recommended)
- Feature graphic: 1024x500 PNG/JPG

## Upload steps (Play Console)
1. Open [Google Play Console](https://play.google.com/console) and select/create your app.
2. Go to **Release > Production**.
3. Click **Create new release**.
4. Upload `app-release.aab` from `app/build/outputs/bundle/release/`.
5. Complete Store Listing assets (icon, screenshots, feature graphic) and app details.
6. Complete App content forms (privacy policy, ads, data safety, target audience, etc.).
7. Review warnings/errors in Play Console and resolve blocking items.
8. Submit rollout for review.
