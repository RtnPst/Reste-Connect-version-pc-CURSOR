# CONTENT PIPELINE (v1)

> **Mise à jour v1.1** — Décisions créateur intégrées (sans réécriture complète du document).  
> **Mise à jour v1.2** — Alignement « culture vivante » (touchée légère).  
> **Mise à jour v1.3** — Review « gameplay éditorial » (touchée légère).  
> **Mise à jour v1.4** — Système culturel éditorial **assisté** (IA ≠ usine).  
> **Mise à jour v1.5** — Couche « compagnon » & continuité culturelle (point d'ancrage léger).  
> **Mise à jour v1.6** — Cohérence **flux ↔ systèmes** (voir PRODUCT_VISION § Carte v1.6).  
> **Mise à jour v1.7** — Investissements pipeline alignés **paliers roadmap** (PRODUCT_VISION § v1.7).

## Pourquoi ce document existe
Décrire le flux éditorial de bout en bout: de l'idée de concept à la question publiée — comme **chaîne d'un studio** qui fait vivre une **couche culturelle**, pas comme pipeline **CRUD** ou **filet de masse**.

### Comment les futurs agents Cursor doivent utiliser ce document
- Respecter cet ordre de pipeline quand ils proposent des automatisations.
- Ne pas sauter l'étape de validation humaine.
- Ajouter des étapes seulement si ROI clair.

## Pipeline cible (v1)
1. **Concept discovery**  
   Idées de mots/expressions : **découverte surtout manuelle** pour l'instant (veille légère, retours utilisateurs, intuition éditoriale). L'IA n'est pas censée **ingérer le web en autonomie** pour alimenter le catalogue au quotidien — elle assiste plutôt les étapes suivantes.

2. **Concept intake**  
   Qualification manuelle: utile, compréhensible, adapté à la cible.

3. **Génération assistée**  
   L'IA propose des **variantes intentionnelles** (angles, contextes, distracteurs, rythme) — objectif : **diversité éditoriale** et **soutien à la fraîcheur**, **pas** remplir un quota de volume. Philosophie : **AI_GENERATION_SYSTEM** (v1.4).

4. **Review éditoriale**  
   Tri des propositions, amélioration des distracteurs, vérification ton. **v1.3** : y inclure un contrôle **anti-fatigue** (variété d'angles, de contextes, de cadence) et **anti-méta** (EDITORIAL_BIBLE § v1.3) — le pipeline doit **filtrer** le ressenti « **IA cheap** » avant publication.

5. **Publication**  
   Seules les questions validées sont publiées.

6. **Feedback analytics**  
   Observer performance/rétention/qualité perçue.

7. **Itération**  
   Ajuster angles, difficulté, formulation — y compris **anti-fatigue systémique** : trop de définitions d'affilée, trop de mêmes **battements** émotionnels, trop de mêmes **structures** de réponses ou de **contextes** sociaux (risques : EDITORIAL_BIBLE § v1.4).

**v1.2** — Le pipeline alimente un **produit culturel en mouvement** (PRODUCT_VISION), pas une archive figée : l'étape **itération / feedback** inclut implicitement **fraîcheur**, **re-contextualisation** (mèmes, usages, situations qui vieillissent vite) et **variété** — sans confondre vivacité et **volume brut**.

**v1.4 — Mémoire culturelle** : le catalogue doit pouvoir évoluer comme une **couche de mémoire culturelle internet** **rafraîchie** (concepts à **refaire émerger** avec de **nouveaux prismes**, daily / événements **sensibles au contexte**), **sans** bascule vers **automatisation autonome** ni **veille bruyante** (voir AI_GENERATION_SYSTEM § direction v1.4).

**v1.5** — Ce pipeline alimente le **compagnon culturel** côté joueur (GAMEPLAY_PHILOSOPHY / PRODUCT_VISION) : la chaîne **éditoriale** doit soutenir **continuité**, **curiosité** et **pertinence qui vieillit bien** — pas seulement **alimenter un backlog**.

## Pipeline ↔ systèmes (v1.6)
| Étape | Systèmes principaux touchés |
|-------|----------------------------|
| 1 Découverte | **Découverte culturelle**, **fraîcheur** (entrées), **graine concept** (semis) |
| 2 Intake | **Intelligence éditoriale** (qualification), **équilibre vivant / calme** |
| 3 Génération assistée | **Assistance IA**, **graine concept**, **anti-fatigue** (intention de variété) |
| 4 Review | **QA lot**, **anti-fatigue** **systémique**, **intelligence éditoriale**, **boucles reconnaissance** (qualité du *aha*) |
| 5 Publication | **Cohérence** catalogue, lien **compagnon** / joueur |
| 6 Feedback | **Fraîcheur**, **anti-fatigue**, **progression légère** (signaux) |
| 7 Itération | **Fraîcheur**, **anti-fatigue**, **graine concept** (re-prismes), **vivant / calme** |

Le pipeline est le **fil conducteur** matérialisant les **relations** entre systèmes ; la **carte** complète et les tensions long terme : **PRODUCT_VISION** § v1.6.

**v1.7** — Les efforts **pipeline / outillage** doivent d'abord **servir le palier cœur** (qualité éditoriale, reconnaissance, anti-fatigue, fraîcheur **cadencée**) — les chantiers **expansion** / **avancé** ne **doivent prendre** une **part large** du temps créatif **que** si le **cœur** tient déjà la promesse **vivante / humaine** (même doc § Priorisation).

## Règles pratiques
- **v1.4** : le **concept** (mot / expression / idée) est la **graine éditoriale** ; les questions publiées en sont les **lentilles** — voir **EDITORIAL_BIBLE** § concept-graine.
- Un concept peut avoir plusieurs questions.
- Une question ne doit pas être publiée sans relecture humaine.
- L'aperçu IA reste un brouillon tant qu'il n'est pas publié.
- Si une question part sans lien conceptuel clair : **alerter** dans l'outil, mais **ne pas bloquer** la publication si l'éditeur assume — garder le contrôle **humain**.

## Priorité KPI (v1.1)
- **Qualité et diversité d'abord** : fraîcheur, variation, richesse contextuelle, replayabilité, **ressenti de rétention** — plutôt que "volume maximal".
- Garder assez de **vitesse d'itération** pour tester le ressenti produit rapidement, **sans** viser des milliers de questions médiocres auto-générées.

## Ce qui vient plus tard (pas maintenant)
- Ingestion web semi-automatique (seulement quand la gouvernance éditoriale est prête).
- Détection intelligente de redécouverte de concepts.
- Priorisation automatique des concepts à retravailler.

## Décisions v1.1 (validées)
- Sources concepts : **manuel + assistance IA** sur la structuration / variation / qualité — **pas** d'ingestion web autonome comme direction courte terme.
- KPI : **qualité / diversité / ressenti** avant le volume ; itération rapide pour valider le feel.

## À affiner plus tard
- Fréquence idéale de refresh éditorial (selon capacité solo et métriques).
- Tableau de bord minimal des signaux pipeline (quand les données existent).
- **v1.4** : quels **signaux lot-level** (anti-fatigue) intégrer dans l'admin **sans** transformer le studio en centre de contrôle lourd (ADMIN_UX_GUIDELINES v1.4).
- **v1.6** : quels **indicateurs** par étape reflètent la **carte système** sans réduire le studio à des chiffres creux.
