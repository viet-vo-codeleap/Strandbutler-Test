import { IsString, IsNotEmpty, IsOptional, IsInt, IsDateString, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new movie
 * Validates incoming request data for movie creation endpoint
 *
 * Validation Strategy:
 * - Required fields: title (movies must have a title)
 * - Optional metadata: description, release_date, age_rating
 * - Optional movie-specific: duration_minutes, stream_asset_id
 * - Optional relationships: genre_ids (for linking genres)
 */
export class CreateMovieDto {
  /**
   * Movie title
   * @example "The Shawshank Redemption"
   */
  @ApiProperty({ description: 'Movie title', example: 'The Shawshank Redemption' })
  @IsString()
  @IsNotEmpty()
  title: string;

  /**
   * URL-friendly slug (auto-generated if not provided)
   * @example "the-shawshank-redemption.abc123"
   */
  @ApiPropertyOptional({ description: 'URL-friendly slug', example: 'the-shawshank-redemption' })
  @IsString()
  @IsOptional()
  slug?: string;

  /**
   * Movie description/synopsis
   * @example "Two imprisoned men bond over a number of years..."
   */
  @ApiPropertyOptional({ description: 'Movie description' })
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * Release date in ISO 8601 format (YYYY-MM-DD)
   * @example "1994-09-23"
   */
  @ApiPropertyOptional({ description: 'Release date (YYYY-MM-DD)', example: '1994-09-23' })
  @IsDateString()
  @IsOptional()
  release_date?: string;

  /**
   * Age rating (PG, PG-13, R, NC-17, etc.)
   * @example "R"
   */
  @ApiPropertyOptional({ description: 'Age rating (e.g., PG-13, R, PG)', example: 'R' })
  @IsString()
  @IsOptional()
  age_rating?: string;

  /**
   * Movie duration in minutes
   * Must be positive integer
   * @example 142
   */
  @ApiPropertyOptional({ description: 'Duration in minutes', example: 142 })
  @IsInt()
  @Min(1)
  @IsOptional()
  duration_minutes?: number;

  /**
   * Stream asset identifier for video file location
   * Used by streaming service to locate the actual video file
   * @example "shawshank_1994_1080p.mp4"
   */
  @ApiPropertyOptional({ description: 'Stream asset identifier', example: 'shawshank_1994_1080p.mp4' })
  @IsString()
  @IsOptional()
  stream_asset_id?: string;

  /**
   * Array of genre IDs to associate with this movie
   * Creates entries in content_genre junction table
   * @example [1, 3, 7] // Drama, Crime, Thriller
   */
  @ApiPropertyOptional({ description: 'Genre IDs', type: [Number], example: [1, 3, 7] })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  genre_ids?: number[];
}
