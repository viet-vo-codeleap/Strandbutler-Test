import { IsInt, IsNotEmpty, IsUUID, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating or updating a user's rating
 * Validates incoming request data for rating submission
 *
 * Validation Strategy:
 * - content_id and rating_value are required
 * - user_id is optional (will be extracted from JWT token in controller)
 * - rating_value constrained to 1-5 range (5-star rating system)
 * - UUIDs validated for content and user references
 *
 * Business Rules:
 * - One rating per user per content (enforced by unique constraint in database)
 * - If user already rated, this will update the existing rating
 * - User ID is automatically populated from authenticated user's JWT token
 */
export class CreateRatingDto {
  /**
   * Content ID to rate (movie or TV show)
   * Must be a valid UUID from content_items table
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @ApiProperty({ description: 'Content ID to rate', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  content_id: string;

  /**
   * User ID (from Users Service)
   * OPTIONAL: This field is automatically populated from JWT token
   * If provided in request, it will be ignored for security
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  @ApiPropertyOptional({ description: 'User ID (auto-populated from JWT token)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsOptional()
  user_id?: string;

  /**
   * Rating value (1-5 stars)
   * 1 = Terrible, 2 = Bad, 3 = Okay, 4 = Good, 5 = Excellent
   * @example 5
   */
  @ApiProperty({ description: 'Rating value (1-5 stars)', minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating_value: number;
}
