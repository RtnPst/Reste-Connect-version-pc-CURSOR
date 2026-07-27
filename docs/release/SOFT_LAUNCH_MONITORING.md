# Soft launch + 48h monitoring

## Soft launch

1. Share prod URL (workers.dev until `tucaptes.fr` cutover) with 20–50 people
2. Ask them to: fil du jour → one angle → share « Tu as capté » → optional duel
3. Collect friction (auth, empty daily, share, install PWA)

## 48h monitoring checklist

- [ ] Auth: email login + Google OAuth on the public domain
- [ ] Daily: `npm run check:daily-calendar` → no gaps for next 14 days
- [ ] Analytics: new rows in `analytics_events` after a logged-in session (kill switch ON in Worker build)
- [ ] Errors: Cloudflare Worker logs / browser console spikes
- [ ] Support inbox: `npaysant@gmail.com` — reply within 48–72h
- [ ] Store tracks: Play internal testing installs; TestFlight if iOS shell ready

## Go / No-Go for broader open

Use `docs/release/LAUNCH_GATE.md`. Block if daily empty, auth broken, or analytics/env mismatch.
