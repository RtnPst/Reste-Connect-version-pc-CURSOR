# MonQuiz Launch Gate (20–30 min)

Use this before every deploy. Mark each item `PASS` / `FAIL` / `N/A`.

---

## Release info

| Field | Value |
|-------|-------|
| Date/time | |
| Commit SHA | |
| Target env | `staging` / `prod` |
| Deployer | |
| Analytics intended | `ON` / `OFF` |

---

## 1. Pre-deploy command gate (10–12 min)

### 1.1 Build

- [ ] `npm run build` → `PASS` (exit 0)

### 1.2 Browser smoke

- [ ] `npm run test:e2e` → `PASS` (all expected tests green)

### 1.3 Supabase/env sanity

- [ ] `npm run check:supabase` → `PASS`
- [ ] Confirms `.env` present and connectivity OK (no secret output copied to notes)

### 1.4 Analytics pipeline (when analytics is ON)

- [ ] `npm run analytics:phase1` → `PASS`
- [ ] Report script finishes and outputs latest summary artifacts

**Block immediately if any required command fails.**

---

## 2. Environment correctness gate (3–5 min)

- [ ] **Supabase target** matches the intended project for this deploy
- [ ] `VITE_PUBLIC_APP_URL` matches the target public URL for this deploy
- [ ] `VITE_ANALYTICS_PHASE1_ENABLED` matches release intention (`ON` / `OFF`)
- [ ] Cloudflare Worker / deployment target matches `staging` vs `prod`
- [ ] No production credentials mixed into staging/local tooling or Playwright `e2e/.auth/` files

---

## 3. Manual product gate (8–10 min)

### 3.1 Auth sanity

- [ ] Login works (`/connexion`)
- [ ] Refresh keeps session
- [ ] Logout works and protected routes behave as expected

### 3.2 One logged-in player flow

- [ ] Complete one short flow (e.g. `/quiz` theme OR `/marathon`)
- [ ] Result or end screen / CTA renders correctly
- [ ] No critical console errors

### 3.3 One admin cockpit check (admin account)

- [ ] `/admin?tab=overview` loads
- [ ] Cockpit tab strip visible and usable
- [ ] At least one other tab loads (e.g. `analytics` or `concept_intake`)
- [ ] No broken layout; no accidental destructive/write action triggered

### 3.4 Mobile viewport quick check (~375px)

- [ ] Home loads without catastrophic horizontal overflow
- [ ] One quiz-related screen stays usable
- [ ] Admin shell / tabs do not break overall page layout

### 3.5 Analytics sanity (if enabled)

- [ ] One logged-in mini-flow produces no crashes or noisy errors
- [ ] Evidence of ingest/report (script output, dashboard, or row check as you prefer)

---

## 4. Go / No-Go rules

### No-Go (block deploy)

- [ ] Build fails
- [ ] Playwright smoke (`test:e2e`) fails on required suites
- [ ] Wrong Supabase project or env mismatch
- [ ] Auth broken (login / session persistence / logout)
- [ ] Core player flow cannot complete
- [ ] Admin access path broken **if operators need it for this release**

### Can wait (document as follow-up)

- Minor copy / cosmetic layout issues
- Non-blocking warnings (`check:culture-pop-tags`, benign console noise)
- Extra device/browser coverage outside launch scope
- Deeper analytics dashboard polish

---

## 5. Post-deploy verification (5 min)

Run on the **live** URL immediately after deploy.

- [ ] Public URL opens
- [ ] Key routes load: `/`, `/quiz`, `/niveaux`, `/marathon`, `/question-du-jour`
- [ ] `/admin` behaves as expected (guest vs admin)
- [ ] Login works against deployed env
- [ ] Analytics still healthy if enabled (no obvious ingest break)
- [ ] No spike of critical errors in monitoring / logs (if available)

---

## 6. Deploy decision

| Field | Value |
|-------|-------|
| **Decision** | `GO` / `NO-GO` |
| **Reason** | |
| **If NO-GO — next action** | |
| **If GO — monitor owner + window** | e.g. first 60 minutes |

---

## 7. After-release monitoring

- [ ] Auth / redirect loops
- [ ] Quiz completion or progression errors
- [ ] Admin cockpit snapshot / load errors
- [ ] Analytics volume or insert failures (if ON)
- [ ] Client or worker exception rate

---

## Optional: authenticated Playwright

If `e2e/.auth/admin.json` exists, `npm run test:e2e` includes the `admin-mobile-auth` project. See `e2e/AUTH_SETUP.md`. Regenerate session when it expires.
