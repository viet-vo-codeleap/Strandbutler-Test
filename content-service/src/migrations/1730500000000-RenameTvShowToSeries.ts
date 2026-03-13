import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rename TV Show to Series Migration
 *
 * This migration renames all "tv_show" references to "series" for consistency:
 * - Renames discriminator value in content_items table
 * - Renames tv_show_id column to series_id in seasons table
 * - Updates all constraints and indexes
 *
 * This is a safe migration that preserves all data.
 *
 * Generated on: 2025-11-02
 */
export class RenameTvShowToSeries1730500000000 implements MigrationInterface {
  name = 'RenameTvShowToSeries1730500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Update discriminator value in content_items table
    // Change 'tv_show' to 'series' in the content_type column
    await queryRunner.query(`
      UPDATE "content_items"
      SET "content_type" = 'series'
      WHERE "content_type" = 'tv_show'
    `);

    // Step 2: Drop foreign key constraint from seasons table
    await queryRunner.query(`
      ALTER TABLE "seasons"
      DROP CONSTRAINT IF EXISTS "FK_seasons_tv_show"
    `);

    // Step 3: Drop unique constraint
    await queryRunner.query(`
      ALTER TABLE "seasons"
      DROP CONSTRAINT IF EXISTS "UQ_seasons_tv_show_season"
    `);

    // Step 4: Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_seasons_tv_show_season"
    `);

    // Step 5: Rename column from tv_show_id to series_id
    await queryRunner.query(`
      ALTER TABLE "seasons"
      RENAME COLUMN "tv_show_id" TO "series_id"
    `);

    // Step 6: Recreate unique constraint with new column name
    await queryRunner.query(`
      ALTER TABLE "seasons"
      ADD CONSTRAINT "UQ_seasons_series_season"
      UNIQUE ("series_id", "season_number")
    `);

    // Step 7: Recreate index with new column name
    await queryRunner.query(`
      CREATE INDEX "IDX_seasons_series_season"
      ON "seasons" ("series_id", "season_number")
    `);

    // Step 8: Recreate foreign key constraint with new name
    await queryRunner.query(`
      ALTER TABLE "seasons"
      ADD CONSTRAINT "FK_seasons_series"
      FOREIGN KEY ("series_id")
      REFERENCES "content_items"("content_id")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback in reverse order

    // Step 1: Drop new foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "seasons"
      DROP CONSTRAINT IF EXISTS "FK_seasons_series"
    `);

    // Step 2: Drop new index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_seasons_series_season"
    `);

    // Step 3: Drop new unique constraint
    await queryRunner.query(`
      ALTER TABLE "seasons"
      DROP CONSTRAINT IF EXISTS "UQ_seasons_series_season"
    `);

    // Step 4: Rename column back from series_id to tv_show_id
    await queryRunner.query(`
      ALTER TABLE "seasons"
      RENAME COLUMN "series_id" TO "tv_show_id"
    `);

    // Step 5: Recreate old index
    await queryRunner.query(`
      CREATE INDEX "IDX_seasons_tv_show_season"
      ON "seasons" ("tv_show_id", "season_number")
    `);

    // Step 6: Recreate old unique constraint
    await queryRunner.query(`
      ALTER TABLE "seasons"
      ADD CONSTRAINT "UQ_seasons_tv_show_season"
      UNIQUE ("tv_show_id", "season_number")
    `);

    // Step 7: Recreate old foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "seasons"
      ADD CONSTRAINT "FK_seasons_tv_show"
      FOREIGN KEY ("tv_show_id")
      REFERENCES "content_items"("content_id")
      ON DELETE CASCADE
    `);

    // Step 8: Revert discriminator value back to tv_show
    await queryRunner.query(`
      UPDATE "content_items"
      SET "content_type" = 'tv_show'
      WHERE "content_type" = 'series'
    `);
  }
}
