# Authenticité & anti-glossaire (v1)

> **Statut** : règles fondatrices du pipeline culturel — complète `EDITORIAL_BIBLE.md` et `src/data/cultural-pack-v1.json`.  
> **Cible** : créateur, relecteurs, agents IA. **Pas** une spec technique.

## Pourquoi ce document existe

Tu Captes ? n’est pas un dictionnaire d’argot internet. C’est un quiz qui aide surtout des **35–55 ans** à **décoder des situations culturelles réelles** — messages, réactions, malaises, codes sociaux — pas à mémoriser une liste de mots vus dans un article « Gen Z ».

Le pilote **`magl`** a montré le risque principal : un mot peut exister dans un glossaire sans être **parlé naturellement** par les gens qu’on simule. Ce document fige comment éviter cette dérive.

### Comment l’utiliser

- Avant d’ajouter un concept au pack ou de publier une question.
- Quand une source (Le Bonbon, PDF, article) propose un mot.
- En relecture IA : refuser le « langage de site d’argot ».

Documents liés : `LOT_REVIEW_CHECKLIST.md`, `CONTENT_PIPELINE.md`, `AI_GENERATION_SYSTEM.md`.

---

## Principe central

**Moins de mots-théorie, plus d’artefacts humains.**

| Mauvais noyau | Bon noyau |
|---------------|-----------|
| Mot + définition copiée | Mot + **messages plausibles** + contextes + pièges réels |
| « Que veut dire X ? » | Scène : vocal, WhatsApp, commentaire, debrief |
| Parent / prof qui dit le mot pour faire le quiz | Pote qui **réagit** à une situation |
| 50 entrées glossaire d’un coup | Petits lots triés (10–15 candidats → 3–5 fiches) |

**Test en une phrase** : *Est-ce que des humains parlent vraiment comme ça dans cette scène ?*

---

## Glossaire vs usage vivant

| | **Glossaire / liste** | **Usage vivant** |
|--|----------------------|------------------|
| **Source** | Article, PDF, « 50 expressions jeunes » | Pool app, messages entendus/lus, commentaires |
| **Preuve** | Définition seule | `example_usage` + scène crédible |
| **Orthographe** | Souvent graphie « site » (`magl`) | Forme oral/écrit courante (`ma go`, `j'ai le seum`) |
| **Pack** | `usage_vitality: listed_only` | `living` ou `observed_irl` |
| **Questions** | Pas de production (ou métalangage seulement) | 3–5 pilotes contextualisés max |

**Règle** : les glossaires sont des **réservoirs de candidats**, pas la vérité. Une ligne Le Bonbon → fiche **draft** max, pas question live.

---

## `usage_vitality` — repères rapides

| Valeur | Signification | Production questions |
|--------|---------------|----------------------|
| **`living`** | Encore produit / entendu régulièrement | Oui — scènes actuelles |
| **`observed_irl`** | Preuve forte hors glossaire (oral, capture, pool live) | Oui — prioritaire |
| **`passive`** | Compris, peu dit (« oklm » chez certains) | Oui — **lecture** / reconnaissance, pas tout le monde qui le dit |
| **`dated`** | Connu, nostalgie / ironie | Oui — angle époque, second degré |
| **`listed_only`** | Surtout articles, peu d’usage réel observable | **Non** — watchlist, enrichir `surface_forms` seulement |
| **`theoretical`** | Plausible mais pas attesté | **Non** — reject ou intake park |

Champs pack associés : `import_confidence`, `source_tier`, `glossary_only` (voir `cultural-pack-v1.json` conventions).

---

## Authenticité sociale

### Scènes **crédibles**

- Message WhatsApp court (« bon bah j’ai le seum »).
- Vocal post-match / post-date.
- Commentaire sous vidéo (« ratio », « le seum est réel »).
- Groupe qui debrief (« des red flags ? »).
- Capture commentée par un pote.

### Scènes **à éviter** (sketch pédagogique)

- Parent au dîner qui dit un mot jeune rare (`magl` au bureau).
- Interpellation « Prénom-admin » dans un groupe (`Magl, t’as vu le plan ?`).
- Cours / conférence / journaliste qui **explique internet** au joueur.
- Triple plateforme dans une phrase pour « faire culture ».
- Phrase écrite **uniquement** pour que le joueur devine la définition.

### Oralité réaliste

- Contractions : « j’ai », « t’as », « bon bah », « de ouf » quand c’est naturel.
- Pas de français « textbook » oral.
- Anglicismes **gardés** quand ils circulent (`red flag`, `ghoster`) — pas traduits systématiquement en question.

### IRL vs listé

| Signal **IRL / pool** | Signal **surtout listé** |
|----------------------|---------------------------|
| Ligne dans dedup / question live | 0 ligne pool, seulement Le Bonbon |
| `surface_forms[0]` = forme qu’on a vue | `magl` avant `ma go` |
| Scène facile à écrire sans forcer | Tous les personnages doivent dire le mot |

---

## Context packs — pourquoi c’est central

