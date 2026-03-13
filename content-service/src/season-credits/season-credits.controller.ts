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
import { SeasonCreditsService } from './season-credits.service';
import { AddSeasonCreditsDto } from './dto/add-season-credits.dto';
import { Public } from '@common/index';

/**
 * REST API Controller for season credits operations
 * Handles HTTP requests for managing credits (cast & crew) for TV show seasons
 *
 * Endpoints:
 * - POST /seasons/:seasonId/credits - Add credits to a season
 * - GET /seasons/:seasonId/credits - Get all credits for a season
 * - DELETE /seasons/:seasonId/credits/:personId/:role - Remove a specific credit
 *
 * Pattern: Controller Layer (MVC Pattern)
 * - Handles HTTP concerns (routing, status codes, validation)
 * - Delegates business logic to SeasonCreditsService
 */
@ApiTags('season-credits')
@Controller('seasons/:seasonId/credits')
export class SeasonCreditsController {
  constructor(private readonly seasonCreditsService: SeasonCreditsService) {}

  /**
   * Add credits to a season
   * POST /seasons/:seasonId/credits
   * @param seasonId - Season UUID
   * @param addCreditsDto - Array of credits to add
   * @returns Created credits with 201 status
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add credits to a season' })
  @ApiParam({ name: 'seasonId', description: 'Season UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 201, description: 'Credits added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Season not found' })
  async addCredits(
    @Param('seasonId', ParseUUIDPipe) seasonId: string,
    @Body() addCreditsDto: AddSeasonCreditsDto,
  ) {
    return await this.seasonCreditsService.addCredits(seasonId, addCreditsDto);
  }

  /**
   * Get all credits for a season
   * GET /seasons/:seasonId/credits
   * Returns credits with person details, ordered by display order
   * @param seasonId - Season UUID
   * @returns Array of credits with person information
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all credits for a season' })
  @ApiParam({ name: 'seasonId', description: 'Season UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'Credits retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Season not found' })
  async getCredits(@Param('seasonId', ParseUUIDPipe) seasonId: string) {
    return await this.seasonCreditsService.getCreditsBySeason(seasonId);
  }

  /**
   * Remove a specific credit from a season
   * DELETE /seasons/:seasonId/credits/:personId/:role
   * @param seasonId - Season UUID
   * @param personId - Person UUID
   * @param role - Role type (Actor, Director, Writer, Producer)
   * @returns Success with 204 status
   */
  @Delete(':personId/:role')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a credit from a season' })
  @ApiParam({ name: 'seasonId', description: 'Season UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiParam({ name: 'personId', description: 'Person UUID', example: 'abc-123-person-uuid' })
  @ApiParam({ name: 'role', description: 'Role type', example: 'Actor' })
  @ApiResponse({ status: 204, description: 'Credit removed successfully' })
  @ApiResponse({ status: 404, description: 'Credit not found' })
  async removeCredit(
    @Param('seasonId', ParseUUIDPipe) seasonId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @Param('role') role: string,
  ) {
    await this.seasonCreditsService.removeCredit(seasonId, personId, role);
  }
}
