# Domain cutover — tucaptes.fr

Target public origin: `https://tucaptes.fr` (keep workers.dev as fallback until DNS is live).

## Checklist

1. Cloudflare Worker → Custom Domains → add `tucaptes.fr` (+ `www` redirect)
2. DNS: CNAME/ALIAS as Cloudflare instructs
3. Set prod build env:
   - `VITE_PUBLIC_APP_URL=https://tucaptes.fr`
   - `VITE_ANALYTICS_PHASE1_ENABLED=true`
4. Supabase Auth → URL configuration:
   - Site URL = `https://tucaptes.fr`
   - Redirect allowlist includes `https://tucaptes.fr/**` and legacy workers.dev if needed
5. Update TWA host before next Play AAB:
   - `twa-manifest.json` → `host`, `iconUrl`, `webManifestUrl`, `fullScopeUrl`
   - `app/build.gradle` `twaManifest.hostName`
6. Rebuild + deploy web, then rebuild Android AAB
7. Verify Digital Asset Links: `https://tucaptes.fr/.well-known/assetlinks.json`
8. Smoke: login Google, share URL, install PWA, TWA opens without Chrome toolbar

Until cutover, leave hosts on `tanstack-start-ts.npaysant.workers.dev`.
