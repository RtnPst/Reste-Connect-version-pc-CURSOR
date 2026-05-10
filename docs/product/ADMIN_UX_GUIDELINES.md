# ADMIN UX GUIDELINES (v1)

> **Mise à jour v1.1** — Décisions créateur intégrées (sans réécriture complète du document).  
> **Mise à jour v1.2** — Alignement studio / culture vivante (touchée légère).  
> **Mise à jour v1.4** — Studio créatif **assisté** (touchée légère).  
> **Mise à jour v1.5** — Studio relationnel à la culture (couche d'expérience créatrice).  
> **Mise à jour v1.6** — **Studio éditorial** dans la carte système (PRODUCT_VISION § v1.6).  
> **Mise à jour v1.7** — **Roadmap studio** : flux créatif **avant** complexité opérationnelle.

## Pourquoi ce document existe
Transformer l'admin en studio éditorial clair pour une créatrice solo non technique.

### Comment les futurs agents Cursor doivent utiliser ce document
- Préférer des labels compréhensibles en 2 secondes.
- Garder la complexité technique en interne, pas dans le vocabulaire visible.
- Vérifier systématiquement "aperçu vs publication" dans l'UX.

## Philosophie UX admin
- Moins "panneau développeur", plus **studio éditorial** clair.
- **v1.2** : le studio sert à **faire vivre une culture** (curiosité, contextes, angles) — pas à produire un **devoir** ou une **copie scolaire** ; le vocabulaire et les aides doivent rester **modernes, respectueux, non condescendants** (PRODUCT_VISION).
- **v1.4** : l'outil doit tendre vers un studio où la créatrice se sent **inspirée**, **assistée**, **guidée** (angles, anti-fatigue, qualité) — **sans** workflow **CRUD** froid, **sans** empilement de **complexité IA** opaque, **sans** bureaucratie de **modération** lourde. Aligné **AI_GENERATION_SYSTEM** (assistance, pas usine).
- **v1.5** : le studio soutient une **relation longue** utilisateurs ↔ **culture qui évolue** (fraîcheur, daily, événements, re-surfacing) — l'UI doit aider la **créatrice** à se sentir **énergisée culturellement** et **portée par une ligne éditoriale**, pas **administratrice de base** (PRODUCT_VISION / GAMEPLAY_PHILOSOPHY § compagnon).
- **v1.6** : l'admin est le **siège** du système **studio éditorial** sur la **carte produit** — il **orchestre** graine concept, assistance IA, QA lot, fraîcheur et anti-fatigue **côté création** ; toute nouvelle vue doit rester **lisible** comme **cockpit créatif**, pas comme **console technique** (cartographie : **PRODUCT_VISION** § v1.6).
- **v1.7** : prioriser les évolutions admin qui **débloquent** **flux créatif**, **clarté**, **inspiration légère**, **confiance éditoriale**, **cohérence d'identité** ; ne traiter les écrans **purement opérationnels** qu'en **surface minimale** tant qu'ils n'apportent pas d'**âme** produit. Référence **paliers** : **PRODUCT_VISION** § v1.7.
- Actions explicites et rassurantes.
- Aide contextuelle **équilibrée** : ni vide / minimal au point de perdre, ni tutoriel permanent qui écrase — **juste assez** pour trancher vite.

## Ton des textes admin (alignement produit)
Les microcopies admin peuvent être **légères et internet-aware**, mais **jamais humiliantes**, jamais "on surjoue pour faire jeune". Viser une **confiance discrète** cohérente avec la vision produit (voir PRODUCT_VISION / EDITORIAL_BIBLE).

## Règles de wording
- Préférer:
  - "Mot ou expression principale"
  - "Brouillon local"
  - **"Publier"** / "Publier les questions cochées" comme action principale d'écriture en base.
- **Éviter comme libellé principal** "Enregistrer" ou "Valider" quand l'intention est réellement **une mise en ligne** — garder le vocabulaire **proche de l'effet réel** pour réduire l'anxiété.
- Éviter en façade:
  - `concept_key`
  - `canonical_key`
  - "normalization"

## Distinctions essentielles à rendre visibles
1. **Aperçu local**: non publié (brouillon de travail).
2. **Retirer de l'aperçu**: suppression locale uniquement.
3. **Publier**: écriture en base — c'est l'action à nommer clairement.

## Avertissements sans bloquer l'éditeur
- Cas typique : métadonnée manquante (ex. pas de `concept_key` / mot principal groupé) → **avertir**, mais **laisser publier** si l'éditeur assume — **l'humain reste aux commandes**.

## Structure d'écran recommandée
1. Intention éditoriale (thème, difficulté, concepts).
2. Génération.
3. Relecture/tri.
4. Publication.
5. Historique/liste des questions.

## Microcopy type (v1)
- "Rien n'est enregistré tant que tu ne publies pas."
- "Les lignes retirées de l'aperçu ne seront pas enregistrées."
- "Plusieurs questions peuvent partager le même mot principal."

## Anti-surcharge
- Limiter le nombre de champs visibles par défaut.
- Mettre les métadonnées avancées derrière un toggle.
- Préférer exemples et placeholders à longues explications.

## Décisions v1.1 (validées)
- Guidage : **contextuel et équilibré** (studio clair, pas tutoriel lourd).
- Action principale : vocabulaire centré sur **"Publier"** plutôt que "Enregistrer" / "Valider" pour l'écriture en base.
- Warnings **non bloquants** quand l'éditeur veut publier malgré un signal de qualité.

## À affiner plus tard
- Fréquence et style des toasts (UX détail).
- Ton exact des messages d'aide par écran (itération).
- **v1.5** : futurs écrans **fraîcheur / événements / calendrier éditorial** — toujours **légers**, orientés **intention**, pas **charge cognitive**.
- **v1.7** : éviter les **tableaux de bord** « tout mesurer » qui **compétitionnent** avec le temps de **création** ; un **studio** mémorable reste **simple**.
