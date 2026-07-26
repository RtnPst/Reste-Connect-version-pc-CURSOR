/**
 * Build a review-only question lot for promoted concepts (no DB import).
 * Creates ratio-style pilot JSON under src/data/ + export CSV.
 *
 * Usage:
 *   node scripts/build-question-lot-from-approved-v1.mjs
 *   node scripts/build-question-lot-from-approved-v1.mjs --only=brainrot,delulu
 */
import { resolve } from "node:path";
import {
  loadJson,
  root,
  stampIso,
  toConceptSlug,
  writeCsv,
  writeJson,
} from "./lib/concept-pipeline-utils.mjs";

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg
  ? onlyArg
      .slice("--only=".length)
      .split(",")
      .map((s) => toConceptSlug(s))
      .filter(Boolean)
  : ["brainrot", "delulu"];

const LOTS = {
  brainrot: {
    concept_key: "brainrot",
    theme: "reseaux_sociaux",
    label: "Brainrot",
    questions: [
      {
        difficulty: "moyen",
        question:
          "Ton pote te dit : « J’ai scrollé 3h d’edits, je suis en plein brainrot. » Il parle surtout de…",
        choices: [
          "Un trop-plein de contenus qui lui tourne encore dans la tête",
          "Un virus qui efface ses apps",
          "Une méthode pour réviser plus vite",
          "Un réglage qui coupe les notifs",
        ],
        correct_index: 0,
        explanation:
          "« Brainrot », c’est le sentiment d’avoir le cerveau saturé par des contenus ultra-répétitifs — pas un bug technique.",
        context: "group_chat",
      },
      {
        difficulty: "moyen",
        question: "Quel message sonne le plus naturel avec « brainrot » ?",
        choices: [
          "Mon feed est full brainrot depuis ce matin.",
          "Active le brainrot dans les réglages Wi-Fi.",
          "Le brainrot est une appli bancaire.",
          "Brainrot = traduction automatique.",
        ],
        correct_index: 0,
        explanation: "On l’utilise pour parler d’un feed / d’une session qui te « pourrit » un peu le cerveau.",
        context: "story_reply",
      },
    ],
  },
  delulu: {
    concept_key: "delulu",
    theme: "reseaux_sociaux",
    label: "Delulu",
    questions: [
      {
        difficulty: "facile",
        question:
          "Elle dit : « Il a liké ma story, on va se marier — ok je suis un peu delulu. » Delulu, c’est plutôt…",
        choices: [
          "Se raconter un film un peu trop beau / irréaliste",
          "Vérifier trois sources avant de conclure",
          "Être experte cybersécurité",
          "Couper complètement les réseaux",
        ],
        correct_index: 0,
        explanation:
          "« Delulu » (de delusional) = tu te racontes une belle histoire, souvent dit avec auto-dérision.",
        context: "group_chat",
      },
      {
        difficulty: "moyen",
        question: "Quel usage de « delulu » colle le mieux ?",
        choices: [
          "Il m’a répondu « lol », c’est sûr qu’il kiffe — je suis peut-être delulu.",
          "J’ai payé mon abonnement, c’est delulu.",
          "Mon wifi coupe, c’est delulu.",
          "J’ai relu le contrat deux fois, je suis delulu.",
        ],
        correct_index: 0,
        explanation: "Le mot pointe une projection amoureuse / sociale un peu fantasmée.",
        context: "dating_debrief",
      },
    ],
  },
  rizz: {
    concept_key: "rizz",
    theme: "reseaux_sociaux",
    label: "Rizz",
    questions: [
      {
        difficulty: "facile",
        question:
          "Dans le groupe : « Il a trop de rizz en story, tout le monde répond. » « Rizz », c’est surtout…",
        choices: [
          "Du charisme / un talent pour captiver (souvent pour draguer)",
          "Un filtre Instagram officiel",
          "Un bug de notifications",
          "Un abonnement premium",
        ],
        correct_index: 0,
        explanation: "Avoir du « rizz », c’est avoir du charme / de la game — pas un réglage d’app.",
        context: "group_chat",
      },
      {
        difficulty: "moyen",
        question: "Quel message sonne le plus juste avec « rizz » ?",
        choices: [
          "T’as mis une story simple et tout le monde a répondu — t’as du rizz.",
          "J’ai activé le rizz dans les réglages Wi-Fi.",
          "Le rizz est une appli de banque.",
          "Rizz = traduction automatique.",
        ],
        correct_index: 0,
        explanation: "On parle d’effet social / charisme, pas d’un outil technique.",
        context: "story_reply",
      },
    ],
  },
  soft_launch: {
    concept_key: "soft_launch",
    theme: "reseaux_sociaux",
    label: "Soft launch",
    questions: [
      {
        difficulty: "moyen",
        question:
          "Elle poste une story avec juste deux mains qui tiennent un café. Un pote : « Soft launch ? » Ça veut dire…",
        choices: [
          "Elle laisse entendre quelqu’un / un projet sans l’annoncer clairement",
          "Elle lance une appli en beta technique",
          "Elle supprime son compte",
          "Elle active le mode avion",
        ],
        correct_index: 0,
        explanation:
          "Un soft launch, c’est révéler en douceur (souvent une relation) — pas une annonce face cam.",
        context: "instagram_story",
      },
      {
        difficulty: "moyen",
        question: "Quelle différence colle le mieux entre soft launch et hard launch ?",
        choices: [
          "Soft launch = indices discrets ; hard launch = photo de couple face cam claire",
          "Soft launch = payer ; hard launch = gratuit",
          "Soft launch = Wi-Fi ; hard launch = 5G",
          "Soft launch = mute ; hard launch = volume max",
        ],
        correct_index: 0,
        explanation: "Soft = en douceur. Hard = annonce publique nette.",
        context: "group_chat",
      },
    ],
  },
  touch_grass: {
    concept_key: "touch_grass",
    theme: "reseaux_sociaux",
    label: "Touch grass",
    questions: [
      {
        difficulty: "moyen",
        question: "Ton pote te dit : « T’es trop en ligne, go touch grass. » Il te dit surtout de…",
        choices: [
          "Décrocher un peu / retrouver le réel",
          "Tondre la pelouse demain",
          "Changer de forfait mobile",
          "Activer le mode développeur",
        ],
        correct_index: 0,
        explanation: "« Touch grass » = sors un peu d’internet — vanne entre potes, pas un conseil jardinage.",
        context: "group_chat",
      },
      {
        difficulty: "facile",
        question: "Quel usage sonne le plus naturel avec « touch grass » ?",
        choices: [
          "Tu scrolles depuis 4h : go touch grass.",
          "J’ai installé touch grass sur mon téléphone.",
          "Touch grass est un antivirus.",
          "Touch grass = code Wi-Fi.",
        ],
        correct_index: 0,
        explanation: "C’est une vanne sociale anti-addiction écrans.",
        context: "dm",
      },
    ],
  },
  main_character: {
    concept_key: "main_character",
    theme: "relations_lifestyle",
    label: "Main character",
    questions: [
      {
        difficulty: "moyen",
        question:
          "« Elle arrive en main character energy au resto. » Ça décrit surtout quelqu’un qui…",
        choices: [
          "Se met au centre du récit, comme le héros du film",
          "Paie l’addition pour tout le monde",
          "Refuse de commander",
          "Travaille en cuisine",
        ],
        correct_index: 0,
        explanation: "Main character energy = attitude « c’est mon film » — présence / mise en scène de soi.",
        context: "group_chat",
      },
      {
        difficulty: "facile",
        question: "Quel exemple colle le mieux avec « main character » ?",
        choices: [
          "Il entre avec une playlist qui match son fit : main character.",
          "Il a oublié ses clés : main character.",
          "Le wifi coupe : main character.",
          "Il a mis à jour iOS : main character.",
        ],
        correct_index: 0,
        explanation: "Ça parle d’une posture / d’une vibe, pas d’un incident technique.",
        context: "lifestyle",
      },
    ],
  },
  locked_in: {
    concept_key: "locked_in",
    theme: "culture_pop",
    label: "Locked in",
    questions: [
      {
        difficulty: "moyen",
        question: "« Là je suis locked in jusqu’à vendredi. » Ça veut surtout dire…",
        choices: [
          "Hyper concentré / en mode focus total",
          "Bloqué hors de son compte",
          "En couple officiel",
          "En mode avion permanent",
        ],
        correct_index: 0,
        explanation: "Locked in = focus intense (dossier, sport, étude) — pas un verrouillage de compte.",
        context: "group_chat",
      },
      {
        difficulty: "facile",
        question: "Quel message sonne juste avec « locked in » ?",
        choices: [
          "Exam lundi : je suis locked in ce week-end.",
          "J’ai activé locked in dans les réglages Bluetooth.",
          "Locked in est une banque.",
          "Locked in = antivirus.",
        ],
        correct_index: 0,
        explanation: "On parle d’état de concentration, pas d’un réglage.",
        context: "study",
      },
    ],
  },
  iykyk: {
    concept_key: "iykyk",
    theme: "reseaux_sociaux",
    label: "IYKYK",
    questions: [
      {
        difficulty: "moyen",
        question: "Sous une story cryptique : « iykyk ». Ça veut dire…",
        choices: [
          "Ceux qui savent savent — connivence entre initiés",
          "Une erreur de frappe pour « ok »",
          "Un code promo",
          "Un réglage de confidentialité",
        ],
        correct_index: 0,
        explanation: "IYKYK = If You Know, You Know : clin d’œil à ceux qui ont la ref.",
        context: "instagram_story",
      },
      {
        difficulty: "facile",
        question: "Quel usage de « iykyk » colle le mieux ?",
        choices: [
          "La blague du week-end… iykyk.",
          "J’ai payé en iykyk.",
          "Iykyk est un navigateur.",
          "Iykyk = 5G.",
        ],
        correct_index: 0,
        explanation: "C’est de la connivence sociale, pas un produit.",
        context: "group_chat",
      },
    ],
  },
  chokbar: {
    concept_key: "chokbar",
    theme: "vocabulaire",
    label: "Chokbar",
    questions: [
      {
        difficulty: "facile",
        question: "Ton ado : « J’ai ouvert mon bulletin… chokbar. » Ça veut dire qu’il est…",
        choices: [
          "Très choqué / surpris",
          "En train de manger du chocolat",
          "En cours de sport",
          "En mode avion",
        ],
        correct_index: 0,
        explanation: "Chokbar = être choqué, souvent dit de façon théâtrale.",
        context: "family",
      },
      {
        difficulty: "moyen",
        question: "Quel message sonne le plus naturel avec « chokbar » ?",
        choices: [
          "Il a unfollow tout le monde d’un coup — chokbar.",
          "J’ai activé chokbar dans les réglages.",
          "Chokbar est une appli bancaire.",
          "Chokbar = code Wi-Fi.",
        ],
        correct_index: 0,
        explanation: "On l’utilise comme réaction à une info surprise.",
        context: "group_chat",
      },
    ],
  },
  goumin: {
    concept_key: "goumin",
    theme: "relations_lifestyle",
    label: "Goumin",
    questions: [
      {
        difficulty: "moyen",
        question: "« Depuis la rupture je suis en goumin. » Goumin, c’est plutôt…",
        choices: [
          "Une peine de cœur / douleur amoureuse",
          "Une fête improvisée",
          "Un abonnement streaming",
          "Un bug de téléphone",
        ],
        correct_index: 0,
        explanation: "Être en goumin = mal vivre une histoire de cœur.",
        context: "group_chat",
      },
      {
        difficulty: "facile",
        question: "Quel usage colle avec « goumin » ?",
        choices: [
          "Il l’a ghost — elle est en plein goumin.",
          "J’ai payé mon goumin.",
          "Goumin est un navigateur.",
          "Goumin = 5G.",
        ],
        correct_index: 0,
        explanation: "C’est de l’émotion relationnelle, pas un produit.",
        context: "dating_debrief",
      },
    ],
  },
  mon_pain: {
    concept_key: "mon_pain",
    theme: "relations_lifestyle",
    label: "Mon pain",
    questions: [
      {
        difficulty: "moyen",
        question: "Dans le groupe : « Regarde mon pain sur Insta. » Là, « pain », c’est…",
        choices: [
          "Quelqu’un qui plaît beaucoup (crush physique)",
          "Une baguette à récupérer",
          "Un filtre photo officiel",
          "Un mot de passe",
        ],
        correct_index: 0,
        explanation: "« Mon pain » = mon crush / quelqu’un qui attire — pas la boulangerie.",
        context: "group_chat",
      },
      {
        difficulty: "facile",
        question: "« La boulangerie est remplie ce soir » en langage ado, ça évoque surtout…",
        choices: [
          "Beaucoup de « pains » (gens attirants) sur place",
          "Une pénurie de farine",
          "Un solde sur le pain",
          "Une panne de four",
        ],
        correct_index: 0,
        explanation: "Boulangerie = endroit où il y a plein de pains (crushes).",
        context: "party",
      },
    ],
  },
  aura: {
    concept_key: "aura",
    theme: "culture_pop",
    label: "Aura",
    questions: [
      {
        difficulty: "moyen",
        question: "« Avec ces lunettes, aura +1000. » Ça parle surtout de…",
        choices: [
          "La présence / la vibe / le charisme perçu",
          "Un score de batterie",
          "Un filtre Instagram obligatoire",
          "Un antivirus",
        ],
        correct_index: 0,
        explanation: "Aura = énergie / présence — souvent chiffrée en meme (+1000 / −1000).",
        context: "group_chat",
      },
      {
        difficulty: "facile",
        question: "Quel message colle avec « aura » ?",
        choices: [
          "Il est arrivé en retard sans s’excuser : aura −1000.",
          "J’ai activé aura dans le Bluetooth.",
          "Aura est une banque.",
          "Aura = code Wi-Fi.",
        ],
        correct_index: 0,
        explanation: "On juge une vibe, pas un réglage technique.",
        context: "social",
      },
    ],
  },
  pnj: {
    concept_key: "pnj",
    theme: "gaming",
    label: "PNJ",
    questions: [
      {
        difficulty: "moyen",
        question: "« En soirée il répond comme un PNJ. » Ça veut dire qu’il…",
        choices: [
          "A l’air d’un figurant : réactions automatiques, peu de personnalité",
          "Est le boss final du jeu",
          "Gère le Wi-Fi de la soirée",
          "Est DJ professionnel",
        ],
        correct_index: 0,
        explanation: "PNJ (comme NPC) = personnage non joueur → quelqu’un qui « joue un rôle plat ».",
        context: "party",
      },
      {
        difficulty: "facile",
        question: "Quel usage de « PNJ » sonne juste ?",
        choices: [
          "À la réunion, tout le monde récite la même phrase : ambiance PNJ.",
          "J’ai installé PNJ sur mon téléphone.",
          "PNJ est un forfait mobile.",
          "PNJ = 5G.",
        ],
        correct_index: 0,
        explanation: "C’est une vanne sociale venue du gaming.",
        context: "group_chat",
      },
    ],
  },
  six_seven: {
    concept_key: "six_seven",
    theme: "trends_pop_culture",
    label: "Six-seven",
    questions: [
      {
        difficulty: "moyen",
        question:
          "Ton ado répond « six-seveeen » avec un geste des deux mains. Le plus juste, c’est…",
        choices: [
          "Un mème / cri de génération souvent absurde — code d’appartenance plus qu’une définition",
          "Une note sur 10 en maths",
          "Un code Wi-Fi",
          "Une heure de rendez-vous fixe",
        ],
        correct_index: 0,
        explanation:
          "Comme le quoicoubeh en son temps : ça circule en France (récré, TikTok, même la télé), et le sens fixe est volontairement flou.",
        context: "family",
      },
      {
        difficulty: "facile",
        question: "Pourquoi « six-seven » agace souvent les adultes ?",
        choices: [
          "Parce que c’est un effet de mode répété en boucle, sans explication claire",
          "Parce que c’est un virus informatique",
          "Parce que c’est une taxe",
          "Parce que c’est un réglage d’iPhone",
        ],
        correct_index: 0,
        explanation: "L’intérêt du mème, c’est justement le flou + le geste collectif.",
        context: "family",
      },
    ],
  },
  askip: {
    concept_key: "askip",
    theme: "vocabulaire",
    label: "Askip",
    questions: [
      {
        difficulty: "facile",
        question: "Dans le groupe : « Askip il l’a ghost depuis samedi. » Askip, c’est…",
        choices: [
          "Apparemment / à ce qu’il paraît",
          "Une appli de notes",
          "Un filtre Snapchat",
          "Un code Wi-Fi",
        ],
        correct_index: 0,
        explanation: "Askip = abréviation de « à ce qu’il paraît ».",
        context: "group_chat",
      },
      {
        difficulty: "moyen",
        question: "Quel message sonne juste avec « askip » ?",
        choices: [
          "Askip le concert est annulé, je vérifie encore.",
          "J’ai activé askip dans les réglages.",
          "Askip est une banque.",
          "Askip = antivirus.",
        ],
        correct_index: 0,
        explanation: "On rapporte une info non confirmée, pas un outil.",
        context: "story_reply",
      },
    ],
  },
  wallah: {
    concept_key: "wallah",
    theme: "vocabulaire",
    label: "Wallah",
    questions: [
      {
        difficulty: "facile",
        question: "Ton ado : « Wallah j’ai rien touché. » Il veut surtout…",
        choices: [
          "Insister / jurer que c’est vrai",
          "Parler d’une appli bancaire",
          "Donner un code PIN",
          "Demander le Wi-Fi",
        ],
        correct_index: 0,
        explanation: "Wallah = serment / « je te jure » (variante orale : walpa).",
        context: "family",
      },
      {
        difficulty: "moyen",
        question: "Quel usage colle avec « wallah » ?",
        choices: [
          "Wallah c’était pas moi qui ai liké ça.",
          "J’ai mis wallah en 5G.",
          "Wallah est un forfait mobile.",
          "Wallah = mode avion.",
        ],
        correct_index: 0,
        explanation: "C’est une affirmation orale, pas un réglage.",
        context: "group_chat",
      },
    ],
  },
  jsp: {
    concept_key: "jsp",
    theme: "vocabulaire",
    label: "Jsp",
    questions: [
      {
        difficulty: "facile",
        question: "Tu demandes « Tu viens ? » — réponse : « Jsp. » Ça veut dire…",
        choices: [
          "Je ne sais pas",
          "Je suis prêt",
          "Juste sans problème",
          "Jour sans pub",
        ],
        correct_index: 0,
        explanation: "Jsp = je sais pas (SMS / Snap).",
        context: "dm",
      },
      {
        difficulty: "moyen",
        question: "Quel message sonne naturel ?",
        choices: [
          "À quelle heure on se voit ? — Jsp encore.",
          "Active jsp dans le Bluetooth.",
          "Jsp est une cryptomonnaie.",
          "Jsp = code barre.",
        ],
        correct_index: 0,
        explanation: "Réponse d’incertitude, pas un produit.",
        context: "dm",
      },
    ],
  },
  charo: {
    concept_key: "charo",
    theme: "relations_lifestyle",
    label: "Charo",
    questions: [
      {
        difficulty: "moyen",
        question: "« Ce mec est un charo. » On parle surtout de quelqu’un qui…",
        choices: [
          "Enchaîne les conquêtes / est trop « chasse »",
          "Répare des voitures",
          "Gère le Wi-Fi du lycée",
          "Est DJ professionnel",
        ],
        correct_index: 0,
        explanation: "Charo vient de « charognard » : trop focalisé sur les plans / conquêtes.",
        context: "group_chat",
      },
      {
        difficulty: "facile",
        question: "Quel usage colle avec « charo » ?",
        choices: [
          "Il DM toutes les stories : gros charo.",
          "J’ai installé charo sur mon téléphone.",
          "Charo est un forfait.",
          "Charo = 5G.",
        ],
        correct_index: 0,
        explanation: "Jugement social / relationnel, pas une appli.",
        context: "story_reply",
      },
    ],
  },
  cringe: {
    concept_key: "cringe",
    theme: "culture_pop",
    label: "Cringe",
    questions: [
      {
        difficulty: "facile",
        question: "« Son discours était trop cringe. » Ça veut dire…",
        choices: [
          "Gênant / malaisant",
          "Très drôle au second degré",
          "Techniquement parfait",
          "Trop court",
        ],
        correct_index: 0,
        explanation: "Cringe = malaise / gêne — anglicisme très utilisé en France.",
        context: "family",
      },
      {
        difficulty: "moyen",
        question: "Quel message sonne juste ?",
        choices: [
          "Il a fait un discours devant toute la famille… cringe total.",
          "J’ai activé cringe dans les réglages.",
          "Cringe est une banque.",
          "Cringe = antivirus.",
        ],
        correct_index: 0,
        explanation: "On juge une vibe sociale, pas un outil.",
        context: "group_chat",
      },
    ],
  },
  sauce: {
    concept_key: "sauce",
    theme: "vocabulaire",
    label: "Sauce",
    questions: [
      {
        difficulty: "moyen",
        question: "« J’ai perdu mon tel, j’suis dans la sauce. » Là, sauce = …",
        choices: [
          "Dans la galère / embêté",
          "En train de cuisiner",
          "En mode avion",
          "Sur un forfait illimité",
        ],
        correct_index: 0,
        explanation: "« Dans la sauce » = dans la merde / galère. (Autre sens : « saucé » = sous le charme.)",
        context: "dm",
      },
      {
        difficulty: "facile",
        question: "« Il est saucé sur elle. » Ça veut plutôt dire…",
        choices: [
          "Il est sous le charme / trop attiré",
          "Il a mangé trop épicé",
          "Il a un virus",
          "Il a coupé le Wi-Fi",
        ],
        correct_index: 0,
        explanation: "Être saucé = être captivé / en crush fort.",
        context: "group_chat",
      },
    ],
  },
  genance: {
    concept_key: "genance",
    theme: "vocabulaire",
    label: "Gênance",
    questions: [
      {
        difficulty: "facile",
        question: "« Il a parlé trop fort au resto : c’est la gênance. » Ça décrit…",
        choices: [
          "Une situation très gênante / un malaise",
          "Une promo restaurant",
          "Un bug de téléphone",
          "Une note sur 20",
        ],
        correct_index: 0,
        explanation: "La gênance = le malaise collectif face à une scène awkward.",
        context: "family",
      },
      {
        difficulty: "moyen",
        question: "Quel usage sonne naturel ?",
        choices: [
          "Il a appelé sa mère en haut-parleur dans le métro… grosse gênance.",
          "J’ai activé gênance en Bluetooth.",
          "Gênance est une appli bancaire.",
          "Gênance = code Wi-Fi.",
        ],
        correct_index: 0,
        explanation: "C’est un jugement de situation, pas un réglage.",
        context: "group_chat",
      },
    ],
  },
  charbonner: {
    concept_key: "charbonner",
    theme: "vocabulaire",
    label: "Charbonner",
    questions: [
      {
        difficulty: "facile",
        question: "« J’ai charbonné tout le week-end pour réviser. » Ça veut dire…",
        choices: [
          "Travailler / enchaîner dur",
          "Allumer un barbecue",
          "Scroller sans but",
          "Couper les notifs",
        ],
        correct_index: 0,
        explanation: "Charbonner = travailler beaucoup (études, job, projets).",
        context: "family",
      },
      {
        difficulty: "moyen",
        question: "Quel message colle ?",
        choices: [
          "Là je charbonne jusqu’à vendredi, on se voit après.",
          "J’ai installé charbonner.",
          "Charbonner est un forfait.",
          "Charbonner = 5G.",
        ],
        correct_index: 0,
        explanation: "Verbe d’effort, pas un produit.",
        context: "dm",
      },
    ],
  },
  daron: {
    concept_key: "daron",
    theme: "vocabulaire",
    label: "Daron",
    questions: [
      {
        difficulty: "facile",
        question: "« Mon daron est pas content. » Daron, c’est…",
        choices: [
          "Le père (daronne = la mère)",
          "Le professeur principal",
          "Le Wi-Fi de la maison",
          "Le compte Netflix",
        ],
        correct_index: 0,
        explanation: "Daron / daronne = parents, en argot FR.",
        context: "family",
      },
      {
        difficulty: "moyen",
        question: "« Les darons sont rentrés. » Ça signifie…",
        choices: [
          "Les parents sont rentrés",
          "Les voisins ont sonné",
          "Le colis est arrivé",
          "La batterie est à 100 %",
        ],
        correct_index: 0,
        explanation: "Les darons = papa et/ou maman.",
        context: "group_chat",
      },
    ],
  },
  bg: {
    concept_key: "bg",
    theme: "relations_lifestyle",
    label: "BG",
    questions: [
      {
        difficulty: "facile",
        question: "« T’as vu le nouveau ? Il est bg. » BG veut dire…",
        choices: [
          "Beau gosse / stylé / attirant",
          "Bon grade scolaire",
          "Batterie faible",
          "Bloc-notes Google",
        ],
        correct_index: 0,
        explanation: "BG = beau gosse.",
        context: "group_chat",
      },
      {
        difficulty: "moyen",
        question: "Quel usage sonne juste ?",
        choices: [
          "Avec cette coupe, t’es trop bg.",
          "J’ai activé BG dans les réglages.",
          "BG est une banque.",
          "BG = antivirus.",
        ],
        correct_index: 0,
        explanation: "Compliment d’apparence / vibe, pas un outil.",
        context: "story_reply",
      },
    ],
  },
  relou: {
    concept_key: "relou",
    theme: "vocabulaire",
    label: "Relou",
    questions: [
      {
        difficulty: "facile",
        question: "« Arrête, t’es relou. » Relou veut dire…",
        choices: [
          "Lourd / agaçant / pénible",
          "Très drôle",
          "Trop discret",
          "En retard",
        ],
        correct_index: 0,
        explanation: "Relou = verlan de « lourd ».",
        context: "dm",
      },
      {
        difficulty: "moyen",
        question: "Quel message colle ?",
        choices: [
          "Il relance 10 fois : trop relou.",
          "J’ai mis relou en 5G.",
          "Relou est un forfait.",
          "Relou = mode avion.",
        ],
        correct_index: 0,
        explanation: "Jugement sur un comportement agaçant.",
        context: "group_chat",
      },
    ],
  },
  ya_pas_h: {
    concept_key: "ya_pas_h",
    theme: "vocabulaire",
    label: "Y’a pas H",
    questions: [
      {
        difficulty: "moyen",
        question: "« Vas-y y’a pas H, on y va. » Ça veut dire…",
        choices: [
          "Y’a pas de souci / c’est clair",
          "Y’a pas d’hôtel",
          "Y’a pas de Wi-Fi",
          "Y’a pas d’heure",
        ],
        correct_index: 0,
        explanation: "Y’a pas H ≈ y’a pas de H(istoire) / pas de problème — go.",
        context: "group_chat",
      },
      {
        difficulty: "facile",
        question: "Quel usage sonne naturel ?",
        choices: [
          "Tu veux venir ? Y’a pas H.",
          "J’ai activé y’a pas H.",
          "Y’a pas H est une banque.",
          "Y’a pas H = antivirus.",
        ],
        correct_index: 0,
        explanation: "Formule d’accord / détente, pas un produit.",
        context: "dm",
      },
    ],
  },
  flemme: {
    concept_key: "flemme",
    theme: "vocabulaire",
    label: "Flemme",
    questions: [
      {
        difficulty: "facile",
        question: "« J’ai la flemme de sortir. » Ça veut dire…",
        choices: [
          "Pas envie / la paresse du moment",
          "Une envie urgente de bouger",
          "Un bug téléphone",
          "Une panne de métro",
        ],
        correct_index: 0,
        explanation: "Avoir la flemme = ne pas avoir la motivation.",
        context: "dm",
      },
      {
        difficulty: "moyen",
        question: "Quel message colle ?",
        choices: [
          "Grosse flemme ce soir, on reporte.",
          "J’ai installé flemme.",
          "Flemme est un forfait.",
          "Flemme = 5G.",
        ],
        correct_index: 0,
        explanation: "État d’esprit, pas une appli.",
        context: "group_chat",
      },
    ],
  },
  osef: {
    concept_key: "osef",
    theme: "vocabulaire",
    label: "Osef",
    questions: [
      {
        difficulty: "facile",
        question: "« Il a liké ? Osef. » Osef signifie…",
        choices: [
          "On s’en fout / ça n’a aucune importance",
          "On se fait une fête",
          "On se connecte en 5G",
          "On active le mode avion",
        ],
        correct_index: 0,
        explanation: "Osef = on s’en fout.",
        context: "group_chat",
      },
      {
        difficulty: "moyen",
        question: "Quel usage sonne juste ?",
        choices: [
          "Qu’il soit vexé ou pas, osef.",
          "J’ai activé osef dans les réglages.",
          "Osef est une banque.",
          "Osef = antivirus.",
        ],
        correct_index: 0,
        explanation: "Marqueur d’indifférence, pas un outil.",
        context: "dm",
      },
    ],
  },
  quoicoubeh: {
    concept_key: "quoicoubeh",
    theme: "trends_pop_culture",
    label: "Quoicoubeh",
    questions: [
      {
        difficulty: "moyen",
        question: "Ton ado répond « quoicoubeh » sans raison. Le plus juste, c’est…",
        choices: [
          "Un mème / réplique absurde pour troller ou appartenir au groupe",
          "Une question sur le Wi-Fi",
          "Un code PIN",
          "Une note de maths",
        ],
        correct_index: 0,
        explanation: "Comme six-seven : code de génération plus qu’une définition fixe.",
        context: "family",
      },
      {
        difficulty: "facile",
        question: "Pourquoi « quoicoubeh » a agacé beaucoup d’adultes ?",
        choices: [
          "Parce que c’est répété en boucle, souvent sans sens clair",
          "Parce que c’est un virus",
          "Parce que c’est une taxe",
          "Parce que c’est un réglage iPhone",
        ],
        correct_index: 0,
        explanation: "Effet de mode FR (cour de récré) — idéal fil du jour.",
        context: "family",
      },
    ],
  },
  go: {
    concept_key: "go",
    theme: "relations_lifestyle",
    label: "Go",
    questions: [
      {
        difficulty: "moyen",
        question: "« C’est sa go. » Ici, go veut dire…",
        choices: [
          "Sa petite amie / copine",
          "Qu’il faut y aller tout de suite",
          "Un bouton « démarrer »",
          "Une appli de sport",
        ],
        correct_index: 0,
        explanation: "En FR ado, « go » / « gow » = petite amie (≠ l’anglais « go »).",
        context: "group_chat",
      },
      {
        difficulty: "facile",
        question: "Quel message sonne juste ?",
        choices: [
          "Il est sorti avec sa go ce week-end.",
          "J’ai activé go dans le Bluetooth.",
          "Go est une banque.",
          "Go = antivirus.",
        ],
        correct_index: 0,
        explanation: "Relation amoureuse, pas un réglage.",
        context: "story_reply",
      },
    ],
  },
};

