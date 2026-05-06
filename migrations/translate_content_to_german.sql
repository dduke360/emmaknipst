-- Übersetzt bestehende Standardinhalte in Supabase von Englisch nach Deutsch.
-- Fokus: seeded/default Inhalte in `settings`, `photos` und strukturierte `case_studies`.

BEGIN;

UPDATE settings
SET value = 'Ich bin eine junge Fotografin aus Berlin. Ich spezialisiere mich auf Porträt-, Mode- und Lifestyle-Fotografie. In meiner Arbeit geht es darum, authentische Momente und rohe Emotionen festzuhalten.'
WHERE key = 'about'
  AND value = 'I''m a young photographer based in Berlin, Germany. I specialize in portrait, fashion, and lifestyle photography. My work is about capturing authentic moments and raw emotions.';

UPDATE settings
SET value = jsonb_pretty(
  (
    SELECT jsonb_agg(
      jsonb_set(
        category,
        '{name}',
        to_jsonb(
          CASE category->>'name'
            WHEN 'Portraits' THEN 'Porträts'
            WHEN 'Fashion' THEN 'Mode'
            WHEN 'Nature' THEN 'Natur'
            ELSE category->>'name'
          END
        )
      )
    )
    FROM jsonb_array_elements(value::jsonb) AS category
  )
)::text
WHERE key = 'categories'
  AND value IS NOT NULL
  AND value <> '';

UPDATE photos SET title = 'Goldene Stunde' WHERE title = 'Golden Hour';
UPDATE photos SET title = 'Streetstyle' WHERE title = 'Street Style';
UPDATE photos SET title = 'Morgennebel' WHERE title = 'Morning Mist';
UPDATE photos SET title = 'Natürliches Licht' WHERE title = 'Natural Light';
UPDATE photos SET title = 'Studio-Porträt' WHERE title = 'Studio Portrait';
UPDATE photos SET title = 'Ungezwungener Moment' WHERE title = 'Candid Moment';
UPDATE photos SET title = 'Waldpfad' WHERE title = 'Forest Path';

UPDATE settings
SET value = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', COALESCE(study->>'id', 'case-study-' || ordinality),
      'slug', COALESCE(study->>'slug', regexp_replace(lower(COALESCE(study->>'title', 'bildserie-' || ordinality)), '[^a-z0-9]+', '-', 'g')),
      'title',
        CASE
          WHEN study->>'title' ~ 'Case Study$' THEN regexp_replace(study->>'title', 'Case Study$', 'Bildserie')
          WHEN study->>'title' IS NULL OR study->>'title' = '' THEN 'Bildserie ' || ordinality
          ELSE study->>'title'
        END,
      'category',
        CASE
          WHEN study->>'category' = 'Portraits' THEN 'Porträts'
          WHEN study->>'category' = 'Fashion' THEN 'Mode'
          WHEN study->>'category' = 'Nature' THEN 'Natur'
          WHEN study->>'category' = 'Case Study' THEN 'Bildserie'
          ELSE COALESCE(study->>'category', '')
        END,
      'intro',
        replace(
          replace(
            replace(
              replace(
                replace(COALESCE(study->>'intro', ''), 'images shaped as a cohesive', 'Bilder als zusammenhängende'),
                'series with a clear visual rhythm and stronger narrative sequencing.', 'Serie mit klarem visuellem Rhythmus und stärkerer erzählerischer Struktur.'
              ),
              'Portraits', 'Porträts'
            ),
            'Fashion', 'Mode'
          ),
          'Nature', 'Natur'
        ),
      'story', COALESCE(study->>'story', ''),
      'metrics',
        COALESCE(
          (
            SELECT jsonb_agg(
              CASE
                WHEN metric = 'Current work' THEN to_jsonb('Aktuelle Arbeiten'::text)
                WHEN metric = 'Digital and mixed light' THEN to_jsonb('Digital und Mischlicht'::text)
                WHEN metric LIKE '%selected frames' THEN to_jsonb(replace(metric, 'selected frames', 'ausgewählte Bilder')::text)
                ELSE to_jsonb(metric::text)
              END
            )
            FROM jsonb_array_elements_text(COALESCE(study->'metrics', '[]'::jsonb)) AS metric
          ),
          '[]'::jsonb
        ),
      'photoIds', COALESCE(study->'photoIds', '[]'::jsonb),
      'featuredPhotoId', COALESCE(study->'featuredPhotoId', '""'::jsonb),
      'status', COALESCE(study->>'status', 'published'),
      'seoTitle',
        replace(COALESCE(study->>'seoTitle', ''), 'Photography', 'Fotografie'),
      'seoDescription',
        replace(
          replace(COALESCE(study->>'seoDescription', ''), 'Portfolio of Emma Knipst - Capturing moments through the lens', 'Portfolio von Emma Knipst - Momente durch die Linse festgehalten'),
          'Photography', 'Fotografie'
        )
    )
  )::text
  FROM jsonb_array_elements(value::jsonb) WITH ORDINALITY AS entry(study, ordinality)
)
WHERE key = 'case_studies'
  AND value IS NOT NULL
  AND value <> '';

COMMIT;
