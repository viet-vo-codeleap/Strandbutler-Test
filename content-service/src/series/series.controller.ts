import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SeriesService } from './series.service';
import { CreateSeriesDto, UpdateSeriesDto } from '../dto';
import { Public } from '@common/index';

/**
 * REST API Controller for series operations
 * Handles HTTP requests and responses for series endpoints
 *
 * Endpoints:
 * - POST /tv-shows - Create new series
 * - GET /tv-shows - List all series with pagination
 * - GET /tv-shows/:id - Get single series with seasons
 * - PATCH /tv-shows/:id - Update series
 * - DELETE /tv-shows/:id - Delete series
 *
 * Pattern: Controller Layer (MVC Pattern)
 * - Handles HTTP concerns (routing, status codes, validation)
 * - Delegates business logic to SeriesService
 */
@ApiTags('series')
@Controller('series')
export class SeriesController {
  constructor(private readonly tvShowsService: SeriesService) {}

  /**
   * Create a new series
   * POST /tv-shows
   * @param createSeriesDto - series data from request body
   * @returns Created series with 201 status
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new series' })
  @ApiResponse({ status: 201, description: 'series created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() createSeriesDto: CreateSeriesDto) {
    return await this.tvShowsService.create(createSeriesDto);
  }

  /**
   * Get all series with pagination and optional status filter
   * GET /tv-shows?page=1&limit=10&status=Ongoing
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @param status - Optional status filter (Ongoing/Ended/Cancelled)
   * @returns Object containing seriess array and pagination metadata
   */
  @Public()
  @Get('all')
  @ApiOperation({ summary: 'Get all series with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status', example: 'Ongoing' })
  @ApiResponse({ status: 200, description: 'series retrieved successfully' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    // If status filter is provided, use the filtered query
    const [tvShows, total] = status
      ? await this.tvShowsService.findByStatus(status, page, limit)
      : await this.tvShowsService.findAll(page, limit);

    // Transform genres structure to flatten it
    const transformedSeries = tvShows.map(series => ({
      ...series,
      genres: series.genres?.map(cg => ({
        genre_id: cg.genre.genre_id,
        name: cg.genre.name,
      })) || [],
    }));

    // Return paginated response with metadata
    return {
      data: transformedSeries,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
        ...(status && { status }), // Include status in metadata if filtered
      },
    };
  }

  /**
   * Get a single series by ID
   * GET /tv-shows/:id
   * Includes all seasons and related data
   * @param id - series UUID
   * @returns series with all relations
   */
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a series by ID' })
  @ApiParam({ name: 'id', description: 'series UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'series found' })
  @ApiResponse({ status: 404, description: 'series not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const series = await this.tvShowsService.findOne(id);

    // Transform genres structure to flatten it
    return {
      ...series,
      genres: series.genres?.map(cg => ({
        genre_id: cg.genre.genre_id,
        name: cg.genre.name,
      })) || [],
    };
  }

  /**
   * Update a series
   * PATCH /tv-shows/:id
   * @param id - series UUID
   * @param updateSeriesDto - Partial series data to update
   * @returns Updated series
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a series' })
  @ApiParam({ name: 'id', description: 'series UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'series updated successfully' })
  @ApiResponse({ status: 404, description: 'series not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSeriesDto: UpdateSeriesDto,
  ) {
    return await this.tvShowsService.update(id, updateSeriesDto);
  }

  /**
   * Delete a series
   * DELETE /tv-shows/:id
   * Cascade deletes related seasons, episodes, ratings, assets, etc.
   * @param id - series UUID
   * @returns Success with 204 status
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a series' })
  @ApiParam({ name: 'id', description: 'series UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 204, description: 'series deleted successfully' })
  @ApiResponse({ status: 404, description: 'series not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.tvShowsService.remove(id);
  }

  /**
   * Get a single series by slug
   * GET /series/slug/:slug
   * @param slug - Series slug (e.g., 'breaking-bad-2008')
   * @returns Series with all relations (including seasons)
   * @public No authentication required
   */
  @Get('slug/:slug')
  @Public() // Public endpoint - no authentication required
  @ApiOperation({ summary: 'Get a series by slug (Public)' })
  @ApiParam({ name: 'slug', description: 'Series slug', example: 'breaking-bad-2008' })
  @ApiResponse({ status: 200, description: 'Series found' })
  @ApiResponse({ status: 404, description: 'Series not found' })
  async findBySlug(@Param('slug') slug: string) {
    const series = await this.tvShowsService.findBySlug(slug);

    // Transform genres structure to flatten it
    return {
      ...series,
      genres: series.genres?.map(cg => ({
        genre_id: cg.genre.genre_id,
        name: cg.genre.name,
      })) || [],
    };
  }
}
