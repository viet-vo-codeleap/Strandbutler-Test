import { IsString, IsOptional, IsEnum, IsInt, IsArray, Min, Max, IsNumber, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Content type filter for search
 */
export enum ContentType {
  MOVIE = 'movie',
  SERIES = 'series',
  ALL = 'all',
}

/**
 * Sort options for search results
 */
export enum SortBy {
  RELEVANCE = 'relevance',        // Best match for search query
  TITLE_ASC = 'title_asc',       // A-Z
  TITLE_DESC = 'title_desc',     // Z-A
  RELEASE_DATE_ASC = 'release_date_asc',  // Oldest first
  RELEASE_DATE_DESC = 'release_date_desc', // Newest first
  RATING_ASC = 'rating_asc',     // Lowest rated first
  RATING_DESC = 'rating_desc',   // Highest rated first
  POPULARITY = 'popularity',     // Most popular (based on view count if available)
}

/**
 * DTO for content search with advanced filters
 */
export class SearchContentDto {
  @ApiPropertyOptional({ description: 'Search query (title, description, keywords)', example: 'breaking bad' })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiPropertyOptional({ description: 'Content type filter', enum: ContentType, default: ContentType.ALL })
  @IsEnum(ContentType)
  @IsOptional()
  type?: ContentType = ContentType.ALL;

  @ApiPropertyOptional({ description: 'Comma-separated list of genre IDs', example: '1,2,3' })
  @IsString()
  @IsOptional()
  @Matches(/^(\d+)(,\d+)*$/, { message: 'genres must be a comma-separated list of genre IDs (e.g., 1,2,3)' })
  genres?: string;

  @ApiPropertyOptional({ description: 'Comma-separated list of years to filter by', example: '2025,2024,2022,2021' })
  @IsString()
  @IsOptional()
  @Matches(/^(\d{4})(,\d{4})*$/, { message: 'years must be a comma-separated list of years (e.g., 2025,2024,2022)' })
  years?: string;

  @ApiPropertyOptional({ description: 'Minimum average rating (0-10)', example: 7.5 })
  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  @Type(() => Number)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Age rating filter', example: 'PG-13' })
  @IsString()
  @IsOptional()
  ageRating?: string;

  @ApiPropertyOptional({ description: 'Sort results by', enum: SortBy, default: SortBy.RELEVANCE })
  @IsEnum(SortBy)
  @IsOptional()
  sortBy?: SortBy = SortBy.RELEVANCE;

  @ApiPropertyOptional({ description: 'Page number', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

/**
 * DTO for search suggestions/autocomplete
 */
export class SearchSuggestionsDto {
  @ApiPropertyOptional({ description: 'Partial search query', example: 'break' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Max suggestions to return', example: 5, minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 5;

  @ApiPropertyOptional({ description: 'Content type filter', enum: ContentType, default: ContentType.ALL })
  @IsEnum(ContentType)
  @IsOptional()
  type?: ContentType = ContentType.ALL;
}

/**
 * DTO for trending content query
 */
export class TrendingDto {
  @ApiPropertyOptional({ description: 'Content type filter', enum: ContentType, default: ContentType.ALL })
  @IsEnum(ContentType)
  @IsOptional()
  type?: ContentType = ContentType.ALL;

  @ApiPropertyOptional({ description: 'Number of items to return', example: 10, minimum: 1, maximum: 50 })
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}

/**
 * DTO for recommendations query
 */
export class RecommendationsDto {
  @ApiPropertyOptional({ description: 'Content ID to base recommendations on', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsOptional()
  contentId?: string;

  @ApiPropertyOptional({ description: 'Genre IDs to base recommendations on', example: [1, 2] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  genres?: number[];

  @ApiPropertyOptional({ description: 'Content type filter', enum: ContentType, default: ContentType.ALL })
  @IsEnum(ContentType)
  @IsOptional()
  type?: ContentType = ContentType.ALL;

  @ApiPropertyOptional({ description: 'Number of recommendations', example: 10, minimum: 1, maximum: 50 })
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}
