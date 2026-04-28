
-- ============================================================
-- 1. FIX DUELS UPDATE POLICY (split overly permissive policy)
-- ============================================================
DROP POLICY IF EXISTS "Participants can update duels" ON public.duels;

-- Creator can update their own duel rows (cannot change creator_id)
CREATE POLICY "Creator can update own duel"
  ON public.duels
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Any other authenticated user can claim an open duel by setting themselves as opponent
CREATE POLICY "Opponent can join open duel"
  ON public.duels
  FOR UPDATE
  TO authenticated
  USING (opponent_id IS NULL AND auth.uid() <> creator_id)
  WITH CHECK (auth.uid() = opponent_id);

-- Once joined, opponent can update their own score/answers
CREATE POLICY "Opponent can update own score"
  ON public.duels
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = opponent_id)
  WITH CHECK (auth.uid() = opponent_id);

-- ============================================================
-- 2. SERVER-SIDE BADGE AWARDING
-- ============================================================
-- Remove client-side INSERT policy: badges must be awarded via the RPC
DROP POLICY IF EXISTS "Users can insert own badges" ON public.user_badges;

-- SECURITY DEFINER function that validates eligibility before inserting
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

  ELSIF _badge_code IN ('vocab_expert', 'social_expert', 'pop_expert', 'tech_expert') THEN
    _theme_key := CASE _badge_code
      WHEN 'vocab_expert' THEN 'vocabulaire'
      WHEN 'social_expert' THEN 'reseaux_sociaux'
      WHEN 'pop_expert' THEN 'culture_pop'
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
