-- Minimal fix: make first_quiz unlock for existing and future users
-- 1) Update trigger function logic: first_quiz should be eligible once user has >= 1 attempt
-- 2) Backfill first_quiz for users who already have attempts

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

  -- theme expert (5 attempts >= 7 in same theme)
  IF NEW.theme IS NOT NULL THEN
    SELECT COUNT(*) INTO _theme_attempts
    FROM public.quiz_attempts
    WHERE user_id = NEW.user_id
      AND theme = NEW.theme
      AND score >= 7;

    IF _theme_attempts >= 5 THEN
      _theme_code := CASE NEW.theme::text
        WHEN 'vocabulaire' THEN 'vocab_expert'
        WHEN 'reseaux_sociaux' THEN 'social_expert'
        WHEN 'culture_pop' THEN 'pop_expert'
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

-- One-shot backfill for users who already have at least one attempt
INSERT INTO public.user_badges (user_id, badge_id)
SELECT qa.user_id, b.id
FROM (
  SELECT DISTINCT user_id
  FROM public.quiz_attempts
) qa
JOIN public.badges b ON b.code = 'first_quiz'
ON CONFLICT DO NOTHING;
