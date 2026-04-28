-- Security hardening: duel integrity, attempt validation, badge awarding

-- 1) Avoid exposing SECURITY DEFINER functions to PUBLIC
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.award_badge(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_badge(text) FROM authenticated;

-- 2) Validate quiz attempts server-side to prevent forged scores/answers
CREATE OR REPLACE FUNCTION public.validate_quiz_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _entry jsonb;
  _qid uuid;
  _chosen integer;
  _correct integer;
  _computed_score integer := 0;
  _answers_len integer := COALESCE(jsonb_array_length(NEW.answers), 0);
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> NEW.user_id THEN
    RAISE EXCEPTION 'Invalid user_id for quiz attempt';
  END IF;

  IF NEW.total_questions <= 0 THEN
    RAISE EXCEPTION 'total_questions must be > 0';
  END IF;

  IF NEW.score < 0 OR NEW.score > NEW.total_questions THEN
    RAISE EXCEPTION 'score out of range';
  END IF;

  IF array_length(NEW.question_ids, 1) IS DISTINCT FROM NEW.total_questions THEN
    RAISE EXCEPTION 'question_ids length mismatch';
  END IF;

  IF _answers_len <> NEW.total_questions THEN
    RAISE EXCEPTION 'answers length mismatch';
  END IF;

  FOR _entry IN SELECT * FROM jsonb_array_elements(NEW.answers)
  LOOP
    _qid := NULLIF(_entry->>'questionId', '')::uuid;
    _chosen := (_entry->>'chosen')::integer;

    IF _qid IS NULL OR _chosen IS NULL THEN
      RAISE EXCEPTION 'Invalid answer entry format';
    END IF;

    IF NOT (_qid = ANY(NEW.question_ids)) THEN
      RAISE EXCEPTION 'Answer references question outside attempt';
    END IF;

    SELECT q.correct_index INTO _correct
    FROM public.questions q
    WHERE q.id = _qid;

    IF _correct IS NULL THEN
      RAISE EXCEPTION 'Question not found';
    END IF;

    IF _chosen = _correct THEN
      _computed_score := _computed_score + 1;
    END IF;
  END LOOP;

  IF _computed_score <> NEW.score THEN
    RAISE EXCEPTION 'score does not match computed score';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_quiz_attempt_before_insert ON public.quiz_attempts;
CREATE TRIGGER validate_quiz_attempt_before_insert
BEFORE INSERT ON public.quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION public.validate_quiz_attempt();

-- 3) Award badges automatically in DB (no client-executable SECURITY DEFINER needed)
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
  ) = 1 THEN
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

DROP TRIGGER IF EXISTS process_badges_after_attempt ON public.quiz_attempts;
CREATE TRIGGER process_badges_after_attempt
AFTER INSERT ON public.quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION public.process_badges_for_attempt();

-- 4) Enforce duel column ownership integrity
CREATE OR REPLACE FUNCTION public.enforce_duel_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Creator can only update creator fields; cannot overwrite opponent side.
  IF _uid = OLD.creator_id THEN
    IF NEW.creator_id <> OLD.creator_id
      OR NEW.opponent_id IS DISTINCT FROM OLD.opponent_id
      OR NEW.opponent_name IS DISTINCT FROM OLD.opponent_name
      OR NEW.opponent_score IS DISTINCT FROM OLD.opponent_score
      OR NEW.opponent_answers IS DISTINCT FROM OLD.opponent_answers
      OR NEW.code <> OLD.code
      OR NEW.question_ids <> OLD.question_ids
      OR NEW.theme <> OLD.theme THEN
      RAISE EXCEPTION 'Creator cannot modify opponent or immutable duel fields';
    END IF;
    RETURN NEW;
  END IF;

  -- Join flow: non-creator can claim open duel only by setting their opponent identity.
  IF OLD.opponent_id IS NULL AND _uid <> OLD.creator_id THEN
    IF NEW.creator_id <> OLD.creator_id
      OR NEW.creator_name <> OLD.creator_name
      OR NEW.creator_score IS DISTINCT FROM OLD.creator_score
      OR NEW.creator_answers IS DISTINCT FROM OLD.creator_answers
      OR NEW.opponent_id <> _uid
      OR NEW.code <> OLD.code
      OR NEW.question_ids <> OLD.question_ids
      OR NEW.theme <> OLD.theme THEN
      RAISE EXCEPTION 'Invalid duel join update';
    END IF;
    RETURN NEW;
  END IF;

  -- Opponent can only update opponent fields once joined.
  IF _uid = OLD.opponent_id THEN
    IF NEW.creator_id <> OLD.creator_id
      OR NEW.creator_name <> OLD.creator_name
      OR NEW.creator_score IS DISTINCT FROM OLD.creator_score
      OR NEW.creator_answers IS DISTINCT FROM OLD.creator_answers
      OR NEW.opponent_id <> OLD.opponent_id
      OR NEW.code <> OLD.code
      OR NEW.question_ids <> OLD.question_ids
      OR NEW.theme <> OLD.theme THEN
      RAISE EXCEPTION 'Opponent cannot modify creator or immutable duel fields';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not allowed to update this duel';
END;
$$;

DROP TRIGGER IF EXISTS enforce_duel_update_before_update ON public.duels;
CREATE TRIGGER enforce_duel_update_before_update
BEFORE UPDATE ON public.duels
FOR EACH ROW
EXECUTE FUNCTION public.enforce_duel_update();
