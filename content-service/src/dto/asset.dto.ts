import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AssetType {
  POSTER = 'poster',
  BACKDROP = 'backdrop',
  TRAILER = 'trailer',
}

export class CreateAssetDto {
  @ApiProperty({
    description: 'Content ID (movie or series UUID)',
    example: '96e53679-a6c0-4bc2-857d-5c5e68b36502',
  })
  @IsUUID()
  content_id: string;

  @ApiProperty({
    description: 'Type of asset',
    enum: AssetType,
    example: AssetType.POSTER,
  })
  @IsEnum(AssetType)
  asset_type: string;

  @ApiProperty({
    description: 'URL to the asset (image, video, etc.)',
    example: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
  })
  @IsString()
  asset_url: string;

  @ApiPropertyOptional({
    description: 'Language code for localized assets',
    example: 'en-US',
    default: 'en-US',
  })
  @IsString()
  @IsOptional()
  language?: string;
}

export class UpdateAssetDto {
  @ApiPropertyOptional({
    description: 'Type of asset',
    enum: AssetType,
    example: AssetType.POSTER,
  })
  @IsEnum(AssetType)
  @IsOptional()
  asset_type?: string;

  @ApiPropertyOptional({
    description: 'URL to the asset',
    example: 'https://image.tmdb.org/t/p/w500/new-poster.jpg',
  })
  @IsString()
  @IsOptional()
  asset_url?: string;

  @ApiPropertyOptional({
    description: 'Language code',
    example: 'en-US',
  })
  @IsString()
  @IsOptional()
  language?: string;
}
