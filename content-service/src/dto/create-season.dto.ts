import { IsString, IsNotEmpty, IsOptional, IsInt, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new season
 * Validates incoming request data for season creation endpoint
 *
 * Note: series_id is the foreign key column name in seasons table,
 * but it references content_id from the series (content_items) table
 */
export class CreateSeasonDto {
  /**
   * Content ID of the series this season belongs to
   * This is the content_id from the series (content_items table)
   * @example "1ca157af-5740-43f5-86f3-538196dc8d24"
   */
  @ApiProperty({
    description: 'Series content_id (UUID)',
    example: '1ca157af-5740-43f5-86f3-538196dc8d24'
  })
  @IsUUID()
  @IsNotEmpty()
  series_id: string;

  /**
   * Season number
   * @example 1
   */
  @ApiProperty({ description: 'Season number', example: 1 })
  @IsInt()
  @IsNotEmpty()
  season_number: number;

  /**
   * Season title
   * @example "Season 1"
   */
  @ApiPropertyOptional({ description: 'Season title', example: 'Season 1' })
  @IsString()
  @IsOptional()
  title?: string;

  /**
   * Season description
   * @example "The first season introduces the main characters..."
   */
  @ApiPropertyOptional({ description: 'Season description' })
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * Season release date in ISO 8601 format (YYYY-MM-DD)
   * @example "2025-01-15"
   */
  @ApiPropertyOptional({ description: 'Release date (YYYY-MM-DD)', example: '2025-01-15' })
  @IsDateString()
  @IsOptional()
  release_date?: string;
}
