import { IsString, IsNotEmpty, IsOptional, IsDateString, IsArray, IsInt, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Enum for TV show status values
 * Constrains status field to predefined values
 */
export enum TVShowStatus {
  ONGOING = 'Ongoing',
  ENDED = 'Ended',
  CANCELLED = 'Cancelled',
}

/**
 * DTO for creating a new TV show
 * Validates incoming request data for TV show creation endpoint
 *
 * Validation Strategy:
 * - Required fields: title (TV shows must have a title)
 * - Optional metadata: description, release_date, age_rating
 * - Optional TV show-specific: status (Ongoing/Ended/Cancelled)
 * - Optional relationships: genre_ids (for linking genres)
 *
 * Note: Seasons and episodes are created separately after TV show creation
 */
export class CreateSeriesDto {
  /**
   * TV show title
   * @example "Breaking Bad"
   */
  @ApiProperty({ description: 'TV show title', example: 'Breaking Bad' })
  @IsString()
  @IsNotEmpty()
  title: string;

  /**
   * URL-friendly slug (auto-generated if not provided)
   * @example "breaking-bad"
   */
  @ApiPropertyOptional({ description: 'URL-friendly slug', example: 'breaking-bad' })
  @IsString()
  @IsOptional()
  slug?: string;

  /**
   * TV show description/synopsis
   * @example "A chemistry teacher diagnosed with cancer turns to cooking meth..."
   */
  @ApiPropertyOptional({ description: 'TV show description' })
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * Release date (first episode air date) in ISO 8601 format (YYYY-MM-DD)
   * @example "2008-01-20"
   */
  @ApiPropertyOptional({ description: 'Release date (YYYY-MM-DD)', example: '2008-01-20' })
  @IsDateString()
  @IsOptional()
  release_date?: string;

  /**
   * Age rating (TV-Y, TV-PG, TV-14, TV-MA, etc.)
   * @example "TV-MA"
   */
  @ApiPropertyOptional({ description: 'Age rating (e.g., TV-14, TV-MA)', example: 'TV-MA' })
  @IsString()
  @IsOptional()
  age_rating?: string;

  /**
   * TV show production status
   * - Ongoing: Currently airing new episodes
   * - Ended: Series finale aired
   * - Cancelled: Discontinued before planned ending
   * @example "Ended"
   */
  @ApiPropertyOptional({ description: 'Show status', enum: TVShowStatus, example: 'Ended' })
  @IsEnum(TVShowStatus)
  @IsOptional()
  status?: TVShowStatus;

  /**
   * Array of genre IDs to associate with this TV show
   * Creates entries in content_genre junction table
   * @example [1, 6, 9] // Drama, Crime, Thriller
   */
  @ApiPropertyOptional({ description: 'Genre IDs', type: [Number], example: [1, 6, 9] })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  genre_ids?: number[];
}
