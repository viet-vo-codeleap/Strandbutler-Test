import { PartialType } from '@nestjs/swagger';
import { CreateMovieDto } from './create-movie.dto';

/**
 * DTO for updating an existing movie
 * Extends CreateMovieDto but makes all fields optional
 *
 * Pattern: Partial Type from NestJS Swagger
 * - Inherits all validations from CreateMovieDto
 * - Makes all fields optional (partial update support)
 * - Maintains Swagger documentation from parent DTO
 *
 * Usage: PATCH /movies/:id
 * Allows updating only specific fields without providing entire object
 */
export class UpdateMovieDto extends PartialType(CreateMovieDto) {}
