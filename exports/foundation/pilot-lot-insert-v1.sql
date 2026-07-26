-- pilot lot insert v1 (idempotent via NOT EXISTS on question text)
INSERT INTO public.questions (
  theme, difficulty, question, choices, correct_index, explanation, is_active, status, concept_key, editor_notes
)
SELECT * FROM (VALUES
(
      'vocabulaire'::public.question_theme,
      'facile'::public.question_difficulty,
      'Ton ado : « J’ai ouvert mon bulletin… chokbar. » Ça veut dire qu’il est…',
      '["Très choqué / surpris","En train de manger du chocolat","En cours de sport","En mode avion"]'::jsonb,
      0,
      'Chokbar = être choqué, souvent dit de façon théâtrale.',
      true,
      'live'::public.question_status,
      'chokbar',
      'Pilot Chokbar — authenticity scene check required before live.'
    ),
(
      'vocabulaire'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Quel message sonne le plus naturel avec « chokbar » ?',
      '["Il a unfollow tout le monde d’un coup — chokbar.","J’ai activé chokbar dans les réglages.","Chokbar est une appli bancaire.","Chokbar = code Wi-Fi."]'::jsonb,
      0,
      'On l’utilise comme réaction à une info surprise.',
      true,
      'live'::public.question_status,
      'chokbar',
      'Pilot Chokbar — authenticity scene check required before live.'
    ),
(
      'relations_lifestyle'::public.question_theme,
      'moyen'::public.question_difficulty,
      '« Depuis la rupture je suis en goumin. » Goumin, c’est plutôt…',
      '["Une peine de cœur / douleur amoureuse","Une fête improvisée","Un abonnement streaming","Un bug de téléphone"]'::jsonb,
      0,
      'Être en goumin = mal vivre une histoire de cœur.',
      true,
      'live'::public.question_status,
      'goumin',
      'Pilot Goumin — authenticity scene check required before live.'
    ),
(
      'relations_lifestyle'::public.question_theme,
      'facile'::public.question_difficulty,
      'Quel usage colle avec « goumin » ?',
      '["Il l’a ghost — elle est en plein goumin.","J’ai payé mon goumin.","Goumin est un navigateur.","Goumin = 5G."]'::jsonb,
      0,
      'C’est de l’émotion relationnelle, pas un produit.',
      true,
      'live'::public.question_status,
      'goumin',
      'Pilot Goumin — authenticity scene check required before live.'
    ),
(
      'relations_lifestyle'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Dans le groupe : « Regarde mon pain sur Insta. » Là, « pain », c’est…',
      '["Quelqu’un qui plaît beaucoup (crush physique)","Une baguette à récupérer","Un filtre photo officiel","Un mot de passe"]'::jsonb,
      0,
      '« Mon pain » = mon crush / quelqu’un qui attire — pas la boulangerie.',
      true,
      'live'::public.question_status,
      'mon_pain',
      'Pilot Mon pain — authenticity scene check required before live.'
    ),
(
      'relations_lifestyle'::public.question_theme,
      'facile'::public.question_difficulty,
      '« La boulangerie est remplie ce soir » en langage ado, ça évoque surtout…',
      '["Beaucoup de « pains » (gens attirants) sur place","Une pénurie de farine","Un solde sur le pain","Une panne de four"]'::jsonb,
      0,
      'Boulangerie = endroit où il y a plein de pains (crushes).',
      true,
      'live'::public.question_status,
      'mon_pain',
      'Pilot Mon pain — authenticity scene check required before live.'
    ),
(
      'culture_pop'::public.question_theme,
      'moyen'::public.question_difficulty,
      '« Avec ces lunettes, aura +1000. » Ça parle surtout de…',
      '["La présence / la vibe / le charisme perçu","Un score de batterie","Un filtre Instagram obligatoire","Un antivirus"]'::jsonb,
      0,
      'Aura = énergie / présence — souvent chiffrée en meme (+1000 / −1000).',
      true,
      'live'::public.question_status,
      'aura',
      'Pilot Aura — authenticity scene check required before live.'
    ),
(
      'culture_pop'::public.question_theme,
      'facile'::public.question_difficulty,
      'Quel message colle avec « aura » ?',
      '["Il est arrivé en retard sans s’excuser : aura −1000.","J’ai activé aura dans le Bluetooth.","Aura est une banque.","Aura = code Wi-Fi."]'::jsonb,
      0,
      'On juge une vibe, pas un réglage technique.',
      true,
      'live'::public.question_status,
      'aura',
      'Pilot Aura — authenticity scene check required before live.'
    ),
(
      'gaming'::public.question_theme,
      'moyen'::public.question_difficulty,
      '« En soirée il répond comme un PNJ. » Ça veut dire qu’il…',
      '["A l’air d’un figurant : réactions automatiques, peu de personnalité","Est le boss final du jeu","Gère le Wi-Fi de la soirée","Est DJ professionnel"]'::jsonb,
      0,
      'PNJ (comme NPC) = personnage non joueur → quelqu’un qui « joue un rôle plat ».',
      true,
      'live'::public.question_status,
      'pnj',
      'Pilot PNJ — authenticity scene check required before live.'
    ),
(
      'gaming'::public.question_theme,
      'facile'::public.question_difficulty,
      'Quel usage de « PNJ » sonne juste ?',
      '["À la réunion, tout le monde récite la même phrase : ambiance PNJ.","J’ai installé PNJ sur mon téléphone.","PNJ est un forfait mobile.","PNJ = 5G."]'::jsonb,
      0,
      'C’est une vanne sociale venue du gaming.',
      true,
      'live'::public.question_status,
      'pnj',
      'Pilot PNJ — authenticity scene check required before live.'
    ),
(
      'trends_pop_culture'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Ton ado répond « six-seveeen » avec un geste des deux mains. Le plus juste, c’est…',
      '["Un mème / cri de génération souvent absurde — code d’appartenance plus qu’une définition","Une note sur 10 en maths","Un code Wi-Fi","Une heure de rendez-vous fixe"]'::jsonb,
      0,
      'Comme le quoicoubeh en son temps : ça circule en France (récré, TikTok, même la télé), et le sens fixe est volontairement flou.',
      true,
      'live'::public.question_status,
      'six_seven',
      'Pilot Six-seven — authenticity scene check required before live.'
    ),
(
      'trends_pop_culture'::public.question_theme,
      'facile'::public.question_difficulty,
      'Pourquoi « six-seven » agace souvent les adultes ?',
      '["Parce que c’est un effet de mode répété en boucle, sans explication claire","Parce que c’est un virus informatique","Parce que c’est une taxe","Parce que c’est un réglage d’iPhone"]'::jsonb,
      0,
      'L’intérêt du mème, c’est justement le flou + le geste collectif.',
      true,
      'live'::public.question_status,
      'six_seven',
      'Pilot Six-seven — authenticity scene check required before live.'
    ),
(
      'culture_pop'::public.question_theme,
      'facile'::public.question_difficulty,
      '« Sheesh, la tenue est de fou. » Sheesh sert surtout à…',
      '["Marquer l’admiration / un petit choc positif","Demander l’heure","Couper le Wi-Fi","Valider un paiement"]'::jsonb,
      0,
      'Sheesh ≈ wow — exclamation d’admiration.',
      true,
      'live'::public.question_status,
      'sheesh',
      'Pilot Sheesh — authenticity scene check required before live.'
    ),
(
      'culture_pop'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Quel usage sonne naturel ?',
      '["Sheesh, t’as cartonnné sur cette vidéo.","J’ai activé sheesh dans les réglages.","Sheesh est une banque.","Sheesh = antivirus."]'::jsonb,
      0,
      'Réaction orale / commentaire, pas un outil.',
      true,
      'live'::public.question_status,
      'sheesh',
      'Pilot Sheesh — authenticity scene check required before live.'
    )
) AS v(theme, difficulty, question, choices, correct_index, explanation, is_active, status, concept_key, editor_notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions q WHERE q.question = v.question
)
RETURNING id, concept_key, left(question, 60) AS q;
