-- Split culture internet: add new question_theme enum values.
-- culture_pop remains available as legacy.
-- Next migration applies row updates (depends on these labels existing).

ALTER TYPE public.question_theme ADD VALUE IF NOT EXISTS 'gaming';
ALTER TYPE public.question_theme ADD VALUE IF NOT EXISTS 'trends_pop_culture';
ALTER TYPE public.question_theme ADD VALUE IF NOT EXISTS 'relations_lifestyle';
