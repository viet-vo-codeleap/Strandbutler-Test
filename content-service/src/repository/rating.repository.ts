import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresRepository } from '@common/src/database/postgres/postgres.repository';
import { Rating } from '../entities/rating.entity';

/**
 * Repository for managing Rating entities
 * Extends PostgresRepository to inherit common CRUD operations
 *
 * Design Pattern: Template Method Pattern
 * - Inherits base CRUD from PostgresRepository
 * - Adds rating-specific query methods for aggregation
 * - Handles one-rating-per-user-per-content enforcement
 *
 * Ratings are simple 1-5 star ratings (Phase 1)
 * - Unique constraint on (content_id, user_id) ensures one rating per user per content
 * - No review text in Phase 1 (will move to separate Reviews Service in Phase 2)
 */
@Injectable()
export class RatingRepository extends PostgresRepository<Rating> {
  protected readonly logger = new Logger(RatingRepository.name);

  /**
   * Override primary key field name since Rating uses 'rating_id' instead of 'id'
   * This allows base repository methods (update, delete, etc.) to work correctly
   */
  protected primaryKeyField = 'rating_id';

  constructor(
    @InjectRepository(Rating)
    ratingRepository: Repository<Rating>,
  ) {
    super(ratingRepository);
  }

  /**
   * Find an existing rating for a specific content and user combination
   * Used to check if user has already rated content before allowing create/update
   * @param contentId - The UUID of the content item
   * @param userId - The UUID of the user (from Users Service)
   * @returns The rating if found, null otherwise
   */
  async findByContentAndUser(contentId: string, userId?: string): Promise<Rating | null> {
    return await this.repository.findOne({
      where: { content_id: contentId, user_id: userId },
    });
  }

  /**
   * Calculate rating statistics for a content item
   * Aggregates all ratings to provide summary information for display
   * @param contentId - The UUID of the content item
   * @returns Object containing average rating, total count, and distribution by star value
   */
  async getRatingSummary(contentId: string): Promise<{
    average_rating: number;
    total_ratings: number;
    distribution: { [key: number]: number };
  }> {
    // Fetch all ratings for this content
    const ratings = await this.repository.find({
      where: { content_id: contentId },
    });

    // Return empty stats if no ratings exist
    if (ratings.length === 0) {
      return {
        average_rating: 0,
        total_ratings: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    // Calculate sum for average rating
    const sum = ratings.reduce((acc, r) => acc + r.rating_value, 0);

    // Build distribution object showing count for each star rating (1-5)
    // Used for displaying rating histograms in UI
    const distribution = ratings.reduce(
      (acc, r) => {
        acc[r.rating_value] = (acc[r.rating_value] || 0) + 1;
        return acc;
      },
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as { [key: number]: number },
    );

    return {
      average_rating: Math.round((sum / ratings.length) * 100) / 100, // Round to 2 decimal places (e.g., 4.35)
      total_ratings: ratings.length,
      distribution,
    };
  }

  /**
   * Update an existing rating value
   * Allows users to change their rating for content they've already rated
   * @param contentId - The UUID of the content item
   * @param userId - The UUID of the user
   * @param ratingValue - New rating value (1-5)
   * @returns The updated rating
   * @throws Error if rating doesn't exist (user hasn't rated this content)
   */
  async updateRating(contentId: string, userId: string | undefined, ratingValue: number): Promise<Rating> {
    const existing = await this.findByContentAndUser(contentId, userId);
    if (!existing) {
      this.logger.warn(`Rating not found for content ${contentId} and user ${userId}`);
      throw new Error('Rating not found');
    }
    existing.rating_value = ratingValue;
    return await this.repository.save(existing);
  }

  /**
   * Delete a user's rating for specific content
   * Allows users to remove their rating
   * @param contentId - The UUID of the content item
   * @param userId - The UUID of the user
   * @returns true if rating was deleted, false if not found
   */
  async deleteByContentAndUser(contentId: string, userId: string): Promise<boolean> {
    const result = await this.repository.delete({
      content_id: contentId,
      user_id: userId,
    });
    return (result.affected ?? 0) > 0;
  }
}
