import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial Schema Migration
 * Creates all tables for the Content Service database
 *
 * This migration sets up:
 * - Content items (movies and TV shows) with table inheritance
 * - TV show hierarchy (seasons and episodes)
 * - Metadata (persons, genres, assets)
 * - Join tables (content_credits, content_genres)
 * - User ratings
 *
 * Generated on: 2024-10-27
 */
export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create genres table (referenced by content_genres)
    await queryRunner.query(`
      CREATE TABLE "genres" (
        "genre_id" SERIAL NOT NULL,
        "name" character varying(100) NOT NULL,
        CONSTRAINT "UQ_genres_name" UNIQUE ("name"),
        CONSTRAINT "PK_genres" PRIMARY KEY ("genre_id")
      )
    `);

    // Create persons table (actors, directors, etc.)
    await queryRunner.query(`
      CREATE TABLE "persons" (
        "person_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "bio" text,
        "date_of_birth" date,
        CONSTRAINT "PK_persons" PRIMARY KEY ("person_id")
      )
    `);

    // Create content_items table (superclass for movies and TV shows)
    await queryRunner.query(`
      CREATE TABLE "content_items" (
        "content_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "content_type" character varying NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "release_date" date,
        "age_rating" character varying(10),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "duration_minutes" integer,
        "stream_asset_id" character varying(255),
        "status" character varying(20) DEFAULT 'Ongoing',
        CONSTRAINT "PK_content_items" PRIMARY KEY ("content_id")
      )
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "content_items"."age_rating" IS 'e.g., PG-13, R, PG'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "content_items"."duration_minutes" IS 'For movies only'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "content_items"."stream_asset_id" IS 'Identifier for streaming service'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "content_items"."status" IS 'For TV shows: e.g., Ongoing, Ended'
    `);

    // Create seasons table
    await queryRunner.query(`
      CREATE TABLE "seasons" (
        "season_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tv_show_id" uuid NOT NULL,
        "season_number" integer NOT NULL,
        "title" character varying(255),
        "description" text,
        "release_date" date,
        CONSTRAINT "PK_seasons" PRIMARY KEY ("season_id"),
        CONSTRAINT "UQ_seasons_tv_show_season" UNIQUE ("tv_show_id", "season_number")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_seasons_tv_show_season" ON "seasons" ("tv_show_id", "season_number")
    `);

    // Create episodes table
    await queryRunner.query(`
      CREATE TABLE "episodes" (
        "episode_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "season_id" uuid NOT NULL,
        "episode_number" integer NOT NULL,
        "title" character varying(255),
        "description" text,
        "duration_minutes" integer,
        "stream_asset_id" character varying(255),
        CONSTRAINT "PK_episodes" PRIMARY KEY ("episode_id"),
        CONSTRAINT "UQ_episodes_season_episode" UNIQUE ("season_id", "episode_number")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_episodes_season_episode" ON "episodes" ("season_id", "episode_number")
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "episodes"."stream_asset_id" IS 'Identifier for streaming service'
    `);

    // Create assets table (posters, trailers, backdrops)
    await queryRunner.query(`
      CREATE TABLE "assets" (
        "asset_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "content_id" uuid NOT NULL,
        "asset_type" character varying(50) NOT NULL,
        "asset_url" character varying(512) NOT NULL,
        "language" character varying(10) DEFAULT 'en-US',
        CONSTRAINT "PK_assets" PRIMARY KEY ("asset_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_assets_content_type" ON "assets" ("content_id", "asset_type")
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "assets"."asset_type" IS 'e.g., poster, backdrop, trailer'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "assets"."language" IS 'For localized assets'
    `);

    // Create content_credits table (join table for content and persons)
    await queryRunner.query(`
      CREATE TABLE "content_credits" (
        "content_id" uuid NOT NULL,
        "person_id" uuid NOT NULL,
        "role" character varying(50) NOT NULL,
        "character_name" character varying(255),
        "order" integer DEFAULT 0,
        CONSTRAINT "PK_content_credits" PRIMARY KEY ("content_id", "person_id", "role"),
        CONSTRAINT "UQ_content_credits" UNIQUE ("content_id", "person_id", "role")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_content_credits" ON "content_credits" ("content_id", "person_id", "role")
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "content_credits"."character_name" IS 'Only for actors'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "content_credits"."order" IS 'For sorting credits - lower numbers appear first'
    `);

    // Create content_genres table (join table for content and genres)
    await queryRunner.query(`
      CREATE TABLE "content_genres" (
        "content_id" uuid NOT NULL,
        "genre_id" integer NOT NULL,
        CONSTRAINT "PK_content_genres" PRIMARY KEY ("content_id", "genre_id")
      )
    `);

    // Create ratings table
    await queryRunner.query(`
      CREATE TABLE "ratings" (
        "rating_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "content_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "rating_value" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ratings" PRIMARY KEY ("rating_id"),
        CONSTRAINT "UQ_ratings_content_user" UNIQUE ("content_id", "user_id"),
        CONSTRAINT "CHK_rating_value" CHECK ("rating_value" >= 1 AND "rating_value" <= 5)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ratings_content_user" ON "ratings" ("content_id", "user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ratings_content" ON "ratings" ("content_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ratings_user" ON "ratings" ("user_id")
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "ratings"."user_id" IS 'External user UUID from Users Service'
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "seasons"
      ADD CONSTRAINT "FK_seasons_tv_show" FOREIGN KEY ("tv_show_id")
      REFERENCES "content_items"("content_id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "episodes"
      ADD CONSTRAINT "FK_episodes_season" FOREIGN KEY ("season_id")
      REFERENCES "seasons"("season_id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "assets"
      ADD CONSTRAINT "FK_assets_content" FOREIGN KEY ("content_id")
      REFERENCES "content_items"("content_id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "content_credits"
      ADD CONSTRAINT "FK_content_credits_content" FOREIGN KEY ("content_id")
      REFERENCES "content_items"("content_id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "content_credits"
      ADD CONSTRAINT "FK_content_credits_person" FOREIGN KEY ("person_id")
      REFERENCES "persons"("person_id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "content_genres"
      ADD CONSTRAINT "FK_content_genres_content" FOREIGN KEY ("content_id")
      REFERENCES "content_items"("content_id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "content_genres"
      ADD CONSTRAINT "FK_content_genres_genre" FOREIGN KEY ("genre_id")
      REFERENCES "genres"("genre_id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "ratings"
      ADD CONSTRAINT "FK_ratings_content" FOREIGN KEY ("content_id")
      REFERENCES "content_items"("content_id") ON DELETE CASCADE
    `);

    // Insert default genres
    await queryRunner.query(`
      INSERT INTO "genres" ("name") VALUES
      ('Action'),
      ('Adventure'),
      ('Animation'),
      ('Biography'),
      ('Comedy'),
      ('Crime'),
      ('Documentary'),
      ('Drama'),
      ('Family'),
      ('Fantasy'),
      ('Film Noir'),
      ('History'),
      ('Horror'),
      ('Music'),
      ('Musical'),
      ('Mystery'),
      ('Romance'),
      ('Sci-Fi'),
      ('Short Film'),
      ('Sport'),
      ('Superhero'),
      ('Thriller'),
      ('War'),
      ('Western')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    await queryRunner.query(`ALTER TABLE "ratings" DROP CONSTRAINT "FK_ratings_content"`);
    await queryRunner.query(`ALTER TABLE "content_genres" DROP CONSTRAINT "FK_content_genres_genre"`);
    await queryRunner.query(`ALTER TABLE "content_genres" DROP CONSTRAINT "FK_content_genres_content"`);
    await queryRunner.query(`ALTER TABLE "content_credits" DROP CONSTRAINT "FK_content_credits_person"`);
    await queryRunner.query(`ALTER TABLE "content_credits" DROP CONSTRAINT "FK_content_credits_content"`);
    await queryRunner.query(`ALTER TABLE "assets" DROP CONSTRAINT "FK_assets_content"`);
    await queryRunner.query(`ALTER TABLE "episodes" DROP CONSTRAINT "FK_episodes_season"`);
    await queryRunner.query(`ALTER TABLE "seasons" DROP CONSTRAINT "FK_seasons_tv_show"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_ratings_user"`);
    await queryRunner.query(`DROP INDEX "IDX_ratings_content"`);
    await queryRunner.query(`DROP INDEX "IDX_ratings_content_user"`);
    await queryRunner.query(`DROP INDEX "IDX_content_credits"`);
    await queryRunner.query(`DROP INDEX "IDX_assets_content_type"`);
    await queryRunner.query(`DROP INDEX "IDX_episodes_season_episode"`);
    await queryRunner.query(`DROP INDEX "IDX_seasons_tv_show_season"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "ratings"`);
    await queryRunner.query(`DROP TABLE "content_genres"`);
    await queryRunner.query(`DROP TABLE "content_credits"`);
    await queryRunner.query(`DROP TABLE "assets"`);
    await queryRunner.query(`DROP TABLE "episodes"`);
    await queryRunner.query(`DROP TABLE "seasons"`);
    await queryRunner.query(`DROP TABLE "content_items"`);
    await queryRunner.query(`DROP TABLE "persons"`);
    await queryRunner.query(`DROP TABLE "genres"`);
  }
}
