import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import { RatingRepository } from '../repository/rating.repository';
import { Rating } from '../entities/rating.entity';

/**
 * Ratings Module
 * Encapsulates all rating-related functionality (Phase 1: Simple ratings)
 *
 * Module Structure:
 * - Imports: TypeOrmModule for Rating entity
 * - Controllers: RatingsController for HTTP endpoints
 * - Providers: RatingsService for business logic, RatingRepository for data access
 * - Exports: RatingsService (for use in content display modules)
 *
 * Phase 1 vs Phase 2:
 * - Phase 1 (Current): Simple 1-5 star ratings stored in PostgreSQL
 * - Phase 2 (Future): Move to separate Reviews Service with MongoDB for full reviews
 *
 * Pattern: Feature Module (NestJS Module Pattern)
 * - Self-contained rating functionality
 * - Can be refactored to microservice in Phase 2
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Rating]), // Register Rating entity for dependency injection
  ],
  controllers: [RatingsController],
  providers: [RatingsService, RatingRepository],
  exports: [RatingsService], // Export service for content modules to display ratings
})
export class RatingsModule {}
