-- Seed more content: Harry Potter & Welcome to Derry

-- Movie: Harry Potter and the Sorcerer's Stone
INSERT INTO "content_items" (
  "content_id", "content_type", "title", "slug", "description", 
  "release_date", "age_rating", "duration_minutes", "stream_asset_id", 
  "created_at", "updated_at"
)
VALUES (
  '99ee3eb7-dbab-4c99-b08c-8c7749504209',
  'movie',
  'Harry Potter and the Sorcerer''s Stone',
  'harry-potter-and-the-sorcerers-stone-2001',
  'Harry Potter has lived under the stairs at his aunt and uncle''s house his whole life. But on his 11th birthday, he learns he''s a powerful wizard -- with a place waiting for him at the Hogwarts School of Witchcraft and Wizardry.',
  '2001-11-16',
  'PG',
  152,
  'asset_hp1_stream',
  NOW(),
  NOW()
) ON CONFLICT ("slug") DO NOTHING;

-- Assets for Harry Potter
INSERT INTO "assets" ("asset_id", "content_id", "asset_type", "asset_url", "language")
VALUES 
(
  'efe9a3ef-d76e-4d43-a3df-b74bdaf46a39',
  '99ee3eb7-dbab-4c99-b08c-8c7749504209',
  'poster',
  'https://image.tmdb.org/t/p/original/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg',
  'en-US'
),
(
  'd339dbbd-5f77-42b5-b7e5-f2293936ce2b',
  '99ee3eb7-dbab-4c99-b08c-8c7749504209',
  'backdrop',
  'https://image.tmdb.org/t/p/original/hziiv14OpD73u9gAak4XDDfBKa2.jpg',
  'en-US'
);


-- Series: Welcome to Derry
INSERT INTO "content_items" (
  "content_id", "content_type", "title", "slug", "description", 
  "release_date", "age_rating", "status", 
  "created_at", "updated_at"
)
VALUES (
  'b3f045a6-c329-4888-9d9a-3d89a9870948',
  'series',
  'Welcome to Derry',
  'welcome-to-derry-2025',
  'Set in the world of Stephen King''s IT universe, Welcome to Derry is based on King''s Welcome to Derry novel and expands the vision established by filmmaker Andy Muschietti in the feature films IT and IT Chapter Two.',
  '2025-01-01', -- Estimated
  'TV-MA',
  'Upcoming',
  NOW(),
  NOW()
) ON CONFLICT ("slug") DO NOTHING;

-- Season 1 of Welcome to Derry
INSERT INTO "seasons" (
  "season_id", "series_id", "season_number", "title", "description", "release_date"
)
VALUES (
  'cfbc3976-3105-4940-8cd0-26d6ed1aa419',
  'b3f045a6-c329-4888-9d9a-3d89a9870948',
  1,
  'Season 1',
  'The first season of Welcome to Derry.',
  '2025-01-01'
) ON CONFLICT ("series_id", "season_number") DO NOTHING;

-- Episode 1
INSERT INTO "episodes" (
  "episode_id", "season_id", "episode_number", "title", "description", 
  "duration_minutes", "stream_asset_id"
)
VALUES (
  '8859efb2-5e7c-408e-8d1e-0b9867374376',
  'cfbc3976-3105-4940-8cd0-26d6ed1aa419',
  1,
  'Chapter One',
  'The beginning of the end.',
  60,
  'asset_derry_s01e01_stream'
) ON CONFLICT ("season_id", "episode_number") DO NOTHING;

-- Assets for Welcome to Derry
INSERT INTO "assets" ("asset_id", "content_id", "asset_type", "asset_url", "language")
VALUES 
(
  'fb101132-e97c-49cf-9039-e3d87bab8137',
  'b3f045a6-c329-4888-9d9a-3d89a9870948',
  'poster',
  'https://image.tmdb.org/t/p/original/4TwtNq31j8yI9q5Yd5y9y9y9y9y.jpg', -- Placeholder/Generic
  'en-US'
),
(
  '2ea4ac66-84aa-416e-b1c5-9a0f1c235730',
  'b3f045a6-c329-4888-9d9a-3d89a9870948',
  'backdrop',
  'https://image.tmdb.org/t/p/original/tcheoA2nPATCm2vvXw2hZs4fLPp.jpg', -- IT backdrop
  'en-US'
);
