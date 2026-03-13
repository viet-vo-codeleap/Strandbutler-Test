import { IsString, IsNotEmpty, IsOptional, IsInt, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new episode
 * Validates incoming request data for episode creation endpoint
 */
export class CreateEpisodeDto {
  /**
   * Season ID this episode belongs to
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @ApiProperty({ description: 'Season UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  season_id: string;

  /**
   * Episode number within the season
   * @example 1
   */
  @ApiProperty({ description: 'Episode number', example: 1 })
  @IsInt()
  @IsNotEmpty()
  episode_number: number;

  /**
   * Episode title
   * @example "Pilot"
   */
  @ApiProperty({ description: 'Episode title', example: 'Pilot' })
  @IsString()
  @IsNotEmpty()
  title: string;

  /**
   * Episode description
   * @example "A chemistry teacher diagnosed with cancer turns to cooking meth"
   */
  @ApiPropertyOptional({ description: 'Episode description' })
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * Episode duration in minutes
   * @example 47
   */
  @ApiPropertyOptional({ description: 'Duration in minutes', example: 47 })
  @IsInt()
  @IsOptional()
  duration_minutes?: number;

  /**
   * Stream asset ID for video streaming
   * @example "stream_asset_12345"
   */
  @ApiPropertyOptional({ description: 'Stream asset identifier', example: 'stream_asset_12345' })
  @IsString()
  @IsOptional()
  stream_asset_id?: string;
}
