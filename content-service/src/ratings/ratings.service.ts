import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { RatingRepository } from '../repository/rating.repository';
import { CreateRatingDto } from '../dto';
import { Rating } from '../entities/rating.entity';

/**
 * Service layer for Rating business logic
 * Handles user ratings (1-5 stars) for content items
 *
 * Business Rules:
 * - One rating per user per content (enforced by unique constraint)
 * - Rating values must be 1-5
 * - Upsert behavior: If rating exists, update it; otherwise create new
 *
 * Pattern: Service Layer Pattern
 * - Encapsulates business logic for ratings
 * - Provides rating aggregation and summary calculations
 */
@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(private readonly ratingRepository: RatingRepository) {}

  /**
   * Create or update a rating (upsert behavior)
   * If user has already rated this content, updates the existing rating
   * Otherwise creates a new rating
   * @param createRatingDto - Rating data (content_id, user_id, rating_value)
   * @returns The created or updated rating
   */
  async upsertRating(createRatingDto: CreateRatingDto): Promise<Rating> {
    const { content_id, user_id, rating_value } = createRatingDto;

    this.logger.log(`Upserting rating for content ${content_id} by user ${user_id}: ${rating_value} stars`);

    try {
      // Check if user has already rated this content
      const existingRating = await this.ratingRepository.findByContentAndUser(content_id, user_id);

      if (existingRating) {
        // Update existing rating
        this.logger.log(`Updating existing rating ${existingRating.rating_id} from ${existingRating.rating_value} to ${rating_value}`);
        return await this.ratingRepository.updateRating(content_id, user_id, rating_value);
      } else {
        // Create new rating
        this.logger.log(`Creating new rating for content ${content_id}`);
        return await this.ratingRepository.create(createRatingDto);
      }
    } catch (error) {
      this.logger.error(`Failed to upsert rating: ${error.message}`, error.stack);

      // Handle unique constraint violation (should be rare with upsert logic)
      if (error.code === '23505') {
        throw new ConflictException('Rating already exists for this user and content');
      }

      throw error;
    }
  }

  /**
   * Get a user's rating for specific content
   * Used to check if user has rated content and display their rating
   * @param contentId - Content UUID
   * @param userId - User UUID
   * @returns Rating if found, null otherwise
   */
  async getUserRating(contentId: string, userId: string): Promise<Rating | null> {
    this.logger.log(`Fetching rating for content ${contentId} by user ${userId}`);
    return await this.ratingRepository.findByContentAndUser(contentId, userId);
  }

  /**
   * Get rating summary for content
   * Calculates aggregate statistics for displaying in UI
   * @param contentId - Content UUID
   * @returns Object with average rating, total count, and distribution
   */
  async getRatingSummary(contentId: string): Promise<{
    average_rating: number;
    total_ratings: number;
    distribution: { [key: number]: number };
  }> {
    this.logger.log(`Calculating rating summary for content ${contentId}`);

    const summary = await this.ratingRepository.getRatingSummary(contentId);

    this.logger.log(
      `Content ${contentId} has ${summary.total_ratings} ratings with average ${summary.average_rating}`,
    );

    return summary;
  }

  /**
   * Delete a user's rating
   * Allows users to remove their rating from content
   * @param contentId - Content UUID
   * @param userId - User UUID
   * @returns true if deleted successfully
   * @throws NotFoundException if rating doesn't exist
   */
  async deleteRating(contentId: string, userId: string): Promise<boolean> {
    this.logger.log(`Deleting rating for content ${contentId} by user ${userId}`);

    const deleted = await this.ratingRepository.deleteByContentAndUser(contentId, userId);

    if (!deleted) {
      this.logger.warn(`Rating not found for content ${contentId} and user ${userId}`);
      throw new NotFoundException('Rating not found');
    }

    this.logger.log(`Rating deleted successfully`);
    return deleted;
  }
}
