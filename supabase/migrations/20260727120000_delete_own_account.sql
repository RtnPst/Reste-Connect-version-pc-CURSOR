-- Self-serve account deletion (authenticated caller only).
-- Cascades: profiles, quiz_attempts, user_badges, user_roles, user_concepts_seen.
-- analytics_events.user_id → SET NULL.
-- duels have no FK to auth.users → cleaned here.

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  DELETE FROM public.duels
  WHERE creator_id = uid OR opponent_id = uid;

  DELETE FROM auth.users
  WHERE id = uid;
END;
$$;

COMMENT ON FUNCTION public.delete_own_account() IS
  'Deletes the calling user and related app data. Requires authenticated JWT.';

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
