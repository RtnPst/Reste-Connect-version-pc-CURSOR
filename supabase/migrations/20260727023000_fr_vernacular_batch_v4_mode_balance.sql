-- FR vernacular density batch v4 — living oral FR + mode balance
-- Idempotent via NOT EXISTS on question text.
-- Themes covered: vocabulaire, relations_lifestyle, reseaux_sociaux,
-- trends_pop_culture, tech, gaming.

INSERT INTO public.questions (
  theme, difficulty, question, choices, correct_index, explanation, is_active, status, concept_key, editor_notes
)
SELECT v.theme, v.difficulty, v.question, v.choices, v.correct_index, v.explanation, true,
       'live'::public.question_status, v.concept_key, v.editor_notes
FROM (
  VALUES
  -- OKLM
  ('vocabulaire'::public.question_theme, 'facile'::public.question_difficulty,
   'Dans le groupe : « Je suis OKLM chez moi. » OKLM, c’est…',
   '["Au calme / tranquille","Un forfait mobile","Une appli bancaire","Un code Wi-Fi"]'::jsonb, 0,
   'OKLM = « au calme » : détendu, sans stress.',
   'oklm', 'FR batch v4 — OKLM.'),
  ('vocabulaire'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel message sonne juste avec « OKLM » ?',
   '["Ce soir je reste OKLM, trop fatigué pour sortir.","J’ai activé OKLM en 5G.","OKLM est une cryptomonnaie.","OKLM = antivirus."]'::jsonb, 0,
   'On parle d’un état d’esprit, pas d’un réglage.',
   'oklm', 'FR batch v4 — OKLM.'),

  -- TKT
  ('vocabulaire'::public.question_theme, 'facile'::public.question_difficulty,
   'Réponse SMS : « Tkt j’arrive. » Tkt veut dire…',
   '["T’inquiète","Trop kit","Ticket","Très cool"]'::jsonb, 0,
   'Tkt = t’inquiète (SMS / Snap).',
   'tkt', 'FR batch v4 — Tkt.'),
  ('vocabulaire'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel usage colle avec « tkt » ?',
   '["Tkt pour l’heure, je gère.","Active tkt dans Bluetooth.","Tkt est une banque.","Tkt = mode avion."]'::jsonb, 0,
   'C’est une réassurance orale, pas un produit.',
   'tkt', 'FR batch v4 — Tkt.'),

  -- MISKINE
  ('vocabulaire'::public.question_theme, 'facile'::public.question_difficulty,
   '« Miskine, il a tout raté. » Miskine exprime surtout…',
   '["De la compassion / « le pauvre »","Une note scolaire","Un filtre Insta","Un code promo"]'::jsonb, 0,
   'Miskine (arabe) = pitié / compassion légère, souvent ironique.',
   'miskine', 'FR batch v4 — Miskine.'),
  ('vocabulaire'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel message sonne naturel avec « miskine » ?',
   '["Miskine, il a encore ghosté après deux messages.","J’ai installé miskine.","Miskine est un forfait.","Miskine = 5G."]'::jsonb, 0,
   'On commente une situation, pas une appli.',
   'miskine', 'FR batch v4 — Miskine.'),

  -- BELEK
  ('vocabulaire'::public.question_theme, 'facile'::public.question_difficulty,
   '« Belek aux trottoirs, y’a du verglas. » Belek veut dire…',
   '["Fais gaffe / attention","C’est gratuit","C’est validé","C’est terminé"]'::jsonb, 0,
   'Belek = fais attention (arabe / argot FR).',
   'belek', 'FR batch v4 — Belek.'),
  ('vocabulaire'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel usage colle avec « belek » ?',
   '["Belek, le boss te regarde.","Belek est une appli météo.","Belek = Wi-Fi public.","Belek est un emoji."]'::jsonb, 0,
   'C’est un avertissement oral.',
   'belek', 'FR batch v4 — Belek.'),

  -- HESS
  ('vocabulaire'::public.question_theme, 'facile'::public.question_difficulty,
   '« J’suis dans la hess. » La hess, c’est…',
   '["Être fauché / dans la galère","Être en vacances","Avoir le Wi-Fi","Gagner un loot"]'::jsonb, 0,
   'La hess = la galère financière / précaire.',
   'hess', 'FR batch v4 — Hess.'),
  ('vocabulaire'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel message colle avec « hess » ?',
   '["Fin du mois, grosse hess jusqu’à mercredi.","J’ai activé la hess.","Hess est une banque.","Hess = mode avion."]'::jsonb, 0,
   'On parle d’une situation, pas d’un réglage.',
   'hess', 'FR batch v4 — Hess.'),

  -- DARONNE
  ('vocabulaire'::public.question_theme, 'facile'::public.question_difficulty,
   '« Ma daronne a vu mon Snap. » Daronne désigne…',
   '["Sa mère","Son téléphone","Son boss","Son crush"]'::jsonb, 0,
   'Daronne = la mère (daron = le père).',
   'daronne', 'FR batch v4 — Daronne.'),
  ('vocabulaire'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel usage sonne juste avec « daronne » ?',
   '["Ma daronne m’a demandé qui c’était sur la story.","J’ai installé daronne.","Daronne est un forfait.","Daronne = antivirus."]'::jsonb, 0,
   'C’est une personne, pas une appli.',
   'daronne', 'FR batch v4 — Daronne.'),

  -- SAH
  ('vocabulaire'::public.question_theme, 'facile'::public.question_difficulty,
   '« Sah c’était un banger. » Sah veut plutôt dire…',
   '["Vraiment / sérieux","Demain matin","Sans Wi-Fi","Sans abonnement"]'::jsonb, 0,
   'Sah = vraiment / pour de vrai (renforce l’affirmation).',
   'sah', 'FR batch v4 — Sah.'),
  ('vocabulaire'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel message colle avec « sah » ?',
   '["Sah j’ai kiffé le concert.","Active sah dans les réglages.","Sah est une banque.","Sah = code barre."]'::jsonb, 0,
   'C’est un intensif oral, pas un produit.',
   'sah', 'FR batch v4 — Sah.'),

  -- TAFFER
  ('vocabulaire'::public.question_theme, 'facile'::public.question_difficulty,
   '« Je taffe demain à 6h. » Taffer, c’est…',
   '["Travailler","Voyager","Scroller","Streamer"]'::jsonb, 0,
   'Taffer = travailler (argot FR).',
   'taffer', 'FR batch v4 — Taffer.'),
  ('vocabulaire'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel usage sonne naturel avec « taffer » ?',
   '["Ce week-end je taffe pas, OKLM.","J’ai mis taffer en 5G.","Taffer est un filtre.","Taffer = Bluetooth."]'::jsonb, 0,
   'On parle du boulot, pas d’un réglage.',
   'taffer', 'FR batch v4 — Taffer.'),

  -- CIMER
  ('vocabulaire'::public.question_theme, 'facile'::public.question_difficulty,
   '« Cimer pour le plan. » Cimer veut dire…',
   '["Merci","À demain","C’est mort","C’est faux"]'::jsonb, 0,
   'Cimer = merci (verlan).',
   'cimer', 'FR batch v4 — Cimer.'),
  ('vocabulaire'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel message colle avec « cimer » ?',
   '["Cimer d’avoir partagé le code.","Active cimer sur ton téléphone.","Cimer est un forfait.","Cimer = antivirus."]'::jsonb, 0,
   'C’est un remerciement oral.',
   'cimer', 'FR batch v4 — Cimer.'),

  -- ABUSE (label déjà présent)
  ('vocabulaire'::public.question_theme, 'facile'::public.question_difficulty,
   '« 40 € le sandwich, c’est abusé. » Abusé veut dire…',
   '["C’est trop / exagéré","C’est délicieux","C’est légal","C’est gratuit"]'::jsonb, 0,
   '« C’est abusé » = c’est excessif, injuste, trop fort.',
   'abuse', 'FR batch v4 — Abusé.'),
  ('vocabulaire'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel usage sonne juste avec « abusé » ?',
   '["Il t’a laissé en vu 3 jours, c’est abusé.","J’ai activé abusé.","Abusé est une appli.","Abusé = mode avion."]'::jsonb, 0,
   'Jugement sur une situation, pas un réglage.',
   'abuse', 'FR batch v4 — Abusé.'),

  -- CHAUD (label déjà présent)
  ('vocabulaire'::public.question_theme, 'facile'::public.question_difficulty,
   '« Là c’est chaud. » Selon le contexte, chaud veut surtout dire…',
   '["C’est délicat / risqué / intense","C’est tiède","C’est ennuyeux","C’est gratuit"]'::jsonb, 0,
   '« C’est chaud » = situation tendue, délicate ou trop intense.',
   'chaud', 'FR batch v4 — Chaud.'),
  ('vocabulaire'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel message colle avec « chaud » ?',
   '["Répondre à ton ex à 1h du mat’, c’est chaud.","J’ai installé chaud.","Chaud est un forfait.","Chaud = Wi-Fi."]'::jsonb, 0,
   'Évaluation d’une situation sociale.',
   'chaud', 'FR batch v4 — Chaud.'),

  -- GREEN FLAG
  ('relations_lifestyle'::public.question_theme, 'facile'::public.question_difficulty,
   '« Lui, c’est un green flag. » Ça veut dire…',
   '["Un bon signe relationnel","Un signal d’alarme","Un filtre Snap","Un code promo"]'::jsonb, 0,
   'Green flag = signal positif (contraire du red flag).',
   'green_flag', 'FR batch v4 — Green flag.'),
  ('relations_lifestyle'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel message colle avec « green flag » ?',
   '["Il a demandé mon avis avant de poster : green flag.","J’ai activé green flag.","Green flag est une banque.","Green flag = 5G."]'::jsonb, 0,
   'On valide un comportement, pas une appli.',
   'green_flag', 'FR batch v4 — Green flag.'),

  -- FRERO
  ('relations_lifestyle'::public.question_theme, 'facile'::public.question_difficulty,
   '« Frérot, t’es où ? » Frérot sert surtout à…',
   '["S’adresser à un proche / un pote","Parler d’un frère biologique uniquement","Nommer une appli","Demander le Wi-Fi"]'::jsonb, 0,
   'Frérot / fréro = tutoiement affectueux entre proches (pas forcément famille).',
   'frero', 'FR batch v4 — Frérot.'),
  ('relations_lifestyle'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel usage sonne naturel avec « frérot » ?',
   '["Frérot, passe-moi le plan de la soirée.","J’ai installé frérot.","Frérot est un forfait.","Frérot = antivirus."]'::jsonb, 0,
   'Adresse orale entre potes.',
   'frero', 'FR batch v4 — Frérot.'),

  -- STALKER
  ('reseaux_sociaux'::public.question_theme, 'facile'::public.question_difficulty,
   '« J’ai stalké son profil. » Stalker, c’est…',
   '["Fouiller / scruter le profil de quelqu’un","Bloquer un compte","Liker une story","Activer le mode avion"]'::jsonb, 0,
   'Stalker = scruter le feed / les stories de quelqu’un (souvent en silence).',
   'stalker', 'FR batch v4 — Stalker.'),
  ('reseaux_sociaux'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel message colle avec « stalker » ?',
   '["J’ai stalké son Insta jusqu’en 2019, miskine.","J’ai activé stalker.","Stalker est une banque.","Stalker = QR code."]'::jsonb, 0,
   'Comportement réseau, pas un réglage.',
   'stalker', 'FR batch v4 — Stalker.'),

  -- BADER
  ('trends_pop_culture'::public.question_theme, 'facile'::public.question_difficulty,
   '« J’suis badé. » Selon le contexte, bader veut souvent dire…',
   '["Être scotché / sous le choc (ou trop détendu)","Payer une amende","Changer de forfait","Ouvrir un ticket"]'::jsonb, 0,
   'Bader (Sud / TikTok) : souvent « rester scotché », parfois « être au calme » — le contexte tranche.',
   'bader', 'FR batch v4 — Bader.'),
  ('trends_pop_culture'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel message sonne juste avec « badé » ?',
   '["Le twist de la série m’a laissé badé.","J’ai installé bader.","Bader est un forfait.","Bader = antivirus."]'::jsonb, 0,
   'Réaction / état, pas une appli.',
   'bader', 'FR batch v4 — Bader.'),

  -- ZERMA
  ('trends_pop_culture'::public.question_theme, 'facile'::public.question_difficulty,
   '« Zerma il est BG. » Zerma veut dire…',
   '["Soi-disant / genre","Vraiment","Gratuitement","Demain"]'::jsonb, 0,
   'Zerma = soi-disant, prétendument (ironie / scepticisme).',
   'zerma', 'FR batch v4 — Zerma.'),
  ('trends_pop_culture'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel usage colle avec « zerma » ?',
   '["Zerma il taffe, il scrolle depuis 3h.","Active zerma.","Zerma est une banque.","Zerma = Wi-Fi."]'::jsonb, 0,
   'On marque le doute / l’ironie.',
   'zerma', 'FR batch v4 — Zerma.'),

  -- DEEPFAKE
  ('tech'::public.question_theme, 'facile'::public.question_difficulty,
   'Un deepfake, c’est surtout…',
   '["Une vidéo/audio truqué(e) par IA pour imiter quelqu’un","Un antivirus","Un forfait 5G","Un filtre météo"]'::jsonb, 0,
   'Deepfake = contenu synthétique qui imite le visage / la voix de quelqu’un.',
   'deepfake', 'FR batch v4 — Deepfake.'),
  ('tech'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel message colle avec « deepfake » ?',
   '["Cette vidéo du maire a l’air d’un deepfake, vérifie la source.","J’ai activé deepfake.","Deepfake est une banque.","Deepfake = mode avion."]'::jsonb, 0,
   'On parle d’un contenu trompeur, pas d’un réglage.',
   'deepfake', 'FR batch v4 — Deepfake.'),

  -- PROMPT
  ('tech'::public.question_theme, 'facile'::public.question_difficulty,
   '« J’ai écrit un prompt pour ChatGPT. » Un prompt, c’est…',
   '["La consigne / la question envoyée à l’IA","Un chargeur","Un forfait","Un emoji"]'::jsonb, 0,
   'Prompt = texte d’instruction donné à un modèle d’IA.',
   'prompt', 'FR batch v4 — Prompt.'),
  ('tech'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel usage sonne juste avec « prompt » ?',
   '["Ton prompt est trop vague, précise le ton et la longueur.","J’ai mis prompt en 5G.","Prompt est une banque.","Prompt = antivirus."]'::jsonb, 0,
   'C’est la demande faite à l’outil, pas un réseau.',
   'prompt', 'FR batch v4 — Prompt.'),

  -- LORE
  ('gaming'::public.question_theme, 'facile'::public.question_difficulty,
   '« Je connais tout le lore du jeu. » Le lore, c’est…',
   '["L’histoire / le background de l’univers","Le ping","Le skin gratuit","Le mode avion"]'::jsonb, 0,
   'Lore = l’histoire, le mythe, le background d’un jeu (ou d’une saga).',
   'lore', 'FR batch v4 — Lore.'),
  ('gaming'::public.question_theme, 'moyen'::public.question_difficulty,
   'Quel message colle avec « lore » ?',
   '["Ce DLC explique enfin le lore du boss final.","J’ai activé le lore.","Lore est un forfait.","Lore = Wi-Fi public."]'::jsonb, 0,
   'On parle du récit du jeu, pas d’un réglage.',
   'lore', 'FR batch v4 — Lore.')
) AS v(theme, difficulty, question, choices, correct_index, explanation, concept_key, editor_notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions q WHERE q.question = v.question
);
