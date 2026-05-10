# AI GENERATION SYSTEM (v1)

> **Mise à jour v1.1** — Décisions créateur intégrées (sans réécriture complète du document).  
> **Mise à jour v1.3** — Génération alignée « gameplay éditorial » & anti-fatigue (enrichissement ciblé).  
> **Mise à jour v1.4** — IA au service d'un **système culturel éditorial vivant** (enrichissement ciblé).  
> **Mise à jour v1.5** — Assistance alignée **compagnon / progression légère** (point d'ancrage léger).  
> **Mise à jour v1.6** — Place dans la **carte système** (PRODUCT_VISION § v1.6).  
> **Mise à jour v1.7** — Priorité **âme / vivant** sur **volume** (PRODUCT_VISION § v1.7).

## Pourquoi ce document existe
Définir le rôle exact de l'IA dans la création de contenu **assisté** : **pas** « l'IA génère des quiz », mais **« l'IA aide une direction éditoriale humaine »** — exploration, contextualisation, diversité, rythme, qualité — au sein d'un **système culturel vivant** (voir aussi CONTENT_PIPELINE, EDITORIAL_BIBLE).

### Comment les futurs agents Cursor doivent utiliser ce document
- Traiter l'IA comme un assistant de brouillons.
- Ne jamais confondre "généré" et "prêt à publier".
- Garder les garde-fous anti-répétition et qualité distracteurs.
- **v1.3** : viser des sorties qui supportent un **système de gameplay éditorial** (curiosité, reconnaissance, contexte, satisfaction) — pas seulement des **QCM remplis**.
- **v1.6** : lire la **carte système** (**PRODUCT_VISION** § v1.6) avant d'étendre prompts ou checks — l'IA relie surtout **graine concept**, **intelligence éditoriale**, **anti-fatigue**, **QA lot**, **boucles reconnaissance / suivante**.
- **v1.7** : toute évolution des prompts ou des checks doit **maximiser** le ressenti **vivant / humain / avec de l'âme** (KPI invisible § v1.7) — **pas** le débit de lignes.

## Philosophie de génération (v1.3)
- **`l'apprentissage vit caché dans le jeu`** : formulations qui **jouent** (situation, tension légère, reconnaissance) plutôt que des **fiches**.
- **Variété** : le modèle doit **changer de posture** d'une ligne à l'autre (angle, contexte, surprise, effort cognitif) — la diversité **est** une exigence de rétention (GAMEPLAY_PHILOSOPHY).
- **Anti-méta** : instructions explicites pour **ne pas** reproduire les shortcuts listés dans **EDITORIAL_BIBLE § Anti-méta-joueur (v1.3)** (longueur, tonalité, index, « contexte = dur » mécanique, etc.).
- **Boucles de reconnaissance** : viser des explications qui **referment** un *aha* plausible (GAMEPLAY_PHILOSOPHY § boucles v1.3).
- **Horizon** : la génération doit rester compatible avec une trajectoire **« expériences culturelles interactives »** (formats plus contextualisés / multimédia **plus tard**) — **sans** promettre de features ni glisser vers **spam** ou **fil mème** (EDITORIAL_BIBLE § horizon v1.2–v1.3).
- **v1.4** : la **diversité éditoriale** et l'**intention** priment sur le **volume brut**.

## Orientation « lot & culture » (v1.4)
L'IA doit raisonner au niveau **concept → contextes → angles → situations → sens social → boucles de reconnaissance**, pas au niveau **« phrase isolée + 4 choix »** seul. Chaque ligne doit pouvoir répondre implicitement à : **quelle lecture culturelle** et **quel pic de reconnaissance** ce tour vise-t-il ?

**v1.5** — Les prompts et sorties doivent rester compatibles avec une **progression socio-émotionnelle** et un **compagnon culturel** (continuité, confiance, curiosité) — **éviter** le vocabulaire et les structures qui **simulent** la culpabilité ou la **pression de streak** ; favoriser **légèreté** et **« envie de voir la suite »** (GAMEPLAY_PHILOSOPHY § v1.5).

## Ce que l'IA doit faire
- Proposer des lots de questions cohérents avec un thème/difficulté.
- Prendre en compte des concepts cibles (optionnels).
- Produire une structure valide (question, choices, correct_index, explanation, concept_key optionnel).
- **v1.3** : produire des questions qui passent le test **« avec de l'âme »** (EDITORIAL_BIBLE) : intitulés **situés**, distracteurs **plausibles dans le contexte** donné, **pas** de cadence **clone** sur tout le lot.
- **v1.4** : soutenir explicitement **intention éditoriale**, **richesse contextuelle**, **rythme émotionnel**, **surprise** et **moments de reconnaissance** — pas seulement remplir une grille.
- **v1.4** : aider l'humain à **explorer** des concepts (angles manquants, reformulations, pièges crédibles) et à garder la **fraîcheur** (voir **mémoire culturelle** ci-dessous).

## Ce que l'IA ne doit pas faire
- Publier automatiquement en base.
- Décider seule des standards éditoriaux finaux.
- Générer en boucle des formulations clonées.
- **Ingérer le web en autonomie** pour alimenter le catalogue (hors scope immédiat) : la découverte de concepts reste **surtout manuelle**, l'IA assiste la **structuration, variation, distracteurs et qualité**.
- **v1.3** : produire un lot **monotone** (même squelette, même arc émotionnel, même type de piège, mêmes patterns de longueur/ton) — voir règles anti-répétition enrichies ci-dessous.
- **v1.4** : se comporter comme une **usine autonome** (spam, **déferlante** basse qualité, **auto-publish**, batches **sans intention**) ou produire du **« AI slop »** (générique, template, absence d'âme).

## Génération concept-aware (état cible court terme)
- Entrée possible: "Concepts / mots à cibler".
- Sortie attendue: questions variées autour de ces concepts.
- `concept_key` recommandé pour lier les variantes.

## Validation humaine
Flux attendu:
1. Génération d'aperçu.
2. Relecture/tri humain.
3. Publication explicite des lignes cochées.

**v1.1** : la validation humaine reste **obligatoire** pour l'instant (confiance + qualité éditoriale). Une automatisation **partielle / optionnelle** peut devenir envisageable plus tard, mais **ce n'est pas la priorité** tant que le ressenti "studio fiable" n'est pas verrouillé.

**v1.4** — Rôles humains explicites : **directeur·rice éditorial·e**, **arbitre final**, **porte qualité** (ton, âme, cohérence). L'IA **assiste** ; elle ne **remplace** pas la responsabilité éditoriale ni le **goût**.

## Distracteurs (consigne IA critique)
Les prompts et post-traitements doivent éviter d'entraîner le joueur vers un méta-jeu du type **"drôle = faux" / "sérieux = vrai"**. Parfois, selon concept, contexte et logique internet, **la bonne réponse peut être la plus surprenante ou absurde**.
- Viser des faux **plausibles** ; autoriser des faux **joueurs** sans giveaway tonal systématique.
- Caler la **plausibilité** sur la **difficulté** (voir EDITORIAL_BIBLE / GAMEPLAY_PHILOSOPHY).

## Concept manquant (`concept_key`)
Si une ligne n'a pas de `concept_key` : **avertir** l'éditeur, mais **laisser publier** si l'humain assume le choix — l'humain garde le contrôle.

## Règles anti-répétition (v1)
- Limiter les formulations "Que signifie / Que veut dire".
- Forcer un mix d'angles dans un batch.
- Écarter les doublons exacts intra-lot.
- Détecter les doublons existants avant insertion.

**v1.3 — enrichissement** : dans les prompts / post-checks, exiger explicitement une **variation de** :
- **rythme** (léger / tendu / surprise / complice),
- **type de contexte** (définition courte, dialogue, situation, lecture sociale),
- **effort cognitif** (rappel vs inférence),
- **niveau de surprise** (sans chaos).

**v1.4 — intelligence au niveau du lot** : au-delà des **doublons exacts**, viser à détecter / prévenir (assisté, humain tranche) :
- **répétition d'angles**,
- **répétition de cadence émotionnelle**,
- **répétition de type de piège**,
- **répétition de patterns de réponses** (longueurs, structures parallèles),
- **répétition de contexte social** (même « décor » trop souvent),
- **répétition de tâche cognitive** (toujours la même opération mentale).

## QA génération / review (v1.3, intention)
La relecture humaine doit inclure un œil **anti-fatigue** et **anti-méta** : le lot est-il **vivant** ? Les distracteurs sont-ils **contextuels** ? Un joueur pourrait-il **apprendre à tricher contre le montage** ? Voir **EDITORIAL_BIBLE** et **GAMEPLAY_PHILOSOPHY**.

**v1.4 — boucles de reconnaissance** : la QA ne se limite pas à « **réponse correcte factuelle ?** » mais à « **le joueur peut-il vivre un moment de compréhension / révélation / reconnaissance ?** » — aligné GAMEPLAY_PHILOSOPHY § boucles.

## Direction future (sans implémenter maintenant)
- Intake web assisté (semi-manuel).
- Suggestions de concepts avec score de confiance.
- Monitoring de diversité par concept/angle.
- **v1.3** : signaux de **diversité de surface** (longueur des choix, distribution de l'index correct, corrélation « contexte ⟷ difficulté ») — **assistants** à l'éditeur, pas automatismes aveugles.
- **v1.4** : **mémoire culturelle internet vivante** — aider à suivre **fraîcheur des concepts**, **re-surfacer** un même concept avec de **nouveaux prisms** (tendances, mèmes, reinterpretations), utile pour **daily / événements** — **sans** ingestion autonome ni veille **bruyante** (CONTENT_PIPELINE).

## Multimédia (v1.4, rappel)
Décodage culturel **éditorialisé** (image, mème, capture, vidéo courte, *reveal* après réponse) — **pas** consommation **passive** type fil infini. Détail garde-fous : **EDITORIAL_BIBLE** § horizon.

## Avantage long terme (v1.4, lecture — pas une promesse chiffrée)
Un **fossé** durable est plus probable sur : **cohérence éditoriale**, **pacing émotionnel**, **sophistication anti-méta**, **intelligence contextuelle**, **fraîcheur culturelle**, **qualité des boucles de reconnaissance**, **sensation « vivant »** — que sur la **taille brute** de la base ou le **compte** de générations IA.

## Décisions v1.1 (validées)
- Quota orientation : **~35–40 %** "meaning / définition directe" sur le long terme ; le reste en angles **contextuels**.
- Distracteurs : **plausibilité** + **pas de pattern tonal** drôle/sérieux ; plausibilité **selon difficulté**.
- `concept_key` absent : **warning + publication possible** sous contrôle humain.

## À affiner plus tard
- Politique d'auto-remplissage / suggestion de `concept_key` quand absent (assisté, pas forcé).
- Éventuelle automatisation partielle de checks (hors scope immédiat).
- **v1.3** : quels checks **anti-méta** automatisables **sans** casser la diversité légitime (faux positifs).
- **v1.4** : quels signaux **lot-level** (anti-fatigue) sont fiables en prod **sans** bureaucratie de modération ni surcharge cognitive pour la créatrice.
- **v1.6** : quels **ponts** explicites UI entre **assistance IA** et **QA lot** évitent la duplication de travail créatif.
