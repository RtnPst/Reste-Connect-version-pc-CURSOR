-- Best number of correct answers in a single finished Marathon session (per user).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marathon_best_score integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.marathon_best_score IS
  'Highest marathon session score (correct answers in one ended session).';
