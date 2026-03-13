-- Seed data for content service

-- Movie: Inception
INSERT INTO "content_items" (
  "content_id", "content_type", "title", "slug", "description", 
  "release_date", "age_rating", "duration_minutes", "stream_asset_id", 
  "created_at", "updated_at"
)
VALUES (
  'beaea954-0c92-49c8-9d01-9b972e35f8ab',
  'movie',
  'Inception',
  'inception-2010',
  'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
  '2010-07-16',
  'PG-13',
  148,
  'asset_inception_stream_001',
  NOW(),
  NOW()
) ON CONFLICT ("slug") DO NOTHING;

-- Series: Breaking Bad
INSERT INTO "content_items" (
  "content_id", "content_type", "title", "slug", "description", 
  "release_date", "age_rating", "status", 
  "created_at", "updated_at"
)
VALUES (
  '4ce5809a-6668-4f24-af79-0db805742927',
  'series',
  'Breaking Bad',
  'breaking-bad-2008',
  'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family''s future.',
  '2008-01-20',
  'TV-MA',
  'Ended',
  NOW(),
  NOW()
) ON CONFLICT ("slug") DO NOTHING;

-- Season 1 of Breaking Bad
INSERT INTO "seasons" (
  "season_id", "series_id", "season_number", "title", "description", "release_date"
)
VALUES (
  'af72367d-fc66-427c-89c1-aeaeb9fc3067',
  '4ce5809a-6668-4f24-af79-0db805742927',
  1,
  'Season 1',
  'The first season of Breaking Bad.',
  '2008-01-20'
) ON CONFLICT ("series_id", "season_number") DO NOTHING;

-- Episode 1: Pilot
INSERT INTO "episodes" (
  "episode_id", "season_id", "episode_number", "title", "description", 
  "duration_minutes", "stream_asset_id"
)
VALUES (
  '691bb3a2-0be7-4819-abd7-a047eed03326',
  'af72367d-fc66-427c-89c1-aeaeb9fc3067',
  1,
  'Pilot',
  'Diagnosed with terminal lung cancer, chemistry teacher Walter White teams up with former student Jesse Pinkman to cook and sell crystal meth.',
  58,
  'asset_bb_s01e01_stream'
) ON CONFLICT ("season_id", "episode_number") DO NOTHING;

-- Episode 2: Cat's in the Bag...
INSERT INTO "episodes" (
  "episode_id", "season_id", "episode_number", "title", "description", 
  "duration_minutes", "stream_asset_id"
)
VALUES (
  '52d9571c-e9a2-481c-bc18-492c2f057de6',
  'af72367d-fc66-427c-89c1-aeaeb9fc3067',
  2,
  'Cat''s in the Bag...',
  'After their first drug deal goes incredibly wrong, Walt and Jesse are forced to deal with a corpse and a prisoner.',
  48,
  'asset_bb_s01e02_stream'
) ON CONFLICT ("season_id", "episode_number") DO NOTHING;
