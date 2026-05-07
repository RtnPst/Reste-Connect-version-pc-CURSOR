ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS max_unlocked_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS level_best_scores jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_max_unlocked_level_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_max_unlocked_level_check
      CHECK (max_unlocked_level >= 1);
  END IF;
END
$$;
