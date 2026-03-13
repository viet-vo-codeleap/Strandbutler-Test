import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env file
config({ path: join(__dirname, '../../.env') });

/**
 * TypeORM DataSource Configuration
 * Used for running migrations via CLI
 *
 * This file is separate from the app.module.ts configuration because
 * TypeORM CLI needs a standalone DataSource to run migrations.
 *
 * Usage:
 * - npm run migration:generate -- -n MigrationName
 * - npm run migration:run
 * - npm run migration:revert
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.CONTENT_DB_HOST || 'localhost',
  port: parseInt(process.env.CONTENT_DB_PORT || '5432'),
  username: process.env.CONTENT_DB_USERNAME || 'postgres',
  password: process.env.CONTENT_DB_PASSWORD || 'postgres',
  database: process.env.CONTENT_DB_NAME || 'flixzone_content',

  // Entity locations (compiled JS files in dist folder)
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],

  // Migration locations
  migrations: [join(__dirname, '../migrations/*{.ts,.js}')],

  // Migration settings
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: false, // Don't auto-run migrations on startup

  // Development settings (disable in production)
  synchronize: false, // NEVER use synchronize with migrations!
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error', 'schema'] : ['error'],
};

// Create and export the DataSource instance
const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
