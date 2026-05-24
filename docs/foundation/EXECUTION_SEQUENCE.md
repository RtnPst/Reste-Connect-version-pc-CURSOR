# Séquence d’exécution — fondations « concepts capturés »

Document de référence pour la phase **avant pause**.  
Produit : intuition & ton · Technique : agent + checklists ci-dessous.

---

## Rôles (partenariat)

| Toi | Agent / technique |
|-----|-------------------|
| Ton émotionnel, « ça sonne vivant ? » | Ordre des PR, migrations, régressions |
| Valider copy (« Tu as capté », « Pas encore ») | Scripts de vérif prod |
| Taguer le **sens** des concepts (pack, daily) | `concept_key`, RPC, mémoire silencieuse |
| Dire « go » / « stop » sur une PR | Branches, merge, runbooks |

Tu **n’as pas** à savoir si une migration est appliquée : lancer `npm run verify:concept-foundation` ou suivre `PROD_VERIFICATION_GUIDE.md`.

---

## Gel code (flexible)

**Objectif :** la version la plus **cohérente** possible avant ta période de travail — pas une date fixe.

**Critère de « prêt pour la pause » (Definition of Done) :**

- [ ] Vérif prod : colonne `concept_key` + pilote 40 OK
- [ ] Daily exit « Tu as capté » / « Pas encore » en prod
- [ ] Hub `/play` sans Duel ni Marathon ; daily en hero
- [ ] Marathon accessible **discrètement** (Réglages ou Stats)
- [ ] `user_concepts_seen` + écriture daily (même peu de données)
- [ ] Runbook pause lu (`PAUSE_ACCUMULATION.md`)

**Buffer :** prévoir 2 jours de marge après la dernière PR pour QA manuelle.

---

## Ordre des PR (ne pas réordonner)

| # | Branche / PR | Contenu | Bloqué par |
|---|--------------|---------|------------|
| 0 | — | `npm run verify:concept-foundation` | `.env` |
| 1 | `foundation/01-types-and-audit` | Types TS + script audit | Vérif prod colonne OK |
| 2 | `foundation/02-rpc-concept-key` | RPC retourne `concept_key` | PR1 |
| 3 | `foundation/03-concept-memory` | Table + RLS + upsert | PR2 |
| 4 | `foundation/04-daily-write` | Écriture silencieuse daily | PR3 |
| 5 | `foundation/05-daily-exit` | Copy + layout exit | PR2 (labels) ; PR4 optionnel |
| 6 | `foundation/06-shell-hub` | `/play`, Continue, marathon discret | PR5 recommandé |
| 7 | `foundation/07-pause-runbook` | Doc seule | — |

**Après pause :** recap quiz thème, UI territoires, backfill massif.

---

## Calendrier type (6–8 j dev)

| Sprint | Jours | Livrable |
|--------|-------|----------|
| 0 Vérif | J0 | Rapport `concept-foundation-status-latest.json` |
| 1 Plomberie | J1–J2 | PR1–2 mergés |
| 2 Mémoire | J3–J4 | PR3–4 mergés |
| 3 Signature | J5 | PR5 daily exit |
| 4 Shell | J6–J7 | PR6–7 + QA régression |
| Buffer | J8–J9 | Corrections, gel |

Ajuster selon ta date de reprise : **on coupe le scope, pas la qualité** (ex. reporter PR4 si DB pas prête).

---

## Non-régression (avant chaque merge)

1. Daily complète (connecté) — streak / XP.
2. Daily déjà faite — écran inchangé.
3. Quiz thème 10 questions — résultats.
4. Niveau 1 — fin + progression.
5. Invité — pas de crash.
6. URL directe `/marathon` et `/duel` — toujours accessibles.

---

## Décisions produit verrouillées

- **Duel** : hors hub, route conservée.
- **Marathon** : hors hub, lien discret (Réglages ou Stats).
- **Daily incorrect** : pas « Tu as capté » — voir `DAILY_EXIT_COPY.md`.
- **Mémoire** : écriture uniquement si `concept_key` DB non null (pas le proxy texte).
- **Territoires** : 5 lentilles documentées dans `TERRITORIES.md` — pas d’UI avant pause.

---

## Documents liés

- `PROD_VERIFICATION_GUIDE.md` — état Supabase
- `DAILY_EXIT_COPY.md` — textes exit daily
- `TERRITORIES.md` — structure long terme
- `PAUSE_ACCUMULATION.md` — pendant ta pause
