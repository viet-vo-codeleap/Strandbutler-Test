import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, JWTTokenPayload, Public } from '@libs/common';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from '../dto';

/**
 * REST API Controller for Rating operations
 * Handles HTTP requests for user ratings (1-5 stars)
 *
 * Endpoints:
 * - POST /ratings - Create or update a rating (upsert) - Requires authentication
 * - GET /ratings/content/:contentId/user/:userId - Get user's rating for content - Public
 * - GET /ratings/content/:contentId/summary - Get rating statistics - Public
 * - DELETE /ratings/content/:contentId/user/:userId - Delete user's rating - Requires authentication
 *
 * Pattern: Controller Layer (MVC Pattern)
 * - Handles HTTP routing and validation
 * - Delegates business logic to RatingsService
 *
 * Authentication:
 * - POST/DELETE require authentication (user can only rate/delete their own ratings)
 * - GET endpoints are public (anyone can view ratings)
 */
@ApiTags('Ratings')
@ApiBearerAuth()
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  /**
   * Create or update a rating (upsert)
   * POST /ratings
   * If user has already rated this content, updates the existing rating
   * User can only rate with their own user ID (extracted from JWT token)
   * @param user - Current authenticated user from JWT token
   * @param createRatingDto - Rating data (content_id, rating_value)
   * @returns The created or updated rating
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or update a rating (Authenticated users)' })
  @ApiResponse({ status: 200, description: 'Rating created or updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 409, description: 'Conflict - rating already exists (rare)' })
  async upsertRating(
    @CurrentUser() user: JWTTokenPayload,
    @Body() createRatingDto: CreateRatingDto,
  ) {
    // Use authenticated user's ID for the rating (security: users can only rate as themselves)
    const ratingData = {
      ...createRatingDto,
      user_id: user.userUUID, // Override user_id with authenticated user
    };
    return await this.ratingsService.upsertRating(ratingData);
  }

  /**
   * Get a user's rating for specific content
   * GET /ratings/content/:contentId/user/:userId
   * Used to check if user has rated content and display their rating
   * @param contentId - Content UUID
   * @param userId - User UUID
   * @returns Rating or null if user hasn't rated this content
   * @public No authentication required
   */
  @Get('content/:contentId/user/:userId')
  @Public() // Public endpoint - anyone can view ratings
  @ApiOperation({ summary: "Get a user's rating for specific content (Public)" })
  @ApiParam({ name: 'contentId', description: 'Content UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiParam({ name: 'userId', description: 'User UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Rating found or null' })
  async getUserRating(
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    const rating = await this.ratingsService.getUserRating(contentId, userId);
    return rating || { message: 'User has not rated this content' };
  }

  /**
   * Get rating summary for content
   * GET /ratings/content/:contentId/summary
   * Returns aggregate statistics: average rating, total count, distribution
   * @param contentId - Content UUID
   * @returns Rating summary object
   * @public No authentication required
   */
  @Get('content/:contentId/summary')
  @Public() // Public endpoint - anyone can view rating summaries
  @ApiOperation({ summary: 'Get rating summary for content (Public)' })
  @ApiParam({ name: 'contentId', description: 'Content UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Rating summary retrieved successfully',
    schema: {
      example: {
        average_rating: 4.35,
        total_ratings: 1247,
        distribution: { 1: 45, 2: 89, 3: 234, 4: 456, 5: 423 },
      },
    },
  })
  async getRatingSummary(@Param('contentId', ParseUUIDPipe) contentId: string) {
    return await this.ratingsService.getRatingSummary(contentId);
  }

  /**
   * Delete a user's rating
   * DELETE /ratings/content/:contentId
   * Allows users to remove their rating from content
   * Uses authenticated user's ID (users can only delete their own ratings)
   * @param user - Current authenticated user from JWT token
   * @param contentId - Content UUID
   * @returns Success with 204 status
   */
  @Delete('content/:contentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete your rating (Authenticated users)" })
  @ApiParam({ name: 'contentId', description: 'Content UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 204, description: 'Rating deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Rating not found' })
  async deleteRating(
    @CurrentUser() user: JWTTokenPayload,
    @Param('contentId', ParseUUIDPipe) contentId: string,
  ) {
    // Use authenticated user's ID (security: users can only delete their own ratings)
    await this.ratingsService.deleteRating(contentId, user.userUUID);
  }
}
