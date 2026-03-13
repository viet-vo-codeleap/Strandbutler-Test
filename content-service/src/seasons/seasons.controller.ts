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
import { SeasonsService } from './seasons.service';
import { CreateSeasonDto, UpdateSeasonDto } from '../dto';
import { Public } from '@common/index';

/**
 * REST API Controller for season operations
 * Handles HTTP requests for season endpoints
 */
@ApiTags('seasons')
@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  /**
   * Create a new season
   * POST /seasons
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new season' })
  @ApiResponse({ status: 201, description: 'Season created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Season number already exists for this series' })
  async create(@Body() createSeasonDto: CreateSeasonDto) {
    return await this.seasonsService.create(createSeasonDto);
  }

  /**
   * Get all seasons for a specific series
   * GET /seasons/series/:seriesId
   */
  @Public()
  @Get('series/:seriesId')
  @ApiOperation({ summary: 'Get all seasons for a series' })
  @ApiParam({ name: 'seriesId', description: 'Series content_id (UUID)' })
  @ApiResponse({ status: 200, description: 'Seasons retrieved successfully' })
  async findBySeriesId(@Param('seriesId', ParseUUIDPipe) seriesId: string) {
    return await this.seasonsService.findBySeriesId(seriesId);
  }

  /**
   * Get a single season by ID
   * GET /seasons/:id
   */
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a season by ID' })
  @ApiParam({ name: 'id', description: 'Season UUID' })
  @ApiResponse({ status: 200, description: 'Season found' })
  @ApiResponse({ status: 404, description: 'Season not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.seasonsService.findOne(id);
  }

  /**
   * Update a season
   * PATCH /seasons/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a season' })
  @ApiParam({ name: 'id', description: 'Season UUID' })
  @ApiResponse({ status: 200, description: 'Season updated successfully' })
  @ApiResponse({ status: 404, description: 'Season not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSeasonDto: UpdateSeasonDto,
  ) {
    return await this.seasonsService.update(id, updateSeasonDto);
  }

  /**
   * Delete a season
   * DELETE /seasons/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a season' })
  @ApiParam({ name: 'id', description: 'Season UUID' })
  @ApiResponse({ status: 204, description: 'Season deleted successfully' })
  @ApiResponse({ status: 404, description: 'Season not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.seasonsService.remove(id);
  }
}
