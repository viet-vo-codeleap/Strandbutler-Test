import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { EpisodesService } from './episodes.service';
import { CreateEpisodeDto, UpdateEpisodeDto } from '../dto';
import { Public, Roles, UserRole } from '@common/index';

/**
 * REST API Controller for episode operations
 * Handles HTTP requests for episode endpoints
 */
@ApiTags('episodes')
@Controller('episodes')
export class EpisodesController {
  constructor(private readonly episodesService: EpisodesService) {}

  /**
   * Create a new episode
   * POST /episodes
   * Automatically publishes event to notification queue
   */
  @Roles(UserRole.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new episode' })
  @ApiResponse({ status: 201, description: 'Episode created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Episode number already exists for this season' })
  async create(@Body() createEpisodeDto: CreateEpisodeDto) {
    return await this.episodesService.create(createEpisodeDto);
  }

  /**
   * Get all episodes for a specific season
   * GET /episodes/season/:seasonId
   */
  @Public()
  @Get('season/:seasonId')
  @ApiOperation({ summary: 'Get all episodes for a season' })
  @ApiParam({ name: 'seasonId', description: 'Season UUID' })
  @ApiResponse({ status: 200, description: 'Episodes retrieved successfully' })
  async findBySeasonId(@Param('seasonId', ParseUUIDPipe) seasonId: string) {
    return await this.episodesService.findBySeasonId(seasonId);
  }

  /**
   * Get a single episode by ID
   * GET /episodes/:id
   */
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get an episode by ID' })
  @ApiParam({ name: 'id', description: 'Episode UUID' })
  @ApiResponse({ status: 200, description: 'Episode found' })
  @ApiResponse({ status: 404, description: 'Episode not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.episodesService.findOne(id);
  }

  /**
   * Update an episode
   * PATCH /episodes/:id
   */
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update an episode' })
  @ApiParam({ name: 'id', description: 'Episode UUID' })
  @ApiResponse({ status: 200, description: 'Episode updated successfully' })
  @ApiResponse({ status: 404, description: 'Episode not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEpisodeDto: UpdateEpisodeDto,
  ) {
    return await this.episodesService.update(id, updateEpisodeDto);
  }

  /**
   * Delete an episode
   * DELETE /episodes/:id
   */
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an episode' })
  @ApiParam({ name: 'id', description: 'Episode UUID' })
  @ApiResponse({ status: 204, description: 'Episode deleted successfully' })
  @ApiResponse({ status: 404, description: 'Episode not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.episodesService.remove(id);
  }
}
