import { PartialType } from '@nestjs/swagger';
import { CreateSeriesDto } from './create-series.dto';

/**
 * DTO for updating an existing TV show
 * Extends CreateSeriesDto but makes all fields optional
 *
 * Pattern: Partial Type from NestJS Swagger
 * - Inherits all validations from CreateSeriesDto
 * - Makes all fields optional (partial update support)
 * - Maintains Swagger documentation and enum constraints
 *
 * Usage: PATCH /tv-shows/:id
 * Allows updating status, title, or other fields independently
 */
export class UpdateSeriesDto extends PartialType(CreateSeriesDto) {}
