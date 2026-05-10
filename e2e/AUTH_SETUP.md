# Playwright authenticated admin tests

## One-time: save an admin session (local/staging only)

Requirements:

1. Use a **dedicated staging or local-dev admin account** — never production.
2. `npm run dev` is running and the app is at `http://localhost:8080`.
3. Run:

```bash
npm run test:e2e:save-admin-session
```

This opens Playwright **Codegen**. In the controlled browser window:

1. Sign in via `/connexion` (email/password or OAuth as usual).
2. Navigate to **`/admin?tab=overview`** (or open Admin from the UI) and confirm you see the cockpit and tab strip as **admin**.
3. Close the Codegen browser window — Playwright saves cookies/local storage into **`e2e/.auth/admin.json`** automatically.

Folder `e2e/.auth/` is gitignored.

## Regenerate session

JWT refresh cookies expire periodically. When `admin-mobile-auth` tests fail at login/tablist, rerun the codegen command above.

## CI

Leave `e2e/.auth/` absent — unauthenticated suites still run; the `admin-mobile-auth` project is only registered when `admin.json` exists.
