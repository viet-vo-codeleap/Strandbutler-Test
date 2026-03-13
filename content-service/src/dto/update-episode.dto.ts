import { PartialType } from '@nestjs/swagger';
import { CreateEpisodeDto } from './create-episode.dto';

/**
 * DTO for updating an existing episode
 * All fields from CreateEpisodeDto become optional
 * Allows partial updates - only send fields that need to be changed
 */
export class UpdateEpisodeDto extends PartialType(CreateEpisodeDto) {}
