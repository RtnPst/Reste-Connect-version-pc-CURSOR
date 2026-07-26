-- pilot lot insert v1 (idempotent via NOT EXISTS on question text)
INSERT INTO public.questions (
  theme, difficulty, question, choices, correct_index, explanation, is_active, status, concept_key, editor_notes
)
SELECT * FROM (VALUES
(
      'vocabulaire'::public.question_theme,
      'facile'::public.question_difficulty,
      '« Je kiffe trop cette série. » Kiffer, c’est…',
      '["Aimer beaucoup / apprécier fort","Désinstaller une appli","Couper le Wi-Fi","Réviser pour un contrôle"]'::jsonb,
      0,
      'Kiffer = aimer fort (du « kif »).',
      true,
      'live'::public.question_status,
      'kiffer',
      'Pilot Kiffer — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Quel message colle avec « kiffer » ?',
      '["Je kiffe grave ta playlist.","J’ai activé kiffer en 5G.","Kiffer est une banque.","Kiffer = antivirus."]'::jsonb,
      0,
      'Verbe d’appréciation, pas un outil.',
      true,
      'live'::public.question_status,
      'kiffer',
      'Pilot Kiffer — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'facile'::public.question_difficulty,
      '« Laisse, je suis peinard. » Ça veut dire…',
      '["Tranquille / sans stress","En panne de batterie","En retard au boulot","En train de streame"]'::jsonb,
      0,
      'Être peinard = être cool, bien installé, sans souci.',
      true,
      'live'::public.question_status,
      'peinard',
      'Pilot Peinard — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Quel usage de « peinard » sonne juste ?',
      '["Dimanche après-midi, canapé, je suis peinard.","J’ai installé peinard.","Peinard est un forfait.","Peinard = mode avion."]'::jsonb,
      0,
      'État de tranquillité, pas un produit.',
      true,
      'live'::public.question_status,
      'peinard',
      'Pilot Peinard — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'facile'::public.question_difficulty,
      '« J’ai plus de thune ce mois-ci. » Thune = …',
      '["Argent","Batterie","Données mobiles","Abonnement Netflix"]'::jsonb,
      0,
      'La thune = l’argent.',
      true,
      'live'::public.question_status,
      'thune',
      'Pilot Thune — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Quel message colle avec « thune » ?',
      '["Ce week-end j’économise : plus trop de thune.","J’ai activé thune dans les réglages.","Thune est une cryptomonnaie officielle.","Thune = code Wi-Fi."]'::jsonb,
      0,
      'Argot pour l’argent, pas un réglage.',
      true,
      'live'::public.question_status,
      'thune',
      'Pilot Thune — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'facile'::public.question_difficulty,
      'Quelqu’un t’écrit « Waz, ça va ? » Waz sert surtout à…',
      '["Saluer / appeler de façon informelle","Demander le code Wi-Fi","Valider un paiement","Couper les notifs"]'::jsonb,
      0,
      'Waz ≈ salut (voisin de wesh).',
      true,
      'live'::public.question_status,
      'waz',
      'Pilot Waz — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Quel usage de « waz » sonne naturel ?',
      '["Waz, t’es où ?","J’ai mis waz en 5G.","Waz est une banque.","Waz = antivirus."]'::jsonb,
      0,
      'Formule d’appel, pas un outil.',
      true,
      'live'::public.question_status,
      'waz',
      'Pilot Waz — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Dans un groupe : « Il est dz. » Le plus juste, c’est…',
      '["Un code d’appartenance lié à l’Algérie / aux Algériens","Un réglage téléphone","Un forfait illimité","Un filtre Instagram"]'::jsonb,
      0,
      'DZ = code pour Algérie / identité algérienne (usage social FR).',
      true,
      'live'::public.question_status,
      'dz',
      'Pilot DZ — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'facile'::public.question_difficulty,
      'Quel usage colle avec « DZ » ?',
      '["Ce soir y’a match, ambiance DZ.","J’ai activé DZ dans le Bluetooth.","DZ est une appli bancaire.","DZ = mode avion."]'::jsonb,
      0,
      'Marqueur d’appartenance / ambiance, pas un réglage.',
      true,
      'live'::public.question_status,
      'dz',
      'Pilot DZ — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'facile'::public.question_difficulty,
      '« Son message est chelou. » Chelou veut dire…',
      '["Bizarre / louche","Très clair","Trop long","En anglais uniquement"]'::jsonb,
      0,
      'Chelou = verlan de louche.',
      true,
      'live'::public.question_status,
      'chelou',
      'Pilot Chelou — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Quel message colle avec « chelou » ?',
      '["Il a liké à 3h du mat’ : un peu chelou.","J’ai installé chelou.","Chelou est un forfait.","Chelou = 5G."]'::jsonb,
      0,
      'Jugement sur quelque chose d’étrange.',
      true,
      'live'::public.question_status,
      'chelou',
      'Pilot Chelou — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'facile'::public.question_difficulty,
      '« J’ai le seum, j’ai raté le bus. » Avoir le seum = …',
      '["Être vexé / avoir la rage / être déçu","Avoir faim","Avoir trop d’énergie","Avoir oublié son code"]'::jsonb,
      0,
      'Le seum = la frustration / la rage du moment.',
      true,
      'live'::public.question_status,
      'seum',
      'Pilot Seum — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Quel usage de « seum » sonne juste ?',
      '["Ils ont annulé le concert : gros seum.","J’ai activé seum en Bluetooth.","Seum est une banque.","Seum = antivirus."]'::jsonb,
      0,
      'Émotion négative, pas un produit.',
      true,
      'live'::public.question_status,
      'seum',
      'Pilot Seum — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'facile'::public.question_difficulty,
      '« Là je suis vénère. » Ça veut dire…',
      '["Énervé / en colère","Très amoureux","En mode avion","Sans batterie"]'::jsonb,
      0,
      'Vénère = verlan d’énervé.',
      true,
      'live'::public.question_status,
      'venere',
      'Pilot Vénère — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Quel message colle avec « vénère » ?',
      '["Il a spoil la fin : je suis trop vénère.","J’ai mis vénère en 5G.","Vénère est un forfait.","Vénère = code Wi-Fi."]'::jsonb,
      0,
      'État d’énervement, pas un réglage.',
      true,
      'live'::public.question_status,
      'venere',
      'Pilot Vénère — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'moyen'::public.question_difficulty,
      '« Arrête de faire le boloss. » Boloss désigne plutôt…',
      '["Quelqu’un de naïf / ridicule / facile à avoir","Un expert cybersécurité","Un abonnement premium","Un filtre beauté"]'::jsonb,
      0,
      'Boloss = personne un peu « loser » / naïve dans le jugement social.',
      true,
      'live'::public.question_status,
      'boloss',
      'Pilot Boloss — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'facile'::public.question_difficulty,
      'Quel usage sonne juste avec « boloss » ?',
      '["Il a cru à l’arnaque : gros boloss.","J’ai installé boloss.","Boloss est une banque.","Boloss = antivirus."]'::jsonb,
      0,
      'Jugement social, pas une appli.',
      true,
      'live'::public.question_status,
      'boloss',
      'Pilot Boloss — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'facile'::public.question_difficulty,
      '« La soirée était de ouf. » Ça veut dire…',
      '["Impressionnant / dingue / très fort","Très ennuyeux","Sans musique","Sans réseau"]'::jsonb,
      0,
      'Ouf = verlan de fou ; « de ouf » = de fou.',
      true,
      'live'::public.question_status,
      'ouf',
      'Pilot Ouf — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Quel message colle avec « ouf » ?',
      '["Le but en prolongation : c’était ouf.","J’ai activé ouf dans les réglages.","Ouf est un forfait.","Ouf = mode avion."]'::jsonb,
      0,
      'Exclamation d’intensité, pas un outil.',
      true,
      'live'::public.question_status,
      'ouf',
      'Pilot Ouf — authenticity scene check required before live.'
    )
) AS v(theme, difficulty, question, choices, correct_index, explanation, is_active, status, concept_key, editor_notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions q WHERE q.question = v.question
)
RETURNING id, concept_key, left(question, 60) AS q;
