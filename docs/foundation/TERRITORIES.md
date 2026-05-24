# Territoires culturels (structure v1)

**But :** lentilles **émotionnelles** pour mémoire et resurfacing — pas une encyclopédie, pas une taxonomie rigide.

**Règle :** 5 territoires max en lecture joueur. Pas d’écran dédié avant la pause.

---

## Les 5 territoires

| ID stable | Nom joueur | Ce que ça couvre |
|-----------|------------|------------------|
| `langage_web` | Langage du web | Mots, expressions, scans, argot |
| `codes_sociaux` | Réseaux & codes sociaux | Feeds, comportements, situations en ligne |
| `gaming_stream` | Gaming & stream | Jeux, clutch, culture pad/clavier |
| `memes_reactions` | Mèmes & réactions | Humour viral, réactions, trends légères |
| `relations_online` | Relations en ligne | Crush, situations, dynamics connectées |

**Tech & IA** reste un **thème quiz** (`tech`) sans territoire mémoire v1.  
**culture_pop** reste legacy (stats), pas un territoire.

---

## Pont avec les thèmes quiz actuels

| Thème DB | Territoire par défaut |
|----------|----------------------|
| `vocabulaire` | `langage_web` |
| `reseaux_sociaux` | `codes_sociaux` |
| `gaming` | `gaming_stream` |
| `trends_pop_culture` | `memes_reactions` |
| `relations_lifestyle` | `relations_online` |
| `tech` | — (thème seul) |

---

## Où le stocker (progressif)

| Phase | Où |
|-------|-----|
| Maintenant | `territory_id` optionnel sur chaque concept dans `cultural-pack-v1.json` |
| Pause | Tagging éditorial cohérent, pas d’UI |
| Post-pause | Colonne ou vue `concept → territory` si besoin analytics |

**Ne pas** créer de table `territories` ni d’enum SQL avant d’en avoir besoin.

---

## Ce que ce n’est pas

- Graphe de connaissances
- Niveaux par territoire type RPG
- Feed personnalisé IA
- 12 catégories « académiques »
