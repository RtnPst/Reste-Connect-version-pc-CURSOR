-- Seed minimal phase-1 badges (idempotent)
INSERT INTO public.badges (code, name, description, icon)
VALUES
  ('first_quiz', 'Premier quiz', 'Terminer un premier quiz.', '🎯'),
  ('perfect_score', 'Sans faute', 'Obtenir un score parfait sur un quiz.', '💯'),
  ('vocab_expert', 'Expert vocabulaire', 'Réussir 5 quiz vocabulaire avec au moins 7/10.', '🗣️'),
  ('social_expert', 'Expert réseaux sociaux', 'Réussir 5 quiz réseaux sociaux avec au moins 7/10.', '📱'),
  ('pop_expert', 'Expert culture pop', 'Réussir 5 quiz culture pop avec au moins 7/10.', '🎬'),
  ('tech_expert', 'Expert tech', 'Réussir 5 quiz tech avec au moins 7/10.', '💻'),
  ('streak_3', 'Série 3 jours', 'Maintenir une série de 3 jours consécutifs.', '🔥'),
  ('streak_7', 'Série 7 jours', 'Maintenir une série de 7 jours consécutifs.', '🚀')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;