Le pack ne doit pas être **mot = définition**. Chaque concept `approved` / pilote sérieux devrait avoir un **`context_pack`** minimal :

- `credible_messages` — phrases copiables en quiz
- `credible_contexts` — types de situations
- `avoid_scenes` — anti-patterns figés ici
- `plausible_traps` / `adult_errors` — matière distracteurs + IA

**Sans context pack** → génération qui retombe sur « Que veut dire… » et distracteurs absurdes.

Référence structure : fiches `seum`, `ratio`, `red_flag` dans `cultural-pack-v1.json`.

---

## Pièges des articles « langage Gen Z »

- **Volume** : 50 mots ≠ 50 concepts produits.
- **Graphie site** : orthographe marketing ≠ oral.
- **Définition scolaire** : étymologie longue en question (= toxique).
- **Faux-jeune** : adulte qui surjoue (« mon magl », « c’est lit familly »).
- **Psy TikTok** : diagnostic, trauma, liste de 12 red flags.
- **Expert Twitter** : jargon crypto/stats pour `ratio`.
- **Caricature** : banlieue, « wesh » forcé, moquerie générationnelle.

---

## Faux-jeune

Le joueur ne doit pas sentir que l’app **imité** un ado. Signaux d’alerte :

- Mots rares dans la bouche de personnages improbables.
- Stack de slang dans une phrase.
- Références trop « meme page » sans situation.
- Ton moqueur envers les jeunes (incompatible promesse **pont** — voir `EDITORIAL_BIBLE`).

**Bon faux-jeune** : pas d’imiter un ado — **décoder** ce qu’un ado (ou un fil) dirait, depuis la position du joueur curieux.

---

## Anti-caricatures (règles courtes)

| Interdit | Pourquoi | Alternative |
|----------|----------|-------------|
| **Parent sketch** | Ne parlerait pas le mot rare | Mots mainstream mal utilisés, ou pote qui traduit |
| **Psy TikTok forcée** | Ton clinique, froid | Prudence entre potes (« ça m’envoie des red flags ») |
| **Journaliste internet** | Quiz = cours | Capture + réaction pote |
| **Drapeau littéral** (`red flag`) | Piège OK en **distracteur**, pas comme scène principale sans contexte |
| **3 réponses absurdes** | Méta-jeu « drôle = faux » | Distracteurs **contextuels** (maladie pour seum, stats pour ratio) |

---

## Cas d’école (pack + pilotes)

### `magl` — **listed_only** (contre-exemple)

- Source surtout glossaire ; **absent** du pool.
- Graphie naturelle : **`ma go` / `ma gow`**, pas `magl` en premier.
- Pilote a révélé scènes forcées (parent, interpellation groupe).
- **Leçon** : bon pour tester le **process**, pas modèle de contenu.

### `seum` — **living** (référence éditoriale)

- Pool + pilote : vocal, WhatsApp, commentaire — **artefacts**.
- Faux ami crédible : maladie / « enrhumé ».
- Stock archive « Que signifie l’expression… » + étymologie arabe → **ne pas republier** sans rewrite.

### `ratio` — **living** (réseaux, nuance)

- Humiliation sociale en public, **pas** cours de maths.
- Scènes : capture, reply « ratio », contraste stats vs internet.
- Éviter : thread expert, « L + ratio + touch grass » trop chronically online pour 35–55 (utiliser avec parcimonie).

### `red_flag` — **living** (relationnel)

- Debrief date, vanne exagérée (pizza), story crush.
- Prudence sociale, **pas** diagnostic toxique.
- « Green flag » : OK en distracteur, pas comme jargon empilé.

---

## Reconnaître un concept « living » (check rapide)

Cocher **au moins 3** sur 5 :

- [ ] Présent dans le **pool** ou usage documenté IRL
- [ ] `surface_forms[0]` = forme qu’on a **vraiment** vue
- [ ] 2+ messages crédibles sans inventer des personnages
- [ ] Scène testée **à voix haute**
- [ ] `glossary_only: false` + `import_confidence` ≥ medium

Si échec → `listed_only` ou reject.

---

## Reconnaître un concept « listed_only »

- [ ] Mot trouvé **seulement** dans article/PDF
- [ ] Aucune ligne pool / dedup
- [ ] Orthographe « site » douteuse
- [ ] Impossible d’écrire une scène sans mettre le mot dans toutes les bouches
- [ ] Pilote ou génération sonne « NPC »

→ Fiche draft watchlist, **pas** questions live.

---

## Ce qui reste volontairement ouvert

- Liste fermée complète des `cluster_tags` / `social_vibe` (dans pack, pas encore doc séparée `CULTURAL_PACK_V1.md`).
- Seuils chiffrés V1 publique (nombre de concepts live) — voir feuille de route ingestion.
- Formats multimédia (image/mème) — horizon `EDITORIAL_BIBLE`, pas engagement ici.
- Règles automatiques CI sur authenticité — relecture humaine d’abord.

---

## Rappel une ligne

**Si la scène existe seulement pour expliquer le mot, ce n’est pas une question Tu Captes ? — c’est une carte flash déguisée.**
