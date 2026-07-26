-- pilot lot insert v1 (idempotent via NOT EXISTS on question text)
INSERT INTO public.questions (
  theme, difficulty, question, choices, correct_index, explanation, is_active, status, concept_key, editor_notes
)
SELECT * FROM (VALUES
(
      'reseaux_sociaux'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Ton pote te dit : « J’ai scrollé 3h d’edits, je suis en plein brainrot. » Il parle surtout de…',
      '["Un trop-plein de contenus qui lui tourne encore dans la tête","Un virus qui efface ses apps","Une méthode pour réviser plus vite","Un réglage qui coupe les notifs"]'::jsonb,
      0,
      '« Brainrot », c’est le sentiment d’avoir le cerveau saturé par des contenus ultra-répétitifs — pas un bug technique.',
      true,
      'live'::public.question_status,
      'brainrot',
      'Pilot Brainrot — authenticity scene check required before live.'
    ),
(
      'reseaux_sociaux'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Quel message sonne le plus naturel avec « brainrot » ?',
      '["Mon feed est full brainrot depuis ce matin.","Active le brainrot dans les réglages Wi-Fi.","Le brainrot est une appli bancaire.","Brainrot = traduction automatique."]'::jsonb,
      0,
      'On l’utilise pour parler d’un feed / d’une session qui te « pourrit » un peu le cerveau.',
      true,
      'live'::public.question_status,
      'brainrot',
      'Pilot Brainrot — authenticity scene check required before live.'
    ),
(
      'reseaux_sociaux'::public.question_theme,
      'facile'::public.question_difficulty,
      'Elle dit : « Il a liké ma story, on va se marier — ok je suis un peu delulu. » Delulu, c’est plutôt…',
      '["Se raconter un film un peu trop beau / irréaliste","Vérifier trois sources avant de conclure","Être experte cybersécurité","Couper complètement les réseaux"]'::jsonb,
      0,
      '« Delulu » (de delusional) = tu te racontes une belle histoire, souvent dit avec auto-dérision.',
      true,
      'live'::public.question_status,
      'delulu',
      'Pilot Delulu — authenticity scene check required before live.'
    ),
(
      'reseaux_sociaux'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Quel usage de « delulu » colle le mieux ?',
      '["Il m’a répondu « lol », c’est sûr qu’il kiffe — je suis peut-être delulu.","J’ai payé mon abonnement, c’est delulu.","Mon wifi coupe, c’est delulu.","J’ai relu le contrat deux fois, je suis delulu."]'::jsonb,
      0,
      'Le mot pointe une projection amoureuse / sociale un peu fantasmée.',
      true,
      'live'::public.question_status,
      'delulu',
      'Pilot Delulu — authenticity scene check required before live.'
    ),
(
      'reseaux_sociaux'::public.question_theme,
      'facile'::public.question_difficulty,
      'Dans le groupe : « Il a trop de rizz en story, tout le monde répond. » « Rizz », c’est surtout…',
      '["Du charisme / un talent pour captiver (souvent pour draguer)","Un filtre Instagram officiel","Un bug de notifications","Un abonnement premium"]'::jsonb,
      0,
      'Avoir du « rizz », c’est avoir du charme / de la game — pas un réglage d’app.',
      true,
      'live'::public.question_status,
      'rizz',
      'Pilot Rizz — authenticity scene check required before live.'
    ),
(
      'reseaux_sociaux'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Quel message sonne le plus juste avec « rizz » ?',
      '["T’as mis une story simple et tout le monde a répondu — t’as du rizz.","J’ai activé le rizz dans les réglages Wi-Fi.","Le rizz est une appli de banque.","Rizz = traduction automatique."]'::jsonb,
      0,
      'On parle d’effet social / charisme, pas d’un outil technique.',
      true,
      'live'::public.question_status,
      'rizz',
      'Pilot Rizz — authenticity scene check required before live.'
    ),
(
      'reseaux_sociaux'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Elle poste une story avec juste deux mains qui tiennent un café. Un pote : « Soft launch ? » Ça veut dire…',
      '["Elle laisse entendre quelqu’un / un projet sans l’annoncer clairement","Elle lance une appli en beta technique","Elle supprime son compte","Elle active le mode avion"]'::jsonb,
      0,
      'Un soft launch, c’est révéler en douceur (souvent une relation) — pas une annonce face cam.',
      true,
      'live'::public.question_status,
      'soft_launch',
      'Pilot Soft launch — authenticity scene check required before live.'
    ),
(
      'reseaux_sociaux'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Quelle différence colle le mieux entre soft launch et hard launch ?',
      '["Soft launch = indices discrets ; hard launch = photo de couple face cam claire","Soft launch = payer ; hard launch = gratuit","Soft launch = Wi-Fi ; hard launch = 5G","Soft launch = mute ; hard launch = volume max"]'::jsonb,
      0,
      'Soft = en douceur. Hard = annonce publique nette.',
      true,
      'live'::public.question_status,
      'soft_launch',
      'Pilot Soft launch — authenticity scene check required before live.'
    ),
(
      'reseaux_sociaux'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Ton pote te dit : « T’es trop en ligne, go touch grass. » Il te dit surtout de…',
      '["Décrocher un peu / retrouver le réel","Tondre la pelouse demain","Changer de forfait mobile","Activer le mode développeur"]'::jsonb,
      0,
      '« Touch grass » = sors un peu d’internet — vanne entre potes, pas un conseil jardinage.',
      true,
      'live'::public.question_status,
      'touch_grass',
      'Pilot Touch grass — authenticity scene check required before live.'
    ),
(
      'reseaux_sociaux'::public.question_theme,
      'facile'::public.question_difficulty,
      'Quel usage sonne le plus naturel avec « touch grass » ?',
      '["Tu scrolles depuis 4h : go touch grass.","J’ai installé touch grass sur mon téléphone.","Touch grass est un antivirus.","Touch grass = code Wi-Fi."]'::jsonb,
      0,
      'C’est une vanne sociale anti-addiction écrans.',
      true,
      'live'::public.question_status,
      'touch_grass',
      'Pilot Touch grass — authenticity scene check required before live.'
    ),
(
      'relations_lifestyle'::public.question_theme,
      'moyen'::public.question_difficulty,
      '« Elle arrive en main character energy au resto. » Ça décrit surtout quelqu’un qui…',
      '["Se met au centre du récit, comme le héros du film","Paie l’addition pour tout le monde","Refuse de commander","Travaille en cuisine"]'::jsonb,
      0,
      'Main character energy = attitude « c’est mon film » — présence / mise en scène de soi.',
      true,
      'live'::public.question_status,
      'main_character',
      'Pilot Main character — authenticity scene check required before live.'
    ),
(
      'relations_lifestyle'::public.question_theme,
      'facile'::public.question_difficulty,
      'Quel exemple colle le mieux avec « main character » ?',
      '["Il entre avec une playlist qui match son fit : main character.","Il a oublié ses clés : main character.","Le wifi coupe : main character.","Il a mis à jour iOS : main character."]'::jsonb,
      0,
      'Ça parle d’une posture / d’une vibe, pas d’un incident technique.',
      true,
      'live'::public.question_status,
      'main_character',
      'Pilot Main character — authenticity scene check required before live.'
    ),
(
      'culture_pop'::public.question_theme,
      'moyen'::public.question_difficulty,
      '« Là je suis locked in jusqu’à vendredi. » Ça veut surtout dire…',
      '["Hyper concentré / en mode focus total","Bloqué hors de son compte","En couple officiel","En mode avion permanent"]'::jsonb,
      0,
      'Locked in = focus intense (dossier, sport, étude) — pas un verrouillage de compte.',
      true,
      'live'::public.question_status,
      'locked_in',
      'Pilot Locked in — authenticity scene check required before live.'
    ),
(
      'culture_pop'::public.question_theme,
      'facile'::public.question_difficulty,
      'Quel message sonne juste avec « locked in » ?',
      '["Exam lundi : je suis locked in ce week-end.","J’ai activé locked in dans les réglages Bluetooth.","Locked in est une banque.","Locked in = antivirus."]'::jsonb,
      0,
      'On parle d’état de concentration, pas d’un réglage.',
      true,
      'live'::public.question_status,
      'locked_in',
      'Pilot Locked in — authenticity scene check required before live.'
    ),
(
      'reseaux_sociaux'::public.question_theme,
      'moyen'::public.question_difficulty,
      'Sous une story cryptique : « iykyk ». Ça veut dire…',
      '["Ceux qui savent savent — connivence entre initiés","Une erreur de frappe pour « ok »","Un code promo","Un réglage de confidentialité"]'::jsonb,
      0,
      'IYKYK = If You Know, You Know : clin d’œil à ceux qui ont la ref.',
      true,
      'live'::public.question_status,
      'iykyk',
      'Pilot IYKYK — authenticity scene check required before live.'
    ),
(
      'reseaux_sociaux'::public.question_theme,
      'facile'::public.question_difficulty,
      'Quel usage de « iykyk » colle le mieux ?',
      '["La blague du week-end… iykyk.","J’ai payé en iykyk.","Iykyk est un navigateur.","Iykyk = 5G."]'::jsonb,
      0,
      'C’est de la connivence sociale, pas un produit.',
      true,
      'live'::public.question_status,
      'iykyk',
      'Pilot IYKYK — authenticity scene check required before live.'
    )
) AS v(theme, difficulty, question, choices, correct_index, explanation, is_active, status, concept_key, editor_notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions q WHERE q.question = v.question
)
RETURNING id, concept_key, left(question, 60) AS q;
