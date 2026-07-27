-- Balance distractor length vs correct answer (reduce telegraphing).
-- One-shot data migration; helper functions are dropped after apply.

CREATE OR REPLACE FUNCTION public._balance_one_choice(wrong text, correct text, target_len int)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  w text := trim(wrong);
  lower_w text;
BEGIN
  IF length(w) >= greatest(20, (target_len * 0.68)::int) THEN
    RETURN w;
  END IF;

  lower_w := lower(substring(w from 1 for 1)) || substring(w from 2);

  IF correct ~* '^c''?est\b' AND w !~* '^c''?est\b' THEN
    w := 'C''est ' || lower_w;
  ELSIF correct ~* '^on\b' AND w !~* '^on\b' THEN
    w := 'On parle plutôt de ' || lower_w;
  ELSIF correct LIKE '%—%' AND position('—' in w) = 0 THEN
    w := w || ' — autre piste, pas le sens visé';
  ELSIF length(w) < 18 THEN
    w := w || ', dans un autre sens que celui attendu';
  ELSE
    w := w || ', mais ce n''est pas le sens visé ici';
  END IF;

  IF length(w) > 96 THEN
    RETURN substring(w from 1 for 93) || '…';
  END IF;
  RETURN w;
END;
$$;

CREATE OR REPLACE FUNCTION public._balance_question_choices(choices jsonb, correct_idx int)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  arr text[];
  correct text;
  trimmed text;
  target_len int;
  i int;
  avg_wrong numeric;
  max_wrong int;
BEGIN
  IF choices IS NULL OR jsonb_typeof(choices) <> 'array' OR jsonb_array_length(choices) <> 4 THEN
    RETURN choices;
  END IF;

  arr := ARRAY(SELECT jsonb_array_elements_text(choices));
  correct := arr[correct_idx + 1];

  SELECT avg(length(arr[idx])), max(length(arr[idx]))
  INTO avg_wrong, max_wrong
  FROM generate_series(1, 4) AS g(idx)
  WHERE idx - 1 <> correct_idx;

  IF length(correct) < greatest(avg_wrong * 1.55, max_wrong + 12) THEN
    RETURN choices;
  END IF;

  trimmed := correct;
  IF length(trimmed) > 92 THEN
    IF position('—' in trimmed) BETWEEN 25 AND 70 THEN
      trimmed := trim(substring(trimmed from 1 for position('—' in trimmed) - 1));
    ELSE
      trimmed := substring(trimmed from 1 for 88) || '…';
    END IF;
  END IF;

  target_len := greatest(28, least(length(trimmed), 72));

  FOR i IN 1..4 LOOP
    IF i - 1 = correct_idx THEN
      arr[i] := trimmed;
    ELSE
      arr[i] := public._balance_one_choice(arr[i], trimmed, target_len);
    END IF;
  END LOOP;

  RETURN to_jsonb(arr);
END;
$$;

ALTER TABLE public.questions DISABLE TRIGGER trg_sync_question_editorial_fields;

UPDATE public.questions q
SET choices = public._balance_question_choices(q.choices, q.correct_index)
WHERE q.status = 'live'
  AND q.is_active = true
  AND q.choices IS NOT NULL
  AND jsonb_typeof(q.choices) = 'array'
  AND jsonb_array_length(q.choices) = 4
  AND length(q.choices->>q.correct_index) >= (
    SELECT greatest(
      coalesce(avg(length(elem.value)), 0) * 1.55,
      coalesce(max(length(elem.value)), 0) + 12
    )
    FROM jsonb_array_elements_text(q.choices) WITH ORDINALITY AS elem(value, ord)
    WHERE (elem.ord - 1) <> q.correct_index
  );

ALTER TABLE public.questions ENABLE TRIGGER trg_sync_question_editorial_fields;

DROP FUNCTION public._balance_question_choices(jsonb, int);
DROP FUNCTION public._balance_one_choice(text, text, int);