const outDir = resolve(root, "exports/dedup-audit");
const dataDir = resolve(root, "src/data");
const allQuestions = [];
const pilots = [];

for (const key of only) {
  const lot = LOTS[key];
  if (!lot) {
    console.warn("No hard-authored lot for", key, "— skip");
    continue;
  }
  const pilot = {
    pilot_id: `${key}-intake-promote-v1`,
    concept_key: lot.concept_key,
    pack_ref: "cultural-pack-v1.json",
    status: "draft_review",
    notes:
      "Lot promu depuis intake approve. Pas d’import Supabase auto — review humaine puis insert admin ciblé.",
    questions: lot.questions.map((q) => ({
      concept_key: lot.concept_key,
      theme: lot.theme,
      difficulty: q.difficulty,
      status: "draft",
      question: q.question,
      choices: q.choices,
      correct_index: q.correct_index,
      explanation: q.explanation,
      tone: "social",
      context: q.context,
      trap_intensity: "soft_trap",
      era: "tiktok",
      format: "scenario_text",
      internet_level: "debutant",
      editor_notes: `Pilot ${lot.label} — authenticity scene check required before live.`,
    })),
  };
  pilots.push(pilot);
  writeJson(resolve(dataDir, `${key}-pilot-questions-v1.json`), pilot);
  for (const q of pilot.questions) allQuestions.push({ ...q, label: lot.label });
}

