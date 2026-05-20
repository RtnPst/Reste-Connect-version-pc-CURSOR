# Checklist — revue de lot culturel (v1)

> **Statut** : checklist opérationnelle avant validation d’un lot (candidats, fiches pack, questions pilote).  
> **Durée cible** : 30–45 min pour un triage 10–15 candidats ; 15–20 min par concept validé.  
> **Liens** : `AUTHENTICITY_AND_ANTI_GLOSSARY.md`, `EDITORIAL_BIBLE.md`, `src/data/cultural-pack-v1.json`.

## Quand utiliser cette checklist

| Étape | Checklist à appliquer |
|-------|------------------------|
| Triage 10–15 candidats (glossaire / pool / intake) | § A uniquement |
| Validation fiche pack `draft` → `approved` | § A + § B |
| Validation 3–5 questions pilote | § A + § B + § C |
| Avant import Supabase / live | § A + § B + § C + § D |

**Règle de lot** : max **10–15 candidats** en triage → max **3–5 fiches** → max **3–5 questions** par concept. Pas tout en une session.

---

## A — Triage candidat (avant fiche pack)

### Authenticité & source

- [ ] Source notée : `observed_pool` | `glossary_article` | `pdf_list` | `intake_raw`
- [ ] `glossary_only` coché si mot **surtout** article/PDF
- [ ] Test voix haute : « des humains parlent-ils vraiment comme ça ? »
- [ ] `usage_vitality` proposé : living / passive / listed_only / reject
- [ ] `import_confidence` : high | medium | low | reject

### Doublons & clés

- [ ] Pas de collision avec `cultural-pack-v1.json` (même `concept_key` ou même sens)
- [ ] Grep exports : `concept-key-suggestions`, `dedup-audit-flat` (texte normalisé)
- [ ] Pas de `concept_key` **question-shaped** (`que_signifie_*`, `qui_est_*`)
- [ ] Si clé pool différente → `legacy_concept_keys` prévu (ex. `cest_carre` → `carre`)

### Forme & vitalité

- [ ] `concept_key` sémantique (`snake_case`, mot/expression)
- [ ] `surface_forms` : 2–5 formes, **plus observée en premier**
- [ ] Pas `lifecycle: peak` sur un mot `listed_only`

### Décision lot

| Décision | Critère |
|----------|---------|
| **Tier A — fiche draft** | living/observed_irl + pool ou preuve forte + scènes faciles |
| **Tier B — watchlist** | glossaire seul, passif daté, collision sémantique à trancher |
| **Tier C — reject** | theoretical, question-shaped, pas de surface crédible |

---

## B — Fiche pack (avant `approved`)

### Contenu minimal

- [ ] `short_definition` : 1 phrase située, pas encyclopédie
- [ ] `long_definition` alignée `usage_vitality` (pas « circule partout » si `listed_only`)
- [ ] `context_pack` rempli : messages, contextes, **avoid_scenes**, pièges
- [ ] `example_usage` : 1–3 lignes attestées ou « scène type » explicite
- [ ] `ia_notes` : scènes OK / interdites
- [ ] `human_notes` : décisions doublons, doutes

### Preuves sociales

- [ ] Au moins 1 preuve : pool | 2 sources | capture/commentaire documenté
- [ ] `plausible_traps` = confusions **réelles** (pas 3 absurdes)
- [ ] `adult_errors` listés (étymologie-longue, parent sketch, etc.)

### Anti-patterns (refus si coché sans correction)

- [ ] Pas parent au dîner + mot rare
- [ ] Pas psy TikTok / diagnostic toxique
- [ ] Pas journaliste qui explique internet
- [ ] Pas graphie site prioritaire sans `surface_forms` réalistes

---

## C — Questions pilote (3–5 max par concept)

### Formulation

- [ ] **Pas** « Que veut dire X ? » / « Définissez… »
- [ ] Scène = message, vocal, commentaire, debrief, capture
- [ ] Ton **naturel** — relu à voix haute
- [ ] Lisible **35–55** (éviter stack slang + « L + ratio + touch grass » sauf cible initie assumée)
- [ ] Pas de faux-jeune / pas moquerie générationnelle

### Gameplay

- [ ] `concept_key` = clé pack
- [ ] `theme` cohérent (`default_theme_hint` ou proche)
- [ ] 4 choix : distracteurs **crédibles dans le contexte** de la question
- [ ] Pas de règle méta « le plus long / le plus drôle = faux »
- [ ] `explanation` : 1–2 phrases vivantes + exemple social court
- [ ] Angles **variés** sur le lot (pas 3× même lecture émotion)

### Enums (si import admin plus tard)

- [ ] `context`, `tone`, `trap_intensity`, `format`, `era` : valeurs admin existantes
- [ ] Cohérence difficulté / piège (facile = piège léger)

### Statut

- [ ] Fichier pilote JSON (`*-pilot-questions-v1.json`) ou statut `draft_review`
- [ ] **Pas** import DB tant que checklist incomplète

---

## D — Avant live (plus tard)

- [ ] Rewrite si question archive scolaire
- [ ] `concept_key` en base = clé pack (legacy mappé)
- [ ] Relecture créateur sur le lot, pas une ligne isolée
- [ ] Pas publier 5 questions même angle d’affilée

---

## Grille rapide — distracteurs

| OK | Éviter |
|----|--------|
| Confusion réelle (maladie / stats / drapeau littéral) | 3 réponses hors-sujet évidentes |
| Même registre que la bonne réponse | Gimmick répété sur tout le catalogue |
| Parfois réponse surprenante **si** le contexte le justifie | « Drôle = faux » systématique |

---

## Watchlist vs reject

| | **Watchlist** (`draft` + notes) | **Reject** (pas de fiche) |
|--|------------------------------|---------------------------|
| **Exemples** | `magl`, intake `aura farming`, collision `cest_valide`/`carre` | `mog`, clé `que_signifie_*`, micro-trend sans preuve |
| **Questions** | Non | Non |
| **Action** | Enrichir preuves, revue plus tard | Archiver candidat |

---

## Glossaire-only — rappel 30 secondes

Si **oui** à 2+ items → `glossary_only: true`, pas de questions :

- Mot trouvé seulement dans article/PDF
- 0 trace pool / dedup
- Scène impossible sans « NPC »
- Pilote sonne artificiel (cf. `magl`)

---

## Exports utiles (repo)

- `exports/dedup-audit/concept-key-suggestions-latest.csv`
- `exports/dedup-audit/dedup-audit-flat-latest.csv`
- `exports/dedup-audit/concept-intake-v1-review-latest.json`
- `src/data/cultural-pack-v1.json`
- Pilotes : `src/data/*-pilot-questions-v1.json`

---

## Ce qui reste ouvert (volontairement)

- Score automatique « authenticité » — pas de tooling V1.
- Template CSV candidats dans `exports/` — à créer si besoin ops.
- Seuils chiffrés catalogue V1 (nombre de live) — décision produit séparée.
- Review croisée obligatoire Sonnet / autre modèle — optionnelle, pas bloquante.

---

## Signature lot (optionnel, copier en fin de session)

```
Lot n° ___ | Date ___ | Revu par ___
Candidats : ___ | Fiches draft : ___ | Pilotes OK : ___
Tier A : ___ | Tier B : ___ | Tier C : ___
Blocages notés : ___
```
