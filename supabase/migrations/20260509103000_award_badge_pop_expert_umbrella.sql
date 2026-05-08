-- Align award_badge(pop_expert) with process_badges umbrella logic.

CREATE OR REPLACE FUNCTION public.award_badge(_badge_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _badge_id uuid;
  _eligible boolean := false;
  _attempt_count integer;
  _streak integer;
  _theme_key text;
  _theme_attempts integer;
  _has_perfect boolean;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO _badge_id FROM public.badges WHERE code = _badge_code;
  IF _badge_id IS NULL THEN
    RETURN false;
  END IF;

  -- Already earned? no-op success
  IF EXISTS (
    SELECT 1 FROM public.user_badges WHERE user_id = _user_id AND badge_id = _badge_id
  ) THEN
    RETURN true;
  END IF;

  -- Validate eligibility based on badge code
  IF _badge_code = 'first_quiz' THEN
    SELECT COUNT(*) INTO _attempt_count FROM public.quiz_attempts WHERE user_id = _user_id;
    _eligible := _attempt_count >= 1;

  ELSIF _badge_code = 'perfect_score' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.quiz_attempts
      WHERE user_id = _user_id AND score = 10
    ) INTO _has_perfect;
    _eligible := _has_perfect;

  ELSIF _badge_code = 'pop_expert' THEN
    SELECT COUNT(*) INTO _theme_attempts
    FROM public.quiz_attempts
    WHERE user_id = _user_id
      AND theme IN (
        'gaming'::public.question_theme,
        'trends_pop_culture'::public.question_theme,
        'relations_lifestyle'::public.question_theme,
        'culture_pop'::public.question_theme
      )
      AND score >= 7;
    _eligible := _theme_attempts >= 5;

  ELSIF _badge_code IN ('vocab_expert', 'social_expert', 'tech_expert') THEN
    _theme_key := CASE _badge_code
      WHEN 'vocab_expert' THEN 'vocabulaire'
      WHEN 'social_expert' THEN 'reseaux_sociaux'
      WHEN 'tech_expert' THEN 'tech'
    END;
    SELECT COUNT(*) INTO _theme_attempts
    FROM public.quiz_attempts
    WHERE user_id = _user_id
      AND theme::text = _theme_key
      AND score >= 7;
    _eligible := _theme_attempts >= 5;

  ELSIF _badge_code = 'streak_3' THEN
    SELECT current_streak INTO _streak FROM public.profiles WHERE id = _user_id;
    _eligible := COALESCE(_streak, 0) >= 3;

  ELSIF _badge_code = 'streak_7' THEN
    SELECT current_streak INTO _streak FROM public.profiles WHERE id = _user_id;
    _eligible := COALESCE(_streak, 0) >= 7;

  ELSE
    _eligible := false;
  END IF;

  IF NOT _eligible THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_badges (user_id, badge_id)
  VALUES (_user_id, _badge_id)
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.award_badge(text) FROM public;
GRANT EXECUTE ON FUNCTION public.award_badge(text) TO authenticated;
