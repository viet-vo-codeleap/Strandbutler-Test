-- Seed assets for content service

-- Inception Assets
-- Poster
INSERT INTO "assets" ("asset_id", "content_id", "asset_type", "asset_url", "language")
VALUES (
  '55d64fcf-6af2-4d3a-b87a-348fb3cd43af',
  'beaea954-0c92-49c8-9d01-9b972e35f8ab', -- Inception ID
  'poster',
  'https://image.tmdb.org/t/p/original/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
  'en-US'
);

-- Backdrop
INSERT INTO "assets" ("asset_id", "content_id", "asset_type", "asset_url", "language")
VALUES (
  'b84ed2fd-67ff-4d58-b857-8cf8a629bdae',
  'beaea954-0c92-49c8-9d01-9b972e35f8ab', -- Inception ID
  'backdrop',
  'https://image.tmdb.org/t/p/original/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
  'en-US'
);

-- Breaking Bad Assets
-- Poster
INSERT INTO "assets" ("asset_id", "content_id", "asset_type", "asset_url", "language")
VALUES (
  'b702c1fe-bdc5-4216-91d3-382d72b525b7',
  '4ce5809a-6668-4f24-af79-0db805742927', -- Breaking Bad ID
  'poster',
  'https://image.tmdb.org/t/p/original/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
  'en-US'
);

-- Backdrop
INSERT INTO "assets" ("asset_id", "content_id", "asset_type", "asset_url", "language")
VALUES (
  'a3a5cb61-6ce6-4a6b-8fc3-0809c42d36c3',
  '4ce5809a-6668-4f24-af79-0db805742927', -- Breaking Bad ID
  'backdrop',
  'https://image.tmdb.org/t/p/original/tsRy63Mu5CU8etx154IsgoPDnJ9.jpg',
  'en-US'
);
