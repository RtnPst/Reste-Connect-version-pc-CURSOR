# Pause — phase d’accumulation silencieuse

Pendant ~2 mois sans grosse évolution app, le produit **continue d’apprendre** via la base et l’éditorial.

---

## Ce qui tourne sans toi (tech)

- `user_concepts_seen` s’enrichit à chaque daily **si** la question a un `concept_key`.
- XP / streak / gameplay inchangés.

## Ce qui dépend de toi (léger, éditorial)

| Fréquence | Action | Durée indicative |
|-----------|--------|------------------|
| **Chaque daily** | Choisir la question + assigner `concept_key` (aligné pack si possible) | 5–15 min |
| **Hebdo** | Lancer vérif couverture (SQL ou `npm run verify:concept-foundation`) | 2 min |
| **Mensuel** | Relire 3 sorties daily en prod (correct + incorrect) — « ça sonne vivant ? » | 15 min |

**Objectif doux :** 100 % des questions du jour taguées `concept_key` sur la période.

---

## Ce qu’on ne fait pas pendant la pause

- Import massif des 101 Q JSON en prod sans reprise BUILD
- Nouveaux modes, Duel, social
- Redesign DA complet
- UI « mes concepts »

**OK :** continuer le pack JSON local (lots éditoriaux) — c’est du **stock**, pas du live.

---

## Reprise après pause

1. Relire `exports/foundation/concept-foundation-status-latest.json`
2. Décider : recap concept sur quiz thème ? backfill batch 2 ?
3. Première feature visible : **fil de concepts capturés** (très léger) — seulement si données suffisantes

---

## Signal que la pause a bien fonctionné

- Courbe `live_with_concept_key` en hausse
- Rows `user_concepts_seen` > 0 pour les utilisateurs daily actifs
- Copy daily toujours alignée émotionnellement (ton ressenti)
