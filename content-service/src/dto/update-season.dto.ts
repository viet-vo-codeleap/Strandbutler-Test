import { PartialType } from '@nestjs/swagger';
import { CreateSeasonDto } from './create-season.dto';

/**
 * DTO for updating an existing season
 * All fields from CreateSeasonDto become optional
 * Allows partial updates - only send fields that need to be changed
 */
export class UpdateSeasonDto extends PartialType(CreateSeasonDto) {}
