UPDATE content_sections
SET
  settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{games}',
    (
      SELECT jsonb_agg(
        CASE
          WHEN game->>'id' = 'asseto-corsa' THEN game || '{"posterImage": "/assets/images/games/assetto-corsa.webp"}'::jsonb
          WHEN game->>'id' = 'nfs-server' THEN game || '{"posterImage": "/assets/images/games/need-for-speed-unbound.webp"}'::jsonb
          ELSE game
        END
        ORDER BY ordinal
      )
      FROM jsonb_array_elements(settings->'games') WITH ORDINALITY AS game_entries(game, ordinal)
    )
  ),
  updated_at = NOW()
WHERE slug = 'grid'
  AND jsonb_typeof(settings->'games') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(settings->'games') AS game
    WHERE game->>'id' IN ('asseto-corsa', 'nfs-server')
      AND COALESCE(game->>'posterImage', '') = ''
  );
