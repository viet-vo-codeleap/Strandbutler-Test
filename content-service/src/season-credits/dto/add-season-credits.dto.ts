import { IsArray, IsString, IsUUID, IsOptional, IsInt, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SeasonCreditDto {
  @ApiProperty({ description: 'Person UUID', example: 'abc-123-person-uuid' })
  @IsUUID()
  @IsNotEmpty()
  person_id: string;

  @ApiProperty({ description: 'Role (Actor, Director, Writer, Producer)', example: 'Actor' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiPropertyOptional({ description: 'Character name (for actors)', example: 'Walter White' })
  @IsString()
  @IsOptional()
  character_name?: string;

  @ApiPropertyOptional({ description: 'Display order', example: 1 })
  @IsInt()
  @IsOptional()
  order?: number;
}

export class AddSeasonCreditsDto {
  @ApiProperty({ description: 'Array of credits to add', type: [SeasonCreditDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeasonCreditDto)
  credits: SeasonCreditDto[];
}
