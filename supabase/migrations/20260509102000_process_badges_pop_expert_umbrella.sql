-- pop_expert: 5+ quiz attempts with score >= 7 across gaming, trends_pop_culture,
-- relations_lifestyle, or legacy culture_pop (not necessarily the same sub-theme).
-- Other theme experts unchanged (same-theme count).

CREATE OR REPLACE FUNCTION public.process_badges_for_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _streak integer;
  _theme_code text;
  _theme_attempts integer;
  _badge_id uuid;
BEGIN
  -- first_quiz
  IF (
    SELECT COUNT(*) FROM public.quiz_attempts WHERE user_id = NEW.user_id
  ) >= 1 THEN
    SELECT id INTO _badge_id FROM public.badges WHERE code = 'first_quiz';
    IF _badge_id IS NOT NULL THEN
      INSERT INTO public.user_badges(user_id, badge_id) VALUES (NEW.user_id, _badge_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- perfect_score
  IF NEW.score = NEW.total_questions AND NEW.total_questions >= 1 THEN
    SELECT id INTO _badge_id FROM public.badges WHERE code = 'perfect_score';
    IF _badge_id IS NOT NULL THEN
      INSERT INTO public.user_badges(user_id, badge_id) VALUES (NEW.user_id, _badge_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- pop_expert (umbrella themes + legacy culture_pop)
  IF NEW.theme IS NOT NULL
     AND NEW.theme::text IN ('gaming', 'trends_pop_culture', 'relations_lifestyle', 'culture_pop') THEN
    SELECT COUNT(*) INTO _theme_attempts
    FROM public.quiz_attempts
    WHERE user_id = NEW.user_id
      AND theme IN (
        'gaming'::public.question_theme,
        'trends_pop_culture'::public.question_theme,
        'relations_lifestyle'::public.question_theme,
        'culture_pop'::public.question_theme
      )
      AND score >= 7;

    IF _theme_attempts >= 5 THEN
      SELECT id INTO _badge_id FROM public.badges WHERE code = 'pop_expert';
      IF _badge_id IS NOT NULL THEN
        INSERT INTO public.user_badges(user_id, badge_id) VALUES (NEW.user_id, _badge_id) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  -- theme expert (5 attempts >= 7 in same theme): vocab, social, tech only
  IF NEW.theme IS NOT NULL
     AND NEW.theme::text IN ('vocabulaire', 'reseaux_sociaux', 'tech') THEN
    SELECT COUNT(*) INTO _theme_attempts
    FROM public.quiz_attempts
    WHERE user_id = NEW.user_id
      AND theme = NEW.theme
      AND score >= 7;

    IF _theme_attempts >= 5 THEN
      _theme_code := CASE NEW.theme::text
        WHEN 'vocabulaire' THEN 'vocab_expert'
        WHEN 'reseaux_sociaux' THEN 'social_expert'
        WHEN 'tech' THEN 'tech_expert'
        ELSE NULL
      END;

      IF _theme_code IS NOT NULL THEN
        SELECT id INTO _badge_id FROM public.badges WHERE code = _theme_code;
        IF _badge_id IS NOT NULL THEN
          INSERT INTO public.user_badges(user_id, badge_id) VALUES (NEW.user_id, _badge_id) ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;
  END IF;

  -- streak badges
  SELECT current_streak INTO _streak FROM public.profiles WHERE id = NEW.user_id;
  IF COALESCE(_streak, 0) >= 3 THEN
    SELECT id INTO _badge_id FROM public.badges WHERE code = 'streak_3';
    IF _badge_id IS NOT NULL THEN
      INSERT INTO public.user_badges(user_id, badge_id) VALUES (NEW.user_id, _badge_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  IF COALESCE(_streak, 0) >= 7 THEN
    SELECT id INTO _badge_id FROM public.badges WHERE code = 'streak_7';
    IF _badge_id IS NOT NULL THEN
      INSERT INTO public.user_badges(user_id, badge_id) VALUES (NEW.user_id, _badge_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
