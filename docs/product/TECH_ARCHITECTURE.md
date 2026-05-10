# TECH ARCHITECTURE (v1)

> **Mise à jour v1.1** — Décisions créateur intégrées (sans réécriture complète du document).

## Pourquoi ce document existe
Donner une vue d'ensemble technique lisible, orientée produit, pour éviter de perdre le fil entre stack et objectifs.

### Comment les futurs agents Cursor doivent utiliser ce document
- Commencer par cette vue d'ensemble avant toute modif technique importante.
- Vérifier compatibilité avec les contraintes de release (build/tests/deploy).
- Éviter les refactors lourds sans besoin produit explicite.

## Stack actuelle (haut niveau)
- **Frontend/App**: TanStack Start + Vite (React/TypeScript).
- **Backend/Data**: Supabase (auth, tables, RPC).
- **Hosting/Runtime**: Cloudflare Workers.
- **Tests e2e**: Playwright.
- **Admin cockpit**: `/admin` avec zones read-only et zone d'écriture legacy.
- **Analytics**: scripts phase0/phase1 + table `analytics_events` (phase 1).

## Flux simplifié
1. App build via Vite.
2. Build génère `dist/client/wrangler.json`.
3. Postbuild patch injecte vars Supabase.
4. Deploy worker sert SSR + assets.

## Environnements (résumé)
- Variables Vite (`VITE_*`) injectées au build.
- Secrets serveur (ex: `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) via Worker secrets.
- `VITE_PUBLIC_APP_URL` doit rester aligné avec l'URL publique.

### Staging vs prod (v1.1)
- **Court terme** : une séparation **légère** entre environnements / données de test est acceptable tant que le produit reste petit.
- **À mûrir** : une séparation **plus forte** staging/prod (données, secrets, procédures) dès que la surface de risque augmente (plus d'éditeurs, plus de flux automatisés, plus de joueurs).

## Qualité & sécurité opérationnelle
- Build + Playwright smoke avant release.
- Vérification Supabase target avant deploy.
- Distinction stricte entre données de prod et exports locaux.

## Notes architecture produit
- Le système évolue vers un modèle concept-first (concept -> variantes de questions).
- `concept_key` est la brique légère envisagée pour cette transition (sans table concepts séparée pour l'instant).

## Décisions v1.1 (validées)
- Staging/prod : **léger OK maintenant**, **plus strict plus tard** selon la croissance.
- Releases : privilégier l'**incrémental sûr** quand le contexte le permet.

## À affiner plus tard
- Niveau de monitoring post-deploy souhaité.
- Roadmap technique minimale pour supporter la stratégie éditoriale (sans overengineering).
