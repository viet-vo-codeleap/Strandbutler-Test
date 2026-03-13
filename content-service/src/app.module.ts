import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';
import * as entities from './entities';
import { MoviesModule } from './movies/movies.module';
import { SeriesModule } from './series/series.module';
import { SeasonsModule } from './seasons/seasons.module';
import { EpisodesModule } from './episodes/episodes.module';
import { RatingsModule } from './ratings/ratings.module';
import { GenresModule } from './genres/genres.module';
import { PersonsModule } from './persons/persons.module';
import { ContentGenresModule } from './content-genres/content-genres.module';
import { SearchModule } from './search/search.module';
import { AssetsModule } from './assets/assets.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard, JwtStrategy, RolesGuard } from '@libs/common';

/**
 * Content Service Application Module
 * Root module that bootstraps the entire content service application
 *
 * Architecture:
 * - Feature Modules: Movies, TV Shows, Ratings (each self-contained)
 * - Database: PostgreSQL on port 15433 (separate from Users Service on 15432)
 * - Configuration: Environment variables with Joi validation
 *
 * Module Imports:
 * 1. ConfigModule - Global configuration with environment validation
 * 2. TypeOrmModule - Database connection with auto entity discovery
 * 3. Feature Modules - Movies, TV Shows, Ratings (business features)
 *
 * Pattern: Root Module + Feature Modules
 * - Each feature has its own module, service, controller, repository
 * - Loose coupling between features for easy refactoring to microservices
 */
@Module({
  imports: [
    // Global configuration with environment validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production')
          .default('development'),
        PORT: Joi.number().default(3002),

        // PostgreSQL Configuration for Content Service
        // NOTE: Use port 5432 for Docker internal communication, 15433 for external access
        CONTENT_DB_HOST: Joi.string().default('content-postgres'),
        CONTENT_DB_PORT: Joi.number().default(5432),
        CONTENT_DB_USERNAME: Joi.string().default('postgres'),
        CONTENT_DB_PASSWORD: Joi.string().default('postgres'),
        CONTENT_DB_NAME: Joi.string().default('flixzone_content'),

        // Redis Configuration for Bull queues
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
      }),
    }),

    // Bull (Redis queues) for async communication
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: parseInt(configService.get('REDIS_PORT') || '6379'),
        },
      }),
    }),

    // Database connection with TypeORM
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('CONTENT_DB_HOST'),
        port: configService.get<number>('CONTENT_DB_PORT'),
        username: configService.get('CONTENT_DB_USERNAME'),
        password: configService.get('CONTENT_DB_PASSWORD'),
        database: configService.get('CONTENT_DB_NAME'),
        entities: Object.values(entities),

        // ⚠️ IMPORTANT: synchronize is DISABLED - use migrations instead!
        // Running synchronize: true in production can cause data loss
        // Use 'npm run migration:run' to apply schema changes
        synchronize: false,

        // Auto-run migrations on startup (optional - prefer manual control)
        migrationsRun: false,

        // SQL logging in development only
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),

    // Feature Modules
    MoviesModule,    // Movie CRUD operations and business logic
    SeriesModule,   // TV Show CRUD operations and business logic
    SeasonsModule,   // Season CRUD operations for series
    EpisodesModule,  // Episode CRUD operations with event publishing
    RatingsModule,   // User ratings (1-5 stars) operations
    GenresModule,    // Genre management operations
    PersonsModule,   // Person (Cast/Crew) management operations
    ContentGenresModule, // Content-Genre relationship management
    SearchModule,    // Advanced search, filtering, and discovery
    AssetsModule,    // Asset management (posters, backdrops, trailers)
    // Note: Movie and Season credits are now handled within their respective modules
    HealthModule,    // Health check endpoints for monitoring
  ],
  providers: [
    // JWT Authentication Strategy
    JwtStrategy,

    // Global Guards (applied to all routes by default)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Validates JWT tokens on all routes
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // Validates user roles for @Roles() decorator
    },
  ],
})
export class AppModule {}
