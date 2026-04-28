ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar text NOT NULL DEFAULT '🙂',
  ADD COLUMN IF NOT EXISTS sfx_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS music_enabled boolean NOT NULL DEFAULT false;