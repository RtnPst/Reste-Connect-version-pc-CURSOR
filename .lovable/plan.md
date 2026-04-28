# Quiz éducatif "Reste connecté !" pour seniors

Une web app responsive (utilisable sur téléphone, tablette et ordinateur) qui aide les seniors à découvrir la culture des jeunes — vocabulaire, réseaux sociaux, culture pop, tech — sous forme de quiz ludiques et bienveillants.

## Concept

Un format mêlant **3 modes de jeu**, avec une interface très accessible (gros texte, contrastes forts, lecture audio des questions, explications pédagogiques après chaque réponse).

## Pages et parcours

### 1. Accueil

- Grand titre rassurant : "Restez connecté avec les jeunes !"
- 3 grands boutons clairs :
  - **Question du jour** (1 question quotidienne à découvrir)
  - **Quiz par thème** (séries de 10 questions)
  - **Mon parcours** (niveaux, badges, progression)
- Indicateur de série quotidienne ("3 jours d'affilée !")
- Bouton "Connexion / Créer un compte"

### 2. Connexion / Inscription

- Email + mot de passe (champs larges et clairs)
- Connexion Google en option
- Possibilité de "jouer en invité" pour essayer avant de s'inscrire
- À la fin d'une partie en invité, on propose de créer un compte pour sauvegarder le score

### 3. Choix d'un quiz par thème

4 grandes cartes colorées :

- **Vocabulaire des jeunes** (wesh, cringe, GOAT, bail, sheesh…)
- **Réseaux sociaux & apps** (TikTok, Snap, Insta, BeReal, Discord…)
- **Culture pop** (chanteurs, séries, films, jeux vidéo actuels)
- **Tech & numérique** (IA, smartphone, sécurité, gestes tactiles)

Chaque thème indique le nombre de questions disponibles et le niveau atteint.

### 4. Écran de quiz (le cœur de l'app)

- Barre de progression (Question 3/10)
- Question en très gros texte
- Bouton **haut-parleur** pour écouter la question à voix haute
- 4 réponses sous forme de gros boutons espacés
- Pas de chrono (pour ne pas stresser)
- Après réponse : feedback visuel doux (vert/orange) + **encadré explicatif pédagogique** ("TikTok est un réseau social où l'on partage de courtes vidéos. Lancé en 2016, il est très utilisé par les 15-25 ans…")
- Bouton "Question suivante" bien visible

### 5. Écran de résultats

- Score final ("8/10 — Bravo !")
- Récapitulatif des questions ratées avec la bonne réponse
- Badge gagné si applicable
- Boutons : "Rejouer", "Choisir un autre thème", "Partager mon score"

### 6. Question du jour

- Une seule question, change chaque jour
- Possibilité de la partager (lien) avec ses petits-enfants pour comparer

### 7. Mon parcours (profil)

- Niveau actuel + progression vers le suivant
- Badges débloqués (ex: "Apprenti TikTokeur", "Vocabulaire de la rue", "Geek confirmé")
- Statistiques simples : quiz complétés, score moyen, série quotidienne
- Réglages d'accessibilité (taille de texte, contraste, audio activé par défaut)

## Accessibilité (priorité absolue)

- **Texte grand par défaut** (18px minimum, ajustable jusqu'à très grand)
- **Contrastes élevés** conformes WCAG AAA
- **Boutons larges** (minimum 56px de haut, bien espacés)
- **Lecture audio** des questions et réponses (synthèse vocale du navigateur, voix française)
- **Explications pédagogiques détaillées** après chaque réponse (pas juste "bonne/mauvaise réponse")
- **Pas d'animations agressives**, transitions douces
- **Langage clair** : on évite le jargon, on définit les termes
- **Pas de timer** pour ne pas créer d'anxiété

## Direction artistique

Style **chaleureux, lisible, rassurant** — pas infantilisant.

- Palette douce : bleu apaisant + accents chauds (orange/jaune doux) pour les actions
- Typographie sans-serif très lisible
- Coins arrondis, ombres légères
- Illustrations amicales en en-tête de chaque thème
- Mode clair par défaut, mode sombre disponible

## Comptes et sauvegarde

- Inscription email/mot de passe + Google
- Sauvegarde automatique : progression, badges, série quotidienne, statistiques
- Possibilité de jouer en invité puis de créer un compte ensuite (sans perdre la session en cours)

## Contenu du quiz

Pour démarrer, je créerai une **base initiale d'environ 60 questions** (15 par thème), couvrant des sujets actuels et représentatifs. Tu pourras ensuite ajouter/modifier les questions facilement (on prévoira une interface d'admin simple lors d'une étape suivante).

## Ce qui sera livré dans cette première étape

1. Toutes les pages décrites ci-dessus
2. Le système de comptes (inscription, connexion, jouer en invité)
3. Les 3 modes de jeu fonctionnels (quiz par thème, question du jour, parcours)
4. Base de données pour stocker utilisateurs, scores, badges, progression
5. Base initiale de ~60 questions sur les 4 thèmes
6. Accessibilité complète (taille texte, audio, contrastes)
7. Système de badges et niveaux

## À prévoir pour plus tard (étapes suivantes)

- Interface d'administration pour ajouter des questions facilement
- Génération automatique de nouvelles questions par IA
- Mode "duel" avec un petit-enfant via lien partagé
- Notifications par email pour la question du jour
- Installation sur l'écran d'accueil du téléphone (PWA)

## Détails techniques

- **Frontend** : React + TanStack Start, Tailwind CSS
- **Backend & base de données** : Lovable Cloud — tables `profiles`, `questions`, `quiz_attempts`, `user_progress`, `badges`, `user_badges`
- **Authentification** : Email/mot de passe + Google via Lovable Cloud
- **Audio** : API SpeechSynthesis du navigateur (gratuit, voix française native)
- **Sécurité** : RLS (Row-Level Security) sur toutes les tables — chaque utilisateur ne voit que ses propres données ; rôles stockés dans une table dédiée
