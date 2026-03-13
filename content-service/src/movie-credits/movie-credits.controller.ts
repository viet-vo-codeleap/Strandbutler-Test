import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MovieCreditsService } from './movie-credits.service';
import { AddMovieCreditsDto } from './dto/add-movie-credits.dto';
import { Public } from '@common/index';

/**
 * REST API Controller for movie credits operations
 * Handles HTTP requests for managing credits (cast & crew) for movies
 *
 * Endpoints:
 * - POST /movies/:movieId/credits - Add credits to a movie
 * - GET /movies/:movieId/credits - Get all credits for a movie
 * - DELETE /movies/:movieId/credits/:personId/:role - Remove a specific credit
 *
 * Pattern: Controller Layer (MVC Pattern)
 * - Handles HTTP concerns (routing, status codes, validation)
 * - Delegates business logic to MovieCreditsService
 */
@ApiTags('movie-credits')
@Controller('movies/:movieId/credits')
export class MovieCreditsController {
  constructor(private readonly movieCreditsService: MovieCreditsService) {}

  /**
   * Add credits to a movie
   * POST /movies/:movieId/credits
   * @param movieId - Movie UUID
   * @param addCreditsDto - Array of credits to add
   * @returns Created credits with 201 status
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add credits to a movie' })
  @ApiParam({ name: 'movieId', description: 'Movie UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 201, description: 'Credits added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  async addCredits(
    @Param('movieId', ParseUUIDPipe) movieId: string,
    @Body() addCreditsDto: AddMovieCreditsDto,
  ) {
    return await this.movieCreditsService.addCredits(movieId, addCreditsDto);
  }

  /**
   * Get all credits for a movie
   * GET /movies/:movieId/credits
   * Returns credits with person details, ordered by display order
   * @param movieId - Movie UUID
   * @returns Array of credits with person information
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all credits for a movie' })
  @ApiParam({ name: 'movieId', description: 'Movie UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'Credits retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  async getCredits(@Param('movieId', ParseUUIDPipe) movieId: string) {
    return await this.movieCreditsService.getCreditsByMovie(movieId);
  }

  /**
   * Remove a specific credit from a movie
   * DELETE /movies/:movieId/credits/:personId/:role
   * @param movieId - Movie UUID
   * @param personId - Person UUID
   * @param role - Role type (Actor, Director, Writer, Producer)
   * @returns Success with 204 status
   */
  @Delete(':personId/:role')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a credit from a movie' })
  @ApiParam({ name: 'movieId', description: 'Movie UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiParam({ name: 'personId', description: 'Person UUID', example: 'abc-123-person-uuid' })
  @ApiParam({ name: 'role', description: 'Role type', example: 'Actor' })
  @ApiResponse({ status: 204, description: 'Credit removed successfully' })
  @ApiResponse({ status: 404, description: 'Credit not found' })
  async removeCredit(
    @Param('movieId', ParseUUIDPipe) movieId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @Param('role') role: string,
  ) {
    await this.movieCreditsService.removeCredit(movieId, personId, role);
  }
}