const stamp = stampIso();
const rows = allQuestions.map((q, i) => ({
  lot_index: i + 1,
  concept_key: q.concept_key,
  theme: q.theme,
  difficulty: q.difficulty,
  question: q.question,
  choice_a: q.choices[0],
  choice_b: q.choices[1],
  choice_c: q.choices[2],
  choice_d: q.choices[3],
  correct_index: q.correct_index,
  explanation: q.explanation,
  human_decision: "",
  human_notes: "",
}));

const doc = {
  generated_at: new Date().toISOString(),
  policy: "question_lot_v1_review_only_no_import",
  concept_keys: only,
  question_count: rows.length,
  pilot_files: pilots.map((p) => `src/data/${p.concept_key}-pilot-questions-v1.json`),
  questions: rows,
};

writeJson(resolve(outDir, "question-lot-promote-v1-latest.json"), doc);
writeJson(resolve(outDir, `question-lot-promote-v1-${stamp}.json`), doc);
writeCsv(
  resolve(outDir, "question-lot-promote-v1-latest.csv"),
  [
    "lot_index",
    "concept_key",
    "theme",
    "difficulty",
    "question",
    "choice_a",
    "choice_b",
    "choice_c",
    "choice_d",
    "correct_index",
    "explanation",
    "human_decision",
    "human_notes",
  ],
  rows,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      question_count: rows.length,
      pilot_files: doc.pilot_files,
      next: "Review CSV → admin insert only after human OK (never import:new-questions mass).",
    },
    null,
    2,
  ),
);
